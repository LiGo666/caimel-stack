import { getServerSession } from "next-auth"
import { authOptions } from "@/features/next-auth"
import { getTranslations } from "next-intl/server"

export default async function AdminPage() {
   const session = await getServerSession(authOptions)
   const t = await getTranslations("app.admin")

   return (
      <section className="mx-auto max-w-3xl p-8 space-y-6">
         <header className="space-y-1">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
               {t("authenticated-as")} {session?.user?.name || "User"}
               {session?.user?.email ? ` (${session.user.email})` : null}.
            </p>
         </header>

         <div className="rounded-lg border p-6">
            <p className="mb-2 font-medium">{t("protected-page")}</p>
         </div>
      </section>
   )
}
