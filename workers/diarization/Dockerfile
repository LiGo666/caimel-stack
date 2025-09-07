# Diarization Worker Dockerfile for pyannote.audio and VBx clustering
FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    curl \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY workers/diarization/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install pyannote.audio and dependencies
RUN pip install pyannote.audio==3.1.1
RUN pip install speechbrain==0.5.16

# Create models directory
RUN mkdir -p /models

# Copy worker code
COPY workers/diarization/ .
COPY src/features/ /app/features/

# Set environment variables
ENV PYTHONPATH=/app
ENV HF_HOME=/models/huggingface
ENV TORCH_HOME=/models/torch
ENV PYANNOTE_CACHE=/models/pyannote

# Create non-root user for security
RUN useradd -m -u 1000 worker
RUN chown -R worker:worker /app /models
USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import torch; print('GPU Available:', torch.cuda.is_available())"

# Expose metrics port
EXPOSE 8080

# Run the worker
CMD ["python", "worker.py"]
