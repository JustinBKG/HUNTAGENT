import { Option, Schema } from "effect"

declare const HUNTAGENT_VERSION: string
declare const HUNTAGENT_CHANNEL: string
declare const HUNTAGENT_ARTIFACT: string
declare const HUNTAGENT_RELEASE_HIGHLIGHTS: string

const version = typeof HUNTAGENT_VERSION === "string" ? HUNTAGENT_VERSION : "local"
const channel = typeof HUNTAGENT_CHANNEL === "string" ? HUNTAGENT_CHANNEL : "local"
const artifact = typeof HUNTAGENT_ARTIFACT === "string" ? HUNTAGENT_ARTIFACT : "cli"
// Stable release builds embed the release notes' Highlights; every other build has none.
const highlights =
  typeof HUNTAGENT_RELEASE_HIGHLIGHTS === "string"
    ? Option.getOrElse(
        Schema.decodeUnknownOption(
          Schema.fromJsonString(Schema.Array(Schema.Struct({ title: Schema.String, body: Schema.String }))),
        )(HUNTAGENT_RELEASE_HIGHLIGHTS),
        () => [],
      )
    : []

export {
  version as HUNTAGENT_VERSION,
  channel as HUNTAGENT_CHANNEL,
  artifact as HUNTAGENT_ARTIFACT,
  highlights as HUNTAGENT_HIGHLIGHTS,
}
export const HUNTAGENT_LOCAL = channel === "local"
