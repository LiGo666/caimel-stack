#!/usr/bin/env python3
"""
TTS Worker for XTTS-v2 voice cloning and synthesis
Processes synthesis requests and voice training jobs
"""
import os
import sys
import asyncio
import json
import tempfile
import logging
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional

import torch
import numpy as np
from TTS.api import TTS
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts
from minio import Minio
from redis import Redis
from sqlalchemy import create_engine, text
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Metrics
JOBS_PROCESSED = Counter('tts_jobs_processed_total', 'Total TTS jobs processed')
JOB_DURATION = Histogram('tts_job_duration_seconds', 'TTS job processing duration')
GPU_MEMORY = Gauge('tts_gpu_memory_mb', 'GPU memory usage in MB')
ACTIVE_JOBS = Gauge('tts_active_jobs', 'Number of active TTS jobs')
SYNTHESIS_COUNT = Counter('tts_synthesis_count_total', 'Total synthesis requests')

class TTSWorker:
    def __init__(self):
        self.worker_id = f"tts-{os.getpid()}-{os.environ.get('HOSTNAME', 'unknown')}"
        self.setup_clients()
        self.setup_models()
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
        # Fix postgres:// to postgresql:// for SQLAlchemy 2.0+
        if self.db_url.startswith('postgres://'):
            self.db_url = self.db_url.replace('postgres://', 'postgresql://', 1)
        self.engine = create_engine(self.db_url)

    def setup_models(self):
        """Initialize TTS models"""
        logger.info("Initializing TTS models...")
        
        # Check GPU availability
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Models will be loaded lazily to save memory
        self.xtts_model = None
        self.tts_api = None
        
        logger.info("TTS Worker initialized successfully")

    def load_xtts_model(self):
        """Load XTTS-v2 model on demand"""
        if self.xtts_model is None:
            logger.info("Loading XTTS-v2 model...")
            
            # Initialize TTS API with XTTS-v2
            self.tts_api = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(self.device)
            
            # Load the actual model for more control
            config_path = "/models/xtts_v2/config.json"
            model_path = "/models/xtts_v2/model.pth"
            
            # If model files don't exist locally, they'll be downloaded by TTS
            if not Path(config_path).exists():
                logger.info("XTTS-v2 model not found locally, will be downloaded on first use")
            
            logger.info("XTTS-v2 model loaded successfully")

    async def process_tts_synthesis_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a TTS synthesis job"""
        synthesis_request_id = job_data['synthesisRequestId']
        speaker_id = job_data.get('speakerId')
        voice_model_id = job_data.get('voiceModelId')
        input_text = job_data['inputText']
        parameters = job_data.get('parameters', {})
        
        logger.info(f"Processing TTS synthesis for request {synthesis_request_id}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            await self.update_job_progress(job_data['jobId'], 10, "Starting TTS synthesis")
            
            # Load XTTS model
            self.load_xtts_model()
            
            # Update GPU memory metrics
            if torch.cuda.is_available():
                GPU_MEMORY.set(torch.cuda.memory_allocated() / 1024 / 1024)
            
            # Get voice reference
            voice_reference_path = await self.prepare_voice_reference(
                speaker_id, voice_model_id, temp_dir
            )
            
            await self.update_job_progress(job_data['jobId'], 30, "Voice reference prepared, synthesizing speech")
            
            # Perform synthesis
            output_audio = await self.synthesize_speech(
                input_text, voice_reference_path, parameters, temp_dir
            )
            
            await self.update_job_progress(job_data['jobId'], 80, "Synthesis complete, saving output")
            
            # Save output to MinIO
            output_key = f"synth/{speaker_id or 'unknown'}/{synthesis_request_id}/output.wav"
            
            output_path = Path(temp_dir) / "output.wav"
            sf.write(str(output_path), output_audio['audio'], output_audio['sample_rate'])
            
            self.minio.fput_object('voice-episodes', output_key, str(output_path))
            
            # Update synthesis request in database
            await self.update_synthesis_request(
                synthesis_request_id, output_key, output_audio['duration'], parameters
            )
            
            await self.update_job_progress(job_data['jobId'], 100, "TTS synthesis completed")
            
            SYNTHESIS_COUNT.inc()
            
            return {
                'outputKey': output_key,
                'duration': output_audio['duration'],
                'sampleRate': output_audio['sample_rate'],
                'qualityScore': output_audio.get('quality_score', 0.85)
            }

    async def process_tts_training_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a TTS voice training job"""
        voice_model_id = job_data['voiceModelId']
        speaker_id = job_data['speakerId']
        training_config = job_data['trainingConfig']
        
        logger.info(f"Processing TTS training for voice model {voice_model_id}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            await self.update_job_progress(job_data['jobId'], 5, "Preparing training data")
            
            # Download training segments
            training_segments = await self.prepare_training_data(
                speaker_id, training_config['segments'], temp_dir
            )
            
            await self.update_job_progress(job_data['jobId'], 20, "Training data prepared, starting fine-tuning")
            
            # Perform fine-tuning (simplified for MVP)
            model_output = await self.fine_tune_voice(
                training_segments, training_config, temp_dir
            )
            
            await self.update_job_progress(job_data['jobId'], 90, "Training complete, saving model")
            
            # Save trained model to MinIO
            model_key = f"voices/{speaker_id}/xtts-v2/v1/model.pth"
            config_key = f"voices/{speaker_id}/xtts-v2/v1/config.json"
            
            self.minio.fput_object('voice-episodes', model_key, model_output['model_path'])
            self.minio.fput_object('voice-episodes', config_key, model_output['config_path'])
            
            # Update voice model in database
            await self.update_voice_model(voice_model_id, model_key, config_key, model_output)
            
            await self.update_job_progress(job_data['jobId'], 100, "Voice training completed")
            
            return {
                'modelKey': model_key,
                'configKey': config_key,
                'trainingDuration': model_output['training_duration'],
                'qualityScore': model_output['quality_score']
            }

    async def prepare_voice_reference(
        self, 
        speaker_id: Optional[str], 
        voice_model_id: Optional[str], 
        temp_dir: str
    ) -> str:
        """Prepare voice reference for synthesis"""
        
        if voice_model_id:
            # Use fine-tuned model
            with self.engine.connect() as conn:
                query = text("""
                    SELECT "s3KeyModel", "s3KeyConfig" 
                    FROM "VoiceModel" 
                    WHERE id = :voice_model_id AND "isReady" = true
                """)
                result = conn.execute(query, {'voice_model_id': voice_model_id}).fetchone()
                
                if result:
                    # Download fine-tuned model
                    model_path = Path(temp_dir) / "fine_tuned_model.pth"
                    self.minio.fget_object('voice-episodes', result[0], str(model_path))
                    return str(model_path)
        
        if speaker_id:
            # Use speaker reference clips for zero-shot
            with self.engine.connect() as conn:
                query = text("""
                    SELECT ds."s3Key"
                    FROM "DiarizationSegment" ds
                    JOIN "Speaker" s ON ds."speakerId" = s.id
                    WHERE s.id = :speaker_id AND ds."s3Key" IS NOT NULL
                    ORDER BY ds.confidence DESC
                    LIMIT 5
                """)
                results = conn.execute(query, {'speaker_id': speaker_id}).fetchall()
                
                if results:
                    # Download and concatenate reference clips
                    reference_clips = []
                    for i, (s3_key,) in enumerate(results):
                        clip_path = Path(temp_dir) / f"ref_clip_{i}.wav"
                        self.minio.fget_object('voice-episodes', s3_key, str(clip_path))
                        
                        # Load audio
                        audio, sr = sf.read(str(clip_path))
                        reference_clips.append(audio)
                    
                    # Concatenate clips
                    if reference_clips:
                        combined_audio = np.concatenate(reference_clips)
                        reference_path = Path(temp_dir) / "voice_reference.wav"
                        sf.write(str(reference_path), combined_audio, sr)
                        return str(reference_path)
        
        # Fallback: use default voice
        logger.warning("No voice reference found, using default voice")
        return None

    async def synthesize_speech(
        self, 
        text: str, 
        voice_reference: Optional[str], 
        parameters: Dict[str, Any], 
        temp_dir: str
    ) -> Dict[str, Any]:
        """Perform TTS synthesis with XTTS-v2"""
        
        # Extract parameters
        speed = parameters.get('speed', 1.0)
        language = parameters.get('language', 'en')
        
        try:
            if voice_reference and Path(voice_reference).exists():
                # Zero-shot synthesis with voice reference
                logger.info("Performing zero-shot synthesis with voice reference")
                
                # Use TTS API for zero-shot synthesis
                output_path = Path(temp_dir) / "synthesis_output.wav"
                
                self.tts_api.tts_to_file(
                    text=text,
                    speaker_wav=voice_reference,
                    language=language,
                    file_path=str(output_path)
                )
                
                # Load the generated audio
                audio, sample_rate = sf.read(str(output_path))
                
            else:
                # Use default XTTS voice
                logger.info("Performing synthesis with default voice")
                
                output_path = Path(temp_dir) / "synthesis_output.wav"
                
                self.tts_api.tts_to_file(
                    text=text,
                    language=language,
                    file_path=str(output_path)
                )
                
                audio, sample_rate = sf.read(str(output_path))
            
            # Apply speed adjustment if needed
            if speed != 1.0:
                # Simple time-stretching (in production, use proper algorithms)
                import librosa
                audio = librosa.effects.time_stretch(audio, rate=speed)
            
            duration = len(audio) / sample_rate
            
            return {
                'audio': audio,
                'sample_rate': sample_rate,
                'duration': duration,
                'quality_score': 0.85  # Default quality score
            }
            
        except Exception as e:
            logger.error(f"TTS synthesis failed: {e}")
            raise e

    async def prepare_training_data(
        self, 
        speaker_id: str, 
        segment_ids: List[str], 
        temp_dir: str
    ) -> List[str]:
        """Prepare training data for fine-tuning"""
        training_files = []
        
        with self.engine.connect() as conn:
            for segment_id in segment_ids:
                query = text("""
                    SELECT ds."s3Key", ts.text
                    FROM "DiarizationSegment" ds
                    JOIN "TranscriptSegment" ts ON (
                        ds."episodeId" = ts."episodeId" AND
                        ds."startTime" <= ts."endTime" AND
                        ds."endTime" >= ts."startTime"
                    )
                    WHERE ds.id = :segment_id AND ds."s3Key" IS NOT NULL
                """)
                result = conn.execute(query, {'segment_id': segment_id}).fetchone()
                
                if result:
                    s3_key, text = result
                    
                    # Download audio segment
                    audio_path = Path(temp_dir) / f"training_{len(training_files)}.wav"
                    self.minio.fget_object('voice-episodes', s3_key, str(audio_path))
                    
                    # Create training metadata
                    training_files.append({
                        'audio_path': str(audio_path),
                        'text': text,
                        'speaker_id': speaker_id
                    })
        
        return training_files

    async def fine_tune_voice(
        self, 
        training_segments: List[Dict], 
        config: Dict[str, Any], 
        temp_dir: str
    ) -> Dict[str, Any]:
        """Fine-tune XTTS model (simplified implementation for MVP)"""
        logger.info("Starting voice fine-tuning...")
        
        # In production, this would implement actual fine-tuning
        # For MVP, we'll simulate the process and return mock results
        
        # Simulate training time
        await asyncio.sleep(10)
        
        # Create mock output files
        model_path = Path(temp_dir) / "fine_tuned_model.pth"
        config_path = Path(temp_dir) / "fine_tuned_config.json"
        
        # Create dummy files (in production, these would be real trained models)
        torch.save({'model': 'mock_fine_tuned_model'}, str(model_path))
        
        with open(str(config_path), 'w') as f:
            json.dump({
                'model_type': 'xtts_v2_fine_tuned',
                'speaker_id': training_segments[0]['speaker_id'] if training_segments else 'unknown',
                'training_segments': len(training_segments),
                'fine_tuned_at': str(asyncio.get_event_loop().time())
            }, f)
        
        training_duration = sum([3.5 for _ in training_segments])  # Mock duration
        
        return {
            'model_path': str(model_path),
            'config_path': str(config_path),
            'training_duration': training_duration,
            'quality_score': 0.88
        }

    async def update_synthesis_request(
        self, 
        request_id: str, 
        output_key: str, 
        duration: float, 
        parameters: Dict[str, Any]
    ):
        """Update synthesis request in database"""
        with self.engine.connect() as conn:
            query = text("""
                UPDATE "SynthesisRequest"
                SET status = 'COMPLETED', "outputS3Key" = :output_key, 
                    duration = :duration, parameters = :parameters, "updatedAt" = NOW()
                WHERE id = :request_id
            """)
            conn.execute(query, {
                'request_id': request_id,
                'output_key': output_key,
                'duration': duration,
                'parameters': json.dumps(parameters)
            })
            conn.commit()

    async def update_voice_model(
        self, 
        model_id: str, 
        model_key: str, 
        config_key: str, 
        training_result: Dict[str, Any]
    ):
        """Update voice model in database"""
        with self.engine.connect() as conn:
            query = text("""
                UPDATE "VoiceModel"
                SET "s3KeyModel" = :model_key, "s3KeyConfig" = :config_key,
                    "qualityScore" = :quality_score, "isReady" = true, "updatedAt" = NOW()
                WHERE id = :model_id
            """)
            conn.execute(query, {
                'model_id': model_id,
                'model_key': model_key,
                'config_key': config_key,
                'quality_score': training_result['quality_score']
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
        """Get next TTS job from queue"""
        # Try priority queues in order
        job_types = ['TTS_SYNTHESIS', 'TTS_TRAINING']
        priorities = ['URGENT', 'HIGH', 'NORMAL', 'LOW']
        
        for job_type in job_types:
            for priority in priorities:
                queue = f'queue:{job_type}:{priority}'
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
        logger.info(f"Starting TTS worker {self.worker_id}")
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
                    if job['type'] == 'TTS_SYNTHESIS':
                        result = await self.process_tts_synthesis_job(job)
                    elif job['type'] == 'TTS_TRAINING':
                        result = await self.process_tts_training_job(job)
                    else:
                        result = {'message': f"Job type {job['type']} not yet implemented"}
                    
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
    worker = TTSWorker()
    
    try:
        await worker.run_worker()
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
        worker.stop()

if __name__ == "__main__":
    asyncio.run(main())
