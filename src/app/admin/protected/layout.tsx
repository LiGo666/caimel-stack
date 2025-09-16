import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import * as React from "react";
import { authOptions } from "@/features/next-auth";
import { SignOutButton } from "@/features/next-auth/index.client";
import { Card, Skeleton } from "@/features/shadcn/index.client";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/auth/signin");
  }

  const hdrs = await headers();

  // Try to reconstruct the current path for accurate post-login redirect. Fall back to "/admin" if unavailable.
  const currentPath =
    hdrs.get("x-forwarded-uri") ||
    hdrs.get("x-invoke-path") ||
    hdrs.get("x-matched-path") ||
    "/admin";

  const t = await getTranslations("app.admin");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-end gap-4 p-4">
        <Card className="flex w-fit flex-row items-center gap-2 px-4 py-1 shadow-xl">
          <React.Suspense
            fallback={<Skeleton className="h-8 w-8 rounded-sm" />}
          >
            <span className="font-bold">{t("header")}</span>
            <SignOutButton />
          </React.Suspense>
        </Card>
      </header>
      <div>{children}</div>
    </div>
  );
}
