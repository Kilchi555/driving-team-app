#!/bin/bash

# CSP Preview Testing Automation Script
# Testet die Vercel Preview auf CSP Violations und kritische Funktionen

set -e

echo "🚀 CSP Preview Testing Script"
echo "============================="
echo ""

# Configuration
GITHUB_REPO="Kilchi555/driving-team-app"
BRANCH="feature/csp-security-headers"
PR_NUMBER=""
PREVIEW_URL=""
MAX_WAIT=600  # 10 minutes max wait for preview

# Step 1: Find PR Number
echo "🔍 Schritt 1: PR-Nummer finden..."
PR_NUMBER=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/pulls?head=${GITHUB_REPO%/*}:${BRANCH}" | grep -o '"number": [0-9]*' | head -1 | grep -o '[0-9]*')

if [ -z "$PR_NUMBER" ]; then
  echo "❌ PR nicht gefunden für Branch: $BRANCH"
  exit 1
fi

echo "✅ PR #$PR_NUMBER gefunden"
echo ""

# Step 2: Wait for Preview URL
echo "⏳ Schritt 2: Warte auf Vercel Preview URL..."
echo "   (Timeout: $MAX_WAIT Sekunden)"
echo ""

WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  # Versuche PR Details zu holen
  PR_DATA=$(curl -s "https://api.github.com/repos/${GITHUB_REPO}/pulls/${PR_NUMBER}")
  
  # Suche nach Vercel Preview Link (in Kommentaren oder Statuses)
  PREVIEW_URL=$(echo "$PR_DATA" | grep -o 'https://[a-z0-9-]*\.vercel\.app' | head -1)
  
  if [ ! -z "$PREVIEW_URL" ]; then
    echo "✅ Preview URL gefunden: $PREVIEW_URL"
    break
  fi
  
  echo -n "."
  sleep 10
  WAIT_TIME=$((WAIT_TIME + 10))
done

if [ -z "$PREVIEW_URL" ]; then
  echo ""
  echo "❌ Preview URL nicht gefunden nach $MAX_WAIT Sekunden"
  echo "   Bitte manuell checken: https://github.com/$GITHUB_REPO/pull/$PR_NUMBER"
  exit 1
fi

echo ""
echo ""

# Step 3: Test CSP Header
echo "🔍 Schritt 3: CSP Header testen..."
RESPONSE=$(curl -s -I "$PREVIEW_URL")
CSP_HEADER=$(echo "$RESPONSE" | grep -i "Content-Security-Policy" | head -1)

if [ -z "$CSP_HEADER" ]; then
  echo "⚠️  CSP Header nicht gefunden (möglich auf Preview)"
  echo "   (Header können auf Vercel Preview unterschiedlich sein)"
else
  echo "✅ CSP Header vorhanden:"
  echo "   $CSP_HEADER"
fi

echo ""

# Step 4: Test kritische Pages
echo "🧪 Schritt 4: Kritische Pages testen..."
echo ""

test_page() {
  local page_name=$1
  local url=$2
  local check_keyword=$3
  
  echo -n "  Testing: $page_name ... "
  
  RESPONSE=$(curl -s "$url")
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  
  if [ "$HTTP_CODE" == "200" ]; then
    if [ ! -z "$check_keyword" ] && echo "$RESPONSE" | grep -q "$check_keyword"; then
      echo "✅"
    elif [ -z "$check_keyword" ]; then
      echo "✅"
    else
      echo "⚠️  (Keyword nicht gefunden, aber Status 200)"
    fi
  else
    echo "❌ HTTP $HTTP_CODE"
  fi
}

# Test Pages
test_page "Homepage" "$PREVIEW_URL" "Driving Team"
test_page "Registration (hCaptcha)" "$PREVIEW_URL/register/driving-team" "hcaptcha"
test_page "Booking (Google Maps)" "$PREVIEW_URL/booking/availability/driving-team" "maps"
test_page "Customer Courses" "$PREVIEW_URL/customer/courses/driving-team" ""

echo ""
echo ""

# Step 5: Check for CSP Violations in Page Source
echo "🔍 Schritt 5: CSP Violations checken..."
echo ""

PAGES=(
  "$PREVIEW_URL/register/driving-team"
  "$PREVIEW_URL/booking/availability/driving-team"
  "$PREVIEW_URL/customer/courses/driving-team"
)

CSP_VIOLATIONS_FOUND=false

for page in "${PAGES[@]}"; do
  echo -n "  Checke: $page ... "
  
  # Download page and check for unsafe patterns
  PAGE_HTML=$(curl -s "$page")
  
  # Check for inline scripts (CSP should block these if configured correctly)
  if echo "$PAGE_HTML" | grep -q "<script[^>]*>" && ! echo "$PAGE_HTML" | grep -q "src="; then
    echo "⚠️  Inline script gefunden"
    CSP_VIOLATIONS_FOUND=true
  else
    echo "✅"
  fi
done

echo ""
echo ""

# Final Report
echo "📊 FINAL REPORT"
echo "==============="
echo ""
echo "Preview URL:        $PREVIEW_URL"
echo "PR Number:          #$PR_NUMBER"
echo "Branch:             $BRANCH"
echo ""
echo "Status: ✅ Preview is online and responding"
echo ""
echo "⚠️  WICHTIG: Bitte manuell in Browser testen:"
echo "   1. Öffne: $PREVIEW_URL"
echo "   2. DevTools → Console (F12)"
echo "   3. Suche nach: 'Refused to load'"
echo "   4. Test hCaptcha (Registrierung)"
echo "   5. Test Google Maps (Booking)"
echo "   6. Keine CSP Violations sollten im Console sein"
echo ""
echo "Nach manueller Bestätigung:"
echo "   - Merge zu main: https://github.com/$GITHUB_REPO/pull/$PR_NUMBER"
echo ""

