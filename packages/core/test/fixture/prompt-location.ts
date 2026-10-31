import type { FileSystem } from "@huntagent/core/infrastructure/filesystem"
import { Bus } from "@huntagent/core/runtime/bus"
import { Image } from "@huntagent/core/infrastructure/image"
import { LocationServiceMap } from "@huntagent/core/infrastructure/location-service-map"
import type { LocationServices } from "@huntagent/core/infrastructure/location-services"
import { Plugin } from "@huntagent/core/plugins/plugin"
import { PluginHooks } from "@huntagent/core/plugins/hooks"
import { Skill } from "@huntagent/core/runtime/skill"
import type { Location } from "@huntagent/schema/location"
import { makeGlobalNode } from "@huntagent/util/effect/app-node"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { Effect, Layer, LayerMap } from "effect"

// Plain-prompt unit fixtures use virtual directories.
export const promptLocationNode = makeGlobalNode({
  service: LocationServiceMap.Service,
  layer: Layer.effect(
    LocationServiceMap.Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service
      return yield* LayerMap.make(
        (_ref: Location.Ref) =>
          LayerNode.compile(LayerNode.group([PluginHooks.node, Image.node, Skill.node, Plugin.node]), {
            replacements: [
              Bus.node.replace(Layer.succeed(Bus.Service, bus)),
              Plugin.node.replace(Layer.mock(Plugin.Service, { awaitActivation: Effect.void })),
            ],
          }) as unknown as Layer.Layer<LocationServices, FileSystem.DirectoryNotFoundError>,
      )
    }),
  ),
  deps: [Bus.node],
})
