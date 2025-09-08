import { MinioConfig } from "../types"
import { MINIO_HOST, MINIO_ACCESS_KEY, MINIO_SECRET_KEY } from "@/features/env"

// Default MinIO configuration using environment variables
export const defaultMinioConfig: MinioConfig = { endpoint: MINIO_HOST, accessKey: MINIO_ACCESS_KEY, secretKey: MINIO_SECRET_KEY }

// Helper function to create a custom MinIO configuration
export function createMinioConfig(customConfig?: Partial<MinioConfig>): MinioConfig {
   return { ...defaultMinioConfig, ...customConfig }
}
