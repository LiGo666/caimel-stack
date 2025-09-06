import "server-only"
import { getRequestConfig } from "next-intl/server"
import { Formats } from "next-intl"
import { cookies, headers } from "next/headers"
import { Locale } from "../config/locales"

import { locales, defaultLocale } from "../config/locales"

export default getRequestConfig(async () => {
   // Fetch locale from cookies or headers
   let locale: Locale = defaultLocale
   const cookieStore = await cookies()
   const localeCookie = cookieStore.get("NEXT_LOCALE")?.value as Locale | undefined
   if (localeCookie && locales.includes(localeCookie)) {
      locale = localeCookie
   } else {
      const acceptLanguage = (await headers()).get("accept-language") || ""
      const preferredLocale = acceptLanguage
         .split(",")
         .map((lang) => lang.split(";")[0])
         .find((lang) => locales.includes(lang as Locale)) as Locale | undefined
      if (preferredLocale) {
         locale = preferredLocale
      }
   }
   return { locale, messages: (await import(`@/repository/next-intl/messages/${locale}.json`)).default }
})

export const formats: Partial<Formats> = { dateTime: { short: { day: "numeric", month: "short", year: "numeric" } } }
