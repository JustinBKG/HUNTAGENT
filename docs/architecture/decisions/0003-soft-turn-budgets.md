# 0003: Turn time and cost budgets are soft and process-local

Status: Accepted

## Context

Long-running agents need bounds besides the step count. The runtime already had a step allowance (`agents.<id>.steps`), restart attempt limits, bounded retries, and user interruption, but nothing bounded wall-clock time or spend for a turn.

The existing step limit ends a turn gracefully. The final Step keeps the tool definitions but sets `toolChoice: "none"` and appends a notice, so the model summarizes its progress instead of being cut off mid-tool, and the provider's cached prompt prefix survives.

## Decision

Add `budget: { seconds?, cost? }` to `Agent.Info` and to agent config, enforced with the same mechanism as `steps`:

- **Baseline:** the clock time and the Session's durable cost total when new user input is promoted, which is where the step counter resets.
- **Check:** before each physical attempt, compare elapsed time and `session.cost − baseline` against the budget. When either is reached, run a final Step without tools and with a budget notice.
- **Carry:** the baseline rides on the runner's in-memory `Continuation` across Location moves and reloads. A process restart starts a fresh baseline.

Cost comes from `Session.Info.cost`, which each Step's terminal event updates atomically. Summing visible messages instead would undercount after compaction.

## Alternatives rejected

- **Hard cancellation on budget expiry.** Interrupting mid-Step loses the summary and can leave tools half-done. `sessions.interrupt` already provides a hard stop.
- **Durable budget baselines.** These would need a new durable fact per turn. The restart attempt limit (10) already bounds the extra spend a restart loop can cause. Revisit this when budgets must hold across restarts, for example for unattended multi-day runs.

## Consequences

- A budget can be overrun by the rest of the Step in progress plus the final summary Step. A single Step with a long-running tool can exceed a time budget by however long that tool runs.
- The cost budget counts everything recorded on the Session: Steps, automatic compaction, and title generation (`session.usage.recorded`).
- Per-Session only: projections apply usage to the Session that incurred it, so a subagent's spend counts against the child Session, not the parent.
- The public `Agent.Info` and config schemas gained an optional field, and the generated client was regenerated.
