import { expect, test } from "bun:test"
import { EnvironmentDriver } from "@huntagent/core/infrastructure/environment/driver"
import { EnvironmentFiles } from "@huntagent/core/infrastructure/environment/files"
import { Location as CoreLocation } from "@huntagent/core/infrastructure/location"
import { WorkspaceDriver } from "@huntagent/core/infrastructure/workspace/driver"
import { SessionInbox as CoreSessionInbox } from "@huntagent/core/runtime/session/inbox"
import { SessionMessage as CoreSessionMessage } from "@huntagent/core/runtime/session/message"
import { Agent } from "@huntagent/schema/agent"
import { Config } from "@huntagent/schema/config"
import { Event } from "@huntagent/schema/event"
import { Location } from "@huntagent/schema/location"
import { Model } from "@huntagent/schema/model"
import { Project } from "@huntagent/schema/project"
import { Provider } from "@huntagent/schema/provider"
import { WebSearch } from "@huntagent/schema/websearch"
import { Session } from "@huntagent/schema/session"
import { SessionInbox } from "@huntagent/schema/session-inbox"
import { SessionMessage } from "@huntagent/schema/session-message"
import { Workspace } from "@huntagent/schema/workspace"
import { Worktree } from "@huntagent/schema/worktree"
import { Api } from "@huntagent/server/api"
import { ClientApi, groupNames, promiseOmitEndpoints } from "@huntagent/protocol/client"
import { compile, emitPromise } from "@huntagent/httpapi-codegen"

const SDK = await import("../src/index")
const SDKEffect = await import("../src/effect")
const CoreAgent = await import("@huntagent/core/runtime/agent")
const CoreModel = await import("@huntagent/core/runtime/model")
const CoreProject = await import("@huntagent/core/infrastructure/project")
const CoreSession = await import("@huntagent/core/runtime/session")
const CoreWorktree = await import("@huntagent/core/infrastructure/worktree")

test("re-exports canonical contracts directly from Schema", () => {
  expect(SDK.Agent).toBe(Agent)
  expect(SDK.Config).toBe(Config)
  expect(SDK.Event).toBe(Event)
  expect(SDK.Model).toBe(Model)
  expect(SDK.WebSearch).toBe(WebSearch)
  expect(SDK.Session).toBe(Session)
  expect(SDK.Worktree).toBe(Worktree)
  expect(SDK.Workspace).toBe(Workspace)
  expect(Object.keys(SDK).sort()).toEqual([
    "AbsolutePath",
    "Agent",
    "ClientError",
    "Command",
    "Config",
    "Credential",
    "Event",
    "FileSystem",
    "Integration",
    "Location",
    "Model",
    "Huntagent",
    "Permission",
    "PermissionSaved",
    "Project",
    "Prompt",
    "PromptInput",
    "Provider",
    "Pty",
    "Question",
    "Reference",
    "RelativePath",
    "Session",
    "SessionInbox",
    "SessionMessage",
    "Skill",
    "Tool",
    "WebSearch",
    "Workspace",
    "Worktree",
  ])
})

test("Core and Server reuse the authoritative Schema and Protocol values", () => {
  expect(CoreAgent.ID).toBe(Agent.ID)
  expect(CoreLocation.Ref).toBe(Location.Ref)
  expect(CoreModel.Ref).toBe(Model.Ref)
  expect(CoreSession.Info).toBe(Session.Info)
  expect(CoreProject.Current).toBe(Project.Current)
  expect(CoreWorktree.DirectoryUnavailableError).toBeDefined()
  expect(CoreWorktree.List).toBe(Worktree.List)
  expect(CoreWorktree.Info).toBe(Worktree.Info)
  expect(CoreSessionInbox.Item).toBe(SessionInbox.Item)
  expect(CoreSessionInbox.User).toBe(SessionInbox.User)
  expect(CoreSessionInbox.Synthetic).toBe(SessionInbox.Synthetic)
  expect(CoreSessionMessage.Info).toBe(SessionMessage.Info)
  expect(CoreSessionMessage.AssistantText).toBe(SessionMessage.AssistantText)
  expect(Api.groups["server.session"].identifier).toBe("server.session")
  expect(Api.groups["server.project"].identifier).toBe("server.project")
  expect(Object.keys(ClientApi.groups)).toEqual(Object.keys(Api.groups))
  expect(Session.ID.create()).toStartWith("ses_")
  expect(String(Project.ID.global)).toBe("global")
  expect(String(Provider.ID.anthropic)).toBe("anthropic")
  expect(Workspace.ID.create()).toStartWith("wrk_")
})

test("client and Server contracts generate identically", () => {
  const server = compile(Api, { groupNames, omitEndpoints: promiseOmitEndpoints })
  const client = compile(ClientApi, { groupNames, omitEndpoints: promiseOmitEndpoints })

  expect(emitPromise(client)).toEqual(emitPromise(server))
})

test("re-exports workspace and environment driver contracts from @huntagent/sdk/effect", () => {
  expect(SDKEffect.WorkspaceDriver).toBe(WorkspaceDriver)
  expect(SDKEffect.EnvironmentDriver).toBe(EnvironmentDriver)
  expect(SDKEffect.EnvironmentFiles).toBe(EnvironmentFiles)
})
