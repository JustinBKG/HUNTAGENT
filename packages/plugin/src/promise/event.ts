import type { EventApi } from "@huntagent/client/promise/api"

export interface EventDomain extends Pick<EventApi, "subscribe"> {}
