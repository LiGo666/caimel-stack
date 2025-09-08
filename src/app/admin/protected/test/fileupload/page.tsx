"use client"

import { FileUploader, type UploadedFile } from "@/features/file-upload/index.client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Progress } from "@/features/shadcn/index.client"
import { useState } from "react"
import { getPresignedUrl } from "@/features/file-upload/actions/upload"

export default function FileUploadPage() {
   const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
   const [testUrl, setTestUrl] = useState<string>("")
   const [testLoading, setTestLoading] = useState(false)
   const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
   const [uploadSpeeds, setUploadSpeeds] = useState<Record<string, number>>({})
   const [uploading, setUploading] = useState(false)

   const handleUploadComplete = (files: UploadedFile[]) => {
      setUploadedFiles((prev) => [...prev, ...files])
      setUploading(false)
      console.log("Files uploaded:", files)
   }

   const handleUploadError = (error: string) => {
      console.error("Upload error:", error)
      setUploading(false)
   }

   const handleUploadProgress = (progress: Record<string, number>, speeds: Record<string, number>) => {
      // Use setTimeout to avoid the setState during render issue
      setTimeout(() => {
         setUploadProgress(progress)
         setUploadSpeeds(speeds)
      }, 0)
   }

   const handleUploadStart = () => {
      setUploading(true)
      setUploadProgress({})
   }

   const testPresignedUrl = async () => {
      setTestLoading(true)
      try {
         const response = await getPresignedUrl(
            { fileName: "test-file.txt", fileType: "text/plain", fileSize: 1024 },
            { bucketName: "test-bucket", uploadFolder: "test-folder" },
         )

         if (response.success && response.presignedUrl) {
            setTestUrl(response.presignedUrl.url)
            console.log("Presigned URL generated:", response.presignedUrl)
         } else {
            console.error("Failed to generate presigned URL:", response.error)
            setTestUrl(`Error: ${response.error}`)
         }
      } catch (error) {
         console.error("Error testing presigned URL:", error)
         setTestUrl(`Error: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
         setTestLoading(false)
      }
   }

   return (
      <div className="container mx-auto py-8">
         <Card className="max-w-3xl mx-auto">
            <CardHeader>
               <CardTitle>File Upload Test</CardTitle>
               <CardDescription>Test the file upload feature with MinIO pre-signed URLs</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="mb-4">
                  <p className="text-sm text-gray-500">
                     Smart file uploader with automatic method selection. Files ≤50MB use direct upload, 
                     while larger files automatically use chunked upload for better reliability.
                  </p>
               </div>
               
               <FileUploader
                  config={{
                     allowedFileTypes: ["image/jpeg", "image/png", "image/gif", "application/pdf", "application/zip", "video/mp4", "video/quicktime", "application/octet-stream"],
                     maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
                     bucketName: "uploads",
                     uploadFolder: "test-uploads",
                     maxFiles: 5,
                  }}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  onUploadProgress={handleUploadProgress}
                  onUploadStart={handleUploadStart}
                  multiple={true}
                  buttonText="Select Files to Upload"
                  dropzoneText="or drop files here (any size)"
                  showProgressDetails={true}
               />

               {/* Upload Progress Display */}
               {uploading && Object.keys(uploadProgress).length > 0 && (
                  <div className="mt-6">
                     <h3 className="text-lg font-medium mb-2">Upload Progress</h3>
                     <div className="space-y-3">
                        {Object.entries(uploadProgress).map(([fileName, progress]) => (
                           <div key={fileName} className="mb-2">
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="truncate max-w-[60%]">{fileName}</span>
                                 <span>
                                    {progress}% • {uploadSpeeds[fileName] || 0} KB/s
                                 </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                              <div className="text-xs text-gray-500 mt-1">{progress === 100 ? "Processing..." : "Uploading..."}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {uploadedFiles.length > 0 && (
                  <div className="mt-6">
                     <h3 className="text-lg font-medium mb-2">Uploaded Files</h3>
                     <ul className="list-disc pl-5">
                        {uploadedFiles.map((file, index) => (
                           <li key={index} className="mb-1">
                              <div className="flex items-center gap-2">
                                 <span>{file.name}</span>
                                 <span className="text-xs text-gray-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                 <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">View</a>
                              </div>
                           </li>
                        ))}
                     </ul>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   )
}
