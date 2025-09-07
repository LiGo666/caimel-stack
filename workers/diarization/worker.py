#!/usr/bin/env python3
"""
Diarization Worker for pyannote.audio speaker separation and VBx clustering
Processes transcribed episodes to identify and separate speakers
"""
import os
import sys
import asyncio
import json
import tempfile
import logging
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Tuple

import torch
import numpy as np
from pyannote.audio import Pipeline
from pyannote.audio.pipelines import VoiceActivityDetection, SpeakerDiarization
from speechbrain.pretrained import EncoderClassifier
from minio import Minio
from redis import Redis
from sqlalchemy import create_engine, text
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import librosa
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Metrics
JOBS_PROCESSED = Counter('diarization_jobs_processed_total', 'Total diarization jobs processed')
JOB_DURATION = Histogram('diarization_job_duration_seconds', 'Diarization job processing duration')
GPU_MEMORY = Gauge('diarization_gpu_memory_mb', 'GPU memory usage in MB')
ACTIVE_JOBS = Gauge('diarization_active_jobs', 'Number of active diarization jobs')

class DiarizationWorker:
    def __init__(self):
        self.worker_id = f"diarization-{os.getpid()}-{os.environ.get('HOSTNAME', 'unknown')}"
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
        """Initialize pyannote.audio models"""
        logger.info("Initializing diarization models...")
        
        # Check GPU availability
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
        # Models will be loaded lazily to save memory
        self.diarization_pipeline = None
        self.vad_pipeline = None
        self.embedding_model = None
        
        logger.info("Diarization Worker initialized successfully")

    def load_models(self):
        """Load models on demand"""
        if self.diarization_pipeline is None:
            logger.info("Loading speaker diarization pipeline...")
            # Using pyannote.audio speaker diarization pipeline
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=os.environ.get('HUGGINGFACE_TOKEN')
            )
            self.diarization_pipeline.to(self.device)
        
        if self.vad_pipeline is None:
            logger.info("Loading VAD pipeline...")
            self.vad_pipeline = Pipeline.from_pretrained(
                "pyannote/voice-activity-detection",
                use_auth_token=os.environ.get('HUGGINGFACE_TOKEN')
            )
            self.vad_pipeline.to(self.device)
        
        if self.embedding_model is None:
            logger.info("Loading speaker embedding model...")
            self.embedding_model = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir="/models/speechbrain/spkrec-ecapa-voxceleb",
                run_opts={"device": self.device}
            )

    async def process_diarization_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a diarization job"""
        episode_id = job_data['episodeId']
        s3_key = job_data['s3Key']
        
        logger.info(f"Processing diarization for episode {episode_id}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            # Download audio file
            input_path = Path(temp_dir) / "input_audio.wav"
            
            logger.info(f"Downloading audio from {s3_key}")
            self.minio.fget_object('voice-episodes', s3_key, str(input_path))
            
            await self.update_job_progress(job_data['jobId'], 10, "Audio downloaded, starting VAD")
            
            # Load models
            self.load_models()
            
            # Update GPU memory metrics
            if torch.cuda.is_available():
                GPU_MEMORY.set(torch.cuda.memory_allocated() / 1024 / 1024)
            
            # Convert to appropriate format for pyannote
            audio_path = await self.prepare_audio(str(input_path), temp_dir)
            
            await self.update_job_progress(job_data['jobId'], 20, "Starting speaker diarization")
            
            # Perform speaker diarization
            diarization_result = self.diarization_pipeline(audio_path)
            
            await self.update_job_progress(job_data['jobId'], 60, "Diarization complete, extracting embeddings")
            
            # Extract speaker embeddings
            embeddings_data = await self.extract_speaker_embeddings(
                audio_path, diarization_result, episode_id, temp_dir
            )
            
            await self.update_job_progress(job_data['jobId'], 80, "Saving diarization results")
            
            # Process and save results
            segments = self.process_diarization_result(diarization_result, episode_id)
            
            # Save RTTM file to MinIO
            rttm_key = f"diarization/{episode_id}/segments.rttm"
            rttm_content = self.generate_rttm(segments, episode_id)
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.rttm') as f:
                f.write(rttm_content)
                f.flush()
                self.minio.fput_object('voice-episodes', rttm_key, f.name)
            
            # Save segments and speakers to database
            await self.save_diarization_results(episode_id, segments, embeddings_data)
            
            await self.update_job_progress(job_data['jobId'], 100, "Diarization job completed")
            
            return {
                'rttmKey': rttm_key,
                'segmentCount': len(segments),
                'speakerCount': len(set(seg['speakerId'] for seg in segments)),
                'totalDuration': max([seg['endTime'] for seg in segments]) if segments else 0,
                'embeddingCount': len(embeddings_data)
            }

    async def prepare_audio(self, input_path: str, temp_dir: str) -> str:
        """Prepare audio file for pyannote processing"""
        output_path = Path(temp_dir) / "prepared_audio.wav"
        
        # Load and resample to 16kHz mono for pyannote
        audio, sr = librosa.load(input_path, sr=16000, mono=True)
        sf.write(str(output_path), audio, 16000)
        
        return str(output_path)

    async def extract_speaker_embeddings(
        self, 
        audio_path: str, 
        diarization_result, 
        episode_id: str, 
        temp_dir: str
    ) -> List[Dict[str, Any]]:
        """Extract speaker embeddings using ECAPA-TDNN"""
        embeddings_data = []
        
        # Load audio
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        
        # Group segments by speaker
        speaker_segments = {}
        for segment, _, speaker in diarization_result.itertracks(yield_label=True):
            if speaker not in speaker_segments:
                speaker_segments[speaker] = []
            speaker_segments[speaker].append((segment.start, segment.end))
        
        for speaker_id, segments in speaker_segments.items():
            # Extract embeddings from multiple segments for this speaker
            speaker_embeddings = []
            
            for start_time, end_time in segments[:10]:  # Limit to first 10 segments
                # Extract audio segment
                start_sample = int(start_time * sr)
                end_sample = int(end_time * sr)
                segment_audio = audio[start_sample:end_sample]
                
                # Skip very short segments
                if len(segment_audio) < sr * 0.5:  # Minimum 0.5 seconds
                    continue
                
                # Extract embedding
                with tempfile.NamedTemporaryFile(suffix='.wav') as f:
                    sf.write(f.name, segment_audio, sr)
                    
                    # Get embedding from speechbrain
                    embedding = self.embedding_model.encode_batch(
                        torch.tensor(segment_audio).unsqueeze(0).to(self.device)
                    )
                    embedding_np = embedding.squeeze().cpu().numpy()
                    
                    speaker_embeddings.append(embedding_np)
            
            if speaker_embeddings:
                # Average embeddings for this speaker
                avg_embedding = np.mean(speaker_embeddings, axis=0)
                
                # Generate hash for deduplication
                embedding_hash = hashlib.sha256(avg_embedding.tobytes()).hexdigest()
                
                # Save embedding to MinIO
                embedding_key = f"embeddings/{episode_id}/spk-{embedding_hash}.npy"
                
                with tempfile.NamedTemporaryFile(suffix='.npy') as f:
                    np.save(f.name, avg_embedding)
                    self.minio.fput_object('voice-episodes', embedding_key, f.name)
                
                embeddings_data.append({
                    'speakerId': speaker_id,
                    'episodeId': episode_id,
                    'embedding': avg_embedding.tolist(),
                    'embeddingHash': embedding_hash,
                    's3Key': embedding_key,
                    'modelName': 'ECAPA-TDNN',
                    'modelVersion': '1.0.0',
                    'segmentCount': len(segments),
                    'confidence': 0.85  # Default confidence
                })
        
        return embeddings_data

    def process_diarization_result(self, diarization_result, episode_id: str) -> List[Dict[str, Any]]:
        """Process pyannote diarization result into our format"""
        segments = []
        
        for segment, _, speaker in diarization_result.itertracks(yield_label=True):
            segments.append({
                'episodeId': episode_id,
                'startTime': segment.start,
                'endTime': segment.end,
                'speakerId': f"spk_{speaker}",
                'confidence': 0.9,  # pyannote doesn't provide confidence, use default
                'duration': segment.end - segment.start
            })
        
        # Sort by start time
        segments.sort(key=lambda x: x['startTime'])
        
        return segments

    def generate_rttm(self, segments: List[Dict], episode_id: str) -> str:
        """Generate RTTM format output"""
        rttm_lines = []
        
        for segment in segments:
            # RTTM format: SPEAKER <file-id> <channel> <start> <duration> <NA> <NA> <speaker-id> <confidence> <NA>
            line = f"SPEAKER {episode_id} 1 {segment['startTime']:.3f} {segment['duration']:.3f} <NA> <NA> {segment['speakerId']} {segment['confidence']:.3f} <NA>"
            rttm_lines.append(line)
        
        return '\n'.join(rttm_lines)

    async def save_diarization_results(self, episode_id: str, segments: List[Dict], embeddings_data: List[Dict]):
        """Save diarization results to database"""
        with self.engine.connect() as conn:
            # Create speakers first
            speaker_ids = set(seg['speakerId'] for seg in segments)
            for speaker_id in speaker_ids:
                # Calculate speaker statistics
                speaker_segments = [seg for seg in segments if seg['speakerId'] == speaker_id]
                total_duration = sum(seg['duration'] for seg in speaker_segments)
                avg_confidence = sum(seg['confidence'] for seg in speaker_segments) / len(speaker_segments)
                
                query = text("""
                    INSERT INTO "Speaker" (
                        id, "episodeId", "autoId", "totalDuration", "segmentCount", 
                        "averageConfidence", "createdAt", "updatedAt"
                    ) VALUES (
                        gen_random_uuid(), :episode_id, :auto_id, :total_duration, 
                        :segment_count, :avg_confidence, NOW(), NOW()
                    )
                    ON CONFLICT ("episodeId", "autoId") DO UPDATE SET
                        "totalDuration" = :total_duration,
                        "segmentCount" = :segment_count,
                        "averageConfidence" = :avg_confidence,
                        "updatedAt" = NOW()
                    RETURNING id
                """)
                
                result = conn.execute(query, {
                    'episode_id': episode_id,
                    'auto_id': speaker_id,
                    'total_duration': total_duration,
                    'segment_count': len(speaker_segments),
                    'avg_confidence': avg_confidence
                }).fetchone()
                
                speaker_db_id = result[0]
                
                # Save segments
                for segment in speaker_segments:
                    segment_query = text("""
                        INSERT INTO "DiarizationSegment" (
                            id, "episodeId", "startTime", "endTime", "speakerId", 
                            confidence, "createdAt"
                        ) VALUES (
                            gen_random_uuid(), :episode_id, :start_time, :end_time, 
                            :speaker_id, :confidence, NOW()
                        )
                    """)
                    
                    conn.execute(segment_query, {
                        'episode_id': episode_id,
                        'start_time': segment['startTime'],
                        'end_time': segment['endTime'],
                        'speaker_id': speaker_db_id,
                        'confidence': segment['confidence']
                    })
                
                # Save embeddings for this speaker
                speaker_embeddings = [emb for emb in embeddings_data if emb['speakerId'] == speaker_id]
                for embedding in speaker_embeddings:
                    embedding_query = text("""
                        INSERT INTO "SpeakerEmbedding" (
                            id, "speakerId", "episodeId", "modelName", "modelVersion",
                            "embeddingHash", "s3Key", confidence, "createdAt"
                        ) VALUES (
                            gen_random_uuid(), :speaker_id, :episode_id, :model_name, 
                            :model_version, :embedding_hash, :s3_key, :confidence, NOW()
                        )
                    """)
                    
                    conn.execute(embedding_query, {
                        'speaker_id': speaker_db_id,
                        'episode_id': episode_id,
                        'model_name': embedding['modelName'],
                        'model_version': embedding['modelVersion'],
                        'embedding_hash': embedding['embeddingHash'],
                        's3_key': embedding['s3Key'],
                        'confidence': embedding['confidence']
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
        """Get next diarization job from queue"""
        # Try priority queues in order
        job_types = ['DIARIZATION', 'EMBEDDING_EXTRACTION', 'SPEAKER_CLUSTERING']
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
        logger.info(f"Starting diarization worker {self.worker_id}")
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
                    if job['type'] == 'DIARIZATION':
                        result = await self.process_diarization_job(job)
                    else:
                        # Handle other job types (EMBEDDING_EXTRACTION, SPEAKER_CLUSTERING)
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
    worker = DiarizationWorker()
    
    try:
        await worker.run_worker()
    except KeyboardInterrupt:
        logger.info("Shutting down worker...")
        worker.stop()

if __name__ == "__main__":
    asyncio.run(main())
