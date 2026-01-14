# Authentication & Navigation Troubleshooting Guide

## Current Architecture

### Authentication Flow

```
App Launch
    ↓
useAuth() hook runs checkAuthStatus()
    ↓
GET /auth/me
    ↓
┌─────────────────────┐
│ Response Status?    │
└─────────┬───────────┘
          ↓
    ┌─────┴─────┐
    │   200     │   401/403
    ↓           ↓
Set User     No User
    ↓           ↓
Show Main    Show Login
Navigator    Screen
```

### Files Using Correct Auth

✅ **App.tsx** - Uses `useAuth()` hook (correct)
✅ **Login.tsx** (`app/screens/Login.tsx`) - Uses `useAuth()` hook (correct)
❌ **LoginScreen.tsx** (`screens/auth/LoginScreen.tsx`) - Uses `useAuthStore()` (UNUSED)

**Note:** The correct Login screen is at `app/screens/Login.tsx`, not `screens/auth/LoginScreen.tsx`

## Current Issues to Check

### 1. Header and Sidebar Not Visible

**Possible Causes:**

A. **User is not authenticated**
   - App.tsx shows LoginScreen instead of DrawerNavigator
   - Solution: Successfully login to see navigation

B. **DrawerNavigator not rendering properly**
   - React Navigation setup issue
   - Solution: Check navigation mounting

C. **Header/Sidebar components have errors**
   - Component crashes silently
   - Solution: Check React Native debugger

### 2. Role Not Being Pulled from /auth/me

**Check these steps:**

#### Step 1: Verify API Response Format

The `useAuth()` hook expects the `/auth/me` endpoint to return:

```json
{
  "id": "string",
  "email": "string",
  "role": "parent|guardian|child|admin",
  "firstName": "string",
  "lastName": "string",
  "full_name": "string",
  "profilePhotoUrl": "string"
}
```

**Or alternate field names (normalized automatically):**

```json
{
  "UserID": "string",
  "Email": "string",
  "RoleName": "parent|guardian|child|admin",
  "FirstName": "string",
  "LastName": "string",
  "ProfilePhotoUrl": "string"
}
```

#### Step 2: Check Role Normalization

The `normalizeRole()` function in `useAuth.ts` handles:

```typescript
// Accepts these values:
"parent", "Parent", "PARENT" → "parent"
"guardian", "Guardian" → "guardian"
"child", "Child" → "child"
"admin", "Admin" → "admin"

// Case-insensitive and trims whitespace
// Returns "none" if role is invalid/missing
```

#### Step 3: Verify Network Requests

Check the console logs for:

```
[API Client] Using baseURL: https://famconomy.com/api
[API] GET /auth/me
[API Response] 200 /auth/me
Auth check successful: { id, email, role, ... }
```

## Testing Login Flow

### Test 1: Check Initial Auth State

**Open React Native Debugger:**

```bash
# In terminal where Metro is running, press 'd' for dev menu
# Then select "Debug" to open Chrome debugger
```

**Check Console Logs:**

```
✅ Look for: "Checking auth status..."
✅ Look for: "[API] GET /auth/me"
✅ Expected: "Auth check successful: {...}" OR "Auth check failed (user not authenticated)"
```

### Test 2: Login with Backend Credentials

**In the simulator:**

1. Enter your actual backend credentials:
   - Email: Your registered email
   - Password: Your actual password

2. Press "Sign In"

3. Watch console for:
   ```
   Attempting email/password login with: your@email.com
   [API] POST /auth/login
   [API Response] 200 /auth/login
   Login successful: { id, email, role, ... }
   ```

4. **If successful:** App should automatically show DrawerNavigator with Header & Sidebar

5. **If failed:** Check error message and API response

### Test 3: Verify User Object Structure

**Add debug logging:**

Edit `App.tsx` temporarily around line 42:

```tsx
const App: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  
  // ADD THIS DEBUG LOG
  console.log('=== APP RENDER ===');
  console.log('User:', JSON.stringify(user, null, 2));
  console.log('IsLoading:', isLoading);
  console.log('==================');
  
  if (isLoading) {
    return null;
  }
```

**Expected Output:**

```json
=== APP RENDER ===
User: {
  "id": "123",
  "email": "user@example.com",
  "role": "parent",
  "full_name": "John Doe",
  "status": "active"
}
IsLoading: false
==================
```

## Common Issues & Solutions

### Issue 1: App Stuck on Login Screen

**Symptoms:**
- Login appears successful in console
- But app doesn't navigate to main screen

**Diagnosis:**
```typescript
// Check if user object is properly set
console.log('User after login:', user);
// Should NOT be null
```

**Solution:**
- Verify `/auth/login` returns user object
- Check that `setUser(userPayload)` is being called
- Ensure App.tsx re-renders after user state changes

### Issue 2: Role Shows as "none"

**Symptoms:**
- User logs in successfully
- But role displays as "none" instead of "parent"/"child"/etc.

**Diagnosis:**
```typescript
// In useAuth.ts, add logging in normalizeRole:
const normalizeRole = (value: any): AuthUser['role'] => {
  console.log('Normalizing role:', value, typeof value);
  // ... rest of function
```

**Solutions:**

A. **Backend returns wrong field name:**
```json
❌ { "userRole": "parent" }
✅ { "role": "parent" } or { "RoleName": "parent" }
```

B. **Backend returns numeric role:**
```json
❌ { "role": 1 }
✅ { "role": "parent" }
```

C. **Role value not in expected list:**
```json
❌ { "role": "member" }
✅ { "role": "parent" }
```

### Issue 3: Header/Sidebar Not Visible Despite Login

**Symptoms:**
- User is logged in (console shows user object)
- But Header and Sidebar don't appear

**Diagnosis Steps:**

1. **Check DrawerNavigator is mounting:**
```tsx
// In App.tsx, add logging
return (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      {console.log('Rendering NavigationContainer with user:', user?.email)}
      <NavigationContainer>
        <Drawer.Navigator ...>
```

2. **Verify Header component renders:**
```tsx
// In components/Header.tsx, add logging at top:
export const Header: React.FC<HeaderProps> = ({ onMenuToggle, user }) => {
  console.log('Header rendering with user:', user?.email);
  // ... rest
```

3. **Verify Sidebar component renders:**
```tsx
// In components/Sidebar.tsx, add logging:
export const Sidebar: React.FC<SidebarProps> = ({ onClose, user, onLogout }) => {
  console.log('Sidebar rendering with user:', user?.full_name);
  // ... rest
```

**Solutions:**

A. **GestureHandlerRootView issue:**
```bash
# Reinstall gesture handler
cd /path/to/mobile
npm install react-native-gesture-handler
cd ios && pod install && cd ..
```

B. **NavigationContainer not rendering:**
```bash
# Reinstall navigation packages
npm install @react-navigation/native @react-navigation/drawer
```

C. **Component import errors:**
- Check browser/debugger console for red errors
- Look for "Unable to resolve module" messages

### Issue 4: 401/403 on /auth/me

**Symptoms:**
- Console shows: `[API Response] 401 /auth/me` or `403 /auth/me`
- User stays on login screen

**Diagnosis:**
```
Check if cookies are being sent:
withCredentials: true is set in apiClient.ts
```

**Solutions:**

A. **Backend requires authentication:**
- User needs to login first
- `/auth/me` requires valid session/cookie

B. **CORS issue:**
- Backend not allowing credentials
- Check backend CORS settings

C. **Session expired:**
- Previous session no longer valid
- User needs to login again

## Quick Debug Checklist

Run through these checks:

- [ ] Metro bundler is running
- [ ] iOS simulator/app is running
- [ ] React Native debugger is open (press 'd' in simulator → Debug)
- [ ] Console shows API calls: `[API] GET /auth/me`
- [ ] Console shows user object after login
- [ ] User object has `id`, `email`, and `role` fields
- [ ] Role is one of: parent, guardian, child, admin (not "none")
- [ ] App.tsx logs show user is NOT null after login
- [ ] NavigationContainer is rendering (no crash logs)
- [ ] No red error screens in simulator

## Testing with Backend

### Endpoint Requirements

**POST /auth/login**

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "parent",
    "firstName": "John",
    "lastName": "Doe",
    "full_name": "John Doe"
  },
  "token": "optional-jwt-token"
}
```

**GET /auth/me**

Response (when authenticated):
```json
{
  "id": "123",
  "email": "user@example.com",
  "role": "parent",
  "firstName": "John",
  "lastName": "Doe",
  "full_name": "John Doe",
  "status": "active"
}
```

Response (when not authenticated):
```
401 Unauthorized
```

## Next Steps

1. **Open React Native Debugger**
   - Press 'd' in simulator
   - Select "Debug"
   - Open Chrome DevTools

2. **Check Console Logs**
   - Look for auth status check
   - Look for API calls
   - Look for user object

3. **Try Login**
   - Enter backend credentials
   - Watch console logs
   - Check for errors

4. **Verify Navigation**
   - After successful login
   - Should see DrawerNavigator
   - Header should appear at top
   - Sidebar should open with menu button

5. **Report Issues**
   - Share console logs
   - Share API response format
   - Share any error messages

## Additional Debugging

### Enable Verbose Logging

Add this to `apiClient.ts`:

```typescript
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    console.log('[API Response Data]', response.data); // ADD THIS
    return response;
  },
```

### Check Auth State Continuously

Add this to `App.tsx`:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    console.log('Current user:', user?.email, 'Role:', user?.role);
  }, 5000);
  return () => clearInterval(interval);
}, [user]);
```

This will log the current auth state every 5 seconds.
