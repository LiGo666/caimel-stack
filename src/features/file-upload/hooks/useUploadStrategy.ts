"use client"

import { useCallback, useRef } from "react"
import { FileUploadConfig, MultipartUploadCompletePart, UploadedFile } from "../types"
import { getPresignedUrl, initMultipartUpload, completeMultipartUpload, abortMultipartUpload, getFileUrl } from "../actions/upload"
import { defaultClientConfig } from "../config/client-config"

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // KB/s
}

export interface UploadCallbacks {
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (file: UploadedFile) => void
  onError?: (error: Error) => void
}

export function useUploadStrategy() {
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  // Direct upload for smaller files
  const uploadDirect = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[UPLOAD_STRATEGY] Starting direct upload for ${file.name} (${Math.round(file.size / 1024)}KB)`)

      try {
        // Get presigned URL
        const response = await getPresignedUrl(
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          },
          config
        )

        if (!response.success || !response.presignedUrl) {
          throw new Error(response.error || "Failed to get presigned URL")
        }

        const { url, fields, key } = response.presignedUrl

        return new Promise<UploadedFile>((resolve, reject) => {
          const formData = new FormData()

          // Add all fields from presigned URL
          Object.entries(fields).forEach(([fieldName, fieldValue]) => {
            formData.append(fieldName, fieldValue as string)
          })
          formData.append('file', file)

          const xhr = new XMLHttpRequest()
          const abortController = new AbortController()
          abortControllersRef.current[file.name] = abortController

          let lastProgressTime = Date.now()
          let lastLoaded = 0

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && callbacks?.onProgress) {
              const now = Date.now()
              const timeDiff = now - lastProgressTime
              const loadedDiff = event.loaded - lastLoaded
              
              let speed = 0
              if (timeDiff > 100) { // Update at most every 100ms
                speed = timeDiff > 0 ? Math.round(((loadedDiff / timeDiff) * 1000) / 1024) : 0
                lastProgressTime = now
                lastLoaded = event.loaded
              }

              callbacks.onProgress({
                loaded: event.loaded,
                total: event.total,
                percentage: Math.round((event.loaded / event.total) * 100),
                speed
              })
            }
          }

          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const fileUrl = await getFileUrl(config?.bucketName || 'uploads', key)
                const uploadedFile: UploadedFile = {
                  key,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: fileUrl,
                }
                callbacks?.onComplete?.(uploadedFile)
                resolve(uploadedFile)
              } catch (urlError) {
                const uploadedFile: UploadedFile = {
                  key,
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  url: `#uploaded-${key}`,
                }
                callbacks?.onComplete?.(uploadedFile)
                resolve(uploadedFile)
              }
            } else {
              const error = new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText || 'No response'}`)
              callbacks?.onError?.(error)
              reject(error)
            }
          }

          xhr.onerror = () => {
            const error = new Error("Network error during upload")
            callbacks?.onError?.(error)
            reject(error)
          }

          xhr.ontimeout = () => {
            const error = new Error("Upload timed out")
            callbacks?.onError?.(error)
            reject(error)
          }

          xhr.onabort = () => {
            const error = new Error("Upload aborted")
            callbacks?.onError?.(error)
            reject(error)
          }

          abortController.signal.addEventListener("abort", () => {
            xhr.abort()
          })

          xhr.open("POST", url)
          xhr.send(formData)
        })
      } catch (error) {
        console.error(`[UPLOAD_STRATEGY] Error in direct upload:`, error)
        const uploadError = error instanceof Error ? error : new Error('Unknown upload error')
        callbacks?.onError?.(uploadError)
        throw uploadError
      } finally {
        delete abortControllersRef.current[file.name]
      }
    },
    []
  )

  // Chunked upload for larger files
  const uploadChunked = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[UPLOAD_STRATEGY] Starting chunked upload for ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`)

      const chunkSize = defaultClientConfig.chunkSize
      const partCount = Math.ceil(file.size / chunkSize)
      console.log(`[UPLOAD_STRATEGY] Will upload ${partCount} chunks of ~${Math.round(chunkSize / (1024 * 1024))}MB each`)

      let initResponse: any = null
      try {
        // Initialize multipart upload
        initResponse = await initMultipartUpload(
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            partSize: chunkSize,
          },
          config
        )

        if (!initResponse.success || !initResponse.uploadId || !initResponse.parts) {
          throw new Error(initResponse.error || "Failed to initialize multipart upload")
        }

        const { uploadId, key, parts } = initResponse
        console.log(`[UPLOAD_STRATEGY] Initialized multipart upload: ${uploadId} with ${parts.length} parts`)

        // Upload parts concurrently
        const completedParts: MultipartUploadCompletePart[] = []
        let totalUploaded = 0

        const uploadPart = async (partIndex: number) => {
          const part = parts[partIndex]
          const startByte = partIndex * chunkSize
          const endByte = Math.min(startByte + chunkSize, file.size)
          const chunk = file.slice(startByte, endByte)

          return new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            const abortController = new AbortController()
            abortControllersRef.current[`${file.name}-part-${partIndex}`] = abortController

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable && callbacks?.onProgress) {
                const newTotalUploaded = totalUploaded + event.loaded
                callbacks.onProgress({
                  loaded: newTotalUploaded,
                  total: file.size,
                  percentage: Math.round((newTotalUploaded / file.size) * 100),
                  speed: 0 // Speed calculation is complex for chunked uploads
                })
              }
            }

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const etag = xhr.getResponseHeader('ETag')?.replace(/"/g, '') || ''
                totalUploaded += chunk.size
                resolve(etag)
              } else {
                reject(new Error(`Part ${part.partNumber} failed with status ${xhr.status}`))
              }
            }

            xhr.onerror = () => reject(new Error(`Network error uploading part ${part.partNumber}`))
            xhr.ontimeout = () => reject(new Error(`Timeout uploading part ${part.partNumber}`))
            xhr.onabort = () => reject(new Error(`Aborted uploading part ${part.partNumber}`))

            abortController.signal.addEventListener("abort", () => {
              xhr.abort()
            })

            xhr.open("PUT", part.url)
            xhr.send(chunk)
          })
        }

        // Upload parts with concurrency control
        const semaphore = new Array(defaultClientConfig.maxConcurrentUploads).fill(null)
        let nextPartIndex = 0

        await Promise.all(
          semaphore.map(async () => {
            while (nextPartIndex < parts.length) {
              const partIndex = nextPartIndex++
              const part = parts[partIndex]
              
              try {
                const etag = await uploadPart(partIndex)
                completedParts.push({
                  partNumber: part.partNumber,
                  etag,
                })
                console.log(`[UPLOAD_STRATEGY] Completed part ${part.partNumber}/${parts.length}`)
              } catch (error) {
                console.error(`[UPLOAD_STRATEGY] Failed to upload part ${part.partNumber}:`, error)
                throw error
              } finally {
                delete abortControllersRef.current[`${file.name}-part-${partIndex}`]
              }
            }
          })
        )

        // Sort parts by part number
        completedParts.sort((a, b) => a.partNumber - b.partNumber)

        // Complete multipart upload
        const completeResponse = await completeMultipartUpload(
          {
            uploadId,
            key,
            parts: completedParts,
          },
          config
        )

        if (!completeResponse.success || !completeResponse.url) {
          throw new Error(completeResponse.error || "Failed to complete multipart upload")
        }

        const uploadedFile: UploadedFile = {
          key,
          name: file.name,
          size: file.size,
          type: file.type,
          url: completeResponse.url,
        }

        callbacks?.onComplete?.(uploadedFile)
        return uploadedFile

      } catch (error) {
        console.error(`[UPLOAD_STRATEGY] Error in chunked upload:`, error)
        
        // Attempt to abort the multipart upload on error
        if (initResponse && initResponse.uploadId && initResponse.key) {
          try {
            await abortMultipartUpload({
              uploadId: initResponse.uploadId,
              key: initResponse.key,
            }, config)
          } catch (abortError) {
            console.error(`[UPLOAD_STRATEGY] Failed to abort multipart upload:`, abortError)
          }
        }

        const uploadError = error instanceof Error ? error : new Error('Unknown upload error')
        callbacks?.onError?.(uploadError)
        throw uploadError
      }
    },
    []
  )

  // Smart upload method selection
  const uploadFile = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[UPLOAD_STRATEGY] Selecting upload method for ${file.name} (${Math.round(file.size / (1024 * 1024))}MB)`)

      if (file.size > defaultClientConfig.directUploadThreshold) {
        console.log(`[UPLOAD_STRATEGY] Using chunked upload (file > ${Math.round(defaultClientConfig.directUploadThreshold / (1024 * 1024))}MB)`)
        return uploadChunked(file, config, callbacks)
      } else {
        console.log(`[UPLOAD_STRATEGY] Using direct upload (file <= ${Math.round(defaultClientConfig.directUploadThreshold / (1024 * 1024))}MB)`)
        return uploadDirect(file, config, callbacks)
      }
    },
    [uploadDirect, uploadChunked]
  )

  // Abort upload
  const abortUpload = useCallback((fileName: string) => {
    console.log(`[UPLOAD_STRATEGY] Aborting upload for ${fileName}`)
    
    // Abort direct upload
    const controller = abortControllersRef.current[fileName]
    if (controller) {
      controller.abort()
      delete abortControllersRef.current[fileName]
    }

    // Abort chunked upload parts
    Object.keys(abortControllersRef.current).forEach(key => {
      if (key.startsWith(`${fileName}-part-`)) {
        abortControllersRef.current[key].abort()
        delete abortControllersRef.current[key]
      }
    })
  }, [])

  // Abort all uploads
  const abortAllUploads = useCallback(() => {
    console.log(`[UPLOAD_STRATEGY] Aborting all uploads`)
    Object.values(abortControllersRef.current).forEach(controller => {
      controller.abort()
    })
    abortControllersRef.current = {}
  }, [])

  return {
    uploadFile,
    uploadDirect,
    uploadChunked,
    abortUpload,
    abortAllUploads,
  }
}
