import path from "node:path"
import { HUNTAGENT_CHANNEL } from "./version"

export function databasePath(data: string) {
  const filename =
    process.env.HUNTAGENT_DB ??
    (["latest", "dev", "beta", "next", "prod"].includes(HUNTAGENT_CHANNEL) ||
    process.env.HUNTAGENT_DISABLE_CHANNEL_DB === "1" ||
    process.env.HUNTAGENT_DISABLE_CHANNEL_DB === "true"
      ? "huntagent.db"
      : `opencode-${HUNTAGENT_CHANNEL.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
  return filename === ":memory:" ? filename : path.resolve(data, filename)
}
