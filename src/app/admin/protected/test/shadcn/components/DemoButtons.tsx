"use client"

import { Button, Separator, Badge } from "@/features/shadcn"
import { Plus, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

export default function DemoButtons() {
   const t = useTranslations("app.admin.test.shadcn.components.buttons")
   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <Badge variant="secondary">shadcn/ui</Badge>
         </div>
         <Separator />
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
               <p className="text-sm font-medium">{t("variants")}</p>
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
               <p className="text-sm font-medium">{t("sizes")}</p>
               <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">{t("small")}</Button>
                  <Button>{t("default")}</Button>
                  <Button size="lg">{t("large")}</Button>
                  <Button size="icon" aria-label="Add">
                     <Plus className="h-4 w-4" />
                  </Button>
               </div>
            </div>
            <div className="space-y-2">
               <p className="text-sm font-medium">{t("states")}</p>
               <div className="flex flex-wrap gap-2">
                  <Button disabled>{t("disabled")}</Button>
                  <Button>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     {t("loading")}
                  </Button>
                  <Button variant="outline" disabled>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     {t("loading")}
                  </Button>
               </div>
            </div>
         </div>
      </div>
   )
}
