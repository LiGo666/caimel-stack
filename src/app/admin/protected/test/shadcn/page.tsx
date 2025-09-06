import DemoHeader from "./components/DemoHeader"
import DemoButtons from "./components/DemoButtons"
import DemoForm from "./components/DemoForm"
import DemoDialog from "./components/DemoDialog"
import DemoTabs from "./components/DemoTabs"
import DemoTable from "./components/DemoTable"
import { getLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { TestIntlComponent } from "./component"

// Ensure this route handles POSTs for Server Actions and is not prerendered
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function TestPage() {
   const locale = await getLocale()
   const t = await getTranslations("app.admin.test.shadcn")

   return (
      <div
         className="min-h-dvh"
         dir={
            (locale as "ar" | "he" | "yi") === "ar" || (locale as "ar" | "he" | "yi") === "he" || (locale as "ar" | "he" | "yi") === "yi"
               ? "rtl"
               : "ltr"
         }
      >
         <DemoHeader />
         <main className="container mx-auto px-4 py-6 space-y-8">
            <section className="flex flex-col gap-4 items-start">
               <h1 className="text-2xl font-bold">{t("header")}</h1>
               <div className="flex items-center gap-2 mt-4"></div>
               <div className="flex flex-col gap-2 items-start w-full max-w-3xl">
                  <h2 className="text-xl font-semibold">{t("title")}</h2>
                  <p className="text-base text-muted-foreground font-medium leading-relaxed">{t("descriptive-text")}</p>
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
   )
}
