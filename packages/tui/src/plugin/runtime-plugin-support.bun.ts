import { ensurePluginRuntime, provides } from "@huntagent/plugin/runtime"
import { Plugin, PluginContextProvider, usePlugin } from "@huntagent/plugin/tui"
import { ensureRuntimePluginSupport } from "@opentui/solid/runtime-plugin-support/configure"

ensurePluginRuntime()
ensureRuntimePluginSupport({
  additional: {
    "@huntagent/plugin/tui": { Plugin, PluginContextProvider, usePlugin },
  },
  preserve: provides,
})
