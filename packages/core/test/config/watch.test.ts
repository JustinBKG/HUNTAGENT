import path from "path"
import { describe, expect, test } from "bun:test"
import type { ConfigDiscovery } from "@huntagent/core/config/discovery"
import { ConfigWatch } from "@huntagent/core/config/watch"
import { AbsolutePath } from "@huntagent/core/shared/schema"

const project = path.resolve("watch-plan-project")
const root = AbsolutePath.make(path.join(project, ".huntagent"))
const sources: ConfigDiscovery.Sources = {
  direct: ["huntagent.json", "huntagent.jsonc"].map((name) => AbsolutePath.make(path.join(project, name))),
  project: [{ path: root, present: false }],
  claude: [AbsolutePath.make(path.join(project, ".claude"))],
  agents: [AbsolutePath.make(path.join(project, ".agents"))],
}

describe("ConfigWatch.plan", () => {
  test("groups missing candidates and keeps parent watches when roots appear", () => {
    const missing = ConfigWatch.plan(sources)
    expect(Array.from(missing.values())).toEqual([
      { path: project, type: "entries", names: [".agents", ".claude", ".huntagent", "huntagent.json", "huntagent.jsonc"] },
    ])
    const system = AbsolutePath.make(path.join(project, "system-opencode"))
    const present = ConfigWatch.plan({
      ...sources,
      system: { path: system, present: true },
      project: [{ path: root, present: true }],
    })
    expect(Array.from(present.values())).toEqual([
      { path: system, type: "directory", ignore: ["node_modules", ".git", "**/{node_modules,.git}/**"] },
      { path: root, type: "directory", ignore: ["node_modules", ".git", "**/{node_modules,.git}/**"] },
      {
        path: project,
        type: "entries",
        names: [".agents", ".claude", ".huntagent", "huntagent.json", "huntagent.jsonc", "system-opencode"],
      },
    ])
  })

  test("adds exact watches for explicit files only when not already covered", () => {
    expect(ConfigWatch.plan({ ...sources, explicit: sources.direct[0] })).toEqual(ConfigWatch.plan(sources))
    const present = { ...sources, project: [{ path: root, present: true }] }
    expect(ConfigWatch.plan({ ...present, explicit: AbsolutePath.make(path.join(root, "custom.json")) })).toEqual(
      ConfigWatch.plan(present),
    )
    const directory = path.resolve("watch-plan-external")
    expect(
      Array.from(
        ConfigWatch.plan({ ...sources, explicit: AbsolutePath.make(path.join(directory, "custom.json")) }).values(),
      ),
    ).toContainEqual({ path: directory, type: "entries", names: ["custom.json"] })
  })
})
