#!/usr/bin/env node

// MinIO connection test script (ESM)
// Reads configuration from environment variables and attempts a simple API call
// to verify connectivity and credentials.
//
// Required env vars:
//   MINIO_ENDPOINT    e.g. "localhost" or "https://minio.local:9000"
//   MINIO_PORT        e.g. "9000" (optional if endpoint contains a port)
//   MINIO_USE_SSL     e.g. "true" | "false" (optional; inferred from protocol if provided)
//   MINIO_ACCESS_KEY  access key
//   MINIO_SECRET_KEY  secret key

import { Client } from "minio";

// Configuration constants
const CONNECTION_TIMEOUT_MS = 5000; // 5 seconds
const MS_TO_SECONDS = 1000; // Conversion factor from milliseconds to seconds
const DEFAULT_PORT = 9000; // Default MinIO port

// Parse command line arguments
function parseCliArgs() {
  const args = {};
  const rawArgs = process.argv.slice(2);
  
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('--') 
        ? rawArgs[++i] 
        : true;
      args[key] = value;
    }
  }
  
  return args;
}

function mask(value, keep = 2) {
  if (!value) return "(not set)";
  if (value.length <= keep) return "*".repeat(value.length);
  return `${value.slice(0, keep)}${"*".repeat(Math.max(0, value.length - keep))}`;
}

function parseBool(val) {
  if (typeof val === "boolean") return val;
  if (val == null) return false;
  const v = String(val).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

// Parse endpoint string to extract hostname, port, and protocol
function parseEndpointString(rawEndpoint) {
  let endPoint = rawEndpoint;
  let port = null;
  let useSSL = null;
  
  // If endpoint contains a scheme, parse it as a URL
  if (rawEndpoint.includes("://")) {
    try {
      const url = new URL(rawEndpoint);
      endPoint = url.hostname;
      if (url.port) port = Number(url.port);
      useSSL = url.protocol === "https:";
    } catch {
      // ignore parse errors and fall back to raw values
    }
  } else {
    // Support "host:port" format (incl. IPv6 in brackets)
    const m = rawEndpoint.match(/^\[?([^\]]+)\]:(\d+)$/);
    if (m) {
      endPoint = m[1];
      port = Number(m[2]);
    }
  }
  
  return { endPoint, port, useSSL };
}

function resolveConfigFromEnv() {
  // Parse command line arguments
  const cliArgs = parseCliArgs();
  
  // Get raw endpoint from CLI or env
  const rawEndpoint = cliArgs.endpoint || process.env.MINIO_ENDPOINT || "localhost";
  
  // Parse the endpoint string
  const parsedEndpoint = parseEndpointString(rawEndpoint);
  
  // Determine port with precedence: CLI > parsed endpoint > env vars > defaults
  let port = DEFAULT_PORT;
  if (cliArgs.port) {
    port = Number(cliArgs.port);
  } else if (parsedEndpoint.port) {
    port = parsedEndpoint.port;
  } else if (process.env.MINIO_PORT) {
    port = Number(process.env.MINIO_PORT);
  }
  
  // Determine SSL setting with precedence: CLI > parsed endpoint > env vars > defaults
  let useSSL = false;
  if ('no-ssl' in cliArgs) {
    useSSL = !cliArgs['no-ssl'];
  } else if (parsedEndpoint.useSSL !== null) {
    useSSL = parsedEndpoint.useSSL;
  } else {
    useSSL = parseBool(process.env.MINIO_USE_SSL ?? "false");
  }
  
  // Build final config
  const config = {
    endPoint: parsedEndpoint.endPoint,
    port,
    useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || "",
    secretKey: process.env.MINIO_SECRET_KEY || ""
  };

  return config;
}

function listBucketsAsync(client) {
  return new Promise((resolve, reject) => {
    // MinIO SDK historically uses callbacks; wrap for promise usage
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${CONNECTION_TIMEOUT_MS / MS_TO_SECONDS} seconds`));
    }, CONNECTION_TIMEOUT_MS);
    
    client.listBuckets((err, buckets) => {
      clearTimeout(timeoutId);
      if (err) return reject(err);
      return resolve(buckets || []);
    });
  });
}

async function main() {
  // Parse command line arguments
  const cliArgs = parseCliArgs();
  
  if (cliArgs.help) {
    console.log(`
MinIO Connection Test

Usage:
  node minio-connection-test.mjs [options]

Options:
  --endpoint <host>    Override MinIO endpoint (default: MINIO_ENDPOINT env var or "localhost")
  --port <number>      Override MinIO port (default: MINIO_PORT env var or 9000)
  --no-ssl            Disable SSL/TLS (default: uses MINIO_USE_SSL env var)
  --help              Show this help message
`);
    process.exit(0);
  }
  
  const cfg = resolveConfigFromEnv();

  if (!cfg.accessKey || !cfg.secretKey) {
    console.error("[minio-test] MINIO_ACCESS_KEY or MINIO_SECRET_KEY is missing in environment.");
    process.exit(1);
  }

  console.log("[minio-test] Starting MinIO connection test...");
  console.log(`[minio-test] Endpoint: ${cfg.useSSL ? "https" : "http"}://${cfg.endPoint}`); // Don't show port in logs
  console.log(`[minio-test] Access Key: ${mask(cfg.accessKey)}`);
  console.log(`[minio-test] Secret Key: ${mask(cfg.secretKey)}`);

  const client = new Client({
    endPoint: cfg.endPoint,
    port: cfg.port,
    useSSL: cfg.useSSL,
    accessKey: cfg.accessKey,
    secretKey: cfg.secretKey,
    connectTimeout: CONNECTION_TIMEOUT_MS, // Connection timeout
  });

  try {
    const buckets = await listBucketsAsync(client);
    console.log(`[minio-test] Connected successfully. Buckets (${buckets.length}):`);
    for (const b of buckets) {
      const created = b?.creationDate?.toISOString?.() ?? String(b?.creationDate ?? "unknown");
      console.log(` - ${b?.name ?? "(no-name)"} (created ${created})`);
    }
    process.exit(0);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.error(`[minio-test] Connection failed: ${msg}`);
    if (cfg.useSSL && msg.toLowerCase().includes("self signed")) {
      console.error(
        "[minio-test] Hint: Using self-signed certs? You may temporarily set NODE_TLS_REJECT_UNAUTHORIZED=0 when running this test."
      );
    }
    process.exit(2);
  }
}

main();
