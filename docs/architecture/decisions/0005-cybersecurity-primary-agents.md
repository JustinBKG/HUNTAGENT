# 0005: Five mission-based primary agents for the security profile

Status: Accepted

## Context

The shipped profile (`agents/pentest/`, see [0002](0002-agent-profiles-as-plugins.md)) registers a single selectable primary, `pentest`, plus a read-only `recon` subagent. `Agent.defaultID` is `"pentest"`. This covers offensive assessment but nothing else: a user who wants to triage alerts, investigate an incident, or write up findings drives the same offensive agent with the same prompt and the same permission posture.

The goal is to cover the breadth of cybersecurity work, the way the original engine shipped two coding primaries (`build`, `plan`) the operator switched between with `Shift+Tab` (`agent.cycle`). The question is what the *set* of primaries should be.

Two industry framings, not permission tiers, decide the set:

- **Discipline map — NIST NICE Framework.** The US national workforce framework divides the whole field into seven functional categories: Securely Provision, Operate & Maintain, Oversee & Govern, Protect & Defend, Analyze, Collect & Operate, Investigate. This is the closest thing to an authoritative "all of cybersecurity" taxonomy.
- **Offensive lifecycle — agentic-pentest research.** Autonomous-pentest systems (VulnBot, xOffense, 2025) decompose an engagement into recon → scanning → exploitation, one specialized agent per phase, with an orchestration layer; swarm tools add post-exploitation, triage, and reporting specialists.

A primary is an *operating posture the human deliberately switches between*, not a task. So the set is chosen by **mission/discipline**, and each mission's permission tier falls out as a consequence rather than defining the set. Task-level specializations (nmap-output parsing, CVE/CWE correlation, OSINT of one domain, malware unpacking, a single compliance check) stay subagents the active primary delegates to — matching the coordinator-plus-specialists shape the research converged on.

## Decision

Replace the single `pentest` primary with **five mission-based primaries**, mapped to the NICE categories and the offensive lifecycle. Keep one profile; this is a change to its agent set, not a new profile.

| ID          | Mission                                                                       | NICE category        | Default |
| ----------- | ----------------------------------------------------------------------------- | -------------------- | ------- |
| `recon`     | OSINT, passive recon, attack-surface and asset mapping                        | Collect & Operate / Analyze | yes |
| `offensive` | scanning, enumeration, exploitation, post-exploitation                        | Collect & Operate    |         |
| `defend`    | detection engineering, log/alert triage, hardening review, threat hunting     | Protect & Defend     |         |
| `forensics` | incident investigation, evidence analysis, malware triage (DFIR)              | Investigate          |         |
| `govern`    | risk assessment, compliance mapping, audit, findings write-up and remediation | Oversee & Govern     |         |

- **Count is five, not seven.** The three offensive phases (recon, scan, exploit) collapse into `recon` (passive) plus `offensive` (active, the full attack chain), with the individual phases delegated to subagents inside `offensive`. AppSec / secure code review (NICE Securely Provision) and IT sustainment (Operate & Maintain) are not their own primaries: their security-relevant work rides on `defend`. Beyond five, `Shift+Tab` stops being a meaningful choice and the "what can this do right now" model blurs — a property that must stay crisp in a security tool.
- **`recon` is the default.** `Agent.defaultID` becomes `"recon"`. The tool boots in its safest, information-gathering posture; moving to `offensive` is a deliberate operator switch, which is itself a meaningful consent step and matches the real workflow (recon precedes exploitation).
- **Permission tier is a consequence of the mission, applied through the existing engine effects** (`allow`/`deny`/`ask`, last-match-wins), the way `agents/pentest/agents.ts` does today:
  - `recon` — read-only and passive: reads, grep/glob, websearch; webfetch `ask`; no shell that reaches a target; writes confined to the engagement directory. (This absorbs today's `recon` subagent role.)
  - `offensive` — active: shell `ask` by default, harmless presence checks `allow`, host-destructive commands `deny` (the existing backstop); webfetch `ask`; writes confined to the engagement directory.
  - `defend` — reads and analyzes internal data; no target-reaching actions (webfetch and target shell `deny`); writes confined to the engagement directory.
  - `forensics` — read-only with evidence integrity: no target contact and no mutation of sources; notes only, written to the engagement directory.
  - `govern` — desk work, fully air-gapped from targets (webfetch and shell-against-target `deny`); broader write access within a report directory.
- **Each primary gets its own system prompt** through a session-hook prompt plugin keyed on the agent id, the way `agents/pentest/prompt.ts` keys on `PENTEST_AGENTS`. The `<engagement-scope>` reminder from `scope.ts` already rides on every request and applies unchanged to all five.
- **Task specialists stay subagents.** The profile-neutral `general` and `explore` subagents are unchanged. New delegated specialists (e.g. a scan-output parser, a CVE correlator) are added as `mode: "subagent"` and are never user-selectable.
- **No primary may spawn subagents yet.** `general` and `explore` run shell with effect `allow` (not `ask`), so a primary delegating to them would bypass its own `ask` gate — an `ask`-gated `offensive` could run commands without approval through `general`. Until gated, mission-specific specialists exist, every primary denies the `subagent` action. Re-enabling delegation per mission is part of the specialist milestone.
- **Activation order and boundaries are unchanged.** The prompt plugin stays first, the scope plugin rides alongside it, and the agents plugin registers before the runtime's hidden `AgentPlugin` (see `plugins/internal.ts`). The runtime still never imports `agents/**`, and this remains one profile, so no profile imports another.

## Consequences

- The agent picker and `agent.cycle` show five primaries instead of one. `recon` resolves as the default; the other four are reached with `Shift+Tab`.
- `Agent.defaultID` changes from `"pentest"` to `"recon"`. The `pentest` agent id is retired; a user config that selected `pentest` must select one of the five. The read-only `recon` subagent is promoted to the `recon` primary and its permission set becomes that primary's base.
- The profile directory `agents/pentest/` now covers defensive and governance missions too, so its name understates its scope. Renaming it (for example to `agents/security/`) and its plugin IDs is a follow-up; it is not required to land the agent set and is kept out of this decision to avoid a churny rename landing with a behavior change.
- New agent-level prompts live beside the profile, one per mission. Moving or adding a prompt is not a reason to edit existing prompt text.
- Still out of scope, as in [0002](0002-agent-profiles-as-plugins.md): per-target scope enforcement (the engine matches a command string, so target-reaching actions stay `ask`), and concrete scope-checked assessment tools that parse output into structured findings. Those tools are where the per-mission subagents and tighter enforcement will live.

## References

- NIST NICE Framework categories — <https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center/getting-started>
- xOffense: multi-agent penetration testing (arXiv 2509.13021) — <https://arxiv.org/html/2509.13021v1>
- Agentic pentest frameworks field guide (2026) — <https://dev.to/mkarytka/agentic-pentest-frameworks-2026-the-full-field-guide-4ka0>
