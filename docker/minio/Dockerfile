FROM minio/minio:latest

# Install curl for health checks (if not already present)
USER root
RUN microdnf install -y curl || apk add --no-cache curl || apt-get update && apt-get install -y curl

# Copy our custom entrypoint script
COPY docker/minio/entrypoint.sh /usr/local/bin/minio-entrypoint.sh
RUN chmod +x /usr/local/bin/minio-entrypoint.sh

# Switch back to minio user
USER minio

# Use our custom entrypoint
ENTRYPOINT ["/usr/local/bin/minio-entrypoint.sh"]
