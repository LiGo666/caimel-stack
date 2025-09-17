#!/usr/bin/env python3
"""
Simple healthcheck script for the Redis Rate Limiter service.
"""
import sys
import urllib.request

try:
    response = urllib.request.urlopen('http://localhost:8000/healthz')
    if response.getcode() == 200:
        sys.exit(0)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
