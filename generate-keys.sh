#!/bin/bash
echo "=== CRON_API_KEY ==="
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
echo ""
echo "=== VERCEL_WEBHOOK_SECRET ==="
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
