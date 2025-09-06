"use client"

import { useState } from "react"
import { testIntlAction } from "./action"
import { toastify } from "@/features/toast/index.client"
import { useTranslations } from "next-intl"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"

export function TestIntlComponent() {
   const [error, setError] = useState<string | null>(null)
   const [success, setSuccess] = useState<boolean>(false)
   const [loading, setLoading] = useState(false)

   const t = useTranslations("app.admin.test.next-intl")

   const handleTestAction = async () => {
      setLoading(true)
      setError(null)
      setSuccess(false)
      try {
         const response = await testIntlAction()
         if (response.success) {
            setSuccess(true)
            toastify(response)
         } else {
            setError(response.toastDescription || t("request.notfound.title"))
            toastify(response)
         }
      } catch (err) {
         toastify(unexpectedErrorToastContent(t, "ERROR-234235"))
         setError(err instanceof Error ? err.message : String(err))
      } finally {
         setLoading(false)
      }
   }

   return (
      <div className="space-y-4 max-w-lg mx-auto">
         <h2 className="text-2xl font-bold text-center">{t("subTitle")}</h2>
         <div className="flex justify-center my-4"></div>
         <button
            onClick={handleTestAction}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
         >
            {loading ? t("loading") : t("perform-test")}
         </button>
      </div>
   )
}
