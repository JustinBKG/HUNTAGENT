# 0006: Gated helper subagents, delegated per mission

Status: Accepted

## Context

[0005](0005-cybersecurity-primary-agents.md) left delegation off: every mission primary denies the `subagent` action, because the only subagents that exist (`general`, `explore`) run `shell` with effect `allow`, so a primary delegating to them would run commands with no approval and bypass its own `ask` gate.

Two engine facts make a safe design possible:

- **The `subagent` permission is gated per helper.** When a primary delegates, the tool asserts `subagent` with the helper's agent id as the resource (`tools/plugin/subagent.ts`), and the tool only lists helpers whose `subagent` effect for the caller is not `deny`. So a primary can be allowed to delegate to specific helper ids and denied all others.
- **Background execution already exists.** The `subagent` tool takes a `background` flag: foreground runs the helper to completion and returns its output; background returns immediately and notifies the parent on completion. Depth is capped by `experimental.subagent_depth` (default 1), so a helper cannot spawn further helpers.

## Decision

Introduce a small set of **purpose-built helper subagents**, each read-only or otherwise strictly less privileged than the missions that call it, and replace each primary's blanket `subagent` deny with per-helper allows.

### The invariant

A helper is blessed for a mission only if the helper's authority is a **subset** of that mission's authority. A helper can never do something its caller could not do itself, so delegation cannot escalate. Every blessing below satisfies this.

### The helpers

All are `mode: "subagent"`, carry their own focused `system` prompt, deny `subagent` (no sub-delegation), and write — if at all — only inside the engagement directory.

| Helper          | Job                                                                         | Permissions                                                              |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `osint`         | passive open-source intelligence on the authorized scope                    | deny-by-default; read, grep/glob, `websearch` allow, `webfetch` **ask**  |
| `scan-parser`   | turn raw tool output in the engagement dir into structured findings         | deny-by-default; read, grep/glob only (no web, no shell, no write)       |
| `cve-researcher`| correlate software/versions/findings to CVEs, CWEs, and advisories          | deny-by-default; read, grep/glob, `websearch` allow (**no** `webfetch`)  |
| `report-writer` | draft report, remediation, and compliance sections from findings            | deny-by-default; read, grep/glob, `write`/`edit`/`patch` in the dir      |

Notes on the two web-touching helpers:

- `osint` keeps `webfetch` at `ask` (reaching a target's public surface is its point) — identical to `recon`'s own gate, so no escalation.
- `cve-researcher` is `websearch`-only, with **no** `webfetch`. Research runs off search results, never a direct fetch, so the helper is safe for the air-gapped missions (`defend`, `govern`) without loosening their "no target contact" posture.

### Per-mission blessings

Each primary keeps `subagent * deny` and adds allows only for the helpers whose authority it already dominates:

| Primary     | May delegate to                 | Why it is a subset                                                        |
| ----------- | ------------------------------- | ------------------------------------------------------------------------- |
| `recon`     | `osint`                         | both read-only + `websearch`; both `webfetch` `ask`; neither runs shell   |
| `offensive` | `scan-parser`, `cve-researcher` | both read-only; caller already has `websearch` and more                   |
| `defend`    | `scan-parser`, `cve-researcher` | both read-only; `cve-researcher` has no `webfetch`, so no target contact  |
| `forensics` | `scan-parser`                   | read-only, and it cannot write — evidence integrity is preserved          |
| `govern`    | `cve-researcher`, `report-writer` | both read-only except report writes, which `govern` already allows      |

Delegation may run in the background, so a primary can launch a helper (for example `offensive` → `scan-parser`) and keep working while it grinds.

## Consequences

- Each primary can offload reusable task work to safe specialists, and the `subagent` tool lists only that mission's blessed helpers. The escalation hole from 0005 stays closed: a non-blessed id (including `general`/`explore`) still evaluates to `deny`.
- `general` and `explore` remain registered and profile-neutral but are not reachable from any security primary (no mission blesses them); they stand ready for other profiles or user-added primaries.
- Four new agent ids (`osint`, `scan-parser`, `cve-researcher`, `report-writer`) and their prompts join the profile. The `agent.test.ts` roster and the subagent-availability behavior gain test coverage.
- The subset invariant is the rule for any future helper or blessing: add the allow only when the helper's ruleset is dominated by the caller's. A helper that needs more than a caller has is a sign the capability belongs in the primary, not the helper.
- Still out of scope: per-target scope enforcement (unchanged from 0005) and raising `subagent_depth` for helper-of-helper chains, which stays at 1.
