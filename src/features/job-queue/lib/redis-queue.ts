import { redis, redisReady } from '@/features/redis'
import { JobInput, Job, JobStatus, JobPriority } from '../types'
import { prisma } from '@/repository/prisma'

class RedisQueue {
  private connected: boolean = false

  constructor() {
    // Using the shared redis client from @/features/redis
    // The client is already configured and connected
    redisReady.then(() => {
      this.connected = true
      console.log('✅ Redis queue connected')
    }).catch((err) => {
      console.error('❌ Redis queue error:', err)
      this.connected = false
    })
  }

  async enqueueJob(input: JobInput): Promise<string> {
    // Create job in database
    const job = await prisma.job.create({
      data: {
        type: input.type,
        priority: input.priority || 'NORMAL',
        status: 'QUEUED',
        inputData: input.inputData,
        dependencies: input.dependencies || [],
        maxRetries: input.maxRetries || 3,
        episodeId: input.episodeId,
        voiceModelId: input.voiceModelId,
        synthesisRequestId: input.synthesisRequestId,
      }
    })

    // Add to Redis queue based on priority and type
    const queueKey = this.getQueueKey(input.type, input.priority || 'NORMAL')
    await redis.lPush(queueKey, job.id)

    // Set job metadata
    await redis.hSet(`job:${job.id}`, {
      id: job.id,
      type: input.type,
      priority: input.priority || 'NORMAL',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
    })

    console.log(`📋 Enqueued job ${job.id} of type ${input.type}`)
    return job.id
  }

  async dequeueJob(workerType: string, workerId: string): Promise<Job | null> {
    const queueKeys = this.getQueueKeysForWorker(workerType)
    
    // Try to get job from priority queues (URGENT -> HIGH -> NORMAL -> LOW)
    for (const queueKey of queueKeys) {
      const jobId = await redis.brPop(queueKey, 1) // 1 second timeout
      
      if (jobId && jobId[1]) {
        const job = await prisma.job.findUnique({ 
          where: { id: jobId[1] }
        })

        if (job && job.status === 'QUEUED') {
          // Check dependencies are completed
          if (job.dependencies.length > 0) {
            const dependencies = await prisma.job.findMany({
              where: { id: { in: job.dependencies } }
            })
            
            const allCompleted = dependencies.every(dep => dep.status === 'COMPLETED')
            if (!allCompleted) {
              // Re-queue job if dependencies not ready
              await redis.lPush(queueKey, jobId[1])
              continue
            }
          }

          // Mark job as running
          await prisma.job.update({
            where: { id: job.id },
            data: { 
              status: 'RUNNING',
              startedAt: new Date(),
              workerId,
            }
          })

          await redis.hSet(`job:${job.id}`, {
            status: 'RUNNING',
            startedAt: new Date().toISOString(),
            workerId,
          })

          return job
        }
      }
    }

    return null
  }

  async updateJobProgress(jobId: string, progress: number, message?: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { progress }
    })

    await redis.hSet(`job:${jobId}`, {
      progress: progress.toString(),
      lastUpdate: new Date().toISOString(),
      ...(message && { message })
    })

    // Publish progress update
    await redis.publish(`job:progress:${jobId}`, JSON.stringify({
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString()
    }))
  }

  async completeJob(jobId: string, outputData?: Record<string, any>): Promise<void> {
    const completedAt = new Date()
    
    // First get the job to access startedAt
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId }
    })
    
    const job = await prisma.job.update({
      where: { id: jobId },
      data: { 
        status: 'COMPLETED',
        progress: 100,
        completedAt,
        outputData,
        actualDuration: existingJob?.startedAt ? 
          Math.round((completedAt.getTime() - existingJob.startedAt.getTime()) / 1000) : 
          undefined
      }
    })

    await redis.hSet(`job:${jobId}`, {
      status: 'COMPLETED',
      progress: '100',
      completedAt: completedAt.toISOString(),
    })

    console.log(`✅ Completed job ${jobId}`)
  }

  async failJob(jobId: string, error: string): Promise<void> {
    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return

    if (job.retryCount < job.maxRetries) {
      // Retry job
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: 'RETRYING',
          retryCount: job.retryCount + 1,
          errorMessage: error,
        }
      })

      // Re-queue with delay
      setTimeout(async () => {
        const queueKey = this.getQueueKey(job.type, job.priority)
        await redis.lPush(queueKey, jobId)
        
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'QUEUED' }
        })
      }, Math.pow(2, job.retryCount) * 1000) // Exponential backoff
      
      console.log(`🔄 Retrying job ${jobId} (attempt ${job.retryCount + 1})`)
    } else {
      // Mark as failed
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: 'FAILED',
          errorMessage: error,
          completedAt: new Date(),
        }
      })

      await redis.hSet(`job:${jobId}`, {
        status: 'FAILED',
        errorMessage: error,
        completedAt: new Date().toISOString(),
      })

      console.error(`❌ Failed job ${jobId}: ${error}`)
    }
  }

  private getQueueKey(jobType: string, priority: JobPriority): string {
    return `queue:${jobType}:${priority}`
  }

  private getQueueKeysForWorker(workerType: string): string[] {
    const jobTypes = this.getJobTypesForWorker(workerType)
    const priorities: JobPriority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW']
    
    const queueKeys: string[] = []
    for (const priority of priorities) {
      for (const jobType of jobTypes) {
        queueKeys.push(this.getQueueKey(jobType, priority))
      }
    }
    return queueKeys
  }

  private getJobTypesForWorker(workerType: string): string[] {
    switch (workerType) {
      case 'asr':
        return ['TRANSCRIPTION']
      case 'diarization':
        return ['DIARIZATION', 'EMBEDDING_EXTRACTION', 'SPEAKER_CLUSTERING']
      case 'tts':
        return ['TTS_TRAINING', 'TTS_SYNTHESIS']
      case 'curator':
        return ['DATASET_CURATION']
      case 'evaluator':
        return ['QUALITY_EVALUATION']
      default:
        return []
    }
  }

  async getQueueStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {}
    const jobTypes = ['TRANSCRIPTION', 'DIARIZATION', 'EMBEDDING_EXTRACTION', 'SPEAKER_CLUSTERING', 'TTS_TRAINING', 'TTS_SYNTHESIS']
    const priorities: JobPriority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW']

    for (const jobType of jobTypes) {
      for (const priority of priorities) {
        const queueKey = this.getQueueKey(jobType, priority)
        const count = await redis.lLen(queueKey)
        stats[`${jobType}:${priority}`] = count
      }
    }

    return stats
  }
}

export const jobQueue = new RedisQueue()
