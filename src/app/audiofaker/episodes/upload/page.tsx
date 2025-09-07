import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { UploadDropzone } from "@/features/file-upload/components/upload-dropzone"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/features/shadcn/components/ui/button"
import Link from "next/link"

export default async function UploadEpisodePage() {
   const t = await getTranslations("app.episodes.upload")

   return (
      <div className="space-y-8 max-w-4xl mx-auto">
         {/* Header */}
         <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
               <Link href="/episodes">
                  <ArrowLeft className="h-4 w-4" />
               </Link>
            </Button>
            <div>
               <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
               <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
         </div>

         {/* Upload Form */}
         <Card>
            <CardHeader>
               <CardTitle>{t("form.title")}</CardTitle>
            </CardHeader>
            <CardContent>
               <UploadDropzone />
            </CardContent>
         </Card>

         {/* Instructions */}
         <Card>
            <CardHeader>
               <CardTitle>{t("instructions.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                  <h4 className="font-medium mb-2">{t("instructions.supportedFormats")}</h4>
                  <p className="text-sm text-muted-foreground">{t("instructions.formats")}</p>
               </div>

               <div>
                  <h4 className="font-medium mb-2">{t("instructions.recommendations")}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                     <li>• {t("instructions.highQuality")}</li>
                     <li>• {t("instructions.clearAudio")}</li>
                     <li>• {t("instructions.minimumLength")}</li>
                     <li>• {t("instructions.multipleSpeakers")}</li>
                  </ul>
               </div>

               <div>
                  <h4 className="font-medium mb-2">{t("instructions.processingSteps")}</h4>
                  <ol className="text-sm text-muted-foreground space-y-1">
                     <li>1. {t("instructions.step1")}</li>
                     <li>2. {t("instructions.step2")}</li>
                     <li>3. {t("instructions.step3")}</li>
                     <li>4. {t("instructions.step4")}</li>
                  </ol>
               </div>
            </CardContent>
         </Card>
      </div>
   )
}
