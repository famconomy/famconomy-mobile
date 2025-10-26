# Login Navigation Guide

## How Login Navigation Works

The FamConomy mobile app uses an **automatic authentication-based navigation system**. Here's how it works:

### Architecture Overview

```
App.tsx (Root)
    ↓
useAuth() checks authentication
    ↓
┌────────────────┐
│ User logged in?│
└────────┬───────┘
         ↓
    ┌────┴────┐
    │   NO    │   YES
    ↓         ↓
LoginScreen   DrawerNavigator
              (Dashboard, etc.)
```

### Key Components

#### 1. **App.tsx** - Root Navigation Controller
```typescript
const { user, isLoading, logout } = useAuth();

if (!user) {
  return <LoginScreen />; // Show login when no user
}

return (
  <DrawerNavigator>
    {/* All app screens */}
  </DrawerNavigator>
);
```

#### 2. **authStore.ts** - Authentication State Management
```typescript
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {
    // Call API
    const mockUser = { id: '1', email, fullName: 'Demo User', ... };
    
    // Set user state -> triggers App.tsx re-render
    set({ user: mockUser, isAuthenticated: true });
  },
}));
```

#### 3. **LoginScreen.tsx** - Login Form
```typescript
const handleLogin = async () => {
  await login(email, password); // Calls authStore.login()
  // No navigation needed! App.tsx automatically shows Dashboard
};
```

### Navigation Flow

**Step-by-Step Process:**

1. **User opens app** → App.tsx checks `useAuth()` → No user → Shows LoginScreen

2. **User enters credentials** → Presses "Sign In" button

3. **LoginScreen calls `login(email, password)`** 
   - Validates form fields
   - Calls authStore's `login()` function

4. **authStore.login() executes:**
   - Shows loading state (`isLoading: true`)
   - Simulates API call (1 second delay)
   - Creates mock user object
   - Sets `user`, `token`, and `isAuthenticated: true`

5. **State change triggers re-render:**
   - App.tsx's `useAuth()` hook detects user is now set
   - `if (!user)` becomes false
   - App.tsx automatically renders DrawerNavigator instead of LoginScreen

6. **User sees Dashboard screen** ✅

### Why This Approach?

**Advantages:**
- ✅ **Automatic navigation** - No manual `navigation.replace()` needed
- ✅ **Single source of truth** - Authentication state controls entire app structure
- ✅ **Persistent login** - State saved to AsyncStorage via Zustand persist
- ✅ **Clean separation** - LoginScreen doesn't need navigation props
- ✅ **Type-safe** - No navigation typing issues between auth and main screens

**Traditional Approach (NOT used):**
```typescript
// ❌ Manual navigation (not needed with our architecture)
const handleLogin = async () => {
  await login(email, password);
  navigation.replace('Dashboard'); // We DON'T need this!
};
```

### Testing Login Flow

**Simulator Test:**
1. Launch app → Should show LoginScreen
2. Enter any email/password (validation: email format, password 6+ chars)
3. Press "Sign In"
4. Wait ~1 second (simulated API call)
5. App should automatically navigate to Dashboard

**Current Mock Credentials:**
- Any valid email format (e.g., `test@example.com`)
- Any password 6+ characters (e.g., `password123`)
- Mock user: `Demo User` (parent role)

### When Backend is Ready

Replace the mock login in `authStore.ts`:

```typescript
login: async (email: string, password: string) => {
  set({ isLoading: true, error: null });
  try {
    // Replace mock with real API call
    const response = await api.post('/auth/login', { email, password });
    
    set({ 
      user: response.data.user,
      token: response.data.token,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  } catch (error) {
    const message = error.response?.data?.message || 'Login failed';
    set({ error: message, isLoading: false });
    throw error;
  }
},
```

### Logout Flow

**Process:**
1. User taps Logout in sidebar or settings
2. Calls `logout()` from authStore
3. Sets `user: null`, `isAuthenticated: false`, clears token
4. App.tsx detects `!user` → Automatically shows LoginScreen

### State Persistence

**Zustand Persist Middleware:**
```typescript
persist(
  (set) => ({ /* store */ }),
  {
    name: 'auth-store',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }),
  }
)
```

**Benefits:**
- User stays logged in across app restarts
- Token persisted for API calls
- Automatic rehydration on app launch

### Dependencies Installed

```json
{
  "zustand": "^5.0.2",
  "@react-native-async-storage/async-storage": "^2.1.0"
}
```

### Error Handling

**Login Errors:**
- Form validation errors → Field-level error messages
- API errors → Alert banner at top of LoginScreen
- Network errors → Caught and displayed to user

**Example:**
```typescript
// Invalid email format
"Please enter a valid email"

// Password too short
"Password must be at least 6 characters"

// API error
"Login failed: Invalid credentials"
```

## Summary

**You DON'T need to manually navigate after login!** The authentication state automatically controls whether the app shows the LoginScreen or the main DrawerNavigator with Dashboard.

Just call `login(email, password)` and let the reactive state management handle the rest! 🎉
