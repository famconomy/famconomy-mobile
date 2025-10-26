//
//  FamilyControlsEventEmitter.swift
//  FamConomy
//
//  Event emitter for sending events from native code to React Native
//  Uses RCTEventEmitter for real-time updates
//

import Foundation
import React

// MARK: - Family Controls Events

enum FamilyControlsEventType: String {
  // Screen Time Events
  case screenTimeWarning = "SCREEN_TIME_WARNING"
  case screenTimeExceeded = "SCREEN_TIME_EXCEEDED"
  case downtimeStarted = "DOWNTIME_STARTED"
  case downtimeEnded = "DOWNTIME_ENDED"
  case screenTimeLimitSet = "SCREEN_TIME_LIMIT_SET"
  case additionalTimeApproved = "ADDITIONAL_TIME_APPROVED"
  case monitoringEnabled = "MONITORING_ENABLED"
  
  // Device Control Events
  case appBlocked = "APP_BLOCKED"
  case appUnblocked = "APP_UNBLOCKED"
  case deviceLocked = "DEVICE_LOCKED"
  case deviceUnlocked = "DEVICE_UNLOCKED"
  case deviceStatusChanged = "DEVICE_STATUS_CHANGED"
  
  // Authorization Events
  case authorizationChanged = "AUTHORIZATION_CHANGED"
  case permissionRequired = "PERMISSION_REQUIRED"
  case authorizationError = "AUTHORIZATION_ERROR"
  
  // Status Events
  case statusUpdated = "STATUS_UPDATED"
  case errorOccurred = "ERROR_OCCURRED"
  
  // System Events
  case readyStateChanged = "READY_STATE_CHANGED"
}

// MARK: - Family Controls Event Emitter

class FamilyControlsEventEmitter: RCTEventEmitter {
  
  // MARK: - Class Methods
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Module Configuration
  
  override func supportedEvents() -> [String]! {
    return [
      FamilyControlsEventType.screenTimeWarning.rawValue,
      FamilyControlsEventType.screenTimeExceeded.rawValue,
      FamilyControlsEventType.downtimeStarted.rawValue,
      FamilyControlsEventType.downtimeEnded.rawValue,
      FamilyControlsEventType.screenTimeLimitSet.rawValue,
      FamilyControlsEventType.additionalTimeApproved.rawValue,
      FamilyControlsEventType.monitoringEnabled.rawValue,
      FamilyControlsEventType.appBlocked.rawValue,
      FamilyControlsEventType.appUnblocked.rawValue,
      FamilyControlsEventType.deviceLocked.rawValue,
      FamilyControlsEventType.deviceUnlocked.rawValue,
      FamilyControlsEventType.deviceStatusChanged.rawValue,
      FamilyControlsEventType.authorizationChanged.rawValue,
      FamilyControlsEventType.permissionRequired.rawValue,
      FamilyControlsEventType.authorizationError.rawValue,
      FamilyControlsEventType.statusUpdated.rawValue,
      FamilyControlsEventType.errorOccurred.rawValue,
      FamilyControlsEventType.readyStateChanged.rawValue,
    ]
  }
  
  // MARK: - Event Emitting Methods
  
  /// Send screen time warning event
  func sendScreenTimeWarning(
    userId: String,
    remaining: Int,
    percentage: Float,
    warningId: String
  ) {
    sendEvent(
      withName: FamilyControlsEventType.screenTimeWarning.rawValue,
      body: [
        "userId": userId,
        "remaining": remaining,
        "percentage": percentage,
        "warningId": warningId,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send screen time exceeded event
  func sendScreenTimeExceeded(userId: String) {
    sendEvent(
      withName: FamilyControlsEventType.screenTimeExceeded.rawValue,
      body: [
        "userId": userId,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send app blocked event
  func sendAppBlocked(bundleId: String, appName: String? = nil) {
    sendEvent(
      withName: FamilyControlsEventType.appBlocked.rawValue,
      body: [
        "bundleId": bundleId,
        "appName": appName ?? bundleId,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send app unblocked event
  func sendAppUnblocked(bundleId: String, appName: String? = nil) {
    sendEvent(
      withName: FamilyControlsEventType.appUnblocked.rawValue,
      body: [
        "bundleId": bundleId,
        "appName": appName ?? bundleId,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send device locked event
  func sendDeviceLocked() {
    sendEvent(
      withName: FamilyControlsEventType.deviceLocked.rawValue,
      body: [
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send device unlocked event
  func sendDeviceUnlocked() {
    sendEvent(
      withName: FamilyControlsEventType.deviceUnlocked.rawValue,
      body: [
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send device status changed event
  func sendDeviceStatusChanged(status: [String: Any]) {
    sendEvent(
      withName: FamilyControlsEventType.deviceStatusChanged.rawValue,
      body: status
    )
  }
  
  /// Send authorization changed event
  func sendAuthorizationChanged(
    authorized: Bool,
    familyId: String,
    userRole: String
  ) {
    sendEvent(
      withName: FamilyControlsEventType.authorizationChanged.rawValue,
      body: [
        "authorized": authorized,
        "familyId": familyId,
        "userRole": userRole,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send permission required event
  func sendPermissionRequired(
    permission: String,
    reason: String
  ) {
    sendEvent(
      withName: FamilyControlsEventType.permissionRequired.rawValue,
      body: [
        "permission": permission,
        "reason": reason,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
  
  /// Send generic status updated event
  func sendStatusUpdated(
    status: String,
    data: [String: Any]? = nil
  ) {
    var body: [String: Any] = [
      "status": status,
      "timestamp": Date().timeIntervalSince1970
    ]
    if let data = data {
      body["data"] = data
    }
    
    sendEvent(
      withName: FamilyControlsEventType.statusUpdated.rawValue,
      body: body
    )
  }
  
  /// Send error event
  func sendError(
    code: String,
    message: String,
    details: [String: Any]? = nil
  ) {
    var body: [String: Any] = [
      "code": code,
      "message": message,
      "timestamp": Date().timeIntervalSince1970
    ]
    if let details = details {
      body["details"] = details
    }
    
    sendEvent(
      withName: FamilyControlsEventType.errorOccurred.rawValue,
      body: body
    )
  }
  
  /// Send ready state changed event
  func sendReadyStateChanged(isReady: Bool) {
    sendEvent(
      withName: FamilyControlsEventType.readyStateChanged.rawValue,
      body: [
        "isReady": isReady,
        "timestamp": Date().timeIntervalSince1970
      ]
    )
  }
}
