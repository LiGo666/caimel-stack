import { Metadata } from "next"
import { SignInForm } from "@/features/next-auth/index.client"

export const metadata: Metadata = { title: "Sign in" }

export default function SignInPage() {
   return (
      <main className="flex min-h-[70vh] items-center justify-center p-4">
         <SignInForm />
      </main>
   )
}
