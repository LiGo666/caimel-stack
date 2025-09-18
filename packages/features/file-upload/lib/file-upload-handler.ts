/**
 * File Upload Handler
 *
 * A higher-level abstraction over MinioObjectStorageClient for handling file uploads
 */

import { randomUUID } from "node:crypto";
import { MinioObjectStorageClient } from "@features/minio";
import type {
  FileUploadConfig,
  FileUploadUrlOptions,
  FileUploadUrlResponse,
  MultiFileUploadOptions,
  MultiFileUploadUrlResponse,
  NotificationOptions,
} from "./types";

// Constants
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

// Size constants
const BYTES_IN_KB = 1024;
const BYTES_IN_MB = BYTES_IN_KB * BYTES_IN_KB;
const DEFAULT_MAX_SIZE_MB = 100;
const DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_SIZE_MB * BYTES_IN_MB; // 100MB

// Event constants
const DEFAULT_EVENTS = ["s3:ObjectCreated:*"];

// Export for utility functions
const MB_IN_BYTES = BYTES_IN_MB;

/**
 * FileUploadHandler provides a higher-level abstraction for file uploads using MinIO
 */
export class FileUploadHandler {
  private readonly client: MinioObjectStorageClient;
  private readonly config: FileUploadConfig;
  private readonly logger: Console;

  /**
   * Create a new FileUploadHandler instance
   *
   * @param config - Configuration options for file upload handler
   * @param logger - Optional logger instance
   */
  constructor(config: FileUploadConfig, logger: Console = console) {
    this.config = config;
    this.client = new MinioObjectStorageClient(config.minioConfig, logger);
    this.logger = logger;

    this.logger.info("FileUploadHandler initialized", {
      defaultBucket: config.defaultBucketName,
      defaultFolder: config.defaultUploadFolder || "(root)",
    });
  }

  /**
   * Ensure that a bucket exists, creating it if necessary
   *
   * @param bucketName - Name of the bucket to ensure
   * @returns Promise resolving to true if bucket exists or was created
   */
  async ensureBucket(bucketName: string): Promise<boolean> {
    try {
      const exists = await this.client.bucketExists(bucketName);

      if (!exists) {
        this.logger.info(`Bucket ${bucketName} does not exist, creating it`);
        await this.client.makeBucket(bucketName);
        return true;
      }

      return true;
    } catch (error) {
      this.logger.error("Error ensuring bucket exists", {
        bucketName,
        error,
      });
      throw new Error(
        `Failed to ensure bucket ${bucketName}: ${(error as Error).message}`
      );
    }
  }

  /**
   * Set up webhook notifications for a bucket
   *
   * @param options - Notification options
   * @returns Promise resolving when notifications are set up
   */
  async setupNotifications(options: NotificationOptions): Promise<void> {
    try {
      const bucketName = options.bucketName || this.config.defaultBucketName;

      // Ensure bucket exists
      await this.ensureBucket(bucketName);

      // Set up notifications
      await this.client.setBucketNotification(bucketName, {
        webhookEndpoint:
          options.webhookEndpoint || this.config.webhookEndpoint || "",
        authToken: options.authToken || this.config.webhookAuthToken,
        prefix: options.prefix,
        suffix: options.suffix,
        events: options.events || DEFAULT_EVENTS,
      });

      this.logger.info("Bucket notifications set up successfully", {
        bucketName,
        webhookEndpoint: options.webhookEndpoint || this.config.webhookEndpoint,
      });
    } catch (error) {
      this.logger.error("Error setting up bucket notifications", {
        options,
        error,
      });
      throw new Error(
        `Failed to set up notifications: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate a unique object key for a file upload
   *
   * @param options - File upload options
   * @returns Unique object key
   */
  private generateObjectKey(options: FileUploadUrlOptions): string {
    const folder = options.uploadFolder || this.config.defaultUploadFolder || "";
    const uuid = randomUUID();

    // Always use UUID as filename
    return folder ? `${folder}/${uuid}` : uuid;
  }

  // No validation needed for file uploads since we're using GUIDs
  // Content-type validation will be handled on the client side or during upload

  /**
   * Generate a presigned URL for file upload
   *
   * @param options - Options for the file upload
   * @returns Promise resolving to presigned URL response
   */
  async getUploadUrl(
    options: FileUploadUrlOptions = {}
  ): Promise<FileUploadUrlResponse> {
    try {
      const bucketName = options.bucketName || this.config.defaultBucketName;

      // Ensure bucket exists
      await this.ensureBucket(bucketName);

      // No validation needed since we're using GUIDs

      // Generate object key
      const objectKey = this.generateObjectKey(options);

      // Set up presigned URL options
      const presignedUrlOptions = {
        expiry: options.expirySeconds || DEFAULT_EXPIRY_SECONDS,
        maxFileSize: options.maxFileSize || DEFAULT_MAX_FILE_SIZE,
        contentType:
          options.allowedFileTypes && options.allowedFileTypes.length === 1
            ? options.allowedFileTypes[0]
            : undefined,
        metadata: options.metadata,
      };

      // Generate presigned URL
      const { url, formData } = await this.client.generatePresignedUrl(
        bucketName,
        objectKey,
        presignedUrlOptions
      );

      return {
        uploadUrl: url,
        formData,
        objectKey,
        bucketName,
      };
    } catch (error) {
      this.logger.error("Error generating upload URL", {
        options,
        error,
      });
      throw new Error(
        `Failed to generate upload URL: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate multiple presigned URLs for file uploads
   *
   * @param options - Options for the file uploads
   * @returns Promise resolving to multiple presigned URL responses
   */
  async getMultipleUploadUrls(
    options: MultiFileUploadOptions
  ): Promise<MultiFileUploadUrlResponse> {
    try {
      const uploads: FileUploadUrlResponse[] = [];

      // Generate presigned URLs for each file
      for (let i = 0; i < options.maxFiles; i++) {
        const upload = await this.getUploadUrl(options);
        uploads.push(upload);
      }

      return {
        uploads,
        maxFiles: options.maxFiles,
      };
    } catch (error) {
      this.logger.error("Error generating multiple upload URLs", {
        options,
        error,
      });
      throw new Error(
        `Failed to generate multiple upload URLs: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create a factory function that returns a configured FileUploadHandler
   *
   * @param config - Configuration options for file upload handler
   * @returns A factory function that creates a FileUploadHandler
   */
  static createFactory(config: FileUploadConfig): () => FileUploadHandler {
    return () => new FileUploadHandler(config);
  }
}

/**
 * Helper function to convert MB to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export function mbToBytes(mb: number): number {
  return mb * MB_IN_BYTES;
}

/**
 * Create a new FileUploadHandler instance
 *
 * @param config - Configuration options for file upload handler
 * @param logger - Optional logger instance
 * @returns A new FileUploadHandler instance
 */
export function createFileUploadHandler(
  config: FileUploadConfig,
  logger: Console = console
): FileUploadHandler {
  return new FileUploadHandler(config, logger);
}
