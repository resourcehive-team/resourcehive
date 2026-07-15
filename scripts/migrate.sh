#!/usr/bin/env bash
set -euo pipefail

# scripts/migrate.sh
# Run all SQL migration files in db/migrations/ in numeric order.
# Usage: scripts/migrate.sh [--dry-run]

echo "[DEBUG] Script started"
echo "[DEBUG] Script location: ${BASH_SOURCE[0]}"
echo "[DEBUG] Current directory: $(pwd)"

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
  echo "[DEBUG] DRY_RUN mode enabled"
fi

# Load environment from .env if it exists
ENV_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"
echo "[DEBUG] Looking for .env at: $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  echo "[DEBUG] Loading $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
  echo "[DEBUG] .env loaded successfully"
else
  echo "[DEBUG] .env not found at $ENV_FILE"
fi

MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/db/migrations"
LOG_PREFIX="[migrate]"

echo "[DEBUG] MIGRATIONS_DIR=$MIGRATIONS_DIR"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "$LOG_PREFIX migrations directory not found: $MIGRATIONS_DIR" >&2
  exit 1
fi

if [ -z "${POSTGRES_OWNER_URL:-}" ]; then
  echo "$LOG_PREFIX POSTGRES_OWNER_URL environment variable is required. Example: postgresql://postgres:password@host:5432/dbname" >&2
  exit 1
fi

echo "[DEBUG] POSTGRES_OWNER_URL is set"

export PGPASSWORD="${PGPASSWORD:-}"

# Find psql - prefer a native Linux psql in PATH (e.g. WSL's postgresql-client),
# then fall back to scanning Windows PostgreSQL installs of any version.
if command -v psql &> /dev/null; then
  PSQL_CMD="psql"
else
  PSQL_CMD=""
  for candidate in /mnt/c/Program\ Files/PostgreSQL/*/bin/psql.exe; do
    if [ -f "$candidate" ]; then
      PSQL_CMD="$candidate"
      break
    fi
  done
  if [ -z "$PSQL_CMD" ]; then
    echo "[DEBUG] psql not found in PATH or under /mnt/c/Program Files/PostgreSQL/*/bin/"
    echo "[DEBUG] Install it in WSL with: sudo apt update && sudo apt install postgresql-client"
    exit 1
  fi
fi

echo "[DEBUG] PSQL_CMD: $PSQL_CMD"

cd "$MIGRATIONS_DIR"
echo "[DEBUG] Changed to $MIGRATIONS_DIR"

if [ "$DRY_RUN" = true ]; then
  echo "$LOG_PREFIX DRY RUN MODE - no SQL will be executed"
  echo
fi

echo "[DEBUG] Looking for migration files in: $(pwd)"
FILES=$(ls -1 [0-9][0-9][0-9]_*.sql 2>/dev/null | sort || echo "")
echo "[DEBUG] Found files: $FILES"

for file in $FILES; do
  echo "$LOG_PREFIX applying $file"
  echo "$LOG_PREFIX running: psql [URL] -f $file"
  if [ "$DRY_RUN" = true ]; then
    echo "$LOG_PREFIX [DRY RUN] would execute SQL from: $file"
    head -5 "$file"
    echo "..."
  else
    "$PSQL_CMD" "$POSTGRES_OWNER_URL" -f "$file"
  fi
  echo "$LOG_PREFIX applied $file"
  echo
done

echo "$LOG_PREFIX all migrations complete"