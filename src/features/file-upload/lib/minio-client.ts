import { Client } from "minio"
import { env } from "@/features/env"
import { minioConfig } from "./minio-client-config"

// MinIO client for object storage
class MinioService {
   private client: Client

   constructor() {
      // Use the internal endpoint for server-side operations
      const endpoint = minioConfig.internalEndpoint.replace("http://", "").replace("https://", "")
      
      this.client = new Client({
         endPoint: endpoint,
         port: minioConfig.port,
         useSSL: minioConfig.useSSL,
         accessKey: env.MINIO_ACCESS_KEY,
         secretKey: env.MINIO_SECRET_KEY,
      })
   }
   
   // Get the appropriate endpoint URL for client-side operations
   getPublicEndpointUrl(): string {
      return minioConfig.externalEndpoint
   }

   async ensureBucket(bucketName: string): Promise<void> {
      const exists = await this.client.bucketExists(bucketName)
      if (!exists) {
         await this.client.makeBucket(bucketName)
      }
   }

   async uploadFile(bucketName: string, objectName: string, fileBuffer: Buffer, contentType?: string): Promise<{ etag: string; versionId?: string }> {
      await this.ensureBucket(bucketName)

      const metadata: Record<string, string> = {}
      if (contentType) {
         metadata["Content-Type"] = contentType
      }

      return await this.client.putObject(bucketName, objectName, fileBuffer, fileBuffer.length, metadata)
   }

   async getSignedUrl(bucketName: string, objectName: string, expirySeconds: number = 3600): Promise<string> {
      // Generate the presigned URL
      const presignedUrl = await this.client.presignedGetObject(bucketName, objectName, expirySeconds)
      
      // Get the internal endpoint used by the client
      const internalEndpoint = minioConfig.internalEndpoint.replace("http://", "").replace("https://", "")
      
      // Replace the internal endpoint with the external endpoint for client-side access
      const externalUrl = presignedUrl.replace(
         internalEndpoint,
         new URL(minioConfig.externalEndpoint).host
      )
      
      // Ensure we're using HTTPS for the external URL
      return externalUrl.replace("http://", "https://")
   }

   async generatePresignedPutUrl(bucketName: string, objectName: string, contentType: string, expirySeconds: number = 3600): Promise<string> {
      await this.ensureBucket(bucketName)
      
      // Generate the presigned URL
      const presignedUrl = await this.client.presignedPutObject(bucketName, objectName, expirySeconds)
      
      // Get the internal endpoint used by the client
      const internalEndpoint = minioConfig.internalEndpoint.replace("http://", "").replace("https://", "")
      
      // Replace the internal endpoint with the external endpoint for client-side access
      const externalUrl = presignedUrl.replace(
         internalEndpoint,
         new URL(minioConfig.externalEndpoint).host
      )
      
      // Ensure we're using HTTPS for the external URL
      return externalUrl.replace("http://", "https://")
   }

   async deleteFile(bucketName: string, objectName: string): Promise<void> {
      await this.client.removeObject(bucketName, objectName)
   }

   async getObjectInfo(bucketName: string, objectName: string) {
      return await this.client.statObject(bucketName, objectName)
   }

   // Generate standardized storage paths
   static getEpisodePath(episodeId: string, filename: string): string {
      return `uploads/${episodeId}/${filename}`
   }

   static getTranscriptPath(episodeId: string): string {
      return `transcripts/${episodeId}/whisperx.json`
   }

   static getDiarizationPath(episodeId: string): string {
      return `diarization/${episodeId}/segments.rttm`
   }

   static getEmbeddingPath(episodeId: string, speakerHash: string): string {
      return `embeddings/${episodeId}/spk-${speakerHash}.npy`
   }

   static getVoicePath(speakerId: string, modelType: string, version: string): string {
      return `voices/${speakerId}/${modelType}/v${version}/`
   }

   static getSynthesisPath(speakerId: string, requestId: string): string {
      return `synth/${speakerId}/${requestId}/output.wav`
   }
}

export const minioService = new MinioService()
