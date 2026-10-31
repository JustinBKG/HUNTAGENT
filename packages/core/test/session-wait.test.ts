import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database } from "@huntagent/core/infrastructure/database/database"
import { AppNodeBuilder } from "@huntagent/core/shared/effect/app-node-builder"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { Bus } from "@huntagent/core/runtime/bus"
import { Location } from "@huntagent/core/infrastructure/location"
import { Project } from "@huntagent/core/infrastructure/project"
import { AbsolutePath } from "@huntagent/core/shared/schema"
import { Session } from "@huntagent/core/runtime/session"
import { SessionProjector } from "@huntagent/core/runtime/session/projector"
import { SessionExecution } from "@huntagent/core/runtime/session/execution"
import { SessionStore } from "@huntagent/core/runtime/session/store"
import { testEffect } from "./lib/effect"
import { globalProjectNode } from "./lib/project"

const location = Location.Ref.make({ directory: AbsolutePath.make("/project") })
const awaited: Session.ID[] = []
const execution = Layer.mock(SessionExecution.Service, {
  awaitIdle: (sessionID) => Effect.sync(() => awaited.push(sessionID)),
})
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([Database.node, Bus.node, SessionProjector.node, SessionStore.node, Session.node]),
    [Project.node.replace(globalProjectNode), SessionExecution.node.replace(execution)],
  ),
)

describe("Session.wait", () => {
  it.effect("delegates to SessionExecution.awaitIdle", () =>
    Effect.gen(function* () {
      awaited.length = 0
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ location })

      yield* sessions.wait(session.id)

      expect(awaited).toEqual([session.id])
    }),
  )
})
