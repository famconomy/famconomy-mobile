# What You Should See - Visual Guide

## Authentication & Navigation Flow

### Scenario 1: First Launch (Not Authenticated)

**App Opens → Auth Check Fails**

```
┌─────────────────────────────────────┐
│                                     │
│         [FC Logo]                   │
│                                     │
│        FamConomy                    │
│   Family Management &               │
│     Device Control                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Email Address              │   │
│  │  you@example.com            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Password                   │   │
│  │  ••••••••                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        Sign in              │   │
│  └─────────────────────────────┘   │
│                                     │
│  Or continue with                   │
│                                     │
│  [Google] [Meta] [Apple] [MS]       │
│                                     │
└─────────────────────────────────────┘
```

**Console Output:**
```
=== AUTH STATUS CHECK ===
Checking auth status...
[API] GET /auth/me
[API Response] 401 /auth/me
Auth check failed (user not authenticated)
========================

=== APP RENDER ===
User: null
IsLoading: false
==================
No user - showing LoginScreen
```

### Scenario 2: After Successful Login

**User Enters Credentials → Presses Sign In → Success**

```
┌──────────────────────────────────────────────┐
│ ☰  FamConomy    [Search...]        🔔       │ ← HEADER
├──────────────────────────────────────────────┤
│                                              │
│              Dashboard                       │
│                                              │
│  [Welcome back, John!]                       │
│                                              │
│  [Quick Stats Cards]                         │
│  [Recent Activity]                           │
│  [Upcoming Tasks]                            │
│                                              │
│                                              │
│                                              │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
```

**When Menu (☰) is Tapped:**

```
┌────────────────────┬─────────────────────┐
│                    │                     │
│   FamConomy        │                     │
│                    │                     │
│   John Doe         │                     │
│   parent           │                     │
│                    │                     │
│ 🏠 Dashboard       │   Dashboard Screen  │
│ 📅 Calendar        │                     │
│ ✅ Tasks           │   [Content]         │
│ 💼 Gigs            │                     │
│ 💬 Messages        │                     │
│ 🍽️  Recipes        │                     │
│ 🛒 Shopping        │                     │
│ 🎁 Wishlists       │                     │
│ 💰 Finance         │                     │
│ 👨‍👩‍👧‍👦 Family         │                     │
│ ⭐ Values          │                     │
│ ❤️  Journal        │                     │
│ 📚 Resources       │                     │
│ ⚙️  Settings       │                     │
│                    │                     │
│ [Logout]           │                     │
│                    │                     │
└────────────────────┴─────────────────────┘
  SIDEBAR              MAIN CONTENT
```

**Console Output:**
```
=== LOGIN ATTEMPT ===
Attempting email/password login with: john@example.com
Calling POST /auth/login
[API] POST /auth/login
[API Response] 200 /auth/login
Login response data: {
  "user": {
    "id": "123",
    "email": "john@example.com",
    "role": "parent",
    "full_name": "John Doe"
  }
}
Normalized user payload: {
  "id": "123",
  "email": "john@example.com",
  "role": "parent",
  "full_name": "John Doe"
}
Setting user state...
Login successful!
====================

=== APP RENDER ===
User: {
  "id": "123",
  "email": "john@example.com",
  "role": "parent",
  "fullName": "John Doe"
}
IsLoading: false
==================
User authenticated - showing DrawerNavigator

Header rendering with user: john@example.com
Sidebar rendering with user: {
  "email": "john@example.com",
  "fullName": "John Doe",
  "role": "parent"
}
```

### Scenario 3: Already Authenticated (Returning User)

**App Opens → Auth Check Succeeds**

**Goes straight to Dashboard with Header & Sidebar visible**

```
=== AUTH STATUS CHECK ===
Checking auth status...
[API] GET /auth/me
[API Response] 200 /auth/me
Response data: {
  "id": "123",
  "email": "john@example.com",
  "role": "parent",
  "full_name": "John Doe"
}
Normalized user: {
  "id": "123",
  "email": "john@example.com",
  "role": "parent",
  "full_name": "John Doe"
}
Auth check successful!
========================

=== APP RENDER ===
User: {
  "id": "123",
  "email": "john@example.com",
  "role": "parent",
  "fullName": "John Doe"
}
IsLoading: false
==================
User authenticated - showing DrawerNavigator

Header rendering with user: john@example.com
Sidebar rendering with user: { ... }
```

## Key Visual Elements

### Header Components

```
┌──────────────────────────────────────────────┐
│ ☰  FamConomy    [Search...]        🔔       │
│ │    │              │                │       │
│ │    │              │                └─ Notifications (bell icon)
│ │    │              └─ Search bar
│ │    └─ Logo text
│ └─ Menu button (hamburger)
└──────────────────────────────────────────────┘
```

**If you DON'T see this:**
- Check console for "Header rendering with user: ..."
- If missing, Header component didn't mount

### Sidebar Navigation

```
┌────────────────────┐
│   FamConomy        │ ← Logo
│                    │
│   John Doe         │ ← User's full name
│   parent           │ ← User's role
│                    │
│ 🏠 Dashboard       │ ← Navigation items
│ 📅 Calendar        │   (14 total)
│ ✅ Tasks           │
│ ...                │
│                    │
│ [Logout]           │ ← Logout button
└────────────────────┘
```

**If you DON'T see user info:**
- Check console for "Sidebar rendering with user: ..."
- Check if user.full_name and user.role exist

## Debug Checklist

Use this to verify everything is working:

### ✅ App Launch Checks

- [ ] Console shows: `=== AUTH STATUS CHECK ===`
- [ ] Console shows: `[API] GET /auth/me`
- [ ] Console shows: `=== APP RENDER ===`
- [ ] Console shows user state (null or object)

### ✅ Login Flow Checks (if not authenticated)

- [ ] Login screen is visible
- [ ] Can enter email and password
- [ ] Sign in button is enabled
- [ ] Pressing sign in shows: `=== LOGIN ATTEMPT ===`
- [ ] Console shows: `[API] POST /auth/login`
- [ ] Console shows: `Login successful!`
- [ ] App automatically navigates to Dashboard

### ✅ Navigation Checks (if authenticated)

- [ ] Header is visible at top
- [ ] Can see menu button (☰)
- [ ] Can see FamConomy logo
- [ ] Can see search bar
- [ ] Can see notification bell (🔔)
- [ ] Console shows: `Header rendering with user: ...`

### ✅ Sidebar Checks

- [ ] Tapping menu button opens sidebar
- [ ] Sidebar shows FamConomy logo
- [ ] Sidebar shows user's name
- [ ] Sidebar shows user's role
- [ ] Sidebar shows 14 navigation items
- [ ] Can tap items to navigate
- [ ] Console shows: `Sidebar rendering with user: ...`

### ✅ Role Display Checks

- [ ] User role shows correctly (not "none")
- [ ] Role is one of: parent, guardian, child, admin
- [ ] Console shows normalized role in user object
- [ ] Backend response includes valid role field

## What's Normal vs Problem

### ✅ Normal Behaviors

**On first launch:**
- "Auth check failed" → Normal, not logged in yet
- Shows LoginScreen → Expected
- User: null → Correct initial state

**After login:**
- Shows "Login successful!" → Good
- App navigates automatically → Correct
- Header appears → Expected
- Sidebar accessible → Working properly

### ❌ Problem Indicators

**Login not working:**
- No "Login successful!" message
- Error message in red box
- Network error → Check backend connection
- "Invalid credentials" → Check email/password

**Navigation not appearing:**
- No "User authenticated - showing DrawerNavigator"
- No "Header rendering with user: ..."
- User is null after successful login
- Red error screen in app

**Role issues:**
- Role shows as "none"
- Sidebar doesn't show role
- Backend returning wrong format
- Missing role field in response

## What to Share if Issues Occur

If things aren't working, share these console sections:

1. **Auth Check Section:**
```
=== AUTH STATUS CHECK ===
[copy everything here]
========================
```

2. **Login Attempt Section:**
```
=== LOGIN ATTEMPT ===
[copy everything here]
====================
```

3. **App Render Section:**
```
=== APP RENDER ===
[copy everything here]
==================
```

4. **Component Render Logs:**
```
Header rendering with user: ...
Sidebar rendering with user: ...
```

5. **Any Error Messages:**
- Red error boxes in app
- Console errors in red text
- Network errors
- API errors

This will help diagnose exactly what's happening! 🔍
