#!/usr/bin/env bash

# TEST_DATABASE_URL="postgresql://user:password@host:5432/database" \
# bash db/schema/tests/run.sh

set -euo pipefail

if [[ -z "${TEST_DATABASE_URL:-}" ]]; then
    echo "TEST_DATABASE_URL must point to an empty disposable PostgreSQL database." >&2
    exit 1
fi

test_directory=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
schema_directory=$(cd "$test_directory/.." && pwd)
initial_migration="$schema_directory/migrations/20260724000000_initial/migration.sql"
notification_migration="$schema_directory/migrations/20260831000000_notification_delivery_pipeline/migration.sql"

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$initial_migration"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$notification_migration"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test_directory/notification_delivery.sql"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test_directory/integrity.sql"
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$test_directory/concurrent_booking_fixture.sql"

test_output_directory=$(mktemp -d)
cleanup() {
    rm -f \
        "$test_output_directory/attempt-one.log" \
        "$test_output_directory/attempt-two.log"
    rmdir "$test_output_directory"
}
trap cleanup EXIT

set +e
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 >"$test_output_directory/attempt-one.log" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO bookings (
    resource_slot_id,
    user_id
)
VALUES (
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
);
SELECT pg_sleep(1);
COMMIT;
SQL
attempt_one_pid=$!

psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 >"$test_output_directory/attempt-two.log" 2>&1 <<'SQL' &
BEGIN;
INSERT INTO bookings (
    resource_slot_id,
    user_id
)
VALUES (
    '90000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000002'
);
SELECT pg_sleep(1);
COMMIT;
SQL
attempt_two_pid=$!

wait "$attempt_one_pid"
attempt_one_status=$?
wait "$attempt_two_pid"
attempt_two_status=$?
set -e

successful_attempts=0
if [[ "$attempt_one_status" -eq 0 ]]; then
    successful_attempts=$((successful_attempts + 1))
fi
if [[ "$attempt_two_status" -eq 0 ]]; then
    successful_attempts=$((successful_attempts + 1))
fi

if [[ "$successful_attempts" -ne 1 ]]; then
    echo "Expected exactly one concurrent booking to succeed." >&2
    cat "$test_output_directory/attempt-one.log" >&2
    cat "$test_output_directory/attempt-two.log" >&2
    exit 1
fi

booking_count=$(psql "$TEST_DATABASE_URL" -Atc "
    SELECT COUNT(*)
    FROM bookings
    WHERE resource_slot_id = '90000000-0000-0000-0000-000000000001';
")

if [[ "$booking_count" != "1" ]]; then
    echo "Expected one persisted booking, found $booking_count." >&2
    exit 1
fi

echo "Concurrent booking test passed."
