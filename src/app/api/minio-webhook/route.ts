import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS } from "@/features/env";
import { FilePartRepository } from "@/features/file-upload/lib/file-part-repository";
import { UploadSessionRepository } from "@/features/file-upload/lib/file-upload-session-manager";
import { UploadGroupRepository } from "@/features/file-upload/lib/upload-group-repository";
import type {
  FileUploadNotification,
  MinioWebhookPayload,
} from "@/features/file-upload/types";
import {
  FileStatus,
  GroupStatus,
  JobType,
  PartStatus,
} from "@/features/file-upload/types/database";

// Initialize repositories
const uploadSessionRepository = new UploadSessionRepository();
const uploadGroupRepository = new UploadGroupRepository();
const filePartRepository = new FilePartRepository();

// Webhook validation schema
const webhookPayloadSchema = z.object({
  EventName: z.string(),
  Key: z.string(),
  Records: z.array(
    z.object({
      eventVersion: z.string(),
      eventSource: z.string(),
      awsRegion: z.string(),
      eventTime: z.string(),
      eventName: z.string(),
      userIdentity: z.object({ principalId: z.string() }),
      requestParameters: z.object({ sourceIPAddress: z.string() }),
      responseElements: z.object({
        "x-amz-request-id": z.string(),
        "x-minio-origin-endpoint": z.string(),
      }),
      s3: z.object({
        s3SchemaVersion: z.string(),
        configurationId: z.string(),
        bucket: z.object({
          name: z.string(),
          ownerIdentity: z.object({ principalId: z.string() }),
          arn: z.string(),
        }),
        object: z.object({
          key: z.string(),
          size: z.number(),
          eTag: z.string(),
          contentType: z.string(),
          userMetadata: z.record(z.string(), z.string()).optional().default({}),
          sequencer: z.string(),
        }),
      }),
    })
  ),
});

/**
 * Validate auth token from MinIO webhook
 */
function validateAuthToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedToken = MINIO_NOTIFY_WEBHOOK_AUTH_TOKEN_NEXTJS;

  if (!authHeader) {
    console.warn("MinIO webhook: Missing authorization header");
    return false;
  }

  // Handle both "Bearer token" and direct token formats
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (token !== expectedToken) {
    console.warn("MinIO webhook: Invalid auth token");
    return false;
  }

  return true;
}

/**
 * Handle MinIO webhook notifications
 * This endpoint receives notifications when files are uploaded to MinIO
 */
export async function POST(request: NextRequest) {
  try {
    // Validate auth token
    if (!validateAuthToken(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const body = await request.json();

    // Validate the payload structure
    const validatedPayload = webhookPayloadSchema.parse(
      body
    ) as MinioWebhookPayload;

    // Process each record in the payload
    for (const record of validatedPayload.Records) {
      const notification: FileUploadNotification = {
        bucketName: record.s3.bucket.name,
        objectKey: record.s3.object.key,
        fileName: record.s3.object.key.split("/").pop() || record.s3.object.key,
        fileSize: record.s3.object.size,
        contentType: record.s3.object.contentType,
        etag: record.s3.object.eTag,
        eventTime: record.eventTime,
        eventName: record.eventName,
      };

      // Handle different event types
      await handleFileUploadEvent(notification);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing MinIO webhook:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 400 }
    );
  }
}

/**
 * Handle file upload events based on the notification
 */
async function handleFileUploadEvent(notification: FileUploadNotification) {
  console.log("File upload notification received:", {
    bucket: notification.bucketName,
    key: notification.objectKey,
    fileName: notification.fileName,
    size: notification.fileSize,
    contentType: notification.contentType,
    eventName: notification.eventName,
    eventTime: notification.eventTime,
  });

  // Handle different event types
  switch (notification.eventName) {
    case "s3:ObjectCreated:Put":
    case "s3:ObjectCreated:Post":
      await handleFileCreated(notification);
      break;
    case "s3:ObjectRemoved:Delete":
      await handleFileDeleted(notification);
      break;
    default:
      console.log(`Unhandled event type: ${notification.eventName}`);
  }
}

/**
 * Handle file creation events
 */
async function handleFileCreated(notification: FileUploadNotification) {
  console.log(
    `File created: ${notification.fileName} (${notification.fileSize} bytes)`
  );

  try {
    // Find existing upload session by object key
    const existingSession = await uploadSessionRepository.findByObjectKey(
      notification.objectKey
    );

    if (existingSession) {
      console.log(
        `Updating existing upload session for ${notification.objectKey}`
      );

      // Check if this is a multipart upload completion
      if (existingSession.uploadId && existingSession.totalParts) {
        // This is a multipart upload completion
        console.log(`Multipart upload completed for ${notification.objectKey}`);

        // Update all parts to uploaded status
        const parts = await filePartRepository.findBySessionId(
          existingSession.id
        );
        for (const part of parts) {
          if (part.status !== PartStatus.UPLOADED) {
            await filePartRepository.updateStatus(
              part.id,
              PartStatus.UPLOADED,
              undefined,
              new Date()
            );
          }
        }

        // Update completed parts counter
        await uploadSessionRepository.updateMultipartTracking(
          existingSession.id,
          existingSession.totalParts || 0
        );
      }

      // Update session status to UPLOADED
      await uploadSessionRepository.updateStatusByObjectKey(
        notification.objectKey,
        FileStatus.UPLOADED,
        new Date()
      );

      // Update group completion count if part of a group
      if (existingSession.groupId) {
        const updatedGroup =
          await uploadGroupRepository.incrementCompletedFiles(
            existingSession.groupId
          );

        // Check if all files in the group are completed
        if (updatedGroup.completedFiles >= updatedGroup.totalFiles) {
          await uploadGroupRepository.updateStatus(
            existingSession.groupId,
            GroupStatus.COMPLETED
          );
          console.log(`Upload group ${existingSession.groupId} completed`);
        } else {
          // Update group status to IN_PROGRESS if not already
          if (updatedGroup.status === GroupStatus.PENDING) {
            await uploadGroupRepository.updateStatus(
              existingSession.groupId,
              GroupStatus.IN_PROGRESS
            );
          }
        }
      }
    } else {
      // This is an unexpected upload (not initiated through our system)
      // Create a new upload session record
      console.log(
        `Creating new upload session for unexpected upload: ${notification.objectKey}`
      );
      await uploadSessionRepository.create({
        objectKey: notification.objectKey,
      });
    }

    // Process any pending jobs for this upload
    await processUploadJobs(notification);
  } catch (error) {
    console.error(`Error processing file ${notification.fileName}:`, error);
  }
}

/**
 * Handle file deletion events
 */
async function handleFileDeleted(notification: FileUploadNotification) {
  console.log(`File deleted: ${notification.fileName}`);

  // Update database to mark file as deleted
  try {
    await uploadSessionRepository.updateStatusByObjectKey(
      notification.objectKey,
      FileStatus.DELETED
    );
    console.log(`Marked ${notification.objectKey} as deleted in database`);
  } catch (error) {
    console.error(
      `Failed to update database for deleted file ${notification.objectKey}:`,
      error
    );
  }
}

/**
 * Process any pending jobs for an uploaded file
 */
async function processUploadJobs(notification: FileUploadNotification) {
  try {
    // Find the upload session
    const session = await uploadSessionRepository.findByObjectKey(
      notification.objectKey
    );

    if (!session) {
      console.error(`No upload session found for ${notification.objectKey}`);
      return;
    }

    // Update status to PROCESSING
    await uploadSessionRepository.updateStatusByObjectKey(
      notification.objectKey,
      FileStatus.PROCESSING
    );

    // Here you would trigger any processing jobs based on file type
    // For example, if it's an image, you might want to generate thumbnails
    // If it's a document, you might want to extract text, etc.

    // For now, we'll just mark it as COMPLETED since we don't have any processing to do
    await uploadSessionRepository.updateStatusByObjectKey(
      notification.objectKey,
      FileStatus.COMPLETED
    );

    console.log(`File ${notification.fileName} processed successfully`);
  } catch (error) {
    console.error(
      `Error processing jobs for ${notification.objectKey}:`,
      error
    );

    // Mark as failed if there was an error
    try {
      await uploadSessionRepository.updateStatusByObjectKey(
        notification.objectKey,
        FileStatus.FAILED
      );
    } catch (updateError) {
      console.error(
        `Failed to update status to FAILED for ${notification.objectKey}:`,
        updateError
      );
    }
  }
}
