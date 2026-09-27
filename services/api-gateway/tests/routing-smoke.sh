#!/usr/bin/env bash
set -euo pipefail

network="resourcehive-gateway-smoke-$RANDOM"
booking_container="${network}-booking"
gateway_container="${network}-gateway"
temporary_directory="$(mktemp -d)"

cleanup() {
  docker rm -f "$gateway_container" "$booking_container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  rm -rf "$temporary_directory"
}
trap cleanup EXIT

cat >"$temporary_directory/Caddyfile" <<'EOF'
:3002 {
  respond "booking-service" 200
}
EOF

docker network create "$network" >/dev/null
docker run -d \
  --name "$booking_container" \
  --network "$network" \
  --network-alias booking-service \
  --volume "$temporary_directory/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2-alpine \
  caddy run --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

docker run -d \
  --name "$gateway_container" \
  --network "$network" \
  --publish 18088:8000 \
  --env API_DOMAIN=localhost \
  --env ACME_EMAIL=admin@example.com \
  --volume "$PWD/services/api-gateway/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2-alpine \
  caddy run --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null

for attempt in {1..30}; do
  if curl --silent --show-error --fail http://localhost:18088/health >/dev/null; then
    break
  fi
  if [[ "$attempt" == 30 ]]; then
    echo "API gateway did not become ready" >&2
    docker logs "$gateway_container" >&2
    exit 1
  fi
  sleep 1
done

for path in /disputes/me /analytics/me; do
  response="$(curl --silent --show-error --write-out $'\n%{http_code}' "http://localhost:18088$path")"
  status="${response##*$'\n'}"
  body="${response%$'\n'*}"
  [[ "$status" == "200" ]]
  [[ "$body" == "booking-service" ]]
done

unknown_status="$(curl --silent --output /dev/null --write-out '%{http_code}' http://localhost:18088/not-a-resourcehive-route)"
[[ "$unknown_status" == "404" ]]

echo "API gateway dispute and analytics routing passed."
