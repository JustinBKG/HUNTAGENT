import type { Huntagent } from "./client.js"

export * from "./generated/index.js"
export { Huntagent } from "./client.js"
export type {
  AgentApi,
  CommandApi,
  ConfigApi,
  EventApi,
  IntegrationApi,
  ModelApi,
  PluginApi,
  ProviderApi,
  ReferenceApi,
  RpcApi,
  RpcCallOptions,
  RpcClient,
  RpcEventPayload,
  WebSearchApi,
  SessionApi,
  SkillApi,
} from "./api.js"
export type { EventSubscribeOutput as HuntagentEvent } from "./generated/types.js"
export type HuntagentClient = ReturnType<typeof Huntagent.make>
