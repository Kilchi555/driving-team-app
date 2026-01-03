#!/bin/bash

# Cron API Security Testing Script
# Tests all 4 Cron APIs with and without authentication

set -e

echo "🧪 Cron API Security Testing"
echo "================================"

BASE_URL="${BASE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-test-secret-token}"

echo "Base URL: $BASE_URL"
echo "Cron Secret: $CRON_SECRET"
echo ""

# Test 1: cleanup-booking-reservations WITHOUT token (should fail)
echo "TEST 1: cleanup-booking-reservations WITHOUT token"
echo "Expected: 401 Unauthorized"
curl -s -X POST "$BASE_URL/api/cron/cleanup-booking-reservations" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | head -20
echo ""

# Test 2: cleanup-booking-reservations WITH correct token (should succeed)
echo "TEST 2: cleanup-booking-reservations WITH correct token"
echo "Expected: 200 OK (or 429 if rate limited)"
curl -s -X POST "$BASE_URL/api/cron/cleanup-booking-reservations" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq . 2>/dev/null || cat
echo ""

# Test 3: cleanup-booking-reservations WITH wrong token (should fail)
echo "TEST 3: cleanup-booking-reservations WITH wrong token"
echo "Expected: 401 Unauthorized"
curl -s -X POST "$BASE_URL/api/cron/cleanup-booking-reservations" \
  -H "Authorization: Bearer wrong-token-xyz" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | head -20
echo ""

# Test 4: cleanup-expired-reservations WITH correct token
echo "TEST 4: cleanup-expired-reservations WITH correct token"
echo "Expected: 200 OK (or 429 if rate limited)"
curl -s -X POST "$BASE_URL/api/cron/cleanup-expired-reservations" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq . 2>/dev/null || cat
echo ""

# Test 5: process-automatic-payments WITH correct token
echo "TEST 5: process-automatic-payments WITH correct token"
echo "Expected: 200 OK (or 429 if rate limited)"
curl -s -X POST "$BASE_URL/api/cron/process-automatic-payments" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq . 2>/dev/null || cat
echo ""

# Test 6: sync-sari-courses WITH correct token
echo "TEST 6: sync-sari-courses WITH correct token"
echo "Expected: 200 OK (or 429 if rate limited)"
curl -s -X POST "$BASE_URL/api/cron/sync-sari-courses" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq . 2>/dev/null || cat
echo ""

echo "✅ Testing complete!"
echo ""
echo "To run these tests:"
echo "1. Start dev server: npm run dev"
echo "2. In another terminal: export CRON_SECRET='your-token' && bash CRON_API_TESTING.sh"
echo ""

