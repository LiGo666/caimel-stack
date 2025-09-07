import { VoiceTrainingConfig, VoiceModel } from '../types'
import { TTSEngineFactory } from './tts-engine'
import { minioService } from '@/src/features/file-upload/lib/minio-client'

export class VoiceTrainer {
  static async trainVoice(config: VoiceTrainingConfig): Promise<string> {
    const engine = TTSEngineFactory.createEngine(config.modelType)
    
    if (!engine.capabilities.supportsFineTuning) {
      throw new Error(`Model type ${config.modelType} does not support fine-tuning`)
    }

    // Train the voice model
    const modelId = await engine.trainVoice(config)
    
    return modelId
  }

  static async validateTrainingData(
    segments: string[], 
    minDuration: number = 300 // 5 minutes minimum
  ): Promise<{ valid: boolean; totalDuration: number; issues: string[] }> {
    const issues: string[] = []
    let totalDuration = 0

    if (segments.length < 10) {
      issues.push('Need at least 10 training segments')
    }

    // In production, would validate actual segment durations
    totalDuration = segments.length * 3.5 // Mock: 3.5 seconds per segment

    if (totalDuration < minDuration) {
      issues.push(`Total duration ${Math.round(totalDuration)}s is less than required ${minDuration}s`)
    }

    return {
      valid: issues.length === 0,
      totalDuration,
      issues
    }
  }

  static async getRecommendedHyperparameters(
    modelType: string,
    datasetSize: number
  ): Promise<Record<string, any>> {
    switch (modelType) {
      case 'XTTS_V2':
        return {
          epochs: datasetSize > 600 ? 1000 : 500,
          learningRate: 0.0001,
          batchSize: Math.min(8, Math.floor(datasetSize / 10)),
          gradientClipping: 1.0,
          warmupSteps: 100,
        }
      case 'COSYVOICE_2':
        throw new Error('CosyVoice 2 does not support fine-tuning')
      default:
        return {
          epochs: 500,
          learningRate: 0.0001,
          batchSize: 4,
          gradientClipping: 1.0,
        }
    }
  }
}
