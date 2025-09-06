"use server"

import { cookies } from "next/headers"
import { locales, Locale } from "../config/locales"

export async function switchLocale(formData: FormData): Promise<void> {
   const nextLocale = formData.get("locale") as string
   if (nextLocale && locales.includes(nextLocale as Locale)) {
      const cookieStore = await cookies()
      cookieStore.set("NEXT_LOCALE", nextLocale, { path: "/" })
   }
   // Do not return a value
}
