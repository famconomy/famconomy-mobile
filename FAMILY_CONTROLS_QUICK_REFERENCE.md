# Family Controls Bridge - Quick Reference

## 🚀 Quick Start

### Check Availability
```typescript
if (FamilyControlsBridge.isAvailable()) {
  // iOS only
}
```

### Get Screen Time
```typescript
const { data } = useScreenTime(userId);
// Returns: { remaining, limit, used, percentage }
```

### Set Screen Time Limit
```typescript
await FamilyControlsBridge.setScreenTimeLimit({
  userId: 'child-123',
  minutes: 120
});
```

### Block App
```typescript
await FamilyControlsBridge.blockApplication('com.example.app');
```

### Listen to Events
```typescript
const sub = FamilyControlsBridge.onScreenTimeWarning((data) => {
  console.log(`${data.percentage}% limit reached`);
});
sub.remove(); // cleanup
```

---

## 📚 Hooks Reference

### useScreenTime(userId)
```typescript
const { data, loading, error, refreshScreenTime } = useScreenTime(userId);
```

### useDeviceStatus(deviceId)
```typescript
const { status, loading, error } = useDeviceStatus(deviceId);
```

### useFamilyControls(familyId)
```typescript
const { authorized, userRole, canControl } = useFamilyControls(familyId);
```

### useScreenTimeWarnings(userId)
```typescript
const { warnings, clearWarnings } = useScreenTimeWarnings(userId);
```

### useBlockedApps()
```typescript
const { blockedApps, blockApp, unblockApp } = useBlockedApps();
```

### useScreenTimeControl()
```typescript
const { setScreenTimeLimit, approveAdditionalTime } = useScreenTimeControl();
```

---

## 🎯 Common Tasks

### Check If Parent
```typescript
const { canControl } = useFamilyControls(familyId);
if (canControl) {
  // Show parental controls
}
```

### Get Child's Screen Time
```typescript
const { data } = useScreenTime(childId);
console.log(data?.remaining); // seconds
console.log(data?.percentage); // 0-100
```

### Monitor Real-time Status
```typescript
const { status } = useDeviceStatus(deviceId);
console.log(status?.isLocked);
console.log(status?.blockedApps);
```

### Set Time Limit & Notify
```typescript
const { setScreenTimeLimit } = useScreenTimeControl();
await setScreenTimeLimit(childId, 120);
// Event: SCREEN_TIME_LIMIT_SET
```

### Block App
```typescript
const { blockApp } = useBlockedApps();
await blockApp('com.snapchat.android');
// Event: APP_BLOCKED
```

### Listen for Warnings
```typescript
FamilyControlsBridge.onScreenTimeWarning(({ percentage, remaining }) => {
  if (percentage >= 80) {
    Alert.alert('Screen Time', `${remaining}s left today`);
  }
});
```

---

## 🔑 Key Types

```typescript
// Screen Time Data
{
  userId: string
  remaining: number      // seconds
  limit: number         // seconds
  used: number          // seconds
  percentage: number    // 0-100
}

// Authorization Status
{
  authorized: boolean
  userRole: 'parent' | 'child' | 'guardian' | 'admin'
  canControl: boolean
}

// Device Status
{
  deviceId: string
  isLocked: boolean
  screenTimeRemaining: number
  activeDowntime: boolean
  blockedApps: string[]
}
```

---

## ⚠️ Error Handling

```typescript
try {
  await FamilyControlsBridge.setScreenTimeLimit({...});
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // Show permission request
  } else if (error.code === 'INVALID_PARAMETERS') {
    // Validate input
  }
}
```

Or use the hook:
```typescript
const { errors, clearErrors } = useFamilyControlsErrors();
if (errors.length > 0) {
  console.error(errors[0].message);
}
```

---

## 📡 All Events

- `SCREEN_TIME_WARNING` - Approaching limit
- `SCREEN_TIME_EXCEEDED` - Limit exceeded
- `APP_BLOCKED` - App was blocked
- `APP_UNBLOCKED` - App unblocked
- `DEVICE_LOCKED` - Device locked
- `DEVICE_UNLOCKED` - Device unlocked
- `AUTHORIZATION_CHANGED` - Permission changed
- `ERROR_OCCURRED` - Error event

---

## 🧹 Cleanup Pattern

```typescript
useEffect(() => {
  const sub = FamilyControlsBridge.onEvent(handler);
  return () => sub.remove(); // Always cleanup
}, []);
```

---

## 🗂️ File Locations

**TypeScript Interface**: `mobile/src/api/FamilyControlsBridge.ts`  
**React Hooks**: `mobile/src/hooks/useFamilyControls.ts`  
**Swift Modules**: `mobile/ios/FamilyControls/`  
**Architecture**: `mobile/FAMILY_CONTROLS_ARCHITECTURE.md`  
**Guide**: `mobile/FAMILY_CONTROLS_IMPLEMENTATION_GUIDE.md`

---

## ⚡ Performance Tips

✅ Use hooks instead of direct calls  
✅ Memoize callbacks with useCallback  
✅ Always cleanup subscriptions  
✅ Use filtering for large lists  
✅ Batch updates when possible  

---

## 🔐 Permission Matrix

| Action | Parent | Child | Guardian |
|--------|--------|-------|----------|
| View Screen Time | ✅ | ✅ | ✅ |
| Set Limits | ✅ | ❌ | ✅ |
| Block Apps | ✅ | ❌ | ✅ |
| Lock Device | ✅ | ❌ | ✅ |
| Approve Extra Time | ✅ | ❌ | ✅ |

---

**More Info**: See `FAMILY_CONTROLS_IMPLEMENTATION_GUIDE.md`
