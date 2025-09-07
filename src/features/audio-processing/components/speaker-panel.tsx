"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shadcn/components/ui/card'
import { Button } from '@/features/shadcn/components/ui/button'
import { Badge } from '@/features/shadcn/components/ui/badge'
import { Input } from '@/features/shadcn/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shadcn/components/ui/avatar'
import { 
  User, 
  Edit, 
  Check, 
  X, 
  Mic, 
  Eye, 
  EyeOff,
  Plus,
  Trash2,
  Palette
} from 'lucide-react'

interface Segment {
  id: string
  startTime: number
  endTime: number
  text: string
  speakerId: string
  speakerName: string
  confidence: number
  isVerified: boolean
}

interface Speaker {
  id: string
  name: string
  color: string
  segmentCount: number
  totalDuration: number
  isVerified: boolean
}

interface SpeakerPanelProps {
  speakers: Speaker[]
  segments: Segment[]
  onSpeakerUpdate?: (speakerId: string, updates: Partial<Speaker>) => void
  onSpeakerDelete?: (speakerId: string) => void
  onSpeakerCreate?: (speaker: Omit<Speaker, 'id'>) => void
  onSpeakerVisibilityToggle?: (speakerId: string) => void
}

const SPEAKER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#EAB308'
]

export function SpeakerPanel({
  speakers,
  segments,
  onSpeakerUpdate,
  onSpeakerDelete,
  onSpeakerCreate,
  onSpeakerVisibilityToggle
}: SpeakerPanelProps) {
  const t = useTranslations("features.speakers")
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [hiddenSpeakers, setHiddenSpeakers] = useState<Set<string>>(new Set())
  const [isCreating, setIsCreating] = useState(false)
  const [newSpeakerName, setNewSpeakerName] = useState('')

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSpeakerStats = (speakerId: string) => {
    const speakerSegments = segments.filter(s => s.speakerId === speakerId)
    const totalDuration = speakerSegments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0)
    const avgConfidence = speakerSegments.length > 0 
      ? speakerSegments.reduce((acc, seg) => acc + seg.confidence, 0) / speakerSegments.length
      : 0
    const verifiedCount = speakerSegments.filter(s => s.isVerified).length

    return {
      segmentCount: speakerSegments.length,
      totalDuration,
      avgConfidence,
      verifiedCount
    }
  }

  const handleSpeakerNameUpdate = (speakerId: string, newName: string) => {
    onSpeakerUpdate?.(speakerId, { name: newName })
    setEditingSpeaker(null)
  }

  const handleColorUpdate = (speakerId: string, color: string) => {
    onSpeakerUpdate?.(speakerId, { color })
  }

  const handleCreateSpeaker = () => {
    if (!newSpeakerName.trim()) return
    
    const availableColor = SPEAKER_COLORS.find(color => 
      !speakers.some(s => s.color === color)
    ) || SPEAKER_COLORS[0]

    onSpeakerCreate?.({
      name: newSpeakerName.trim(),
      color: availableColor,
      segmentCount: 0,
      totalDuration: 0,
      isVerified: false
    })

    setNewSpeakerName('')
    setIsCreating(false)
  }

  const toggleSpeakerVisibility = (speakerId: string) => {
    setHiddenSpeakers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(speakerId)) {
        newSet.delete(speakerId)
      } else {
        newSet.add(speakerId)
      }
      return newSet
    })
    onSpeakerVisibilityToggle?.(speakerId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("title")} ({speakers.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Create New Speaker */}
        {isCreating && (
          <div className="space-y-2">
            <Input
              placeholder={t("newSpeakerName")}
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSpeaker()
                if (e.key === 'Escape') setIsCreating(false)
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateSpeaker}>
                <Check className="mr-2 h-4 w-4" />
                {t("actions.create")}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCreating(false)}
              >
                <X className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Speaker List */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {speakers.map((speaker) => {
          const stats = getSpeakerStats(speaker.id)
          const isHidden = hiddenSpeakers.has(speaker.id)
          
          return (
            <Card key={speaker.id} className={`${isHidden ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/api/speakers/${speaker.id}/avatar`} />
                    <AvatarFallback style={{ backgroundColor: speaker.color }}>
                      {speaker.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    {editingSpeaker === speaker.id ? (
                      <Input
                        defaultValue={speaker.name}
                        className="h-6 text-sm"
                        onBlur={(e) => handleSpeakerNameUpdate(speaker.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSpeakerNameUpdate(speaker.id, e.currentTarget.value)
                          }
                          if (e.key === 'Escape') {
                            setEditingSpeaker(null)
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="font-medium text-sm cursor-pointer hover:text-blue-600"
                        onClick={() => setEditingSpeaker(speaker.id)}
                      >
                        {speaker.name}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={speaker.isVerified ? "default" : "secondary"} className="text-xs">
                        {speaker.isVerified ? t("verified") : t("pending")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(stats.avgConfidence * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleSpeakerVisibility(speaker.id)}
                    >
                      {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditingSpeaker(speaker.id)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("segments")}</div>
                    <div className="font-medium">{stats.segmentCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("duration")}</div>
                    <div className="font-medium">{formatDuration(stats.totalDuration)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("verified")}</div>
                    <div className="font-medium">{stats.verifiedCount}/{stats.segmentCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("confidence")}</div>
                    <div className="font-medium">{Math.round(stats.avgConfidence * 100)}%</div>
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">{t("color")}</div>
                  <div className="flex flex-wrap gap-2">
                    {SPEAKER_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-4 h-4 rounded-full border-2 ${
                          speaker.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorUpdate(speaker.id, color)}
                      />
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Mic className="mr-2 h-3 w-3" />
                    {t("actions.train")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSpeakerDelete?.(speaker.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {speakers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">{t("empty")}</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t bg-muted/30">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground">{t("stats.totalSegments")}</div>
            <div className="font-medium">{segments.length}</div>
          </div>
          <div>
            <div className="text-muted-foreground">{t("stats.verified")}</div>
            <div className="font-medium">
              {segments.filter(s => s.isVerified).length}/{segments.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
