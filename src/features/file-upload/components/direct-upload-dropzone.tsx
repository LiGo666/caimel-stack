"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/features/shadcn/components/ui/card"
import { Button } from "@/features/shadcn/components/ui/button"
import { Input } from "@/features/shadcn/components/ui/input"
import { Label } from "@/features/shadcn/components/ui/label"
import { Textarea } from "@/features/shadcn/components/ui/textarea"
import { Progress } from "@/features/shadcn/components/ui/progress"
import { useDirectUpload } from "../hooks/use-direct-upload"
import { cn } from "@/features/shadcn/lib/utils"
import { Upload, FileAudio, X } from "lucide-react"

interface DirectUploadDropzoneProps {
   onUploadComplete?: (episodeId: string, uploadUrl: string) => void
   className?: string
}

export function DirectUploadDropzone({ onUploadComplete, className }: DirectUploadDropzoneProps) {
   const t = useTranslations("app.episodes.upload")
   const [isDragOver, setIsDragOver] = useState(false)
   const [selectedFile, setSelectedFile] = useState<File | null>(null)
   const [title, setTitle] = useState("")
   const [description, setDescription] = useState("")
   
   // Use our new direct upload hook
   const { upload, isUploading, progress, currentEpisode, reset } = useDirectUpload({
      onSuccess: (episodeId, uploadUrl) => {
         // Reset form
         setSelectedFile(null)
         setTitle("")
         setDescription("")
         
         // Call the callback if provided
         onUploadComplete?.(episodeId, uploadUrl)
      },
      onError: (error) => {
         // Handle error in a client-safe way
         alert(`Upload failed: ${error}`)
      }
   })

   const validateFile = (file: File): boolean => {
      const maxSize = 200 * 1024 * 1024 // 200MB
      const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/x-wav"]

      if (file.size > maxSize) {
         alert(t("error.fileTooBig.description", { size: Math.round(file.size / 1024 / 1024) }))
         return false
      }

      if (!allowedTypes.includes(file.type)) {
         alert(t("error.invalidFormat.description"))
         return false
      }

      return true
   }

   const handleFileSelect = useCallback(
      (files: FileList | null) => {
         if (files && files.length > 0) {
            const file = files[0]
            if (validateFile(file)) {
               setSelectedFile(file)
               if (!title) {
                  // Auto-generate title from filename
                  const name = file.name.replace(/\.[^/.]+$/, "")
                  setTitle(name)
               }
            }
         }
      },
      [title, t],
   )

   const handleDrop = useCallback(
      (e: React.DragEvent) => {
         e.preventDefault()
         setIsDragOver(false)
         handleFileSelect(e.dataTransfer.files)
      },
      [handleFileSelect],
   )

   const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(true)
   }, [])

   const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
   }, [])

   const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
   }

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      if (!selectedFile || !title.trim()) {
         alert(t("error.missingData.description"))
         return
      }

      // Use our direct upload hook to handle the upload
      await upload(title.trim(), description.trim() || undefined, selectedFile)
   }

   const removeFile = () => {
      setSelectedFile(null)
      reset()
   }

   return (
      <Card className={cn("w-full max-w-2xl", className)}>
         <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
               {/* File Drop Zone */}
               {!selectedFile ? (
                  <div
                     onDrop={handleDrop}
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                     className={cn(
                        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                        isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                     )}
                  >
                     <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                     <h3 className="text-lg font-semibold mb-2">{t("dropzone.title")}</h3>
                     <p className="text-muted-foreground mb-4">{t("dropzone.description")}</p>
                     <div className="space-y-2">
                        <Button type="button" variant="outline" asChild>
                           <label className="cursor-pointer">
                              {t("dropzone.browse")}
                              <input type="file" accept="audio/*" onChange={handleFileInput} className="sr-only" />
                           </label>
                        </Button>
                        <p className="text-xs text-muted-foreground">{t("dropzone.formats")}</p>
                        <p className="text-xs font-medium text-primary">Supports files up to 200MB</p>
                     </div>
                  </div>
               ) : (
                  <div className="border rounded-lg p-4 bg-muted/50">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <FileAudio className="h-8 w-8 text-primary" />
                           <div>
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-muted-foreground">{Math.round(selectedFile.size / 1024 / 1024)}MB</p>
                           </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={removeFile} disabled={isUploading}>
                           <X className="h-4 w-4" />
                        </Button>
                     </div>
                     {isUploading && (
                        <div className="mt-4">
                           <Progress value={progress} className="h-2" />
                           <p className="text-sm text-muted-foreground mt-1">{t("uploading.progress", { progress })}</p>
                        </div>
                     )}
                  </div>
               )}

               {/* Episode Metadata */}
               <div className="space-y-4">
                  <div>
                     <Label htmlFor="title">{t("form.title.label")}</Label>
                     <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("form.title.placeholder")}
                        required
                        disabled={isUploading}
                     />
                  </div>
                  <div>
                     <Label htmlFor="description">{t("form.description.label")}</Label>
                     <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("form.description.placeholder")}
                        rows={3}
                        disabled={isUploading}
                     />
                  </div>
               </div>

               {/* Submit Button */}
               <Button type="submit" className="w-full" disabled={!selectedFile || !title.trim() || isUploading}>
                  {isUploading ? t("uploading.button") : t("form.submit")}
               </Button>
            </form>
         </CardContent>
      </Card>
   )
}
