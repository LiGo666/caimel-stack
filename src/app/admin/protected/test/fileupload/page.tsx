"use client"

import { FileUploader, type UploadedFile } from "@/features/file-upload/index.client"
import { generateFileUploadUrlAction } from "./(actions)/generateFileUploadUrlAction"
import { FileType } from "@/features/file-upload/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Progress } from "@/features/shadcn/index.client"
import { useState } from "react"

export default function FileUploadPage() {
   const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
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
                     Smart file uploader with automatic method selection. Files ≤50MB use direct upload, while larger files automatically use chunked
                     upload for better reliability.
                  </p>
               </div>

               <FileUploader
                  // Custom server action for getting presigned URLs
                  getFileUploadUrl={generateFileUploadUrlAction}
                  // These config options will be overridden by the server action
                  // They're only used for client-side validation
                  config={{
                     allowedFileTypes: ["audio/mpeg", "application/zip"],
                     maxFileSize: 5000 * 1024 * 1024, // 5000MB
                     maxFiles: 1,
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
                                 <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                                    View
                                 </a>
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
