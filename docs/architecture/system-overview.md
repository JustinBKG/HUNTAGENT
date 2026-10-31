# System Overview

## Processes

| Process              | Entry point                         | Role                                                                                     |
| -------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| CLI                  | `packages/cli/src/index.ts`         | Parses commands. The default command starts the TUI and connects it to a managed server. |
| Managed server       | `packages/server/src/process.ts`    | Long-lived local server. Boots Core, serves the HttpApi, runs startup recovery.          |
| Fetch / workerd host | `packages/server/src/fetch.ts`      | Same server for fetch-style runtimes. Also runs startup recovery.                        |
| Embedded SDK host    | `packages/sdk/src/internal/host.ts` | Core and Server in-process for embedders and end-to-end tests.                           |

One managed server owns the local database. Clients reconnect to it across TUI restarts, and `opencode service status` reports it.

## Components

| Component                    | Implementation                                                            | Responsibility                                                                              |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Session facade               | `core/src/session.ts`, `core/src/session/session.ts`                      | Prompt admission, idempotency, wake policy, interruption, message queries                   |
| Inbox                        | `core/src/session/inbox.ts`                                               | Durable pending input; steer and queue delivery; control items                              |
| Execution coordinator        | `core/src/session/execution.ts`, `session/run-coordinator.ts`             | Process-local ownership per Session, wake coalescing, write-ahead claims                    |
| Runner (drain + step policy) | `core/src/session/runner/llm.ts`                                          | Delivers input at Step boundaries; runs Steps; retries; limits; compaction                  |
| Step attempt                 | `core/src/session/runner/step.ts`                                         | One `llm.stream` call; eager tool execution; durable settlement                             |
| Request assembly             | `core/src/session/model-request.ts`, `session/context.ts`                 | System prompt, history, tool definitions, plugin hooks, output limits                       |
| Model client (port)          | `ai/src/route/client.ts` (`LLMClient`)                                    | Provider-neutral streaming; providers in `ai/src/providers`                                 |
| Tool registry                | `core/src/tool.ts`, `core/src/tool-output.ts`                             | Scoped registration, input/output codecs, bounded model content                             |
| Built-in tools               | `core/src/tool/plugin/*.ts`                                               | shell, read, write, edit, patch, grep, glob, webfetch, websearch, question, subagent, skill |
| Permissions                  | `core/src/permission.ts`, `core/src/permission/`                          | Rule evaluation, ask/approve/decline, saved approvals                                       |
| Compaction                   | `core/src/session/compaction.ts`                                          | Rolling summaries when the request exceeds the context budget                               |
| Instructions                 | `core/src/instructions/`, `session/instruction-state.ts`                  | Content-addressed instruction sources (AGENTS.md, skills, MCP, entries)                     |
| Event bus and projections    | `core/src/bus.ts`, `session/projector.ts`, `session/store.ts`             | Durable events committed with their SQLite projections                                      |
| Restart recovery             | `core/src/session/execution/restart.ts`                                   | Resumes claimed Sessions after restart with a bounded attempt budget                        |
| Plugin host                  | `core/src/plugin.ts`, `core/src/plugins/supervisor.ts`, `plugin/hooks.ts` | Sequential activation, scoped registrations, hook dispatch                                  |
| Composition root (plugins)   | `core/src/plugins/internal.ts`                                            | Ordered list of built-in plugins, including the pentest profile                             |
| Pentest profile              | `core/src/agents/pentest/`                                                | Pentest prompt, the Pentest agent, and the engagement-scope guardrail                       |
| Shared subagents             | `core/src/agents/shared/`                                                 | Profile-neutral `general` and `explore` subagents                                           |
| Observability                | `util/src/observability.ts`, `core/src/event-logger.ts`                   | Effect logging; OTLP export when `OTEL_EXPORTER_OTLP_ENDPOINT` is set                       |

## A request, end to end

1. A client calls `sessions.prompt`. Server handlers in `server/src/handlers` call the Core Session facade.
2. `Session.prompt` publishes `session.inbox.enqueued`. Its projection inserts one `session_inbox` row in the same transaction. Then it calls `SessionExecution.wake(sessionID)`.
3. The coordinator starts a busy period, publishing `session.execution.started` together with a write-ahead claim, and calls the Location-scoped runner's `drain`.
4. At the Step boundary the runner promotes inbox input into visible messages, reloads history, resolves agent, model, and tools, and assembles the request. Plugin `context` hooks run here, which is where the pentest profile installs its prompt.
5. `SessionStep.attempt` streams one model call. Each complete local tool call is recorded durably before it runs. Tools run concurrently, and outcomes are published in order.
6. If the model asked for tools, the runner starts a new Step from reloaded history. Otherwise the busy period ends with `session.execution.succeeded`, which releases the claim.

Every durable event is readable through `sessions.log`. With `follow: true` it streams live.
