"use server";
import {
  getTranslations,
  getTranslations as getTranslationsGeneric,
} from "next-intl/server";
import { type ApiResponse, assertRatelimit } from "@/features/secureApi";
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent";

/**
 * Simulates an API action with a random success or failure response.
 * @returns A promise resolving to an ApiResponse object with success status and data or error message.
 */

type ActionResult = { message: string };

export async function testIntlAction(): Promise<ApiResponse<ActionResult>> {
  // Get translations for the response
  const t = await getTranslations("app.admin.test.next-intl");
  const tGeneric = await getTranslationsGeneric("generic");

  try {
    // Check rate limit before proceeding
    const rateLimitResult = await assertRatelimit("SECURE_ENDPOINTS");
    if (!rateLimitResult.success)
      return rateLimitResult as ApiResponse<ActionResult>;

    // Simulate a 50% chance of success or failure
    const isSuccess = Math.random() > 0.5;

    if (isSuccess) {
      return {
        success: true,
        data: { message: "captain picard" },
        timestamp: new Date().toISOString(),
        toastTitle: t("requests.success.title"),
        toastDescription: t("requests.success.description"),
        toastType: "success",
      };
    }
    return {
      success: false,
      toastTitle: t("requests.notfound.title"),
      toastDescription: t("requests.notfound.description"),
      toastType: "error",
    };
  } catch (error) {
    return unexpectedErrorToastContent(tGeneric, "ERROR-234234");
  }
}
