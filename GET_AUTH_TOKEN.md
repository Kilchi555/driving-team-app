# How to Get Your Authentication Token

## Step-by-Step Guide

### 1. Start the Dev Server
```bash
npm run dev
```

Wait until you see:
```
✨ built in XXms
```

### 2. Open the App in Browser
Navigate to: **http://localhost:3000**

### 3. Login with Your Test Account
- Email: `pascal_kilchenmann@icloud.com`
- Password: (your password)
- Complete 2FA if prompted

### 4. Open DevTools
**On Mac:**
- Press `Cmd + Option + I` (Command + Option + I)
- OR Right-click anywhere → Click "Inspect"

**On Windows/Linux:**
- Press `F12` or `Ctrl + Shift + I`
- OR Right-click anywhere → Click "Inspect"

### 5. Go to Application Tab
In the DevTools window:
1. Click the **"Application"** tab (or "Storage" if you don't see "Application")
2. On the left side, click **"Cookies"**
3. Click **"http://localhost:3000"**

### 6. Find the Auth Token
Look for a cookie named one of these:
- `sb-auth-token`
- `auth.token`
- `access_token`

**When you find it:**
1. Click on it
2. In the right panel, find the **"Value"** field
3. Copy the entire value (it's a long JWT token starting with `eyJ...`)

### Alternative Method: Console Approach

If you can't find it in Cookies, try this in the Console:

1. Open DevTools (F12)
2. Click **"Console"** tab
3. Paste this code and press Enter:

```javascript
// Get token from localStorage
const token = localStorage.getItem('sb-auth-token');
console.log('Token:', token);
```

4. The token will be printed in the console
5. Right-click → Copy

### What the Token Looks Like

A valid JWT token looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3VueWphZXRlYm5hZXhhZmxweW9jLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI5OWZjZWIwYi05YWE1LTQzNTgtYmIzMC00MzAxZjAyMmU2MWIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzA0Nzk2NTEzLCJpYXQiOjE3MDQ3OTI5MTMsImVtYWlsIjoicGFzY2FsX2tpbGNoZW5tYW5uQGljbG91ZC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzA0NzkyOTEzfSx7Im1ldGhvZCI6InRvdHAiLCJ0aW1lc3RhbXAiOjE3MDQ3OTI5MzN9XSwic2Vzc2lvbl9pZCI6IjQzNGE5YjU1LTk2ZmItNGNkNy04YjBjLWZkYzU1ZmU4ZDczYiJ9.xxx...
```

---

## Using the Token to Test APIs

Once you have the token, you can use it in API calls:

### Using curl (Terminal)

```bash
# Save token to environment variable
export TOKEN="your-token-here"

# Test the rate limiter layer
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentId": "invalid-uuid"}'
```

### Using Postman

1. Open [Postman](https://www.postman.com/downloads/)
2. Create a new POST request
3. URL: `http://localhost:3000/api/payments/process`
4. Click **"Headers"** tab
5. Add header:
   - Key: `Authorization`
   - Value: `Bearer your-token-here`
6. Click **"Body"** tab → select **"raw"** → select **"JSON"**
7. Add JSON:
```json
{
  "paymentId": "9bcc9893-79ad-4109-8480-94cd82f5eb37"
}
```
8. Click **"Send"**

### Using VS Code REST Client

Install "REST Client" extension, then create `test.http`:

```http
### Test Payments API
POST http://localhost:3000/api/payments/process
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "paymentId": "9bcc9893-79ad-4109-8480-94cd82f5eb37"
}
```

Right-click → "Send Request"

---

## Token Security Tips

⚠️ **IMPORTANT:**
- Never share your token publicly
- Don't commit tokens to git
- Tokens expire - if expired, logout and login again to get a new one
- For testing, use a test account, not production

---

## Troubleshooting

### "I can't find the token in Cookies"
- Make sure you're logged in (check if you see your profile name)
- Try the Console method (see above)
- Clear browser cache and login again

### "Token is empty or undefined"
- You're not logged in
- Logout and login again
- Check if cookies are enabled in browser

### "401 Authentication required when testing"
- Token expired - get a new one
- Token has wrong format - make sure it starts with `eyJ`
- Missing `Bearer ` prefix in the Authorization header

### "Rate limit errors after a few requests"
- That's expected! The API has a 20 requests/minute limit
- Wait a minute or restart the server


