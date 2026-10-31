import { migrateV1, parseThemeDocument, type ThemeDocument, type ModeDefinition } from "@huntagent/theme/tui"
import { resolveThemeColors } from "./resolve"
import { type Theme, type ThemeV1Json } from "./v1"
import huntagent from "./assets/v2/huntagent.json" with { type: "json" }

export { DEFAULT_THEMES, type Theme, type ThemeV1Json } from "./v1"

export type ThemeDocumentSource = Record<string, unknown>

let customThemes: Record<string, ThemeDocumentSource> = {}
let systemTheme: ThemeDocumentSource | undefined
const listeners = new Set<(themes: Record<string, ThemeDocumentSource>) => void>()
const parsed = new WeakMap<object, ThemeDocument>()
let huntagentTheme: (ThemeDocument & {
  readonly light: ModeDefinition
  readonly dark: ModeDefinition
}) | undefined

export function getHuntagentTheme() {
  if (huntagentTheme) return huntagentTheme
  const document = parseThemeDocument(huntagent, "huntagent") as NonNullable<typeof huntagentTheme>
  huntagentTheme = document
  return document
}

function listThemes(): Record<string, ThemeDocumentSource> {
  // Huntagent ships a single built-in theme; custom files and the generated
  // system theme layer on top but the app offers no in-UI theme switching.
  const themes: Record<string, ThemeDocumentSource> = {
    huntagent: getHuntagentTheme(),
    ...customThemes,
  }
  return {
    ...themes,
    system: systemTheme ?? themes.system ?? themes.huntagent,
  }
}

function syncThemes() {
  const themes = listThemes()
  for (const listener of listeners) listener(themes)
}

export function allThemes() {
  return listThemes()
}

export function isThemeSource(source: unknown): source is ThemeDocumentSource {
  if (typeof source !== "object" || source === null || Array.isArray(source)) return false
  return "theme" in source || "base" in source
}

export function parseTheme(source: ThemeDocumentSource, name = "theme") {
  const cached = parsed.get(source)
  if (cached) return cached

  const document = "theme" in source ? migrateV1(source as ThemeV1Json) : parseThemeDocument(source, name)

  parsed.set(source, document)
  return document
}

export function subscribeThemes(listener: (themes: Record<string, ThemeDocumentSource>) => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCustomThemes(themes: Record<string, unknown>) {
  customThemes = Object.fromEntries(
    Object.entries(themes).filter((entry): entry is [string, ThemeDocumentSource] => isThemeSource(entry[1])),
  )
  syncThemes()
}

export function setSystemTheme(theme: ThemeDocumentSource | undefined) {
  systemTheme = theme
  syncThemes()
}

export function hasTheme(name: string) {
  if (!name) return false
  return allThemes()[name] !== undefined
}

export function resolveTheme(theme: ThemeV1Json, mode: "dark" | "light"): Theme {
  const resolved = resolveThemeColors(theme, mode)
  return {
    ...resolved.theme,
    _hasSelectedListItemText: resolved.hasSelectedListItemText,
    thinkingOpacity: resolved.thinkingOpacity,
  }
}
