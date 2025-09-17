"use client";

import { Toaster } from "@features/shadcn/components/ui/sonner";
import { createContext } from "react";
import { useHttpErrorHandler as useHttpErrorHandlerHook } from "../hooks/useHttpErrorHandler";

// Create a context to handle HTTP errors
type HttpErrorContextType = {
  handleHttpError: (error: unknown) => boolean;
};

const HttpErrorContext = createContext<HttpErrorContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Use our custom hook for HTTP error detection
  const { handleHttpError } = useHttpErrorHandlerHook();

  return (
    <HttpErrorContext.Provider value={{ handleHttpError }}>
      {children}
      <Toaster />
    </HttpErrorContext.Provider>
  );
}
