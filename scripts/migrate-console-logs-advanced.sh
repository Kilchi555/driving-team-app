#!/bin/bash

# Advanced console.log migration script
# Replaces console.log with logger.debug and adds necessary imports

echo "🚀 Starting console.log migration..."
echo ""

# Count before
BEFORE=$(find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  | xargs grep -l "console\.log(" 2>/dev/null | wc -l)

echo "📊 Found $BEFORE files with console.log statements"
echo ""

# Array to store files that need imports
declare -a FILES_NEEDING_IMPORT

# Find and process all files
find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  -not -path "*/migrations/*" \
  -not -path "*/docs/*" \
  | while read file; do
    
    # Check if file has console.log
    if grep -q "console\.log(" "$file"; then
        echo "📝 Processing: $file"
        
        # Replace console.log with logger.debug
        sed -i 's/console\.log(/logger.debug(/g' "$file"
        
        # Check if file needs logger import
        if grep -q "logger\.debug(" "$file" && ! grep -q "import.*logger" "$file"; then
            # Check file type
            if [[ "$file" == *.vue ]]; then
                # Vue file - add to <script setup>
                if grep -q "import {" "$file"; then
                    # Add to existing imports
                    sed -i "0,/import {/s/import {/import { logger } from '~\/utils\/logger'\nimport {/" "$file"
                else
                    # Add new import line
                    sed -i "/<script/a import { logger } from '~\/utils\/logger'" "$file"
                fi
            elif [[ "$file" == *.ts ]] || [[ "$file" == *.js ]]; then
                # TypeScript/JavaScript file
                if grep -q "^import " "$file"; then
                    # Add after first import
                    sed -i "0,/^import /s/^import /import { logger } from '~\/utils\/logger'\nimport /" "$file"
                else
                    # Add at the beginning
                    sed -i "1i import { logger } from '~\/utils\/logger'" "$file"
                fi
            fi
        fi
    fi
done

# Count after
AFTER=$(find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  | xargs grep -l "console\.log(" 2>/dev/null | wc -l)

echo ""
echo "✅ Migration complete!"
echo "📊 Files before: $BEFORE"
echo "📊 Files after: $AFTER"
echo ""
echo "🔍 Remaining console.log statements:"
find /Users/pascalkilchenmann/driving-team-app \
  \( -name "*.vue" -o -name "*.ts" -o -name "*.js" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.nuxt/*" \
  -not -path "*/dist/*" \
  -not -path "*/.git/*" \
  | xargs grep -c "console\.log(" 2>/dev/null | grep -v ":0$" | head -20

echo ""
echo "⏭️  Next steps:"
echo "1. Run: npm run lint"
echo "2. Fix any linter errors (especially import issues)"
echo "3. Review git diff for correctness"
echo "4. Run: npm run dev"
echo "5. Check browser DevTools - should have 🔍 debug logs"
echo ""
echo "💡 If you see 'logger is not defined' errors:"
echo "   Some files may need manual import adjustment"
echo "   Check grep output above for remaining logger.debug calls"

