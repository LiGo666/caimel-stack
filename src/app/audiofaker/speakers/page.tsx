import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { Badge } from "@/features/shadcn/components/ui/badge"
import { Button } from "@/features/shadcn/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/features/shadcn/components/ui/avatar"
import { Users, Mic, Clock, CheckCircle, AlertCircle, MoreVertical, Play, AudioWaveform, User } from "lucide-react"
import Link from "next/link"

// Mock data - in production, fetch from database
const getSpeakers = async () => {
   return [
      {
         id: "spk-001",
         name: "John Harrison",
         gender: "MALE",
         ageRange: "ADULT",
         status: "VERIFIED",
         totalSegments: 156,
         totalDuration: 2340, // seconds
         averageConfidence: 0.92,
         episodeCount: 8,
         lastHeard: "2024-01-20T15:30:00Z",
         hasVoiceModel: true,
         voiceModelStatus: "TRAINED",
         characteristics: { pitch: "MEDIUM", accent: "AMERICAN", speaking_rate: "NORMAL" },
      },
      {
         id: "spk-002",
         name: "Sarah Chen",
         gender: "FEMALE",
         ageRange: "ADULT",
         status: "PENDING_REVIEW",
         totalSegments: 89,
         totalDuration: 1456,
         averageConfidence: 0.87,
         episodeCount: 5,
         lastHeard: "2024-01-18T12:15:00Z",
         hasVoiceModel: false,
         voiceModelStatus: null,
         characteristics: { pitch: "HIGH", accent: "BRITISH", speaking_rate: "FAST" },
      },
      {
         id: "spk-003",
         name: "Unknown Speaker #3",
         gender: "MALE",
         ageRange: "ELDERLY",
         status: "UNVERIFIED",
         totalSegments: 23,
         totalDuration: 345,
         averageConfidence: 0.73,
         episodeCount: 2,
         lastHeard: "2024-01-15T09:45:00Z",
         hasVoiceModel: false,
         voiceModelStatus: null,
         characteristics: { pitch: "LOW", accent: "UNKNOWN", speaking_rate: "SLOW" },
      },
      {
         id: "spk-004",
         name: "Emma Rodriguez",
         gender: "FEMALE",
         ageRange: "YOUNG_ADULT",
         status: "VERIFIED",
         totalSegments: 234,
         totalDuration: 3120,
         averageConfidence: 0.95,
         episodeCount: 12,
         lastHeard: "2024-01-21T16:20:00Z",
         hasVoiceModel: true,
         voiceModelStatus: "TRAINING",
         characteristics: { pitch: "MEDIUM_HIGH", accent: "SPANISH", speaking_rate: "NORMAL" },
      },
   ]
}

function formatDuration(seconds: number): string {
   const hours = Math.floor(seconds / 3600)
   const minutes = Math.floor((seconds % 3600) / 60)

   if (hours > 0) {
      return `${hours}h ${minutes}m`
   }
   return `${minutes}m`
}

function getStatusIcon(status: string) {
   switch (status) {
      case "VERIFIED":
         return <CheckCircle className="h-4 w-4 text-green-500" />
      case "PENDING_REVIEW":
         return <Clock className="h-4 w-4 text-yellow-500" />
      case "UNVERIFIED":
         return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
         return <User className="h-4 w-4 text-gray-500" />
   }
}

function getStatusColor(status: string) {
   switch (status) {
      case "VERIFIED":
         return "bg-green-100 text-green-800"
      case "PENDING_REVIEW":
         return "bg-yellow-100 text-yellow-800"
      case "UNVERIFIED":
         return "bg-gray-100 text-gray-800"
      default:
         return "bg-gray-100 text-gray-800"
   }
}

function getVoiceModelStatusColor(status: string | null) {
   switch (status) {
      case "TRAINED":
         return "bg-green-100 text-green-800"
      case "TRAINING":
         return "bg-blue-100 text-blue-800"
      case "FAILED":
         return "bg-red-100 text-red-800"
      default:
         return "bg-gray-100 text-gray-800"
   }
}

export default async function SpeakersPage() {
   const t = await getTranslations("app.speakers")
   const speakers = await getSpeakers()

   const verifiedSpeakers = speakers.filter((s) => s.status === "VERIFIED").length
   const pendingSpeakers = speakers.filter((s) => s.status === "PENDING_REVIEW").length
   const trainedModels = speakers.filter((s) => s.voiceModelStatus === "TRAINED").length

   return (
      <div className="space-y-8">
         {/* Header */}
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
               <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline">{t("actions.reviewPending")}</Button>
               <Button>{t("actions.trainModels")}</Button>
            </div>
         </div>

         {/* Stats */}
         <div className="grid gap-4 md:grid-cols-4">
            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.total")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{speakers.length}</div>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.verified")}</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{verifiedSpeakers}</div>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.pending")}</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{pendingSpeakers}</div>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.trained")}</CardTitle>
                  <Mic className="h-4 w-4 text-blue-500" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{trainedModels}</div>
               </CardContent>
            </Card>
         </div>

         {/* Speakers Grid */}
         <div className="grid gap-6">
            {speakers.map((speaker) => (
               <Card key={speaker.id} className="relative">
                  <CardHeader>
                     <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                           <Avatar className="h-12 w-12">
                              <AvatarImage src={`/api/speakers/${speaker.id}/avatar`} />
                              <AvatarFallback>
                                 {speaker.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                              </AvatarFallback>
                           </Avatar>

                           <div className="space-y-1">
                              <CardTitle className="text-lg">{speaker.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                 <Badge variant="outline" className="text-xs">
                                    {t(`gender.${speaker.gender.toLowerCase()}`)}
                                 </Badge>
                                 <Badge variant="outline" className="text-xs">
                                    {t(`ageRange.${speaker.ageRange.toLowerCase()}`)}
                                 </Badge>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-2">
                           <Badge className={getStatusColor(speaker.status)}>
                              {getStatusIcon(speaker.status)}
                              <span className="ml-1">{t(`status.${speaker.status.toLowerCase()}`)}</span>
                           </Badge>
                           <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                  </CardHeader>

                  <CardContent>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Statistics */}
                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.segments")}</div>
                           <div className="font-medium">{speaker.totalSegments}</div>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.totalAudio")}</div>
                           <div className="font-medium">{formatDuration(speaker.totalDuration)}</div>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.episodes")}</div>
                           <div className="font-medium">{speaker.episodeCount}</div>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("details.confidence")}</div>
                           <div className="font-medium">{Math.round(speaker.averageConfidence * 100)}%</div>
                        </div>
                     </div>

                     {/* Voice Characteristics */}
                     <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("characteristics.pitch")}</div>
                           <Badge variant="outline">{t(`pitch.${speaker.characteristics.pitch.toLowerCase()}`)}</Badge>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("characteristics.accent")}</div>
                           <Badge variant="outline">{t(`accent.${speaker.characteristics.accent.toLowerCase()}`)}</Badge>
                        </div>

                        <div className="space-y-2">
                           <div className="text-sm text-muted-foreground">{t("characteristics.rate")}</div>
                           <Badge variant="outline">{t(`rate.${speaker.characteristics.speaking_rate.toLowerCase()}`)}</Badge>
                        </div>
                     </div>

                     {/* Voice Model Status */}
                     {speaker.hasVoiceModel && (
                        <div className="mt-4">
                           <div className="text-sm text-muted-foreground mb-2">{t("voiceModel.status")}</div>
                           <Badge className={getVoiceModelStatusColor(speaker.voiceModelStatus)}>
                              <Mic className="mr-1 h-3 w-3" />
                              {t(`voiceModel.${speaker.voiceModelStatus?.toLowerCase()}`)}
                           </Badge>
                        </div>
                     )}

                     {/* Actions */}
                     <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/speakers/${speaker.id}`}>
                              <Play className="mr-2 h-4 w-4" />
                              {t("actions.view")}
                           </Link>
                        </Button>

                        {speaker.status === "VERIFIED" && !speaker.hasVoiceModel && (
                           <Button variant="outline" size="sm">
                              <Mic className="mr-2 h-4 w-4" />
                              {t("actions.trainVoice")}
                           </Button>
                        )}

                        {speaker.voiceModelStatus === "TRAINED" && (
                           <Button variant="outline" size="sm" asChild>
                              <Link href={`/synthesis?speaker=${speaker.id}`}>
                                 <AudioWaveform className="mr-2 h-4 w-4" />
                                 {t("actions.synthesize")}
                              </Link>
                           </Button>
                        )}

                        {speaker.status === "PENDING_REVIEW" && (
                           <Button variant="outline" size="sm">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {t("actions.review")}
                           </Button>
                        )}
                     </div>

                     {/* Last Heard */}
                     <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                        {t("details.lastHeard")}: {new Date(speaker.lastHeard).toLocaleDateString()}
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>

         {/* Empty State */}
         {speakers.length === 0 && (
            <Card className="text-center py-12">
               <CardContent>
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
                  <p className="text-muted-foreground mb-4">{t("empty.description")}</p>
                  <Button asChild>
                     <Link href="/episodes/upload">{t("empty.uploadEpisode")}</Link>
                  </Button>
               </CardContent>
            </Card>
         )}
      </div>
   )
}
