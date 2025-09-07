"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
   Button,
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
   Input,
   Label,
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
   Switch,
   Textarea,
   Form,
   FormControl,
   FormDescription,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
   Separator,
} from "@/features/shadcn/index.client"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

const schema = z.object({
   name: z.string().min(2, "Name is too short"),
   email: z.string().email("Invalid email"),
   role: z.enum(["user", "admin", "viewer"]),
   bio: z.string().max(160).optional(),
   updates: z.boolean(),
})

export default function DemoForm() {
   const t = useTranslations("app.admin.test.shadcn.components.form")
   const form = useForm<z.infer<typeof schema>>({
      resolver: zodResolver(schema),
      defaultValues: { name: "", email: "", role: "user", bio: "", updates: true },
      mode: "onChange",
   })

   function onSubmit(values: z.infer<typeof schema>) {
      toast.success("Saved", { description: `${values.name} (${values.role})` })
   }

   return (
      <Card>
         <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
         </CardHeader>
         <CardContent>
            <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                     <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                           <FormItem>
                              <FormLabel>{t("name")}</FormLabel>
                              <FormControl>
                                 <Input placeholder={t("namePlaceholder")} {...field} />
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
                              <FormLabel>{t("email")}</FormLabel>
                              <FormControl>
                                 <Input placeholder={t("emailPlaceholder")} type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />
                  </div>

                  <FormField
                     control={form.control}
                     name="role"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel>{t("role")}</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                 <SelectTrigger>
                                    <SelectValue placeholder={t("rolePlaceholder")} />
                                 </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                 <SelectItem value="user">{t("user")}</SelectItem>
                                 <SelectItem value="admin">{t("admin")}</SelectItem>
                                 <SelectItem value="viewer">{t("viewer")}</SelectItem>
                              </SelectContent>
                           </Select>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     control={form.control}
                     name="bio"
                     render={({ field }) => (
                        <FormItem>
                           <FormLabel>{t("bio")}</FormLabel>
                           <FormControl>
                              <Textarea placeholder={t("bioPlaceholder")} rows={3} {...field} />
                           </FormControl>
                           <FormDescription>{t("bioDescription")}</FormDescription>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     control={form.control}
                     name="updates"
                     render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                           <div className="space-y-0.5">
                              <FormLabel>{t("updates")}</FormLabel>
                              <FormDescription>{t("updatesDescription")}</FormDescription>
                           </div>
                           <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                           </FormControl>
                        </FormItem>
                     )}
                  />

                  <div className="flex justify-end gap-2">
                     <Button type="reset" variant="outline" onClick={() => form.reset()}>
                        {t("reset")}
                     </Button>
                     <Button type="submit" disabled={!form.formState.isValid}>
                        {t("save")}
                     </Button>
                  </div>
               </form>
            </Form>
         </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">{t("footer")}</p>
         </CardFooter>
      </Card>
   )
}
