# Development Setup

## Requirements

- [Bun](https://bun.sh). The root `package.json` pins `packageManager: bun@1.4.2`. Bun 1.3.14 also installs and runs the agent packages, but CI uses the pinned version.
- Git.
- `ripgrep` (`rg`) on `PATH`. Without it, the grep and glob tools try to download a ripgrep binary. That works in normal use but fails in tests, which block network access.
- About 6 GB of free RAM for a cold Core typecheck (see [testing.md](testing.md#memory)).

## Install

```sh
bun install
```

`postinstall` repairs the `node-pty` native module (`packages/core/script/fix-node-pty.ts`), and `prepare` installs Husky hooks.

## Run

| Command                        | What it does                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| `bun run dev`                  | Runs the CLI from source (`packages/cli/src/index.ts`) with the TUI                  |
| `bun run dev /path/to/project` | Same, opened on a project                                                            |
| `bun run dev:live`             | TUI from this worktree against the installed background server and its live Sessions |

Configure a model provider through the TUI (`/connect`) or `huntagent auth login`. Credentials stay on the machine.

## Configure agents

Agents are configured in `huntagent.json` (project) or the global config under `agents`:

```jsonc
{
  "agents": {
    "pentest": {
      "steps": 200,
      "budget": { "seconds": 3600, "cost": 5 },
    },
  },
}
```

`steps`, `budget.seconds`, and `budget.cost` (USD) bound a single turn. See [agent-lifecycle.md](../architecture/agent-lifecycle.md#limits). `budget` exists only under the native `agents` key. The legacy `agent` and `mode` keys are migrated (`core/src/config/normalize.ts`) and carry `steps` but not `budget`.

## Checks

| Command                 | Where               | Purpose                                      |
| ----------------------- | ------------------- | -------------------------------------------- |
| `bun run check`         | repository root     | Canonical lint and typecheck for everything  |
| `bun typecheck`         | a package directory | Focused typecheck while iterating            |
| `bun run test [files…]` | a package directory | Package tests. Never run tests from the root |
| `bun run generate`      | `packages/client`   | Regenerate the client after HttpApi changes  |
