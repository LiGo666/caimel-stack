import { env } from "@/features/env"

// Configuration for MinIO client
export const minioConfig = {
   // Internal endpoint for server-side operations
   internalEndpoint: env.MINIO_ENDPOINT,

   // External endpoint for client-side direct uploads
   externalEndpoint: env.MINIO_ENDPOINT,

   // Default port (not used for external endpoint which uses standard HTTPS port)
   port: 9000,

   // Use SSL for external endpoint, not for internal Docker network communication
   useSSL: false,

   // Credentials
   accessKey: env.MINIO_ACCESS_KEY,
   secretKey: env.MINIO_SECRET_KEY,
}
