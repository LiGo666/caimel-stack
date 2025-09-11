"use server"

import { generateFileUploadUrl, FileUploadConfig } from "@/features/file-upload"

export async function generateFileUploadUrlAction(fileName: string, fileType: string, fileSize: number) {
   const customConfig: Partial<FileUploadConfig> = {
      // Server-side configuration that overrides client-side settings
      bucketName: "ups-hehe",
      uploadFolder: "sexyshit666",
      allowedFileTypes: ["audio/mpeg", "application/zip"],
      maxFileSize: 5000 * 1024 * 1024, // 5000MB
      maxFiles: 1, // Maximum number of files allowed
   }

   return generateFileUploadUrl({ fileName, fileType, fileSize }, customConfig)
}
