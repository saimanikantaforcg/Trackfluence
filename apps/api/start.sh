#!/bin/sh
# start.sh — run Prisma migrations then start the API
# Used as the Docker container entrypoint command.
set -e

SCHEMA="./packages/database/prisma/schema.prisma"
MIGRATIONS_DIR="./packages/database/prisma/migrations"

if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR 2>/dev/null)" ]; then
  echo "[startup] Running Prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy --schema="$SCHEMA"
else
  echo "[startup] No migrations found — running prisma db push (first deploy)..."
  ./node_modules/.bin/prisma db push --schema="$SCHEMA" --accept-data-loss
fi

echo "[startup] Schema ready. Starting API..."
exec node dist/main
