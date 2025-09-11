"use server"

import { UploadSessionRepository, ProcessingJobRepository } from "../lib/file-upload-session-manager"
import { FileStatus, JobStatus, JobType } from "../types/database"
import { ApiResponse } from "@/features/secureApi"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { PrismaClient } from "@/repository/prisma"

// Initialize repositories
const uploadSessionRepo = new UploadSessionRepository()
const processingJobRepo = new ProcessingJobRepository()
const prisma = new PrismaClient()

// Schema for delete session
const deleteSessionSchema = z.object({ id: z.string().min(1) })

// Schema for retry job
const retryJobSchema = z.object({ jobId: z.string().min(1) })

/**
 * Get all upload sessions
 */
export async function getAllUploadSessionsAction(): Promise<ApiResponse> {
   try {
      // Get all sessions (limit to 100 most recent)
      console.log("Fetching all upload sessions...")
      const sessions = await uploadSessionRepo.findAll(100)
      console.log(`Found ${sessions.length} upload sessions`)
      
      // Log the first few sessions for debugging
      if (sessions.length > 0) {
         console.log("First session:", JSON.stringify(sessions[0], null, 2))
      } else {
         console.log("No sessions found in database")
         
         // Try direct Prisma query to verify
         const directResults = await prisma.uploadSession.findMany({ take: 5 })
         console.log(`Direct Prisma query found ${directResults.length} sessions`)
         if (directResults.length > 0) {
            console.log("First direct result:", JSON.stringify(directResults[0], null, 2))
         }
      }

      return { success: true, data: sessions }
   } catch (error) {
      console.error("Error fetching upload sessions:", error)
      return { success: false, toastTitle: "Error", toastDescription: "Failed to fetch upload sessions", toastType: "error", errorCode: "UPLOAD-001" }
   }
}

/**
 * Get upload sessions by status
 */
export async function getUploadSessionsByStatusAction(status: FileStatus): Promise<ApiResponse> {
   try {
      const sessions = await uploadSessionRepo.findByStatus(status)

      return { success: true, data: sessions }
   } catch (error) {
      console.error(`Error fetching ${status} upload sessions:`, error)
      return {
         success: false,
         toastTitle: "Error",
         toastDescription: `Failed to fetch ${status} upload sessions`,
         toastType: "error",
         errorCode: "UPLOAD-002",
      }
   }
}

/**
 * Delete an upload session
 */
export async function deleteUploadSessionAction(data: z.infer<typeof deleteSessionSchema>): Promise<ApiResponse> {
   try {
      // Validate input
      const validatedData = deleteSessionSchema.parse(data)

      // Get the session
      const session = await uploadSessionRepo.findById(validatedData.id)

      if (!session) {
         return { success: false, toastTitle: "Error", toastDescription: "Upload session not found", toastType: "error", errorCode: "UPLOAD-003" }
      }

      // Update status to DELETED
      await uploadSessionRepo.updateStatus(validatedData.id, FileStatus.DELETED)

      // Revalidate the path to update the UI
      revalidatePath("/admin/protected/fileUploadManager")

      return { success: true, toastTitle: "Success", toastDescription: "Upload session marked as deleted", toastType: "success" }
   } catch (error) {
      console.error("Error deleting upload session:", error)
      return { success: false, toastTitle: "Error", toastDescription: "Failed to delete upload session", toastType: "error", errorCode: "UPLOAD-004" }
   }
}

/**
 * Retry a failed job
 */
export async function retryJobAction(data: z.infer<typeof retryJobSchema>): Promise<ApiResponse> {
   try {
      // Validate input
      const validatedData = retryJobSchema.parse(data)

      // We need to use prisma directly as the repository doesn't have a method to reset a job
      // This is a special case for the admin interface
      await prisma.processingJob.update({
         where: { id: validatedData.jobId },
         data: { status: JobStatus.PENDING, attempts: 0, error: null, startedAt: null, completedAt: null },
      })

      // Revalidate the path to update the UI
      revalidatePath("/admin/protected/fileUploadManager")

      return { success: true, toastTitle: "Success", toastDescription: "Job has been queued for retry", toastType: "success" }
   } catch (error) {
      console.error("Error retrying job:", error)
      return { success: false, toastTitle: "Error", toastDescription: "Failed to retry job", toastType: "error", errorCode: "UPLOAD-005" }
   }
}

/**
 * Get job statistics
 */
export async function getJobStatsAction(): Promise<ApiResponse> {
   try {
      const stats = await processingJobRepo.getStats()

      return { success: true, data: stats }
   } catch (error) {
      console.error("Error fetching job statistics:", error)
      return { success: false, toastTitle: "Error", toastDescription: "Failed to fetch job statistics", toastType: "error", errorCode: "UPLOAD-006" }
   }
}
