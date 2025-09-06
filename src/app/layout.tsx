import "./global.css"
import { AppProviders } from "@/app/providers"
import { cookies } from "next/headers"
import type { CSSProperties } from "react"
import * as React from "react"
import { getLocale, getMessages } from "next-intl/server"
import { LanguageSwitcher } from "@/features/next-intl/index.client"
import { ThemeToggle } from "@/features/shadcn"
import { Card, Button } from "@/features/shadcn"
import { Skeleton } from "@/features/shadcn/components/ui/skeleton"

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

export default async function RootLayout({ children }: { children: React.ReactNode }) {
   const cookieStore = await cookies()
   const themeCookie = cookieStore.get("theme")?.value
   const ssrTheme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined
   const noFlash = `(() => { try { var m=document.cookie.match(/(?:^| )theme=(light|dark)(?:;|$)/); var t=m?m[1]:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); var h=document.documentElement; if(!h.classList.contains(t)) h.classList.add(t); h.style.colorScheme=t; } catch(_) {} })();`
   const locale = await getLocale()
   const messages = await getMessages()
   return (
      <html lang={locale} className={ssrTheme} style={ssrTheme ? ({ colorScheme: ssrTheme } as CSSProperties) : undefined} suppressHydrationWarning>
         <head>
            {/* Set theme class before React hydrates on first visit (no cookie yet) */}
            <script dangerouslySetInnerHTML={{ __html: noFlash }} />
         </head>
         <body>
            <AppProviders locale={locale} messages={messages}>
               <main className="flex flex-col min-h-screen">
                  <header className="p-4 flex justify-end items-center gap-4">
                     <Card className="shadow-xl flex flex-row items-center gap-2 w-fit py-1 px-4">
                        <React.Suspense fallback={<Skeleton className="w-8 h-8 rounded-sm" />}>
                           <LanguageSwitcher />
                        </React.Suspense>
                        <React.Suspense fallback={<Skeleton className="w-8 h-8 rounded-full" />}>
                           <ThemeToggle />
                        </React.Suspense>
                        <React.Suspense fallback={<Skeleton className="w-8 h-8 rounded-full" />}>
                           <SignedOut>
                              <SignInButton>
                                 <Button size="sm" variant="ghost" className="select-none">
                                    Sign In
                                 </Button>
                              </SignInButton>
                              <SignUpButton>
                                 <Button size="sm" className="select-none">
                                    Sign Up
                                 </Button>
                              </SignUpButton>
                           </SignedOut>
                           <SignedIn>
                              <UserButton />
                           </SignedIn>
                        </React.Suspense>
                     </Card>
                  </header>
                  <div className="flex-grow">{children}</div>
               </main>
            </AppProviders>
         </body>
      </html>
   )
}
