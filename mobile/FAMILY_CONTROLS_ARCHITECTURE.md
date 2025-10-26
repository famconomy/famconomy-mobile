# Family Controls Bridge Architecture

## Overview

The Family Controls bridge connects the React Native app to native iOS family control features via a custom Swift module. This enables parental controls, screen time management, and device supervision.

---

## 1. Architecture Overview

```
React Native Layer (JS)
        ↓
Family Controls Bridge (JS-Native Interface)
        ↓
Swift Module (Native Implementation)
        ↓
OS APIs (ScreenTime, FamilyControls, etc.)
```

### Key Components

1. **React Native Bridge** - TypeScript interface layer
2. **Native Module** - Swift implementation
3. **Authorization Shield** - Permission & role validation
4. **Screen Time Manager** - Monitoring & restrictions
5. **Device Controls** - App blocking, time limits
6. **Event Emitter** - Status updates to React layer

---

## 2. Swift Module Responsibilities

### Core Modules

```
FamilyControlsModule/
├── FamilyControlsBridge.swift          (Entry point, exported methods)
├── AuthorizationShield.swift           (Permissions & authorization)
├── ScreenTimeManager.swift             (Screen time tracking & limits)
├── DeviceControlManager.swift          (App restrictions, device lock)
├── FamilyMember.swift                  (User data model)
├── Event.swift                         (Event definitions)
└── Utilities/
    ├── Logger.swift
    ├── Error.swift
    └── Constants.swift
```

### Module Responsibilities

#### 2.1 FamilyControlsBridge.swift
**Purpose**: Main entry point and RN communication

**Responsibilities**:
- Export React Native methods
- Handle async callbacks
- Route requests to appropriate managers
- Emit events back to React Native
- Manage lifecycle

**Public Methods**:
```swift
@objc func requestFamilyControlsAccess(_ familyID: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock)
@objc func setScreenTimeLimit(_ params: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
@objc func blockApplication(_ params: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
@objc func getDeviceStatus(_ deviceID: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
@objc func enableScreenTimeMonitoring(_ params: NSDictionary, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
@objc func acknowledgeWarning(_ warningID: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
@objc func getRemainingScreenTime(_ userID: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)
```

#### 2.2 AuthorizationShield.swift
**Purpose**: Authorization and permission management

**Responsibilities**:
- Validate user roles (parent/child)
- Check device permissions
- Enforce authorization policies
- Track authorization state
- Handle permission requests

**Key Methods**:
```swift
func requestAuthorization(for family: FamilyID) -> Future<AuthorizationStatus>
func validateParentalAccess(userID: String) -> Bool
func hasScreenTimePermission() -> Bool
func canModifyDeviceSettings(userID: String) -> Bool
func canViewChildActivity(parentID: String, childID: String) -> Bool
func enforcePolicy(_ policy: ControlPolicy) -> Result<Void, PolicyError>
```

**Authorization Levels**:
- `none` - No access
- `viewer` - Read-only access to reports
- `manager` - Can set limits but not override
- `parent` - Full parental control access
- `admin` - System administrator (rarely used)

#### 2.3 ScreenTimeManager.swift
**Purpose**: Screen time tracking and management

**Responsibilities**:
- Monitor screen time across categories
- Set time limits per app/category
- Track usage patterns
- Send warnings when limits approaching
- Handle downtime/focus modes
- Generate reports

**Key Methods**:
```swift
func trackScreenTime(appBundle: String, duration: TimeInterval)
func setDailyLimit(category: AppCategory, minutes: Int) -> Result<Void, Error>
func setWeeklySchedule(schedule: ScreenTimeSchedule) -> Result<Void, Error>
func getRemainingTime(userID: String, date: Date = Date()) -> TimeInterval
func getScreenTimeReport(userID: String, period: ReportPeriod) -> ScreenTimeReport
func enableDowntime(schedule: DowntimeSchedule) -> Result<Void, Error>
func getActiveDowntime() -> DowntimeSchedule?
func approveAdditionalTime(userID: String, minutes: Int) -> Result<Void, Error>
```

**Monitored Categories**:
- Social Media
- Entertainment
- Productivity
- Games
- Education
- Other

#### 2.4 DeviceControlManager.swift
**Purpose**: Device-level control and restrictions

**Responsibilities**:
- Block/unblock applications
- Manage app availability schedules
- Control device features (camera, etc.)
- Handle app limits
- Lock device if needed
- Manage restricted content

**Key Methods**:
```swift
func blockApplication(_ bundleID: String) -> Result<Void, Error>
func unblockApplication(_ bundleID: String) -> Result<Void, Error>
func getBlockedApplications() -> [String]
func setAppLimit(bundleID: String, minutes: Int) -> Result<Void, Error>
func setScheduledAppsBlocking(schedule: AppsSchedule) -> Result<Void, Error>
func restrictContentCategory(_ category: ContentRestriction) -> Result<Void, Error>
func lockDevice() -> Result<Void, Error>
func getSiriRestrictions() -> SiriRestriction
```

#### 2.5 Event.swift
**Purpose**: Event definitions for React Native communication

**Event Types**:
```swift
enum FamilyControlsEvent: String {
    // Screen Time Events
    case screenTimeWarning = "SCREEN_TIME_WARNING"
    case screenTimeExceeded = "SCREEN_TIME_EXCEEDED"
    case downtimeStarted = "DOWNTIME_STARTED"
    case downtimeEnded = "DOWNTIME_ENDED"
    
    // Device Control Events
    case appBlocked = "APP_BLOCKED"
    case appUnblocked = "APP_UNBLOCKED"
    case deviceLocked = "DEVICE_LOCKED"
    case deviceUnlocked = "DEVICE_UNLOCKED"
    
    // Authorization Events
    case authorizationChanged = "AUTHORIZATION_CHANGED"
    case permissionRequired = "PERMISSION_REQUIRED"
    
    // Status Events
    case statusUpdated = "STATUS_UPDATED"
    case errorOccurred = "ERROR_OCCURRED"
}
```

---

## 3. Authorization Shield Architecture

### Permission Hierarchy

```
System Authorization (iOS)
        ↓
Family Membership Validation
        ↓
Role-Based Access Control
        ↓
Feature-Specific Permissions
        ↓
Action Authorization
```

### Authorization Flow

```
1. User Request (React Native)
   ↓
2. Extract User Context (ID, Role, Family)
   ↓
3. Validate System Authorization
   ↓
4. Check Family Membership
   ↓
5. Validate Role Permissions
   ↓
6. Check Feature Access
   ↓
7. Verify Specific Action
   ↓
8. Execute or Reject
```

### Permission Matrix

```
                    | Parent | Child | Guardian | Admin |
--------------------|--------|-------|----------|-------|
View Screen Time    |   ✓    |   ✓   |    ✓     |   ✓   |
Set Time Limits     |   ✓    |   ✗   |    ✓     |   ✓   |
Block Apps          |   ✓    |   ✗   |    ✓     |   ✓   |
Approve Extra Time  |   ✓    |   ✗   |    ✓     |   ✓   |
View Device Status  |   ✓    |   ✓   |    ✓     |   ✓   |
Lock Device         |   ✓    |   ✗   |    ✓     |   ✓   |
Override Limits     |   ✓    |   ✗   |    ✗     |   ✓   |
Modify Other Users  |   ✗    |   ✗   |    ✗     |   ✓   |
```

### Shield Implementation

```swift
class AuthorizationShield {
    // Core validation methods
    func validateRequest(
        userID: String,
        action: ControlAction,
        targetUserID: String?,
        familyID: String
    ) -> AuthorizationResult
    
    // Helper methods
    func getUserRole(userID: String, in family: String) -> UserRole?
    func isMemberOfFamily(userID: String, familyID: String) -> Bool
    func canPerformAction(role: UserRole, action: ControlAction) -> Bool
}
```

---

## 4. React Native to Swift Bridge Interface

### Bridge Module Definition

```typescript
// FamilyControlsBridge.ts (TypeScript interface)

export interface FamilyControlsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ScreenTimeData {
  userId: string;
  remaining: number;      // seconds
  limit: number;          // seconds
  used: number;           // seconds
  percentage: number;
}

export interface FamilyControlsModule {
  // Authorization
  requestFamilyControlsAccess(familyId: string): Promise<boolean>;
  checkAuthorizationStatus(familyId: string): Promise<AuthStatus>;
  
  // Screen Time
  setScreenTimeLimit(params: {
    userId: string;
    minutes: number;
    category?: AppCategory;
  }): Promise<FamilyControlsResponse<void>>;
  
  getScreenTimeInfo(userId: string): Promise<FamilyControlsResponse<ScreenTimeData>>;
  
  getRemainingScreenTime(userId: string): Promise<FamilyControlsResponse<number>>;
  
  approveAdditionalTime(params: {
    userId: string;
    minutes: number;
  }): Promise<FamilyControlsResponse<void>>;
  
  // Device Control
  blockApplication(bundleId: string): Promise<FamilyControlsResponse<void>>;
  unblockApplication(bundleId: string): Promise<FamilyControlsResponse<void>>;
  getBlockedApplications(): Promise<FamilyControlsResponse<string[]>>;
  
  // Device Status
  getDeviceStatus(deviceId: string): Promise<FamilyControlsResponse<DeviceStatus>>;
  lockDevice(): Promise<FamilyControlsResponse<void>>;
  
  // Monitoring
  enableScreenTimeMonitoring(params: {
    userId: string;
    warningThreshold?: number;  // percent
  }): Promise<FamilyControlsResponse<void>>;
  
  // Event Listeners
  addListener(
    event: FamilyControlsEvent,
    callback: (data: any) => void
  ): Subscription;
}

export type FamilyControlsEvent =
  | 'SCREEN_TIME_WARNING'
  | 'SCREEN_TIME_EXCEEDED'
  | 'APP_BLOCKED'
  | 'DOWNTIME_STARTED'
  | 'DEVICE_STATUS_CHANGED'
  | 'AUTHORIZATION_CHANGED';

export interface AuthStatus {
  authorized: boolean;
  familyId: string;
  userRole: 'parent' | 'child' | 'guardian';
  canControlOtherDevices: boolean;
}

export interface DeviceStatus {
  deviceId: string;
  isLocked: boolean;
  screenTimeRemaining: number;
  activeDowntime: boolean;
  blockedApps: string[];
  lastUpdated: number;
}
```

### Call Patterns

#### Pattern 1: Simple Async Call
```typescript
// React Native calling Swift
const remaining = await FamilyControlsModule.getRemainingScreenTime(userId);
```

#### Pattern 2: Promise with Response
```typescript
const response = await FamilyControlsModule.setScreenTimeLimit({
  userId: 'child-123',
  minutes: 120,
  category: 'entertainment'
});

if (response.success) {
  console.log('Limit set successfully');
} else {
  console.error(response.error);
}
```

#### Pattern 3: Event Listener
```typescript
const subscription = FamilyControlsModule.addListener(
  'SCREEN_TIME_WARNING',
  (data: { userId: string; remaining: number }) => {
    console.log(`Warning: ${data.remaining}s remaining`);
  }
);

// Later: unsubscribe
subscription.remove();
```

#### Pattern 4: Authorization Check
```typescript
try {
  const status = await FamilyControlsModule.checkAuthorizationStatus(familyId);
  
  if (status.authorized && status.userRole === 'parent') {
    // Can perform parental control actions
  }
} catch (error) {
  // Handle authorization error
}
```

---

## 5. React Native Hook Patterns

### useScreenTime Hook
```typescript
function useScreenTime(userId: string) {
  const [data, setData] = useState<ScreenTimeData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    FamilyControlsModule.getScreenTimeInfo(userId)
      .then(response => {
        if (response.success) setData(response.data);
      })
      .finally(() => setLoading(false));
  }, [userId]);
  
  return { data, loading };
}
```

### useDeviceStatus Hook
```typescript
function useDeviceStatus(deviceId: string) {
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  
  useEffect(() => {
    // Subscribe to status updates
    const subscription = FamilyControlsModule.addListener(
      'DEVICE_STATUS_CHANGED',
      (newStatus: DeviceStatus) => {
        if (newStatus.deviceId === deviceId) {
          setStatus(newStatus);
        }
      }
    );
    
    return () => subscription.remove();
  }, [deviceId]);
  
  return status;
}
```

### useFamilyControls Hook
```typescript
function useFamilyControls(familyId: string) {
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState<UserRole>('child');
  
  useEffect(() => {
    FamilyControlsModule.checkAuthorizationStatus(familyId)
      .then(status => {
        setAuthorized(status.authorized);
        setRole(status.userRole);
      });
  }, [familyId]);
  
  return {
    authorized,
    role,
    canControl: authorized && role === 'parent',
  };
}
```

---

## 6. Error Handling Strategy

### Error Types

```swift
enum FamilyControlsError: Error {
    // Authorization Errors
    case unauthorized(reason: String)
    case insufficientPermissions
    case userNotFound(userId: String)
    case familyNotFound(familyId: String)
    
    // System Errors
    case familyControlsNotAvailable
    case screenTimeNotAuthorized
    case systemError(description: String)
    
    // Validation Errors
    case invalidUserRole
    case invalidTimeLimit
    case invalidAppBundle
    
    // Device Errors
    case deviceNotSupported
    case operationNotSupported(reason: String)
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;  // 'UNAUTHORIZED', 'SYSTEM_ERROR', etc.
  details?: Record<string, any>;
}
```

---

## 7. Integration Flow Examples

### Flow 1: Parent Sets Screen Time Limit

```
React Native App
    ↓ (1. Call setScreenTimeLimit)
FamilyControlsBridge
    ↓ (2. Route to ScreenTimeManager)
AuthorizationShield
    ↓ (3. Validate: parent, has permission)
ScreenTimeManager
    ↓ (4. Apply limit via OS API)
Family Controls Framework
    ↓ (5. Emit event back)
React Native (App State Update)
```

### Flow 2: Child Requests Additional Time

```
React Native App
    ↓ (1. Call approveAdditionalTime)
FamilyControlsBridge
    ↓ (2. Route to ScreenTimeManager)
AuthorizationShield
    ↓ (3. Validate: is child, feature allowed)
ScreenTimeManager
    ↓ (4. Create approval request)
Event Emitter
    ↓ (5. Notify parents)
React Native (Parent Notified)
```

### Flow 3: Real-Time Monitoring

```
Family Controls OS Framework
    ↓ (1. Screen time update detected)
ScreenTimeManager
    ↓ (2. Compare to limits)
Event Emitter
    ↓ (3. Emit warning/exceeded event)
React Native
    ↓ (4. Display notification/UI update)
User Interface
```

---

## 8. Data Flow Diagrams

### State Management
```
Redux/Context State
    ↓
FamilyControls State Slice
    ├── user: CurrentUser
    ├── family: FamilyInfo
    ├── screenTime: ScreenTimeData[]
    ├── devices: DeviceStatus[]
    ├── authorization: AuthStatus
    └── events: PendingEvent[]
```

### Event Bus

```
Family Controls OS Events
    ↓
FamilyControlsBridge (Filter & Map)
    ↓
Event Emitter (NativeEventEmitter)
    ↓
React Native Listeners
    ↓
Component State Updates
```

---

## 9. Testing Strategy

### Unit Tests (Swift)
- AuthorizationShield validation logic
- Permission checking
- Error handling

### Integration Tests
- Bridge communication
- Event emission
- State synchronization

### E2E Tests
- Full flow from React Native to OS
- Permission requests
- Real device testing

---

## 10. Implementation Phases

### Phase 1: Foundation
- [ ] Create FamilyControlsBridge.swift skeleton
- [ ] Implement AuthorizationShield.swift
- [ ] Define TypeScript interfaces
- [ ] Setup event emitter

### Phase 2: Core Functionality
- [ ] Implement ScreenTimeManager.swift
- [ ] Implement DeviceControlManager.swift
- [ ] Create React Native bridge connections
- [ ] Test basic flows

### Phase 3: Advanced Features
- [ ] Event streaming
- [ ] Real-time monitoring
- [ ] Device state synchronization
- [ ] Error recovery

### Phase 4: Polish & Optimization
- [ ] Performance tuning
- [ ] Memory management
- [ ] Comprehensive error handling
- [ ] Documentation

---

## 11. Key Considerations

✅ **Thread Safety** - All Swift operations must be thread-safe  
✅ **Memory Management** - Prevent leaks from event listeners  
✅ **Error Recovery** - Graceful degradation when features unavailable  
✅ **User Privacy** - Secure handling of family member data  
✅ **iOS Compatibility** - Support iOS 14+  
✅ **Backward Compatibility** - Handle older iOS gracefully  

---

## Summary

This architecture provides:
- Clean separation of concerns
- Flexible authorization system
- Type-safe React Native bridge
- Event-driven updates
- Robust error handling
- Extensible design

Ready to scaffold the Swift modules!
