"use client"

import { useTheme } from "next-themes"
import { Button } from "@/features/shadcn/index.client"
import { Moon, Sun } from "lucide-react"
import * as React from "react"

export function ThemeToggle() {
   const { theme, setTheme, resolvedTheme } = useTheme()
   const [mounted, setMounted] = React.useState(false)
   React.useEffect(() => setMounted(true), [])

   const current = (resolvedTheme ?? theme ?? "system") as "light" | "dark" | "system"
   const nextTheme = current === "light" ? "dark" : "light"

   return (
      <Button
         type="button"
         variant="ghost"
         size="icon"
         aria-label={mounted ? `Switch to ${nextTheme} mode` : "Toggle theme"}
         onClick={() => setTheme(nextTheme)}
         className="relative"
      >
         <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
         <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
         <span className="sr-only">Toggle theme</span>
         {!mounted && <span className="absolute inset-0" aria-hidden />}
      </Button>
   )
}
