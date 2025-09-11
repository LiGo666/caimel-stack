import { Client, NotificationConfig, QueueConfig } from "minio"
import { MinioClient } from "../lib/minio-client"
import { DEFAULT_MAX_FILE_SIZE, DEFAULT_PRESIGNED_URL_EXPIRY, DEFAULT_S3_EVENTS } from "../config/minio-defaults"
import { BucketConfig, NotificationOptions, PresignedUrlOptions } from "../types"
import { MINIO_HOST, MINIO_ACCESS_KEY, MINIO_SECRET_KEY } from "@/features/env"

// Mock the minio Client
jest.mock("minio", () => {
   const mockPresignedPostPolicy = jest
      .fn()
      .mockResolvedValue({ postURL: "https://minio.example.com/bucket", formData: { key: "test-object", policy: "policy-data" } })

   const mockBucketExists = jest.fn()
   const mockMakeBucket = jest.fn()
   const mockRemoveBucket = jest.fn()
   const mockSetBucketNotification = jest.fn()
   const mockGetBucketNotification = jest.fn()
   const mockNewPostPolicy = jest
      .fn()
      .mockReturnValue({
         setExpires: jest.fn(),
         setBucket: jest.fn(),
         setKey: jest.fn(),
         setContentLengthRange: jest.fn(),
         setContentType: jest.fn(),
      })

   return {
      Client: jest
         .fn()
         .mockImplementation(() => ({
            bucketExists: mockBucketExists,
            makeBucket: mockMakeBucket,
            removeBucket: mockRemoveBucket,
            presignedPostPolicy: mockPresignedPostPolicy,
            newPostPolicy: mockNewPostPolicy,
            setBucketNotification: mockSetBucketNotification,
            getBucketNotification: mockGetBucketNotification,
         })),
      NotificationConfig: jest.fn().mockImplementation(() => ({ add: jest.fn() })),
      QueueConfig: jest.fn().mockImplementation(() => ({ addFilterPrefix: jest.fn(), addFilterSuffix: jest.fn(), addEvent: jest.fn() })),
      buildARN: jest.fn().mockReturnValue("arn:aws:s3:::test-bucket"),
   }
})

describe("MinioClient", () => {
   const mockConfig = { endpoint: "minio.example.com", accessKey: "test-access-key", secretKey: "test-secret-key" }

   let minioClient: MinioClient
   let mockConsoleLog: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>
   let mockConsoleError: jest.SpyInstance<void, [message?: any, ...optionalParams: any[]]>

   beforeEach(() => {
      // Mock console methods to avoid cluttering test output
      mockConsoleLog = jest.spyOn(console, "log").mockImplementation()
      mockConsoleError = jest.spyOn(console, "error").mockImplementation()

      // Create a new MinioClient instance for each test
      minioClient = new MinioClient(mockConfig)
   })

   afterEach(() => {
      // Restore console methods
      mockConsoleLog.mockRestore()
      mockConsoleError.mockRestore()

      // Clear all mocks
      jest.clearAllMocks()
   })

   describe("constructor", () => {
      it("should create a MinioClient instance with provided config", () => {
         expect(minioClient).toBeInstanceOf(MinioClient)
         expect(Client).toHaveBeenCalledWith({ endPoint: mockConfig.endpoint, accessKey: mockConfig.accessKey, secretKey: mockConfig.secretKey })
      })

      it("should create a MinioClient instance with default environment variables when no config is provided", () => {
         // Clear previous mock calls
         jest.clearAllMocks()

         // Create client with default config (using env vars)
         const defaultClient = new MinioClient()

         // Verify the client was created with environment variables
         expect(defaultClient).toBeInstanceOf(MinioClient)
         expect(Client).toHaveBeenCalledWith({ endPoint: MINIO_HOST, accessKey: MINIO_ACCESS_KEY, secretKey: MINIO_SECRET_KEY })
      })

      it("should throw an error if Client constructor fails", () => {
         // Make the Client constructor throw an error
         const mockError = new Error("Connection failed")
         jest.mocked(Client).mockImplementationOnce(() => {
            throw mockError
         })

         // Expect the MinioClient constructor to throw
         expect(() => new MinioClient(mockConfig)).toThrow("Failed to initialize MinioClient: Connection failed")
      })
   })

   describe("bucketExists", () => {
      it("should return true when bucket exists", async () => {
         // Setup the mock to return true
         const mockClient = jest.mocked(Client).mock.results[0].value
         mockClient.bucketExists.mockResolvedValueOnce(true)

         const result = await minioClient.bucketExists("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
      })

      it("should return false when bucket does not exist", async () => {
         // Setup the mock to return false
         const mockClient = jest.mocked(Client).mock.results[0].value
         mockClient.bucketExists.mockResolvedValueOnce(false)

         const result = await minioClient.bucketExists("test-bucket")

         expect(result).toBe(false)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
      })

      it("should return false when an error occurs", async () => {
         // Setup the mock to throw an error
         const mockClient = jest.mocked(Client).mock.results[0].value
         mockClient.bucketExists.mockRejectedValueOnce(new Error("Connection error"))

         const result = await minioClient.bucketExists("test-bucket")

         expect(result).toBe(false)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("createBucket", () => {
      it("should create a bucket when it does not exist", async () => {
         const bucketConfig: BucketConfig = { name: "test-bucket", region: "us-east-1" }

         // Setup the mock to return false (bucket doesn't exist)
         const mockClient = jest.mocked(Client).mock.results[0].value
         mockClient.bucketExists.mockResolvedValueOnce(false)
         mockClient.makeBucket.mockResolvedValueOnce(undefined)

         const result = await minioClient.createBucket(bucketConfig)

         expect(result).toBe(true)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         expect(mockClient.makeBucket).toHaveBeenCalledWith("test-bucket", "us-east-1")
      })

      it("should not create a bucket when it already exists", async () => {
         const bucketConfig: BucketConfig = { name: "test-bucket" }

         // Setup the mock to return true (bucket exists)
         const mockClient = jest.mocked(Client).mock.results[0].value
         mockClient.bucketExists.mockResolvedValueOnce(true)

         const result = await minioClient.createBucket(bucketConfig)

         expect(result).toBe(true)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         expect(mockClient.makeBucket).not.toHaveBeenCalled()
      })

      it("should return false when an error occurs", async () => {
         const bucketConfig: BucketConfig = { name: "test-bucket" }

         // Setup the mock to throw an error
         const mockClient = jest.mocked(Client).mock.results[0].value
         // We need to mock bucketExists to return false so that makeBucket gets called
         mockClient.bucketExists.mockResolvedValueOnce(false)
         // Then mock makeBucket to throw an error
         mockClient.makeBucket.mockRejectedValueOnce(new Error("Connection error"))

         const result = await minioClient.createBucket(bucketConfig)

         expect(result).toBe(false)
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("generatePresignedUrl", () => {
      const presignedUrlOptions: PresignedUrlOptions = { bucketName: "test-bucket", objectName: "test-object.jpg", contentType: "image/jpeg" }

      it("should generate a presigned URL successfully", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return true (bucket exists)
         mockClient.bucketExists.mockResolvedValueOnce(true)

         const result = await minioClient.generatePresignedUrl(presignedUrlOptions)

         expect(result).toEqual({
            url: "https://minio.example.com/bucket",
            fields: { key: "test-object", policy: "policy-data" },
            key: "test-object.jpg",
         })

         // Verify policy settings
         const mockPolicy = mockClient.newPostPolicy.mock.results[0].value
         expect(mockPolicy.setBucket).toHaveBeenCalledWith("test-bucket")
         expect(mockPolicy.setKey).toHaveBeenCalledWith("test-object.jpg")
         expect(mockPolicy.setContentType).toHaveBeenCalledWith("image/jpeg")
         expect(mockPolicy.setContentLengthRange).toHaveBeenCalledWith(0, DEFAULT_MAX_FILE_SIZE)
      })

      it("should create bucket if it does not exist", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return false (bucket doesn't exist)
         mockClient.bucketExists.mockResolvedValueOnce(false)

         await minioClient.generatePresignedUrl(presignedUrlOptions)

         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         // Verify createBucket was called indirectly
         expect(mockClient.makeBucket).toHaveBeenCalledWith("test-bucket", undefined)
      })

      it("should use default values when optional parameters are not provided", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return true (bucket exists)
         mockClient.bucketExists.mockResolvedValueOnce(true)

         const options: PresignedUrlOptions = { bucketName: "test-bucket", objectName: "test-object.jpg" }

         await minioClient.generatePresignedUrl(options)

         // Verify default values were used
         const mockPolicy = mockClient.newPostPolicy.mock.results[0].value
         expect(mockPolicy.setContentLengthRange).toHaveBeenCalledWith(0, DEFAULT_MAX_FILE_SIZE)
         expect(mockPolicy.setContentType).not.toHaveBeenCalled()
      })

      it("should throw an error when presignedPostPolicy fails", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return true (bucket exists)
         mockClient.bucketExists.mockResolvedValueOnce(true)

         // Make presignedPostPolicy throw an error
         const mockError = new Error("Failed to generate URL")
         mockClient.presignedPostPolicy.mockRejectedValueOnce(mockError)

         await expect(minioClient.generatePresignedUrl(presignedUrlOptions)).rejects.toThrow(
            "Failed to generate presigned URL: Failed to generate URL",
         )

         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("bucketNotificationExists", () => {
      it("should return true when bucket has notifications", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with notifications
         mockClient.getBucketNotification.mockImplementationOnce((bucket, callback) => {
            callback(null, { QueueConfiguration: [{ events: ["s3:ObjectCreated:*"] }] })
            return Promise.resolve()
         })

         const result = await minioClient.bucketNotificationExists("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.getBucketNotification).toHaveBeenCalledWith("test-bucket", expect.any(Function))
      })

      it("should return true when bucket has cloud function notifications", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with notifications
         mockClient.getBucketNotification.mockImplementationOnce((bucket, callback) => {
            callback(null, { CloudFunctionConfiguration: [{ events: ["s3:ObjectCreated:*"] }] })
            return Promise.resolve()
         })

         const result = await minioClient.bucketNotificationExists("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.getBucketNotification).toHaveBeenCalledWith("test-bucket", expect.any(Function))
      })

      it("should return true when bucket has topic notifications", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with notifications
         mockClient.getBucketNotification.mockImplementationOnce((bucket, callback) => {
            callback(null, { TopicConfiguration: [{ events: ["s3:ObjectCreated:*"] }] })
            return Promise.resolve()
         })

         const result = await minioClient.bucketNotificationExists("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.getBucketNotification).toHaveBeenCalledWith("test-bucket", expect.any(Function))
      })

      it("should return false when bucket has no notifications", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with empty notifications
         mockClient.getBucketNotification.mockImplementationOnce((bucket, callback) => {
            callback(null, { QueueConfiguration: [], TopicConfiguration: [], CloudFunctionConfiguration: [] })
            return Promise.resolve()
         })

         const result = await minioClient.bucketNotificationExists("test-bucket")

         expect(result).toBe(false)
         expect(mockClient.getBucketNotification).toHaveBeenCalledWith("test-bucket", expect.any(Function))
      })

      it("should return false when an error occurs", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with an error
         mockClient.getBucketNotification.mockImplementationOnce((bucket, callback) => {
            callback(new Error("Failed to get notifications"))
            return Promise.resolve()
         })

         const result = await minioClient.bucketNotificationExists("test-bucket")

         expect(result).toBe(false)
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("setBucketNotification", () => {
      const notificationOptions: NotificationOptions = {
         bucketName: "test-bucket",
         endpoint: "https://webhook.example.com/notify",
         prefix: "uploads/",
         suffix: ".jpg",
         events: ["s3:ObjectCreated:Put"],
         authToken: "test-token",
      }

      it("should set bucket notification successfully", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with no error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(null)
            return Promise.resolve()
         })

         const result = await minioClient.setBucketNotification(notificationOptions)

         expect(result).toBe(true)
         expect(mockClient.setBucketNotification).toHaveBeenCalled()
      })

      it("should add filters when provided", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with no error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(null)
            return Promise.resolve()
         })

         await minioClient.setBucketNotification(notificationOptions)

         // Get the queue instance that was created
         const mockQueue = jest.mocked(QueueConfig).mock.results[0].value

         // Verify filters were added
         expect(mockQueue.addFilterPrefix).toHaveBeenCalledWith("uploads/")
         expect(mockQueue.addFilterSuffix).toHaveBeenCalledWith(".jpg")
      })

      it("should use default events when none are provided", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with no error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(null)
            return Promise.resolve()
         })

         const options: NotificationOptions = { bucketName: "test-bucket", endpoint: "https://webhook.example.com/notify" }

         await minioClient.setBucketNotification(options)

         // Get the queue instance that was created
         const mockQueue = jest.mocked(QueueConfig).mock.results[0].value

         // Verify default events were used
         expect(mockQueue.addEvent).toHaveBeenCalledWith(DEFAULT_S3_EVENTS[0])
      })

      it("should return false when an error occurs", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with an error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(new Error("Failed to set notification"))
            return Promise.resolve()
         })

         const result = await minioClient.setBucketNotification(notificationOptions)

         expect(result).toBe(false)
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("removeBucketNotification", () => {
      it("should remove bucket notifications successfully", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with no error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(null)
            return Promise.resolve()
         })

         const result = await minioClient.removeBucketNotification("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.setBucketNotification).toHaveBeenCalledWith("test-bucket", expect.any(Object), expect.any(Function))
      })

      it("should return false when an error occurs", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to call the callback with an error
         mockClient.setBucketNotification.mockImplementationOnce((bucket, config, callback) => {
            callback(new Error("Failed to remove notifications"))
            return Promise.resolve()
         })

         const result = await minioClient.removeBucketNotification("test-bucket")

         expect(result).toBe(false)
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })

   describe("deleteBucket", () => {
      it("should delete a bucket that exists", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return true (bucket exists)
         mockClient.bucketExists.mockResolvedValueOnce(true)
         mockClient.removeBucket.mockResolvedValueOnce(undefined)

         const result = await minioClient.deleteBucket("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         expect(mockClient.removeBucket).toHaveBeenCalledWith("test-bucket")
      })

      it("should return true when bucket does not exist (nothing to delete)", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return false (bucket doesn't exist)
         mockClient.bucketExists.mockResolvedValueOnce(false)

         const result = await minioClient.deleteBucket("test-bucket")

         expect(result).toBe(true)
         expect(mockClient.bucketExists).toHaveBeenCalledWith("test-bucket")
         expect(mockClient.removeBucket).not.toHaveBeenCalled()
      })

      it("should return false when an error occurs", async () => {
         const mockClient = jest.mocked(Client).mock.results[0].value

         // Setup the mock to return true (bucket exists) but fail on delete
         mockClient.bucketExists.mockResolvedValueOnce(true)
         mockClient.removeBucket.mockRejectedValueOnce(new Error("Failed to delete bucket"))

         const result = await minioClient.deleteBucket("test-bucket")

         expect(result).toBe(false)
         expect(mockConsoleError).toHaveBeenCalled()
      })
   })
})
