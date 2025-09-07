import { z } from 'zod'

// Job queue types and schemas
export const JobPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export const JobStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING'])
export const JobTypeSchema = z.enum([
  'AUDIO_UPLOAD',
  'TRANSCRIPTION', 
  'DIARIZATION',
  'EMBEDDING_EXTRACTION',
  'SPEAKER_CLUSTERING',
  'DATASET_CURATION',
  'TTS_TRAINING',
  'TTS_SYNTHESIS',
  'QUALITY_EVALUATION'
])

export type JobPriority = z.infer<typeof JobPrioritySchema>
export type JobStatus = z.infer<typeof JobStatusSchema>
export type JobType = z.infer<typeof JobTypeSchema>

export interface JobInput {
  type: JobType
  episodeId?: string
  voiceModelId?: string
  synthesisRequestId?: string
  priority?: JobPriority
  inputData: Record<string, any>
  dependencies?: string[]
  maxRetries?: number
}

export interface Job {
  id: string
  type: JobType
  priority: JobPriority
  status: JobStatus
  progress: number
  errorMessage?: string
  retryCount: number
  maxRetries: number
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number
  actualDuration?: number
  workerId?: string
  inputData: Record<string, any>
  outputData?: Record<string, any>
  dependencies: string[]
  episodeId?: string
  voiceModelId?: string
  synthesisRequestId?: string
  createdAt: Date
  updatedAt: Date
}

export interface JobProgress {
  jobId: string
  progress: number
  stage: string
  message?: string
  estimatedTimeRemaining?: number
}

export interface WorkerMetrics {
  workerId: string
  workerType: string
  isOnline: boolean
  currentJobs: number
  maxJobs: number
  totalProcessed: number
  averageProcessingTime: number
  lastHeartbeat: Date
  gpuUtilization?: number
  memoryUsage?: number
}
