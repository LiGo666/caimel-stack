"use client"
import z from "zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/features/shadcn"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/features/shadcn"
import { Input } from "@/features/shadcn/components/ui/input"
import { updateCurrentUserProfile } from "../actions/manageUser"
import { useTranslations } from "next-intl"
import { toastify } from "@/features/toast/index.client"
import { unexpectedErrorToastContent } from "@/features/toast/index.client"

export function ProfileForm({ userData }: { userData: any }) {
   const [isSubmitting, setIsSubmitting] = useState(false)
   const t = useTranslations("features.next-auth")
   const tProfile = useTranslations("features.next-auth.components.ProfileForm")
   const tGeneric = useTranslations("generic")

   const formSchema = z.object({ name: z.string().min(1, t("validation.errors.nameRequired")), email: z.email(t("validation.errors.emailInvalid")) })

   // Initialize the form with user data
   const form = useForm({ resolver: zodResolver(formSchema), defaultValues: { name: userData?.name || "", email: userData?.email || "" } })

   const onSubmit = async (values: z.infer<typeof formSchema>) => {
      setIsSubmitting(true)
      try {
         const result = await updateCurrentUserProfile(values)

         if (result.success) {
            toastify(result)
            window.location.reload() // Refresh the page to show updated data
         } else {
            toastify(result)
         }
      } catch (error) {
         toastify(unexpectedErrorToastContent(tGeneric, "ERROR-342537"))
      } finally {
         setIsSubmitting(false)
      }
   }

   return (
      <Form {...form}>
         <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>{tProfile("profile.name")}</FormLabel>
                        <FormControl>
                           <Input placeholder={tProfile("profile.namePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
               />

               <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>{tProfile("profile.email")}</FormLabel>
                        <FormControl>
                           <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
               />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
               {isSubmitting ? (
                  <span className="flex items-center gap-2">
                     {tProfile("profile.saving")}
                     <span className="animate-spin">⏳</span>
                  </span>
               ) : (
                  tProfile("profile.saveChanges")
               )}
            </Button>
         </form>
      </Form>
   )
}
