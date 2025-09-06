"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
   Button,
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
   Separator,
} from "@/features/shadcn"

export default function DemoDialog() {
   const t = useTranslations("app.admin.test.shadcn.components.dialog")
   const [open, setOpen] = useState(false)
   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
         </div>
         <Separator />
         <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
               <Button>{t("open")}</Button>
            </DialogTrigger>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>{t("confirmTitle")}</DialogTitle>
                  <DialogDescription>{t("confirmDescription")}</DialogDescription>
               </DialogHeader>
               <p className="text-sm text-muted-foreground">{t("content")}</p>
               <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                     {t("cancel")}
                  </Button>
                  <Button onClick={() => setOpen(false)}>{t("confirm")}</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   )
}
