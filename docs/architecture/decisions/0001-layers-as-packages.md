# 0001: Map architectural layers onto workspace packages

Status: Accepted

## Context

The goal is a maintainable, extensible foundation for long-running agents, with Clean/Hexagonal boundaries: the core must not depend on concrete model SDKs, databases, operating-system integrations, or domain-specific tools. A conventional template puts `domain/`, `application/`, `ports/`, and `infrastructure/` folders inside one source tree.

The repository already has these boundaries, expressed differently:

- Domain shapes and durable events are their own package (`schema`) because the public protocol and the generated client share them.
- Ports are Effect `Context.Service` tags (`LLMClient.Service`, `Tool.Service`, `Permission.Service`, `SessionStore.Service`, …), each with a default `Layer` and a dependency declaration (`makeLocationNode`, `makeGlobalNode`). Hosts compose the graph, and tests replace any node.
- The model SDK boundary is a package (`ai`) whose `LLMClient` hides every provider.
- Use cases are Session operations (`Session.prompt`, `SessionExecution.resume`, `SessionExecution.interrupt`).

The audit found the boundaries were mostly respected. There were three violations: the step runner and request assembly imported the question tool plugin for its cancel error, and the runtime's default system prompt was the coding prompt.

## Decision

Keep packages as the layer boundary and Effect services as ports. Do not reorganize into textbook folders. Instead:

- fix the real violations (decision [0002](0002-agent-profiles-as-plugins.md), and `Form.DismissedError` replacing `QuestionTool.CancelledError`)
- make the boundaries executable as tests (decision [0004](0004-architecture-tests.md))
- document the mapping ([project-structure.md](../project-structure.md))

## Consequences

- No mass file move. Every move that was made had a concrete boundary reason, so import churn stayed small and reviewable.
- Engineers coming from textbook layouts need the mapping table. `ARCHITECTURE.md` and `project-structure.md` provide it.
- A package boundary costs a manifest and build configuration, so new packages are created only for real dependency boundaries, not for every concept.
