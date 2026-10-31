# Project Structure

The repository is a Bun workspace (`package.json` → `workspaces`), built with Turbo. Agent-platform code lives in `packages/`. Hosted services (`services/`, `packages/console`, `packages/stats`), infrastructure (`infra/`, `sst.config.ts`), and release tooling (`script/`) support the product but are outside the agent runtime.

## Agent platform packages

```
packages/
├── schema/        public domain shapes and durable event payloads           (no internal deps)
├── util/          Effect helpers, process, filesystem, observability        (no internal deps)
├── ai/            LLMClient port, provider protocols and adapters, TestLLM  (schema)
├── codemode/      confined code execution over schema-described tools       (no internal deps)
├── protocol/      HttpApi endpoint definitions                              (schema)
├── client/        generated HTTP client                                     (protocol, schema)
├── plugin/        public plugin API                                         (ai, client, protocol, schema, util, theme)
├── core/          agent runtime, built-in plugins, pentest profile           (ai, codemode, plugin, schema, util)
├── server/        HttpApi handlers over Core                                (core, protocol, schema, util)
├── sdk/           embeddable host composing Client + Core + Server
└── cli/  tui/     terminal interface and launcher
```

## Core (`packages/core/src`)

Core is organized into role-based layers:

| Layer / path                     | Responsibility                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `runtime/`                       | The generic agent engine: `session/` (admission, inbox, execution, runner, step, compaction, history, projections), `tool.ts`/`tool-output.ts` + `tool/` (registry, execution engine, MCP bridge), `permission.ts`/`permission/`, `agent.ts`, `form.ts`, `bus.ts`, `state.ts`, `event/`, `model*.ts`, `instructions/`, `reference/`, `skill/`, `snapshot.ts` |
| `runtime/session/runner/`        | `llm.ts` drain and Step policy, `step.ts` attempts, `retry.ts`, `max-steps.ts` turn limits and budgets                                                                                                                                                                                                                                                       |
| `runtime/session/runner/prompt/` | The neutral fallback system prompt for agents when no profile installs one                                                                                                                                                                                                                                                                                   |
| `tools/plugin/`                  | The shared built-in tool library (shell, read, edit, grep, …), usable by any agent profile                                                                                                                                                                                                                                                                   |
| `agents/<name>/`                 | Agent profiles: `pentest/` (prompt, agents, scope) and the neutral subagents in `shared/` — see each profile's `AGENTS.md`                                                                                                                                                                                                                                   |
| `plugins/`                       | Plugin host (`service`, `hooks`, `plugin.ts`), internal plugins, provider plugins (`provider/`); `internal.ts` is the composition root                                                                                                                                                                                                                       |
| `config/`                        | Configuration loading and the config plugins (`config/plugin/`) that apply it                                                                                                                                                                                                                                                                                |
| `infrastructure/`                | Concrete adapters: `database/`, `filesystem/`, `shell/`, `pty/`, `mcp/`, `vcs/`, `worktree/`, `environment/`, `provider.ts`, `location*`, …                                                                                                                                                                                                                  |
| `shared/`                        | Cross-cutting primitives: `effect/`, `util/`, `codemode/`, `schema.ts`, `rpc.ts`, `v1/`                                                                                                                                                                                                                                                                      |

Tests live beside each package in `packages/<name>/test`. Architecture tests are in `packages/core/test/architecture/`, and the end-to-end agent tests are in `packages/sdk/test/`.

## Where new code goes

| You are adding                             | Put it in                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| A new agent specialization (e.g. pentest)  | `core/src/agents/<name>/`, registered in `plugins/internal.ts`                                          |
| A tool useful to any profile               | `core/src/tool/plugin/<tool>.ts`                                                                        |
| A tool only one profile uses               | `core/src/agents/<name>/tools/`                                                                         |
| A new durable event or public shape        | `schema/src/`, then project it in `core/src/session/projector.ts`                                       |
| A new HTTP operation                       | `protocol/src/groups/`, handler in `server/src/handlers/`, then `bun run generate` in `packages/client` |
| A model provider                           | `ai/src/providers/` and a provider plugin in `core/src/plugins/provider/`                               |
| A runtime policy (limits, retry, recovery) | `core/src/session/runner/` or `core/src/session/execution/`                                             |

## Deviations from a textbook layout

The structure maps Clean/Hexagonal layers onto packages and Effect services rather than onto `domain/ application/ ports/ infrastructure/` folders inside one package:

- **Ports are Effect service tags, not interface folders.** `LLMClient.Service`, `Tool.Service`, `Permission.Service`, `SessionStore.Service`, and the rest each sit beside their default implementation. A test or host swaps the implementation through the layer graph.
- **Domain shapes are a package (`schema`).** They are shared with the public protocol and the generated client, so they cannot live inside Core.
- **Use cases are Session operations.** Create, execute, resume, and cancel are `Session.create`, `Session.prompt` plus `SessionExecution.wake`, `SessionExecution.resume`, and `SessionExecution.interrupt`. They are not separate `application/` modules.

[Decision 0001](decisions/0001-layers-as-packages.md) records why.
