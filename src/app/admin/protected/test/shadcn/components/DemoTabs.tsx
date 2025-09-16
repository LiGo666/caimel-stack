"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/shadcn/index.client";

export default function DemoTabs() {
  const t = useTranslations("app.admin.test.shadcn.components.tabs");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs className="w-full" defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">{t("account")}</TabsTrigger>
            <TabsTrigger value="password">{t("password")}</TabsTrigger>
            <TabsTrigger value="notifications">
              {t("notifications")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            className="pt-4 text-muted-foreground text-sm"
            value="account"
          >
            {t("accountContent")}
          </TabsContent>
          <TabsContent
            className="pt-4 text-muted-foreground text-sm"
            value="password"
          >
            {t("passwordContent")}
          </TabsContent>
          <TabsContent
            className="pt-4 text-muted-foreground text-sm"
            value="notifications"
          >
            {t("notificationsContent")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
