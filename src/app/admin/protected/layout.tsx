import { ReactNode } from "react"
import { headers } from "next/headers"
import { getTranslations } from "next-intl/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/features/next-auth"
import { SignOutButton } from "@/features/next-auth/index.client"
import { redirect } from "next/navigation"
import { Card } from "@/features/shadcn/components/ui/card"
import { Skeleton } from "@/features/shadcn/components/ui/skeleton"
import * as React from "react"

export default async function AdminLayout({ children }: { children: ReactNode }) {
   const session = await getServerSession(authOptions)

   if (!session) {
      redirect("/admin/auth/signin")
   }

   const hdrs = await headers()

   // Try to reconstruct the current path for accurate post-login redirect. Fall back to "/admin" if unavailable.
   const currentPath = hdrs.get("x-forwarded-uri") || hdrs.get("x-invoke-path") || hdrs.get("x-matched-path") || "/admin"

   const t = await getTranslations("app.admin")

   return (
      <div className="min-h-screen">
         <header className="p-4 flex justify-end items-center gap-4">
            <Card className="shadow-xl flex flex-row items-center gap-2 w-fit py-1 px-4">
               <React.Suspense fallback={<Skeleton className="w-8 h-8 rounded-sm" />}>
                  <span className="font-bold">{t("header")}</span>
                  <SignOutButton />
               </React.Suspense>
            </Card>
         </header>
         <div>{children}</div>
      </div>
   )
}
