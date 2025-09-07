"use client"

import { useLocale, useTranslations } from "next-intl"
import { switchLocale } from "../actions/switchLocale"
import { locales, localeFlagMap } from "../config/locales"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/features/shadcn/index.client"

/**
 * LanguageSwitcher component that allows users to switch between supported locales.
 * Displays the current locale's flag as a trigger and provides a dropdown with all available languages.
 */
export function LanguageSwitcher() {
   const locale = useLocale()
   const t = useTranslations("features.next-intl")

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <button className="px-3 py-1 rounded border flex items-center gap-2">
               <span className={`${localeFlagMap[locale]}`} title={locale.toUpperCase()}></span>
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent className="p-2 max-w-md">
            <DropdownMenuLabel>{t("select-language")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="grid grid-cols-3 gap-1">
               {locales.map((loc) => (
                  <form key={loc} action={switchLocale} className="w-full">
                     <input type="hidden" name="locale" value={loc} />
                     <DropdownMenuItem asChild>
                        <button
                           type="submit"
                           disabled={locale === loc}
                           className="w-full px-2 py-1 flex items-center justify-center gap-1 hover:bg-muted/50 transition-colors cursor-pointer"
                        >
                           <span className={`${localeFlagMap[loc]}`} title={loc.toUpperCase()}></span>
                           <span className="text-xs">{loc.toUpperCase()}</span>
                        </button>
                     </DropdownMenuItem>
                  </form>
               ))}
            </div>
         </DropdownMenuContent>
      </DropdownMenu>
   )
}
