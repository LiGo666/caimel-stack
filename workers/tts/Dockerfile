# TTS Worker Dockerfile for XTTS-v2 voice cloning and synthesis
FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    wget \
    curl \
    libsndfile1 \
    espeak-ng \
    espeak-ng-data \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY workers/tts/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install TTS (Coqui) for XTTS-v2
RUN pip install TTS==0.22.0

# Create models directory
RUN mkdir -p /models

# Copy worker code
COPY workers/tts/ .
COPY src/features/ /app/features/

# Set environment variables
ENV PYTHONPATH=/app
ENV HF_HOME=/models/huggingface
ENV TORCH_HOME=/models/torch
ENV TTS_HOME=/models/tts

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
