"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toastify } from "@/features/toast/index.client";
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent";
import { testIntlAction } from "./action";

export function TestIntlComponent() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const t = useTranslations("app.admin.test.next-intl");

  const handleTestAction = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await testIntlAction();
      if (response.success) {
        setSuccess(true);
        toastify(response);
      } else {
        setError(response.toastDescription || t("request.notfound.title"));
        toastify(response);
      }
    } catch (err) {
      toastify(unexpectedErrorToastContent(t, "ERROR-234235"));
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-center font-bold text-2xl">{t("subTitle")}</h2>
      <div className="my-4 flex justify-center" />
      <button
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        onClick={handleTestAction}
      >
        {loading ? t("loading") : t("perform-test")}
      </button>
    </div>
  );
}
