#!/usr/bin/env bash
set -euo pipefail

# Ensures the database from POSTGRES_DATABASE_URL exists; creates it if missing.
# Requires: postgresql-client (psql) in the container (installed in Dockerfile).

if [ -z "${POSTGRES_DATABASE_URL:-}" ]; then
  echo "[assert-postgres-db] POSTGRES_DATABASE_URL not set; skipping."
  exit 0
fi

# Extract DB name from the URI (last path segment before optional query)
DB_NAME="$(printf '%s' "$POSTGRES_DATABASE_URL" | sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#')"

if [ -z "$DB_NAME" ]; then
  echo "[assert-postgres-db] Could not parse database name from POSTGRES_DATABASE_URL."
  exit 1
fi

# Build an admin URL that connects to the 'postgres' database on the same server
# Works for postgres:// and postgresql:// schemes
ADMIN_URL="$(printf '%s' "$POSTGRES_DATABASE_URL" | sed -E 's#(^postgres(ql)?://[^/]+/)([^/?]+).*#\1postgres#')"

echo "[assert-postgres-db] Target DB: '$DB_NAME'"

# Wait for server to be reachable
ATTEMPTS=60
SLEEP_SECS=1
for i in $(seq 1 "$ATTEMPTS"); do
  if psql "$ADMIN_URL" -tAc 'SELECT 1' >/dev/null 2>&1; then
    break
  fi
  echo "[assert-postgres-db] Waiting for Postgres... ($i/$ATTEMPTS)"
  sleep "$SLEEP_SECS"
done

if ! psql "$ADMIN_URL" -tAc 'SELECT 1' >/dev/null 2>&1; then
  echo "[assert-postgres-db] ERROR: Postgres is not reachable at: $ADMIN_URL"
  exit 1
fi

# Check for database existence
EXISTS=$(psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | tr -d '[:space:]')
if [ "$EXISTS" = "1" ]; then
  echo "[assert-postgres-db] Database '$DB_NAME' already exists."
else
  echo "[assert-postgres-db] Creating database '$DB_NAME'..."
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DB_NAME\""
  echo "[assert-postgres-db] Database '$DB_NAME' created."
fi

# Enable pgvector extension
echo "[assert-postgres-db] Enabling pgvector extension..."
psql "${POSTGRES_DATABASE_URL}" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS vector;"
echo "[assert-postgres-db] pgvector extension enabled."

# If a Prisma schema exists at the feature path, generate the client
SCHEMA_PATH="/nextjs/src/repository/prisma/schema/schema.prisma"
if [ -f "$SCHEMA_PATH" ]; then
  echo "[assert-postgres-db] Prisma schema found at $SCHEMA_PATH — generating client..."
  if command -v pnpm >/dev/null 2>&1; then
    if [ "$(id -u)" = "0" ]; then
      # Run as node to keep file ownership consistent
      su -p -s /bin/bash -c "pnpm dlx prisma generate --schema '$SCHEMA_PATH'" node
    else
      pnpm dlx prisma generate --schema "$SCHEMA_PATH"
    fi
  else
    echo "[assert-postgres-db] WARNING: pnpm not found; skipping Prisma generate."
  fi
  # In non-production, also apply schema
  if [ "${NODE_ENV:-development}" != "production" ] && command -v pnpm >/dev/null 2>&1; then
    echo "[assert-postgres-db] Applying schema to database (db push)..."
    if [ "$(id -u)" = "0" ]; then
      su -p -s /bin/bash -c "pnpm dlx prisma db push --accept-data-loss --schema '$SCHEMA_PATH'" node
    else
      pnpm dlx prisma db push --accept-data-loss --schema "$SCHEMA_PATH"
    fi
  fi
else
  echo "[assert-postgres-db] No Prisma schema at $SCHEMA_PATH — skipping generate."
fi

# Move the seed execution to Next.js startup process in entrypoint.sh or similar
# Removed seed execution from here to ensure it runs after build
