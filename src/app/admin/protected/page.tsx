import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/features/next-auth";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("app.admin");

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {t("authenticated-as")} {session?.user?.name || "User"}
          {session?.user?.email ? ` (${session.user.email})` : null}.
        </p>
      </header>

      <div className="rounded-lg border p-6">
        <p className="mb-2 font-medium">{t("protected-page")}</p>
      </div>
    </section>
  );
}
