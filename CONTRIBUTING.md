# Contributing to Huntagent

Thanks for your interest in improving Huntagent. The changes most likely to be
accepted are:

- Bug fixes
- Additional LSPs, formatters, and tools
- Agent and LLM performance improvements
- Environment-specific fixes
- Missing standard behavior
- Documentation improvements

UI and core product features benefit from discussion before implementation. If
you are unsure whether a change fits, open an issue describing the problem
first.

## Adding model providers

New providers rarely require Huntagent changes. The model catalog is sourced
from [models.dev](https://github.com/anomalyco/models.dev) (overridable via the
`HUNTAGENT_MODELS_URL` environment variable), so adding a model there is usually
enough. Huntagent ships a bundled catalog snapshot as an offline fallback.

## Development

Huntagent requires [Bun](https://bun.sh) 1.3.14 or newer (CI pins `1.4.2`).
From the repository root:

```sh
bun install
bun run dev [directory]
```

`bun run dev` runs the CLI and TUI from source and manages a local background
service for you. Pass a directory to open another project, or `.` to open this
repository.

To test a development TUI against your installed Huntagent background service
and live sessions:

```sh
bun run dev:live [directory]
```

See [docs/development/setup.md](./docs/development/setup.md) for the full setup,
requirements, and configuration details.

### Packages

- `packages/schema` — shared wire and storage contracts
- `packages/core` — domain behavior, the session engine, and persistence
- `packages/protocol` — public API definitions
- `packages/server` — HTTP server and runtime composition
- `packages/client` / `packages/sdk` — generated clients and the composed SDK
- `packages/cli` — command-line entrypoint and service lifecycle
- `packages/tui` — the terminal interface
- `packages/plugin` — the plugin API

### Verification

Run type-checks, and tests where defined, from the affected package rather than
the repository root (a root guard blocks `bun test` there):

```sh
cd packages/core
bun run test
bun typecheck
```

Or run the canonical full lint + type-check from the repository root:

```sh
bun run check
```

Follow package-specific instructions in nearby `AGENTS.md` files. After changing
the public Protocol or Server `HttpApi`, run `bun run generate` from
`packages/client`; never edit generated client files directly.

Follow the repository [style guide](./AGENTS.md).

## Pull Requests

Base branches on `main` and target your PR at `main`.

### Keep it focused

- Keep PRs small and focused on one change.
- Explain the problem and why the change fixes it.
- Check whether the functionality already exists.
- For UI changes, include before-and-after screenshots or video.
- For logic changes, explain what you tested and how a reviewer can verify it.

### Keep it brief

Write a short explanation in your own words. If a change cannot be explained
briefly, the PR may be too large.

### Use conventional titles

Use `type(scope): summary`. Supported types are `feat`, `fix`, `docs`, `chore`,
`refactor`, and `test`. The scope is optional; use the affected package or area
when helpful (e.g. `core`, `cli`, `tui`, `server`, `sdk`, `plugin`).

Use a short branch name of at most three words separated by hyphens, with no
slashes or type prefixes — for example `session-recovery` or `fix-scroll-state`.

Examples:

- `docs: update contributing guide`
- `fix(tui): restore scroll position`
- `feat(core): add scope policy override`
