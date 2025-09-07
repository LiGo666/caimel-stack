import { z } from 'zod'

// Voice cloning types and schemas
export const TTSModelTypeSchema = z.enum(['XTTS_V2', 'COSYVOICE_2', 'CUSTOM'])
export const SynthesisTypeSchema = z.enum(['ZERO_SHOT', 'FINE_TUNED', 'STYLE_TRANSFER'])
export const SynthesisStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])

export type TTSModelType = z.infer<typeof TTSModelTypeSchema>
export type SynthesisType = z.infer<typeof SynthesisTypeSchema>
export type SynthesisStatus = z.infer<typeof SynthesisStatusSchema>

export const SynthesisRequestSchema = z.object({
  speakerId: z.string().optional(),
  voiceModelId: z.string().optional(),
  inputText: z.string().min(1, 'Text is required').max(5000, 'Text too long'),
  synthesisType: SynthesisTypeSchema.default('ZERO_SHOT'),
  parameters: z.object({
    speed: z.number().min(0.5).max(2.0).default(1.0),
    pitch: z.number().min(0.5).max(2.0).default(1.0),
    emotion: z.string().optional(),
    style: z.string().optional(),
  }).optional()
})

export type SynthesisRequestInput = z.infer<typeof SynthesisRequestSchema>

export interface VoiceTrainingConfig {
  speakerId: string
  modelType: TTSModelType
  trainingSegments: string[]
  hyperparameters: {
    epochs: number
    learningRate: number
    batchSize: number
    gradientClipping: number
    [key: string]: any
  }
}

export interface VoiceModel {
  id: string
  speakerId: string
  modelType: TTSModelType
  version: string
  s3KeyModel: string
  s3KeyConfig?: string
  trainingDuration: number
  trainingSegments: number
  qualityScore?: number
  isReady: boolean
  errorMessage?: string
  hyperparameters?: Record<string, any>
  checksumModel?: string
  createdAt: Date
  updatedAt: Date
}

export interface SynthesisResult {
  id: string
  outputS3Key: string
  duration: number
  qualityScore?: number
  parameters?: Record<string, any>
  provenanceData: {
    modelId?: string
    modelVersion?: string
    engineVersion: string
    timestamp: string
    inputHash: string
  }
}

export interface TTSEngineCapabilities {
  modelType: TTSModelType
  supportsZeroShot: boolean
  supportsFineTuning: boolean
  supportsEmotionControl: boolean
  supportsSpeedControl: boolean
  supportsPitchControl: boolean
  maxTextLength: number
  supportedLanguages: string[]
}

export interface VoiceCharacteristics {
  gender: 'male' | 'female' | 'other' | 'unknown'
  ageRange?: string
  accent?: string
  pitch: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
  tempo: 'very_slow' | 'slow' | 'medium' | 'fast' | 'very_fast'
  roughness: number // 0-1 scale
  breathiness: number // 0-1 scale
  strain: number // 0-1 scale
}
