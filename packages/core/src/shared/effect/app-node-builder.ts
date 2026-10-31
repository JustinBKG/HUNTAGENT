import { buildLocationServiceMap } from "../../infrastructure/location-services.js"
import { LocationServiceMap } from "../../infrastructure/location-service-map.js"
import { LayerNode } from "@huntagent/util/effect/layer-node"
import { makeGlobalNode } from "@huntagent/util/effect/app-node"
import { Effect, Layer } from "effect"
import { Instance } from "../../infrastructure/instance/service.js"

const instances = makeGlobalNode({
  service: Instance.Service,
  layer: Layer.effect(
    Instance.Service,
    Effect.gen(function* () {
      const locations = yield* LocationServiceMap.Service
      return Instance.Service.of({
        provide: (session) => Effect.provide(locations.get(session.location)),
      })
    }),
  ),
  deps: [LocationServiceMap.node],
})

export function build<A, E>(root: LayerNode.Graph<A, E>, replacements: LayerNode.Replacements = []) {
  const bindings = [Instance.node.replace(instances), ...replacements]
  return LayerNode.compile(root, {
    replacements: [LocationServiceMap.node.replace(buildLocationServiceMap(bindings)), ...bindings],
  })
}

export * as AppNodeBuilder from "./app-node-builder.js"
