import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { Button } from "@/features/shadcn/components/ui/button"
import { Badge } from "@/features/shadcn/components/ui/badge"
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Save, Undo, Redo } from "lucide-react"
import Link from "next/link"
import { TimelineEditor } from "@/features/audio-processing/components/timeline-editor"
import { SpeakerPanel } from "@/features/audio-processing/components/speaker-panel"
import { AudioPlayer } from "@/features/audio-processing/components/audio-player"

// Mock data - in production, fetch from database
const getEpisodeData = async (episodeId: string) => {
   return {
      id: episodeId,
      title: "Radio Drama Episode 1: The Beginning",
      duration: 3600,
      status: "COMPLETED",
      audioUrl: "/api/episodes/ep-001/audio",
      segments: [
         {
            id: "seg-001",
            startTime: 0.0,
            endTime: 12.5,
            text: "Welcome to our show. Today we have a very special episode.",
            speakerId: "spk-001",
            speakerName: "John Harrison",
            confidence: 0.95,
            isVerified: true,
         },
         {
            id: "seg-002",
            startTime: 12.5,
            endTime: 28.3,
            text: "Thank you John. I am excited to be here and share our story.",
            speakerId: "spk-002",
            speakerName: "Sarah Chen",
            confidence: 0.87,
            isVerified: false,
         },
         {
            id: "seg-003",
            startTime: 28.3,
            endTime: 45.1,
            text: "Our journey began three years ago when we first met at the conference.",
            speakerId: "spk-001",
            speakerName: "John Harrison",
            confidence: 0.92,
            isVerified: true,
         },
         {
            id: "seg-004",
            startTime: 45.1,
            endTime: 62.8,
            text: "That is right. It was a fascinating presentation about AI and creativity.",
            speakerId: "spk-002",
            speakerName: "Sarah Chen",
            confidence: 0.78,
            isVerified: false,
         },
      ],
      speakers: [
         { id: "spk-001", name: "John Harrison", color: "#3B82F6", segmentCount: 45, totalDuration: 1240, isVerified: true },
         { id: "spk-002", name: "Sarah Chen", color: "#EF4444", segmentCount: 38, totalDuration: 1180, isVerified: false },
         { id: "spk-003", name: "Unknown Speaker #3", color: "#10B981", segmentCount: 6, totalDuration: 180, isVerified: false },
      ],
   }
}

interface TimelinePageProps {
   params: { episodeId: string }
}

export default async function TimelinePage({ params }: TimelinePageProps) {
   const t = await getTranslations("app.episodes.timeline")
   const episode = await getEpisodeData(params.episodeId)

   const unverifiedCount = episode.segments.filter((s) => !s.isVerified).length
   const totalSegments = episode.segments.length

   return (
      <div className="h-screen flex flex-col">
         {/* Header */}
         <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" asChild>
                  <Link href={`/episodes/${params.episodeId}`}>
                     <ArrowLeft className="h-4 w-4" />
                  </Link>
               </Button>

               <div>
                  <h1 className="text-xl font-bold">{episode.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                     <span>{t("segments", { count: totalSegments })}</span>
                     <span>{t("speakers", { count: episode.speakers.length })}</span>
                     {unverifiedCount > 0 && (
                        <Badge variant="outline" className="text-yellow-600">
                           {t("unverified", { count: unverifiedCount })}
                        </Badge>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm">
                  <Undo className="mr-2 h-4 w-4" />
                  {t("actions.undo")}
               </Button>
               <Button variant="outline" size="sm">
                  <Redo className="mr-2 h-4 w-4" />
                  {t("actions.redo")}
               </Button>
               <Button size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  {t("actions.save")}
               </Button>
            </div>
         </div>

         {/* Main Content */}
         <div className="flex-1 flex overflow-hidden">
            {/* Timeline Area */}
            <div className="flex-1 flex flex-col">
               {/* Audio Controls */}
               <div className="p-4 border-b">
                  <Suspense fallback={<div className="h-12 bg-gray-100 rounded animate-pulse" />}>
                     <AudioPlayer audioUrl={episode.audioUrl} duration={episode.duration} segments={episode.segments} />
                  </Suspense>
               </div>

               {/* Timeline */}
               <div className="flex-1 overflow-auto">
                  <Suspense fallback={<div className="h-full bg-gray-50 animate-pulse" />}>
                     <TimelineEditor segments={episode.segments} speakers={episode.speakers} duration={episode.duration} />
                  </Suspense>
               </div>
            </div>

            {/* Speaker Panel */}
            <div className="w-80 border-l bg-card">
               <Suspense fallback={<div className="h-full bg-gray-50 animate-pulse" />}>
                  <SpeakerPanel speakers={episode.speakers} segments={episode.segments} />
               </Suspense>
            </div>
         </div>

         {/* Status Bar */}
         <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-4">
               <span>{t("status.ready")}</span>
               <span>{t("progress", { verified: totalSegments - unverifiedCount, total: totalSegments })}</span>
            </div>
            <div className="flex items-center gap-2">
               <span>{t("shortcuts.play")}: Space</span>
               <span>{t("shortcuts.split")}: S</span>
               <span>{t("shortcuts.merge")}: M</span>
            </div>
         </div>
      </div>
   )
}
