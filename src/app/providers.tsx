"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import type * as React from "react";
import type { Locale } from "@/features/next-intl";
import { Toaster } from "@/features/shadcn/index.client";

const timeZone = "Europe/Berlin";

export function AppProviders({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale?: Locale;
  messages?: Record<string, string | Record<string, string>>;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={timeZone}
    >
      <ClerkProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </ClerkProvider>
    </NextIntlClientProvider>
  );
}
