"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/shadcn/index.client";
import { switchLocale } from "../actions/switchLocale";
import { localeFlagMap, locales } from "../config/locales";

/**
 * LanguageSwitcher component that allows users to switch between supported locales.
 * Displays the current locale's flag as a trigger and provides a dropdown with all available languages.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("features.next-intl");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded border px-3 py-1">
          <span
            className={`${localeFlagMap[locale]}`}
            title={locale.toUpperCase()}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-md p-2">
        <DropdownMenuLabel>{t("select-language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-3 gap-1">
          {locales.map((loc) => (
            <form action={switchLocale} className="w-full" key={loc}>
              <input name="locale" type="hidden" value={loc} />
              <DropdownMenuItem asChild>
                <button
                  className="flex w-full cursor-pointer items-center justify-center gap-1 px-2 py-1 transition-colors hover:bg-muted/50"
                  disabled={locale === loc}
                  type="submit"
                >
                  <span
                    className={`${localeFlagMap[loc]}`}
                    title={loc.toUpperCase()}
                  />
                  <span className="text-xs">{loc.toUpperCase()}</span>
                </button>
              </DropdownMenuItem>
            </form>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
