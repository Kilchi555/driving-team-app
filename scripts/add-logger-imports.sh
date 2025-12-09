#!/bin/bash

# Simple script to add logger imports to files that have logger.debug() calls
# Run this AFTER you've done Find+Replace of console.log -> logger.debug

echo "🔍 Finding files with logger.debug() calls..."
echo ""

# Find all files with logger.debug
FILES=$(find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  2>/dev/null | xargs grep -l "logger\.debug(" 2>/dev/null)

COUNT=$(echo "$FILES" | wc -l)
echo "✅ Found $COUNT files with logger.debug() calls"
echo ""

# Process each file
echo "$FILES" | while read file; do
    # Check if file already has logger import
    if ! grep -q "import.*logger" "$file"; then
        echo "📝 Adding import to: $file"
        
        if [[ "$file" == *.vue ]]; then
            # Vue file - add to <script setup> section
            # Find the line with <script and add import after it
            sed -i '/<script/a import { logger } from '\''~\/utils\/logger'"'" "$file"
        else
            # TypeScript/JavaScript file - add at the very top
            sed -i '1i import { logger } from '\''~\/utils\/logger'"'" "$file"
        fi
    else
        echo "✅ Already has import: $file"
    fi
done

echo ""
echo "🎉 Import injection complete!"
echo ""
echo "⏭️  Next steps:"
echo "1. Run: npm run lint"
echo "2. Fix any duplicate imports or other errors"
echo "3. Run: npm run lint --fix (for auto-fixes)"
echo "4. Run: npm run dev"
echo "5. Check browser console for errors"

