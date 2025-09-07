"use client"

import * as React from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/features/shadcn/index.client"
import { useTranslations } from "next-intl"

export interface SignOutButtonProps {
   callbackUrl?: string
}

export function SignOutButton({ callbackUrl = "/" }: SignOutButtonProps) {
   const t = useTranslations("features.next-auth")

   const router = useRouter()
   const [loading, setLoading] = React.useState(false)

   return (
      <Button
         variant="secondary"
         disabled={loading}
         onClick={async () => {
            setLoading(true)
            const res = await signOut({ callbackUrl, redirect: false })
            // NextAuth returns void for signOut in some versions; ensure navigation regardless
            router.replace("/")
            router.refresh()
            setLoading(false)
         }}
      >
         {loading ? t("signing-out") : t("sign-out")}
      </Button>
   )
}
