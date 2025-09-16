"use client";

import { useState } from "react";
import { EnhancedFileUploader } from "@/features/file-upload/components/EnhancedFileUploader";
import { EnhancedFileUploadManager } from "@/features/file-upload/components/EnhancedFileUploadManager";
import type { UploadedFile } from "@/features/file-upload/types";
import { Badge } from "@/features/shadcn/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/shadcn/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shadcn/index.client";

// File size constants in MB
const MAX_FILE_SIZE_MB = 5000; // 5GB

export default function FileUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>("");

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
    setUploadError("");
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="space-y-3 text-center">
        <h1 className="font-bold text-2xl">Enhanced File Upload System</h1>
        <div className="flex justify-center gap-2">
          <Badge variant="outline">Multi-file</Badge>
          <Badge variant="outline">Auto Chunking</Badge>
          <Badge variant="outline">Live Progress</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs className="w-full" defaultValue="uploader">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uploader">Enhanced Uploader</TabsTrigger>
          <TabsTrigger value="manager">Upload Manager</TabsTrigger>
        </TabsList>

        {/* Enhanced Uploader Tab */}
        <TabsContent className="space-y-4" value="uploader">
          {/* Enhanced File Uploader */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Upload Files</CardTitle>
              <CardDescription className="text-sm">
                Drag & drop files. Auto-chunks files &gt;100MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <EnhancedFileUploader
                acceptedFileTypes={[
                  "audio/mpeg",
                  "application/zip",
                  "image/jpeg",
                  "image/png",
                  "video/mp4",
                  "application/pdf",
                  "text/plain",
                  "application/json",
                ]}
                allowMultiple={true}
                // biome-ignore lint/style/noMagicNumbers: calculated value
                maxFileSize={MAX_FILE_SIZE_MB * 1024 * 1024} // 5GB
                maxFiles={10}
                onError={handleUploadError}
                onFilesUploaded={handleFilesUploaded}
              />
            </CardContent>
          </Card>

          {/* Upload Results */}
          {uploadError && (
            <Card className="border-red-200">
              <CardContent className="p-4">
                <p className="font-medium text-red-600">Upload Error:</p>
                <p className="text-red-500 text-sm">{uploadError}</p>
              </CardContent>
            </Card>
          )}

          {uploadedFiles.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-700">
                  Successfully Uploaded Files
                </CardTitle>
                <CardDescription>
                  {uploadedFiles.length} files uploaded successfully
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      className="flex items-center justify-between rounded-lg bg-green-50 p-3"
                      key={`${file.name}-${file.size}-${file.type}`}
                    >
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-gray-600 text-sm">
                          {/* biome-ignore lint/style/noMagicNumbers: calculated value */}
                          {(file.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                          {file.type}
                        </p>
                      </div>
                      <Badge className="bg-green-500">Completed</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Manager Tab */}
        <TabsContent className="space-y-4" value="manager">
          {/* Upload Manager Component */}
          <EnhancedFileUploadManager
            autoRefresh={true}
            refreshInterval={3000}
            userId="test-user"
          />
        </TabsContent>
      </Tabs>

      {/* Technical Info */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">System Features</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-3 text-gray-600 text-xs md:grid-cols-4">
            <div>✅ Smart chunking</div>
            <div>✅ Multi-file support</div>
            <div>✅ Real-time progress</div>
            <div>✅ Error recovery</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
