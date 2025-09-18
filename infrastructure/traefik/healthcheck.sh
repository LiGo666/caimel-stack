#!/bin/sh
# Just check if the API endpoint is accessible, which is sufficient to verify Traefik is running
wget --quiet --spider http://localhost:8080/api/version || wget --quiet --spider http://localhost:8080/ping
EXIT_CODE=$?

# Log the result for debugging
echo "Healthcheck completed with exit code: $EXIT_CODE"

# Return the exit code
exit $EXIT_CODE
