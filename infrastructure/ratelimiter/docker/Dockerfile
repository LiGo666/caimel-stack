FROM python:3.11-slim

# Install Redis and supervisord
RUN apt-get update && apt-get install -y \
    redis-server \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY main.py .
COPY healthcheck.py .
COPY test_ratelimit.py .
COPY docker/supervisord.conf .

# Create supervisord configuration
RUN mkdir -p /var/log/supervisor
RUN cp supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Make scripts executable
RUN chmod +x healthcheck.py test_ratelimit.py

EXPOSE 8099 6379

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
