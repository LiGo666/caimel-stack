import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  description?: string;
  duration?: number;
  dismissible?: boolean;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  action?: {
    label: string;
    onClick: () => void;
  };
  retryAfter?: number;
}

export function useToast() {
  const toast = (title: string, options?: ToastOptions) => {
    return sonnerToast(title, options);
  };

  toast.success = (title: string, options?: ToastOptions) => {
    return sonnerToast.success(title, options);
  };

  toast.error = (title: string, options?: ToastOptions) => {
    return sonnerToast.error(title, {
      duration: options?.duration ?? Number.POSITIVE_INFINITY, // Errors stay until dismissed by default
      dismissible: options?.dismissible ?? true,
      ...options,
    });
  };

  toast.warning = (title: string, options?: ToastOptions) => {
    return sonnerToast.warning(title, {
      duration: options?.duration ?? Number.POSITIVE_INFINITY, // Warnings stay until dismissed by default
      dismissible: options?.dismissible ?? true,
      ...options,
    });
  };

  toast.info = (title: string, options?: ToastOptions) => {
    return sonnerToast.info(title, options);
  };

  toast.dismiss = (toastId?: string) => {
    return sonnerToast.dismiss(toastId);
  };

  toast.rateLimit = (retryAfter?: number) => {
    const seconds = retryAfter || 60;
    const formattedTime = seconds >= 60 
      ? `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) !== 1 ? 's' : ''}` 
      : `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    return sonnerToast.error("Rate limit exceeded", {
      description: `Please try again after ${formattedTime}.`,
      duration: 8000,
      dismissible: true,
      action: retryAfter ? {
        label: "Dismiss",
        onClick: () => sonnerToast.dismiss()
      } : undefined
    });
  };

  return toast;
}
