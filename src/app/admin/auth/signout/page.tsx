"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SignOutButton } from "@/features/next-auth/index.client"

export default function SignOutPage() {
   const searchParams = useSearchParams()
   const router = useRouter()
   const callbackUrl = searchParams.get("callbackUrl") || "/"

   return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4">
         <p className="text-sm text-muted-foreground">Sign out from this device?</p>
         <div className="flex gap-3">
            <SignOutButton callbackUrl={callbackUrl} />
            <button className="underline text-sm" onClick={() => router.back()}>
               Cancel
            </button>
         </div>
      </main>
   )
}
