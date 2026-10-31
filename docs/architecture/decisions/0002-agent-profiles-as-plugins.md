# 0002: Agent specializations are plugin profiles under `agents/`

Status: Accepted

## Context

The platform must support specializations beyond coding, such as a future security-assessment agent with its own prompts, tools, workflows, and approval policy, without duplicating the engine. Before this change, coding behavior was spread through Core:

| Coding-specific part                      | Was in                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Harness prompt ("a coding agent harness") | `session/runner/prompt/system.txt`, loaded by the runtime    |
| Model-specific prompts and selector       | `plugin/system-prompt/*.txt`, `plugin/optimize.ts`           |
| Build, General, Explore agents            | `plugin/agent.ts`, mixed with runtime-required hidden agents |
| Plan agent                                | `plugin/plan.ts`                                             |
| `/init`, `/review` commands               | `plugin/command.ts`, mixed with MCP prompt commands          |

The plugin API already lets a plugin do everything a profile needs: `ctx.agent.transform`, `ctx.command.transform`, `ctx.tool.transform`, and `ctx.session.hook("context" | "compaction" | "generate")`. The model-specific prompt plugins already used the `context` hook to replace the prompt.

## Decision

- A profile is a folder of plugins under `core/src/agents/<name>/`, composed in `plugin/internal.ts`. The coding profile is `agents/coding/`.
- The runtime ships a neutral fallback prompt. The coding profile installs its harness prompt through session hooks (`CodingPrompt.Plugin`), placed first so it renders from the complete tool list. The rendered text is byte-identical to the previous default, which was verified against a golden copy and is covered by `packages/sdk/test/coding-agent.test.ts`.
- Mixed modules are split. Runtime-required hidden agents (compaction, title, summary) stay in `plugin/agent.ts`, and MCP prompt commands stay in `plugin/command.ts`.
- Built-in tools stay in `tool/plugin/` as a shared library. Shell, read, grep, webfetch, and the others serve any profile, so moving them under `coding/` would make every future profile depend on the coding profile.
- Prompt content is unchanged. Moving a prompt is not a reason to edit it.

## Consequences

- A new profile contributes plugins and never edits the runtime. Architecture tests stop the runtime from importing `agents/**` and stop profiles from importing each other.
- Activation order in `plugin/internal.ts` is now part of the contract. `agents/coding/AGENTS.md` records it, and the end-to-end test fails if the coding prompt plugin goes missing.
- New plugin IDs: `huntagent.prompt.coding`, `huntagent.agent.coding`, and `huntagent.command.coding`. `huntagent.agent` and `huntagent.command` keep their IDs but now carry only the runtime parts. A user config that removed `huntagent.agent` to suppress the Build agent must now remove `huntagent.agent.coding` instead.
- `Agent.defaultID` is still `"build"`. The runtime falls back to any selectable agent, so another profile works without it. Making the default profile-provided is left as follow-up.
