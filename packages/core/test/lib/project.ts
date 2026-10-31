import { Database } from "@huntagent/core/infrastructure/database/database"
import { Project } from "@huntagent/core/infrastructure/project"
import { upsertProject } from "@huntagent/core/infrastructure/project/sql"
import { makeGlobalNode } from "@huntagent/util/effect/app-node"
import { Effect, Layer } from "effect"

export const globalProjectNode = makeGlobalNode({
  service: Project.Service,
  layer: Layer.effect(
    Project.Service,
    Effect.gen(function* () {
      const database = yield* Database.Service
      return Project.Service.of({
        list: () => Effect.succeed([]),
        update: () => Effect.die("not implemented"),
        activate: () => Effect.void,
        sweep: () => Effect.void,
        resolve: (directory) => {
          const project = { id: Project.ID.global, directory, canonical: directory }
          return upsertProject(database.db, project).pipe(Effect.orDie, Effect.as(project))
        },
      })
    }),
  ),
  deps: [Database.node],
})
