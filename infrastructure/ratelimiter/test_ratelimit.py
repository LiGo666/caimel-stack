#!/usr/bin/env python3
"""
Test script for Redis Rate Limiter API

This script tests the rate limiter by sending multiple requests in quick succession
and verifying that the rate limiter properly limits requests based on the configured limit.
"""

import requests
import time
import json
import sys
import uuid
import os
import socket
import argparse
from concurrent.futures import ThreadPoolExecutor

# Parse command line arguments
parser = argparse.ArgumentParser(description='Test Redis Rate Limiter API')
parser.add_argument('--health-check-only', action='store_true', help='Only perform health check and exit')
parser.add_argument('--quick-test', action='store_true', help='Run a quick test with fewer requests and shorter delays')
parser.add_argument('--performancetest', action='store_true', help='Run a throughput test to measure Redis write performance')
parser.add_argument('--duration', type=int, default=5, help='Duration of performance test in seconds (default: 5)')
parser.add_argument('--threads', type=int, default=10, help='Number of concurrent threads for performance test (default: 10)')
parser.add_argument('--port', type=int, default=8099, help='Port of the rate limiter service (default: 8099)')
args = parser.parse_args()

# Configuration
# Inside the container, the service is on localhost:8099
# From outside, it's mapped to localhost:8099
API_HOST = "localhost"
API_PORT = args.port or 8099
API_URL = f"http://{API_HOST}:{API_PORT}/ratelimit"
HEALTH_URL = f"http://{API_HOST}:{API_PORT}/healthz"

# Adjust settings based on quick test mode
if args.quick_test:
    REQUEST_LIMIT = 2  # Smaller limit for quick tests
    WINDOW_MS = 1000   # Shorter window (1 second) for quick tests
    REQUEST_DELAY = 0.1  # Shorter delay between requests
else:
    REQUEST_LIMIT = 5  # Number of requests allowed in the window
    WINDOW_MS = 10000  # Window size in milliseconds (10 seconds)
    REQUEST_DELAY = 0.5  # Delay between requests for readability

TEST_ID = f"test-{uuid.uuid4()}"  # Generate a unique ID for this test run

def make_request():
    """Make a single request to the rate limiter API"""
    payload = {
        "id": TEST_ID,
        "limit": REQUEST_LIMIT,
        "windowMs": WINDOW_MS,
        "algo": "sliding"  # Can be "sliding" or "fixed"
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        return response.status_code, response.json()
    except Exception as e:
        print(f"Error making request: {e}")
        return None, None

def test_rate_limit():
    """Test the rate limiter by making multiple requests"""
    print(f"\n🔍 Testing rate limiter with ID: {TEST_ID}")
    print(f"🔢 Request limit: {REQUEST_LIMIT}")
    print(f"⏱️ Window size: {WINDOW_MS}ms")
    print("\n📊 Results:")
    
    # Make REQUEST_LIMIT + 3 requests to ensure we hit the limit
    # For quick tests, just do REQUEST_LIMIT + 1
    total_requests = REQUEST_LIMIT + (1 if args.quick_test else 3)
    
    for i in range(total_requests):
        status_code, data = make_request()
        
        if status_code == 200 and data:
            allowed = "✅ ALLOWED" if data.get("allow") else "❌ BLOCKED"
            remaining = data.get("remaining", "N/A")
            reset_ms = data.get("reset", 0)
            reset_sec = (reset_ms - int(time.time() * 1000)) / 1000
            
            print(f"Request {i+1}/{total_requests}: {allowed} | Remaining: {remaining} | Reset in: {reset_sec:.1f}s")
            
            # If this request was blocked, show retry after info
            if not data.get("allow") and "retryAfter" in data:
                print(f"   ⏳ Retry after: {data['retryAfter']}s")
        else:
            print(f"Request {i+1}/{total_requests}: ❗ Error | Status: {status_code}")
        
        # Small delay between requests to make output readable
        time.sleep(REQUEST_DELAY)
    
    # For quick tests, skip the final verification
    if args.quick_test:
        # Check if we saw at least one blocked request
        blocked_seen = any(not make_request()[1].get("allow", True) for _ in range(2))
        
        print("\n🧪 Quick Test Summary:")
        if blocked_seen:
            print("✅ PASS: Rate limiter correctly blocked requests")
            return True
        else:
            print("❌ FAIL: Rate limiter did not block any requests")
            return False
    else:
        # Full verification for normal mode
        allowed_count = sum(1 for i in range(total_requests) if make_request()[1] and make_request()[1].get("allow"))
        
        print("\n🧪 Test Summary:")
        if allowed_count <= REQUEST_LIMIT:
            print(f"✅ PASS: Rate limiter correctly limited requests ({allowed_count} allowed out of {total_requests})")
            return True
        else:
            print(f"❌ FAIL: Rate limiter allowed too many requests ({allowed_count} allowed, should be <= {REQUEST_LIMIT})")
            return False

def test_concurrent_requests():
    """Test the rate limiter with concurrent requests"""
    print(f"\n🔄 Testing concurrent requests with ID: {TEST_ID}-concurrent")
    
    # Make concurrent requests
    with ThreadPoolExecutor(max_workers=REQUEST_LIMIT + 3) as executor:
        futures = [executor.submit(make_request) for _ in range(REQUEST_LIMIT + 3)]
        
        results = []
        for future in futures:
            status_code, data = future.result()
            if data:
                results.append(data.get("allow", False))
    
    # Count allowed requests
    allowed_count = sum(1 for r in results if r)
    
    print("\n🧪 Concurrent Test Summary:")
    if allowed_count <= REQUEST_LIMIT:
        print(f"✅ PASS: Rate limiter correctly limited concurrent requests ({allowed_count} allowed out of {len(results)})")
        return True
    else:
        print(f"❌ FAIL: Rate limiter allowed too many concurrent requests ({allowed_count} allowed, should be <= {REQUEST_LIMIT})")
        return False

def test_redis_write():
    """Test Redis write operations by making a rate limit request"""
    health_test_id = f"health-test-{uuid.uuid4()}"
    payload = {
        "id": health_test_id,
        "limit": 1,  # Set limit to 1 to easily test write operations
        "windowMs": 1000,  # Short window
        "algo": "sliding"
    }
    
    try:
        # First request should be allowed and write to Redis
        response1 = requests.post(API_URL, json=payload)
        if response1.status_code != 200:
            print(f"❌ Redis write test failed: First request returned status {response1.status_code}")
            return False
        
        data1 = response1.json()
        if not data1.get("allow"):
            print("❌ Redis write test failed: First request was not allowed")
            return False
            
        # Second request should be blocked because of the limit (proving Redis write worked)
        response2 = requests.post(API_URL, json=payload)
        if response2.status_code != 200:
            print(f"❌ Redis write test failed: Second request returned status {response2.status_code}")
            return False
            
        data2 = response2.json()
        if data2.get("allow"):
            print("❌ Redis write test failed: Second request was allowed (should be blocked)")
            return False
            
        print("✅ Redis write test passed: Rate limiting is working correctly")
        return True
    except Exception as e:
        print(f"❌ Redis write test failed with error: {e}")
        return False

def make_performance_request(request_id):
    """Make a single request with a random ID for performance testing"""
    # Generate a unique ID for each request to avoid rate limiting effects
    random_id = f"perf-{uuid.uuid4()}"
    
    payload = {
        "id": random_id,
        "limit": 1000,  # High limit to avoid rate limiting during performance test
        "windowMs": 60000,  # 1 minute window
        "algo": "sliding"
    }
    
    try:
        start_time = time.time()
        # Add timeout to prevent hanging requests
        response = requests.post(API_URL, json=payload, timeout=1.0)
        end_time = time.time()
        
        if response.status_code == 200:
            return True, end_time - start_time
        else:
            return False, end_time - start_time
    except requests.exceptions.Timeout:
        # Handle timeout specifically
        return False, 1.0  # Return the timeout value
    except Exception:
        return False, 0

def run_performance_test(duration_seconds=5, num_threads=10):
    """Run a performance test to measure Redis write throughput"""
    print(f"\n🚀 Running performance test for {duration_seconds} seconds with {num_threads} threads")
    print("📊 Measuring Redis write throughput with random identifiers...\n")
    
    # Set up counters and timing variables
    successful_requests = 0
    failed_requests = 0
    total_time = 0
    request_times = []
    
    start_time = time.time()
    end_time = start_time + duration_seconds
    request_id = 0
    
    # Use ThreadPoolExecutor for concurrent requests
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = []
        
        # Submit initial batch of requests
        for _ in range(num_threads):
            request_id += 1
            futures.append(executor.submit(make_performance_request, request_id))
        
        # Keep track of progress
        last_progress_time = time.time()
        progress_interval = 1.0  # Show progress every second
        
        # Continue submitting and processing requests until duration is reached
        while time.time() < end_time:
            # Show progress indicator
            current_time = time.time()
            if current_time - last_progress_time >= progress_interval:
                elapsed = current_time - start_time
                remaining = duration_seconds - elapsed
                print(f"⏱️  Progress: {elapsed:.1f}s elapsed, {remaining:.1f}s remaining, {request_id} requests submitted", end="\r")
                last_progress_time = current_time
            
            # Check for completed futures
            done_futures = []
            for i, future in enumerate(futures):
                if future.done():
                    success, request_time = future.result()
                    if success:
                        successful_requests += 1
                        total_time += request_time
                        request_times.append(request_time)
                    else:
                        failed_requests += 1
                    done_futures.append(i)
            
            # Remove completed futures and submit new ones
            for i in sorted(done_futures, reverse=True):
                futures.pop(i)
                if time.time() < end_time:  # Only add new if we're still within duration
                    request_id += 1
                    futures.append(executor.submit(make_performance_request, request_id))
            
            # Small sleep to prevent CPU spinning
            time.sleep(0.01)
        
        print("\n⏱️  Test duration completed. Waiting for remaining requests to finish...")
        
        # Process any remaining futures
        for future in futures:
            try:
                success, request_time = future.result(timeout=2.0)  # Add timeout to prevent hanging
                if success:
                    successful_requests += 1
                    total_time += request_time
                    request_times.append(request_time)
                else:
                    failed_requests += 1
            except Exception as e:
                failed_requests += 1
    
    # Calculate statistics
    actual_duration = time.time() - start_time
    total_requests = successful_requests + failed_requests
    requests_per_second = successful_requests / actual_duration if actual_duration > 0 else 0
    avg_request_time = (total_time / successful_requests) * 1000 if successful_requests > 0 else 0  # in ms
    
    # Calculate percentiles if we have enough data
    if request_times:
        request_times.sort()
        p50 = request_times[len(request_times) // 2] * 1000  # in ms
        p95_idx = int(len(request_times) * 0.95)
        p95 = request_times[p95_idx] * 1000 if p95_idx < len(request_times) else 0  # in ms
        p99_idx = int(len(request_times) * 0.99)
        p99 = request_times[p99_idx] * 1000 if p99_idx < len(request_times) else 0  # in ms
    else:
        p50 = p95 = p99 = 0
    
    # Print results
    print("\n📈 Performance Test Results:")
    print(f"Duration: {actual_duration:.2f} seconds")
    print(f"Total Requests: {total_requests}")
    print(f"Successful Requests: {successful_requests}")
    print(f"Failed Requests: {failed_requests}")
    print(f"Throughput: {requests_per_second:.2f} requests/second")
    print(f"Average Request Time: {avg_request_time:.2f} ms")
    print(f"P50 Latency: {p50:.2f} ms")
    print(f"P95 Latency: {p95:.2f} ms")
    print(f"P99 Latency: {p99:.2f} ms")
    
    return successful_requests > 0

def check_health():
    """Check if the service is healthy"""
    try:
        print(f"Connecting to {HEALTH_URL} for health check...")
        health_response = requests.get(HEALTH_URL)
        if health_response.status_code != 200:
            print(f"❌ Health check failed with status code {health_response.status_code}")
            return False
        print("✅ Health check passed")
        
        # Also test Redis write operations
        print("\nTesting Redis write operations...")
        if not test_redis_write():
            return False
            
        return True
    except Exception as e:
        print(f"❌ Could not connect to rate limiter service: {e}")
        print(f"Make sure the service is running on {HEALTH_URL}")
        return False

if __name__ == "__main__":
    # If health-check-only mode is enabled, just do the health check and exit
    if args.health_check_only:
        if check_health():
            sys.exit(0)
        else:
            sys.exit(1)
    
    # If performance test mode is enabled, run the performance test
    if args.performancetest:
        if not check_health():
            print("\n❌ Health check failed. Cannot run performance test.")
            sys.exit(1)
        
        # Run the performance test with specified duration and threads
        performance_result = run_performance_test(
            duration_seconds=args.duration,
            num_threads=args.threads
        )
        
        if performance_result:
            print("\n✅ PERFORMANCE TEST COMPLETED SUCCESSFULLY")
            sys.exit(0)
        else:
            print("\n❌ PERFORMANCE TEST FAILED: No successful requests were made")
            sys.exit(1)
    
    # Otherwise, run the full test or quick test
    if not check_health():
        sys.exit(1)
    
    # Run sequential test
    sequential_result = test_rate_limit()
    
    # For quick tests, skip the concurrent test and waiting period
    if args.quick_test:
        if sequential_result:
            print("\n✅ QUICK TEST PASSED: Rate limiter is working correctly!")
            sys.exit(0)
        else:
            print("\n❌ QUICK TEST FAILED: Rate limiter may not be working correctly")
            sys.exit(1)
    
    # Wait for rate limit to reset
    print(f"\n⏳ Waiting for rate limit to reset ({WINDOW_MS/1000} seconds)...")
    time.sleep(WINDOW_MS/1000 + 1)
    
    # Run concurrent test
    concurrent_result = test_concurrent_requests()
    
    # Overall result
    if sequential_result and concurrent_result:
        print("\n✅ ALL TESTS PASSED: Rate limiter is working correctly!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED: Rate limiter may not be working correctly")
        sys.exit(1)
