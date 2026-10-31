import { Generate } from "@huntagent/core/runtime/generate"
import { Location } from "@huntagent/core/infrastructure/location"
import { LocationServiceMap } from "@huntagent/core/infrastructure/location-services"
import { AbsolutePath } from "@huntagent/core/shared/schema"
import { InvalidRequestError, ServiceUnavailableError } from "@huntagent/protocol/errors"
import { Global } from "@huntagent/util/global"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"
import { awaitPlugins, locationErrors } from "../location"

export const GenerateHandler = HttpApiBuilder.group(Api, "server.generate", (handlers) =>
  Effect.gen(function* () {
    const global = yield* Global.Service
    const locations = yield* LocationServiceMap.Service
    const services = locations.get(Location.Ref.make({ directory: AbsolutePath.make(global.config) }))
    return handlers.handle(
      "generate.text",
      Effect.fn("server.generate.text")(
        function* (request) {
          yield* awaitPlugins
          const generate = yield* Generate.Service
          const text = yield* generate
            .text(request.payload)
            .pipe(
              Effect.mapError((error) =>
                error._tag === "Generate.ModelSelectionError"
                  ? new InvalidRequestError({ message: error.message })
                  : new ServiceUnavailableError({ message: error.message, service: error.service }),
              ),
            )
          return { data: { text } }
        },
        Effect.provide(services),
        locationErrors,
      ),
    )
  }),
)
