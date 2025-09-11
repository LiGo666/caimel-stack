"use server"

import { generateFileUploadUrl, FileUploadConfig } from "@/features/file-upload"

export async function generateFileUploadUrlAction(fileName: string, fileType: string, fileSize: number) {
   const customConfig: Partial<FileUploadConfig> = {
      // Server-side configuration that overrides client-side settings
      bucketName: "ups",
      uploadFolder: "sexyshit666",
      allowedFileTypes: ["audio/mpeg"],
      maxFileSize: 300 * 1024 * 1024, // 300MB
      maxFiles: 1, // Maximum number of files allowed
   }

   return generateFileUploadUrl({ fileName, fileType, fileSize }, customConfig)
}
