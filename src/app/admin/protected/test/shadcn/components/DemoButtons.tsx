"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, Button, Separator } from "@/features/shadcn/index.client";

export default function DemoButtons() {
  const t = useTranslations("app.admin.test.shadcn.components.buttons");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <Badge variant="secondary">shadcn/ui</Badge>
      </div>
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <p className="font-medium text-sm">{t("variants")}</p>
          <div className="flex flex-wrap gap-2">
            <Button>{t("default")}</Button>
            <Button variant="secondary">{t("secondary")}</Button>
            <Button variant="destructive">{t("destructive")}</Button>
            <Button variant="outline">{t("outline")}</Button>
            <Button variant="ghost">{t("ghost")}</Button>
            <Button variant="link">{t("link")}</Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-sm">{t("sizes")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">{t("small")}</Button>
            <Button>{t("default")}</Button>
            <Button size="lg">{t("large")}</Button>
            <Button aria-label="Add" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-sm">{t("states")}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled>{t("disabled")}</Button>
            <Button>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("loading")}
            </Button>
            <Button disabled variant="outline">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("loading")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
