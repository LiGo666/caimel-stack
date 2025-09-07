#!/usr/bin/env python3
"""
ASR Worker for WhisperX transcription and alignment
Processes episodes to extract transcripts with word-level timestamps
"""
import os
import sys
import asyncio
import json
import tempfile
import logging
from pathlib import Path
from typing import Dict, List, Any

import torch
import whisperx
import numpy as np
from minio import Minio
from redis import Redis
from sqlalchemy import create_engine, text
from prometheus_client import Counter, Histogram, Gauge, start_http_server

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Metrics
JOBS_PROCESSED = Counter('asr_jobs_processed_total', 'Total ASR jobs processed')
JOB_DURATION = Histogram('asr_job_duration_seconds', 'ASR job processing duration')
GPU_MEMORY = Gauge('asr_gpu_memory_mb', 'GPU memory usage in MB')
ACTIVE_JOBS = Gauge('asr_active_jobs', 'Number of active ASR jobs')

class ASRWorker:
    def __init__(self):
        self.worker_id = f"asr-{os.getpid()}-{os.environ.get('HOSTNAME', 'unknown')}"
        self.setup_clients()
        self.setup_whisper()
        self.running = False

    def setup_clients(self):
        """Initialize Redis and MinIO clients"""
        # Redis client
        self.redis = Redis(
            host=os.environ['REDIS_HOSTNAME'],
            password=os.environ['REDIS_PASSWORD'],
            decode_responses=True
        )
        
        # MinIO client
        minio_endpoint = os.environ['MINIO_ENDPOINT']
        self.minio = Minio(
            minio_endpoint,
            access_key=os.environ['MINIO_ACCESS_KEY'],
            secret_key=os.environ['MINIO_SECRET_KEY'],
            secure=False
        )
        
        # Database connection
        self.db_url = os.environ['POSTGRES_DATABASE_URL']
        self.engine = create_engine(self.db_url)

    def setup_whisper(self):
        """Initialize WhisperX models"""
        logger.info("Initializing WhisperX models...")
        
        # Check GPU availability
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        # Load WhisperX model (we'll load it lazily to save memory)
        self.whisper_model = None
        self.align_model = None
        self.align_metadata = None
        
        logger.info("ASR Worker initialized successfully")

    def load_models(self, language: str = "en"):
        """Load WhisperX models on demand"""
        if self.whisper_model is None:
            logger.info("Loading Whisper model...")
            self.whisper_model = whisperx.load_model(
                "large-v3", 
                self.device,
                compute_type="float16" if self.device == "cuda" else "int8"
            )
        
        if self.align_model is None and language:
            logger.info(f"Loading alignment model for language: {language}")
            self.align_model, self.align_metadata = whisperx.load_align_model(
                language_code=language, 
                device=self.device
            )

    async def process_transcription_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a transcription job"""
        episode_id = job_data['episodeId']
        s3_key = job_data['s3Key']
        
        logger.info(f"Processing transcription for episode {episode_id}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download audio file
            input_path = Path(temp_dir) / "input_audio"
            
            logger.info(f"Downloading audio from {s3_key}")
            self.minio.fget_object('voice-episodes', s3_key, str(input_path))
            
            # Update progress
            await self.update_job_progress(job_data['jobId'], 20, "Audio downloaded, starting transcription")
            
            # Load models
            self.load_models()
            
            # Update GPU memory metrics
            if torch.cuda.is_available():
                GPU_MEMORY.set(torch.cuda.memory_allocated() / 1024 / 1024)
            
            # Transcribe with WhisperX
            logger.info("Starting transcription...")
            audio = whisperx.load_audio(str(input_path))
            result = self.whisper_model.transcribe(audio, batch_size=16)
            
            await self.update_job_progress(job_data['jobId'], 60, "Transcription complete, performing alignment")
            
            # Align whisper output
            if result['segments']:
                language = result.get('language', 'en')
                self.load_models(language)
                
                result = whisperx.align(
                    result['segments'], 
                    self.align_model, 
                    self.align_metadata, 
                    audio, 
                    self.device, 
                    return_char_alignments=False
                )
            
            await self.update_job_progress(job_data['jobId'], 80, "Alignment complete, saving results")
            
            # Process and save results
            transcript_data = self.process_whisper_result(result, episode_id)
            
            # Upload transcript to MinIO
            transcript_key = f"transcripts/{episode_id}/whisperx.json"
            transcript_json = json.dumps(transcript_data, indent=2)
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as f:
                f.write(transcript_json)
                f.flush()
                self.minio.fput_object('voice-episodes', transcript_key, f.name)
            
            # Save segments to database
            await self.save_transcript_segments(episode_id, transcript_data['segments'])
            
            await self.update_job_progress(job_data['jobId'], 100, "Transcription job completed")
            
            return {
                'transcriptKey': transcript_key,
                'language': result.get('language', 'unknown'),
                'duration': transcript_data['duration'],
                'segmentCount': len(transcript_data['segments']),
                'wordCount': transcript_data['word_count']
            }

    def process_whisper_result(self, result: Dict, episode_id: str) -> Dict[str, Any]:
        """Process WhisperX result into our format"""
        segments = []
        total_words = 0
        
        for segment in result.get('segments', []):
            # Extract word timestamps
            word_timestamps = []
            if 'words' in segment:
                for word in segment['words']:
                    word_timestamps.append({
                        'word': word.get('word', ''),
                        'startTime': word.get('start', 0),
                        'endTime': word.get('end', 0),
                        'confidence': word.get('score', 0)
                    })
                total_words += len(word_timestamps)
            
            segments.append({
                'startTime': segment.get('start', 0),
                'endTime': segment.get('end', 0),
                'text': segment.get('text', '').strip(),
                'confidence': segment.get('avg_logprob', 0),
                'wordTimestamps': word_timestamps
            })
        
        duration = max([seg['endTime'] for seg in segments]) if segments else 0
        
        return {
            'episodeId': episode_id,
            'language': result.get('language', 'unknown'),
            'segments': segments,
            'duration': duration,
            'word_count': total_words,
            'model_info': {
                'model': 'whisperx-large-v3',
                'version': '3.1.1',
                'device': self.device
            },
            'processed_at': str(asyncio.get_event_loop().time())
        }

    async def save_transcript_segments(self, episode_id: str, segments: List[Dict]):
        """Save transcript segments to database"""
        with self.engine.connect() as conn:
            for segment in segments:
                query = text("""
                    INSERT INTO "TranscriptSegment" (
                        id, "episodeId", "startTime", "endTime", text, confidence, 
                        "wordTimestamps", "createdAt"
                    ) VALUES (
                        gen_random_uuid(), :episode_id, :start_time, :end_time, 
                        :text, :confidence, :word_timestamps, NOW()
                    )
                """)
                
                conn.execute(query, {
                    'episode_id': episode_id,
                    'start_time': segment['startTime'],
                    'end_time': segment['endTime'],
                    'text': segment['text'],
                    'confidence': segment['confidence'],
                    'word_timestamps': json.dumps(segment['wordTimestamps'])
                })
            conn.commit()

    async def update_job_progress(self, job_id: str, progress: int, message: str):
        """Update job progress in Redis"""
        await asyncio.get_event_loop().run_in_executor(
            None, 
            self.redis.hset, 
            f"job:{job_id}", 
            'progress', progress
        )
        
        if message:
            await asyncio.get_event_loop().run_in_executor(
                None, 
                self.redis.hset, 
                f"job:{job_id}", 
                'message', message
            )

    async def get_next_job(self) -> Dict[str, Any] | None:
        """Get next transcription job from queue"""
        # Try priority queues in order
        queues = ['queue:TRANSCRIPTION:URGENT', 'queue:TRANSCRIPTION:HIGH', 
                 'queue:TRANSCRIPTION:NORMAL', 'queue:TRANSCRIPTION:LOW']
        
        for queue in queues:
            job_id = await asyncio.get_event_loop().run_in_executor(
                None, self.redis.brpop, queue, 1
            )
            
            if job_id:
                job_id = job_id[1]  # brpop returns (queue_name, job_id)
                
                # Get job data from database
                with self.engine.connect() as conn:
                    query = text("""
                        SELECT id, type, "inputData", status 
                        FROM "Job" 
                        WHERE id = :job_id AND status = 'QUEUED'
                    """)
                    result = conn.execute(query, {'job_id': job_id}).fetchone()
                    
                    if result:
                        # Mark as running
                        update_query = text("""
                            UPDATE "Job" 
                            SET status = 'RUNNING', "startedAt" = NOW(), "workerId" = :worker_id
                            WHERE id = :job_id
                        """)
                        conn.execute(update_query, {'job_id': job_id, 'worker_id': self.worker_id})
                        conn.commit()
                        
                        return {
                            'jobId': result[0],
                            'type': result[1],
                            **json.loads(result[2])  # inputData
                        }
        
        return None

    async def run_worker(self):
        """Main worker loop"""
        logger.info(f"Starting ASR worker {self.worker_id}")
        self.running = True
        
        while self.running:
            try:
                ACTIVE_JOBS.inc()
                
                job = await self.get_next_job()
                if not job:
                    await asyncio.sleep(1)
                    ACTIVE_JOBS.dec()
                    continue
                
                # Process job
                start_time = asyncio.get_event_loop().time()
                
                try:
                    result = await self.process_transcription_job(job)
                    
                    # Mark job as completed
                    with self.engine.connect() as conn:
                        query = text("""
                            UPDATE "Job" 
                            SET status = 'COMPLETED', progress = 100, "completedAt" = NOW(), "outputData" = :output
                            WHERE id = :job_id
                        """)
                        conn.execute(query, {
                            'job_id': job['jobId'],
                            'output': json.dumps(result)
                        })
                        conn.commit()
                    
                    JOBS_PROCESSED.inc()
                    
                except Exception as e:
                    logger.error(f"Job {job['jobId']} failed: {e}")
                    
                    # Mark job as failed
                    with self.engine.connect() as conn:
                        query = text("""
                            UPDATE "Job" 
                            SET status = 'FAILED', "errorMessage" = :error, "completedAt" = NOW()
                            WHERE id = :job_id
                        """)
                        conn.execute(query, {
                            'job_id': job['jobId'],
                            'error': str(e)
                        })
                        conn.commit()
                
                JOB_DURATION.observe(asyncio.get_event_loop().time() - start_time)
                ACTIVE_JOBS.dec()
                
            except Exception as e:
                logger.error(f"Worker error: {e}")
                await asyncio.sleep(5)
                ACTIVE_JOBS.dec()

    def stop(self):
        """Stop the worker"""
        self.running = False

async def main():
    """Main entry point"""
    # Start metrics server
    start_http_server(8080)
    
    # Create and run worker
    worker = ASRWorker()
    
    try:
        await worker.run_worker()
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
        worker.stop()

if __name__ == "__main__":
    asyncio.run(main())
