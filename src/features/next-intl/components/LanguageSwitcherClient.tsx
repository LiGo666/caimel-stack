"use client"

import dynamic from "next/dynamic"

// Dynamically import LanguageSwitcher with no SSR to prevent hydration issues
const LanguageSwitcher = dynamic(() => import("./LanguageSwitcher").then((mod) => ({ default: mod.LanguageSwitcher })), {
   ssr: false,
   loading: () => (
      <button className="px-3 py-1 rounded border flex items-center gap-2">
         <span className="w-4 h-4 bg-gray-200 rounded animate-pulse"></span>
      </button>
   ),
})

export { LanguageSwitcher as LanguageSwitcherClient }
