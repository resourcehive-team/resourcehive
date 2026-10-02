#!/usr/bin/env bash
set -Eeuo pipefail

deploy_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
environment_file="$deploy_directory/.env.production"
secrets_directory="$deploy_directory/secrets"
firebase_file="$secrets_directory/firebase-service-account.json"

if [[ ! -f "$environment_file" ]]; then
  echo "Missing $environment_file. Copy and configure .env.production before deploying." >&2
  exit 1
fi

read_environment_value() {
  local key="$1"
  local value
  value="$(sed -n "s/^${key}=//p" "$environment_file" | tail -n 1)"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

image_tag="${IMAGE_TAG:-$(read_environment_value IMAGE_TAG)}"
if [[ -z "$image_tag" || ! "$image_tag" =~ ^[a-zA-Z0-9_.-]+$ ]]; then
  echo "IMAGE_TAG must contain only letters, numbers, dots, underscores, and hyphens." >&2
  exit 1
fi
export IMAGE_TAG="$image_tag"

fcm_enabled="$(read_environment_value FCM_ENABLED)"
if [[ "${fcm_enabled,,}" == "true" ]]; then
  if [[ ! -f "$firebase_file" ]]; then
    echo "FCM_ENABLED=true requires secrets/firebase-service-account.json; configure the GitHub production secret first." >&2
    exit 1
  fi
  if [[ "$(stat -c '%a' "$firebase_file")" != "600" ]]; then
    echo "Firebase credentials must have file permissions 600." >&2
    exit 1
  fi
  firebase_project_id="$(read_environment_value FIREBASE_PROJECT_ID)"
  if [[ -z "$firebase_project_id" ]]; then
    echo "FIREBASE_PROJECT_ID is required when FCM_ENABLED=true." >&2
    exit 1
  fi
  if ! python3 - "$firebase_file" "$firebase_project_id" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as credentials_file:
    credentials = json.load(credentials_file)

valid = (
    credentials.get("type") == "service_account"
    and credentials.get("project_id") == sys.argv[2]
    and bool(credentials.get("client_email"))
    and bool(credentials.get("private_key"))
)
if not valid:
    raise SystemExit(1)
PY
  then
    echo "The protected Firebase service-account file must be valid and match FIREBASE_PROJECT_ID." >&2
    exit 1
  fi
else
  install -d -m 700 "$secrets_directory"
  if [[ ! -f "$firebase_file" ]]; then
    printf '{}\n' >"$firebase_file"
    chmod 600 "$firebase_file"
  fi
fi

google_oauth_enabled="$(read_environment_value GOOGLE_OAUTH_ENABLED)"
if [[ "${google_oauth_enabled,,}" == "true" ]]; then
  for key in GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET GOOGLE_OAUTH_CALLBACK_URL; do
    if [[ -z "$(read_environment_value "$key")" ]]; then
      echo "$key is required when GOOGLE_OAUTH_ENABLED=true." >&2
      exit 1
    fi
  done
  callback_url="$(read_environment_value GOOGLE_OAUTH_CALLBACK_URL)"
  if ! python3 - "$callback_url" <<'PY'
import sys
from urllib.parse import urlparse

callback = urlparse(sys.argv[1])
if (
    callback.scheme != "https"
    or not callback.hostname
    or callback.path != "/auth/google/callback"
    or callback.username
    or callback.password
):
    raise SystemExit(1)
PY
  then
    echo "GOOGLE_OAUTH_CALLBACK_URL must be an HTTPS /auth/google/callback URL." >&2
    exit 1
  fi
fi

compose=(docker compose --project-directory "$deploy_directory" --env-file "$environment_file" -f "$deploy_directory/docker-compose.prod.yml")
"${compose[@]}" config --quiet
"${compose[@]}" pull

run_migrate_tool() {
  "${compose[@]}" --profile tools run --rm --no-deps --interactive=false -T migrate "$@" </dev/null
}

echo "Applying Prisma migrations with the direct database connection."
run_migrate_tool /migrator/node_modules/.bin/prisma migrate deploy --schema /migrator/schema/schema.prisma

echo "Creating and verifying restricted runtime database roles."
run_migrate_tool node dist/scripts/setup-runtime-roles.js

echo "Seeding the one-time University of Moratuwa and SLIIT presentation dataset."
run_migrate_tool node dist/scripts/seed-university.js

echo "Starting Redis and all production backend services."
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 240
"${compose[@]}" up -d --no-deps --force-recreate --wait --wait-timeout 60 api-gateway
"${compose[@]}" ps

running_services="$("${compose[@]}" ps --services --status running)"
for service in redis api-gateway identity-service resource-service booking-service notification-service; do
  if ! grep -qx "$service" <<<"$running_services"; then
    echo "Expected service '$service' is not running." >&2
    exit 1
  fi
done

api_domain="$(read_environment_value API_DOMAIN)"
api_domain="${api_domain#https://}"
api_domain="${api_domain#http://}"
api_domain="${api_domain%/}"
if [[ -z "$api_domain" ]]; then
  echo "API_DOMAIN is required for the production health check." >&2
  exit 1
fi

echo "Checking the public API health endpoint."
curl --fail --show-error --retry 20 --retry-delay 5 --retry-all-errors --max-time 12 "https://${api_domain}/health"
echo "Production deployment is healthy (IMAGE_TAG=$image_tag)."
