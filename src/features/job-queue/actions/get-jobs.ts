"use server"

import { z } from "zod"
import { prisma } from "@/repository/prisma"
import { JobStatusSchema, JobTypeSchema, JobPrioritySchema, type Job } from "../types"
import { assertRatelimit, type ApiResponse } from "@/features/secureApi"

// Schema for filtering jobs
export const GetJobsFilterSchema = z.object({
   status: JobStatusSchema.optional(),
   type: JobTypeSchema.optional(),
   priority: JobPrioritySchema.optional(),
   episodeId: z.string().optional(),
   voiceModelId: z.string().optional(),
   synthesisRequestId: z.string().optional(),
   limit: z.number().int().min(1).max(100).default(20),
   offset: z.number().int().min(0).default(0),
})

export type GetJobsFilter = z.infer<typeof GetJobsFilterSchema>

// Get jobs with optional filtering
export async function getJobs(filter: GetJobsFilter): Promise<any> {
   // Validate input using schema
   const parseResult = GetJobsFilterSchema.safeParse(filter)
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

   try {
      const { status, type, priority, episodeId, voiceModelId, synthesisRequestId, limit, offset } = filter

      // Build where clause based on filters
      const where = {
         ...(status && { status }),
         ...(type && { type }),
         ...(priority && { priority }),
         ...(episodeId && { episodeId }),
         ...(voiceModelId && { voiceModelId }),
         ...(synthesisRequestId && { synthesisRequestId }),
      }

      // Get jobs with pagination
      const [jobs, total] = await Promise.all([
         prisma.job.findMany({ where, orderBy: [{ createdAt: "desc" }], take: limit, skip: offset }),
         prisma.job.count({ where }),
      ])

      return { success: true, data: { jobs: jobs as Job[], total }, timestamp: new Date().toISOString() }
   } catch (error) {
      console.error("Error fetching jobs:", error)
      return {
         success: false,
         errorCode: "DATABASE_ERROR",
         toastType: "error",
         toastTitle: "Error fetching jobs",
         toastDescription: error instanceof Error ? error.message : "An unknown error occurred",
         timestamp: new Date().toISOString(),
         httpStatus: 500,
      }
   }
}

// Get a single job by ID
export async function getJobById({ jobId }: { jobId: string }): Promise<any> {
   // Validate input
   if (!jobId) {
      return {
         success: false,
         errorCode: "VALIDATION_ERROR",
         toastType: "error",
         toastTitle: "Invalid input",
         toastDescription: "Job ID is required",
         timestamp: new Date().toISOString(),
         httpStatus: 400,
      }
   }

   // Apply rate limiting
   const rateLimit = await assertRatelimit("GENERAL_ENDPOINTS")
   if (!rateLimit.success) {
      return rateLimit
   }

   try {
      const job = await prisma.job.findUnique({ where: { id: jobId } })

      return { success: true, data: job as Job | null, timestamp: new Date().toISOString() }
   } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error)
      return {
         success: false,
         errorCode: "DATABASE_ERROR",
         toastType: "error",
         toastTitle: "Error fetching job",
         toastDescription: error instanceof Error ? error.message : "An unknown error occurred",
         timestamp: new Date().toISOString(),
         httpStatus: 500,
      }
   }
}

// Schema for episode jobs query
export const EpisodeJobsSchema = z.object({
   episodeId: z.string(),
   limit: z.number().int().min(1).max(100).default(20),
   offset: z.number().int().min(0).default(0),
})

// Get jobs for a specific episode
export async function getJobsByEpisodeId(params: z.infer<typeof EpisodeJobsSchema>): Promise<any> {
   // Validate input
   const parseResult = EpisodeJobsSchema.safeParse(params)
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

   const { episodeId, limit, offset } = params

   // Apply rate limiting
   const rateLimit = await assertRatelimit("GENERAL_ENDPOINTS")
   if (!rateLimit.success) {
      return rateLimit
   }

   try {
      const [jobs, total] = await Promise.all([
         prisma.job.findMany({ where: { episodeId }, orderBy: [{ createdAt: "desc" }], take: limit, skip: offset }),
         prisma.job.count({ where: { episodeId } }),
      ])

      return { success: true, data: { jobs: jobs as Job[], total }, timestamp: new Date().toISOString() }
   } catch (error) {
      console.error(`Error fetching jobs for episode ${episodeId}:`, error)
      return {
         success: false,
         errorCode: "DATABASE_ERROR",
         toastType: "error",
         toastTitle: "Error fetching episode jobs",
         toastDescription: error instanceof Error ? error.message : "An unknown error occurred",
         timestamp: new Date().toISOString(),
         httpStatus: 500,
      }
   }
}
