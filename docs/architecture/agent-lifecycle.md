# Agent Lifecycle

This is the execution model for one Session, from input to idle, including what happens when something fails or the process dies. [specs/v2/session.md](../../specs/v2/session.md) is the detailed contract; this page is the operational summary.

## Vocabulary

| Term             | Meaning                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Session          | Durable conversation aggregate with a stable `ses_…` ID, a Location, an agent, and a model.                     |
| Inbox item       | Admitted input that is not yet visible to the model. Types: user, synthetic, compaction, move.                  |
| Busy period      | One process-local execution of a Session, from `execution.started` to a terminal event. Often called a run.     |
| Turn             | All Steps from promotion of new user input until the Session would go idle. Step limits and budgets reset here. |
| Step             | One logical model call: one `llm.stream` plus the local tool calls it requests.                                 |
| Physical attempt | One try of a Step. Retries and recoveries make more attempts without starting a new Step.                       |

## States

A Session's execution state is derived from its durable events:

```
                  wake / resume
   idle ──────────────────────────────▶ running
    ▲                                     │
    │  execution.succeeded                │
    │  execution.failed       ◀───────────┤
    │  execution.interrupted (user)       │
    │                                     │ shutdown or crash
    │                                     ▼
    └──────── startup recovery ◀──── claimed (no terminal event)
```

- `session.execution.started` commits together with a **write-ahead claim** (`SessionStore.claim`).
- Succeeded, failed, and user-interrupted terminals release the claim in the same transaction.
- A shutdown interruption leaves the claim in place on purpose, and so does a process death. A claim with no terminal event is the signal for recovery.

## Admission

`Session.prompt` publishes `session.inbox.enqueued`, which inserts a `session_inbox` row, and then calls `SessionExecution.wake`. `resume: false` admits without waking. Reusing an item ID is idempotent: the first admission wins, even after delivery. Delivery modes:

- `steer` (default): delivered at the next Step boundary, even mid-turn.
- `queue`: delivered only when the Session would otherwise go idle, one item at a time.

## The drain loop

`SessionRunner.drain` (`core/src/session/runner/llm.ts`) repeats:

1. **Boundary.** Handle a pending control item (compaction or move). Otherwise promote eligible input. Promoting new user input resets the step counter and the turn budget.
2. **Prepare.** Admit instruction deltas, reload history, and resolve agent, model, and tools (`SessionContext`).
3. **Limits.** If the agent's `steps` or `budget` is exhausted, this becomes the final Step: tools stay advertised with `toolChoice: "none"`, and a limit notice tells the model to summarize.
4. **Compaction.** If the estimated request exceeds the context window minus output headroom, compact first.
5. **Attempt.** `SessionStep.attempt` streams the call. Tool calls are durable before they run, run concurrently, and settle in order.
6. **Outcome.** Completed with tool calls means another Step. Completed without tool calls ends the turn. Other outcomes are retry, continue after an incomplete stream, output-limit continuation, or overflow compaction.

There is no in-memory tool loop. Every Step starts from reloaded durable history, so a crash between Steps loses nothing that was committed.

## Limits

| Limit               | Config (`agents.<id>`)      | Scope | Behavior when reached                                                 |
| ------------------- | --------------------------- | ----- | --------------------------------------------------------------------- |
| Step allowance      | `steps: number`             | Turn  | Final Step without tools; `MAX_STEPS_PROMPT`                          |
| Time budget         | `budget.seconds: number`    | Turn  | Final Step without tools; time budget notice                          |
| Cost budget         | `budget.cost: number` (USD) | Turn  | Final Step without tools; cost budget notice                          |
| Output-limit streak | (fixed)                     | Step  | Two continuations after `finish: length`, then the Step fails         |
| Retry budget        | (fixed)                     | Step  | Initial request plus up to 10 retries; at most 3 after timeouts       |
| Restart attempts    | `SessionRestart` option     | Claim | 10 resumes of one claimed execution, then terminal `execution.failed` |

Budgets are **soft**. They are checked at Step boundaries, so a long Step can overrun them, and the turn ends gracefully with a summary. To stop immediately, use `sessions.interrupt`. Cost is measured from the Session's durable cost total, so it stays accurate across compaction. Turn baselines carry across Location moves and reloads. A process restart starts a fresh baseline, which the restart attempt limit bounds.

## Retries and failure classification

`core/src/session/runner/retry.ts` retries rate limits, provider-internal errors, unsent or unknown-delivery transport failures, and incomplete streams. Gaps are jittered: 2s, 4s, 8s, then 10s. A provider's `retry-after` can lengthen a gap, up to 15 minutes. Each scheduled retry publishes `session.retry.scheduled`. A plugin `retry` hook can veto or reschedule.

- **Before durable output**, a retry keeps the same Step and assistant message.
- **After durable output**, an incomplete stream keeps the partial message, adds a continuation instruction, and continues under a new assistant message.
- **A context overflow before output** triggers one compaction, then the same Step is rebuilt. A second overflow is terminal.
- **Content-filter finishes and unknown errors** fail the Step and then the busy period (`execution.failed`).

## Interruption and approvals

- `sessions.interrupt` interrupts locally owned work. Pending input survives, and the claim is released (`reason: "user"`).
- A permission `ask` publishes `permission.asked` and suspends the tool fiber until a `permission.replied` arrives. The question tool does the same through a Form (`runtime/form.ts`). A decline or dismissal ends the Step as interrupted. A decline with feedback (`Permission.CorrectedError`) becomes a model-visible tool failure, and the model continues.

## Recovery after restart

On boot, the managed server (`server/src/process.ts`), the fetch host, and the embedded SDK host call `SessionRestart.resumeSuspendedSessions`:

1. Find Sessions whose claim was never released.
2. Count the attempt durably. Past the limit, publish `execution.failed` and release the claim.
3. Append the synthetic instruction "The server restarted while you were working…" and resume.
4. At drain start, fail tool calls still marked `streaming` or `running` and compactions still `running`. They are never replayed.

Recovery is **at-least-once for model calls and never replays tools**. A tool that was mid-flight when the process died is reported to the model as interrupted, and the model decides what to do next. Exactly-once external side effects are not guaranteed. A tool with dangerous side effects must be idempotent or must check state before acting.
