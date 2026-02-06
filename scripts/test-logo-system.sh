#!/bin/bash
# scripts/test-logo-system.sh
# Test script for the new logo/asset management system

set -e

echo "🧪 Testing Logo/Asset Management System"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if SQL migrations exist
echo "📋 Test 1: Checking SQL migrations..."
if [ -f "sql_migrations/20260205_add_tenant_assets_table.sql" ]; then
  echo -e "${GREEN}✓${NC} Found: 20260205_add_tenant_assets_table.sql"
else
  echo -e "${RED}✗${NC} Missing: 20260205_add_tenant_assets_table.sql"
  exit 1
fi

if [ -f "sql_migrations/20260205_migrate_logos_to_assets_table.sql" ]; then
  echo -e "${GREEN}✓${NC} Found: 20260205_migrate_logos_to_assets_table.sql"
else
  echo -e "${YELLOW}⚠${NC} Missing (optional): 20260205_migrate_logos_to_assets_table.sql"
fi

echo ""

# Test 2: Check if server APIs exist
echo "🔌 Test 2: Checking Server API routes..."
files_to_check=(
  "server/api/tenant/assets.get.ts"
  "server/api/tenant/upload-logo.post.ts"
  "server/api/tenant/delete-asset.delete.ts"
)

for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} Found: $file"
  else
    echo -e "${RED}✗${NC} Missing: $file"
    exit 1
  fi
done

echo ""

# Test 3: Check if composables exist
echo "🎣 Test 3: Checking Frontend Composables..."
if [ -f "composables/useTenantAssets.ts" ]; then
  echo -e "${GREEN}✓${NC} Found: composables/useTenantAssets.ts"
else
  echo -e "${RED}✗${NC} Missing: composables/useTenantAssets.ts"
  exit 1
fi

echo ""

# Test 4: Check if components exist
echo "🧩 Test 4: Checking Frontend Components..."
if [ -f "components/TenantLogoUpload.vue" ]; then
  echo -e "${GREEN}✓${NC} Found: components/TenantLogoUpload.vue"
else
  echo -e "${RED}✗${NC} Missing: components/TenantLogoUpload.vue"
  exit 1
fi

echo ""

# Test 5: Check if i18n strings are added
echo "🌐 Test 5: Checking i18n translations..."
if grep -q '"admin"' "locales/de.json"; then
  echo -e "${GREEN}✓${NC} Found admin translations in locales/de.json"
else
  echo -e "${RED}✗${NC} Missing admin translations in locales/de.json"
  exit 1
fi

if grep -q '"admin"' "locales/en.json"; then
  echo -e "${GREEN}✓${NC} Found admin translations in locales/en.json"
else
  echo -e "${RED}✗${NC} Missing admin translations in locales/en.json"
  exit 1
fi

echo ""

# Test 6: Check if receipt.post.ts was updated
echo "🔧 Test 6: Checking receipt.post.ts updates..."
if grep -q "startsWith('/storage/v1/object/public/')" "server/api/payments/receipt.post.ts"; then
  echo -e "${GREEN}✓${NC} Found storage path handling in receipt.post.ts"
else
  echo -e "${RED}✗${NC} Missing storage path handling in receipt.post.ts"
  exit 1
fi

if grep -q "Constructed full URL from relative path" "server/api/payments/receipt.post.ts"; then
  echo -e "${GREEN}✓${NC} Found URL construction in receipt.post.ts"
else
  echo -e "${RED}✗${NC} Missing URL construction in receipt.post.ts"
  exit 1
fi

echo ""

# Test 7: Check documentation
echo "📚 Test 7: Checking documentation..."
if [ -f "LOGO_ASSET_MANAGEMENT.md" ]; then
  echo -e "${GREEN}✓${NC} Found: LOGO_ASSET_MANAGEMENT.md"
else
  echo -e "${RED}✗${NC} Missing: LOGO_ASSET_MANAGEMENT.md"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ All checks passed!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Run SQL migrations in Supabase"
echo "2. Create 'tenant-assets' storage bucket in Supabase (if not exists)"
echo "3. Test the API routes"
echo "4. Test the upload component in admin panel"
echo ""
echo "For more details, see: LOGO_ASSET_MANAGEMENT.md"
