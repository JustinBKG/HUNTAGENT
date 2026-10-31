# Dependency Rules

Dependencies point inward, from interfaces to transport to application to ports to domain shapes. The rules below are enforced by tests, not by convention alone.

## Package rules

Enforced by `packages/core/test/architecture/workspace-dependencies.test.ts`, which reads each `package.json` and scans `src/`:

| Package    | May depend on (internal)                                       | Must not depend on                                                |
| ---------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `schema`   | nothing                                                        | everything                                                        |
| `util`     | nothing                                                        | everything                                                        |
| `codemode` | nothing                                                        | everything                                                        |
| `ai`       | `schema`                                                       | everything else                                                   |
| `protocol` | `schema`                                                       | everything else                                                   |
| `client`   | `protocol`, `schema`                                           | everything else, in particular `core` and `server`                |
| `plugin`   | lower layers                                                   | `core`, `server`, `sdk`, `cli`, `tui`                             |
| `core`     | `ai`, `codemode`, `plugin`, `schema`, `util`                   | `protocol`, `client`, `server`, `sdk`, `cli`, `tui`               |
| `server`   | `core`, `protocol`, …                                          | `client`, `sdk`, `cli`, `tui`                                     |
| `sdk`      | `client`, `core`, `server`, …                                  | `cli`, `tui`                                                      |

The test also checks two things:

- every runtime `@huntagent/*` import in `src/` is declared in `dependencies` or `peerDependencies` (type-only imports are exempt)
- the workspace package graph has no cycles

`packages/client/test/import-boundaries.test.ts` and `packages/sdk/test/import-boundaries.test.ts` additionally bundle the public entry points to prove what they pull in.

## Core runtime rules

Enforced by `packages/core/test/architecture/runtime-boundaries.test.ts`. The runtime is `runtime/session.ts`, `runtime/session/**`, `runtime/tool.ts`, `runtime/tool-output.ts`, `runtime/permission.ts`, `runtime/permission/**`, `runtime/agent.ts`, and `runtime/form.ts`. It must not import:

| Forbidden                                                                                            | Why                                                                         |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `agents/**`                                                                                          | Profiles specialize the runtime through plugins; the runtime stays neutral. |
| `tools/plugin/**`, `config/plugin/**`                                                                 | Built-in tools and config are composed in, not depended on.                 |
| `plugin/*` except `plugin/service`, `plugin/hooks`                                                   | Only the plugin host is infrastructure; other modules there are plugins.    |
| `ai`, `openai`, `@ai-sdk/*`, `@anthropic-ai/*`, `@huntagent/ai/providers*`, `@huntagent/ai/protocols*` | Models are reached only through `LLMClient`.                                |

Two more rules:

- **Profiles do not import each other.** `agents/<a>/**` never imports `agents/<b>/**`. Shared capability belongs in the runtime or in `tools/plugin/`.
- **Direct Drizzle access is frozen.** The runtime files that query SQLite through `drizzle-orm` today are listed in the test. A new file on that list is a design decision, not an allowlist edit.

## Why tests and not lint rules

Package boundaries are visible in manifests, and the core boundaries are path-based. A small static scan is deterministic, fast (about 70 ms), and fails with the exact offending `file -> target` pair. Each rule was checked by injecting a violation and confirming that the test fails. See [decision 0004](decisions/0004-architecture-tests.md).

## Changing a rule

Edit the rule table in the test and this page in the same change, and explain the new dependency in the PR. If you need a runtime module to know about a specific profile, add a plugin hook or a service instead.
