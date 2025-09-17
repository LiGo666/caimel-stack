import { ToastProvider } from "@features/toast/providers/ToastProvider";
import type { ReactNode } from "react";

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
