export type ToastType = "success" | "error" | "warning" | "info";

export type ToastProps = {
  toastTitle: string;
  toastDescription: string;
  toastType: ToastType;
};
