#!/bin/sh

# Check if the sync health file exists and was updated within the last 120 seconds
if [ -f /tmp/cloudflare_sync_health ]; then
  current_time=$(date +%s)
  file_time=$(date -r /tmp/cloudflare_sync_health +%s)
  time_diff=$((current_time - file_time))
  
  if [ $time_diff -lt 120 ]; then
    exit 0  # Success: sync was performed within the last 120 seconds
  else
    echo "Health check failed: Last sync was $time_diff seconds ago (>120s limit)"
    exit 1
  fi
else
  echo "Health check failed: /tmp/cloudflare_sync_health file doesn't exist"
  exit 1
fi
