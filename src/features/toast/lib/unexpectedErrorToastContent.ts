import type { ErrorCode } from "@/features/logging/index.client";
import type { ApiResponse } from "@/features/secureApi";

export const unexpectedErrorToastContent = (
  t: (key: string) => string,
  errorCode: ErrorCode
): ApiResponse<any> => {
  return {
    success: false,
    errorCode,
    timestamp: new Date().toISOString(),
    toastTitle: t("sorry"),
    toastDescription: t("errorDescription"),
    toastType: "error",
  };
};
