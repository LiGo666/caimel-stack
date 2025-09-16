import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS,
  MINIO_NOTIFY_WEBHOOK_ENDPOINT,
} from "@/features/env";
import { MinioClient } from "@/features/minio";
import { createFileUploadConfig } from "../config/file-upload-config";
import { fileUploadRequestSchema } from "../schema/upload.schema";
import type {
  FileType,
  FileUploadConfig,
  FileUploadRequest,
} from "../types";
import type { CreateUploadGroupData } from "../types/database";
import { FileStatus, GroupStatus, PartStatus } from "../types/database";
import { FilePartRepository } from "./file-part-repository";
import { UploadSessionRepository } from "./file-upload-session-manager";
import { UploadGroupRepository } from "./upload-group-repository";

// Initialize repositories
const uploadSessionRepo = new UploadSessionRepository();
const uploadGroupRepo = new UploadGroupRepository();
const filePartRepo = new FilePartRepository();

// Constants for file upload sizes
const CHUNK_SIZE_MB = 50;
const MULTIPART_THRESHOLD_MB = 100;

// biome-ignore lint/style/noMagicNumbers: calculation constants
const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024;
// biome-ignore lint/style/noMagicNumbers: calculation constants
const MULTIPART_THRESHOLD = MULTIPART_THRESHOLD_MB * 1024 * 1024;

export type MultiFileUploadRequest = {
  files: FileUploadRequest[];
  groupName?: string;
  groupDescription?: string;
  userId?: string;
};

export type UploadSessionInfo = {
  sessionId: string;
  fileName: string;
  uploadType: "direct" | "multipart";
  presignedUrl?: string;
  multipartUploadId?: string;
  totalParts?: number;
};

export type MultiFileUploadResponse = {
  success: boolean;
  error?: string;
  groupId?: string;
  sessions?: UploadSessionInfo[];
};

export type MultipartUploadInitRequest = {
  sessionId: string;
  totalParts: number;
};

export type MultipartPartUrlRequest = {
  sessionId: string;
  partNumber: number;
};

export type MultipartCompleteRequest = {
  sessionId: string;
  parts: Array<{ partNumber: number; etag: string }>;
};

export type MultipartAbortRequest = {
  sessionId: string;
};

/**
 * Upload Session Controller - Main interface for all upload operations
 */
export class UploadSessionController {
  /**
   * Create an upload group based on request parameters
   */
  private async createUploadGroup(
    request: MultiFileUploadRequest,
    config: FileUploadConfig
  ): Promise<string | null> {
    // Only create a group if more than one file or if group name is specified
    if (!(request.files.length > 1 || request.groupName)) {
      return null;
    }
    
    const groupData: CreateUploadGroupData = {
      name: request.groupName || `Upload ${new Date().toISOString()}`,
      description: request.groupDescription,
      userId: request.userId || config.userId,
    };

    const group = await uploadGroupRepo.create(groupData);
    const groupId = group.id;
    // Update group with total files count
    await uploadGroupRepo.updateCounters(groupId, request.files.length, 0);
    return groupId;
  }

  /**
   * Validate a file upload request
   */
  private validateFileRequest(
    fileRequest: FileUploadRequest,
    config: FileUploadConfig
  ): FileUploadRequest {
    // Validate file request
    const validatedRequest = fileUploadRequestSchema.parse(fileRequest);

    // Validate file type
    const fileTypeValue = validatedRequest.fileType as FileType;
    if (!config.allowedFileTypes.includes(fileTypeValue)) {
      throw new Error(`File type not allowed: ${validatedRequest.fileType}`);
    }

    // Validate file size
    if (validatedRequest.fileSize > config.maxFileSize) {
      throw new Error(`File size exceeds maximum: ${validatedRequest.fileName}`);
    }

    return validatedRequest;
  }

  /**
   * Create file parts for multipart upload
   */
  private createFileParts(
    sessionId: string,
    totalParts: number,
    fileSize: number
  ): Promise<void> {
    const promises = [];
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const partSize =
        partNumber === totalParts
          ? fileSize - (partNumber - 1) * CHUNK_SIZE
          : CHUNK_SIZE;

      promises.push(
        filePartRepo.create({
          sessionId,
          partNumber,
          size: partSize,
        })
      );
    }
    
    return Promise.all(promises).then(() => {});
  }

  /**
   * Process a single file for multipart upload
   */
  private processMultipartUpload(
    validatedRequest: FileUploadRequest,
    uploadSession: { id: string },
    objectName: string,
    config: FileUploadConfig,
    minioClient: MinioClient
  ) {
    return minioClient.initiateMultipartUpload(
      config.bucketName,
      objectName,
      validatedRequest.fileType
    ).then((uploadId) => {
      const totalParts = Math.ceil(validatedRequest.fileSize / CHUNK_SIZE);
      
      // Update session with multipart info
      return uploadSessionRepo.updateMultipartTracking(
        uploadSession.id,
        totalParts,
        uploadId
      ).then(() => {
        // Create file parts records
        return this.createFileParts(uploadSession.id, totalParts, validatedRequest.fileSize)
          .then(() => ({
            sessionId: uploadSession.id,
            fileName: validatedRequest.fileName,
            uploadType: "multipart" as const,
            multipartUploadId: uploadId,
            totalParts,
          }));
      });
    });
  }

  /**
   * Process a single file for direct upload
   */
  private processDirectUpload(
    validatedRequest: FileUploadRequest,
    uploadSession: { id: string },
    objectName: string,
    config: FileUploadConfig,
    minioClient: MinioClient
  ) {
    return minioClient.generatePresignedUrl({
      bucketName: config.bucketName,
      objectName,
      contentType: validatedRequest.fileType,
      maxSizeBytes: config.maxFileSize,
    }).then((presignedUrl) => ({
      sessionId: uploadSession.id,
      fileName: validatedRequest.fileName,
      uploadType: "direct" as const,
      presignedUrl,
    }));
  }

  /**
   * Process a single file upload
   */
  private processFileUpload(
    fileRequest: FileUploadRequest,
    groupId: string | undefined,
    userId: string | undefined,
    config: FileUploadConfig,
    minioClient: MinioClient
  ) {
    try {
      // Validate the file request
      const validatedRequest = this.validateFileRequest(fileRequest, config);
      
      // Generate unique object key
      const fileExtension = path.extname(validatedRequest.fileName);
      const fileName = `${randomUUID()}${fileExtension}`;
      const objectName = `${config.uploadFolder}/${fileName}`;
      
      // Create upload session
      return uploadSessionRepo.create({
        groupId,
        userId: userId || config.userId,
        objectKey: objectName,
      }).then((uploadSession) => {
        // Determine upload method based on file size
        const useMultipart = validatedRequest.fileSize > MULTIPART_THRESHOLD;
        
        if (useMultipart) {
          return this.processMultipartUpload(
            validatedRequest,
            uploadSession,
            objectName,
            config,
            minioClient
          );
        }
        
        return this.processDirectUpload(
          validatedRequest,
          uploadSession,
          objectName,
          config,
          minioClient
        );
      });
    } catch (error) {
      return Promise.reject(error);
    }
      userId: userId || config.userId,
      objectKey: objectName,
    });

    // Determine upload method based on file size
    const useMultipart = validatedRequest.fileSize > MULTIPART_THRESHOLD;

  // Generate unique object key
  const objectName = this.generateObjectName(
    validatedRequest.fileName,
    config.uploadFolder
  );

  // Create upload session
  const uploadSession = await uploadSessionRepo.create({
    groupId,
    userId: userId || config.userId,
    objectKey: objectName,
  });

  // Determine upload method based on file size
  const useMultipart = validatedRequest.fileSize > MULTIPART_THRESHOLD;

  const uploadConfig = {
    validatedRequest,
    uploadSession,
    objectName,
    config,
  };

  if (useMultipart) {
    return this.handleMultipartUpload(uploadConfig, minioClient);
  }

  return this.handleDirectUpload(uploadConfig, minioClient);
}

/**
 * Initialize a multi-file upload session with transparent upload method selection
 */
async;
initiateMultiFileUpload(
    request: MultiFileUploadRequest,
    customConfig?: Partial<FileUploadConfig>
  )
: Promise<MultiFileUploadResponse>
{
  try {
    // Log upload initiation
    // biome-ignore lint/style/noConsole: Logging is acceptable in this context
    console.log(
      `[UploadController] Initiating multi-file upload with ${request.files.length} files`
    );

    const config = createFileUploadConfig(customConfig);
    const minioClient = new MinioClient();

    // Create upload group if needed
    const groupId = await this.createUploadGroup(request, config);

    // Process each file upload
    const sessions: UploadSessionInfo[] = [];
    for (const fileRequest of request.files) {
      const session = await this.processFileUpload(
        {
          fileRequest,
          groupId,
          userId: request.userId,
          config,
        },
        minioClient
      );
      sessions.push(session);
    }

    // Ensure bucket exists and set up notifications
    await this.ensureBucketSetup(minioClient, config);

    return {
        success: true,
        groupId,
        sessions,
      };
  } catch (error) {
    // biome-ignore lint/style/noConsole: Error logging is acceptable
    console.error(
      "[UploadController] Error initiating multi-file upload:",
      error
    );
    return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
  }
}

/**
 * Generate presigned URL for a specific part in a multipart upload
 */
async;
generatePartUploadUrl(
    sessionId: string,
    partNumber: number,
    customConfig?: Partial<FileUploadConfig>
  )
: Promise<
{
  success: boolean;
  url?: string;
  error?: string
}
>
{
  try {
    console.log(
      `[UploadController] Generating part upload URL for session ${sessionId}, part ${partNumber}`
    );

    const config = createFileUploadConfig(customConfig);
    const minioClient = new MinioClient();

    // Find upload session
    const session = await uploadSessionRepo.findById(sessionId);
    if (!(session && session.uploadId)) {
      throw new Error("Upload session not found or not a multipart upload");
    }

    // Generate presigned URL for the specific part
    const url = await minioClient.generatePartUploadUrl(
      config.bucketName,
      session.objectKey,
      session.uploadId,
      partNumber
    );

    // Update part status to uploading
    await filePartRepo.updateStatusBySessionAndPart(
      sessionId,
      partNumber,
      PartStatus.UPLOADING
    );

    return {
        success: true,
        url,
      };
  } catch (error) {
    console.error(
      "[UploadController] Error generating part upload URL:",
      error
    );
    return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
  }
}

/**
 * Complete a multipart upload
 */
async;
completeMultipartUpload(
    sessionId: string,
    parts: { partNumber: number;
etag: string;
}[],
    customConfig?: Partial<FileUploadConfig>
  ): Promise<
{
  success: boolean;
  error?: string
}
>
{
  try {
    console.log(
      `[UploadController] Completing multipart upload for session ${sessionId}`
    );

    const config = createFileUploadConfig(customConfig);
    const minioClient = new MinioClient();

    // Find upload session
    const session = await uploadSessionRepo.findById(sessionId);
    if (!(session && session.uploadId)) {
      throw new Error("Upload session not found or not a multipart upload");
    }

    // Update part statuses with ETags
    for (const part of parts) {
      await filePartRepo.updateStatusBySessionAndPart(
        sessionId,
        part.partNumber,
        PartStatus.UPLOADED,
        part.etag,
        new Date()
      );
    }

    // Complete the multipart upload in MinIO
    await minioClient.completeMultipartUpload(
      config.bucketName,
      session.objectKey,
      session.uploadId,
      parts
    );

    // Update session status
    await uploadSessionRepo.updateStatus(
      sessionId,
      FileStatus.UPLOADED,
      new Date()
    );

    // Update group completion count if part of a group
    if (session.groupId) {
      await uploadGroupRepo.incrementCompletedFiles(session.groupId);

      // Check if all files in the group are completed
      const group = await uploadGroupRepo.findById(session.groupId);
      if (group?.completedFiles >= group?.totalFiles) {
        await uploadGroupRepo.updateStatus(
          session.groupId,
          GroupStatus.COMPLETED
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error(
      "[UploadController] Error completing multipart upload:",
      error
    );
    return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
  }
}

/**
 * Abort a multipart upload
 */
async;
abortMultipartUpload(
    sessionId: string,
    customConfig?: Partial<FileUploadConfig>
  )
: Promise<
{
  success: boolean;
  error?: string
}
>
{
  try {
    console.log(
      `[UploadController] Aborting multipart upload for session ${sessionId}`
    );

    const config = createFileUploadConfig(customConfig);
    const minioClient = new MinioClient();

    // Find upload session
    const session = await uploadSessionRepo.findById(sessionId);
    if (!(session && session.uploadId)) {
      throw new Error("Upload session not found or not a multipart upload");
    }

    // Abort the multipart upload in MinIO
    await minioClient.abortMultipartUpload(
      config.bucketName,
      session.objectKey,
      session.uploadId
    );

    // Update session status
    await uploadSessionRepo.updateStatus(sessionId, FileStatus.FAILED);

    // Update parts status
    const parts = await filePartRepo.findBySessionId(sessionId);
    for (const part of parts) {
      if (part.status !== PartStatus.UPLOADED) {
        await filePartRepo.updateStatus(part.id, PartStatus.FAILED);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[UploadController] Error aborting multipart upload:", error);
    return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
  }
}

/**
 * Legacy single file upload method for backward compatibility
 */
async;
generateSingleFileUploadUrl(
    request: FileUploadRequest,
    customConfig?: Partial<FileUploadConfig>
  )
: Promise<FileUploadResponse>
{
  const multiFileRequest: MultiFileUploadRequest = {
    files: [request],
    userId: customConfig?.userId,
  };

  const result = await this.initiateMultiFileUpload(
    multiFileRequest,
    customConfig
  );

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

/**
 * Ensure bucket exists and notifications are set up
 */
private
async;
ensureBucketSetup(
    minioClient: MinioClient,
    config: FileUploadConfig
  )
: Promise<void>
{
  const bucketExists = await minioClient.bucketExists(config.bucketName);

  if (bucketExists) {
    const notificationsExist = await minioClient.bucketNotificationExists(
      config.bucketName
    );
    if (!notificationsExist) {
      // biome-ignore lint/style/noConsole: Logging is acceptable in this context
      console.log(
        `[UploadController] Setting up notifications for bucket ${config.bucketName}`
      );
      await this.setupBucketNotifications(minioClient, config);
    }
  } else {
    // biome-ignore lint/style/noConsole: Logging is acceptable in this context
    console.log(`[UploadController] Creating bucket ${config.bucketName}`);
    await minioClient.createBucket({ name: config.bucketName });
    await this.setupBucketNotifications(minioClient, config);
  }
}

/**
 * Set up bucket notifications
 */
private
async;
setupBucketNotifications(
    minioClient: MinioClient,
    config: FileUploadConfig
  )
: Promise<void>
{
  await minioClient.setBucketNotification({
    bucketName: config.bucketName,
    endpoint: MINIO_NOTIFY_WEBHOOK_ENDPOINT,
    events: ["s3:ObjectCreated:*"],
    prefix: config.uploadFolder,
    authToken: MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS,
  });
}
}

// Export singleton instance
export const uploadController = new UploadSessionController();
