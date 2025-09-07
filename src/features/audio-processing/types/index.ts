import { z } from 'zod'

// Audio processing types and schemas
export interface AudioSegment {
  startTime: number
  endTime: number
  duration: number
  s3Key?: string
  confidence?: number
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[]
  language: string
  duration: number
  wordCount: number
}

export interface TranscriptionSegment {
  startTime: number
  endTime: number
  text: string
  confidence: number
  words: WordTimestamp[]
}

export interface WordTimestamp {
  word: string
  startTime: number
  endTime: number
  confidence: number
}

export interface DiarizationResult {
  segments: DiarizationSegment[]
  speakers: SpeakerInfo[]
  totalDuration: number
}

export interface DiarizationSegment {
  startTime: number
  endTime: number
  speakerId: string
  confidence: number
}

export interface SpeakerInfo {
  id: string
  segments: number
  totalDuration: number
  averageConfidence: number
}

export interface SpeakerEmbedding {
  speakerId: string
  embedding: number[]
  modelName: string
  modelVersion: string
  confidence: number
  segmentInfo?: {
    startTime: number
    endTime: number
  }
}

export interface AudioQualityMetrics {
  snr: number // Signal-to-noise ratio
  speechRatio: number // Ratio of speech to total audio
  silenceRatio: number
  musicDetected: boolean
  noiseLevel: number
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor'
}

export const AudioFormatSchema = z.enum(['mp3', 'wav', 'flac', 'ogg'])
export type AudioFormat = z.infer<typeof AudioFormatSchema>

export interface FFmpegOptions {
  sampleRate?: number
  channels?: number
  bitrate?: string
  format: AudioFormat
  startTime?: number
  duration?: number
}
