import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import type { Project } from "@huntagent/schema/project"
import { Timestamps } from "../../infrastructure/database/schema.sql.js"
import { ProjectTable } from "../../infrastructure/project/sql.js"
import type { PermissionSaved } from "./saved.js"

export const PermissionTable = sqliteTable(
  "permission",
  {
    id: text().$type<PermissionSaved.ID>().primaryKey(),
    project_id: text()
      .$type<Project.ID>()
      .notNull()
      .references(() => ProjectTable.id, { onDelete: "cascade" }),
    action: text().notNull(),
    resource: text().notNull(),
    ...Timestamps,
  },
  (table) => [uniqueIndex("permission_project_action_resource_idx").on(table.project_id, table.action, table.resource)],
)
