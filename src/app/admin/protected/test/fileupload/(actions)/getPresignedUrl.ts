"use server"

import { generatePresignedUrl, FileUploadConfig } from "@/features/file-upload"

export async function exampleGetPresignedUrl(fileName: string, fileType: string, fileSize: number) {
   const customConfig: Partial<FileUploadConfig> = {
      // Server-side configuration that overrides client-side settings
      bucketName: "uploads-wow",
      uploadFolder: "sexyshit666",
      allowedFileTypes: ["image/jpeg", "image/png", "image/gif", "application/pdf"],
      maxFileSize: 300 * 1024 * 1024, // 300MB
      maxFiles: 5, // Maximum number of files allowed
   }

   return generatePresignedUrl({ fileName, fileType, fileSize }, customConfig)
}
