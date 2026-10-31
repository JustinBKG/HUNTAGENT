import { NodeFileSystem } from "@effect/platform-node"
import { compile, emitEffectImported, emitEffectShape, emitPromise, write } from "@huntagent/httpapi-codegen"
import { ClientApi, effectOmitEndpoints, groupNames, promiseOmitEndpoints } from "@huntagent/protocol/client"
import { Agent } from "@huntagent/schema/agent"
import { Command } from "@huntagent/schema/command"
import { Config } from "@huntagent/schema/config"
import { Credential } from "@huntagent/schema/credential"
import { Event } from "@huntagent/schema/event"
import { EventLog } from "@huntagent/schema/event-log"
import { FileDiff } from "@huntagent/schema/file-diff"
import { FileSystem } from "@huntagent/schema/filesystem"
import { Form } from "@huntagent/schema/form"
import { Instruction } from "@huntagent/schema/instruction"
import { InstructionEntry } from "@huntagent/schema/instruction-entry"
import { Integration } from "@huntagent/schema/integration"
import { Location } from "@huntagent/schema/location"
import { Mcp } from "@huntagent/schema/mcp"
import { Model } from "@huntagent/schema/model"
import { Money } from "@huntagent/schema/money"
import { Permission } from "@huntagent/schema/permission"
import { PermissionSaved } from "@huntagent/schema/permission-saved"
import { Plugin } from "@huntagent/schema/plugin"
import { Project } from "@huntagent/schema/project"
import { Worktree } from "@huntagent/schema/worktree"
import { AgentAttachment, FileAttachment, Prompt, PromptMention } from "@huntagent/schema/prompt"
import { PromptInput } from "@huntagent/schema/prompt-input"
import { Provider } from "@huntagent/schema/provider"
import { Pty } from "@huntagent/schema/pty"
import { PtyTicket } from "@huntagent/schema/pty-ticket"
import { Question } from "@huntagent/schema/question"
import { Reference } from "@huntagent/schema/reference"
import { AbsolutePath, RelativePath } from "@huntagent/schema/schema"
import { Session } from "@huntagent/schema/session"
import { SessionMessage } from "@huntagent/schema/session-message"
import { SessionInbox } from "@huntagent/schema/session-inbox"
import { Shell } from "@huntagent/schema/shell"
import { Skill } from "@huntagent/schema/skill"
import { Snapshot } from "@huntagent/schema/snapshot"
import { Vcs } from "@huntagent/schema/vcs"
import { WebSearch } from "@huntagent/schema/websearch"
import { Workspace } from "@huntagent/schema/workspace"
import { Effect, Schema } from "effect"
import { fileURLToPath } from "url"

const promiseContract = compile(ClientApi, { groupNames, omitEndpoints: promiseOmitEndpoints })
const effectContract = compile(ClientApi, { groupNames, omitEndpoints: effectOmitEndpoints })
const effectTypeReferences = [
  ...namespaceTypes("Agent", "@huntagent/schema/agent", Agent),
  ...namespaceTypes("Command", "@huntagent/schema/command", Command),
  ...namespaceTypes("Config", "@huntagent/schema/config", Config),
  ...namespaceTypes("Credential", "@huntagent/schema/credential", Credential),
  ...namespaceTypes("Event", "@huntagent/schema/event", Event),
  ...namespaceTypes("EventLog", "@huntagent/schema/event-log", EventLog),
  ...namespaceTypes("FileDiff", "@huntagent/schema/file-diff", FileDiff),
  ...namespaceTypes("FileSystem", "@huntagent/schema/filesystem", FileSystem),
  ...namespaceTypes("Form", "@huntagent/schema/form", Form),
  ...namespaceTypes("Instruction", "@huntagent/schema/instruction", Instruction),
  ...namespaceTypes("InstructionEntry", "@huntagent/schema/instruction-entry", InstructionEntry),
  ...namespaceTypes("Integration", "@huntagent/schema/integration", Integration),
  typeReference("Location.PublicRef", "@huntagent/schema/location", Location.PublicRef),
  typeReference("Location.PublicInfo", "@huntagent/schema/location", Location.PublicInfo),
  ...namespaceTypes("Mcp", "@huntagent/schema/mcp", Mcp),
  ...namespaceTypes("Model", "@huntagent/schema/model", Model),
  ...namespaceTypes("Money", "@huntagent/schema/money", Money),
  ...namespaceTypes("Permission", "@huntagent/schema/permission", Permission),
  ...namespaceTypes("PermissionSaved", "@huntagent/schema/permission-saved", PermissionSaved),
  ...namespaceTypes("Plugin", "@huntagent/schema/plugin", Plugin),
  ...namespaceTypes("Project", "@huntagent/schema/project", Project),
  ...namespaceTypes("Worktree", "@huntagent/schema/worktree", Worktree),
  ...namespaceTypes("PromptInput", "@huntagent/schema/prompt-input", PromptInput),
  ...namespaceTypes("Provider", "@huntagent/schema/provider", Provider),
  ...namespaceTypes("Pty", "@huntagent/schema/pty", Pty),
  ...namespaceTypes("PtyTicket", "@huntagent/schema/pty-ticket", PtyTicket),
  ...namespaceTypes("Question", "@huntagent/schema/question", Question),
  ...namespaceTypes("Reference", "@huntagent/schema/reference", Reference),
  ...namespaceTypes("Session", "@huntagent/schema/session", Session),
  ...namespaceTypes("SessionMessage", "@huntagent/schema/session-message", SessionMessage),
  ...namespaceTypes("SessionInbox", "@huntagent/schema/session-inbox", SessionInbox),
  ...namespaceTypes("Shell", "@huntagent/schema/shell", Shell),
  ...namespaceTypes("Skill", "@huntagent/schema/skill", Skill),
  ...namespaceTypes("Snapshot", "@huntagent/schema/snapshot", Snapshot),
  ...namespaceTypes("Vcs", "@huntagent/schema/vcs", Vcs),
  ...namespaceTypes("WebSearch", "@huntagent/schema/websearch", WebSearch),
  ...namespaceTypes("Workspace", "@huntagent/schema/workspace", Workspace),
  typeReference("Prompt", "@huntagent/schema/prompt", Prompt),
  typeReference("PromptMention", "@huntagent/schema/prompt", PromptMention),
  typeReference("FileAttachment", "@huntagent/schema/prompt", FileAttachment),
  typeReference("AgentAttachment", "@huntagent/schema/prompt", AgentAttachment),
  typeReference("AbsolutePath", "@huntagent/schema/schema", AbsolutePath),
  typeReference("RelativePath", "@huntagent/schema/schema", RelativePath),
]

await Effect.runPromise(
  Effect.all(
    [
      write(
        emitPromise(promiseContract, {
          mutableOutputs: true,
        }),
        fileURLToPath(new URL("../src/promise/generated", import.meta.url)),
      ),
      write(
        emitEffectImported(effectContract, {
          module: "../../contract",
          api: "ClientApi",
          shapeModule: "../api/api.js",
        }),
        fileURLToPath(new URL("../src/effect/generated", import.meta.url)),
      ),
      write(
        emitEffectShape(effectContract, {
          typeReferences: effectTypeReferences,
          outputTypes: {
            "event.subscribe": {
              name: "HuntagentEvent",
              import: 'import type { HuntagentEvent } from "@huntagent/protocol/groups/event"',
            },
          },
        }),
        fileURLToPath(new URL("../src/effect/api", import.meta.url)),
      ),
    ],
    { concurrency: 3, discard: true },
  ).pipe(Effect.provide(NodeFileSystem.layer)),
)

function namespaceTypes(namespace: string, module: string, values: object) {
  return Object.entries(values).flatMap(([name, schema]) =>
    Schema.isSchema(schema) ? [typeReference(`${namespace}.${name}`, module, schema)] : [],
  )
}

function typeReference(name: string, module: string, schema: Schema.Top) {
  return {
    schema,
    name,
    import: `import type { ${name.split(".")[0]} } from ${JSON.stringify(module)}`,
  }
}
