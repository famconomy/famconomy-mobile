# Family Controls Native Module - Complete API Specification

## Table of Contents
1. [Overview](#overview)
2. [Core API Methods](#core-api-methods)
3. [Data Structures](#data-structures)
4. [Authorization Methods](#authorization-methods)
5. [Schedule Methods](#schedule-methods)
6. [Status & Polling](#status--polling)
7. [Error Handling](#error-handling)
8. [Event Emissions](#event-emissions)
9. [Implementation Notes](#implementation-notes)

---

## Overview

This specification defines the native module bridge between React Native and iOS Family Controls framework. The bridge is implemented in Swift via `RCTBridgeModule` and exposed to React Native as `FamilyControlsNativeModule`.

### Key Principles
- **Type-Safe**: All data structures are strongly typed
- **Promise-Based**: Async operations use JavaScript promises
- **Event-Driven**: Real-time updates via NativeEventEmitter
- **Error-Resilient**: Comprehensive error handling with recovery strategies
- **Stateful**: Maintains authorization and session state

---

## Core API Methods

All methods are called from React Native via:
```typescript
NativeModules.FamilyControlsNativeModule.methodName(params)
```

### Module Lifecycle

#### 1. initialize(config: InitConfig) → Promise<InitializationResult>

Initializes the native module with user context and configuration.

**Parameters:**
```swift
struct InitConfig {
  let userId: String                    // UUID of the user
  let familyId: Int                     // Family ID from backend
  let userRole: String                  // "admin" | "parent" | "guardian" | "child" | "none"
  let apiBaseUrl: String                // Backend API URL
  let apiToken: String                  // JWT auth token
  let enablePersistence: Bool           // Cache data locally (default: true)
  let enablePolling: Bool               // Enable automatic status polling (default: true)
  let pollingIntervalSeconds: Int       // Polling interval (default: 300)
}
```

**Returns:**
```swift
struct InitializationResult {
  let success: Bool
  let moduleVersion: String             // e.g., "1.0.0"
  let osVersion: String                 // iOS version
  let frameworksAvailable: [String]     // ["ScreenTime", "FamilyControls"]
  let sessionId: String                 // Unique session identifier
  let message: String?
  let timestamp: TimeInterval
}
```

**Error Codes:**
- `INIT_001`: Missing required parameters
- `INIT_002`: Framework availability check failed
- `INIT_003`: Invalid user role
- `INIT_004`: API connectivity failed

---

#### 2. authorize(request: AuthorizationRequest) → Promise<AuthorizationResult>

Requests authorization to access family controls on behalf of a user.

**Parameters:**
```swift
struct AuthorizationRequest {
  let targetUserId: String              // Who is this authorization for?
  let scope: [String]                   // ["screenTime", "deviceControl", "appBlock"]
  let reason: String?                   // Explanation for user
  let requesterRole: String             // Role of person requesting auth
  let requestExpiresIn: Int?            // Minutes until request expires (optional)
}
```

**Returns:**
```swift
struct AuthorizationResult {
  let authorized: Bool
  let authorizationToken: String?       // Token to persist in backend
  let grantedScopes: [String]           // Actual scopes granted
  let expiresAt: TimeInterval?          // UNIX timestamp
  let requiresUserConsent: Bool         // User action needed?
  let consentUrl: String?               // Deep link if user action needed
  let sessionId: String
  let timestamp: TimeInterval
}
```

**Error Codes:**
- `AUTH_001`: User not in family
- `AUTH_002`: Insufficient permissions
- `AUTH_003`: Authorization already revoked
- `AUTH_004`: Family Controls disabled on device
- `AUTH_005`: User denied authorization request

---

#### 3. revokeAuthorization(token: String) → Promise<RevocationResult>

Revokes previously granted authorization.

**Parameters:**
```swift
struct RevocationRequest {
  let authorizationToken: String        // Token to revoke
  let reason: String?                   // Optional reason
  let notifyUser: Bool                  // Send notification? (default: true)
}
```

**Returns:**
```swift
struct RevocationResult {
  let success: Bool
  let previouslyAuthorized: Bool
  let timestamp: TimeInterval
  let message: String?
}
```

**Error Codes:**
- `REVOKE_001`: Token not found
- `REVOKE_002`: Token already expired
- `REVOKE_003`: Insufficient permissions to revoke

---

## Authorization Methods

### 4. checkAuthorization(token: String) → Promise<AuthorizationStatus>

Checks the status of an authorization token.

**Parameters:**
```swift
struct AuthorizationCheckRequest {
  let authorizationToken: String
  let includeDetails: Bool              // Include full details (default: true)
}
```

**Returns:**
```swift
struct AuthorizationStatus {
  let authorized: Bool
  let token: String
  let grantedScopes: [String]
  let expiresAt: TimeInterval
  let isExpired: Bool
  let daysUntilExpiration: Int?
  let requiresRenewal: Bool
  let lastUsedAt: TimeInterval?
  let usageCount: Int
  let details: AuthorizationDetails?
  let timestamp: TimeInterval
}

struct AuthorizationDetails {
  let targetUserId: String
  let grantedByUserId: String
  let grantedAt: TimeInterval
  let reason: String?
  let metadata: [String: String]?
}
```

**Error Codes:**
- `CHECK_001`: Token not found
- `CHECK_002`: Invalid token format
- `CHECK_003`: Token signature invalid

---

### 5. requestUserConsent(request: ConsentRequest) → Promise<ConsentResult>

Requests explicit user consent for sensitive operations.

**Parameters:**
```swift
struct ConsentRequest {
  let operation: String                 // "BLOCK_DEVICE" | "LOCK_DEVICE" | "SET_SCHEDULE"
  let targetUserId: String
  let description: String               // What action requires consent
  let severity: String                  // "low" | "medium" | "high"
  let timeoutSeconds: Int?              // How long to wait (default: 300)
}
```

**Returns:**
```swift
struct ConsentResult {
  let consentGiven: Bool
  let consentId: String
  let operation: String
  let userId: String
  let consentedAt: TimeInterval
  let signature: String?                // Cryptographic proof for backend
  let metadata: [String: Any]?
}
```

**Error Codes:**
- `CONSENT_001`: User denied consent
- `CONSENT_002`: Consent request timed out
- `CONSENT_003`: Invalid operation type

---

## Schedule Methods

### 6. setScreenTimeSchedule(schedule: ScreenTimeSchedule) → Promise<ScheduleResult>

Sets or updates screen time limits and schedules.

**Parameters:**
```swift
struct ScreenTimeSchedule {
  let targetUserId: String
  let dailyLimitMinutes: Int?           // Total daily limit
  let startTime: String?                // HH:mm format, nil = immediate
  let endTime: String?                  // HH:mm format, nil = no end
  let appliedDays: [String]?            // ["MON", "TUE", ...], nil = all days
  let categoryLimits: [CategoryLimit]?  // Per-app-category limits
  let allowOverrides: Bool              // Can child request more time
  let overrideApproverId: String?       // Who approves overrides
  let metadata: [String: String]?
}

struct CategoryLimit {
  let category: String                  // "Social", "Gaming", "Productivity", etc.
  let dailyMinutes: Int
  let weeklyMinutes: Int?
}
```

**Returns:**
```swift
struct ScheduleResult {
  let success: Bool
  let scheduleId: String
  let appliedAt: TimeInterval
  let status: String                    // "PENDING" | "ACTIVE" | "SCHEDULED"
  let nextChangeTime: TimeInterval?
  let affectedDevices: Int
  let message: String?
  let timestamp: TimeInterval
}
```

**Error Codes:**
- `SCHEDULE_001`: Invalid time range
- `SCHEDULE_002`: Schedule conflicts with existing
- `SCHEDULE_003`: User not enrolled in Family
- `SCHEDULE_004`: Device not supported

---

### 7. updateSchedule(scheduleId: String, updates: ScheduleUpdate) → Promise<UpdateResult>

Updates an existing schedule.

**Parameters:**
```swift
struct ScheduleUpdate {
  let scheduleId: String
  let dailyLimitMinutes: Int?
  let startTime: String?
  let endTime: String?
  let categoryLimits: [CategoryLimit]?
  let allowOverrides: Bool?
  let reason: String?                   // Why this change
}
```

**Returns:**
```swift
struct UpdateResult {
  let success: Bool
  let scheduleId: String
  let previousValues: [String: Any]?
  let newValues: [String: Any]
  let updatedAt: TimeInterval
  let affectedInstances: Int
  let message: String?
}
```

**Error Codes:**
- `UPDATE_001`: Schedule not found
- `UPDATE_002`: Conflicting update
- `UPDATE_003`: Permission denied

---

### 8. getSchedules(filter: ScheduleFilter) → Promise<[ScreenTimeSchedule]>

Retrieves schedules matching filter criteria.

**Parameters:**
```swift
struct ScheduleFilter {
  let targetUserId: String?             // nil = all accessible users
  let status: String?                   // "ACTIVE" | "PENDING" | "INACTIVE"
  let includeHistory: Bool              // Include past schedules
  let limit: Int?                       // Max results (default: 50)
  let offset: Int?                      // Pagination offset
}
```

**Returns:**
```swift
struct ScheduleListResult {
  let schedules: [ScheduleWithStatus]
  let total: Int
  let hasMore: Bool
  let timestamp: TimeInterval
}

struct ScheduleWithStatus {
  let scheduleId: String
  let targetUserId: String
  let dailyLimitMinutes: Int?
  let currentUsageMinutes: Int
  let remainingMinutes: Int?
  let percentageUsed: Double
  let status: String
  let appliedAt: TimeInterval
  let expiresAt: TimeInterval?
  let nextResetTime: TimeInterval?
}
```

---

### 9. deleteSchedule(scheduleId: String) → Promise<DeletionResult>

Removes a schedule.

**Parameters:**
```swift
struct DeletionRequest {
  let scheduleId: String
  let reason: String?
  let notifyUser: Bool                  // Send notification
}
```

**Returns:**
```swift
struct DeletionResult {
  let success: Bool
  let deletedAt: TimeInterval
  let affectedDevices: Int
  let restoreToken: String?             // Can undo within 24h
  let message: String?
}
```

---

## Status & Polling

### 10. getScreenTimeStatus(userId: String) → Promise<ScreenTimeStatus>

Gets current screen time usage status for a user.

**Parameters:**
```swift
struct StatusRequest {
  let userId: String
  let includeHistory: Bool              // Include last 7 days
  let includePrediction: Bool           // ML-based time usage prediction
}
```

**Returns:**
```swift
struct ScreenTimeStatus {
  let userId: String
  let today: DailyStats
  let thisWeek: WeeklyStats
  let thisMonth: MonthlyStats
  let limits: ScreenTimeLimits?
  let warnings: [WarningInfo]?
  let prediction: UsagePrediction?
  let lastUpdated: TimeInterval
  let timestamp: TimeInterval
}

struct DailyStats {
  let totalMinutesUsed: Int
  let limitMinutes: Int?
  let percentageUsed: Double
  let categoryBreakdown: [String: Int]   // Category -> minutes
  let appBreakdown: [String: Int]?       // App bundle ID -> minutes
  let lastActiveTime: TimeInterval?
}

struct WeeklyStats {
  let totalMinutesUsed: Int
  let dailyAverage: Int
  let highestDay: (day: String, minutes: Int)?
  let lowestDay: (day: String, minutes: Int)?
  let trendPercentage: Double           // % change from prev week
}

struct MonthlyStats {
  let totalMinutesUsed: Int
  let dailyAverage: Int
  let weeklyAverage: Int
}

struct ScreenTimeLimits {
  let dailyMinutes: Int
  let appliedDays: [String]
  let startTime: String?
  let endTime: String?
}

struct WarningInfo {
  let type: String                      // "THRESHOLD_80" | "LIMIT_REACHED" | "SCHEDULE_START"
  let severity: String                  // "low" | "medium" | "high"
  let message: String
  let suggestedAction: String?
  let timestamp: TimeInterval
}

struct UsagePrediction {
  let predictedTotalMinutes: Int        // Predicted daily total
  let confidence: Double                // 0.0-1.0
  let overtimeMinutes: Int?
  let estimatedLimitHitTime: String?    // HH:mm format
}
```

---

### 11. startPolling(options: PollingOptions) → Promise<PollingResult>

Initiates automatic polling for status updates.

**Parameters:**
```swift
struct PollingOptions {
  let intervalSeconds: Int              // 60-3600 (default: 300)
  let userIds: [String]?                // nil = current user
  let includeEvents: Bool               // Emit events for changes
  let backoffStrategy: String?          // "exponential" | "linear" | "fixed"
  let maxAttempts: Int?                 // Stop after N failures
}
```

**Returns:**
```swift
struct PollingResult {
  let success: Bool
  let pollingId: String
  let startedAt: TimeInterval
  let nextPollAt: TimeInterval
  let message: String?
}
```

**Events Emitted:**
- `POLLING_STARTED`: Polling session started
- `POLLING_UPDATE`: New status received
- `POLLING_ERROR`: Error during polling
- `POLLING_STOPPED`: Polling session ended

---

### 12. stopPolling(pollingId: String) → Promise<StopResult>

Stops an active polling session.

**Returns:**
```swift
struct StopResult {
  let success: Bool
  let stoppedAt: TimeInterval
  let totalUpdates: Int
  let totalErrors: Int
  let totalDuration: Double
}
```

---

### 13. getDeviceStatus() → Promise<DeviceStatus>

Gets current device control status.

**Returns:**
```swift
struct DeviceStatus {
  let deviceId: String
  let deviceName: String
  let osVersion: String
  let isLocked: Bool
  let blockedApps: [AppBlockStatus]
  let contentRestrictions: ContentRestrictionStatus
  let lastModifiedAt: TimeInterval
  let timestamp: TimeInterval
}

struct AppBlockStatus {
  let bundleId: String
  let appName: String
  let isBlocked: Bool
  let blockedUntil: TimeInterval?
  let reason: String?
}

struct ContentRestrictionStatus {
  let webContentRestricted: Bool
  let explicitContent: Bool
  let purchasesRestricted: Bool
  let siriRestricted: Bool
}
```

---

## Error Handling

### Error Response Structure

All failed promises reject with a standard error object:

```swift
struct FamilyControlsError: Error {
  let code: String                      // Error code (e.g., "AUTH_002")
  let message: String                   // Human-readable message
  let domain: String                    // "Authorization" | "Schedule" | "Status" | "Network"
  let statusCode: Int?                  // HTTP status if network error
  let underlyingError: String?          // Original error details
  let retryable: Bool                   // Can this be retried?
  let retryAfterSeconds: Int?           // Suggested wait time
  let userFriendlyMessage: String       // For UI display
  let timestamp: TimeInterval
}
```

### Error Categories & Codes

#### Authorization Errors (AUTH_xxx)
- `AUTH_001`: User not in family
- `AUTH_002`: Insufficient permissions
- `AUTH_003`: Authorization already revoked
- `AUTH_004`: Family Controls disabled on device
- `AUTH_005`: User denied authorization request
- `AUTH_006`: Device not eligible for Family Sharing
- `AUTH_007`: User account restricted

#### Schedule Errors (SCHEDULE_xxx)
- `SCHEDULE_001`: Invalid time range
- `SCHEDULE_002`: Schedule conflicts with existing
- `SCHEDULE_003`: User not enrolled in Family
- `SCHEDULE_004`: Device not supported
- `SCHEDULE_005`: Invalid category
- `SCHEDULE_006`: Time range already locked by higher authority

#### Status Errors (STATUS_xxx)
- `STATUS_001`: User data not available
- `STATUS_002`: Device not reporting data
- `STATUS_003`: Historical data unavailable
- `STATUS_004`: Status stale (older than 1 hour)

#### Network Errors (NET_xxx)
- `NET_001`: No internet connection
- `NET_002`: Request timeout
- `NET_003`: Server unreachable
- `NET_004`: Invalid response format

#### Validation Errors (VAL_xxx)
- `VAL_001`: Missing required parameter
- `VAL_002`: Invalid parameter type
- `VAL_003`: Invalid parameter format
- `VAL_004`: Parameter out of range

#### System Errors (SYS_xxx)
- `SYS_001`: Insufficient permissions
- `SYS_002`: Device not compatible
- `SYS_003`: iOS version too old
- `SYS_004`: Not enrolled in Family Sharing

### Error Recovery Strategies

```typescript
// Automatic retry with exponential backoff
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

if (error.retryable && error.statusCode !== 401) {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await retry(operation, RETRY_DELAYS[i]);
    } catch (e) {
      if (i === MAX_RETRIES - 1) throw e;
    }
  }
}

// Handle authorization refresh
if (error.code === 'AUTH_003') {
  await FamilyControlsBridge.authorize(renewalRequest);
  return await operation(); // Retry original
}

// Handle network issues
if (error.code === 'NET_001') {
  // Use cached data if available
  return getCachedStatus();
}
```

---

## Event Emissions

### Event System

The module emits real-time events via NativeEventEmitter:

```typescript
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(
  NativeModules.FamilyControlsNativeModule
);

eventEmitter.addListener('AUTHORIZATION_GRANTED', (data) => {
  // Handle event
});
```

### Event Types

#### 1. AUTHORIZATION_GRANTED
```swift
struct AuthorizationGrantedEvent {
  let authorizationToken: String
  let grantedByUserId: String
  let targetUserId: String
  let grantedScopes: [String]
  let expiresAt: TimeInterval
  let timestamp: TimeInterval
}
```

#### 2. AUTHORIZATION_REVOKED
```swift
struct AuthorizationRevokedEvent {
  let authorizationToken: String
  let revokedByUserId: String
  let revokedAt: TimeInterval
  let reason: String?
  let timestamp: TimeInterval
}
```

#### 3. AUTHORIZATION_EXPIRED
```swift
struct AuthorizationExpiredEvent {
  let authorizationToken: String
  let expiredAt: TimeInterval
  let renewalRequired: Bool
  let timestamp: TimeInterval
}
```

#### 4. SCREEN_TIME_WARNING
```swift
struct ScreenTimeWarningEvent {
  let userId: String
  let warningType: String              // "THRESHOLD_20" | "THRESHOLD_50" | "THRESHOLD_80" | "LIMIT_REACHED"
  let remainingMinutes: Int
  let usagePercentage: Int             // 0-100
  let suggestedAction: String?
  let timestamp: TimeInterval
}
```

#### 5. SCHEDULE_ACTIVATED
```swift
struct ScheduleActivatedEvent {
  let scheduleId: String
  let targetUserId: String
  let type: String                     // "TIME_LIMIT" | "DOWNTIME" | "BREAK"
  let details: [String: Any]
  let timestamp: TimeInterval
}
```

#### 6. DEVICE_LOCKED
```swift
struct DeviceLockedEvent {
  let deviceId: String
  let lockReason: String               // "LIMIT_REACHED" | "MANUAL" | "SCHEDULE"
  let unlockAt: TimeInterval?
  let timestamp: TimeInterval
}
```

#### 7. APP_BLOCKED
```swift
struct AppBlockedEvent {
  let bundleId: String
  let appName: String
  let blockReason: String
  let blockedUntil: TimeInterval?
  let timestamp: TimeInterval
}
```

#### 8. POLLING_ERROR
```swift
struct PollingErrorEvent {
  let pollingId: String
  let error: String
  let attempt: Int
  let nextRetryAt: TimeInterval?
  let timestamp: TimeInterval
}
```

#### 9. POLLING_RECOVERED
```swift
struct PollingRecoveredEvent {
  let pollingId: String
  let recoveredAt: TimeInterval
  let missedUpdates: Int
  let timestamp: TimeInterval
}
```

#### 10. MODULE_ERROR
```swift
struct ModuleErrorEvent {
  let errorCode: String
  let message: String
  let severity: String                 // "warning" | "error" | "critical"
  let timestamp: TimeInterval
}
```

---

## Implementation Notes

### Thread Safety
All methods are executed on Swift's main thread. JavaScript callbacks are marshalled correctly by React Native.

### Memory Management
- Authorization tokens are stored securely in Keychain
- Large data structures are paginated (default 50 items)
- Event listeners are weakly referenced to prevent leaks

### Performance Considerations
- Polling uses adaptive intervals (backoff on failure)
- Status queries are cached for 5 minutes
- Events are debounced to prevent flooding
- Batch updates when possible

### Caching Strategy
```swift
Cache Level 1: Memory (5 minutes)
Cache Level 2: Disk (1 day)
Cache Level 3: Backend API (real-time)

Invalidation triggers:
- Explicit invalidation call
- Cache TTL exceeded
- New update received
- Authorization change
- Time schedule change
```

### Security
- All tokens encrypted in storage
- HTTPS for all network requests
- Certificate pinning enabled
- Request signing with HMAC-SHA256
- Rate limiting: 100 requests/minute

### Backwards Compatibility
- Module version returned in `initialize()`
- API version parameter in all requests
- Graceful degradation for missing features
- Feature detection available

---

## Usage Examples

### Example 1: Initialize and Request Authorization

```typescript
const result = await FamilyControlsNativeModule.initialize({
  userId: 'user-123',
  familyId: 456,
  userRole: 'parent',
  apiBaseUrl: 'https://api.famconomy.com',
  apiToken: jwtToken,
});

const authResult = await FamilyControlsNativeModule.authorize({
  targetUserId: 'child-789',
  scope: ['screenTime', 'deviceControl'],
  reason: 'Set up parental controls',
  requesterRole: 'parent',
});

// Persist authResult.authorizationToken to backend
```

### Example 2: Set Screen Time Schedule with Polling

```typescript
await FamilyControlsNativeModule.setScreenTimeSchedule({
  targetUserId: 'child-789',
  dailyLimitMinutes: 120,
  startTime: '06:00',
  endTime: '22:00',
  appliedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  allowOverrides: true,
  overrideApproverId: 'parent-456',
});

// Start automatic polling
const pollResult = await FamilyControlsNativeModule.startPolling({
  intervalSeconds: 300,
  userIds: ['child-789'],
  includeEvents: true,
});

// Listen for updates
eventEmitter.addListener('POLLING_UPDATE', (data) => {
  console.log('Screen time updated:', data);
});
```

### Example 3: Error Handling with Retry

```typescript
try {
  const status = await FamilyControlsNativeModule.getScreenTimeStatus('child-789');
} catch (error) {
  if (error.retryable && error.code === 'NET_002') {
    // Timeout - retry with backoff
    setTimeout(() => {
      FamilyControlsNativeModule.getScreenTimeStatus('child-789');
    }, error.retryAfterSeconds * 1000);
  } else if (error.code === 'AUTH_002') {
    // Permission denied - show UI
    showPermissionError(error.userFriendlyMessage);
  } else {
    // Other errors
    throw error;
  }
}
```

---

## Next Steps

1. **Swift Implementation** - Build native module following this spec
2. **React Native Wrapper** - Create TypeScript interface with helpers
3. **Backend Integration** - Implement token storage endpoints
4. **Testing** - Unit tests for all methods
5. **Documentation** - Developer guide with examples

---

**Version**: 1.0.0  
**Last Updated**: October 22, 2025  
**Status**: COMPLETE - Ready for Swift Implementation
