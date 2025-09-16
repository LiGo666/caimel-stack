import type { locales } from "../config/locales";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
  }
}
