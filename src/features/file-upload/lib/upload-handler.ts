import { minioService } from './minio-client'
import { AudioMetadata, MinioUploadResult } from '../types'
import { createHash } from 'crypto'

export class UploadHandler {
  private static readonly SUPPORTED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

  static async validateFile(file: File): Promise<void> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum of 500MB`)
    }

    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error(`File type ${file.type} not supported. Use MP3 or WAV files.`)
    }
  }

  static async uploadToMinio(
    episodeId: string, 
    file: File, 
    originalFilename: string
  ): Promise<MinioUploadResult> {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileExtension = originalFilename.split('.').pop()
    // Use the path format directly instead of calling the static method
    const objectName = `uploads/${episodeId}/source.${fileExtension}`
    
    const result = await minioService.uploadFile(
      'voice-episodes', 
      objectName, 
      fileBuffer, 
      file.type
    )

    return {
      key: objectName,
      bucket: 'voice-episodes',
      etag: result.etag,
      location: `minio://voice-episodes/${objectName}`
    }
  }

  static async extractAudioMetadata(file: File): Promise<AudioMetadata> {
    // For MVP, we'll extract basic metadata. In production, use FFprobe
    // This is a placeholder implementation
    return new Promise((resolve) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      
      audio.addEventListener('loadedmetadata', () => {
        const metadata: AudioMetadata = {
          duration: audio.duration || 0,
          sampleRate: 44100, // Default, should be extracted with FFprobe
          channels: 2, // Default, should be extracted with FFprobe  
          format: file.type,
        }
        URL.revokeObjectURL(url)
        resolve(metadata)
      })
      
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url)
        // Fallback metadata
        resolve({
          duration: 0,
          sampleRate: 44100,
          channels: 2,
          format: file.type,
        })
      })
      
      audio.src = url
    })
  }

  static generateFileHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex')
  }

  static generateEpisodeId(): string {
    return `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
