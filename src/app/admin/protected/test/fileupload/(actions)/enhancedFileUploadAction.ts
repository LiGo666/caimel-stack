"use server";

import { UploadSessionController } from "@/features/file-upload/lib/upload-session-controller";

/**
 * Enhanced file upload action that supports multi-file and multipart uploads
 */
export async function initiateFileUploadAction(request: {
  files: { fileName: string; fileType: string; fileSize: number }[];
  groupName?: string;
}) {
  const controller = new UploadSessionController();

  return await controller.initiateMultiFileUpload({
    files: request.files,
    groupName: request.groupName || `Upload ${new Date().toISOString()}`,
  });
}

/**
 * Generate presigned URL for a specific part in a multipart upload
 */
export async function generatePartUploadUrlAction(
  sessionId: string,
  partNumber: number
) {
  const controller = new UploadSessionController();

  return await controller.generatePartUploadUrl(sessionId, partNumber);
}

/**
 * Complete a multipart upload
 */
export async function completeMultipartUploadAction(
  sessionId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<{ success: boolean; error?: string }> {
  const controller = new UploadSessionController();
  return await controller.completeMultipartUpload(sessionId, parts);
}

/**
 * Abort a multipart upload
 */
export async function abortMultipartUploadAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  const controller = new UploadSessionController();
  return await controller.abortMultipartUpload(sessionId);
}

/**
 * Legacy single file upload for backward compatibility
 */
export async function generateFileUploadUrlAction(
  fileName: string,
  fileType: string,
  fileSize: number
) {
  const result = await initiateFileUploadAction({
    files: [{ fileName, fileType, fileSize }],
    groupName: `Single file upload: ${fileName}`,
  });

  if (!(result.success && result.sessions?.length)) {
    return {
      success: false,
      error: result.error || "Failed to create upload session",
    };
  }

  const session = result.sessions[0];

  return {
    success: true,
    presignedUrl: session.presignedUrl,
    sessionId: session.sessionId,
  };
}
