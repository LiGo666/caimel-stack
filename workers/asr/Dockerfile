# ASR Worker Dockerfile for WhisperX transcription and alignment
FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY workers/asr/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install WhisperX from source for latest features
RUN pip install git+https://github.com/m-bain/whisperx.git

# Create models directory
RUN mkdir -p /models

# Copy worker code
COPY workers/asr/ .
COPY src/features/ /app/features/

# Set environment variables
ENV PYTHONPATH=/app
ENV HF_HOME=/models/huggingface
ENV TORCH_HOME=/models/torch
ENV WHISPERX_MODEL_DIR=/models/whisperx

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
