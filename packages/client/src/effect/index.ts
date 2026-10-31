// TODO: Keep additional network capabilities inside Schema and Protocol as the client grows; /effect must never import
// Core or Server. Preserve these datatype exports so internal model reorganizations do not require caller migrations.
import type { Effect } from "effect"
import type { Huntagent } from "./client.js"

export * from "./generated/index"
export { Huntagent } from "./client.js"
export type {
  AgentApi,
  AppApi,
  CommandApi,
  ConfigApi,
  EventApi,
  IntegrationApi,
  ModelApi,
  PluginApi,
  ProviderApi,
  ReferenceApi,
  RpcApi,
  RpcClient,
  WebSearchApi,
  SessionApi,
  SkillApi,
} from "./api.js"
export { Agent } from "@huntagent/schema/agent"
export { Command } from "@huntagent/schema/command"
export { Config } from "@huntagent/schema/config"
export { Credential } from "@huntagent/schema/credential"
export { Event } from "@huntagent/schema/event"
export { EventLog } from "@huntagent/schema/event-log"
export { FileSystem } from "@huntagent/schema/filesystem"
export { Form } from "@huntagent/schema/form"
export { Integration } from "@huntagent/schema/integration"
export { Location } from "@huntagent/schema/location"
export { Model } from "@huntagent/schema/model"
export { Permission } from "@huntagent/schema/permission"
export { PermissionSaved } from "@huntagent/schema/permission-saved"
export { Project } from "@huntagent/schema/project"
export { Worktree } from "@huntagent/schema/worktree"
export { Vcs } from "@huntagent/schema/vcs"
export { Provider } from "@huntagent/schema/provider"
export { Pty } from "@huntagent/schema/pty"
export { Question } from "@huntagent/schema/question"
export { Reference } from "@huntagent/schema/reference"
export { WebSearch } from "@huntagent/schema/websearch"
export { AbsolutePath, RelativePath } from "@huntagent/schema/schema"
export { Session } from "@huntagent/schema/session"
export { SessionInbox } from "@huntagent/schema/session-inbox"
export { SessionMessage } from "@huntagent/schema/session-message"
export { Skill } from "@huntagent/schema/skill"
export { Prompt } from "@huntagent/schema/prompt"
export { PromptInput } from "@huntagent/schema/prompt-input"
export type { HuntagentEvent } from "@huntagent/protocol/groups/event"
export type HuntagentClient = Effect.Success<ReturnType<typeof Huntagent.make>>
