import { getLocale, getTranslations } from "next-intl/server";
import { TestIntlComponent } from "./component";
import DemoButtons from "./components/DemoButtons";
import DemoDialog from "./components/DemoDialog";
import DemoForm from "./components/DemoForm";
import DemoHeader from "./components/DemoHeader";
import DemoTable from "./components/DemoTable";
import DemoTabs from "./components/DemoTabs";

// Ensure this route handles POSTs for Server Actions and is not prerendered
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TestPage() {
  const locale = await getLocale();
  const t = await getTranslations("app.admin.test.shadcn");

  return (
    <div
      className="min-h-dvh"
      dir={
        (locale as "ar" | "he" | "yi") === "ar" ||
        (locale as "ar" | "he" | "yi") === "he" ||
        (locale as "ar" | "he" | "yi") === "yi"
          ? "rtl"
          : "ltr"
      }
    >
      <DemoHeader />
      <main className="container mx-auto space-y-8 px-4 py-6">
        <section className="flex flex-col items-start gap-4">
          <h1 className="font-bold text-2xl">{t("header")}</h1>
          <div className="mt-4 flex items-center gap-2" />
          <div className="flex w-full max-w-3xl flex-col items-start gap-2">
            <h2 className="font-semibold text-xl">{t("title")}</h2>
            <p className="font-medium text-base text-muted-foreground leading-relaxed">
              {t("descriptive-text")}
            </p>
          </div>
        </section>
        <section>
          <TestIntlComponent />
        </section>
        <section>
          <DemoButtons />
        </section>

        <section>
          <DemoForm />
        </section>

        <section>
          <DemoDialog />
        </section>

        <section>
          <DemoTabs />
        </section>

        <section>
          <DemoTable />
        </section>
      </main>
    </div>
  );
}
