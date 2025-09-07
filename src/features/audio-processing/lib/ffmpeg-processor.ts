import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { AudioFormat, FFmpegOptions } from '../types'

export class FFmpegProcessor {
  private static readonly TEMP_DIR = '/tmp/audio-processing'

  static async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.TEMP_DIR, { recursive: true })
    } catch (error) {
      // Directory already exists
    }
  }

  static async extractAudioMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-show_format',
        '-show_streams',
        '-print_format', 'json',
        inputPath
      ])

      let stdout = ''
      let stderr = ''

      ffprobe.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      ffprobe.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const metadata = JSON.parse(stdout)
            resolve(metadata)
          } catch (error) {
            reject(new Error(`Failed to parse ffprobe output: ${error}`))
          }
        } else {
          reject(new Error(`ffprobe failed with code ${code}: ${stderr}`))
        }
      })
    })
  }

  static async normalizeAudio(inputPath: string, outputPath: string, options: FFmpegOptions): Promise<void> {
    await this.ensureTempDir()
    
    const args = [
      '-i', inputPath,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',  // EBU R128 loudness normalization
      '-ar', (options.sampleRate || 16000).toString(),
      '-ac', (options.channels || 1).toString(),
    ]

    if (options.format === 'wav') {
      args.push('-f', 'wav')
    } else if (options.format === 'mp3') {
      args.push('-codec:a', 'libmp3lame', '-b:a', options.bitrate || '128k')
    }

    if (options.startTime !== undefined) {
      args.splice(2, 0, '-ss', options.startTime.toString())
    }

    if (options.duration !== undefined) {
      args.push('-t', options.duration.toString())
    }

    args.push('-y', outputPath)

    return this.runFFmpeg(args)
  }

  static async extractSegment(
    inputPath: string, 
    outputPath: string, 
    startTime: number, 
    duration: number,
    format: AudioFormat = 'wav'
  ): Promise<void> {
    await this.ensureTempDir()

    const args = [
      '-i', inputPath,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-ar', '16000',
      '-ac', '1',
      '-f', format,
      '-y', outputPath
    ]

    return this.runFFmpeg(args)
  }

  static async convertToWav(inputPath: string, outputPath: string): Promise<void> {
    await this.ensureTempDir()

    const args = [
      '-i', inputPath,
      '-ar', '16000',
      '-ac', '1',
      '-f', 'wav',
      '-y', outputPath
    ]

    return this.runFFmpeg(args)
  }

  static async detectSilence(inputPath: string, silenceThreshold: number = -50): Promise<Array<{start: number, end: number}>> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-af', `silencedetect=noise=${silenceThreshold}dB:duration=0.5`,
        '-f', 'null',
        '-'
      ])

      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0 || code === 1) { // FFmpeg returns 1 for null output, which is expected
          try {
            const silenceRegex = /silence_start: ([\d.]+).*?silence_end: ([\d.]+)/g
            const silences: Array<{start: number, end: number}> = []
            let match

            while ((match = silenceRegex.exec(stderr)) !== null) {
              silences.push({
                start: parseFloat(match[1]),
                end: parseFloat(match[2])
              })
            }

            resolve(silences)
          } catch (error) {
            reject(new Error(`Failed to parse silence detection output: ${error}`))
          }
        } else {
          reject(new Error(`Silence detection failed with code ${code}: ${stderr}`))
        }
      })
    })
  }

  private static runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`Running ffmpeg with args: ${args.join(' ')}`)
      
      const ffmpeg = spawn('ffmpeg', args)
      let stderr = ''

      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`))
        }
      })

      ffmpeg.on('error', (error) => {
        reject(new Error(`Failed to start ffmpeg: ${error.message}`))
      })
    })
  }

  static generateTempFilePath(extension: string): string {
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`
    return join(this.TEMP_DIR, filename)
  }

  static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`Failed to cleanup temp file ${filePath}:`, error)
    }
  }
}
