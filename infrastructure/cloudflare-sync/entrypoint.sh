#!/bin/sh

touch /var/log/cloudflare-sync.log

# Run full sync once immediately at startup
python /app/sync_cloudflare.py

echo "Initial DNS sync completed, starting cron for periodic updates..."

# Install cron job to run lightweight_check.py every minute
echo "* * * * * python /app/lightweight_check.py >> /var/log/cloudflare-sync.log 2>&1" > /etc/crontabs/root

# Start cron service for scheduled checks
exec crond -f
