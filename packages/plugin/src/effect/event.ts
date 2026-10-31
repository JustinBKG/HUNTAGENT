import type { EventApi } from "@huntagent/client/effect/api"

export interface EventDomain extends Pick<EventApi<unknown>, "subscribe"> {}
