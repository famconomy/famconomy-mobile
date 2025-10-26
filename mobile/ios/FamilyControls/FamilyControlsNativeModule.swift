import React
import Foundation
import FamilyControls
import ScreenTime

@objc(FamilyControlsNativeModule)
class FamilyControlsNativeModule: RCTEventEmitter {
  
  // MARK: - Properties
  private var bridge: RCTBridge?
  private var currentConfig: InitConfig?
  private var authorizationShield: AuthorizationShield?
  private var screenTimeManager: ScreenTimeManager?
  private var deviceControlManager: DeviceControlManager?
  private var pollingManager: PollingManager?
  private var sessionId: String = UUID().uuidString
  
  // MARK: - Initialization
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  override func supportedEvents() -> [String]! {
    return [
      "AUTHORIZATION_GRANTED",
      "AUTHORIZATION_REVOKED",
      "AUTHORIZATION_EXPIRED",
      "SCREEN_TIME_WARNING",
      "SCHEDULE_ACTIVATED",
      "DEVICE_LOCKED",
      "APP_BLOCKED",
      "POLLING_ERROR",
      "POLLING_RECOVERED",
      "MODULE_ERROR"
    ]
  }
  
  // MARK: - Core Module Methods
  
  @objc
  func initialize(_ config: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      do {
        let initConfig = try self.parseInitConfig(config)
        self.currentConfig = initConfig
        
        // Initialize managers
        self.authorizationShield = AuthorizationShield(config: initConfig)
        self.screenTimeManager = ScreenTimeManager(config: initConfig)
        self.deviceControlManager = DeviceControlManager(config: initConfig)
        self.pollingManager = PollingManager(config: initConfig, delegate: self)
        
        let result: [String: Any] = [
          "success": true,
          "moduleVersion": "1.0.0",
          "osVersion": UIDevice.current.systemVersion,
          "frameworksAvailable": ["ScreenTime", "FamilyControls"],
          "sessionId": self.sessionId,
          "timestamp": Date().timeIntervalSince1970
        ]
        
        resolver(result)
      } catch {
        let nsError = error as NSError
        rejecter("INIT_001", "Initialization failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func authorize(_ request: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let shield = self.authorizationShield else {
        rejecter("AUTH_001", "Module not initialized", nil)
        return
      }
      
      do {
        let authRequest = try self.parseAuthorizationRequest(request)
        let result = try shield.requestAuthorization(authRequest)
        
        // Emit event
        self.sendEvent(withName: "AUTHORIZATION_GRANTED", body: [
          "authorizationToken": result.authorizationToken ?? "",
          "grantedByUserId": self.currentConfig?.userId ?? "",
          "targetUserId": authRequest.targetUserId,
          "grantedScopes": authRequest.scope,
          "expiresAt": result.expiresAt ?? Date().addingTimeInterval(86400).timeIntervalSince1970,
          "timestamp": Date().timeIntervalSince1970
        ])
        
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("AUTH_002", "Authorization failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func revokeAuthorization(_ token: String, reason: NSString?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let shield = self.authorizationShield else {
        rejecter("REVOKE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let success = try shield.revokeAuthorization(token: token)
        
        // Emit event
        self.sendEvent(withName: "AUTHORIZATION_REVOKED", body: [
          "authorizationToken": token,
          "revokedByUserId": self.currentConfig?.userId ?? "",
          "revokedAt": Date().timeIntervalSince1970,
          "reason": reason ?? "",
          "timestamp": Date().timeIntervalSince1970
        ])
        
        resolver([
          "success": success,
          "timestamp": Date().timeIntervalSince1970
        ])
      } catch {
        let nsError = error as NSError
        rejecter("REVOKE_002", "Revocation failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func checkAuthorization(_ token: String, includeDetails: Bool, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let shield = self.authorizationShield else {
        rejecter("CHECK_001", "Module not initialized", nil)
        return
      }
      
      do {
        let status = try shield.checkAuthorizationStatus(token: token, includeDetails: includeDetails)
        resolver(status.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("CHECK_002", "Status check failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  // MARK: - Screen Time Methods
  
  @objc
  func setScreenTimeSchedule(_ schedule: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.screenTimeManager else {
        rejecter("SCHEDULE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let screenTimeSchedule = try self.parseScreenTimeSchedule(schedule)
        let result = try manager.setScreenTimeSchedule(screenTimeSchedule)
        
        // Emit event
        self.sendEvent(withName: "SCHEDULE_ACTIVATED", body: [
          "scheduleId": result.scheduleId,
          "targetUserId": screenTimeSchedule.targetUserId,
          "type": "TIME_LIMIT",
          "timestamp": Date().timeIntervalSince1970
        ])
        
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("SCHEDULE_002", "Schedule setup failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func updateSchedule(_ scheduleId: String, updates: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.screenTimeManager else {
        rejecter("UPDATE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let result = try manager.updateSchedule(scheduleId: scheduleId, updates: updates)
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("UPDATE_002", "Schedule update failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func getSchedules(_ filter: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.screenTimeManager else {
        rejecter("SCHEDULE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let schedules = try manager.getSchedules(filter: filter)
        resolver(schedules.map { $0.toDictionary() })
      } catch {
        let nsError = error as NSError
        rejecter("SCHEDULE_003", "Schedule retrieval failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func deleteSchedule(_ scheduleId: String, reason: NSString?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.screenTimeManager else {
        rejecter("SCHEDULE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let result = try manager.deleteSchedule(scheduleId: scheduleId)
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("SCHEDULE_004", "Schedule deletion failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  // MARK: - Status & Polling Methods
  
  @objc
  func getScreenTimeStatus(_ userId: String, includeHistory: Bool, includePrediction: Bool, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.screenTimeManager else {
        rejecter("STATUS_001", "Module not initialized", nil)
        return
      }
      
      do {
        let status = try manager.getScreenTimeStatus(userId: userId, includeHistory: includeHistory, includePrediction: includePrediction)
        resolver(status.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("STATUS_002", "Status retrieval failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func startPolling(_ options: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let pollingMgr = self.pollingManager else {
        rejecter("POLLING_001", "Module not initialized", nil)
        return
      }
      
      do {
        let pollingOptions = try self.parsePollingOptions(options)
        let result = try pollingMgr.startPolling(options: pollingOptions)
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("POLLING_002", "Polling start failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func stopPolling(_ pollingId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let pollingMgr = self.pollingManager else {
        rejecter("POLLING_001", "Module not initialized", nil)
        return
      }
      
      do {
        let result = try pollingMgr.stopPolling(pollingId: pollingId)
        resolver(result.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("POLLING_003", "Polling stop failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func getDeviceStatus(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.deviceControlManager else {
        rejecter("DEVICE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let status = try manager.getDeviceStatus()
        resolver(status.toDictionary())
      } catch {
        let nsError = error as NSError
        rejecter("DEVICE_002", "Device status retrieval failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  // MARK: - Device Control Methods
  
  @objc
  func blockApp(_ bundleId: String, reason: NSString?, until: NSNumber?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.deviceControlManager else {
        rejecter("DEVICE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let blockedUntil = until?.doubleValue
        try manager.blockApp(bundleId: bundleId, reason: reason as String?, until: blockedUntil)
        
        // Emit event
        self.sendEvent(withName: "APP_BLOCKED", body: [
          "bundleId": bundleId,
          "blockReason": reason ?? "",
          "blockedUntil": blockedUntil ?? NSNull(),
          "timestamp": Date().timeIntervalSince1970
        ])
        
        resolver(["success": true])
      } catch {
        let nsError = error as NSError
        rejecter("DEVICE_003", "App blocking failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func unblockApp(_ bundleId: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.deviceControlManager else {
        rejecter("DEVICE_001", "Module not initialized", nil)
        return
      }
      
      do {
        try manager.unblockApp(bundleId: bundleId)
        resolver(["success": true])
      } catch {
        let nsError = error as NSError
        rejecter("DEVICE_004", "App unblocking failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func lockDevice(_ reason: NSString?, until: NSNumber?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.deviceControlManager else {
        rejecter("DEVICE_001", "Module not initialized", nil)
        return
      }
      
      do {
        let lockedUntil = until?.doubleValue
        try manager.lockDevice(reason: reason as String?, until: lockedUntil)
        
        // Emit event
        self.sendEvent(withName: "DEVICE_LOCKED", body: [
          "lockReason": reason ?? "MANUAL",
          "unlockAt": lockedUntil ?? NSNull(),
          "timestamp": Date().timeIntervalSince1970
        ])
        
        resolver(["success": true])
      } catch {
        let nsError = error as NSError
        rejecter("DEVICE_005", "Device locking failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  @objc
  func setContentRestrictions(_ restrictions: NSDictionary, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let manager = self.deviceControlManager else {
        rejecter("DEVICE_001", "Module not initialized", nil)
        return
      }
      
      do {
        try manager.setContentRestrictions(restrictions: restrictions)
        resolver(["success": true])
      } catch {
        let nsError = error as NSError
        rejecter("DEVICE_006", "Content restrictions setup failed: \(nsError.localizedDescription)", error)
      }
    }
  }
  
  // MARK: - Helper Methods
  
  private func parseInitConfig(_ config: NSDictionary) throws -> InitConfig {
    guard let userId = config["userId"] as? String else { throw NSError(domain: "InitConfig", code: -1) }
    guard let familyId = config["familyId"] as? NSNumber else { throw NSError(domain: "InitConfig", code: -1) }
    guard let userRole = config["userRole"] as? String else { throw NSError(domain: "InitConfig", code: -1) }
    guard let apiBaseUrl = config["apiBaseUrl"] as? String else { throw NSError(domain: "InitConfig", code: -1) }
    guard let apiToken = config["apiToken"] as? String else { throw NSError(domain: "InitConfig", code: -1) }
    
    return InitConfig(
      userId: userId,
      familyId: Int(familyId),
      userRole: userRole,
      apiBaseUrl: apiBaseUrl,
      apiToken: apiToken,
      enablePersistence: config["enablePersistence"] as? Bool ?? true,
      enablePolling: config["enablePolling"] as? Bool ?? true,
      pollingIntervalSeconds: config["pollingIntervalSeconds"] as? Int ?? 300
    )
  }
  
  private func parseAuthorizationRequest(_ request: NSDictionary) throws -> AuthorizationRequest {
    guard let targetUserId = request["targetUserId"] as? String else { throw NSError(domain: "AuthRequest", code: -1) }
    guard let scope = request["scope"] as? [String] else { throw NSError(domain: "AuthRequest", code: -1) }
    guard let requesterRole = request["requesterRole"] as? String else { throw NSError(domain: "AuthRequest", code: -1) }
    
    return AuthorizationRequest(
      targetUserId: targetUserId,
      scope: scope,
      reason: request["reason"] as? String,
      requesterRole: requesterRole,
      requestExpiresIn: request["requestExpiresIn"] as? Int
    )
  }
  
  private func parseScreenTimeSchedule(_ schedule: NSDictionary) throws -> ScreenTimeScheduleRequest {
    guard let targetUserId = schedule["targetUserId"] as? String else { throw NSError(domain: "Schedule", code: -1) }
    
    return ScreenTimeScheduleRequest(
      targetUserId: targetUserId,
      dailyLimitMinutes: schedule["dailyLimitMinutes"] as? Int,
      startTime: schedule["startTime"] as? String,
      endTime: schedule["endTime"] as? String,
      appliedDays: schedule["appliedDays"] as? [String],
      categoryLimits: schedule["categoryLimits"] as? [[String: Any]],
      allowOverrides: schedule["allowOverrides"] as? Bool ?? false,
      overrideApproverId: schedule["overrideApproverId"] as? String,
      metadata: schedule["metadata"] as? [String: String]
    )
  }
  
  private func parsePollingOptions(_ options: NSDictionary) throws -> PollingOptions {
    guard let intervalSeconds = options["intervalSeconds"] as? Int else { throw NSError(domain: "PollingOptions", code: -1) }
    
    return PollingOptions(
      intervalSeconds: intervalSeconds,
      userIds: options["userIds"] as? [String],
      includeEvents: options["includeEvents"] as? Bool ?? true,
      backoffStrategy: options["backoffStrategy"] as? String,
      maxAttempts: options["maxAttempts"] as? Int
    )
  }
}

// MARK: - Data Structures

struct InitConfig {
  let userId: String
  let familyId: Int
  let userRole: String
  let apiBaseUrl: String
  let apiToken: String
  let enablePersistence: Bool
  let enablePolling: Bool
  let pollingIntervalSeconds: Int
}

struct AuthorizationRequest {
  let targetUserId: String
  let scope: [String]
  let reason: String?
  let requesterRole: String
  let requestExpiresIn: Int?
}

struct AuthorizationResult {
  let authorized: Bool
  let authorizationToken: String?
  let grantedScopes: [String]
  let expiresAt: TimeInterval?
  let requiresUserConsent: Bool
  let consentUrl: String?
  let sessionId: String
  
  func toDictionary() -> [String: Any] {
    return [
      "authorized": authorized,
      "authorizationToken": authorizationToken ?? NSNull(),
      "grantedScopes": grantedScopes,
      "expiresAt": expiresAt ?? NSNull(),
      "requiresUserConsent": requiresUserConsent,
      "consentUrl": consentUrl ?? NSNull(),
      "sessionId": sessionId,
      "timestamp": Date().timeIntervalSince1970
    ]
  }
}

struct ScreenTimeScheduleRequest {
  let targetUserId: String
  let dailyLimitMinutes: Int?
  let startTime: String?
  let endTime: String?
  let appliedDays: [String]?
  let categoryLimits: [[String: Any]]?
  let allowOverrides: Bool
  let overrideApproverId: String?
  let metadata: [String: String]?
}

struct ScheduleResult {
  let success: Bool
  let scheduleId: String
  let appliedAt: TimeInterval
  let status: String
  
  func toDictionary() -> [String: Any] {
    return [
      "success": success,
      "scheduleId": scheduleId,
      "appliedAt": appliedAt,
      "status": status,
      "timestamp": Date().timeIntervalSince1970
    ]
  }
}

struct PollingOptions {
  let intervalSeconds: Int
  let userIds: [String]?
  let includeEvents: Bool
  let backoffStrategy: String?
  let maxAttempts: Int?
}

struct PollingResult {
  let success: Bool
  let pollingId: String
  let startedAt: TimeInterval
  let nextPollAt: TimeInterval
  
  func toDictionary() -> [String: Any] {
    return [
      "success": success,
      "pollingId": pollingId,
      "startedAt": startedAt,
      "nextPollAt": nextPollAt,
      "timestamp": Date().timeIntervalSince1970
    ]
  }
}
