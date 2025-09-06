import { ApiResponse } from "@/features/secureApi"
import { ErrorCode } from "@/features/logging/index.client"

export const unexpectedErrorToastContent = (t: (key: string) => string, errorCode: ErrorCode): ApiResponse<any> => {
   return {
      success: false,
      errorCode: errorCode,
      timestamp: new Date().toISOString(),
      toastTitle: t("sorry"),
      toastDescription: t("errorDescription"),
      toastType: "error",
   }
}
