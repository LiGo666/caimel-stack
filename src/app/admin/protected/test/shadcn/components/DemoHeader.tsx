"use client";

import { Github } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, ThemeToggle } from "@/features/shadcn/index.client";

export default function DemoHeader() {
  const t = useTranslations("app.admin.test.shadcn.components.header");
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="font-semibold">{t("title")}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="hidden sm:block"
            href="https://ui.shadcn.com"
            rel="noreferrer"
            target="_blank"
          >
            <Button size="sm" variant="outline">
              {t("docs")}
            </Button>
          </a>
          <a
            href="https://github.com/shadcn/ui"
            rel="noreferrer"
            target="_blank"
          >
            <Button aria-label="GitHub" size="icon" variant="ghost">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
