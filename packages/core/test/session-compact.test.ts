import type { FileSystem } from "@huntagent/core/infrastructure/filesystem"
import { describe, expect } from "bun:test"
import { LLMClient, LLMEvent, LanguageModel, type LLMRequest } from "@huntagent/ai"
import { OpenAIChat } from "@huntagent/ai/protocols"
import { Config } from "@huntagent/core/config"
import { Database } from "@huntagent/core/infrastructure/database/database"
import { AppNodeBuilder } from "@huntagent/core/shared/effect/app-node-builder"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { Bus } from "@huntagent/core/runtime/bus"
import { Location } from "@huntagent/core/infrastructure/location"
import { LocationServiceMap } from "@huntagent/core/infrastructure/location-service-map"
import type { LocationServices } from "@huntagent/core/infrastructure/location-services"
import { Project } from "@huntagent/core/infrastructure/project"
import { AbsolutePath } from "@huntagent/core/shared/schema"
import { Session } from "@huntagent/core/runtime/session"
import { SessionCompaction } from "@huntagent/core/runtime/session/compaction"
import { SessionEvent } from "@huntagent/core/runtime/session/event"
import { SessionMessage } from "@huntagent/core/runtime/session/message"
import { SessionProjector } from "@huntagent/core/runtime/session/projector"
import { SessionExecution } from "@huntagent/core/runtime/session/execution"
import { SessionRunnerModel } from "@huntagent/core/runtime/session/runner/model"
import { SessionStore } from "@huntagent/core/runtime/session/store"
import { Effect, Layer, LayerMap, Stream } from "effect"
import { testEffect } from "./lib/effect"
import { globalProjectNode } from "./lib/project"

const location = Location.Ref.make({ directory: AbsolutePath.make("/project") })
const model = LanguageModel.make({
  id: "summary-model",
  provider: "test",
  route: OpenAIChat.route,
})
let requests: LLMRequest[] = []
const client = Layer.mock(LLMClient.Service)({
  stream: (request: LLMRequest) => {
    requests.push(request)
    return Stream.make(LLMEvent.textDelta({ id: "summary", text: "manual session summary" }))
  },
  generate: () => Effect.die("unused"),
})
const config = Layer.mock(Config.Service)({ entries: () => Effect.succeed([]) })
const models = Layer.mock(SessionRunnerModel.Service)({
  resolve: () =>
    Effect.succeed(
      SessionRunnerModel.resolved(model, {
        capabilities: { tools: true, input: ["text", "image"], output: ["text"] },
        cost: [],
        limit: { context: 10_000, output: 1_000 },
      }),
    ),
})
const locations = Layer.effect(
  LocationServiceMap.Service,
  LayerMap.make(
    () =>
      // The test only needs the compaction location service used by Session.compact.
      // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
      SessionCompaction.layer.pipe(
        Layer.provide(client),
        Layer.provide(config),
        Layer.provide(models),
      ) as unknown as Layer.Layer<LocationServices, FileSystem.DirectoryNotFoundError>,
  ),
)
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([Database.node, Bus.node, SessionProjector.node, SessionStore.node, Session.node]),
    [
      LocationServiceMap.node.replace(locations),
      Project.node.replace(globalProjectNode),
      SessionExecution.node.replace(SessionExecution.noopLayer),
    ],
  ),
)

describe("Session.compact", () => {
  it.effect("durably coalesces manual compaction", () =>
    Effect.gen(function* () {
      requests = []
      const session = yield* Session.Service
      const bus = yield* Bus.Service
      const created = yield* session.create({ location })

      const messageID = SessionMessage.ID.create()
      yield* bus.publish(SessionEvent.InboxEnqueued, {
        sessionID: created.id,
        inboxID: messageID,
        item: {
          type: "user",
          payload: { text: "Please compact this session history." },
          delivery: "steer",
        },
      })
      yield* bus.publish(SessionEvent.InboxDelivered, {
        sessionID: created.id,
        inboxID: messageID,
      })

      expect(yield* session.compact({ id: messageID, sessionID: created.id }).pipe(Effect.flip)).toMatchObject({
        _tag: "Session.CompactionConflictError",
        inputID: messageID,
      })
      const first = yield* session.compact({ sessionID: created.id })
      const second = yield* session.compact({ sessionID: created.id })

      expect(second.id).toBe(first.id)
      expect(requests).toHaveLength(0)
      expect(yield* session.inbox(created.id)).toEqual([
        expect.objectContaining({ id: first.id, type: "compaction", delivery: "steer" }),
      ])
      expect((yield* session.context(created.id)).find((message) => message.id === first.id)).toBeUndefined()

      const queued = yield* session.create({ location })
      const queue = yield* session.compact({ sessionID: queued.id, delivery: "queue" })
      expect(queue).toMatchObject({ type: "compaction", delivery: "queue" })
    }),
  )

  it.effect("coalesces concurrent manual compaction", () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const created = yield* session.create({ location })
      const admitted = yield* Effect.all(
        [SessionMessage.ID.create(), SessionMessage.ID.create()].map((id) =>
          session.compact({ id, sessionID: created.id }),
        ),
        { concurrency: "unbounded" },
      )

      expect(admitted[1]?.id).toBe(admitted[0]?.id)
      expect(yield* session.inbox(created.id)).toHaveLength(1)
    }),
  )

  it.effect("commits a staged revert before admitting manual compaction", () =>
    Effect.gen(function* () {
      const session = yield* Session.Service
      const bus = yield* Bus.Service
      const created = yield* session.create({ location })
      const messageID = SessionMessage.ID.create()

      yield* bus.publish(SessionEvent.InboxEnqueued, {
        sessionID: created.id,
        inboxID: messageID,
        item: {
          type: "user",
          payload: { text: "Undo this prompt before compacting." },
          delivery: "steer",
        },
      })
      yield* bus.publish(SessionEvent.InboxDelivered, {
        sessionID: created.id,
        inboxID: messageID,
      })
      yield* bus.publish(SessionEvent.RevertEvent.Staged, {
        sessionID: created.id,
        revert: { messageID, files: [] },
      })

      expect((yield* session.get(created.id)).revert?.messageID).toBe(messageID)

      const compacted = yield* session.compact({ sessionID: created.id })

      expect((yield* session.get(created.id)).revert).toBeUndefined()
      expect(yield* session.context(created.id)).toEqual([])
      expect(yield* session.inbox(created.id)).toEqual([
        expect.objectContaining({ id: compacted.id, type: "compaction" }),
      ])
    }),
  )
})
