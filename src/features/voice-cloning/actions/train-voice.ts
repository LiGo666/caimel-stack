"use server"

import { getTranslations } from "next-intl/server"
import { ApiResponse } from "@/src/features/secureApi"
import { assertRatelimit } from "@/src/features/secureApi"
import { unexpectedErrorToastContent } from "@/src/features/toast/lib/unexpectedErrorToastContent"
import { prisma } from "@/src/repository/prisma"
import { jobQueue } from "@/src/features/job-queue"
import { VoiceTrainer } from "../lib/voice-trainer"
import { z } from "zod"
import { getCurrentUserId } from "@/src/features/next-auth"

const TrainVoiceSchema = z.object({
  speakerId: z.string().min(1),
  modelType: z.enum(['XTTS_V2', 'COSYVOICE_2']),
  segments: z.array(z.string()).min(10, 'Need at least 10 training segments'),
  hyperparameters: z.object({
    epochs: z.number().int().min(100).max(2000),
    learningRate: z.number().min(0.00001).max(0.01),
    batchSize: z.number().int().min(1).max(32),
  }).optional()
})

export async function trainVoice(
  input: z.infer<typeof TrainVoiceSchema>
): Promise<ApiResponse<{ voiceModelId: string; jobId: string }>> {
  const t = await getTranslations("app.voices.train.action")
  const tGeneric = await getTranslations("generic")

  try {
    // Security check
    const rateLimitResult = await assertRatelimit("GENERAL_ENDPOINTS")
    if (!rateLimitResult.success) return rateLimitResult

    // Get current user
    const userId = await getCurrentUserId()
    if (!userId) {
      return {
        success: false,
        toastTitle: t("error.unauthorized.title"),
        toastDescription: t("error.unauthorized.description"),
        toastType: "error",
      }
    }

    // Validate input
    const validation = TrainVoiceSchema.safeParse(input)
    if (!validation.success) {
      return {
        success: false,
        toastTitle: t("error.validation.title"),
        toastDescription: validation.error.issues[0]?.message || t("error.validation.description"),
        toastType: "error",
      }
    }

    const { speakerId, modelType, segments, hyperparameters } = validation.data

    // Validate training data
    const dataValidation = await VoiceTrainer.validateTrainingData(segments)
    if (!dataValidation.valid) {
      return {
        success: false,
        toastTitle: t("error.insufficientData.title"),
        toastDescription: dataValidation.issues.join(', '),
        toastType: "error",
      }
    }

    // Get recommended hyperparameters if not provided
    const finalHyperparameters = hyperparameters || 
      await VoiceTrainer.getRecommendedHyperparameters(modelType, segments.length)

    // Create voice model record
    const voiceModel = await prisma.voiceModel.create({
      data: {
        speakerId,
        modelType,
        version: "1",
        s3KeyModel: "", // Will be updated when training completes
        trainingDuration: dataValidation.totalDuration,
        trainingSegments: segments.length,
        hyperparameters: finalHyperparameters,
        isReady: false,
      }
    })

    // Queue training job
    const jobId = await jobQueue.enqueueJob({
      type: 'TTS_TRAINING',
      voiceModelId: voiceModel.id,
      priority: 'HIGH',
      inputData: {
        voiceModelId: voiceModel.id,
        speakerId,
        trainingConfig: {
          speakerId,
          modelType,
          segments,
          hyperparameters: finalHyperparameters
        }
      }
    })

    return {
      success: true,
      data: {
        voiceModelId: voiceModel.id,
        jobId,
      },
      toastTitle: t("success.title"),
      toastDescription: t("success.description", { segments: segments.length }),
      toastType: "success",
    }
  } catch (error) {
    console.error('Train voice error:', error)
    return unexpectedErrorToastContent(tGeneric, "ERROR-TRAIN-001")
  }
}
