import type { HuntagentEvent } from "@huntagent/client"
import { useClient } from "./client"

type EventMetadata = {
  directory: string | undefined
}
type HuntagentEventMap = { [Type in HuntagentEvent["type"]]: Extract<HuntagentEvent, { type: Type }> }

export function useEvent() {
  const client = useClient()

  function subscribe(handler: (event: HuntagentEvent, metadata: EventMetadata) => void) {
    return client.event.listen(({ details }) => {
      if (details.type === "server.connected") return
      handler(details, { directory: details.location?.directory })
    })
  }

  function on<T extends HuntagentEvent["type"]>(
    type: T,
    handler: (event: HuntagentEventMap[T], metadata: EventMetadata) => void,
  ) {
    return client.event.on(type, (event) => {
      handler(event, { directory: event.location?.directory })
    })
  }

  return {
    subscribe,
    on,
  }
}
