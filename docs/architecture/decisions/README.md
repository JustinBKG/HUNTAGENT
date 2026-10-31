# Architecture Decisions

Each record states the context, the decision, and its consequences. Records are append-only: to change course, add a new record that supersedes an old one.

| #                                         | Decision                                                  | Status   |
| ----------------------------------------- | --------------------------------------------------------- | -------- |
| [0001](0001-layers-as-packages.md)        | Map architectural layers onto workspace packages          | Accepted |
| [0002](0002-agent-profiles-as-plugins.md) | Agent specializations are plugin profiles under `agents/` | Accepted |
| [0003](0003-soft-turn-budgets.md)         | Turn time and cost budgets are soft and process-local     | Accepted |
| [0004](0004-architecture-tests.md)        | Enforce boundaries with static-scan tests                 | Accepted |
| [0005](0005-cybersecurity-primary-agents.md) | Five mission-based primary agents for the security profile | Accepted |
| [0006](0006-gated-helper-subagents.md)    | Gated helper subagents, delegated per mission             | Accepted |

Older decisions about the Session event stream and provider policy live in [specs/v2](../../../specs/v2/README.md).
