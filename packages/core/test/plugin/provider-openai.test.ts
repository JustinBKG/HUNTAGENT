import { Money } from "@huntagent/schema/money"
import { Agent } from "@huntagent/schema/agent"
import { Session } from "@huntagent/core/runtime/session"
import { describe, expect } from "bun:test"
import { Effect } from "effect"
import { Credential } from "@huntagent/core/infrastructure/credential"
import { Integration } from "@huntagent/core/infrastructure/integration"
import { Location } from "@huntagent/core/infrastructure/location"
import { Model } from "@huntagent/core/runtime/model"
import { Plugin } from "@huntagent/core/plugins/plugin"
import { PluginHost } from "@huntagent/core/plugins/host"
import { PluginHooks } from "@huntagent/core/plugins/hooks"
import { OpenAIPlugin } from "@huntagent/core/plugins/provider/openai"
import { Provider } from "@huntagent/core/infrastructure/provider"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

const addPlugin = Effect.fn(function* () {
  const plugin = yield* Plugin.Service
  const host = yield* PluginHost.make(plugin)
  yield* OpenAIPlugin.effect(host)
})

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected value")
  return value
}

const request = Effect.fn(function* (
  providerID: Provider.ID,
  baseURL: string,
  sessionID = Session.ID.make("ses_test"),
) {
  const hooks = yield* PluginHooks.Service
  const event = yield* hooks.trigger("session", "model.request", {
    sessionID,
    agent: Agent.ID.make("build"),
    model: Model.Ref.make({ providerID, id: Model.ID.make("gpt-5.5") }),
    kind: "primary",
    baseURL,
    headers: {},
  })
  return {
    baseURL: event.baseURL,
    headers: event.headers,
    hasHttpHooks:
      (yield* hooks.has("session", "http.request", providerID)) ||
      (yield* hooks.has("session", "http.response", providerID)),
  }
})

describe("OpenAIPlugin", () => {
  it.effect("registers browser and headless ChatGPT OAuth methods", () =>
    Effect.gen(function* () {
      yield* addPlugin()
      const integrations = yield* Integration.Service
      expect((yield* integrations.get(Integration.ID.make("openai")))?.methods).toEqual([
        {
          id: Integration.MethodID.make("chatgpt-browser"),
          type: "oauth",
          label: "Codex browser (legacy)",
        },
        {
          id: Integration.MethodID.make("chatgpt-headless"),
          type: "oauth",
          label: "Codex device code (legacy)",
        },
      ])
    }),
  )

  it.effect("filters the OpenAI catalog to codex-eligible models under a ChatGPT connection", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      const models = yield* Model.Service
      const credentials = yield* Credential.Service
      yield* catalog.transform((catalog) => {
        catalog.update(Provider.ID.openai, (draft) => {
          draft.package = "@huntagent/ai/providers/openai"
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.5"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
          model.cost = [
            {
              input: Money.USDPerMillionTokens.make(1),
              output: Money.USDPerMillionTokens.make(2),
              cache: {
                read: Money.USDPerMillionTokens.make(0.1),
                write: Money.USDPerMillionTokens.zero,
              },
            },
          ]
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.5-pro"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.4"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 64_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.4-pro"), (model) => {
          model.modelID = Model.ID.make("gpt-5.4")
          model.body = { reasoning: { mode: "pro" } }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.6"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.6-sol"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-4.1"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-6-astra"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-6.1-sol"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-6.1-sol-fast"), (model) => {
          model.modelID = Model.ID.make("gpt-6.1-sol")
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.10"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.04-astra"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-4.99"), () => {})
      })
      yield* credentials.create({
        integrationID: Integration.ID.make("openai"),
        value: Credential.OAuth.make({
          type: "oauth",
          methodID: Integration.MethodID.make("chatgpt-browser"),
          access: "chatgpt-token",
          refresh: "refresh",
          expires: Date.now() + 60_000,
          metadata: { accountID: "acct_123" },
        }),
      })
      yield* addPlugin()

      const direct = yield* request(Provider.ID.openai, "https://api.openai.com/v1")
      const custom = yield* request(Provider.ID.make("custom-openai"), "https://custom.example/v1")
      const proxy = yield* request(Provider.ID.openai, "https://proxy.example/v1?region=us")

      const provider = required(yield* catalog.get(Provider.ID.openai))
      expect(provider.package).toBe("@huntagent/ai/providers/openai")
      expect(provider.settings).toMatchObject({ baseURL: "https://chatgpt.com/backend-api/codex" })
      expect(provider.settings?.encoding).toBe("zstd")
      expect(provider.headers).toMatchObject({
        originator: "opencode",
        "chatgpt-account-id": "acct_123",
        "x-codex-beta-features": "remote_compaction_v2",
      })
      expect(direct.baseURL).toBe("https://chatgpt.com/backend-api/codex")
      expect(direct.headers).toMatchObject({ originator: "opencode", "session-id": "ses_test" })
      expect(direct.hasHttpHooks).toBe(false)
      expect(custom.headers).not.toHaveProperty("originator")
      expect(proxy.baseURL).toBe("https://proxy.example/v1?region=us")
      expect(proxy.headers).toMatchObject({ originator: "opencode", "session-id": "ses_test" })
      const sessions = yield* Session.Service
      const location = yield* Location.Service
      const parent = yield* sessions.create({ location: { directory: location.directory } })
      const child = yield* sessions.create({ parentID: parent.id })
      const childRequest = yield* request(Provider.ID.openai, "https://api.openai.com/v1", child.id)
      expect(childRequest.headers).toMatchObject({ "session-id": parent.id })
      const eligible = required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.5")))
      expect(eligible.package).toBe("@huntagent/ai/providers/openai")
      expect(eligible.headers).toMatchObject({ originator: "opencode", "chatgpt-account-id": "acct_123" })
      expect(eligible.cost).toEqual([])
      expect(eligible.limit).toEqual({ context: 400_000, input: 272_000, output: 128_000 })
      expect(eligible.enabled).toBe(true)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.5-pro"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.4-pro"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.4"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.6"))).enabled).toBe(false)
      const gpt56 = required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.6-sol")))
      expect(gpt56.enabled).toBe(true)
      expect(gpt56.limit).toEqual({ context: 400_000, input: 272_000, output: 128_000 })
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-4.1"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-6-astra"))).enabled).toBe(true)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-6.1-sol"))).limit).toEqual({
        context: 628_000,
        input: 500_000,
        output: 128_000,
      })
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-6.1-sol-fast"))).limit).toEqual({
        context: 628_000,
        input: 500_000,
        output: 128_000,
      })
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.10"))).enabled).toBe(true)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.04-astra"))).enabled).toBe(false)
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-4.99"))).enabled).toBe(false)
    }),
  )

  it.effect("keeps the full OpenAI catalog under an API key connection", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      const models = yield* Model.Service
      const credentials = yield* Credential.Service
      yield* catalog.transform((catalog) => {
        catalog.update(Provider.ID.openai, (draft) => {
          draft.package = "@huntagent/ai/providers/openai"
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-5.5"), (model) => {
          model.limit = { context: 1_050_000, input: 922_000, output: 128_000 }
        })
        catalog.models.update(Provider.ID.openai, Model.ID.make("gpt-4.1"), () => {})
      })
      yield* credentials.create({
        integrationID: Integration.ID.make("openai"),
        value: Credential.Key.make({ type: "key", key: "sk-test" }),
      })
      yield* addPlugin()

      const direct = yield* request(Provider.ID.openai, "https://api.openai.com/v1")

      const provider = required(yield* catalog.get(Provider.ID.openai))
      const model = required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-5.5")))
      expect(model.package).toBe("@huntagent/ai/providers/openai")
      expect(model.enabled).toBe(true)
      expect(model.limit).toEqual({ context: 1_050_000, input: 922_000, output: 128_000 })
      expect(provider.settings?.transport).toBe("websocket")
      expect(provider.settings?.encoding).toBeUndefined()
      expect(model.settings?.transport).toBeUndefined()
      expect(direct.headers).not.toHaveProperty("originator")
      expect(direct.baseURL).toBe("https://api.openai.com/v1")
      expect(provider.headers).not.toHaveProperty("x-codex-beta-features")
      expect(direct.hasHttpHooks).toBe(false)
      expect(provider.headers).not.toHaveProperty("originator")
      expect(required(yield* models.get(Provider.ID.openai, Model.ID.make("gpt-4.1"))).enabled).toBe(true)
    }),
  )

  it.effect("omits the default output limit from OpenAI steps and compaction", () =>
    Effect.gen(function* () {
      yield* addPlugin()
      const hooks = yield* PluginHooks.Service
      const maxTokens = (providerID: Provider.ID) =>
        Effect.gen(function* () {
          const draft = {
            sessionID: Session.ID.make("ses_test"),
            model: Model.Ref.make({ providerID, id: Model.ID.make("gpt-5.5") }),
            system: [],
            messages: [],
            options: { maxTokens: 128_000 },
          }
          const events = [
            yield* hooks.trigger("session", "context", { ...draft, agent: Agent.ID.make("build"), tools: {} }),
            yield* hooks.trigger("session", "compaction", { ...draft, agent: Agent.ID.make("build"), tools: {} }),
          ]
          return events.map((event) => event.options.maxTokens)
        })

      expect(yield* maxTokens(Provider.ID.openai)).toEqual([undefined, undefined])
      expect(yield* maxTokens(Provider.ID.azure)).toEqual([128_000, 128_000])
    }),
  )

})
