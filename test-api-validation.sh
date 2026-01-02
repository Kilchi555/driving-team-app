#!/bin/bash
# API Validation Tests für Backend Input Validation
# macOS + Linux kompatibel
# Führe aus mit: ./test-api-validation.sh

BASE_URL="http://localhost:3000/api"
TENANT_ID="64259d68-195a-4c68-8875-f1b44d962830"

# Farben für Output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hilfsfunktion: macOS + Linux kompatible Date mit Zeit
get_future_datetime() {
  local offset_days=$1
  local hour=${2:-10}
  local minute=${3:-00}
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS/BSD
    date -u -v+${offset_days}d -f "%Y-%m-%d" -j "$(date -u +%Y-%m-%d)" +%Y-%m-%dT${hour}:${minute}:00Z
  else
    # Linux/GNU - simpler
    date -u -d "+${offset_days} days" +"${hour}:${minute}:00Z" | sed "s/.*\(.*\)T.*/$(date -u -d "+${offset_days} days" +%Y-%m-%d)T${hour}:${minute}:00Z/"
  fi
}

# Simpler: Just use fixed future dates for testing
TOMORROW="2025-12-30T10:00:00Z"
TOMORROW_PLUS_1H="2025-12-30T11:00:00Z"

# Hilfsfunktion: Extract HTTP Status Code
extract_status() {
  local response=$1
  echo "$response" | tail -1
}

# Hilfsfunktion: Extract Response Body
extract_body() {
  local response=$1
  local lines=$(echo "$response" | wc -l)
  if [ "$lines" -gt 1 ]; then
    echo "$response" | head -n $((lines - 1))
  else
    echo "$response"
  fi
}

# Hilfsfunktion für API-Requests
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5

  echo -e "\n${YELLOW}Testing: $description${NC}"
  echo "  Method: $method $endpoint"
  echo "  Expected: HTTP $expected_status"
  
  response=$(curl -s -w "\n%{http_code}" -X "$method" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -d "$data" \
    "$BASE_URL$endpoint")
  
  http_code=$(extract_status "$response")
  body=$(extract_body "$response")
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    echo "  Response: $(echo $body | head -c 100)..."
  else
    echo -e "  ${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
    echo "  Response: $body"
  fi
}

echo "========================================="
echo "  API VALIDATION TESTS"
echo "========================================="

# =========================================
# 1. APPOINTMENT VALIDATION TESTS
# =========================================

echo -e "\n${YELLOW}=== APPOINTMENT CREATION TESTS ===${NC}"

# Valid appointment
test_endpoint POST "/booking/create-appointment" \
  "{
    \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"location_id\": \"c70dc269-abff-465c-a028-d6c433529dad\",
    \"start_time\": \"$TOMORROW\",
    \"end_time\": \"$TOMORROW_PLUS_1H\",
    \"duration_minutes\": 60,
    \"type\": \"B\",
    \"event_type_code\": \"lesson\",
    \"status\": \"pending_confirmation\",
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "200" \
  "Create valid appointment"

# Missing required field
test_endpoint POST "/booking/create-appointment" \
  "{
    \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"start_time\": \"${TOMORROW}T10:00:00Z\",
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "400" \
  "Missing required fields (should fail)"

# Invalid UUID format
test_endpoint POST "/booking/create-appointment" \
  "{
    \"user_id\": \"invalid-uuid\",
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"location_id\": \"c70dc269-abff-465c-a028-d6c433529dad\",
    \"start_time\": \"$TOMORROW\",
    \"end_time\": \"$TOMORROW_PLUS_1H\",
    \"duration_minutes\": 60,
    \"type\": \"B\",
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "400" \
  "Invalid UUID format (should fail)"

# Invalid driving category
test_endpoint POST "/booking/create-appointment" \
  "{
    \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"location_id\": \"c70dc269-abff-465c-a028-d6c433529dad\",
    \"start_time\": \"$TOMORROW\",
    \"end_time\": \"$TOMORROW_PLUS_1H\",
    \"duration_minutes\": 60,
    \"type\": \"INVALID\",
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "400" \
  "Invalid driving category (should fail)"

# Invalid duration (too short)
test_endpoint POST "/booking/create-appointment" \
  "{
    \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"location_id\": \"c70dc269-abff-465c-a028-d6c433529dad\",
    \"start_time\": \"${TOMORROW}T10:00:00Z\",
    \"end_time\": \"${TOMORROW}T10:30:00Z\",
    \"duration_minutes\": 5,
    \"type\": \"B\",
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "400" \
  "Duration too short (should fail)"

# =========================================
# 2. PAYMENT VALIDATION TESTS
# =========================================

echo -e "\n${YELLOW}=== PAYMENT CREATION TESTS ===${NC}"

# Valid payment
test_endpoint POST "/payments/create" \
  "{
    \"userId\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"amount\": 10000,
    \"customerEmail\": \"test@example.com\",
    \"paymentMethod\": \"wallee\",
    \"currency\": \"CHF\"
  }" \
  "200" \
  "Create valid payment"

# Invalid email
test_endpoint POST "/payments/create" \
  "{
    \"userId\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"amount\": 10000,
    \"customerEmail\": \"invalid-email\",
    \"paymentMethod\": \"wallee\",
    \"currency\": \"CHF\"
  }" \
  "400" \
  "Invalid email format (should fail)"

# Negative amount
test_endpoint POST "/payments/create" \
  "{
    \"userId\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"amount\": -10000,
    \"customerEmail\": \"test@example.com\",
    \"paymentMethod\": \"wallee\",
    \"currency\": \"CHF\"
  }" \
  "400" \
  "Negative amount (should fail)"

# Invalid payment method
test_endpoint POST "/payments/create" \
  "{
    \"userId\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
    \"amount\": 10000,
    \"customerEmail\": \"test@example.com\",
    \"paymentMethod\": \"bitcoin\",
    \"currency\": \"CHF\"
  }" \
  "400" \
  "Invalid payment method (should fail)"

# =========================================
# 3. XSS PREVENTION TESTS
# =========================================

echo -e "\n${YELLOW}=== XSS PREVENTION TESTS ===${NC}"

# Title with XSS payload (should be sanitized)
test_endpoint POST "/appointments/save" \
  "{
    \"mode\": \"create\",
    \"appointmentData\": {
      \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
      \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
      \"title\": \"<script>alert(\\\"xss\\\")</script>Fahrstunde\",
      \"start_time\": \"${TOMORROW}T10:00:00Z\",
      \"end_time\": \"${TOMORROW}T11:00:00Z\",
      \"duration_minutes\": 60,
      \"type\": \"B\",
      \"tenant_id\": \"$TENANT_ID\"
    }
  }" \
  "200" \
  "Sanitize XSS in title (should pass after sanitization)"

# HTML injection attempt
test_endpoint POST "/appointments/save" \
  "{
    \"mode\": \"create\",
    \"appointmentData\": {
      \"user_id\": \"e2b162da-959f-47b0-b90b-3b5f153f2483\",
      \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
      \"description\": \"<img src=x onerror=\\\"alert(1)\\\">\",
      \"start_time\": \"${TOMORROW}T10:00:00Z\",
      \"end_time\": \"${TOMORROW}T11:00:00Z\",
      \"duration_minutes\": 60,
      \"type\": \"B\",
      \"tenant_id\": \"$TENANT_ID\"
    }
  }" \
  "200" \
  "Sanitize HTML injection (should pass after sanitization)"

# =========================================
# 4. SLOT RESERVATION TESTS
# =========================================

echo -e "\n${YELLOW}=== SLOT RESERVATION TESTS ===${NC}"

# Valid slot reservation
test_endpoint POST "/booking/reserve-slot" \
  "{
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"start_time\": \"$TOMORROW\",
    \"end_time\": \"$TOMORROW_PLUS_1H\",
    \"duration_minutes\": 60,
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "200" \
  "Reserve valid slot"

# Invalid times (start >= end)
test_endpoint POST "/booking/reserve-slot" \
  "{
    \"staff_id\": \"1c492300-d9b5-4339-8c57-ae2d7e972197\",
    \"start_time\": \"${TOMORROW}T11:00:00Z\",
    \"end_time\": \"${TOMORROW}T10:00:00Z\",
    \"duration_minutes\": 60,
    \"tenant_id\": \"$TENANT_ID\"
  }" \
  "400" \
  "Invalid times - start >= end (should fail)"

echo -e "\n${GREEN}=========================================${NC}"
echo -e "${GREEN}  VALIDATION TESTS COMPLETED${NC}"
echo -e "${GREEN}=========================================${NC}"

