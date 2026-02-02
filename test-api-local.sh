#!/bin/bash

echo "🧪 STARTING LOCAL API TESTS"
echo "=============================="

# Check if Nuxt dev server is running
echo "1️⃣  Checking if dev server is running..."
sleep 2

curl -s http://localhost:3000/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Dev server is running on http://localhost:3000"
else
    echo "⏳ Waiting for dev server to start..."
    for i in {1..30}; do
        curl -s http://localhost:3000/ > /dev/null 2>&1 && break
        sleep 1
    done
fi

# Test API endpoints
echo ""
echo "2️⃣  Testing API endpoints..."
echo "---"

# List of API endpoints to test
ENDPOINTS=(
    "/api/auth/register"
    "/api/documents/upload"
    "/api/staff/get-evaluation-criteria"
    "/api/admin/evaluation"
    "/api/admin/cash-operations"
    "/api/system/availability-data"
    "/api/system/secure-operations"
)

for endpoint in "${ENDPOINTS[@]}"; do
    echo "Testing $endpoint..."
    curl -s -X POST http://localhost:3000$endpoint \
        -H "Content-Type: application/json" \
        -d '{}' 2>&1 | head -3
    echo ""
done

echo "✅ API tests completed"
