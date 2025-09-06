---
description: Add new language and translation to the project
auto_execution_mode: 1
---

i want to create a workflow in tailwind and need the description:

task: add another language

- step 1: get the <new-locale>, official acronym of the language, e.g.: de for german, en for english. dont process or think further if you dont have that. directly ask user back.

- step 2: add the <new-locale> to this file: src/features/next-intl/config/locales.ts

- step 2.a: If it does not exist yet, the <new-locale> must be added to: example: export const locales = ["en", "de", "es", "fr", "zh"] as const

-step 2.b: Add a mapping for the tailwind-class with the suitable mapping to a country code. it must be EXACTLY "icon-[flagpack--<new-locale>]"

example: export const localeFlagMap: Record<Locale, string> = { en: "icon-[flagpack--us]", de: "icon-[flagpack--de]", zh: "icon-[flagpack--cn]", fr: "icon-[flagpack--fr]", es: "icon-[flagpack--es]",

step 3: in src/features/next-intl/messages read @en.json and create a new <new-locale>.json WITH THE EXACT SAME JSON LAYOUT!
