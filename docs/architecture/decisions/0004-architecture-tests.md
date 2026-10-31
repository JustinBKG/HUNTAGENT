# 0004: Enforce boundaries with static-scan tests

Status: Accepted

## Context

Documented dependency rules decay unless something fails when they are broken. The repository had bundle-based import-boundary tests for `client`, `sdk`, and `cli` entry points, but nothing for the package graph as a whole or for the boundary between the Core runtime and the profiles and plugins composed into it.

## Decision

Add two test files in `packages/core/test/architecture/`:

- `workspace-dependencies.test.ts`: per-package allowed and forbidden internal dependencies, undeclared `@huntagent/*` source imports, and package-graph cycles.
- `runtime-boundaries.test.ts`: runtime modules do not import `agents/**`, built-in tool or config plugins, concrete plugins, or provider SDKs; profiles do not import each other; and direct Drizzle access does not spread.

They are static scans of manifests and import specifiers. They do not bundle or spawn processes.

## Consequences

- They run in about 70 ms and report the exact `file -> target` that broke a rule.
- A coverage guard (`covers the runtime modules`) fails if the file globs ever match nothing, so a rule cannot pass vacuously. This happened during development and was caught.
- Each rule was validated by injecting a violation and confirming that the test fails.
- Regex scanning sees only import syntax, not re-exports through barrel files. Core does not use barrels for these modules, so this is acceptable. If barrels appear, switch the scan to Bun's bundler metafile as the existing import-boundary tests do.
