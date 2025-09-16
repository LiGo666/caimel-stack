"use client";

import React, { useState } from "react";
import { EnhancedFileUploader } from "@/features/file-upload/components/EnhancedFileUploader";
import { EnhancedFileUploadManager } from "@/features/file-upload/components/EnhancedFileUploadManager";
import type { UploadedFile } from "@/features/file-upload/types";
import { Badge } from "@/features/shadcn/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shadcn/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/features/shadcn/components/ui/tabs";

export default function EnhancedUploadTestPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>("");

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles((prev) => [...prev, ...files]);
    setUploadError("");
    console.log("Files uploaded successfully:", files);
  };

  const handleUploadError = (error: string) => {
    setUploadError(error);
    console.error("Upload error:", error);
  };

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="font-bold text-3xl">Enhanced File Upload System</h1>
        <p className="text-gray-600">
          Test the new multi-file upload system with transparent chunking
          support
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline">Multi-file Support</Badge>
          <Badge variant="outline">Automatic Chunking</Badge>
          <Badge variant="outline">Real-time Progress</Badge>
          <Badge variant="outline">Live Monitoring</Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs className="w-full" defaultValue="uploader">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="uploader">File Uploader</TabsTrigger>
          <TabsTrigger value="manager">Upload Manager</TabsTrigger>
        </TabsList>

        {/* File Uploader Tab */}
        <TabsContent className="space-y-6" value="uploader">
          {/* Upload Features */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Upload Features</CardTitle>
              <CardDescription>
                This enhanced uploader automatically handles both small and
                large files with optimal upload methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">
                    ✅ Transparent Method Selection
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Files &lt;100MB use direct upload, larger files
                    automatically use chunked multipart upload
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Multi-file Support</h4>
                  <p className="text-gray-600 text-sm">
                    Upload multiple files simultaneously with grouped progress
                    tracking
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Real-time Progress</h4>
                  <p className="text-gray-600 text-sm">
                    Live progress updates with speed calculation and part-level
                    tracking for large files
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">✅ Robust Error Handling</h4>
                  <p className="text-gray-600 text-sm">
                    Automatic retry logic and graceful handling of network
                    issues and failed uploads
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Uploader Component */}
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
            maxFileSize={5000 * 1024 * 1024}
            maxFiles={10} // 5GB
            onError={handleUploadError}
            onFilesUploaded={handleFilesUploaded}
          />

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
                  {uploadedFiles.map((file, index) => (
                    <div
                      className="flex items-center justify-between rounded bg-green-50 p-2"
                      key={index}
                    >
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-gray-600 text-sm">
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
        <TabsContent className="space-y-6" value="manager">
          {/* Manager Features */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Manager Features</CardTitle>
              <CardDescription>
                Monitor and manage all your upload sessions with real-time
                updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">📊 Live Monitoring</h4>
                  <p className="text-gray-600 text-sm">
                    Real-time updates via Server-Sent Events (SSE) for live
                    progress tracking
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">👥 Group Management</h4>
                  <p className="text-gray-600 text-sm">
                    View and manage upload groups with collective progress
                    tracking
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🔍 Detailed Views</h4>
                  <p className="text-gray-600 text-sm">
                    Drill down into individual sessions and multipart upload
                    parts
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">📈 Statistics</h4>
                  <p className="text-gray-600 text-sm">
                    Comprehensive stats on upload performance and completion
                    rates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Manager Component */}
          <EnhancedFileUploadManager
            autoRefresh={true}
            refreshInterval={3000}
            userId="test-user"
          />
        </TabsContent>
      </Tabs>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation Details</CardTitle>
          <CardDescription>
            Overview of the enhanced file upload system architecture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">🗄️ Database Layer</h4>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• UploadGroup entity for grouping files</li>
                <li>• Enhanced UploadSession with multipart support</li>
                <li>• FilePart entity for tracking chunks</li>
                <li>• Comprehensive relationship mapping</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🔧 Backend Services</h4>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Enhanced MinIO client with multipart APIs</li>
                <li>• Unified UploadSessionController</li>
                <li>• Repository pattern for data access</li>
                <li>• Webhook handling for MinIO events</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">⚡ Frontend Features</h4>
              <ul className="space-y-1 text-gray-600 text-sm">
                <li>• Transparent upload method selection</li>
                <li>• Real-time progress with SSE</li>
                <li>• Chunked upload with retry logic</li>
                <li>• Comprehensive management interface</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
