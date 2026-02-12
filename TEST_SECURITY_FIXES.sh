#!/bin/bash

# 🔒 SECURITY TESTS FOR EXTERNAL CALENDAR APIs
# This script tests authentication and authorization fixes for:
# - sync-ics.post.ts
# - external-calendars.post.ts
# - calendar/manage.post.ts

set -e

# Configuration
API_URL="http://localhost:3000"
HEADER_JSON="Content-Type: application/json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test header
print_test() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}TEST: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expected_status="$5"
  local auth_token="$6"

  echo -e "${YELLOW}Testing:${NC} $name"
  
  local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
  
  if [ -n "$auth_token" ]; then
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_token'"
  fi
  
  curl_cmd="$curl_cmd -H '$HEADER_JSON'"
  
  if [ -n "$data" ]; then
    curl_cmd="$curl_cmd -d '$data'"
  fi
  
  curl_cmd="$curl_cmd '$API_URL$endpoint'"
  
  local response=$(eval $curl_cmd)
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  echo "Response Code: $http_code"
  
  if [ "$http_code" == "$expected_status" ]; then
    echo -e "${GREEN}✅ PASSED${NC} (Expected $expected_status, got $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${RED}❌ FAILED${NC} (Expected $expected_status, got $http_code)"
    echo "Response: $body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
}

# ═══════════════════════════════════════════════════════════════
# STEP 1: Get Auth Tokens (you need to login first!)
# ═══════════════════════════════════════════════════════════════

print_test "1. SETUP: Get Auth Tokens"

echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "You need to be logged in as a STAFF member to test these APIs!"
echo ""
echo "Steps:"
echo "1. Open http://localhost:3000/login in your browser"
echo "2. Login as a staff member"
echo "3. Open DevTools (F12) → Application → Cookies"
echo "4. Find the 'sb-auth-token' cookie"
echo "5. Copy its value and paste it below when prompted"
echo ""
read -p "Enter your auth token (sb-auth-token): " AUTH_TOKEN

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}❌ No auth token provided. Exiting.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Using auth token: ${AUTH_TOKEN:0:20}...${NC}"

# Verify token is valid
print_test "2. VERIFY: Check if token is valid"
test_endpoint "Get current user" "GET" "/api/auth/current-user" "" "200" "$AUTH_TOKEN"

# ═══════════════════════════════════════════════════════════════
# TESTS: sync-ics.post.ts
# ═══════════════════════════════════════════════════════════════

print_test "3. sync-ics.post.ts - WITHOUT AUTHENTICATION"

test_endpoint \
  "sync-ics without auth token" \
  "POST" \
  "/api/external-calendars/sync-ics" \
  '{"calendar_id":"test-id","ics_content":"BEGIN:VCALENDAR\nEND:VCALENDAR"}' \
  "401" \
  ""

print_test "4. sync-ics.post.ts - WITH VALID AUTH"

# Note: You'll need a real calendar_id from your database
# For now, we'll test with a dummy ID (will fail with 404 Calendar not found, which is OK)
test_endpoint \
  "sync-ics with valid auth but invalid calendar_id (should be 404)" \
  "POST" \
  "/api/external-calendars/sync-ics" \
  '{"calendar_id":"00000000-0000-0000-0000-000000000000","ics_content":"BEGIN:VCALENDAR\nEND:VCALENDAR"}' \
  "404" \
  "$AUTH_TOKEN"

# ═══════════════════════════════════════════════════════════════
# TESTS: external-calendars.post.ts
# ═══════════════════════════════════════════════════════════════

print_test "5. external-calendars.post.ts - WITHOUT AUTHENTICATION"

test_endpoint \
  "external-calendars load without auth" \
  "POST" \
  "/api/staff/external-calendars" \
  '{"action":"load"}' \
  "401" \
  ""

print_test "6. external-calendars.post.ts - LOAD ACTION (should return user's calendars)"

test_endpoint \
  "external-calendars load with auth" \
  "POST" \
  "/api/staff/external-calendars" \
  '{"action":"load"}' \
  "200" \
  "$AUTH_TOKEN"

print_test "7. external-calendars.post.ts - CONNECT ACTION"

test_endpoint \
  "external-calendars connect ICS" \
  "POST" \
  "/api/staff/external-calendars" \
  '{"action":"connect","data":{"provider":"ics","calendar_name":"Test Calendar","account_identifier":"test@example.com","ics_url":"https://example.com/calendar.ics"}}' \
  "200" \
  "$AUTH_TOKEN"

print_test "8. external-calendars.post.ts - DISCONNECT ACTION"

# First, we need to get a calendar_id to disconnect
echo "To test DISCONNECT, you need to:"
echo "1. Run the LOAD action above"
echo "2. Find a calendar ID from the response"
echo "3. Use the curl command below:"
echo ""
echo "curl -X POST http://localhost:3000/api/staff/external-calendars \\"
echo "  -H 'Authorization: Bearer $AUTH_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"action\":\"disconnect\",\"data\":{\"calendarId\":\"CALENDAR_ID_HERE\"}}'"
echo ""

# ═══════════════════════════════════════════════════════════════
# TESTS: calendar/manage.post.ts
# ═══════════════════════════════════════════════════════════════

print_test "9. calendar/manage.post.ts - WITHOUT AUTHENTICATION"

test_endpoint \
  "calendar manage without auth" \
  "POST" \
  "/api/calendar/manage" \
  '{"action":"get-staff-meetings"}' \
  "401" \
  ""

print_test "10. calendar/manage.post.ts - GET-TENANT-DATA ACTION"

# Get your tenant_id first (you can find it in your user profile)
read -p "Enter your TENANT_ID (can find in browser console or database): " TENANT_ID

if [ -z "$TENANT_ID" ]; then
  echo -e "${YELLOW}⚠️  Skipping tenant-specific tests${NC}"
else
  test_endpoint \
    "calendar manage get-tenant-data with auth" \
    "POST" \
    "/api/calendar/manage" \
    "{\"action\":\"get-tenant-data\",\"tenant_id\":\"$TENANT_ID\"}" \
    "200" \
    "$AUTH_TOKEN"

  print_test "11. calendar/manage.post.ts - GET-PRICING-RULES ACTION"

  test_endpoint \
    "calendar manage get-pricing-rules" \
    "POST" \
    "/api/calendar/manage" \
    "{\"action\":\"get-pricing-rules\",\"tenant_id\":\"$TENANT_ID\",\"category\":\"B\"}" \
    "200" \
    "$AUTH_TOKEN"
fi

# ═══════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════

print_test "FINAL RESULTS"

echo ""
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL SECURITY TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  SOME TESTS FAILED - CHECK ABOVE FOR DETAILS${NC}"
  exit 1
fi
