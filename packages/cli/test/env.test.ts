import { expect, test } from "bun:test"
import { Env } from "../src/env"

test("session environment omits server credentials", () => {
  const previousPassword = process.env.HUNTAGENT_PASSWORD
  const previousLegacyPassword = process.env.HUNTAGENT_SERVER_PASSWORD
  const previousValue = process.env.HUNTAGENT_SESSION_ENV_TEST
  process.env.HUNTAGENT_PASSWORD = "password"
  process.env.HUNTAGENT_SERVER_PASSWORD = "legacy"
  process.env.HUNTAGENT_SESSION_ENV_TEST = "included"

  const environment = Env.session()

  if (previousPassword === undefined) delete process.env.HUNTAGENT_PASSWORD
  else process.env.HUNTAGENT_PASSWORD = previousPassword
  if (previousLegacyPassword === undefined) delete process.env.HUNTAGENT_SERVER_PASSWORD
  else process.env.HUNTAGENT_SERVER_PASSWORD = previousLegacyPassword
  if (previousValue === undefined) delete process.env.HUNTAGENT_SESSION_ENV_TEST
  else process.env.HUNTAGENT_SESSION_ENV_TEST = previousValue

  expect(environment.HUNTAGENT_PASSWORD).toBeUndefined()
  expect(environment.HUNTAGENT_SERVER_PASSWORD).toBeUndefined()
  expect(environment.HUNTAGENT_SESSION_ENV_TEST).toBe("included")
})
