#!/bin/bash

# Script to replace all console.log with logger.debug
# But keep console.error and console.warn

# This script uses ripgrep and sed to find and replace console.log statements
# while preserving console.error and console.warn

# Find all TypeScript/Vue/JavaScript files
echo "🔍 Finding and replacing console.log statements..."

# Count before
BEFORE=$(grep -r "console\.log" /Users/pascalkilchenmann/driving-team-app \
  --include="*.vue" \
  --include="*.ts" \
  --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=.nuxt \
  --exclude-dir=dist \
  --exclude-dir=.git | wc -l)

echo "📊 Found $BEFORE console.log statements to replace"

# Replace in all files (but we'll need to manually add the import)
# Using ripgrep to find, then sed to replace

# Find files with console.log
find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  -not -path "*/.cursorignore" \
  | while read file; do
    
    # Check if file has console.log
    if grep -q "console\.log" "$file"; then
        echo "📝 Processing: $file"
        
        # Replace console.log with logger.debug
        # But be careful to only replace actual console.log calls, not strings
        sed -i 's/console\.log(/logger.debug(/g' "$file"
    fi
done

# Count after
AFTER=$(grep -r "console\.log" /Users/pascalkilchenmann/driving-team-app \
  --include="*.vue" \
  --include="*.ts" \
  --include="*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=.nuxt \
  --exclude-dir=dist \
  --exclude-dir=.git | wc -l)

echo "✅ Replaced $((BEFORE - AFTER)) console.log statements"
echo "📊 Remaining: $AFTER"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Check git diff to verify changes look correct"
echo "2. You may need to manually add: import { logger } from '~/utils/logger'"
echo "3. Run: npm run lint to check for any issues"
echo "4. Update any remaining console.log calls that weren't caught"

