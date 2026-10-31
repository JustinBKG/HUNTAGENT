export * as SessionCommand from "./command.js"

import type { PromptInput } from "@huntagent/schema/prompt-input"
import type { Session } from "@huntagent/schema/session"
import type { SessionInbox } from "@huntagent/schema/session-inbox"
import { Effect } from "effect"
import { Command } from "../command.js"
import { Instance } from "../../infrastructure/instance/service.js"
import { Plugin } from "../../plugins/service.js"

export const execute = Effect.fn("SessionCommand.execute")(function* (input: {
  session: Session.Info
  command: string
  text: string
  files?: PromptInput.Prompt["files"]
  agents?: PromptInput.Prompt["agents"]
  skills?: PromptInput.Prompt["skills"]
  delivery?: SessionInbox.Delivery
}) {
  const instances = yield* Instance.Service
  const commands = yield* Plugin.awaitActivation.pipe(Effect.andThen(Command.Service), instances.provide(input.session))
  yield* commands.execute({
    name: input.command,
    invocation: {
      sessionID: input.session.id,
      prompt: {
        text: input.text,
        files: input.files,
        agents: input.agents,
        skills: input.skills,
      },
      delivery: input.delivery ?? "steer",
    },
  })
})
