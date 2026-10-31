import { describe, expect, test } from "bun:test"
import path from "node:path"
import { Glob } from "bun"

// Package-level dependency direction for the agent platform (root AGENTS.md):
// Schema -> Core and Protocol -> Server; Client depends on Schema and Protocol only; SDK composes the rest.
const packages = path.resolve(import.meta.dir, "../../..")

// Foundation packages list every internal dependency they may have.
const exhaustive: Record<string, readonly string[]> = {
  schema: [],
  util: [],
  codemode: [],
  ai: ["@huntagent/schema"],
  protocol: ["@huntagent/schema"],
  client: ["@huntagent/protocol", "@huntagent/schema"],
}

// Higher layers may depend on anything below them, but never on a layer above.
const forbidden: Record<string, readonly string[]> = {
  plugin: ["@huntagent/core", "@huntagent/server", "@huntagent/sdk", "@huntagent/cli", "@huntagent/tui"],
  core: [
    "@huntagent/protocol",
    "@huntagent/client",
    "@huntagent/server",
    "@huntagent/sdk",
    "@huntagent/cli",
    "@huntagent/tui",
  ],
  server: ["@huntagent/client", "@huntagent/sdk", "@huntagent/cli", "@huntagent/tui"],
  sdk: ["@huntagent/cli", "@huntagent/tui"],
}

const platform = [...Object.keys(exhaustive), ...Object.keys(forbidden)]

const manifests = await Promise.all(
  platform.map(async (directory) => {
    const manifest: {
      name: string
      dependencies?: Record<string, string>
      peerDependencies?: Record<string, string>
    } = await Bun.file(path.join(packages, directory, "package.json")).json()
    const internal = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).filter((name) =>
      name.startsWith("@huntagent/"),
    )
    return { directory, name: manifest.name, internal }
  }),
)

describe("workspace dependency direction", () => {
  test.each(Object.entries(exhaustive))(
    "%s declares only its permitted internal dependencies",
    (directory, allowed) => {
      const manifest = manifests.find((item) => item.directory === directory)
      expect(manifest?.internal.toSorted()).toEqual(allowed.toSorted())
    },
  )

  test.each(Object.entries(forbidden))("%s declares no dependency on a higher layer", (directory, names) => {
    const manifest = manifests.find((item) => item.directory === directory)
    expect(manifest?.internal.filter((name) => names.includes(name))).toEqual([])
  })

  test("source imports only declared internal packages", async () => {
    const undeclared = await Promise.all(
      manifests.map(async (manifest) => {
        const files = await Array.fromAsync(
          new Glob("src/**/*.{ts,tsx}").scan({ cwd: path.join(packages, manifest.directory) }),
        )
        const imports = await Promise.all(
          files
            .filter((file) => !file.endsWith(".test.ts"))
            .map(async (file) => {
              const source = await Bun.file(path.join(packages, manifest.directory, file)).text()
              // Type-only imports are erased and do not create a runtime dependency.
              return Array.from(
                source.matchAll(/^(?!import type)(?:import|export)[^"']*?from\s+["'](@opencode\/[a-z-]+)/gm),
                (match) => ({ file, name: match[1] }),
              )
            }),
        )
        return imports
          .flat()
          .filter((item) => item.name !== manifest.name && !manifest.internal.includes(item.name))
          .map((item) => `${manifest.directory}/${item.file} -> ${item.name}`)
      }),
    )
    expect(undeclared.flat()).toEqual([])
  })

  test("platform packages form an acyclic graph", async () => {
    // Walk every workspace package so a cycle through a non-platform package is still found.
    const workspace = await Promise.all(
      (await Array.fromAsync(new Glob("{*,plugins/*}/package.json").scan({ cwd: packages }))).map(async (file) => {
        const manifest: {
          name: string
          dependencies?: Record<string, string>
          peerDependencies?: Record<string, string>
        } = await Bun.file(path.join(packages, file)).json()
        return [
          manifest.name,
          Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies }).filter((name) =>
            name.startsWith("@huntagent/"),
          ),
        ] as const
      }),
    )
    const edges = new Map(workspace)
    const cycles = manifests.flatMap((manifest) => {
      const visit = (name: string, trail: readonly string[]): string[] => {
        if (trail.includes(name)) return name === manifest.name ? [[...trail, name].join(" -> ")] : []
        return (edges.get(name) ?? []).flatMap((next) => visit(next, [...trail, name]))
      }
      return (edges.get(manifest.name) ?? []).flatMap((next) => visit(next, [manifest.name]))
    })
    expect(cycles).toEqual([])
  })
})
