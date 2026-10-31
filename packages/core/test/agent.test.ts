import path from "path"
import { describe, expect } from "bun:test"
import { Effect, Exit, Fiber, Layer, Scope, Stream } from "effect"
import { Agent } from "@huntagent/core/runtime/agent"
import { Bus } from "@huntagent/core/runtime/bus"
import { AppNodeBuilder } from "@huntagent/core/shared/effect/app-node-builder"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { Location } from "@huntagent/core/infrastructure/location"
import { Permission } from "@huntagent/core/runtime/permission"
import { AgentPlugin } from "@huntagent/core/plugins/agent"
import { SharedAgents } from "@huntagent/core/agents/shared/agents"
import { PentestAgents } from "@huntagent/core/agents/pentest/agents"
import { AbsolutePath } from "@huntagent/core/shared/schema"
import { Global } from "@huntagent/util/global"
import { location } from "./fixture/location"
import { testEffect } from "./lib/effect"
import { agentHost, host } from "./plugin/host"

const testLocation = location({ directory: AbsolutePath.make("/project") })
const locationLayer = Layer.succeed(Location.Service, Location.Service.of(testLocation))
const global = Global.make({ data: "/data", config: "/config", tmp: "/tmp/opencode" })
const globalLayer = Layer.succeed(Global.Service, Global.Service.of(global))

const it = testEffect(
  AppNodeBuilder.build(LayerNode.group([Agent.node, Bus.node, Location.node]), [
    Global.node.replace(globalLayer),
    Location.node.replace(locationLayer),
  ]) as unknown as Layer.Layer<unknown, never>,
)

describe("Agent", () => {
  it.effect("publishes an updated event after agent changes", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const bus = yield* Bus.Service
      const updated = yield* bus
        .subscribe(Agent.Event.Updated)
        .pipe(Stream.take(1), Stream.runCollect, Effect.forkScoped)
      yield* Effect.yieldNow

      yield* agent.transform((editor) => editor.update(Agent.ID.make("reviewer"), () => {}))

      expect(yield* Fiber.join(updated)).toMatchObject([{ location: { directory: testLocation.directory } }])
    }),
  )

  it.effect("starts without agents", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service

      expect(yield* agent.list()).toEqual([])
      expect(yield* agent.get(Agent.ID.make("build"))).toBeUndefined()
    }),
  )

  it.effect("materializes replayable agent transforms", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const id = Agent.ID.make("reviewer")
      yield* agent.transform((editor) =>
        editor.update(id, (info) => {
          info.description = "Reviews code"
          info.mode = "subagent"
        }),
      )

      expect(yield* agent.get(id)).toMatchObject({ id, description: "Reviews code", mode: "subagent" })
      expect((yield* agent.list()).map((info) => info.id)).toEqual([id])
    }),
  )

  it.effect("lists the selected default agent first", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      yield* agent.transform((editor) => {
        editor.update(Agent.ID.make("build"), (info) => {
          info.mode = "primary"
        })
        editor.update(Agent.ID.make("reviewer"), (info) => {
          info.mode = "primary"
        })
        editor.update(Agent.ID.make("explore"), (info) => {
          info.mode = "subagent"
        })
        editor.default(Agent.ID.make("reviewer"))
      })

      expect((yield* agent.list()).map((info) => String(info.id))).toEqual(["reviewer", "build", "explore"])
    }),
  )

  it.effect("rebuilds state when a transform is replaced", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const id = Agent.ID.make("reviewer")
      let description = "Old description"
      let hidden = true
      yield* agent.transform((editor) =>
        editor.update(id, (info) => {
          info.description = description
          info.hidden = hidden
        }),
      )
      description = "New description"
      hidden = false
      yield* agent.reload()

      expect(yield* agent.get(id)).toMatchObject({ description: "New description", hidden: false })
    }),
  )

  it.effect("removes a transform when its scope closes", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const id = Agent.ID.make("scoped")
      const scope = yield* Scope.make()
      yield* agent.transform((editor) => editor.update(id, () => {})).pipe(Scope.provide(scope))
      expect(yield* agent.get(id)).toBeDefined()

      yield* Scope.close(scope, Exit.void)
      expect(yield* agent.get(id)).toBeUndefined()
    }),
  )

  it.effect("applies direct agent updates", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const id = Agent.ID.make("build")

      yield* agent.transform((editor) =>
        editor.update(id, (info) => {
          info.mode = "primary"
          info.hidden = true
        }),
      )

      expect(yield* agent.get(id)).toMatchObject({ id, mode: "primary", hidden: true })
    }),
  )

  it.effect("creates agents with runtime defaults and supports direct removal", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      const id = Agent.ID.make("custom")

      yield* agent.transform((editor) => editor.update(id, () => {}))
      const info = yield* agent.get(id)
      expect(info?.mode).toBe("primary")
      expect(info?.permissions.slice(0, Agent.Info.default(id).permissions.length)).toEqual(
        Agent.Info.default(id).permissions,
      )
      expect(
        Permission.evaluate("external_directory", path.join(global.data, "shell", "*", "*"), info?.permissions ?? [])
          .effect,
      ).toBe("allow")
      expect(
        Permission.evaluate("external_directory", path.join(global.data, "tool-output", "*"), info?.permissions ?? [])
          .effect,
      ).toBe("allow")
      expect(
        Permission.evaluate("external_directory", path.join(global.config, "*"), info?.permissions ?? []).effect,
      ).toBe("allow")
      expect(
        Permission.evaluate("external_directory", path.join(global.tmp, "*"), info?.permissions ?? []).effect,
      ).toBe("allow")

      yield* agent.transform((editor) => editor.remove(id))
      expect(yield* agent.get(id)).toBeUndefined()
    }),
  )

  it.effect("registers the mission primaries with recon as the default", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      yield* PentestAgents.Plugin.effect(host({ agent: agentHost(agent) })).pipe(
        Effect.provideService(Global.Service, Global.Service.of(global)),
      )
      yield* SharedAgents.Plugin.effect(host({ agent: agentHost(agent) }))
      yield* AgentPlugin.Plugin.effect(host({ agent: agentHost(agent) }))

      const agents = yield* agent.list()
      expect(agents.map((item) => String(item.id)).sort()).toEqual([
        "compaction",
        "cve-researcher",
        "defend",
        "explore",
        "forensics",
        "general",
        "govern",
        "offensive",
        "osint",
        "recon",
        "report-writer",
        "scan-parser",
        "summary",
        "title",
      ])

      // The five mission primaries are selectable; recon is the default (safest posture).
      for (const id of ["recon", "offensive", "defend", "forensics", "govern"]) {
        const info = yield* agent.get(Agent.ID.make(id))
        expect(info?.mode).toBe("primary")
        expect(info?.hidden).toBe(false)
      }
      expect((yield* agent.get(Agent.defaultID))?.id).toBe(Agent.ID.make("recon"))
      const compaction = yield* agent.get(Agent.ID.make("compaction"))
      expect(compaction?.mode).toBe("primary")
      expect(compaction?.hidden).toBe(true)
      expect(compaction?.system).toBeUndefined()
      expect(compaction?.request).toEqual(Agent.Info.default(Agent.ID.make("compaction")).request)

      // No built-in agent silently enables bash.
      for (const item of agents) {
        expect(item.permissions.some((rule) => rule.action === "bash" && rule.effect !== "deny")).toBe(false)
      }
    }),
  )

  it.effect("denies the subagent tool for built-in subagents", () =>
    Effect.gen(function* () {
      const agent = yield* Agent.Service
      yield* PentestAgents.Plugin.effect(host({ agent: agentHost(agent) })).pipe(
        Effect.provideService(Global.Service, Global.Service.of(global)),
      )
      yield* SharedAgents.Plugin.effect(host({ agent: agentHost(agent) }))

      yield* Effect.forEach(["general", "explore", "osint", "scan-parser", "cve-researcher", "report-writer"], (id) =>
        Effect.gen(function* () {
          const info = yield* agent.get(Agent.ID.make(id))
          if (!info) throw new Error(`expected built-in subagent: ${id}`)
          expect(info.mode).toBe("subagent")
          expect(Permission.evaluate("subagent", "*", info.permissions).effect).toBe("deny")
        }),
      )
    }),
  )
})
