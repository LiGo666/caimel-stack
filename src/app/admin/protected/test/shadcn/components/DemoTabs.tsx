"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/features/shadcn/index.client"
import { useTranslations } from "next-intl"

export default function DemoTabs() {
   const t = useTranslations("app.admin.test.shadcn.components.tabs")
   return (
      <Card>
         <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
         </CardHeader>
         <CardContent>
            <Tabs defaultValue="account" className="w-full">
               <TabsList>
                  <TabsTrigger value="account">{t("account")}</TabsTrigger>
                  <TabsTrigger value="password">{t("password")}</TabsTrigger>
                  <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
               </TabsList>
               <TabsContent value="account" className="pt-4 text-sm text-muted-foreground">
                  {t("accountContent")}
               </TabsContent>
               <TabsContent value="password" className="pt-4 text-sm text-muted-foreground">
                  {t("passwordContent")}
               </TabsContent>
               <TabsContent value="notifications" className="pt-4 text-sm text-muted-foreground">
                  {t("notificationsContent")}
               </TabsContent>
            </Tabs>
         </CardContent>
      </Card>
   )
}
