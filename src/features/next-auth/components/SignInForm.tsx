"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/features/shadcn/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/features/shadcn/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/features/shadcn/components/ui/form"
import { Input } from "@/features/shadcn/components/ui/input"
import { toast } from "@/features/toast/index.client"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { unexpectedErrorToastContent } from "@/features/toast/index.client"
import { toastify } from "@/features/toast/index.client"

export function SignInForm() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const callbackUrl = searchParams.get("callbackUrl") || "/"
   const error = searchParams.get("error")
   const t = useTranslations("features.next-auth")
   const genericT = useTranslations("generic")

   const credentialsSchema = z.object({
      username: z.string().min(1, t("validation.errors.usernameRequired")),
      password: z.string().min(1, t("validation.errors.passwordRequired")),
   })

   const form = useForm({ resolver: zodResolver(credentialsSchema), defaultValues: { username: "", password: "" }, mode: "onSubmit" })

   const [loading, setLoading] = React.useState(false)
   const [submitError, setSubmitError] = React.useState<string | null>(null)

   const onSubmit = async (values: z.infer<typeof credentialsSchema>) => {
      setLoading(true)
      setSubmitError(null)
      try {
         const res = await signIn("credentials", { username: values.username, password: values.password, callbackUrl, redirect: false })
         // Handle errors without leaving the page
         if (res?.error) {
            toast.Error(t("sign-in-failed"), { description: t("errors.credentialsSignin") })
            setLoading(false)
            return
         }

         // On success, prefer hard navigation to avoid stale client/router state
         if (res?.url) {
            if (typeof window !== "undefined") {
               window.location.assign(res.url)
               return
            }
            router.replace(res.url)
            router.refresh()
            return
         }
         toast.Success(t("sign-in-successful"), { description: t("sign-in-successful-description") })
      } catch (e: any) {
         toastify(unexpectedErrorToastContent(genericT, "ERROR-342534"))
      }
      setLoading(false)
   }

   return (
      <div className="mx-auto w-full max-w-sm p-4">
         <Card className="shadow-2xl shadow-black/80">
            <CardHeader>
               <CardTitle className="text-xl font-bold">{t("sign-in")}</CardTitle>
               <CardDescription>{t("sign-in-description")}</CardDescription>
            </CardHeader>
            <CardContent>
               {error ? (
                  <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">
                     {error === "CredentialsSignin" ? "Invalid username or password" : error}
                  </div>
               ) : null}
               {submitError ? <div className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-700">{submitError}</div> : null}

               <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("username")}</FormLabel>
                              <FormControl>
                                 <Input placeholder={t("username")} autoComplete={t("username")} {...field} />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />

                     <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("password")}</FormLabel>
                              <FormControl>
                                 <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />

                     <Button type="submit" disabled={loading} className="w-full">
                        {loading ? t("signing-in") : t("sign-in")}
                     </Button>
                  </form>
               </Form>
            </CardContent>
            <CardFooter>
               <p className="text-xs text-muted-foreground">
                  <Link href="/auth/signup" className="text-blue-500 hover:underline">
                     {t("register-here")}
                  </Link>
               </p>
            </CardFooter>
         </Card>
      </div>
   )
}
