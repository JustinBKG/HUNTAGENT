# Huntagent

**An open-source, local-first AI pentesting agent in your terminal.**

Huntagent gives you an autonomous security agent that runs entirely on your
machine. You bring your own model provider API key; your prompts, credentials,
and session history never leave the host. It is a hard fork of the
[opencode](https://github.com/anomalyco/opencode) agent engine, stripped of
cloud tie-ins and refocused on offensive-security workflows.

> [!WARNING]
> Huntagent is for **authorized** security testing only — your own systems or
> targets you have written permission to test. You are responsible for how you
> use it.

<!-- Badges -->
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![Built with Bun](https://img.shields.io/badge/built%20with-Bun-000000.svg?style=flat-square)](https://bun.sh)

---

## What you get

- **A terminal UI** for an interactive agent session — the pentest agent is the
  only shipped profile.
- **Bring-your-own-key** model access: Anthropic, OpenAI, Google (AI Studio and
  Vertex), OpenRouter, xAI, Ollama, LM Studio, and any OpenAI-compatible
  endpoint. No hosted gateway, no sign-up.
- **A durable agent engine** underneath: the pentest agent is a profile of
  plugins on top of a domain-neutral, resumable session runtime. See
  [Architecture](#architecture).
- **Local-first**: a background service runs on your machine and is managed for
  you. Nothing is published to a remote service.

## Requirements

- **[Bun](https://bun.sh) 1.3.14 or newer** (CI pins `1.4.2`).
- **Git**.
- **[ripgrep](https://github.com/BurntSushi/ripgrep) (`rg`) on your `PATH`** —
  used by the search tools. (Without it the agent downloads a ripgrep binary on
  first use, which works but is slower.)
- Roughly **6 GB of free RAM** for a cold type-check of the core package (only
  relevant if you are developing, not just running).

Linux and macOS are the primary targets.

## Quick start

Huntagent is not yet published to a package manager — run it from source:

```sh
# 1. Clone
git clone https://github.com/JustinBKG/huntagent.git
cd huntagent

# 2. Install dependencies (this also repairs the node-pty native module)
bun install

# 3. Launch the TUI (starts a local background service automatically)
bun run dev

# ...or open it on a specific project directory
bun run dev /path/to/target-project
```

On first launch you have no model configured. Connect a provider from inside
the TUI:

1. Type `/connect` (or `/models`) and press Enter.
2. Pick a model — if its provider has no key yet, you are dropped straight into
   a paste-your-key prompt.
3. Paste your provider API key. It is stored locally and the chosen model
   activates immediately.

Either way, **credentials stay on your machine.**

## Using it

Inside a session, type `/` to open the command list. The essentials:

| Command | What it does |
| --- | --- |
| `/connect`, `/models` | Choose a model; paste a provider key inline if needed |
| `/agents` | Switch agent profile |
| `/variants` | Switch model reasoning/thinking variant (if the model supports it) |
| `/new`, `/sessions` | Start a new session / resume an existing one |
| `/compact`, `/fork` | Compact or fork the current session |
| `/skills`, `/plugins`, `/mcps` | Browse skills, plugins, and MCP servers |
| `/themes`, `/settings` | Appearance and configuration |
| `/help` | Full keybinding and command reference |

The full command and keybinding reference lives behind `/help` in the app. You
can also manage credentials from the CLI with `huntagent auth login`.

### Configuration

Project-level config lives in `huntagent.json` (or `huntagent.jsonc`) at the
repo root; global config lives under your platform config directory. See
[docs/development/setup.md](./docs/development/setup.md#configure-agents) for the
`agents` block (step and budget limits) and other options.

## Architecture

Huntagent's runtime is a domain-neutral, durable agent engine; the pentest
agent is a profile of plugins on top of it. The codebase is organized as
layered packages:

- `packages/schema` — shared wire and storage contracts
- `packages/core` — domain behavior, the session engine, and persistence
- `packages/protocol` — public API definitions
- `packages/server` — HTTP server and runtime composition
- `packages/client` / `packages/sdk` — generated clients and the composed SDK
- `packages/cli` — command-line entrypoint and local service lifecycle
- `packages/tui` — the terminal interface
- `packages/plugin` — the plugin API
- `packages/ai`, `packages/theme`, `packages/util` — provider SDKs, theming, shared utilities

Start with [ARCHITECTURE.md](./ARCHITECTURE.md), then
[docs/architecture](./docs/architecture) for the agent lifecycle and dependency
rules, and [docs/development](./docs/development) for setup, testing, and adding
a new agent profile.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for
the development workflow, verification steps, and PR conventions, and follow the
repository [style guide](./AGENTS.md).

## Security

To report a vulnerability, see [SECURITY.md](./SECURITY.md). Do not open a
public issue for security reports.

## License

[MIT](./LICENSE).
