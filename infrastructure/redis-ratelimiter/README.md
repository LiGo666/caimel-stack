# Redis Rate Limiter API

A FastAPI-based service that provides rate limiting functionality using Redis as a backend.

## Features

- Sliding window rate limiting algorithm (precise, fair distribution)
- Fixed window rate limiting algorithm (simpler, less precise)
- Configurable limits and window sizes
- Health check endpoint
- Docker ready

## API Endpoints

### Health Check

```
GET /healthz
```

Returns `{"ok": true}` if the service and Redis connection are healthy.

### Rate Limit Check

```
POST /ratelimit
```

Request body:

```json
{
  "id": "user-123",       // Required: Identifier for the rate limit subject
  "limit": 100,           // Optional: Maximum requests allowed (default: 5)
  "windowMs": 60000,      // Optional: Time window in milliseconds (default: 10000)
  "algo": "sliding"       // Optional: Algorithm - "sliding" or "fixed" (default: "sliding")
}
```

Response:

```json
{
  "allow": true,          // Whether the request is allowed
  "limit": 100,           // The configured limit
  "remaining": 99,        // Remaining requests in the current window
  "reset": 1632512345678  // Timestamp (ms) when the limit fully resets
}
```

If rate limited:

```json
{
  "allow": false,         // Request is not allowed
  "limit": 100,           // The configured limit
  "remaining": 0,         // No requests remaining
  "reset": 1632512345678, // Timestamp (ms) when the limit fully resets
  "retryAfter": 30        // Seconds until the client should retry
}
```

## Environment Variables

- `REDIS_HOST`: Redis host (default: "redis")
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_DB`: Redis database number (default: 0)
- `NAMESPACE_PREFIX`: Prefix for Redis keys (default: "ratelimit:")
- `PORT`: Server port (default: 8000)

## Usage

### Docker

The service is available as a Docker container and can be run with:

```bash
docker compose up redis-ratelimiter
```

### Direct

```bash
pip install -r requirements.txt
python main.py
```
