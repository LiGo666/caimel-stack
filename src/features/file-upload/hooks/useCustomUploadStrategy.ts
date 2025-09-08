"use client"

import { useCallback, useRef } from "react"
import { FileUploadConfig, FileUploadResponse, MultipartUploadCompletePart, UploadedFile } from "../types"
import { initMultipartUpload, completeMultipartUpload, abortMultipartUpload, getFileUrl } from "../actions/upload"
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

type GetPresignedUrlFn = (fileName: string, fileType: string, fileSize: number) => Promise<FileUploadResponse>

export function useCustomUploadStrategy(customGetPresignedUrl: GetPresignedUrlFn) {
  const abortControllersRef = useRef<Record<string, AbortController>>({})

  // Direct upload for smaller files
  const uploadDirect = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[CUSTOM_UPLOAD_STRATEGY] Starting direct upload for ${file.name} (${Math.round(file.size / 1024)}KB)`)

      try {
        // Get presigned URL using the custom function
        const response = await customGetPresignedUrl(
          file.name,
          file.type,
          file.size
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
                // Use the existing getFileUrl function from the original upload.ts
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
        console.error(`[CUSTOM_UPLOAD_STRATEGY] Error in direct upload:`, error)
        const uploadError = error instanceof Error ? error : new Error('Unknown upload error')
        callbacks?.onError?.(uploadError)
        throw uploadError
      } finally {
        delete abortControllersRef.current[file.name]
      }
    },
    [customGetPresignedUrl]
  )

  // For now, we'll only support direct upload with custom action
  const uploadChunked = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[CUSTOM_UPLOAD_STRATEGY] Chunked uploads not supported with custom action`)
      throw new Error("Chunked uploads not supported with custom action")
    },
    [customGetPresignedUrl]
  )

  // Smart upload method selection - for custom action we only use direct upload
  const uploadFile = useCallback(
    async (file: File, config?: Partial<FileUploadConfig>, callbacks?: UploadCallbacks): Promise<UploadedFile> => {
      console.log(`[CUSTOM_UPLOAD_STRATEGY] Using direct upload for all files with custom action`)
      return uploadDirect(file, config, callbacks)
    },
    [uploadDirect]
  )

  // Abort upload
  const abortUpload = useCallback((fileName: string) => {
    console.log(`[CUSTOM_UPLOAD_STRATEGY] Aborting upload for ${fileName}`)
    
    // Abort direct upload
    const controller = abortControllersRef.current[fileName]
    if (controller) {
      controller.abort()
      delete abortControllersRef.current[fileName]
    }
  }, [])

  // Abort all uploads
  const abortAllUploads = useCallback(() => {
    console.log(`[CUSTOM_UPLOAD_STRATEGY] Aborting all uploads`)
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
