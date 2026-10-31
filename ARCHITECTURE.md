# Architecture

OpenCode is a local-first agent platform written in TypeScript on Bun and [Effect](https://effect.website). Today it ships one agent profile, a pentest agent. The runtime that executes agents is domain-neutral, durable, and built for long-running work; the pentest behavior is a set of plugins composed on top of it.

This document is the map. Details live in:

| Document                                                                         | Covers                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [docs/architecture/system-overview.md](docs/architecture/system-overview.md)     | Components, runtime processes, and how a request flows through them |
| [docs/architecture/project-structure.md](docs/architecture/project-structure.md) | Where each responsibility lives and where new code goes             |
| [docs/architecture/agent-lifecycle.md](docs/architecture/agent-lifecycle.md)     | Admission, the step loop, limits, retries, interruption, recovery   |
| [docs/architecture/dependency-rules.md](docs/architecture/dependency-rules.md)   | Permitted dependencies and the tests that enforce them              |
| [docs/architecture/decisions/](docs/architecture/decisions/)                     | Why the structure is what it is                                     |
| [docs/development/](docs/development/)                                           | Setup, testing, and extending the agent                             |
| [specs/v2/](specs/v2/)                                                           | Detailed Session and Tool contracts                                 |

## Layers

The layers are workspace packages. A package boundary is a dependency boundary that the package manager, the type checker, and the architecture tests all see.

```
cli · tui · app · desktop          clients
            │
           sdk                     composes Client + Core + Server
            │
         server                    HTTP/SSE handlers for the public HttpApi
        ┌───┴──────────┐
      core          protocol       runtime  ·  public API contract
   ┌────┼──────┐       │
   ai  plugin codemode client      model client · plugin API · generated client
   └────┴──────┴───────┘
      schema · util                domain shapes, durable events, helpers
```

- **`schema`** owns public domain shapes and durable event payloads. It depends on nothing internal.
- **`ai`** is the provider-neutral model client (`LLMClient`) plus provider protocol adapters. The runtime sees only `LLMClient`.
- **`plugin`** is the public plugin API: `define({ id, effect })` with `ctx.agent`, `ctx.tool`, `ctx.command`, and `ctx.session.hook`.
- **`core`** is the application: Session admission, the step runner, tool registry and execution, permissions, persistence, and the built-in plugins, including the pentest profile.
- **`protocol`** defines HTTP endpoints; **`server`** implements them over Core; **`client`** is generated from them.
- **`sdk`** composes Client, Core, and Server into an embeddable host. Clients (`cli`, `tui`, `app`, `desktop`) sit on top.

## Inside Core

```
core/src
├── session/ … runtime/tool.ts · runtime/permission.ts · runtime/agent.ts · runtime/form.ts   runtime: admission, step loop, tools, policy
├── agents/pentest/                                           pentest profile: prompt, agents, scope policy
├── agents/shared/                                            profile-neutral subagents (general, explore)
├── tools/plugin/                                              shared built-in tools (shell, read, edit, …)
├── plugin/                                                   plugin host + internal plugins; internal.ts composes them
├── config/plugin/                                            configuration plugins
└── database/ · filesystem/ · shell/ · mcp/ · …               infrastructure services
```

Effect services are the ports. Each one is a `Context.Service` tag with a `Layer` implementation and a `makeLocationNode` or `makeGlobalNode` declaration of its dependencies, and hosts compose those nodes. Tests replace any node, for example `llmClient.replace(...)` or `SessionRunnerModel.node.replace(...)`, without touching production code.

The runtime does not import any agent profile, built-in tool plugins, configuration plugins, concrete provider plugins, or provider SDKs. A profile reaches the runtime only through plugin hooks. `packages/core/test/architecture/runtime-boundaries.test.ts` enforces both directions.

## Design principles

1. **Durable facts, derived views.** Every state change is a durable Session event, and SQLite projections are rebuilt from events. Each step reloads history from the database instead of looping in memory.
2. **Admission before execution.** Input is recorded in the inbox before any model work, so crashes never lose a prompt.
3. **Process-local execution, durable recovery.** A write-ahead claim marks a busy Session. Startup recovery resumes claimed Sessions with bounded attempts and fails interrupted tool calls instead of replaying them.
4. **Profiles are plugins.** Prompts, agents, commands, and domain tools are contributed through the same plugin API that third parties use.
5. **Narrow ports.** Model access goes through `LLMClient`, tools through `Tool.Service`, approvals through `Permission`, and persistence through Session store and projector modules.

## Known architectural debt

- Several runtime modules query SQLite through Drizzle directly instead of through a store port. The architecture test pins the current list so it cannot grow.
- `Agent.defaultID` is `"pentest"`, the only selectable primary. The runtime falls back to any selectable agent when it is absent.
- Execution is process-local. There is no clustered ownership or fencing; see [agent-lifecycle.md](docs/architecture/agent-lifecycle.md).
