#!/bin/bash
set -e

echo "[prisma-db-push] Running Prisma DB push with --accept-data-loss flag"
cd /nextjs
npx prisma db push --accept-data-loss
echo "[prisma-db-push] Prisma DB push completed successfully"
