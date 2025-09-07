import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { Badge } from "@/features/shadcn/components/ui/badge"
import { Button } from "@/features/shadcn/components/ui/button"
import { Upload, Users, FileAudio, Mic, Activity, Clock, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"

// Mock data - in production, fetch from database
const getDashboardStats = async () => {
   return {
      totalEpisodes: 12,
      processingEpisodes: 3,
      completedEpisodes: 9,
      totalSpeakers: 47,
      verifiedSpeakers: 23,
      pendingSpeakers: 24,
      totalSyntheses: 156,
      queuedJobs: 8,
      runningJobs: 2,
      recentActivity: [
         { id: "1", type: "episode_uploaded", title: "Radio Drama Episode 5", timestamp: "2 minutes ago", status: "processing" },
         { id: "2", type: "speaker_identified", title: 'New speaker "Sarah" in Episode 4', timestamp: "15 minutes ago", status: "completed" },
         { id: "3", type: "synthesis_completed", title: "Voice synthesis for John completed", timestamp: "1 hour ago", status: "completed" },
      ],
   }
}

export default async function DashboardPage() {
   const t = await getTranslations("app.dashboard")
   const stats = await getDashboardStats()

   return (
      <div className="space-y-8">
         {/* Header */}
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
               <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>
            <Button asChild>
               <Link href="/audiofaker/episodes/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  {t("uploadEpisode")}
               </Link>
            </Button>
         </div>

         {/* Stats Grid */}
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.episodes")}</CardTitle>
                  <FileAudio className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEpisodes}</div>
                  <p className="text-xs text-muted-foreground">
                     {stats.processingEpisodes} {t("stats.processing")}
                  </p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.speakers")}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSpeakers}</div>
                  <p className="text-xs text-muted-foreground">
                     {stats.verifiedSpeakers} {t("stats.verified")}
                  </p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.syntheses")}</CardTitle>
                  <Mic className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSyntheses}</div>
                  <p className="text-xs text-muted-foreground">+23 {t("stats.thisWeek")}</p>
               </CardContent>
            </Card>

            <Card>
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("stats.queue")}</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  <div className="text-2xl font-bold">{stats.queuedJobs}</div>
                  <p className="text-xs text-muted-foreground">
                     {stats.runningJobs} {t("stats.running")}
                  </p>
               </CardContent>
            </Card>
         </div>

         {/* Quick Actions & Recent Activity */}
         <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
               <CardHeader>
                  <CardTitle>{t("quickActions.title")}</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" asChild>
                     <Link href="/audiofaker/episodes/upload">
                        <Upload className="mr-2 h-4 w-4" />
                        {t("quickActions.uploadEpisode")}
                     </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                     <Link href="/audiofaker/speakers">
                        <Users className="mr-2 h-4 w-4" />
                        {t("quickActions.manageSpeakers")}
                     </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                     <Link href="/audiofaker/synthesis">
                        <Mic className="mr-2 h-4 w-4" />
                        {t("quickActions.synthesizeVoice")}
                     </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                     <Link href="/audiofaker/jobs">
                        <Activity className="mr-2 h-4 w-4" />
                        {t("quickActions.viewJobs")}
                     </Link>
                  </Button>
               </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
               <CardHeader>
                  <CardTitle>{t("recentActivity.title")}</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="space-y-4">
                     {stats.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3">
                           <div className="flex-shrink-0">
                              {activity.status === "completed" ? (
                                 <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : activity.status === "processing" ? (
                                 <Clock className="h-4 w-4 text-blue-500" />
                              ) : (
                                 <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                           </div>
                           <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium leading-none">{activity.title}</p>
                              <div className="flex items-center gap-2">
                                 <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                                 <Badge variant={activity.status === "completed" ? "default" : "secondary"} className="text-xs">
                                    {t(`status.${activity.status}`)}
                                 </Badge>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Processing Status */}
         <Card>
            <CardHeader>
               <CardTitle>{t("processing.title")}</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-sm text-muted-foreground">{t("processing.description")}</div>
               <div className="mt-4">
                  <Button variant="outline" asChild>
                     <Link href="/jobs">{t("processing.viewDetails")}</Link>
                  </Button>
               </div>
            </CardContent>
         </Card>
      </div>
   )
}
