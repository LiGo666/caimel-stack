FROM python:3.12-alpine

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir pyyaml requests

# Create log directory
RUN mkdir -p /var/log

# Install curl and jq
RUN apk add --no-cache curl jq

# Copy scripts
COPY ./sync_cloudflare.py /app/sync_cloudflare.py
COPY ./lightweight_check.py /app/lightweight_check.py
COPY ./entrypoint.sh /app/entrypoint.sh
COPY ./syncPerformedWithinLast120seconds.sh /app/syncPerformedWithinLast120seconds.sh
RUN chmod +x /app/sync_cloudflare.py /app/lightweight_check.py /app/entrypoint.sh /app/syncPerformedWithinLast120seconds.sh

# Run the entrypoint script
CMD ["/app/entrypoint.sh"]
