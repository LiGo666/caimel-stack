"use client";

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { SignOutButton } from "@/features/next-auth/index.client";

export default function SignOutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
      <p className="text-muted-foreground text-sm">
        Sign out from this device?
      </p>
      <div className="flex gap-3">
        <SignOutButton callbackUrl={callbackUrl} />
        <button className="text-sm underline" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </main>
  );
}
