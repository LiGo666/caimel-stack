import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RedisCrud } from "@/features/redis/index.client";

// Ensure this route handles POSTs for Server Actions and is not prerendered
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TestPage() {
  const t = await getTranslations("HomePage");
  const locale = await getLocale();

  async function switchLocale(formData: FormData) {
    "use server";
    const next = formData.get("locale");
    if (next === "en" || next === "de") {
      const cookieStore = await cookies();
      cookieStore.set("NEXT_LOCALE", String(next), { path: "/" });
    }
    redirect("/admin/test");
  }

  return (
    <div className="min-h-dvh">
      <main className="container mx-auto space-y-8 px-4 py-6">
        <section className="flex items-center justify-between">
          <h1 className="font-bold text-2xl">shadcn/ui Demo</h1>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-xl">Redis CRUD</h2>
          <RedisCrud />
        </section>
      </main>
    </div>
  );
}
