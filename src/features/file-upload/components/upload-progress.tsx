"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/features/shadcn/components/ui/card'
import { Progress } from '@/src/features/shadcn/components/ui/progress'
import { Badge } from '@/src/features/shadcn/components/ui/badge'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface UploadProgressProps {
  episodeId: string
  onComplete?: () => void
}

interface JobProgress {
  jobId: string
  type: string
  progress: number
  status: string
  message?: string
}

export function UploadProgress({ episodeId, onComplete }: UploadProgressProps) {
  const t = useTranslations("app.episodes.upload.progress")
  const [jobs, setJobs] = useState<JobProgress[]>([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // In production, this would use WebSocket or Server-Sent Events
    // For now, simulate progress updates
    const interval = setInterval(async () => {
      try {
        // Mock job progress data
        const mockJobs: JobProgress[] = [
          {
            jobId: '1',
            type: 'TRANSCRIPTION',
            progress: Math.min(100, Date.now() % 100000 / 1000),
            status: 'RUNNING',
            message: 'Processing with WhisperX...'
          },
          {
            jobId: '2', 
            type: 'DIARIZATION',
            progress: 0,
            status: 'QUEUED',
            message: 'Waiting for transcription...'
          }
        ]

        setJobs(mockJobs)

        // Check if all jobs are complete
        const allComplete = mockJobs.every(job => job.status === 'COMPLETED')
        if (allComplete && !isComplete) {
          setIsComplete(true)
          onComplete?.()
        }
      } catch (error) {
        console.error('Error fetching job progress:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [episodeId, isComplete, onComplete])

  const getStatusIcon = (status: string, progress: number) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'RUNNING':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          )}
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <div key={job.jobId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status, job.progress)}
                <span className="font-medium">{t(`job.${job.type.toLowerCase()}`)}</span>
                <Badge className={getStatusColor(job.status)}>
                  {t(`status.${job.status.toLowerCase()}`)}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {job.progress}%
              </span>
            </div>
            
            <Progress value={job.progress} className="h-2" />
            
            {job.message && (
              <p className="text-sm text-muted-foreground">{job.message}</p>
            )}
          </div>
        ))}
        
        {isComplete && (
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="font-medium text-green-800">{t('completed')}</p>
            <p className="text-sm text-green-600">{t('completedMessage')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
