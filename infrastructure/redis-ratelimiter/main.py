import os, time, math, json, uuid, asyncio, sys
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
import uvicorn

# Required environment variables
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

# Optional environment variables with defaults
REDIS_PORT = 6379
REDIS_DB = 0
NAMESPACE = os.getenv("NAMESPACE_PREFIX", "ratelimit:")

# Validate required environment variables
if not REDIS_HOST:
    print("ERROR: REDIS_HOST environment variable is required")
    sys.exit(1)

if not REDIS_PASSWORD:
    print("ERROR: REDIS_PASSWORD environment variable is required")
    sys.exit(1)

# Override defaults if provided
if os.getenv("REDIS_PORT"):
    try:
        REDIS_PORT = int(os.getenv("REDIS_PORT"))
    except ValueError:
        print("ERROR: REDIS_PORT must be an integer")
        sys.exit(1)
        
if os.getenv("REDIS_DB"):
    try:
        REDIS_DB = int(os.getenv("REDIS_DB"))
    except ValueError:
        print("ERROR: REDIS_DB must be an integer")
        sys.exit(1)

r = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    db=REDIS_DB,
    password=REDIS_PASSWORD,
    decode_responses=True
)
app = FastAPI(title="ratelimit-api", version="0.1.0")

def k(id_: str) -> str:
    return f"{NAMESPACE}{id_}"

async def _sliding_window(id_: str, limit: int, window_ms: int) -> Dict[str, Any]:
    now = int(time.time() * 1000)
    key = k(id_)
    # 1) Trim old entries, 2) count current
    pipe = r.pipeline()
    pipe.zremrangebyscore(key, 0, now - window_ms)
    pipe.zcard(key)
    trimmed, count = await pipe.execute()

    # If already over limit, compute reset from oldest entry
    if count >= limit:
        oldest = await r.zrange(key, 0, 0, withscores=True)
        reset_ms = now + window_ms  # fallback
        if oldest:
            reset_ms = int(oldest[0][1]) + window_ms
        retry_after = max(0, math.ceil((reset_ms - now) / 1000))
        return {
            "allow": False,
            "limit": limit,
            "remaining": 0,
            "reset": reset_ms,
            "retryAfter": retry_after,
        }

    # Otherwise record this hit and set a key TTL so Redis can clean up
    member = f"{now}-{uuid.uuid4()}"
    pipe = r.pipeline()
    pipe.zadd(key, {member: now})
    # Keep a short-ish TTL so idle keys vanish (window + buffer)
    pipe.pexpire(key, window_ms + 60_000)
    await pipe.execute()

    # Remaining after this hit
    remaining = max(0, limit - (count + 1))

    # Earliest timestamp in the window → when we fully reset
    oldest = await r.zrange(key, 0, 0, withscores=True)
    reset_ms = now + window_ms
    if oldest:
        reset_ms = int(oldest[0][1]) + window_ms

    return {
        "allow": True,
        "limit": limit,
        "remaining": remaining,
        "reset": reset_ms,
    }

@app.get("/healthz")
async def healthz():
    ok = await r.ping()
    return {"ok": bool(ok)}

@app.post("/ratelimit")
async def ratelimit(req: Request):
    try:
        body = await req.json()
    except Exception:
        raise HTTPException(status_code=400, detail="invalid JSON")

    # Minimal contract: { id, limit, windowMs, algo? }
    id_ = str(body.get("id", "")).strip()
    limit = int(body.get("limit", 5))
    window_ms = int(body.get("windowMs", 10_000))
    algo = (body.get("algo") or "sliding").lower()

    if not id_:
        raise HTTPException(status_code=400, detail="missing id")

    try:
        if algo == "sliding":
            result = await asyncio.wait_for(_sliding_window(id_, limit, window_ms), timeout=2.0)
        elif algo == "fixed":
            # fixed window: INCR + EXPIRE
            now = int(time.time() * 1000)
            key = k(f"fw:{id_}:{now // window_ms}")
            pipe = r.pipeline()
            pipe.incr(key)
            pipe.pexpire(key, window_ms)  # set/refresh ttl for this bucket
            value, _ = await pipe.execute()
            remaining = max(0, limit - int(value))
            allow = value <= limit
            # reset is end of this fixed bucket
            bucket_end = (now // window_ms + 1) * window_ms
            out = {
                "allow": bool(allow),
                "limit": limit,
                "remaining": remaining if allow else 0,
                "reset": bucket_end,
            }
            if not allow:
                out["retryAfter"] = max(0, math.ceil((bucket_end - now) / 1000))
            result = out
        else:
            raise HTTPException(status_code=400, detail="unsupported algo")
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="timeout")

    return JSONResponse(result)

@app.on_event("shutdown")
async def _close():
    try:
        await r.close()
    except Exception:
        pass

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
