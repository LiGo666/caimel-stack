"use client"

import {
   Card,
   CardHeader,
   CardTitle,
   CardDescription,
   CardContent,
   Table,
   TableHeader,
   TableRow,
   TableHead,
   TableBody,
   TableCell,
   Badge,
} from "@/features/shadcn/index.client"
import { useTranslations } from "next-intl"

const rows = [
   { id: 1, name: "Ada Lovelace", email: "ada@example.com", role: "Admin", status: "Active" },
   { id: 2, name: "Alan Turing", email: "alan@example.com", role: "User", status: "Invited" },
   { id: 3, name: "Grace Hopper", email: "grace@example.com", role: "User", status: "Active" },
   { id: 4, name: "Katherine Johnson", email: "katherine@example.com", role: "Viewer", status: "Disabled" },
]

function StatusBadge({ status }: { status: string }) {
   const variant = status === "Active" ? "default" : status === "Invited" ? "secondary" : "destructive"
   return <Badge variant={variant as any}>{status}</Badge>
}

export default function DemoTable() {
   const t = useTranslations("app.admin.test.shadcn.components.table")
   return (
      <Card>
         <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
         </CardHeader>
         <CardContent>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead className="w-[80px]">{t("id")}</TableHead>
                     <TableHead>{t("name")}</TableHead>
                     <TableHead>{t("email")}</TableHead>
                     <TableHead>{t("role")}</TableHead>
                     <TableHead className="text-right">{t("status")}</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {rows.map((r) => (
                     <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.id}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell>{r.role}</TableCell>
                        <TableCell className="text-right">
                           <StatusBadge status={r.status} />
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
   )
}
