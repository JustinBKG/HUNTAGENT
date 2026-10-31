import { expect, test } from "bun:test"
import { selectTheme, selectThemeMode, supportsThemeMode, themeModes } from "@huntagent/theme/tui"
import { getHuntagentTheme } from "../../../src/theme"

test("selects complete light and dark themes independently", () => {
  const light = selectTheme(getHuntagentTheme(), "light")
  const dark = selectTheme(getHuntagentTheme(), "dark")
  expect(selectTheme(getHuntagentTheme())).toEqual(light)
  expect(light.hue).toEqual(getHuntagentTheme().light.hue)
  expect(dark.text).toEqual(getHuntagentTheme().base.text)
  expect(dark.hue).toEqual(getHuntagentTheme().dark.hue)
  expect(selectThemeMode(getHuntagentTheme(), "dark")).toEqual({ theme: dark, mode: "dark" })
})

test("selects the available mode when the requested mode is missing", () => {
  const lightOnly = { base: getHuntagentTheme().base, light: getHuntagentTheme().light } as const
  const darkOnly = { base: getHuntagentTheme().base, dark: getHuntagentTheme().dark } as const

  expect(themeModes(lightOnly)).toEqual(["light"])
  expect(themeModes(darkOnly)).toEqual(["dark"])
  expect(supportsThemeMode(lightOnly, "light")).toBeTrue()
  expect(supportsThemeMode(lightOnly, "dark")).toBeFalse()
  expect(selectThemeMode(lightOnly, "dark")).toEqual({ theme: selectTheme(getHuntagentTheme(), "light"), mode: "light" })
  expect(selectThemeMode(darkOnly, "light")).toEqual({ theme: selectTheme(getHuntagentTheme(), "dark"), mode: "dark" })
})
