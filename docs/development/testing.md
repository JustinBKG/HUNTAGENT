# Testing

Tests live in `packages/<name>/test` and run from that package directory. Before writing tests, read the skill for the kind of test you are writing in `.huntagent/skills/`: `unit-tests` or `tui-tests`. It covers what makes tests slow or flaky in CI.

## Test layers for the agent platform

| Layer        | Where                                                                          | What it proves                                                            |
| ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Unit         | `packages/core/test/*.test.ts`                                                 | Runner, Step, retry, coordinator, compaction, tools, permissions, prompts |
| Integration  | `packages/core/test/session-*.test.ts`, `packages/server/test`                 | Real SQLite projections, tool registry, plugin activation, HTTP handlers  |
| Architecture | `packages/core/test/architecture/`                                             | Dependency direction and runtime/profile boundaries                       |
| End-to-end   | `packages/sdk/test/embedded.test.ts`, `packages/sdk/test/instances-effect.test.ts` | The real composition with real built-in tools and a deterministic model   |

## Deterministic models

`@huntagent/ai/testing` (`TestLLM`) replaces the model client without touching production code:

```ts
Effect.gen(function* () {
  const llm = yield* TestLLM.Test.pipe(Effect.provide(TestLLM.testLayer()))
  yield* llm.push(TestLLM.tool("call-1", "write", { path, content: "hello\n" }), TestLLM.text("Done", "answer"))
  const opencode = yield* OpenCode.create(options, {
    overrides: [llmClient.replace(Layer.succeed(LLMClient.Service, llm))],
  })
})
```

- `push` queues responses, and `serve` answers dynamically from the request.
- `requests()` returns what the model saw: system prompt, history, and tool definitions.
- `gate()` pauses a request mid-flight for interruption and concurrency tests.

Each Step reloads durable history, so a script driven by `serve` can choose its response from the number of tool results in `request.messages`. `embedded.test.ts` does this.

Recorded provider cassettes (`packages/http-recorder`, `packages/ai` tests) cover the real provider adapters.

## Time

Effect tests run on `TestClock` under `it.effect`. Advance time with `TestClock.adjust` instead of sleeping. The runner reads time through `Clock`, so retry backoff and turn time budgets are deterministic in tests.

## Memory

A cold `bun typecheck` in `packages/core` compiles source and tests in one `tsgo` process and can need more than 5 GB. After changing `packages/schema`, the whole Core project rebuilds. On a machine with 8 GB, run the two halves one after the other:

```sh
cd packages/core
bunx tsgo -b tsconfig.json        # source
bunx tsgo -b tsconfig.tests.json  # tests (reuses the source build info)
```

Avoid running the full Core suite and a cold typecheck at the same time.

## Known environment-dependent failures

The full Core suite has about 6,700 tests. In a sandbox without `rg` and without network access, about 36 fail for environmental reasons: Ripgrep and search tools (missing binary, download blocked), MCP over SSE timeouts, file-watcher timing, and external plugin package loading. Compare failure names against `dev` before attributing a failure to your change.
