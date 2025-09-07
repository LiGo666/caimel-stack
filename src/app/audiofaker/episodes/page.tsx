import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { Badge } from "@/features/shadcn/components/ui/badge"
import { Button } from "@/features/shadcn/components/ui/button"
import { Upload, FileAudio, Clock, CheckCircle, AlertCircle, Users, MoreVertical, Play, Download } from "lucide-react"
import Link from "next/link"

// Mock data - in production, fetch from database
const getEpisodes = async () => {
   return [
      {
         id: "ep-001",
         title: "Radio Drama Episode 1: The Beginning",
         description: "Introduction to the main characters and story arc.",
         uploadedAt: "2024-01-15T10:30:00Z",
         duration: 3600, // seconds
         fileSize: 125000000, // bytes
         status: "COMPLETED",
         transcriptionStatus: "COMPLETED",
         diarizationStatus: "COMPLETED",
         speakersIdentified: 4,
         segments: 89,
      },
      {
         id: "ep-002",
         title: "Radio Drama Episode 2: The Plot Thickens",
         description: "Dramatic developments and new character reveals.",
         uploadedAt: "2024-01-18T14:15:00Z",
         duration: 3420,
         fileSize: 118000000,
         status: "PROCESSING",
         transcriptionStatus: "COMPLETED",
         diarizationStatus: "RUNNING",
         speakersIdentified: 3,
         segments: 76,
      },
      {
         id: "ep-003",
         title: "Podcast Interview - Tech Leaders Summit",
         description: "Interview with industry leaders about AI and automation.",
         uploadedAt: "2024-01-20T09:00:00Z",
         duration: 2880,
         fileSize: 99000000,
         status: "FAILED",
         transcriptionStatus: "FAILED",
         diarizationStatus: "PENDING",
         speakersIdentified: 0,
         segments: 0,
      },
   ]
}

function formatDuration(seconds: number): string {
   const hours = Math.floor(seconds / 3600)
   const minutes = Math.floor((seconds % 3600) / 60)
   const remainingSeconds = seconds % 60

   if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
   }
   return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function formatFileSize(bytes: number): string {
   const mb = bytes / (1024 * 1024)
   return `${mb.toFixed(1)} MB`
}

function getStatusIcon(status: string) {
   switch (status) {
      case "COMPLETED":
         return <CheckCircle className="h-4 w-4 text-green-500" />
      case "PROCESSING":
      case "RUNNING":
         return <Clock className="h-4 w-4 text-blue-500" />
      case "FAILED":
         return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
         return <Clock className="h-4 w-4 text-gray-500" />
   }
}

function getStatusColor(status: string) {
   switch (status) {
      case "COMPLETED":
         return "bg-green-100 text-green-800"
      case "PROCESSING":
      case "RUNNING":
         return "bg-blue-100 text-blue-800"
      case "FAILED":
         return "bg-red-100 text-red-800"
      case "PENDING":
         return "bg-gray-100 text-gray-800"
      default:
         return "bg-gray-100 text-gray-800"
   }
}

export default async function EpisodesPage() {
   const t = await getTranslations("app.episodes")
   const episodes = await getEpisodes()

   return (
      <div className="space-y-8">
         {/* Header */}
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
               <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <Button asChild>
               <Link href="/episodes/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  {t("uploadNew")}
               </Link>
            </Button>
         </div>

         {/* Episodes Grid */}
         <div className="grid gap-6">
            {episodes.map((episode) => (
               <Card key={episode.id} className="relative">
                  <CardHeader>
                     <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                           <CardTitle className="text-lg">{episode.title}</CardTitle>
                           <p className="text-sm text-muted-foreground line-clamp-2">{episode.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Badge className={getStatusColor(episode.status)}>
                              {getStatusIcon(episode.status)}
                              <span className="ml-1">{t(`status.${episode.status.toLowerCase()}`)}</span>
                           </Badge>
                           <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                  </CardHeader>

                  <CardContent>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Basic Info */}
                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.duration")}</div>
                           <div className="font-medium">{formatDuration(episode.duration)}</div>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.fileSize")}</div>
                           <div className="font-medium">{formatFileSize(episode.fileSize)}</div>
                        </div>

                        {/* Processing Status */}
                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.transcription")}</div>
                           <div className="flex items-center gap-1">
                              {getStatusIcon(episode.transcriptionStatus)}
                              <span className="text-sm">{t(`status.${episode.transcriptionStatus.toLowerCase()}`)}</span>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.diarization")}</div>
                           <div className="flex items-center gap-1">
                              {getStatusIcon(episode.diarizationStatus)}
                              <span className="text-sm">{t(`status.${episode.diarizationStatus.toLowerCase()}`)}</span>
                           </div>
                        </div>
                     </div>

                     {/* Speaker Info */}
                     {episode.speakersIdentified > 0 && (
                        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                           <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {episode.speakersIdentified} {t("details.speakers")}
                           </div>
                           <div>
                              {episode.segments} {t("details.segments")}
                           </div>
                        </div>
                     )}

                     {/* Actions */}
                     <div className="mt-4 flex items-center gap-2">
                        {episode.status === "COMPLETED" && (
                           <>
                              <Button variant="outline" size="sm" asChild>
                                 <Link href={`/episodes/${episode.id}`}>
                                    <Play className="mr-2 h-4 w-4" />
                                    {t("actions.view")}
                                 </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                 <Link href={`/episodes/${episode.id}/speakers`}>
                                    <Users className="mr-2 h-4 w-4" />
                                    {t("actions.manageSpeakers")}
                                 </Link>
                              </Button>
                           </>
                        )}

                        {episode.status === "PROCESSING" && (
                           <Button variant="outline" size="sm" asChild>
                              <Link href={`/episodes/${episode.id}/progress`}>
                                 <Clock className="mr-2 h-4 w-4" />
                                 {t("actions.viewProgress")}
                              </Link>
                           </Button>
                        )}

                        {episode.status === "FAILED" && (
                           <Button variant="outline" size="sm">
                              <AlertCircle className="mr-2 h-4 w-4" />
                              {t("actions.retry")}
                           </Button>
                        )}
                     </div>

                     {/* Upload Date */}
                     <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                        {t("details.uploaded")}: {new Date(episode.uploadedAt).toLocaleDateString()}
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         {/* Empty State */}
         {episodes.length === 0 && (
            <Card className="text-center py-12">
               <CardContent>
                  <FileAudio className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                  <p className="text-muted-foreground mb-4">{t("empty.description")}</p>
                  <Button asChild>
                     <Link href="/episodes/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        {t("empty.uploadFirst")}
                     </Link>
                  </Button>
               </CardContent>
            </Card>
         )}
      </div>
   )
}
