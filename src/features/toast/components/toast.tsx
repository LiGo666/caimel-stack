import { type ExternalToast, toast as originalToast } from "sonner";
import type { ToastProps } from "../types/toast";

// Wrapper around sonner toast with default position set to bottom-middle
export const toast = {
  Success: (title: string, options: ExternalToast = {}) => {
    return originalToast.success(title, {
      ...options,
      position: "bottom-center",
    });
  },
  Error: (title: string, options: ExternalToast = {}) => {
    // Error toasts stay until dismissed
    return originalToast.error(title, {
      ...options,
      position: "bottom-center",
      duration: Number.POSITIVE_INFINITY, // Stay until dismissed
      dismissible: true, // Can be dismissed by clicking
    });
  },
  Info: (title: string, options: ExternalToast = {}) => {
    return originalToast.info(title, { ...options, position: "bottom-center" });
  },
  Warning: (title: string, options: ExternalToast = {}) => {
    // Warning toasts stay until dismissed
    return originalToast.warning(title, {
      ...options,
      position: "bottom-center",
      duration: Number.POSITIVE_INFINITY, // Stay until dismissed
      dismissible: true, // Can be dismissed by clicking
    });
  },
  Default: (title: string, options: ExternalToast = {}) => {
    return originalToast(title, { ...options, position: "bottom-center" });
  },
};

/**
 * Displays a toast based on the API response type
 * @param result - The API response object with toastTitle, toastDescription, and toastType
 */
export function toastify(
  result: Partial<ToastProps> & { errorCode?: string }
): void {
  if (result.errorCode) {
    console.log("An error occured, error Code:", result.errorCode);
  }

  if (!(result.toastTitle && result.toastDescription && result.toastType)) {
    return;
  }

  switch (result.toastType) {
    case "success":
      toast.Success(result.toastTitle, {
        description: result.toastDescription,
      });
      break;
    case "error":
      toast.Error(result.toastTitle, { description: result.toastDescription });
      break;
    case "warning":
      toast.Warning(result.toastTitle, {
        description: result.toastDescription,
      });
      break;
    case "info":
      toast.Info(result.toastTitle, { description: result.toastDescription });
      break;
    default:
      toast.Default(result.toastTitle, {
        description: result.toastDescription,
      });
  }
}
