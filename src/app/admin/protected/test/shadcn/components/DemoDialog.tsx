"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
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
} from "@/features/shadcn/index.client";

export default function DemoDialog() {
  const t = useTranslations("app.admin.test.shadcn.components.dialog");
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
      </div>
      <Separator />
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <Button>{t("open")}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>{t("confirmDescription")}</DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">{t("content")}</p>
          <DialogFooter>
            <Button onClick={() => setOpen(false)} variant="outline">
              {t("cancel")}
            </Button>
            <Button onClick={() => setOpen(false)}>{t("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
