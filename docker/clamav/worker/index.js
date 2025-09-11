const express = require("express")
const { Pool } = require("pg")
const axios = require("axios")
const helmet = require("helmet")
const compression = require("compression")
const cors = require("cors")
const net = require("net")
const fs = require("fs")
const path = require("path")
const { pipeline } = require("stream")
const { promisify } = require("util")
const Minio = require("minio")

const app = express()
const port = process.env.PORT || 8080

// Environment variables
const config = {
   clamav: { host: process.env.CLAMAV_HOST || "clamav", port: parseInt(process.env.CLAMAV_PORT) || 3310 },
   database: { connectionString: process.env.POSTGRES_DATABASE_URL },
   minio: { host: process.env.MINIO_HOST || "minio", accessKey: process.env.MINIO_ACCESS_KEY, secretKey: process.env.MINIO_SECRET_KEY },
   auth: { webhookToken: process.env.WEBHOOK_AUTH_TOKEN },
}

// Database connection pool
const pool = new Pool({ connectionString: config.database.connectionString, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 })

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors())
app.use(express.json({ limit: "10mb" }))

// Logging middleware
app.use((req, res, next) => {
   console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
   next()
})

// Auth middleware for webhook endpoints
const authenticateWebhook = (req, res, next) => {
   const authHeader = req.headers.authorization
   const expectedToken = config.auth.webhookToken

   if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" })
   }

   const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader

   if (token !== expectedToken) {
      return res.status(401).json({ error: "Invalid auth token" })
   }

   next()
}

// Health check endpoint
app.get("/health", async (req, res) => {
   try {
      // Check database connection
      const dbResult = await pool.query("SELECT 1")

      // Check ClamAV connection
      const clamavHealthy = await pingClamAV()

      res.json({
         status: "healthy",
         timestamp: new Date().toISOString(),
         checks: { database: dbResult.rows.length > 0 ? "healthy" : "unhealthy", clamav: clamavHealthy ? "healthy" : "unhealthy" },
      })
   } catch (error) {
      console.error("Health check failed:", error)
      res.status(503).json({ status: "unhealthy", error: error.message, timestamp: new Date().toISOString() })
   }
})

// Ping ClamAV daemon
async function pingClamAV() {
   return new Promise((resolve) => {
      const socket = new net.Socket()

      socket.setTimeout(5000)

      socket.connect(config.clamav.port, config.clamav.host, () => {
         socket.write("PING\n")
      })

      socket.on("data", (data) => {
         const response = data.toString().trim()
         socket.destroy()
         resolve(response === "PONG")
      })

      socket.on("error", () => {
         resolve(false)
      })

      socket.on("timeout", () => {
         socket.destroy()
         resolve(false)
      })
   })
}

// Scan file with ClamAV
async function scanFileWithClamAV(filePath) {
   return new Promise((resolve, reject) => {
      const socket = new net.Socket()

      socket.setTimeout(60000) // 60 second timeout

      socket.connect(config.clamav.port, config.clamav.host, () => {
         // Send INSTREAM command to scan file content
         socket.write("zINSTREAM\0")

         // Read file and send chunks
         const fileStream = fs.createReadStream(filePath)
         let totalSize = 0

         fileStream.on("data", (chunk) => {
            const size = chunk.length
            totalSize += size

            // Send chunk size (4 bytes) followed by chunk data
            const sizeBuffer = Buffer.alloc(4)
            sizeBuffer.writeUInt32BE(size, 0)
            socket.write(sizeBuffer)
            socket.write(chunk)
         })

         fileStream.on("end", () => {
            // Send termination (4 zero bytes)
            socket.write(Buffer.alloc(4))
            console.log(`Sent ${totalSize} bytes to ClamAV for scanning`)
         })

         fileStream.on("error", (error) => {
            socket.destroy()
            reject(error)
         })
      })

      socket.on("data", (data) => {
         const response = data.toString().trim()
         socket.destroy()

         console.log(`ClamAV response: ${response}`)

         if (response.includes("OK")) {
            resolve({ clean: true, virus: null })
         } else if (response.includes("FOUND")) {
            const match = response.match(/stream: (.+) FOUND/)
            const virusName = match ? match[1] : "Unknown virus"
            resolve({ clean: false, virus: virusName })
         } else {
            reject(new Error(`Unexpected ClamAV response: ${response}`))
         }
      })

      socket.on("error", (error) => {
         reject(error)
      })

      socket.on("timeout", () => {
         socket.destroy()
         reject(new Error("ClamAV scan timeout"))
      })
   })
}

// Initialize MinIO client
let minioClient = null;

function getMinioClient() {
   if (!minioClient) {
      console.log(`Creating new MinIO client with host: ${config.minio.host}, accessKey: ${config.minio.accessKey}`);
      minioClient = new Minio.Client({
         endPoint: config.minio.host,
         port: 9000,
         useSSL: false,
         accessKey: config.minio.accessKey,
         secretKey: config.minio.secretKey
      });
   }
   return minioClient;
}

// Download file from MinIO using the MinIO client
async function downloadFileFromMinIO(bucketName, objectKey) {
   // Check if objectKey is already URL-encoded (contains %)
   // If it is, we need to decode it first to avoid double encoding
   let processedKey = objectKey;
   if (objectKey.includes('%')) {
      try {
         // Decode once to get the actual key
         processedKey = decodeURIComponent(objectKey);
         console.log(`Decoded objectKey from ${objectKey} to ${processedKey}`);
      } catch (e) {
         console.warn(`Failed to decode objectKey ${objectKey}, using as is:`, e);
         // Keep the original if decoding fails
      }
   }
   
   const tempDir = "/tmp";
   // Use the processed key for the filename
   const fileName = path.basename(processedKey);
   const filePath = path.join(tempDir, `scan_${Date.now()}_${fileName}`);

   try {
      console.log(`Attempting to download file ${processedKey} from bucket ${bucketName} using MinIO client`);
      
      // Get MinIO client
      const client = getMinioClient();
      
      // Create a write stream to save the file
      const fileStream = fs.createWriteStream(filePath);
      
      // Get the object from MinIO and pipe it to the file
      await new Promise((resolve, reject) => {
         client.getObject(bucketName, processedKey, (err, dataStream) => {
            if (err) {
               console.error(`MinIO getObject error:`, err);
               return reject(err);
            }
            
            dataStream.on('data', (chunk) => {
               fileStream.write(chunk);
            });
            
            dataStream.on('end', () => {
               fileStream.end();
               console.log(`Successfully downloaded file to ${filePath}`);
               resolve();
            });
            
            dataStream.on('error', (err) => {
               fileStream.end();
               console.error(`Error streaming data from MinIO:`, err);
               reject(err);
            });
         });
      });
      
      return filePath;
   } catch (error) {
      console.error(`Failed to download file ${processedKey} from bucket ${bucketName} using MinIO client:`, error);
      
      // If MinIO client fails, try with a presigned URL
      try {
         console.log(`Trying with presigned URL`);
         const client = getMinioClient();
         
         // Generate a presigned URL that expires in 1 hour
         const presignedUrl = await new Promise((resolve, reject) => {
            client.presignedGetObject(bucketName, processedKey, 60*60, (err, presignedUrl) => {
               if (err) {
                  console.error(`Error generating presigned URL:`, err);
                  return reject(err);
               }
               resolve(presignedUrl);
            });
         });
         
         console.log(`Generated presigned URL: ${presignedUrl}`);
         
         // Download using the presigned URL
         const response = await axios({
            method: 'GET',
            url: presignedUrl,
            responseType: 'stream',
            timeout: 30000
         });
         
         if (response.status !== 200) {
            throw new Error(`MinIO returned status ${response.status}: ${response.statusText}`);
         }
         
         // Save the file
         const writer = fs.createWriteStream(filePath);
         const streamPipeline = promisify(pipeline);
         await streamPipeline(response.data, writer);
         
         console.log(`Successfully downloaded file using presigned URL to ${filePath}`);
         return filePath;
      } catch (presignedError) {
         console.error(`Presigned URL download failed:`, presignedError);
         throw error; // Throw the original error
      }
   }
}

// Update file scan results in database
async function updateFileScanResults(objectKey, scanResult) {
   const client = await pool.connect()

   try {
      await client.query("BEGIN")

      // Check if file record exists (assuming a files table)
      const checkQuery = `
      SELECT id FROM files WHERE object_key = $1
    `
      const checkResult = await client.query(checkQuery, [objectKey])

      if (checkResult.rows.length === 0) {
         // Create new file record
         const insertQuery = `
        INSERT INTO files (object_key, scan_status, is_clean, virus_name, scanned_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
        RETURNING id
      `
         const insertResult = await client.query(insertQuery, [objectKey, "scanned", scanResult.clean, scanResult.virus])

         console.log(`Created file record for ${objectKey} with ID: ${insertResult.rows[0].id}`)
      } else {
         // Update existing file record
         const updateQuery = `
        UPDATE files 
        SET scan_status = $2, is_clean = $3, virus_name = $4, scanned_at = NOW(), updated_at = NOW()
        WHERE object_key = $1
      `
         await client.query(updateQuery, [objectKey, "scanned", scanResult.clean, scanResult.virus])

         console.log(`Updated file record for ${objectKey}`)
      }

      await client.query("COMMIT")
   } catch (error) {
      await client.query("ROLLBACK")
      console.error("Database update failed:", error)
      throw error
   } finally {
      client.release()
   }
}

// Webhook endpoint for file scanning
app.post(
   "/scan-file",
   (req, res, next) => {
      console.log("🔔 WEBHOOK REQUEST RECEIVED:", {
         headers: req.headers,
         body: req.body,
         method: req.method,
         path: req.path,
         timestamp: new Date().toISOString(),
      })
      next()
   },
   authenticateWebhook,
   async (req, res) => {
      try {
         const { bucketName, objectKey, fileName } = req.body

         if (!bucketName || !objectKey) {
            return res.status(400).json({ success: false, error: "bucketName and objectKey are required" })
         }

         console.log(`🔍 Starting virus scan for: ${bucketName}/${objectKey}`)

         let filePath = null

         try {
            // Download file from MinIO
            filePath = await downloadFileFromMinIO(bucketName, objectKey)
            console.log(`📥 Downloaded file to: ${filePath}`)

            // Scan file with ClamAV
            const scanResult = await scanFileWithClamAV(filePath)
            console.log(`🦠 Scan result:`, scanResult)

            // Update database
            await updateFileScanResults(objectKey, scanResult)

            // Clean up temporary file
            fs.unlinkSync(filePath)

            const result = {
               success: true,
               file: { bucketName, objectKey, fileName: fileName || path.basename(objectKey) },
               scan: { clean: scanResult.clean, virus: scanResult.virus, scannedAt: new Date().toISOString() },
            }

            if (scanResult.clean) {
               console.log(`✅ File ${objectKey} is clean`)
            } else {
               console.log(`🚨 Virus detected in ${objectKey}: ${scanResult.virus}`)
            }

            res.json(result)
         } catch (error) {
            // Clean up temporary file if it exists
            if (filePath && fs.existsSync(filePath)) {
               fs.unlinkSync(filePath)
            }
            throw error
         }
      } catch (error) {
         console.error("File scan failed:", error)
         res.status(500).json({ success: false, error: error.message })
      }
   },
)

// Error handling middleware
app.use((error, req, res, next) => {
   console.error("Unhandled error:", error)
   res.status(500).json({ success: false, error: "Internal server error" })
})

// 404 handler
app.use((req, res) => {
   res.status(404).json({ success: false, error: "Endpoint not found" })
})

// Start server
app.listen(port, "0.0.0.0", () => {
   console.log(`🚀 ClamAV Worker running on port ${port}`)
})

// Graceful shutdown
process.on("SIGTERM", async () => {
   console.log("Received SIGTERM, shutting down gracefully")
   await pool.end()
   process.exit(0)
})

process.on("SIGINT", async () => {
   console.log("Received SIGINT, shutting down gracefully")
   await pool.end()
   process.exit(0)
})
