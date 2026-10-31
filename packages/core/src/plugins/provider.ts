import { DynamicProviderPlugin } from "./provider/dynamic.js"
import { GoogleVertexPlugin } from "./provider/google-vertex.js"
import { LMStudioPlugin } from "./provider/lmstudio.js"
import { OllamaPlugin } from "./provider/ollama.js"
import { OpenAIPlugin } from "./provider/openai.js"
import { OpenRouterPlugin } from "./provider/openrouter.js"
import { PromptCacheKeyPlugin } from "./provider/prompt-cache-key.js"
import { XAIPlugin } from "./provider/xai.js"
import type { PluginInternal } from "./internal.js"

export const ProviderPlugins: PluginInternal.InternalPlugin[] = [
  GoogleVertexPlugin,
  LMStudioPlugin,
  OllamaPlugin,
  OpenAIPlugin,
  OpenRouterPlugin,
  PromptCacheKeyPlugin,
  XAIPlugin,
  DynamicProviderPlugin,
]
