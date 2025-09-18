/**
 * MinIO client implementation for object storage operations
 */

import type { BucketItem } from "minio";
import {
  buildARN,
  Client as MinioClient,
  NotificationConfig,
  PostPolicy,
  QueueConfig,
} from "minio";
import {
  ARN_ACCOUNT,
  ARN_REGION,
  ARN_RESOURCE,
  ARN_SERVICE,
  ARN_TYPE,
  CONTENT_TYPE_HEADER,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MINIO_CONFIG,
  DEFAULT_PRESIGNED_URL_EXPIRY,
  DEFAULT_REGION,
  DEFAULT_S3_EVENTS,
  PART_NUMBER_PARAM,
  UPLOAD_ID_PARAM,
} from "../config";
import type {
  BucketNotificationOptions,
  MinioClientConfig,
  MinioError,
  MultipartUploadInitResponse,
  MultipartUploadOptions,
  MultipartUploadPart,
  ObjectStorageClient,
  PresignedPartUrlOptions,
  PresignedPartUrlResponse,
  PresignedUrlOptions,
  PresignedUrlResponse,
} from "../types";


/**
 * Implementation of ObjectStorageClient using MinIO SDK
 */
export class MinioObjectStorageClient implements ObjectStorageClient {
  private readonly client: MinioClient;
  private readonly logger: Console;

  /**
   * Creates a new MinIO client instance
   *
   * @param config - Configuration options for the MinIO client
   * @param logger - Optional logger instance
   */
  constructor(
    config: Partial<MinioClientConfig> = {},
    logger: Console = console
  ) {
    // Merge provided config with defaults
    const clientConfig = {
      ...DEFAULT_MINIO_CONFIG,
      ...config,
    };

    // Initialize MinIO client
    this.client = new MinioClient(clientConfig);
    this.logger = logger;

    this.logger.info("MinIO client initialized", {
      endpoint: clientConfig.endPoint,
      port: clientConfig.port,
      useSSL: clientConfig.useSSL,
    });
  }

  /**
   * Get the underlying MinIO client instance
   *
   * @returns The MinIO client instance
   */
  getClient(): MinioClient {
    return this.client;
  }

  /**
   * Check if a bucket exists
   *
   * @param bucketName - Name of the bucket to check
   * @returns Promise resolving to true if bucket exists, false otherwise
   */
  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      this.logger.error("Error checking bucket existence", {
        bucketName,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to check if bucket exists"
      );
    }
  }

  /**
   * Create a new bucket
   *
   * @param bucketName - Name of the bucket to create
   * @param region - Optional region for the bucket
   * @returns Promise resolving when bucket is created
   */
  async makeBucket(bucketName: string, region = DEFAULT_REGION): Promise<void> {
    try {
      await this.client.makeBucket(bucketName, region);
      this.logger.info("Bucket created successfully", {
        bucketName,
        region,
      });
    } catch (error) {
      this.logger.error("Error creating bucket", {
        bucketName,
        region,
        error,
      });
      throw this.formatError(error as Error, "Failed to create bucket");
    }
  }

  /**
   * Remove a bucket
   *
   * @param bucketName - Name of the bucket to remove
   * @param force - If true, remove all objects in the bucket before removing the bucket
   * @returns Promise resolving when bucket is removed
   */
  async removeBucket(bucketName: string, force = false): Promise<void> {
    try {
      if (force) {
        // List and remove all objects in the bucket
        const objectsList = await this.listAllObjects(bucketName);

        if (objectsList.length > 0) {
          // Filter out undefined names and cast to string[]
          const objectNames = objectsList
            .map((obj) => obj.name)
            .filter((name): name is string => name !== undefined);

          if (objectNames.length > 0) {
            await this.client.removeObjects(bucketName, objectNames);
          }
        }
      }

      await this.client.removeBucket(bucketName);
      this.logger.info("Bucket removed successfully", { bucketName });
    } catch (error) {
      this.logger.error("Error removing bucket", {
        bucketName,
        force,
        error,
      });
      throw this.formatError(error as Error, "Failed to remove bucket");
    }
  }

  /**
   * Generate a presigned URL for uploading an object
   *
   * @param bucketName - Name of the bucket
   * @param objectName - Name of the object
   * @param options - Options for presigned URL generation
   * @returns Promise resolving to presigned URL response
   */
  async generatePresignedUrl(
    bucketName: string,
    objectName: string,
    options: PresignedUrlOptions = {}
  ): Promise<PresignedUrlResponse> {
    try {
      // Ensure bucket exists
      const bucketExists = await this.bucketExists(bucketName);
      if (!bucketExists) {
        this.logger.info("Bucket does not exist, creating it", { bucketName });
        await this.makeBucket(bucketName);
      }

      const expiry = options.expiry || DEFAULT_PRESIGNED_URL_EXPIRY;
      const maxFileSize = options.maxFileSize || DEFAULT_MAX_FILE_SIZE;

      // Create policy for the presigned URL
      const policy = new PostPolicy();
      // biome-ignore lint/style/noMagicNumbers: calculation
      policy.setExpires(new Date(Date.now() + expiry * 1000));
      policy.setBucket(bucketName);
      policy.setKey(objectName);
      policy.setContentLengthRange(0, maxFileSize);

      // Add content type restriction if specified
      if (options.contentType) {
        policy.setContentType(options.contentType);
      }

      const presignedPost = await this.client.presignedPostPolicy(policy);

      return {
        url: presignedPost.postURL,
        formData: presignedPost.formData,
      };
    } catch (error) {
      this.logger.error("Error generating presigned URL", {
        bucketName,
        objectName,
        options,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to generate presigned URL"
      );
    }
  }

  /**
   * Initiate a multipart upload
   *
   * @param bucketName - Name of the bucket
   * @param objectName - Name of the object
   * @param options - Options for multipart upload
   * @returns Promise resolving to multipart upload initialization response
   */
  async initiateMultipartUpload(
    bucketName: string,
    objectName: string,
    options: MultipartUploadOptions = {}
  ): Promise<MultipartUploadInitResponse> {
    try {
      // Ensure bucket exists
      const bucketExists = await this.bucketExists(bucketName);
      if (!bucketExists) {
        this.logger.info("Bucket does not exist, creating it", { bucketName });
        await this.makeBucket(bucketName);
      }

      // Convert options to RequestHeaders format
      const headers: Record<string, string> = {};

      if (options.contentType) {
        headers[CONTENT_TYPE_HEADER] = options.contentType;
      }

      if (options.metadata) {
        for (const [key, value] of Object.entries(options.metadata)) {
          headers[`x-amz-meta-${key}`] = value;
        }
      }

      const uploadId = await this.client.initiateNewMultipartUpload(
        bucketName,
        objectName,
        headers
      );

      return {
        uploadId,
        key: objectName,
        bucket: bucketName,
      };
    } catch (error) {
      this.logger.error("Error initiating multipart upload", {
        bucketName,
        objectName,
        options,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to initiate multipart upload"
      );
    }
  }

  /**
   * Generate a presigned URL for uploading a part of a multipart upload
   *
   * @param bucketName - Name of the bucket
   * @param objectName - Name of the object
   * @param params - Parameters for presigned part URL generation
   * @returns Promise resolving to presigned part URL response
   */
  async generatePresignedPartUrl(
    bucketName: string,
    objectName: string,
    params: {
      uploadId: string;
      partNumber: number;
      options?: PresignedPartUrlOptions;
    }
  ): Promise<PresignedPartUrlResponse> {
    try {
      const { uploadId, partNumber, options } = params;
      const expiry = options?.expiry || DEFAULT_PRESIGNED_URL_EXPIRY;

      // Create query parameters for the presigned URL
      const reqParams: Record<string, string> = {};
      reqParams[UPLOAD_ID_PARAM] = uploadId;
      reqParams[PART_NUMBER_PARAM] = partNumber.toString();

      // MinIO client expects query params as the third argument
      // We need to combine object name with query params
      const objectNameWithQuery = `${objectName}?${new URLSearchParams(reqParams).toString()}`;

      const url = await this.client.presignedPutObject(
        bucketName,
        objectNameWithQuery,
        expiry
      );

      return {
        url,
        partNumber,
      };
    } catch (error) {
      const { uploadId, partNumber, options } = params;
      this.logger.error("Error generating presigned part URL", {
        bucketName,
        objectName,
        uploadId,
        partNumber,
        options,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to generate presigned part URL"
      );
    }
  }

  /**
   * Complete a multipart upload
   *
   * @param bucketName - Name of the bucket
   * @param objectName - Name of the object
   * @param uploadId - ID of the multipart upload
   * @param parts - Array of part information
   * @returns Promise resolving when multipart upload is completed
   */
  async completeMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string,
    parts: MultipartUploadPart[]
  ): Promise<void> {
    try {
      // Convert parts to the format expected by the MinIO client
      const minioPartsList = parts.map((part) => ({
        part: part.partNumber,
        etag: part.etag,
      }));

      await this.client.completeMultipartUpload(
        bucketName,
        objectName,
        uploadId,
        minioPartsList
      );
      this.logger.info("Multipart upload completed successfully", {
        bucketName,
        objectName,
        uploadId,
        partsCount: parts.length,
      });
    } catch (error) {
      this.logger.error("Error completing multipart upload", {
        bucketName,
        objectName,
        uploadId,
        parts,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to complete multipart upload"
      );
    }
  }

  /**
   * Abort a multipart upload
   *
   * @param bucketName - Name of the bucket
   * @param objectName - Name of the object
   * @param uploadId - ID of the multipart upload
   * @returns Promise resolving when multipart upload is aborted
   */
  async abortMultipartUpload(
    bucketName: string,
    objectName: string,
    uploadId: string
  ): Promise<void> {
    try {
      await this.client.abortMultipartUpload(bucketName, objectName, uploadId);
      this.logger.info("Multipart upload aborted successfully", {
        bucketName,
        objectName,
        uploadId,
      });
    } catch (error) {
      this.logger.error("Error aborting multipart upload", {
        bucketName,
        objectName,
        uploadId,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to abort multipart upload"
      );
    }
  }

  /**
   * Set bucket notification configuration
   *
   * @param bucketName - Name of the bucket
   * @param options - Notification configuration options
   * @returns Promise resolving when notification is set
   */
  async setBucketNotification(
    bucketName: string,
    options: BucketNotificationOptions
  ): Promise<void> {
    try {
      // Create notification configuration
      const notificationConfig = new NotificationConfig();

      // Create queue configuration
      const arn = buildARN(
        ARN_SERVICE,
        ARN_TYPE,
        ARN_REGION,
        ARN_ACCOUNT,
        ARN_RESOURCE
      );
      const queueConfig = new QueueConfig(arn);

      // Add filters if provided
      if (options.prefix) {
        queueConfig.addFilterPrefix(options.prefix);
      }

      if (options.suffix) {
        queueConfig.addFilterSuffix(options.suffix);
      }

      // Add events
      const events =
        options.events.length > 0 ? options.events : DEFAULT_S3_EVENTS;

      for (const event of events) {
        queueConfig.addEvent(event);
      }

      // Add webhook configuration
      const webhookConfig = {
        endpoint: options.webhookEndpoint,
        authToken: options.authToken,
      };

      // biome-ignore lint/suspicious/noExplicitAny: MinIO SDK typing issue
      (queueConfig as any).config.webhookConfig = webhookConfig;

      // Add queue to notification config
      notificationConfig.add(queueConfig);

      // Set bucket notification
      await this.client.setBucketNotification(bucketName, notificationConfig);
      this.logger.info("Bucket notification set successfully", {
        bucketName,
        events,
        webhookEndpoint: options.webhookEndpoint,
      });
    } catch (error) {
      this.logger.error("Error setting bucket notification", {
        bucketName,
        options,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to set bucket notification"
      );
    }
  }

  /**
   * Get bucket notification configuration
   *
   * @param bucketName - Name of the bucket
   * @returns Promise resolving to notification configuration
   */
  async getBucketNotification(
    bucketName: string
  ): Promise<Record<string, unknown>> {
    try {
      const notificationConfig =
        await this.client.getBucketNotification(bucketName);
      // Convert NotificationConfig to Record<string, unknown>
      return JSON.parse(JSON.stringify(notificationConfig));
    } catch (error) {
      this.logger.error("Error getting bucket notification", {
        bucketName,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to get bucket notification"
      );
    }
  }

  /**
   * Remove bucket notification configuration
   *
   * @param bucketName - Name of the bucket
   * @returns Promise resolving when notification is removed
   */
  async removeBucketNotification(bucketName: string): Promise<void> {
    try {
      // Create empty notification config
      const notificationConfig = new NotificationConfig();

      // Set empty notification config to remove all notifications
      await this.client.setBucketNotification(bucketName, notificationConfig);
      this.logger.info("Bucket notification removed successfully", {
        bucketName,
      });
    } catch (error) {
      this.logger.error("Error removing bucket notification", {
        bucketName,
        error,
      });
      throw this.formatError(
        error as Error,
        "Failed to remove bucket notification"
      );
    }
  }

  /**
   * List all objects in a bucket
   *
   * @param bucketName - Name of the bucket
   * @param prefix - Optional prefix filter
   * @returns Promise resolving to array of objects
   */
  private async listAllObjects(
    bucketName: string,
    prefix = ""
  ): Promise<BucketItem[]> {
    return await new Promise((resolve, reject) => {
      const objects: BucketItem[] = [];
      const stream = this.client.listObjects(bucketName, prefix, true);

      stream.on("data", (obj) => {
        // Validate that obj is a BucketItem before pushing
        if (obj && typeof obj.name === "string") {
          objects.push(obj as BucketItem);
        }
      });

      stream.on("end", () => {
        resolve(objects);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * Format error for consistent error handling
   *
   * @param error - Original error
   * @param message - Error message
   * @returns Formatted error
   */
  private formatError(error: Error, message: string): MinioError {
    const minioError = error as MinioError;
    minioError.message = `${message}: ${error.message}`;
    return minioError;
  }
}
