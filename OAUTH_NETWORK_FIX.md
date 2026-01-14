# Mobile OAuth & Network Configuration Fix

## 🔧 Changes Made

### 1. **Fixed Network Connection (apiClient.ts)**
**Problem**: iOS simulator uses `localhost` which refers to the simulator itself, not your host machine.

**Solution**: Updated baseURL from `http://localhost:3000/api` to `http://127.0.0.1:3000/api`
- For iOS simulator: Use `127.0.0.1:3000`
- For Android emulator: Update to use `10.0.2.2:3000` if needed
- For physical devices: Use actual IP or production URL

**Added Request/Response Logging**:
- Logs all API requests with method and URL
- Logs all API responses with status codes
- Better error details for debugging network issues

### 2. **Implemented Real OAuth (oauthService.ts)**
Created new OAuth service file with support for:
- **Google Sign-In** via `@react-native-google-signin/google-signin`
- **Apple Sign-In** via `@react-native-firebase/auth`
- **Microsoft Sign-In** via `react-native-app-auth`
- **Facebook Sign-In** via `react-native-app-auth`

All OAuth providers:
- Make native sign-in calls
- Send tokens to backend via `/auth/oauth/{provider}` endpoints
- Return full user data (id, email, role, status, etc.)
- Include proper error handling with helpful messages

### 3. **Updated useAuth Hook**
- Integrated OAuthService for all four providers
- No more "not implemented" errors
- Proper error messages distinguish between:
  - Library configuration errors
  - Network errors
  - API errors
  - Cancellations

### 4. **Added OAuth Libraries (package.json)**
```json
"dependencies": {
  "@react-native-firebase/app": "*",
  "@react-native-firebase/auth": "*",
  "@react-native-google-signin/google-signin": "*",
  "react-native-app-auth": "*",
  "axios": "*"
}
```

## 📝 Testing Login

### Email/Password Login
1. **Make sure backend is running**: `http://127.0.0.1:3000`
2. **Try logging in** with valid credentials
3. **Check console** for API call logs (press `j` in Metro terminal for DevTools)
4. **Expected**: Successful login redirects to ParentDashboard or ChildDevice

### OAuth Login (Google, Apple, Microsoft, Facebook)
1. **Buttons are now wired** - no more "not implemented" errors
2. **Current status**: Will show library configuration errors if OAuth isn't set up
3. **Next steps**: 
   - Configure Google OAuth Console credentials
   - Set up Firebase for Apple & Facebook
   - Configure Microsoft Azure app registration
   - Set environment variables for client IDs

## 🔍 Debugging Tips

### View Console Logs
```bash
# In Metro terminal, press 'j' to open React Native DevTools
# Logs appear in Chrome browser console
```

### Expected API Calls
- Email login: `POST /auth/login` → Returns user object
- OAuth: `POST /auth/oauth/{provider}` → Returns user object  
- Check auth: `GET /auth/me` → Returns current user or 401

### Network Issues to Check
1. Backend API running on `127.0.0.1:3000`
2. Not `localhost:3000` (that goes to simulator, not your machine)
3. CORS headers configured on backend
4. Auth cookies enabled (withCredentials: true)

## 🚀 Next Steps

### Immediate
- [ ] Test email/password login
- [ ] Check API logs in Metro DevTools
- [ ] Verify backend responds correctly

### OAuth Configuration (When Ready)
- [ ] Google Console: Create OAuth 2.0 credentials for mobile
- [ ] Firebase: Set up Apple & Facebook sign-in
- [ ] Microsoft Azure: Register mobile app, get client ID
- [ ] Set client IDs in `mobile/.env`
- [ ] Configure backend with provider secrets & redirect URIs (Microsoft/Facebook code exchange)

### Deployment
- [ ] Test on physical iOS device
- [ ] Test on Android emulator/device  
- [ ] Configure production API URL
- [ ] Set up proper OAuth provider configuration for production
