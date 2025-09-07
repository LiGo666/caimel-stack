"use server"

import { getTranslations } from "next-intl/server"
import { ApiResponse } from "@/features/secureApi"
import { assertRatelimit } from "@/features/secureApi"
import { unexpectedErrorToastContent } from "@/features/toast/lib/unexpectedErrorToastContent"
import { prisma } from "@/repository/prisma"
import { jobQueue } from "@/features/job-queue"
import { z } from "zod"
import { auth } from "@clerk/nextjs/server"

const SynthesizeSpeechSchema = z.object({
   speakerId: z.string().optional(),
   voiceModelId: z.string().optional(),
   inputText: z.string().min(1, "Text is required").max(5000, "Text too long"),
   synthesisType: z.enum(["ZERO_SHOT", "FINE_TUNED", "STYLE_TRANSFER"]).default("ZERO_SHOT"),
   parameters: z
      .object({
         speed: z.number().min(0.5).max(2.0).default(1.0),
         pitch: z.number().min(0.5).max(2.0).default(1.0),
         language: z.string().default("en"),
         emotion: z.string().optional(),
         style: z.string().optional(),
      })
      .optional(),
})

export async function synthesizeSpeech(
   input: z.infer<typeof SynthesizeSpeechSchema>,
): Promise<ApiResponse> {
   const t = await getTranslations("app.synthesis.action")
   const tGeneric = await getTranslations("generic")

   try {
      // Security check
      const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS")
      if (!rateLimitResult.success) return rateLimitResult

      // Get current user
      const session = await auth()
      const userId = session.userId
      if (!userId) {
         return {
            success: false,
            toastTitle: t("error.unauthorized.title"),
            toastDescription: t("error.unauthorized.description"),
            toastType: "error",
         }
      }

      // Validate input
      const validation = SynthesizeSpeechSchema.safeParse(input)
      if (!validation.success) {
         return {
            success: false,
            toastTitle: t("error.validation.title"),
            toastDescription: validation.error.issues[0]?.message || t("error.validation.description"),
            toastType: "error",
         }
      }

      const { speakerId, voiceModelId, inputText, synthesisType, parameters } = validation.data

      // Validate that either speakerId or voiceModelId is provided
      if (!speakerId && !voiceModelId) {
         return { success: false, toastTitle: t("error.noVoice.title"), toastDescription: t("error.noVoice.description"), toastType: "error" }
      }

      // If using fine-tuned model, verify it exists and is ready
      if (voiceModelId) {
         const voiceModel = await prisma.voiceModel.findUnique({ where: { id: voiceModelId } })

         if (!voiceModel) {
            return {
               success: false,
               toastTitle: t("error.voiceModelNotFound.title"),
               toastDescription: t("error.voiceModelNotFound.description"),
               toastType: "error",
            }
         }

         if (!voiceModel.isReady) {
            return {
               success: false,
               toastTitle: t("error.voiceModelNotReady.title"),
               toastDescription: t("error.voiceModelNotReady.description"),
               toastType: "error",
            }
         }
      }

      // Create synthesis request
      const synthesisRequest = await prisma.synthesisRequest.create({
         data: {
            speakerId,
            voiceModelId,
            requestedBy: userId,
            inputText,
            synthesisType,
            status: "PENDING",
            parameters: parameters ? JSON.stringify(parameters) : null,
         },
      })

      // Queue synthesis job
      const jobId = await jobQueue.enqueueJob({
         type: "TTS_SYNTHESIS",
         synthesisRequestId: synthesisRequest.id,
         priority: "NORMAL",
         inputData: { synthesisRequestId: synthesisRequest.id, speakerId, voiceModelId, inputText, synthesisType, parameters: parameters || {} },
      })

      return {
         success: true,
         data: { synthesisRequestId: synthesisRequest.id, jobId },
         toastTitle: t("success.title"),
         toastDescription: t("success.description"),
         toastType: "success",
      }
   } catch (error) {
      console.error("Synthesize speech error:", error)
      return unexpectedErrorToastContent(tGeneric, "ERROR-234277")
   }
}
