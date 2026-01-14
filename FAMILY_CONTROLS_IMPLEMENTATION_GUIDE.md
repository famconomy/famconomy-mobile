# Family Controls Bridge - Implementation Guide

## Overview

This guide covers the Family Controls bridge architecture that connects React Native to native iOS family control features. The implementation is split across TypeScript interfaces, Swift modules, and React hooks.

---

## Module Organization

```
FamConomy/
├── mobile/
│   ├── ios/FamilyControls/              # Swift modules
│   │   ├── FamilyControlsBridge.swift   # RN entry point
│   │   ├── AuthorizationShield.swift    # Permission layer
│   │   ├── ScreenTimeManager.swift      # Screen time logic
│   │   ├── DeviceControlManager.swift   # Device controls
│   │   └── FamilyControlsEventEmitter.swift  # Events
│   └── src/
│       ├── api/
│       │   └── FamilyControlsBridge.ts  # TS interface
│       └── hooks/
│           └── useFamilyControls.ts     # React hooks
└── mobile/FAMILY_CONTROLS_ARCHITECTURE.md  # Architecture docs
```

---

## Part 1: Swift Module Overview

### FamilyControlsBridge.swift
Main entry point for React Native communication. Exports all callable methods.

**Key Methods**:
- `requestFamilyControlsAccess()` - Request iOS permissions
- `setScreenTimeLimit()` - Set time limits
- `blockApplication()` - Block apps
- `getScreenTimeInfo()` - Get usage data
- `lockDevice()` - Lock device
- Event emission to React Native

**Pattern**:
```swift
@objc func methodName(
  _ params: NSDictionary,
  resolve: @escaping RCTPromiseResolveBlock,
  reject: @escaping RCTPromiseRejectBlock
) {
  // Async work on background queue
  DispatchQueue.global().async {
    // Do work, call resolve/reject
    resolve(result)
  }
}
```

### AuthorizationShield.swift
Authorization and permission validation layer.

**Key Responsibilities**:
- Validate user roles
- Check system permissions
- Enforce policies
- Cache authorization status
- Provide permission matrix

**Usage in Bridge**:
```swift
try self.authShield.validateParentalAccess(
  userID: userID,
  userRole: role
)
```

### ScreenTimeManager.swift
Screen time monitoring and management.

**Key Methods**:
- `setDailyLimit()` - Set time limits
- `getScreenTimeInfo()` - Get current usage
- `approveAdditionalTime()` - Grant extra time
- `enableMonitoring()` - Start warnings
- `getRemainingTime()` - Get remaining seconds

**Data Structure**:
```swift
struct ScreenTimeInfo {
  let userId: String
  let remaining: Int    // seconds
  let limit: Int        // seconds
  let used: Int         // seconds
  let percentage: Float
  let lastUpdated: Date
}
```

### DeviceControlManager.swift
Device-level controls and app restrictions.

**Key Methods**:
- `blockApplication()` - Block app by bundle ID
- `unblockApplication()` - Unblock app
- `getBlockedApplications()` - List blocked apps
- `lockDevice()` - Lock device
- `getDeviceStatus()` - Get current status

**Supported Controls**:
- App blocking
- Device locking
- Content restrictions
- Siri restrictions
- Web content filtering

### FamilyControlsEventEmitter.swift
Real-time event communication to React Native.

**Event Types**:
```swift
enum FamilyControlsEventType: String {
  // Screen Time Events
  case screenTimeWarning
  case screenTimeExceeded
  case downtimeStarted
  
  // Device Events
  case appBlocked
  case appUnblocked
  case deviceLocked
  
  // Authorization Events
  case authorizationChanged
  case permissionRequired
  
  // Error Events
  case errorOccurred
}
```

**Sending Events**:
```swift
func sendScreenTimeWarning(userId: String, remaining: Int) {
  sendEvent(
    withName: FamilyControlsEventType.screenTimeWarning.rawValue,
    body: ["userId": userId, "remaining": remaining]
  )
}
```

---

## Part 2: TypeScript Interface

### FamilyControlsBridge.ts
TypeScript wrapper for the native module.

**Example Usage**:
```typescript
import { FamilyControlsBridge } from './api/FamilyControlsBridge';

// Simple call
await FamilyControlsBridge.lockDevice();

// Call with parameters
await FamilyControlsBridge.setScreenTimeLimit({
  userId: 'child-123',
  minutes: 120,
  category: 'entertainment'
});

// Get data
const info = await FamilyControlsBridge.getScreenTimeInfo(userId);
if (info.success) {
  console.log(`Remaining: ${info.data?.remaining}s`);
}
```

**Response Pattern**:
```typescript
interface FamilyControlsResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
```

---

## Part 3: React Hooks

### useScreenTime Hook
Get screen time information for a user.

```typescript
const { data, loading, error, refreshScreenTime } = useScreenTime(userId);

if (loading) return <Text>Loading...</Text>;
if (error) return <Text>Error: {error}</Text>;

return (
  <View>
    <Text>Remaining: {data?.remaining}s</Text>
    <Text>Used: {data?.used}s</Text>
    <Text>Percentage: {data?.percentage}%</Text>
    <Button title="Refresh" onPress={refreshScreenTime} />
  </View>
);
```

### useDeviceStatus Hook
Monitor device status in real-time.

```typescript
const { status, loading, error } = useDeviceStatus(deviceId);

return (
  <View>
    <Text>Device Locked: {status?.isLocked ? 'Yes' : 'No'}</Text>
    <Text>Blocked Apps: {status?.blockedApps.length}</Text>
  </View>
);
```

### useFamilyControls Hook
Check authorization and permissions.

```typescript
const { authorized, userRole, canControl } = useFamilyControls(familyId);

if (!authorized) {
  return <Text>Not authorized</Text>;
}

if (canControl) {
  return <ParentalControlsPanel />;
} else {
  return <ChildViewPanel />;
}
```

### useScreenTimeWarnings Hook
Listen for screen time warnings.

```typescript
const { warnings, clearWarnings } = useScreenTimeWarnings(userId);

useEffect(() => {
  if (warnings.length > 0) {
    const latest = warnings[warnings.length - 1];
    Alert.alert(
      'Screen Time Warning',
      `${latest.percentage}% of daily limit used`
    );
  }
}, [warnings]);

return (
  <Button title="Clear Warnings" onPress={clearWarnings} />
);
```

### useBlockedApps Hook
Manage blocked applications.

```typescript
const { blockedApps, blockApp, unblockApp } = useBlockedApps();

return (
  <FlatList
    data={blockedApps}
    keyExtractor={(id) => id}
    renderItem={({ item: bundleId }) => (
      <View>
        <Text>{bundleId}</Text>
        <Button
          title="Unblock"
          onPress={() => unblockApp(bundleId)}
        />
      </View>
    )}
  />
);
```

### useScreenTimeControl Hook
Control and manage screen time limits.

```typescript
const {
  setScreenTimeLimit,
  approveAdditionalTime,
  isLoading
} = useScreenTimeControl();

const handleSetLimit = async () => {
  const success = await setScreenTimeLimit(userId, 120);
  if (success) {
    Alert.alert('Success', 'Limit set');
  }
};
```

---

## Part 4: Integration Examples

### Example 1: Parent Dashboard

```typescript
// ParentDashboard.tsx
import { useFamilyControls, useScreenTime } from '../hooks/useFamilyControls';

export function ParentDashboard() {
  const { authorized, canControl } = useFamilyControls(familyId);
  const { data: screenTime } = useScreenTime(childId);

  if (!canControl) {
    return <Text>No access</Text>;
  }

  return (
    <ScrollView>
      <Text>Child Screen Time</Text>
      <ProgressBar
        value={screenTime?.percentage ?? 0}
        max={100}
      />
      <Text>{screenTime?.remaining}s remaining</Text>
      
      <Button
        title="Set 2hr Limit"
        onPress={() => setLimit(120)}
      />
      <Button
        title="Approve 30 min"
        onPress={() => approve(30)}
      />
      <Button
        title="Lock Device"
        onPress={() => lockDevice()}
      />
    </ScrollView>
  );
}
```

### Example 2: Real-time Status Monitor

```typescript
// DeviceMonitor.tsx
import {
  useDeviceStatus,
  useFamilyControlsErrors
} from '../hooks/useFamilyControls';

export function DeviceMonitor({ deviceId }: { deviceId: string }) {
  const { status } = useDeviceStatus(deviceId);
  const { errors, clearErrors } = useFamilyControlsErrors();

  if (errors.length > 0) {
    return (
      <View>
        <Text style={styles.error}>Error: {errors[0].message}</Text>
        <Button title="Dismiss" onPress={() => clearErrors()} />
      </View>
    );
  }

  return (
    <View>
      <StatusIndicator
        locked={status?.isLocked}
        activeDowntime={status?.activeDowntime}
        blockedCount={status?.blockedApps.length}
      />
    </View>
  );
}
```

### Example 3: Warning System

```typescript
// ScreenTimeWarnings.tsx
import { useScreenTimeWarnings } from '../hooks/useFamilyControls';

export function ScreenTimeWarnings({ userId }: { userId: string }) {
  const { warnings, clearWarnings } = useScreenTimeWarnings(userId);

  if (warnings.length === 0) return null;

  const latest = warnings[warnings.length - 1];

  return (
    <AlertBox
      severity={latest.percentage > 90 ? 'critical' : 'warning'}
      title="Screen Time Alert"
      message={`${latest.percentage}% of daily limit used`}
      onDismiss={() => clearWarnings()}
    />
  );
}
```

---

## Part 5: Event Flow Examples

### Flow 1: Setting Screen Time Limit

```
React Component
  ↓ (Call setScreenTimeLimit)
useScreenTimeControl Hook
  ↓ (Call FamilyControlsBridge.setScreenTimeLimit)
React Native Bridge
  ↓ (Call FamilyControlsBridge.setScreenTimeLimit)
Swift Bridge
  ↓ (Validate with AuthorizationShield)
ScreenTimeManager
  ↓ (Apply limit via iOS)
Family Controls Framework
  ↓ (Emit event back)
FamilyControlsEventEmitter
  ↓ (Send to React Native)
NativeEventEmitter
  ↓ (Update hook state)
useScreenTimeControl Hook
  ↓ (UI automatically updates)
Component Re-renders
```

### Flow 2: Real-time Warning

```
iOS detects screen time at 80% of limit
  ↓
Family Controls Framework
  ↓
FamilyControlsEventEmitter.sendScreenTimeWarning()
  ↓
NativeEventEmitter
  ↓
useScreenTimeWarnings Hook listener triggered
  ↓
warnings state updated
  ↓
Component re-renders with warning
  ↓
User sees alert
```

---

## Part 6: Error Handling

### Common Errors

```typescript
try {
  await FamilyControlsBridge.setScreenTimeLimit({
    userId: 'child-123',
    minutes: 120
  });
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // User not authorized - show permission request
  } else if (error.code === 'INVALID_PARAMETERS') {
    // Invalid parameters - validate input
  } else if (error.code === 'SYSTEM_ERROR') {
    // System error - show error message
  }
}
```

### Using Error Hook

```typescript
const { errors, clearErrors } = useFamilyControlsErrors();

useEffect(() => {
  if (errors.length > 0) {
    const error = errors[errors.length - 1];
    Toast.show({
      type: 'error',
      text1: error.code,
      text2: error.message
    });
  }
}, [errors]);
```

---

## Part 7: Testing

### Unit Tests (Swift)

```swift
func testAuthorizationValidation() {
  let shield = AuthorizationShield()
  
  // Test parent can perform action
  XCTAssertTrue(
    shield.canPerformAction(role: .parent, action: .setScreenTimeLimit)
  )
  
  // Test child cannot perform action
  XCTAssertFalse(
    shield.canPerformAction(role: .child, action: .setScreenTimeLimit)
  )
}

func testScreenTimeLimitValidation() {
  let manager = ScreenTimeManager()
  
  // Valid limit
  XCTAssertNoThrow(
    try manager.setDailyLimit(userID: "user1", minutes: 120)
  )
  
  // Invalid limit
  XCTAssertThrow(
    try manager.setDailyLimit(userID: "user1", minutes: 0)
  )
}
```

### Integration Tests (React Native)

```typescript
describe('Family Controls Bridge', () => {
  it('should set screen time limit', async () => {
    const response = await FamilyControlsBridge.setScreenTimeLimit({
      userId: 'test-user',
      minutes: 120
    });
    
    expect(response.success).toBe(true);
  });

  it('should emit screen time warning event', (done) => {
    const subscription = FamilyControlsBridge.onScreenTimeWarning(
      (data) => {
        expect(data.userId).toBe('test-user');
        expect(data.percentage).toBeGreaterThan(80);
        subscription.remove();
        done();
      }
    );
  });
});
```

---

## Part 8: Implementation Checklist

### Phase 1: Foundation ✅
- [x] Create FamilyControlsBridge.swift
- [x] Implement AuthorizationShield.swift
- [x] Create ScreenTimeManager.swift
- [x] Create DeviceControlManager.swift
- [x] Create FamilyControlsEventEmitter.swift
- [x] Create TypeScript interface
- [x] Create React hooks

### Phase 2: Next Steps
- [ ] Register Swift module in Xcode
- [ ] Add Family Controls entitlements
- [ ] Implement OS framework integration
- [ ] Add unit tests
- [ ] Test with real devices

### Phase 3: Advanced Features
- [ ] Downtime scheduling
- [ ] Content filtering
- [ ] Purchase restrictions
- [ ] Communication limits
- [ ] AirDrop restrictions

---

## Part 9: Best Practices

✅ **Always check availability** - iOS only feature
```typescript
if (FamilyControlsBridge.isAvailable()) {
  // Use the bridge
}
```

✅ **Handle promises properly**
```typescript
try {
  await FamilyControlsBridge.setScreenTimeLimit({ ... });
} catch (error) {
  // Handle error
}
```

✅ **Clean up subscriptions**
```typescript
const subscription = FamilyControlsBridge.onScreenTimeWarning(...);
// Later...
subscription.remove();
```

✅ **Use hooks for state management**
```typescript
// Not:
FamilyControlsBridge.getScreenTimeInfo(userId).then(...);

// Yes:
const { data } = useScreenTime(userId);
```

✅ **Cache authorization status**
```typescript
const { authorized } = useFamilyControls(familyId);
// AuthorizationShield caches this internally
```

---

## Documentation Links

- **Architecture**: `FAMILY_CONTROLS_ARCHITECTURE.md`
- **Swift Files**: `mobile/ios/FamilyControls/`
- **TypeScript**: `mobile/src/api/FamilyControlsBridge.ts`
- **Hooks**: `mobile/src/hooks/useFamilyControls.ts`

---

**Status**: ✅ Ready for implementation  
**Last Updated**: October 22, 2025
