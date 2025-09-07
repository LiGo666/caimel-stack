import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shadcn/components/ui/card"
import { Badge } from "@/features/shadcn/components/ui/badge"
import { Button } from "@/features/shadcn/components/ui/button"
import { Textarea } from "@/features/shadcn/components/ui/textarea"
import { Label } from "@/features/shadcn/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/features/shadcn/components/ui/select"
import { Slider } from "@/features/shadcn/components/ui/slider"
import { Avatar, AvatarFallback, AvatarImage } from "@/features/shadcn/components/ui/avatar"
import { 
  AudioWaveform,
  Mic,
  Play,
  Download,
  Settings,
  Clock,
  CheckCircle,
  User,
  Volume2
} from "lucide-react"

// Mock data - in production, fetch from database
const getAvailableVoices = async () => {
  return [
    {
      id: 'spk-001',
      name: 'John Harrison',
      gender: 'MALE',
      status: 'TRAINED',
      modelType: 'XTTS_V2',
      sampleCount: 156,
      quality: 0.92
    },
    {
      id: 'spk-004',
      name: 'Emma Rodriguez', 
      gender: 'FEMALE',
      status: 'TRAINED',
      modelType: 'XTTS_V2',
      sampleCount: 234,
      quality: 0.95
    }
  ]
}

const getRecentSyntheses = async () => {
  return [
    {
      id: 'syn-001',
      text: 'Welcome to our podcast. Today we will be discussing...',
      speakerName: 'John Harrison',
      status: 'COMPLETED',
      duration: 12,
      createdAt: '2024-01-21T14:30:00Z',
      audioUrl: '/api/synthesis/syn-001/audio'
    },
    {
      id: 'syn-002', 
      text: 'Thank you for listening. Please subscribe to our channel.',
      speakerName: 'Emma Rodriguez',
      status: 'PROCESSING',
      duration: null,
      createdAt: '2024-01-21T15:15:00Z',
      audioUrl: null
    },
    {
      id: 'syn-003',
      text: 'This is a test of the emergency broadcast system.',
      speakerName: 'John Harrison', 
      status: 'FAILED',
      duration: null,
      createdAt: '2024-01-21T13:45:00Z',
      audioUrl: null
    }
  ]
}

function SynthesisForm() {
  return (
    <div className="space-y-6">
      {/* Voice Selection */}
      <div className="space-y-2">
        <Label htmlFor="voice-select">Select Voice</Label>
        <Select>
          <SelectTrigger id="voice-select">
            <SelectValue placeholder="Choose a trained voice" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spk-001">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>JH</AvatarFallback>
                </Avatar>
                <span>John Harrison</span>
                <Badge variant="outline" className="ml-auto">XTTS-v2</Badge>
              </div>
            </SelectItem>
            <SelectItem value="spk-004">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>ER</AvatarFallback>
                </Avatar>
                <span>Emma Rodriguez</span>
                <Badge variant="outline" className="ml-auto">XTTS-v2</Badge>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <Label htmlFor="synthesis-text">Text to Synthesize</Label>
        <Textarea 
          id="synthesis-text"
          placeholder="Enter the text you want to convert to speech..."
          className="min-h-[120px]"
          maxLength={5000}
        />
        <div className="text-xs text-muted-foreground text-right">
          0 / 5000 characters
        </div>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Speed</Label>
              <span className="text-sm text-muted-foreground">1.0x</span>
            </div>
            <Slider
              defaultValue={[1.0]}
              min={0.5}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Pitch Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pitch</Label>
              <span className="text-sm text-muted-foreground">1.0x</span>
            </div>
            <Slider
              defaultValue={[1.0]}
              min={0.5}
              max={2.0} 
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select defaultValue="en">
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Emotion/Style */}
          <div className="space-y-2">
            <Label htmlFor="emotion">Emotion (Optional)</Label>
            <Select>
              <SelectTrigger id="emotion">
                <SelectValue placeholder="Auto-detect" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="excited">Excited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button className="flex-1">
          <AudioWaveform className="mr-2 h-4 w-4" />
          Generate Speech
        </Button>
        <Button variant="outline">
          <Play className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </div>
    </div>
  )
}

function RecentSyntheses({ syntheses }: { syntheses: any[] }) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case 'FAILED':
        return <div className="h-4 w-4 rounded-full bg-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {syntheses.map((synthesis) => (
        <Card key={synthesis.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(synthesis.status)}
                  <span className="text-sm font-medium">{synthesis.speakerName}</span>
                  {synthesis.duration && (
                    <Badge variant="outline">{synthesis.duration}s</Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {synthesis.text}
                </p>
                
                <div className="text-xs text-muted-foreground">
                  {new Date(synthesis.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {synthesis.status === 'COMPLETED' && synthesis.audioUrl && (
                  <>
                    <Button variant="ghost" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function SynthesisPage() {
  const t = await getTranslations("app.synthesis")
  const voices = await getAvailableVoices()
  const recentSyntheses = await getRecentSyntheses()

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Synthesis Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                {t("form.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading...</div>}>
                <SynthesisForm />
              </Suspense>
            </CardContent>
          </Card>

          {/* Voice Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                {t("preview.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                {t("preview.selectVoice")}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Available Voices */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("voices.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {voices.map((voice) => (
                  <div key={voice.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {voice.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{voice.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {voice.sampleCount} samples • {Math.round(voice.quality * 100)}% quality
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {voice.modelType}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Syntheses */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("recent.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading...</div>}>
                <RecentSyntheses syntheses={recentSyntheses} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Empty State for No Voices */}
      {voices.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Mic className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-muted-foreground mb-4">{t("empty.description")}</p>
            <Button asChild>
              <a href="/speakers">{t("empty.trainVoices")}</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
