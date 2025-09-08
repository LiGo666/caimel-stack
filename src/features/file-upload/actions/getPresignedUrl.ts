"use server"

import { generatePresignedUrl } from "../lib/presigned-url"
import { FileUploadConfig } from "../types"

/**
 * Server action to get a presigned URL for file upload
 * This action only accepts the minimal required parameters from the client
 * and handles all validation and security checks server-side
 */
export async function getPresignedUrl(
  fileName: string,
  fileType: string,
  fileSize: number,
  customConfig?: Partial<FileUploadConfig>
) {
  // Call the server-only function with the request data
  return generatePresignedUrl(
    {
      fileName,
      fileType,
      fileSize
    },
    customConfig
  )
}
