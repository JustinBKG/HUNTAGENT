import { Agent } from "@huntagent/core/runtime/agent"
import { AISDK } from "@huntagent/core/infrastructure/aisdk"
import { Command } from "@huntagent/core/runtime/command"
import { Config } from "@huntagent/core/config"
import { Credential } from "@huntagent/core/infrastructure/credential"
import { Database } from "@huntagent/core/infrastructure/database/database"
import { FileAccess } from "@huntagent/core/infrastructure/file-access"
import { LayerNodePlatform } from "@huntagent/util/effect/app-node-platform"
import { AppProcess } from "@huntagent/util/process"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { Bus } from "@huntagent/core/runtime/bus"
import { FileSystem } from "@huntagent/core/infrastructure/filesystem"
import { FSUtil } from "@huntagent/util/fs-util"
import { Form } from "@huntagent/core/runtime/form"
import { Generate } from "@huntagent/core/runtime/generate"
import { Integration } from "@huntagent/core/infrastructure/integration"
import { KV } from "@huntagent/core/infrastructure/kv"
import { Location } from "@huntagent/core/infrastructure/location"
import { ManagedPolicy } from "@huntagent/core/infrastructure/managed-policy"
import { Mcp } from "@huntagent/core/infrastructure/mcp/index"
import { Model } from "@huntagent/core/runtime/model"
import { Npm } from "@huntagent/util/npm"
import { Plugin } from "@huntagent/core/plugins/plugin"
import { PluginHooks } from "@huntagent/core/plugins/hooks"
import { Provider } from "@huntagent/core/infrastructure/provider"
import { Session } from "@huntagent/core/runtime/session"
import { PersistentPty } from "@huntagent/core/infrastructure/persistent-pty"
import { LocationServiceMap } from "@huntagent/core/infrastructure/location-service-map"
import { AppNodeBuilder } from "@huntagent/core/shared/effect/app-node-builder"
import { Permission } from "@huntagent/core/runtime/permission"
import { Reference } from "@huntagent/core/runtime/reference"
import { Rpc } from "@huntagent/core/shared/rpc"
import { Skill } from "@huntagent/core/runtime/skill"
import { SkillDiscovery } from "@huntagent/core/runtime/skill/discovery"
import { Watcher } from "@huntagent/core/infrastructure/filesystem/watcher"
import { Tool } from "@huntagent/core/runtime/tool"
import { Vcs } from "@huntagent/core/infrastructure/vcs"
import { WebSearch } from "@huntagent/core/infrastructure/websearch"
import { Worktree } from "@huntagent/core/infrastructure/worktree"
import { WorktreeStrategies } from "@huntagent/core/infrastructure/worktree/strategies"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"
import { emptyMcpLayer } from "../fixture/mcp"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: (name) => Effect.succeed({ directory: "", name }),
    resolve: (name) => Effect.succeed({ directory: "", name }),
    check: () => Effect.succeed(false),
    update: (name) => Effect.succeed({ directory: "", name }),
    which: () => Effect.undefined,
  }),
)

const generateLayer = Layer.succeed(Generate.Service, Generate.Service.of({ text: () => Effect.succeed("") }))

const configLayer = Config.testLayer()

const permissionLayer = Layer.succeed(
  Permission.Service,
  Permission.Service.of({
    close: Effect.void,
    ask: (input) => Effect.succeed({ id: input.id ?? Permission.ID.create(), effect: "ask" }),
    assert: () => Effect.void,
    reply: () => Effect.void,
    get: () => Effect.succeed(undefined),
    forSession: () => Effect.succeed([]),
    list: () => Effect.succeed([]),
  }),
)

export const makePluginTestLayer = (permission = permissionLayer) =>
  AppNodeBuilder.build(
    LayerNode.group([
      AppProcess.node,
      FileSystem.node,
      FSUtil.node,
      Location.node,
      Npm.node,
      Credential.node,
      Config.node,
      Database.node,
      FileAccess.node,
      Bus.node,
      Form.node,
      Generate.node,
      LayerNodePlatform.httpClient,
      Plugin.node,
      Agent.node,
      AISDK.node,
      Provider.node,
      Model.node,
      Command.node,
      Integration.node,
      KV.node,
      ManagedPolicy.node,
      Mcp.node,
      Session.node,
      PersistentPty.node,
      LocationServiceMap.node,
      Permission.node,
      PluginHooks.node,
      Reference.node,
      Rpc.node,
      Skill.node,
      SkillDiscovery.node,
      Tool.node,
      Vcs.node,
      Watcher.node,
      WebSearch.node,
      Worktree.node,
      WorktreeStrategies.node,
    ]),
    [
      Location.node.replace(tempLocationLayer),
      Npm.node.replace(npmLayer),
      Config.node.replace(configLayer),
      Mcp.node.replace(emptyMcpLayer),
      Generate.node.replace(generateLayer),
      Permission.node.replace(permission),
    ],
  ).pipe(Layer.provideMerge(configLayer))

export const PluginTestLayer = makePluginTestLayer()
