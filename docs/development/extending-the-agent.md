# Extending the Agent

The runtime is domain-neutral. A specialization is a **profile**: a folder of plugins under `packages/core/src/agents/<name>/` that contributes prompts, agents, commands, and tools through the public plugin API. The pentest profile (`agents/pentest/`, documented in its `AGENTS.md`) is the reference implementation; profile-neutral subagents live in `agents/shared/`.

For a one-off extension outside the repository (a tool, a hook, an agent), write an external plugin with the same API. See `packages/plugin/src/README.md`.

## Extension points

| You want to change                                | Use                                                                                       | Example                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| The system prompt                                 | `ctx.session.hook("context" \| "compaction" \| "generate")` and rewrite `event.system[0]` | `agents/pentest/prompt.ts`                                      |
| Model-specific prompt variants                    | the same hooks, keyed on `event.model`                                                    | a prompt plugin keyed on `event.model`                          |
| Available agents and their policy                 | `ctx.agent.transform((editor) => editor.update(id, …))`                                   | `agents/pentest/agents.ts`, `agents/shared/agents.ts`           |
| Mode-like behavior (reminders, tool restrictions) | `ctx.session.hook("context")` plus `ctx.tool.hook("execute.after")`                       | `agents/pentest/scope.ts`                                       |
| Slash commands                                    | `ctx.command.transform((editor) => editor.add(…))`                                        | `agents/<name>/commands.ts`                                     |
| Tools                                             | `ctx.tool.transform((editor) => editor.add(…))`                                           | `tools/plugin/*.ts`, `specs/v2/tools.md`                        |
| Approval requirements                             | agent `permissions` rules plus `Permission.assert` in tools                               | `agents/pentest/agents.ts` (Pentest)                            |
| Turn limits                                       | agent `steps` and `budget`                                                                | [agent-lifecycle.md](../architecture/agent-lifecycle.md#limits) |
| Retry decisions                                   | `ctx.session.hook("retry")`                                                               | `runtime/session/runner/retry.ts`                               |

## Adding a profile

1. **Create the folder.** Use `packages/core/src/agents/<name>/`, with prompt text in `.txt` files next to the plugin that loads it.
2. **Define the prompt plugin.** Copy the shape of `agents/pentest/prompt.ts`: skip agents that set their own `system`, and replace `system[0]` with your rendered prompt. `SessionSystemPrompt.render(template, toolNames)` expands `${HUNTAGENT_TOOL_GUIDANCE}`.
3. **Define agents.** A primary agent has `mode: "primary"`, a prompt in `system` or from your prompt plugin, and a `permissions` ruleset. Rules are evaluated in order and the last match wins. Use `"ask"` for actions that need a human in the loop.
4. **Add domain tools** with `Tool.make`-style definitions through `ctx.tool.transform`. Tools that only this profile uses go in `agents/<name>/tools/`. Inside `execute`, call `Permission.assert` with the invocation's `messageID` and `id`, as the built-ins do. The registry does not authorize execution.
5. **Register the plugins** in `plugins/internal.ts`. Order matters: plugins activate in list order, and hooks run in activation order. Document any ordering constraint in your profile's `AGENTS.md`.
6. **Test it.**
   - Unit-test each plugin by activating it against a test host (`test/plugin/host.ts`). See `test/agents-pentest.test.ts`.
   - Add an end-to-end test like those in `packages/sdk/test/embedded.test.ts`, which scripts the model with `TestLLM` and asserts on files, durable messages, and the prompt the model received.
   - Run `packages/core/test/architecture`. It rejects imports between profiles and from the runtime into a profile.

## Rules

- Never import another profile. If two profiles need something, move it to the runtime or to `tools/plugin/`.
- Never import a profile from the runtime. If the runtime needs to know something profile-specific, add a hook or a service.
- Do not edit another profile's prompts to make yours work. A prompt change is a behavior change and needs its own review and tests.
- Tools must stay correct across restarts. Recovery never replays an interrupted tool call. It reports the call to the model as interrupted. Tools with external side effects should be idempotent or should check state before acting.
