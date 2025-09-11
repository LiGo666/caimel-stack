import { MinioClient } from "../lib/minio-client"
import { MINIO_HOST, MINIO_ACCESS_KEY, MINIO_SECRET_KEY } from "@/features/env"
import fs from "fs"
import path from "path"
import axios from "axios"

// Simple function to generate unique IDs (replacing uuid)
function generateUniqueId(): string {
   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

// These tests require a running Minio server
// They will create and delete real buckets and objects
describe("MinioClient Integration Tests", () => {
   let minioClient: MinioClient
   let testBucketName: string
   let testObjectName: string
   let tempFilePath: string

   beforeAll(() => {
      // Create a unique bucket name for this test run to avoid conflicts
      testBucketName = `integration-test-${generateUniqueId()}`
      testObjectName = `test-object-${generateUniqueId()}.txt`

      // Create a temporary file for upload testing
      tempFilePath = path.join(__dirname, `temp-${generateUniqueId()}.txt`)
      fs.writeFileSync(tempFilePath, "This is test content for Minio integration test")

      minioClient = new MinioClient({ endpoint: MINIO_HOST, accessKey: MINIO_ACCESS_KEY, secretKey: MINIO_SECRET_KEY })
   })

   afterAll(async () => {
      // Clean up - remove the temporary file
      if (fs.existsSync(tempFilePath)) {
         fs.unlinkSync(tempFilePath)
      }

      // Clean up any buckets that might have been left over from failed tests
      try {
         const exists = await minioClient.bucketExists(testBucketName)
         if (exists) {
            // Remove notifications first
            await minioClient.removeBucketNotification(testBucketName)
            // Then delete the bucket with force option
            await minioClient.deleteBucket(testBucketName, true)
         }
      } catch (error) {
         console.error(`Error cleaning up test bucket: ${error}`)
      }
   })

   // Complete bucket and notification lifecycle test
   describe("Bucket and notification lifecycle", () => {
      it("should check if a bucket exists (expecting false for new unique name)", async () => {
         const exists = await minioClient.bucketExists(testBucketName)
         expect(exists).toBe(false)
      })

      it("should create a new bucket", async () => {
         const result = await minioClient.createBucket({ name: testBucketName })
         expect(result).toBe(true)

         // Verify the bucket was created
         const exists = await minioClient.bucketExists(testBucketName)
         expect(exists).toBe(true)
      })

      it("should check that bucket notifications don't exist initially", async () => {
         const notificationsExist = await minioClient.bucketNotificationExists(testBucketName)
         expect(notificationsExist).toBe(false)
      })

      it("should set up bucket notifications", async () => {
         const result = await minioClient.setBucketNotification({
            bucketName: testBucketName,
            endpoint: "https://webhook.site/your-test-id",
            prefix: "test-",
            suffix: ".txt",
         })
         expect(result).toBe(true)
      })

      it("should verify bucket notifications exist after creation", async () => {
         // Add a small delay to allow the notification to be set up
         await new Promise((resolve) => setTimeout(resolve, 1000))

         // Check if notifications exist
         const notificationsExist = await minioClient.bucketNotificationExists(testBucketName)
         expect(notificationsExist).toBe(true)
      })

      it("should verify bucket exists after notification setup", async () => {
         const exists = await minioClient.bucketExists(testBucketName)
         expect(exists).toBe(true)
      })

      it("should generate a presigned URL and successfully upload a file", async () => {
         // Generate a presigned URL for uploading
         const presignedResult = await minioClient.generatePresignedUrl({
            bucketName: testBucketName,
            objectName: testObjectName,
            contentType: "text/plain",
         })

         expect(presignedResult.url).toBeTruthy()
         expect(presignedResult.fields).toBeTruthy()

         // Use the presigned URL to upload the file
         const formData = new FormData()

         // Add all the fields from the presigned URL
         Object.entries(presignedResult.fields || {}).forEach(([key, value]) => {
            formData.append(key, value)
         })

         // Add the file content
         const fileContent = fs.readFileSync(tempFilePath)
         formData.append("file", new Blob([fileContent], { type: "text/plain" }))

         // Upload using the presigned URL
         try {
            const response = await axios.post(presignedResult.url, formData, { headers: { "Content-Type": "multipart/form-data" } })

            expect(response.status).toBe(204)
            console.log("File uploaded successfully")
         } catch (error) {
            console.error("Error uploading file:", error)
            throw error
         }
      })

      it("should remove bucket notifications", async () => {
         const result = await minioClient.removeBucketNotification(testBucketName)
         expect(result).toBe(true)
      })

      it("should verify bucket notifications do not exist after removal", async () => {
         // Add a small delay to allow the notification to be removed
         await new Promise((resolve) => setTimeout(resolve, 1000))

         // Check if notifications exist
         const notificationsExist = await minioClient.bucketNotificationExists(testBucketName)
         expect(notificationsExist).toBe(false)
      })

      it("should verify bucket exists after notification removal", async () => {
         const exists = await minioClient.bucketExists(testBucketName)
         expect(exists).toBe(true)
      })

      it("should delete the bucket with force option", async () => {
         const result = await minioClient.deleteBucket(testBucketName, true)
         expect(result).toBe(true)
      })

      it("should verify bucket does not exist after deletion", async () => {
         // Check if bucket exists
         const exists = await minioClient.bucketExists(testBucketName)
         expect(exists).toBe(false)
      })
   })
})
