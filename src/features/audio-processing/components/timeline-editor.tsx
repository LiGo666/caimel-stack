"use client"

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card } from '@/features/shadcn/components/ui/card'
import { Button } from '@/features/shadcn/components/ui/button'
import { Badge } from '@/features/shadcn/components/ui/badge'
import { Textarea } from '@/features/shadcn/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shadcn/components/ui/select'
import { Scissors, Merge, Check, X, AlertCircle, User } from 'lucide-react'

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

interface TimelineEditorProps {
  segments: Segment[]
  speakers: Speaker[]
  duration: number
  currentTime?: number
  onTimeChange?: (time: number) => void
  onSegmentUpdate?: (segmentId: string, updates: Partial<Segment>) => void
  onSegmentSplit?: (segmentId: string, splitTime: number) => void
  onSegmentsMerge?: (segmentIds: string[]) => void
}

export function TimelineEditor({
  segments,
  speakers,
  duration,
  currentTime = 0,
  onTimeChange,
  onSegmentUpdate,
  onSegmentSplit,
  onSegmentsMerge
}: TimelineEditorProps) {
  const t = useTranslations("features.timeline")
  const [selectedSegments, setSelectedSegments] = useState<string[]>([])
  const [editingSegment, setEditingSegment] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }, [])

  const getSegmentWidth = useCallback((segment: Segment) => {
    return ((segment.endTime - segment.startTime) / duration) * 100
  }, [duration])

  const getSegmentLeft = useCallback((segment: Segment) => {
    return (segment.startTime / duration) * 100
  }, [duration])

  const getSpeakerColor = useCallback((speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId)
    return speaker?.color || '#6B7280'
  }, [speakers])

  const handleSegmentClick = (segmentId: string, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedSegments(prev => 
        prev.includes(segmentId) 
          ? prev.filter(id => id !== segmentId)
          : [...prev, segmentId]
      )
    } else {
      setSelectedSegments([segmentId])
    }
  }

  const handleTimelineClick = (event: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickTime = (clickX / rect.width) * duration
    
    onTimeChange?.(clickTime)
  }

  const handleSplitSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (!segment) return
    
    const splitTime = segment.startTime + (segment.endTime - segment.startTime) / 2
    onSegmentSplit?.(segmentId, splitTime)
  }

  const handleMergeSegments = () => {
    if (selectedSegments.length < 2) return
    onSegmentsMerge?.(selectedSegments)
    setSelectedSegments([])
  }

  const handleVerifySegment = (segmentId: string) => {
    onSegmentUpdate?.(segmentId, { isVerified: true })
  }

  const handleUpdateSegmentText = (segmentId: string, text: string) => {
    onSegmentUpdate?.(segmentId, { text })
    setEditingSegment(null)
  }

  const handleUpdateSegmentSpeaker = (segmentId: string, speakerId: string) => {
    const speaker = speakers.find(s => s.id === speakerId)
    if (!speaker) return
    
    onSegmentUpdate?.(segmentId, { 
      speakerId, 
      speakerName: speaker.name 
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedSegments.length} {t("selected")}
          </span>
          {selectedSegments.length === 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSplitSegment(selectedSegments[0])}
            >
              <Scissors className="mr-2 h-4 w-4" />
              {t("actions.split")}
            </Button>
          )}
          {selectedSegments.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMergeSegments}
            >
              <Merge className="mr-2 h-4 w-4" />
              {t("actions.merge")}
            </Button>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {t("time")}: {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="flex-1 p-4 space-y-6">
        {/* Time Ruler */}
        <div className="relative h-6 border-b">
          <div 
            ref={timelineRef}
            className="absolute inset-0 cursor-pointer"
            onClick={handleTimelineClick}
          >
            {Array.from({ length: Math.ceil(duration / 60) }, (_, i) => (
              <div
                key={i}
                className="absolute top-0 h-full border-l border-gray-300"
                style={{ left: `${(i * 60 / duration) * 100}%` }}
              >
                <span className="text-xs text-muted-foreground ml-1">
                  {i}:00
                </span>
              </div>
            ))}
            
            {/* Playhead */}
            <div
              className="absolute top-0 w-0.5 h-full bg-red-500 z-10"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-2">
          {segments.map((segment) => (
            <div key={segment.id} className="relative">
              {/* Segment Bar */}
              <div
                className={`relative h-12 rounded border-2 cursor-pointer transition-all ${
                  selectedSegments.includes(segment.id)
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                } ${segment.isVerified ? 'bg-opacity-100' : 'bg-opacity-70'}`}
                style={{
                  left: `${getSegmentLeft(segment)}%`,
                  width: `${getSegmentWidth(segment)}%`,
                  backgroundColor: getSpeakerColor(segment.speakerId),
                }}
                onClick={(e) => handleSegmentClick(segment.id, e)}
              >
                <div className="absolute inset-0 flex items-center justify-between px-2 text-white text-xs font-medium">
                  <div className="flex items-center gap-1">
                    <span className="truncate">{segment.speakerName}</span>
                    {!segment.isVerified && (
                      <AlertCircle className="h-3 w-3 text-yellow-300" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span>{Math.round(segment.confidence * 100)}%</span>
                    {segment.isVerified && (
                      <Check className="h-3 w-3 text-green-300" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Segment Details */}
        {selectedSegments.length === 1 && (
          <Card className="p-4">
            {(() => {
              const segment = segments.find(s => s.id === selectedSegments[0])
              if (!segment) return null
              
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("segmentDetails")}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={segment.isVerified ? "default" : "secondary"}>
                        {segment.isVerified ? t("verified") : t("unverified")}
                      </Badge>
                      {!segment.isVerified && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerifySegment(segment.id)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          {t("actions.verify")}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("timeRange")}
                      </label>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("speaker")}
                      </label>
                      <Select
                        value={segment.speakerId}
                        onValueChange={(value) => handleUpdateSegmentSpeaker(segment.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {speakers.map((speaker) => (
                            <SelectItem key={speaker.id} value={speaker.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: speaker.color }}
                                />
                                {speaker.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {t("transcript")}
                    </label>
                    {editingSegment === segment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          defaultValue={segment.text}
                          className="min-h-[80px]"
                          onBlur={(e) => handleUpdateSegmentText(segment.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleUpdateSegmentText(segment.id, e.currentTarget.value)
                            }
                            if (e.key === 'Escape') {
                              setEditingSegment(null)
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSegment(null)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            {t("actions.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-3 border rounded cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditingSegment(segment.id)}
                      >
                        {segment.text}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("confidence")}: {Math.round(segment.confidence * 100)}%
                  </div>
                </div>
              )
            })()}
          </Card>
        )}
      </div>
    </div>
  )
}
