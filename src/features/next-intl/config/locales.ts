export const locales = ["en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Mapping between locales and country flag codes for Iconify circle-flags collection
export const localeFlagMap: Record<Locale, string> = {
  en: "icon-[flagpack--us]",
  de: "icon-[flagpack--de]",
};

// Check for locale map and JSON file existence only in development mode to avoid runtime performance impact

if (process.env.NODE_ENV === "development") {
  locales.forEach((locale) => {
    if (!localeFlagMap[locale]) {
      throw new Error(`Missing flag for locale ${locale}`);
    }

    try {
      require(`@/repository/next-intl/messages/${locale}.json`);
    } catch (error) {
      throw new Error(`Warning: Missing translation file for locale ${locale}`);
    }
  });
}
