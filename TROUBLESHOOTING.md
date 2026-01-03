# 🔧 API Testing Troubleshooting Guide

## ✅ Backend Status: **LIVE & WORKING**

Your backend is confirmed to be working:
- API Gateway: ✅ Responding
- Authentication: ✅ Enforced (returns 401 without token)
- Base URL: `https://gb1jhkkzl2.execute-api.us-east-1.amazonaws.com/prod`

---

## 🎯 **Step-by-Step: Test Your API Right Now**

### **Step 1: Refresh the API Tester**
```bash
# The API tester has been updated with better error handling
open /Users/psama0214/Hackathon-New/CareCircle/api-tester.html
```
Or just **refresh the page** (Cmd+R) if it's already open.

### **Step 2: Get Your Token (3 Methods)**

#### **Method A: One-Line Command (Easiest)**
Open your app (localhost:3002), open Console (F12), paste this:

```javascript
(() => {
  const prefix = 'CognitoIdentityServiceProvider.3fnpfoqg3f2vevpfqqtt9rqui0';
  const user = localStorage.getItem(prefix + '.LastAuthUser');
  const token = localStorage.getItem(`${prefix}.${user}.idToken`);
  
  if (token) {
    console.clear();
    console.log('%c✅ YOUR TOKEN:', 'color: green; font-size: 16px; font-weight: bold');
    console.log(token);
    copy(token);
    alert('✅ Token copied! Paste in API Tester (Cmd+V)');
    return token;
  } else {
    alert('❌ No token found. Sign in to the app first.');
  }
})();
```

#### **Method B: Manual localStorage**
1. Open Console on localhost:3002
2. Run: `localStorage.getItem('CognitoIdentityServiceProvider.3fnpfoqg3f2vevpfqqtt9rqui0.LastAuthUser')`
3. Note the username (e.g., "samalpartha")
4. Run: `localStorage.getItem('CognitoIdentityServiceProvider.3fnpfoqg3f2vevpfqqtt9rqui0.samalpartha.idToken')`
5. Copy the long string (without quotes)

#### **Method C: From AWS CLI**
```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 3fnpfoqg3f2vevpfqqtt9rqui0 \
  --auth-parameters USERNAME=your-email,PASSWORD=your-password \
  --query 'AuthenticationResult.IdToken' \
  --output text
```

### **Step 3: Test in API Tester**
1. **Paste token** in the "Bearer Token" field
2. **Click "Test Authentication"**
3. **Open Console (F12)** to see detailed logs
4. Look for:
   - ✅ `Authentication successful!` → Token is valid!
   - ❌ `Token is invalid or expired` → Get a fresh token
   - ⚠️ Other errors → Check logs below

### **Step 4: Test AI Analysis**
1. **Click "Test API"** on the AI Analysis card
2. **Wait 10-15 seconds** (Lambda cold start)
3. **Check Console** for detailed response
4. **Check Response section** below the endpoints

---

##  Common Issues & Solutions

### **Issue 1: "Token is invalid or expired" (401)**
**Cause**: Token expired (1 hour lifetime) or user signed out  
**Solution**:
1. Go to localhost:3002
2. Sign out (click your name → Sign Out)
3. Sign back in
4. Get a fresh token using Method A above
5. Try again

### **Issue 2: "Network error" or "Failed to fetch"**
**Cause**: CORS, network, or timeout  
**Solution**:
1. Check internet connection
2. Try again (Lambda might be cold starting)
3. Check if you're on VPN (might block AWS)

### **Issue 3: Lambda Timeout (First Call)**
**Cause**: Lambda hasn't been used recently (cold start)  
**Solution**:
- **First call**: 10-15 seconds (might timeout)
- **Try 2-3 times**: Each attempt warms the Lambda
- **Subsequent calls**: 2-3 seconds

### **Issue 4: "Nothing happens" when clicking buttons**
**Cause**: JavaScript error or console blocked  
**Solution**:
1. **Open Console (F12)** - you MUST have it open
2. **Refresh the page** (Cmd+R)
3. **Check for errors** in Console
4. **Try clicking again**

### **Issue 5: Token looks truncated in the input field**
**Cause**: Input field display limit (visual only)  
**Solution**: This is normal! The full token is there, just scroll in the input field or check with:
```javascript
document.getElementById('token').value.length
// Should return 800-1200 (typical JWT length)
```

---

## 🧪 **Quick Manual Test (Using Terminal)**

Test your token directly from command line:

```bash
cd /Users/psama0214/Hackathon-New/CareCircle

# Replace YOUR_TOKEN_HERE with your actual token
./test-api.sh YOUR_TOKEN_HERE
```

This will test all endpoints and show you exactly what's working!

---

## 📊 **Expected Results**

### **Authentication Test (Success)**
```json
{
  "message": "✅ Authentication successful!",
  "status": 200,
  "data": [ ... alerts array ... ]
}
```

### **AI Analysis Test (Success)**
```json
{
  "status": 200,
  "data": {
    "summary": "Memory confusion and medication adherence concerns detected",
    "sentiment": { ... },
    "cognitive_assessment": { ... },
    "alerts": [ ... ]
  }
}
```

### **Token Expired (401)**
```json
{
  "error": "❌ Token is invalid or expired",
  "status": 401,
  "hint": "Please get a fresh token from your app"
}
```

---

## 🔍 **Debug Checklist**

Before asking for help, check:

- [ ] **I'm signed in** to the app (localhost:3002)
- [ ] **I got a fresh token** (less than 1 hour old)
- [ ] **I pasted the FULL token** (not just part of it)
- [ ] **I have Console open** (F12) to see logs
- [ ] **I clicked "Test Authentication"** first (before testing endpoints)
- [ ] **I waited 10-15 seconds** for Lambda to respond
- [ ] **I tried 2-3 times** (in case of cold start)
- [ ] **I checked the Console** for detailed error messages

---

## 📞 **Still Not Working?**

### **Check These:**

1. **Lambda Logs** (see what's actually happening):
```bash
aws logs tail /aws/lambda/CareCircleStack2-AIAnalysisFunction --follow
```

2. **API Gateway Logs**:
```bash
aws logs tail /aws/apigateway/CareCircleAPI --follow
```

3. **DynamoDB Table** (is it empty?):
```bash
aws dynamodb scan --table-name CareCircle-Data-v2 --limit 5
```

### **Get Error Details:**
When you click "Test API", **immediately open Console (F12)** and look for:
- Red error messages
- Network tab showing the request/response
- Exact error text

**Copy the exact error** from the Console and we can fix it!

---

*Last Updated: December 27, 2025, 4:35 PM*  
*Backend Status: ✅ VERIFIED LIVE*  
*Updated API Tester: ✅ Better Error Handling*





