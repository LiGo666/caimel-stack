import { Job } from '../types'
import { jobQueue } from './redis-queue'

export abstract class BaseJobProcessor {
  protected abstract workerType: string
  protected abstract workerId: string
  protected running: boolean = false
  protected maxConcurrentJobs: number = 1

  async start(): Promise<void> {
    this.running = true
    console.log(`🚀 Starting ${this.workerType} worker ${this.workerId}`)
    
    // Process jobs concurrently
    const workers = Array.from({ length: this.maxConcurrentJobs }, () => this.processJobs())
    await Promise.all(workers)
  }

  async stop(): Promise<void> {
    this.running = false
    console.log(`🛑 Stopping ${this.workerType} worker ${this.workerId}`)
  }

  private async processJobs(): Promise<void> {
    while (this.running) {
      try {
        const job = await jobQueue.dequeueJob(this.workerType, this.workerId)
        
        if (job) {
          await this.processJob(job)
        } else {
          // No job available, short wait
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Error in job processor for ${this.workerType}:`, error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  protected async processJob(job: Job): Promise<void> {
    try {
      console.log(`📋 Processing job ${job.id} of type ${job.type}`)
      
      await jobQueue.updateJobProgress(job.id, 0, `Starting ${job.type}`)
      
      // Execute the specific job processing logic
      const result = await this.executeJob(job)
      
      await jobQueue.updateJobProgress(job.id, 100, 'Completed successfully')
      await jobQueue.completeJob(job.id, result)
      
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error)
      await jobQueue.failJob(job.id, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  protected abstract executeJob(job: Job): Promise<any>

  protected async updateProgress(jobId: string, progress: number, message?: string): Promise<void> {
    await jobQueue.updateJobProgress(jobId, progress, message)
  }
}

export class MockJobProcessor extends BaseJobProcessor {
  protected workerType = 'mock'
  protected workerId = `mock-${Date.now()}`

  protected async executeJob(job: Job): Promise<any> {
    // Simulate processing time
    const steps = ['Initializing', 'Processing', 'Finalizing']
    
    for (let i = 0; i < steps.length; i++) {
      await this.updateProgress(job.id, (i + 1) * 33, steps[i])
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return { 
      processed: true, 
      timestamp: new Date().toISOString(),
      inputData: job.inputData 
    }
  }
}
