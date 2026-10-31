export * as PluginInternal from "./internal.js"

import { LLMClient } from "@huntagent/ai"
import type { Plugin } from "@huntagent/plugin/effect/plugin"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { httpClient } from "@huntagent/util/effect/app-node-platform"
import { AppProcess } from "@huntagent/util/process"
import { Context, Effect, Scope } from "effect"
import { HttpClient } from "effect/http"
import { Agent } from "../runtime/agent.js"
import { Model } from "../runtime/model.js"
import { Provider } from "../infrastructure/provider.js"
import { Command } from "../runtime/command.js"
import { Config } from "../config.js"
import { Credential } from "../infrastructure/credential.js"
import { llmClient } from "../shared/effect/app-node-platform.js"
import { ConfigAgentPlugin } from "../config/plugin/agent.js"
import { ConfigCommandPlugin } from "../config/plugin/command.js"
import { ConfigCompactionPlugin } from "../config/plugin/compaction.js"
import { ConfigFormatterPlugin } from "../config/plugin/formatter.js"
import { ConfigImagePlugin } from "../config/plugin/image.js"
import { ConfigInstructionPlugin } from "../config/plugin/instruction.js"
import { ConfigLocationWatcherPlugin } from "../config/plugin/location-watcher.js"
import { ConfigMcpPlugin } from "../config/plugin/mcp.js"
import { ConfigProviderPlugin } from "../config/plugin/provider.js"
import { ConfigPolicyPlugin } from "../config/plugin/policy.js"
import { ConfigReferencePlugin } from "../config/plugin/reference.js"
import { ConfigShellPlugin } from "../config/plugin/shell.js"
import { ConfigSnapshotPlugin } from "../config/plugin/snapshot.js"
import { ConfigSkillPlugin } from "../config/plugin/skill.js"
import { ConfigCompatibilityPlugin } from "../config/plugin/compatibility.js"
import { ConfigToolOutputPlugin } from "../config/plugin/tool-output.js"
import { ConfigWebSearchPlugin } from "../config/plugin/websearch.js"
import { ConfigWorktreePlugin } from "../config/plugin/worktree.js"
import { Worktree } from "../infrastructure/worktree.js"
import { WorktreeStrategies } from "../infrastructure/worktree/strategies.js"
import { Bus } from "../runtime/bus.js"
import { Environment } from "../infrastructure/environment/index.js"
import { FileAccess } from "../infrastructure/file-access.js"
import { FileMutation } from "../infrastructure/file-mutation.js"
import { Formatter } from "../infrastructure/formatter.js"
import { Form } from "../runtime/form.js"
import { FileSystem } from "../infrastructure/filesystem.js"
import { LocationWatcherPolicy } from "../infrastructure/filesystem/location-watcher-policy.js"
import { FSUtil } from "@huntagent/util/fs-util"
import { Global } from "@huntagent/util/global"
import { Image } from "../infrastructure/image.js"
import { InstructionDiscovery } from "../runtime/instruction-discovery.js"
import { Integration } from "../infrastructure/integration.js"
import { Job } from "../infrastructure/job.js"
import { KV } from "../infrastructure/kv.js"
import { Location } from "../infrastructure/location.js"
import { ManagedPolicy } from "../infrastructure/managed-policy.js"
import { ModelsDev } from "../infrastructure/models-dev.js"
import { Mcp } from "../infrastructure/mcp/index.js"
import { Npm } from "@huntagent/util/npm"
import { Permission } from "../runtime/permission.js"
import { Reference } from "../runtime/reference.js"
import { WebSearch } from "../infrastructure/websearch.js"
import { Ripgrep } from "../infrastructure/ripgrep.js"
import { Session } from "../runtime/session.js"
import { SessionCompaction } from "../runtime/session/compaction.js"
import { SessionInstructions } from "../runtime/session/instructions.js"
import { SubagentJob } from "../runtime/session/subagent-job.js"
import { Shell } from "../infrastructure/shell.js"
import { ShellSelect } from "../infrastructure/shell/select.js"
import { Snapshot } from "../runtime/snapshot.js"
import { Skill } from "../runtime/skill.js"
import { SkillDiscovery } from "../runtime/skill/discovery.js"
import { Watcher } from "../infrastructure/filesystem/watcher.js"
import { PatchTool } from "../tools/plugin/patch.js"
import { EditTool } from "../tools/plugin/edit.js"
import { GlobTool } from "../tools/plugin/glob.js"
import { GrepTool } from "../tools/plugin/grep.js"
import { McpResourceTools } from "../tools/plugin/mcp-resource.js"
import { HuntagentTools } from "../tools/plugin/huntagent.js"
import { QuestionTool } from "../tools/plugin/question.js"
import { ReadToolFileSystem } from "../tools/read-filesystem.js"
import { ReadTool } from "../tools/plugin/read.js"
import { ShellTool } from "../tools/plugin/shell.js"
import { SkillTool } from "../tools/plugin/skill.js"
import { SubagentTool } from "../tools/plugin/subagent.js"
import { Tool } from "../runtime/tool.js"
import { ToolOutput } from "../runtime/tool-output.js"
import { WebFetchTool } from "../tools/plugin/webfetch.js"
import { WebSearchTool } from "../tools/plugin/websearch.js"
import { WellKnown } from "../infrastructure/wellknown.js"
import { WriteTool } from "../tools/plugin/write.js"
import { AgentPlugin } from "./agent.js"
import { CommandPlugin } from "./command.js"
import { IdentityPlugin } from "./identity.js"
import { SharedAgents } from "../agents/shared/agents.js"
import { ModelsDevPlugin } from "./models-dev.js"
import { McpCodeModeDefaultsPlugin } from "./mcp-codemode-defaults.js"
import { ProviderPlugins } from "./provider.js"
import { WebSearchPlugins } from "./websearch/index.js"
import { SkillPlugin } from "./skill.js"
import { VcsHgPlugin } from "./vcs/hg.js"
import { ToolInputRepairPlugin } from "./tool-input-repair.js"
import { PentestPrompt } from "../agents/pentest/prompt.js"
import { PentestScope } from "../agents/pentest/scope.js"
import { PentestAgents } from "../agents/pentest/agents.js"
import { VcsGitPlugin } from "./vcs/git.js"
import { VerbosityPlugin } from "./verbosity.js"
import { WarmingPlugin } from "./warming.js"
import { WellKnownPlugin } from "../infrastructure/wellknown/plugin.js"

const services = [
  Agent.Service,
  AppProcess.Service,
  Provider.Service,
  Model.Service,
  Command.Service,
  Config.Service,
  Credential.Service,
  Bus.Service,
  Environment.Service,
  FileAccess.Service,
  FileMutation.Service,
  Formatter.Service,
  LocationWatcherPolicy.Service,
  FileSystem.Service,
  FSUtil.Service,
  Global.Service,
  HttpClient.HttpClient,
  Image.Service,
  InstructionDiscovery.Service,
  Integration.Service,
  Job.Service,
  KV.Service,
  LLMClient.Service,
  Location.Service,
  ManagedPolicy.Service,
  ModelsDev.Service,
  Mcp.Service,
  Npm.Service,
  Permission.Service,
  Form.Service,
  ReadToolFileSystem.Service,
  Reference.Service,
  WebSearch.Service,
  Ripgrep.Service,
  Session.Service,
  SessionCompaction.Service,
  SessionInstructions.Service,
  SubagentJob.Service,
  Shell.Service,
  ShellSelect.Service,
  Snapshot.Service,
  Skill.Service,
  SkillDiscovery.Service,
  Tool.Service,
  ToolOutput.Service,
  Watcher.Service,
  WellKnown.Service,
  Worktree.Service,
  WorktreeStrategies.Service,
] as const

export type Requirements = Context.Service.Identifier<(typeof services)[number]>

export const requirements = LayerNode.group([
  Agent.node,
  AppProcess.node,
  Provider.node,
  Model.node,
  Command.node,
  Config.node,
  Credential.node,
  Bus.node,
  Environment.node,
  FileAccess.node,
  FileMutation.node,
  Formatter.node,
  LocationWatcherPolicy.node,
  FileSystem.node,
  FSUtil.node,
  Global.node,
  httpClient,
  Image.node,
  InstructionDiscovery.node,
  Integration.node,
  Job.node,
  KV.node,
  llmClient,
  Location.node,
  ManagedPolicy.node,
  ModelsDev.node,
  Mcp.node,
  Npm.node,
  Permission.node,
  Form.node,
  ReadToolFileSystem.node,
  Reference.node,
  WebSearch.node,
  Ripgrep.node,
  Session.node,
  SessionCompaction.node,
  SessionInstructions.node,
  SubagentJob.node,
  Shell.node,
  ShellSelect.node,
  Snapshot.node,
  Skill.node,
  SkillDiscovery.node,
  Tool.node,
  ToolOutput.node,
  Watcher.node,
  WellKnown.node,
  Worktree.node,
  WorktreeStrategies.node,
])

export type InternalPlugin = Plugin<Requirements | Scope.Scope>

const pre = [
  // Install the pentest prompt before any plugin reads or curates the request; the scope guardrail rides alongside it.
  PentestPrompt.Plugin,
  PentestScope.Plugin,
  ToolInputRepairPlugin.Plugin,
  ConfigWorktreePlugin.Plugin,
  ConfigMcpPlugin.Plugin,
  McpCodeModeDefaultsPlugin.Plugin,
  WellKnownPlugin.Plugin,
  VcsGitPlugin.Plugin,
  // Pentest (the only selectable primary) first, then shared subagents, then the runtime's hidden agents.
  PentestAgents.Plugin,
  SharedAgents.Plugin,
  AgentPlugin.Plugin,
  CommandPlugin.Plugin,
  SkillPlugin.Plugin,
  VcsHgPlugin.Plugin,
  ModelsDevPlugin,
  ...ProviderPlugins,
  ...WebSearchPlugins,
  PatchTool.Plugin,
  VerbosityPlugin.Plugin,
  IdentityPlugin.Plugin,
  EditTool.Plugin,
  GlobTool.Plugin,
  GrepTool.Plugin,
  HuntagentTools.Plugin,
  McpResourceTools.Plugin,
  QuestionTool.Plugin,
  ReadTool.Plugin,
  ShellTool.Plugin,
  SkillTool.Plugin,
  SubagentTool.Plugin,
  WebFetchTool.Plugin,
  WebSearchTool.Plugin,
  WriteTool.Plugin,
  WarmingPlugin.Plugin,
] as const satisfies readonly InternalPlugin[]

const post = [
  ConfigInstructionPlugin.Plugin,
  ConfigReferencePlugin.Plugin,
  ConfigAgentPlugin.Plugin,
  ConfigCommandPlugin.Plugin,
  ConfigCompactionPlugin.Plugin,
  ConfigFormatterPlugin.Plugin,
  ConfigImagePlugin.Plugin,
  ConfigLocationWatcherPlugin.Plugin,
  ConfigShellPlugin.Plugin,
  ConfigSnapshotPlugin.Plugin,
  ConfigToolOutputPlugin.Plugin,
  ConfigCompatibilityPlugin.Plugin,
  ConfigSkillPlugin.Plugin,
  ConfigProviderPlugin.Plugin,
  ConfigWebSearchPlugin.Plugin,
  ConfigPolicyPlugin.Plugin,
] as const satisfies readonly InternalPlugin[]

// Repository config must not switch off policy enforcement, so plugin remove operations skip these IDs.
export const guarded: ReadonlySet<string> = new Set([ConfigPolicyPlugin.Plugin.id])

export const list = Effect.fn("PluginInternal.list")(function* () {
  // Capture only services; activation supplies the child Scope and batching context.
  const context = Context.pick(...services)(yield* Effect.context<Requirements>())
  const resolve = (plugins: readonly InternalPlugin[]) =>
    plugins.map(
      (plugin): Plugin => ({
        id: plugin.id,
        effect: (host) => plugin.effect(host).pipe(Effect.provide(context)),
      }),
    )
  return {
    pre: resolve(pre),
    post: resolve(post),
  }
})
