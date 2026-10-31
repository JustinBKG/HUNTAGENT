import { describe, expect, test } from "bun:test"
import path from "node:path"
import { Glob } from "bun"

// Layered core: runtime/ is the generic agent engine (session admission, execution, the step loop, tool registry,
// permissions, forms, agent selection). Domain profiles (agents/*), the shared built-in tools (tools/*), config
// plugins (config/plugin/*), and concrete plugins (plugins/*) sit outside it and are composed in plugins/internal.ts.
// The runtime may use infrastructure/* adapters and shared/* primitives, but never a profile, a tool plugin, a
// concrete plugin, or a model provider SDK.
const src = path.resolve(import.meta.dir, "../../src")
const runtime = ["runtime/**/*.ts"]

// Plugin host infrastructure the runtime may use; every other plugins/* module is a concrete plugin.
const host = new Set(["plugins/service", "plugins/hooks", "plugins/plugin"])

// Known debt: these runtime modules query SQLite through Drizzle directly instead of through a store port.
// Removing an entry is progress; adding one needs a design decision, not an allowlist edit.
const drizzle = new Set([
  "runtime/bus.ts",
  "runtime/event/sql.ts",
  "runtime/permission/saved.ts",
  "runtime/permission/sql.ts",
  "runtime/session.ts",
  "runtime/session/diff.ts",
  "runtime/session/history.ts",
  "runtime/session/inbox.ts",
  "runtime/session/instruction-entry.ts",
  "runtime/session/instruction-state.ts",
  "runtime/session/projector.ts",
  "runtime/session/revert.ts",
  "runtime/session/runner/llm.ts",
  "runtime/session/sql.ts",
  "runtime/session/stats.ts",
  "runtime/session/store.ts",
  "runtime/session/transfer.ts",
])

const files = await Promise.all(
  (await Promise.all(runtime.map((pattern) => Array.fromAsync(new Glob(pattern).scan({ cwd: src })))))
    .flat()
    .toSorted()
    .map(async (file) => {
      const source = await Bun.file(path.join(src, file)).text()
      const specifiers = Array.from(
        source.matchAll(/(?:^(?:import|export)[^"']*?from\s+|^import\s+|import\(\s*)["']([^"']+)["']/gm),
        (match) => match[1],
      )
      return { file, specifiers }
    }),
)

const local = files.flatMap((item) =>
  item.specifiers
    .filter((specifier) => specifier.startsWith("."))
    .map((specifier) => ({
      file: item.file,
      target: path
        .relative(src, path.resolve(src, path.dirname(item.file), specifier))
        .replace(/\.js$/, "")
        .split(path.sep)
        .join("/"),
    })),
)

describe("core runtime boundaries", () => {
  test("covers the runtime modules", () => {
    expect(files.map((item) => item.file)).toEqual(
      expect.arrayContaining(["runtime/session/runner/llm.ts", "runtime/tool.ts"]),
    )
  })

  test("does not import domain agent profiles", () => {
    expect(local.filter((item) => item.target.startsWith("agents/"))).toEqual([])
  })

  test("does not import built-in tool or config plugins", () => {
    expect(
      local.filter((item) => item.target.startsWith("tools/") || item.target.startsWith("config/plugin/")),
    ).toEqual([])
  })

  test("does not import concrete plugins", () => {
    expect(local.filter((item) => item.target.startsWith("plugins/") && !host.has(item.target))).toEqual([])
  })

  test("reaches models only through the provider-neutral AI client", () => {
    const concrete = files.flatMap((item) =>
      item.specifiers
        .filter(
          (specifier) =>
            /^(?:ai|openai|@ai-sdk\/.*|@anthropic-ai\/.*)$/.test(specifier) ||
            specifier.startsWith("@huntagent/ai/providers") ||
            specifier.startsWith("@huntagent/ai/protocols"),
        )
        .map((specifier) => `${item.file} -> ${specifier}`),
    )
    expect(concrete).toEqual([])
  })

  test("does not spread direct Drizzle access", () => {
    const users = files
      .filter((item) => item.specifiers.some((specifier) => specifier.startsWith("drizzle-orm")))
      .map((item) => item.file)
    expect(users.filter((file) => !drizzle.has(file))).toEqual([])
  })
})

describe("agent profile boundaries", () => {
  test("profiles do not import each other", async () => {
    const crossings = await Promise.all(
      (await Array.fromAsync(new Glob("agents/*/**/*.ts").scan({ cwd: src }))).map(async (file) => {
        const profile = file.split("/")[1]
        const source = await Bun.file(path.join(src, file)).text()
        return Array.from(
          source.matchAll(/(?:^(?:import|export)[^"']*?from\s+|^import\s+|import\(\s*)["'](\.[^"']+)["']/gm),
          (match) => path.relative(src, path.resolve(src, path.dirname(file), match[1])).split(path.sep),
        )
          .filter((target) => target[0] === "agents" && target[1] !== profile)
          .map((target) => `${file} -> ${target.join("/")}`)
      }),
    )
    expect(crossings.flat()).toEqual([])
  })
})
