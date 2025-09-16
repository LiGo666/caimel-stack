import "./global.css";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";
import type { CSSProperties } from "react";
import * as React from "react";
import { AppProviders } from "@/app/providers";
import { LanguageSwitcher } from "@/features/next-intl/index.client";
import {
  Button,
  Card,
  Skeleton,
  ThemeToggle,
} from "@/features/shadcn/index.client";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const ssrTheme =
    themeCookie === "dark" || themeCookie === "light" ? themeCookie : undefined;
  const noFlash = `(() => { try { var m=document.cookie.match(/(?:^| )theme=(light|dark)(?:;|$)/); var t=m?m[1]:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); var h=document.documentElement; if(!h.classList.contains(t)) h.classList.add(t); h.style.colorScheme=t; } catch(_) {} })();`;
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      className={ssrTheme}
      lang={locale}
      style={
        ssrTheme ? ({ colorScheme: ssrTheme } as CSSProperties) : undefined
      }
      suppressHydrationWarning
    >
      <head>
        {/* Set theme class before React hydrates on first visit (no cookie yet) */}
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <AppProviders locale={locale} messages={messages}>
          <main className="flex min-h-screen flex-col">
            <header className="flex items-center justify-end gap-4 p-4">
              <Card className="flex w-fit flex-row items-center gap-2 px-4 py-1 shadow-xl">
                <React.Suspense
                  fallback={<Skeleton className="h-8 w-8 rounded-sm" />}
                >
                  <LanguageSwitcher />
                </React.Suspense>
                <React.Suspense
                  fallback={<Skeleton className="h-8 w-8 rounded-full" />}
                >
                  <ThemeToggle />
                </React.Suspense>
                <React.Suspense
                  fallback={<Skeleton className="h-8 w-8 rounded-full" />}
                >
                  <SignedOut>
                    <SignInButton>
                      <Button className="select-none" size="sm" variant="ghost">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton>
                      <Button className="select-none" size="sm">
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
  );
}
