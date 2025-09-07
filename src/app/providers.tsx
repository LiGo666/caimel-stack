"use client"
import * as React from "react"
import { ThemeProvider } from "next-themes"
import { ClerkProvider } from "@clerk/nextjs"
import { Toaster } from "@/features/shadcn/index.client"
import { NextIntlClientProvider } from "next-intl"
import { Locale } from "@/features/next-intl"

const timeZone = "Europe/Berlin"

export function AppProviders({
   children,
   locale,
   messages,
}: {
   children: React.ReactNode
   locale?: Locale
   messages?: Record<string, string | Record<string, string>>
}) {
   return (
      <NextIntlClientProvider timeZone={timeZone} locale={locale} messages={messages}>
         <ClerkProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
               {children}
               <Toaster />
            </ThemeProvider>
         </ClerkProvider>
      </NextIntlClientProvider>
   )
}
