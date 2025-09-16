"use client";

import dynamic from "next/dynamic";

// Dynamically import LanguageSwitcher with no SSR to prevent hydration issues
const LanguageSwitcher = dynamic(
  () =>
    import("./LanguageSwitcher").then((mod) => ({
      default: mod.LanguageSwitcher,
    })),
  {
    ssr: false,
    loading: () => (
      <button className="flex items-center gap-2 rounded border px-3 py-1">
        <span className="h-4 w-4 animate-pulse rounded bg-gray-200" />
      </button>
    ),
  }
);

export { LanguageSwitcher as LanguageSwitcherClient };
