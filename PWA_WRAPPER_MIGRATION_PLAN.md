# Migration Plan: PWA Wrapper Architecture

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LAYER 2: CLIENTS                      │
├─────────────────────────┬───────────────────────────────┤
│      Web Browser        │         Mobile App            │
│   app.famconomy.com     │  ┌─────────────────────────┐  │
│         (PWA)           │  │    React Native Shell   │  │
│                         │  │  ┌─────────────────────┐│  │
│                         │  │  │  WebView (PWA)      ││  │
│                         │  │  └─────────────────────┘│  │
│                         │  │  ┌─────────────────────┐│  │
│                         │  │  │  Native Modules     ││  │
│                         │  │  │  - FamilyControls   ││  │
│                         │  │  │  - Push Notifs      ││  │
│                         │  │  │  - Deep Links       ││  │
│                         │  │  └─────────────────────┘│  │
│                         │  └─────────────────────────┘  │
└─────────────────────────┴───────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                  LAYER 1: SUPABASE                       │
│  ┌──────────────┬──────────────┬──────────────────────┐ │
│  │  PostgreSQL  │ Edge Funcs   │  Auth + Realtime     │ │
│  └──────────────┴──────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Shared Types Package (Week 1)

### 1.1 Create `@famconomy/shared` package

```
famconomy-mobile/packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types/
    │   ├── auth.ts          # User, Session, Profile
    │   ├── family.ts        # Family, Member, Invite
    │   ├── tasks.ts         # Task, TaskStatus, TaskCategory
    │   ├── screenTime.ts    # ScreenTimeGrant, Device, Schedule
    │   └── bridge.ts        # WebView ↔ Native message types
    └── constants/
        └── index.ts         # Shared constants
```

### 1.2 Bridge Message Types

```typescript
// Types for WebView ↔ Native communication
interface NativeBridgeMessage {
  type: 'AUTH_TOKEN' | 'SCREEN_TIME_REQUEST' | 'DEVICE_INFO' | 'PUSH_TOKEN';
  payload: unknown;
}

interface ScreenTimeRequest {
  action: 'grant' | 'revoke' | 'query';
  childUserId: string;
  duration?: number;  // minutes
  appBundleIds?: string[];
}

interface ScreenTimeResponse {
  success: boolean;
  remainingMinutes?: number;
  blockedApps?: string[];
  error?: string;
}
```

---

## Phase 2: Auth Alignment with Supabase (Week 1-2)

### 2.1 Mobile Auth Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Mobile     │    │   WebView    │    │   Supabase   │
│   Native     │    │   (PWA)      │    │   Auth       │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │  Load PWA         │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │  User logs in     │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  Session + JWT    │
       │                   │<──────────────────│
       │                   │                   │
       │  postMessage:     │                   │
       │  AUTH_TOKEN       │                   │
       │<──────────────────│                   │
       │                   │                   │
       │  Store in         │                   │
       │  Keychain         │                   │
       │                   │                   │
```

### 2.2 Implementation Tasks

| Task | Description |
|------|-------------|
| **Remove Firebase Auth** | Delete `@react-native-firebase/auth` dependency |
| **Add Supabase client** | Install `@supabase/supabase-js` for native-side auth validation |
| **WebView auth bridge** | Inject JS to capture Supabase session and send to native |
| **Keychain storage** | Store refresh token in secure storage for background operations |
| **Session sync** | Native modules use same JWT for Edge Function calls |

### 2.3 Files to Modify/Create

```
src/
├── auth/
│   ├── SupabaseNativeClient.ts    # Minimal Supabase client for native
│   ├── AuthBridge.ts              # WebView ↔ Native auth sync
│   └── SecureStorage.ts           # Keychain wrapper
├── webview/
│   ├── WebViewContainer.tsx       # Main PWA container
│   └── injectedScripts.ts         # Auth capture JS
```

---

## Phase 3: PWA Wrapper Implementation (Week 2-3)

### 3.1 New Mobile App Structure

```
famconomy-mobile/
├── src/
│   ├── App.tsx                    # Simplified entry
│   ├── WebViewContainer.tsx       # Main PWA wrapper
│   ├── native/
│   │   ├── FamilyControlsBridge.ts
│   │   ├── PushNotificationsBridge.ts
│   │   ├── DeepLinkHandler.ts
│   │   └── DeviceInfoBridge.ts
│   ├── bridges/
│   │   ├── MessageHandler.ts      # Route messages to native modules
│   │   └── types.ts               # From @famconomy/shared
│   └── screens/
│       ├── SplashScreen.tsx       # Loading/auth check
│       └── PermissionsScreen.tsx  # FamilyControls setup (parents)
├── ios/
│   └── FamilyControlsModule/      # Swift native module
└── android/
    └── DeviceManagement/          # Kotlin native module
```

### 3.2 WebView Container Component

```typescript
// Simplified WebViewContainer.tsx structure
interface WebViewContainerProps {
  userRole: 'parent' | 'child';
  familyId: string;
}

// Key features:
// - Load app.famconomy.com with auth token
// - Handle postMessage from PWA
// - Route to native modules (FamilyControls, etc.)
// - Show native overlays for permissions
```

### 3.3 Native Module Requirements

| Module | Platform | Purpose |
|--------|----------|---------|
| **FamilyControls** | iOS 16+ | Screen time management for children |
| **DevicePolicyManager** | Android | App blocking/time limits |
| **Push Notifications** | Both | Background alerts from Supabase |
| **Deep Links** | Both | `famconomy://` URL handling |
| **Biometrics** | Both | Optional parent auth for approvals |

---

## Phase 4: Child Account Screen Time Agent (Week 3-4)

### 4.1 Child Device Flow

```
┌─────────────────────────────────────────────────────────┐
│                   CHILD DEVICE                           │
├─────────────────────────────────────────────────────────┤
│  1. Parent installs app, signs in                        │
│  2. Parent enables FamilyControls (iOS) / DPM (Android) │
│  3. Parent adds child account                            │
│  4. Child signs in on their device                       │
│  5. App registers as managed device                      │
│  6. Supabase Realtime syncs screen time grants          │
│  7. Native module enforces time limits                   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Screen Time Sync Architecture

```typescript
// Native background service listens to Supabase Realtime
// Channel: screen_time_grants:{childUserId}

// On grant created/updated:
// - Update local FamilyControls shield configuration
// - Adjust allowed app categories/bundles
// - Set time remaining countdown

// On task completed (from PWA):
// - PWA calls Edge Function → creates screen_time_grant
// - Realtime pushes to child device
// - Native module unlocks apps for granted duration
```

### 4.3 Implementation Files

```
src/native/
├── ios/
│   ├── FamilyControlsManager.swift
│   ├── ScreenTimeScheduler.swift
│   └── ShieldConfigurationManager.swift
├── android/
│   ├── DevicePolicyService.kt
│   ├── AppBlockerManager.kt
│   └── UsageStatsTracker.kt
└── bridges/
    ├── ScreenTimeRealtimeSync.ts    # Supabase Realtime → Native
    └── ScreenTimeActions.ts         # Native → Supabase calls
```

---

## Files to Delete from Mobile

Remove all redundant code that will be handled by PWA:

```bash
# Delete these directories/files (handled by PWA WebView)
rm -rf src/screens/main/          # All main screens
rm -rf src/screens/details/       # Detail screens  
rm -rf src/screens/auth/          # Auth screens (PWA handles)
rm -rf src/api/                   # All API clients (use PWA)
rm -rf src/components/            # UI components (use PWA)
rm -rf src/hooks/                 # Most hooks (use PWA)
rm -rf src/navigation/            # Complex navigation (use PWA)
rm -rf src/data/                  # Mock data
rm -rf src/services/              # Services duplicating PWA

# Keep these
src/native/                       # Native modules
src/store/                        # Minimal native state
src/types/                        # Bridge types only
```

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| **1** | Shared Types | `@famconomy/shared` package with bridge types |
| **1-2** | Auth Alignment | WebView auth bridge, remove Firebase |
| **2-3** | PWA Wrapper | WebViewContainer, message routing |
| **3-4** | Screen Time Agent | FamilyControls integration, Realtime sync |
| **4** | Testing | Parent/child flows, cross-device sync |

---

## Next Steps

1. **Create shared package** structure
2. **Implement WebViewContainer** with basic auth bridge
3. **Wire up existing FamilyControls** module to new architecture
