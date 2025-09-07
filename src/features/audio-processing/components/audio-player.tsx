"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/features/shadcn/components/ui/button'
import { Slider } from '@/features/shadcn/components/ui/slider'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward
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

interface AudioPlayerProps {
  audioUrl: string
  duration: number
  segments: Segment[]
  currentTime?: number
  onTimeChange?: (time: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
}

export function AudioPlayer({
  audioUrl,
  duration,
  segments,
  currentTime = 0,
  onTimeChange,
  onPlayStateChange
}: AudioPlayerProps) {
  const t = useTranslations("features.audioPlayer")
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [internalCurrentTime, setInternalCurrentTime] = useState(currentTime)

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Update audio element when currentTime prop changes
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime
      setInternalCurrentTime(currentTime)
    }
  }, [currentTime])

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const time = audio.currentTime
      setInternalCurrentTime(time)
      onTimeChange?.(time)
    }

    const handleLoadedMetadata = () => {
      audio.volume = volume
      audio.playbackRate = playbackRate
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPlayStateChange?.(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [volume, playbackRate, onTimeChange, onPlayStateChange])

  const togglePlayPause = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  const handleSeek = (newTime: number[]) => {
    if (!audioRef.current) return
    
    const time = newTime[0]
    audioRef.current.currentTime = time
    setInternalCurrentTime(time)
    onTimeChange?.(time)
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    
    const newTime = Math.max(0, audioRef.current.currentTime - 10)
    audioRef.current.currentTime = newTime
  }

  const skipForward = () => {
    if (!audioRef.current) return
    
    const newTime = Math.min(duration, audioRef.current.currentTime + 10)
    audioRef.current.currentTime = newTime
  }

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0]
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
    if (vol > 0 && isMuted) {
      setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    
    if (isMuted) {
      audioRef.current.volume = volume
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  const getCurrentSegment = () => {
    return segments.find(segment => 
      internalCurrentTime >= segment.startTime && 
      internalCurrentTime <= segment.endTime
    )
  }

  const jumpToSegment = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId)
    if (!segment || !audioRef.current) return
    
    audioRef.current.currentTime = segment.startTime
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return // Don't handle shortcuts when typing in inputs
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipForward()
          break
        case 'KeyM':
          e.preventDefault()
          toggleMute()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying])

  const currentSegment = getCurrentSegment()

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Current Segment Info */}
      {currentSegment && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: '#3B82F6' }} // Would use speaker color in real app
              />
              <span className="font-medium text-sm">{currentSegment.speakerName}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(currentSegment.startTime)} - {formatTime(currentSegment.endTime)}
            </div>
          </div>
          <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
            {currentSegment.text}
          </p>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center gap-4">
        {/* Play Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBackward}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          
          <Button
            size="icon"
            onClick={togglePlayPause}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time Slider */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-muted-foreground w-12">
            {formatTime(internalCurrentTime)}
          </span>
          
          <Slider
            value={[internalCurrentTime]}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          
          <span className="text-sm text-muted-foreground w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>

        {/* Playback Rate */}
        <div className="flex items-center gap-1">
          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
            <Button
              key={rate}
              variant={playbackRate === rate ? "default" : "ghost"}
              size="sm"
              className="text-xs px-2 py-1"
              onClick={() => changePlaybackRate(rate)}
            >
              {rate}x
            </Button>
          ))}
        </div>
      </div>

      {/* Shortcuts Help */}
      <div className="text-xs text-muted-foreground text-center">
        {t("shortcuts")}: Space = {t("playPause")}, ← → = {t("skip")}, M = {t("mute")}
      </div>
    </div>
  )
}
