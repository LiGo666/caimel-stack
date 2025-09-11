#!/bin/sh
set -e

# Setup function to run in the background after server starts
setup_minio() {
    # Wait for MinIO to be ready
    echo "Waiting for MinIO server to be ready..."
    sleep 10
    
    # Try to set up MinIO client and buckets
    for i in $(seq 1 30); do
        if mc alias set myminio http://localhost:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"; then
            echo "Successfully set up MinIO client"
            break
        fi
        echo "Attempt $i: Waiting for MinIO to be ready..."
        sleep 5
    done
    
    # Create upload bucket
    mc mb -p myminio/upload || true
    echo "Created upload bucket"
    
    # Add event notification
    mc event add myminio/upload arn:minio:sqs::CLAMAV:webhook --event put || echo "Failed to add event notification"
    echo "Setup complete"
}

# Start the setup process in the background
setup_minio &

# Start MinIO server in the foreground with the full path
exec /usr/bin/minio "$@"
