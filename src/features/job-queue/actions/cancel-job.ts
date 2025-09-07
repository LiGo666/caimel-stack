"use server"

import { z } from "zod"
import { prisma } from "@/repository/prisma"
import { redis } from "@/features/redis"
import { assertRatelimit, type ApiResponse } from "@/features/secureApi"

// Schema for cancelling a job
export const CancelJobSchema = z.object({ jobId: z.string(), reason: z.string().optional() })

export type CancelJobInput = z.infer<typeof CancelJobSchema>

// Cancel a job by ID
export async function cancelJob({ jobId, reason }: CancelJobInput): Promise<ApiResponse> {
   // Validate input
   const parseResult = CancelJobSchema.safeParse({ jobId, reason })
   if (!parseResult.success) {
      return {
         success: false,
         errorCode: "VALIDATION_ERROR",
         toastType: "error",
         toastTitle: "Invalid input",
         toastDescription: "Please check your input and try again",
         timestamp: new Date().toISOString(),
         httpStatus: 400,
      }
   }

   // Apply rate limiting
   const rateLimit = await assertRatelimit("GENERAL_ENDPOINTS")
   if (!rateLimit.success) {
      return rateLimit
   }

   // Find the job first
   const job = await prisma.job.findUnique({ where: { id: jobId } })

   if (!job) {
      return {
         success: false,
         errorCode: "NOT_FOUND",
         toastType: "error",
         toastTitle: "Job not found",
         toastDescription: "The requested job could not be found",
         timestamp: new Date().toISOString(),
         httpStatus: 404,
      }
   }

   // Check if job can be cancelled (not already completed or failed)
   if (job.status === "COMPLETED" || job.status === "FAILED") {
      return {
         success: false,
         errorCode: "INVALID_STATE",
         toastType: "error",
         toastTitle: "Cannot cancel job",
         toastDescription: `Cannot cancel job with status ${job.status}`,
         timestamp: new Date().toISOString(),
         httpStatus: 400,
      }
   }

   try {
      // Update job status in database
      await prisma.job.update({
         where: { id: jobId },
         data: { status: "CANCELLED", errorMessage: reason || "Job cancelled by user", completedAt: new Date() },
      })

      // Update job status in Redis
      await redis.hSet(`job:${jobId}`, {
         status: "CANCELLED",
         errorMessage: reason || "Job cancelled by user",
         completedAt: new Date().toISOString(),
      })

      // Publish cancellation event
      await redis.publish(
         `job:cancelled:${jobId}`,
         JSON.stringify({ jobId, reason: reason || "Job cancelled by user", timestamp: new Date().toISOString() }),
      )

      return {
         success: true,
         data: { jobId },
         toastType: "success",
         toastTitle: "Job cancelled",
         toastDescription: "Job cancelled successfully",
         timestamp: new Date().toISOString(),
      }
   } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error)
      return {
         success: false,
         errorCode: "DATABASE_ERROR",
         toastType: "error",
         toastTitle: "Error cancelling job",
         toastDescription: error instanceof Error ? error.message : "Unknown error occurred",
         timestamp: new Date().toISOString(),
         httpStatus: 500,
      }
   }
}

// Schema for cancelling episode jobs
export const CancelEpisodeJobsSchema = z.object({ episodeId: z.string(), reason: z.string().optional() })

// Cancel all jobs for a specific episode
export async function cancelJobsByEpisodeId(params: z.infer<typeof CancelEpisodeJobsSchema>): Promise<ApiResponse> {
   // Validate input
   const parseResult = CancelEpisodeJobsSchema.safeParse(params)
   if (!parseResult.success) {
      return {
         success: false,
         errorCode: "VALIDATION_ERROR",
         toastType: "error",
         toastTitle: "Invalid input",
         toastDescription: "Please check your input and try again",
         timestamp: new Date().toISOString(),
         httpStatus: 400,
      }
   }

   const { episodeId, reason } = params

   // Apply rate limiting
   const rateLimit = await assertRatelimit("GENERAL_ENDPOINTS")
   if (!rateLimit.success) {
      return rateLimit
   }

   try {
      // Find all active jobs for this episode
      const jobs = await prisma.job.findMany({ where: { episodeId, status: { in: ["QUEUED", "RUNNING", "RETRYING"] } } })

      if (jobs.length === 0) {
         return {
            success: true,
            data: { count: 0 },
            toastType: "info",
            toastTitle: "No jobs to cancel",
            toastDescription: "No active jobs found for this episode",
            timestamp: new Date().toISOString(),
         }
      }

      // Update all jobs in database
      await prisma.job.updateMany({
         where: { episodeId, status: { in: ["QUEUED", "RUNNING", "RETRYING"] } },
         data: { status: "CANCELLED", errorMessage: reason || "Jobs cancelled by user", completedAt: new Date() },
      })

      // Update each job in Redis and publish cancellation events
      for (const job of jobs) {
         await redis.hSet(`job:${job.id}`, {
            status: "CANCELLED",
            errorMessage: reason || "Job cancelled by user",
            completedAt: new Date().toISOString(),
         })

         await redis.publish(
            `job:cancelled:${job.id}`,
            JSON.stringify({ jobId: job.id, reason: reason || "Job cancelled by user", timestamp: new Date().toISOString() }),
         )
      }

      return {
         success: true,
         data: { count: jobs.length },
         toastType: "success",
         toastTitle: "Jobs cancelled",
         toastDescription: `Successfully cancelled ${jobs.length} jobs for episode ${episodeId}`,
         timestamp: new Date().toISOString(),
      }
   } catch (error) {
      console.error(`Error cancelling jobs for episode ${episodeId}:`, error)
      return {
         success: false,
         errorCode: "DATABASE_ERROR",
         toastType: "error",
         toastTitle: "Error cancelling jobs",
         toastDescription: error instanceof Error ? error.message : "Unknown error occurred",
         timestamp: new Date().toISOString(),
         httpStatus: 500,
      }
   }
}
