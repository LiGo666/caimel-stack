"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import {
   Button,
   Card,
   CardHeader,
   CardTitle,
   CardDescription,
   CardContent,
   CardFooter,
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
   Input,
} from "@/features/shadcn/index.client"

import { toastify } from "@/features/toast/index.client"
import { useTranslations } from "next-intl"
import { unexpectedErrorToastContent } from "@/features/toast/index.client"
import Link from "next/link"
import { registerUser } from "../actions/registerUser"
import { passwordMinChars } from "../config/credentials"

export function RegisterForm() {
   const router = useRouter()
   const t = useTranslations("features.next-auth.components")
   const genericT = useTranslations("generic")

   const registrationFormSchema = z
      .object({
         name: z.string().min(1, t ? t("validation.errors.nameRequired") : "Name is required"),
         email: z.email(t("validation.errors.emailInvalid")),
         password: z.string().min(passwordMinChars, t("validation.errors.passwordMin", { min: passwordMinChars })),
         confirmPassword: z.string().min(1, t("validation.errors.confirmPasswordRequired")),
      })
      .refine((data) => data.password === data.confirmPassword, { message: t("validation.errors.passwordsNotMatch"), path: ["confirmPassword"] })

   const form = useForm({
      resolver: zodResolver(registrationFormSchema),
      defaultValues: { email: "", name: "", password: "", confirmPassword: "" },
      mode: "onBlur",
   })

   const [isLoading, setIsLoading] = React.useState(false)
   const isValid = form.formState.isValid

   const finish = React.useCallback(() => {
      setIsLoading(false)
   }, [])

   const sendData = React.useCallback(
      async (payload) => {
         try {
            const result = await registerUser(payload)
            if (result?.success) {
               toastify(result)
               router.push("/admin")
            } else {
               toastify(result)
            }
         } catch (err) {
            console.error("Registration error:", err)
            toastify(unexpectedErrorToastContent(genericT, "ERROR-643555"))
         } finally {
            finish()
         }
      },
      [router, finish, genericT],
   )

   const onSubmit = (data) => {
      if (isLoading) return
      setIsLoading(true)
      void sendData({ email: data.email, name: data.name, password: data.password })
   }

   return (
      <div className="mx-auto w-full max-w-sm p-4">
         <Card className="shadow-2xl">
            <CardHeader>
               <CardTitle>{t("register")}</CardTitle>
               <CardDescription>{t("register-description")}</CardDescription>
            </CardHeader>
            <CardContent>
               <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" dir="auto" noValidate>
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("components.RegisterForm.form.email.label")}</FormLabel>
                              <FormControl>
                                 <Input
                                    type="email"
                                    autoComplete="email"
                                    placeholder={t("components.RegisterForm.form.email.placeholder")}
                                    {...field}
                                    onBlur={() => form.trigger("email")}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />

                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("components.RegisterForm.form.name.label")}</FormLabel>
                              <FormControl>
                                 <Input
                                    autoComplete="name"
                                    placeholder={t("components.RegisterForm.form.name.placeholder")}
                                    {...field}
                                    onBlur={() => form.trigger("name")}
                                 />
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
                              <FormLabel>{t("components.RegisterForm.form.password.label")}</FormLabel>
                              <FormControl>
                                 <Input
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder={t("components.RegisterForm.form.password.placeholder")}
                                    {...field}
                                    onBlur={() => form.trigger("password")}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />

                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("components.RegisterForm.form.confirmPassword.label")}</FormLabel>
                              <FormControl>
                                 <Input
                                    type="password"
                                    autoComplete="new-password"
                                    placeholder={t("components.RegisterForm.form.password.placeholder")}
                                    {...field}
                                    onBlur={() => form.trigger("confirmPassword")}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />

                     <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
                        {isLoading ? t("components.RegisterForm.loading") : t("components.RegisterForm.submit")}
                     </Button>
                  </form>
               </Form>
            </CardContent>
            <CardFooter>
               <p className="text-xs text-muted-foreground">
                  <Link href="/auth/signin" className="text-blue-500 hover:underline">
                     {t("sign-in-here")}
                  </Link>
               </p>
            </CardFooter>
         </Card>
      </div>
   )
}
