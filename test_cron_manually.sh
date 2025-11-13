#!/bin/bash
# Test the cron job manually with admin auth

# Get your admin token from the browser (localStorage.getItem('sb-unyjaetebnaexaflpyoc-auth-token'))
# Replace YOUR_TOKEN with actual token

curl -X POST http://localhost:3000/api/cron/process-automatic-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

echo ""
echo "Check the server logs and response above"
