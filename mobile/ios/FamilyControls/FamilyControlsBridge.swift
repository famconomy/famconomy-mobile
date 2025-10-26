//
//  FamilyControlsBridge.swift
//  FamConomy
//
//  Main bridge module for React Native communication
//  Exports native methods and handles event emission
//

import Foundation
import React
import FamilyControls
import ScreenTime

// MARK: - FamilyControlsBridge

@objc(FamilyControlsBridge)
class FamilyControlsBridge: NSObject, RCTBridgeModule {
  
  // MARK: - Properties
  
  private let authShield = AuthorizationShield()
  private let screenTimeManager = ScreenTimeManager()
  private let deviceControlManager = DeviceControlManager()
  
  // Event emitter for sending events to React Native
  private var eventEmitter: FamilyControlsEventEmitter?
  
  // MARK: - RCTBridgeModule Protocol
  
  static func moduleName() -> String! {
    return "FamilyControlsBridge"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Initialization
  
  override init() {
    super.init()
    setupEventEmitter()
  }
  
  private func setupEventEmitter() {
    eventEmitter = FamilyControlsEventEmitter()
  }
  
  // MARK: - Authorization Methods
  
  /// Request Family Controls access for a family
  @objc func requestFamilyControlsAccess(
    _ familyID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      do {
        let authorized = try self.authShield.requestAuthorization(
          for: familyID
        )
        resolve(authorized)
      } catch {
        reject(
          "AUTH_ERROR",
          "Failed to request Family Controls access: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Check current authorization status
  @objc func checkAuthorizationStatus(
    _ familyID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let status = try self.authShield.getAuthorizationStatus(
        for: familyID
      )
      resolve(status.toDictionary())
    } catch {
      reject(
        "STATUS_ERROR",
        "Failed to check authorization status: \(error.localizedDescription)",
        error
      )
    }
  }
  
  // MARK: - Screen Time Methods
  
  /// Set screen time limit for a user
  @objc func setScreenTimeLimit(
    _ params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        guard let userID = params["userId"] as? String,
              let minutes = params["minutes"] as? NSNumber else {
          throw FamilyControlsError.invalidParameters
        }
        
        let category = params["category"] as? String
        
        try self.screenTimeManager.setDailyLimit(
          userID: userID,
          minutes: Int(minutes),
          category: category
        )
        
        self.emitEvent(
          "SCREEN_TIME_LIMIT_SET",
          data: ["userId": userID, "minutes": minutes]
        )
        
        resolve(["success": true])
      } catch {
        reject(
          "SCREEN_TIME_ERROR",
          "Failed to set screen time limit: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Get screen time information for a user
  @objc func getScreenTimeInfo(
    _ userID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        let info = try self.screenTimeManager.getScreenTimeInfo(
          for: userID
        )
        resolve(info.toDictionary())
      } catch {
        reject(
          "SCREEN_TIME_ERROR",
          "Failed to get screen time info: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Get remaining screen time for a user
  @objc func getRemainingScreenTime(
    _ userID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        let remaining = try self.screenTimeManager.getRemainingTime(
          for: userID
        )
        resolve(remaining)
      } catch {
        reject(
          "SCREEN_TIME_ERROR",
          "Failed to get remaining screen time: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Approve additional screen time for a user
  @objc func approveAdditionalTime(
    _ params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        guard let userID = params["userId"] as? String,
              let minutes = params["minutes"] as? NSNumber else {
          throw FamilyControlsError.invalidParameters
        }
        
        try self.screenTimeManager.approveAdditionalTime(
          userID: userID,
          minutes: Int(minutes)
        )
        
        self.emitEvent(
          "ADDITIONAL_TIME_APPROVED",
          data: ["userId": userID, "minutes": minutes]
        )
        
        resolve(["success": true])
      } catch {
        reject(
          "SCREEN_TIME_ERROR",
          "Failed to approve additional time: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Enable screen time monitoring with warnings
  @objc func enableScreenTimeMonitoring(
    _ params: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        guard let userID = params["userId"] as? String else {
          throw FamilyControlsError.invalidParameters
        }
        
        let threshold = params["warningThreshold"] as? NSNumber ?? NSNumber(value: 20)
        
        try self.screenTimeManager.enableMonitoring(
          userID: userID,
          warningThreshold: Int(threshold)
        )
        
        self.emitEvent(
          "MONITORING_ENABLED",
          data: ["userId": userID]
        )
        
        resolve(["success": true])
      } catch {
        reject(
          "MONITORING_ERROR",
          "Failed to enable monitoring: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  // MARK: - Device Control Methods
  
  /// Block an application
  @objc func blockApplication(
    _ bundleID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        try self.deviceControlManager.blockApplication(bundleID)
        
        self.emitEvent(
          "APP_BLOCKED",
          data: ["bundleId": bundleID]
        )
        
        resolve(["success": true])
      } catch {
        reject(
          "DEVICE_CONTROL_ERROR",
          "Failed to block application: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Unblock an application
  @objc func unblockApplication(
    _ bundleID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        try self.deviceControlManager.unblockApplication(bundleID)
        
        self.emitEvent(
          "APP_UNBLOCKED",
          data: ["bundleId": bundleID]
        )
        
        resolve(["success": true])
      } catch {
        reject(
          "DEVICE_CONTROL_ERROR",
          "Failed to unblock application: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Get list of blocked applications
  @objc func getBlockedApplications(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        let blocked = try self.deviceControlManager.getBlockedApplications()
        resolve(blocked)
      } catch {
        reject(
          "DEVICE_CONTROL_ERROR",
          "Failed to get blocked applications: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Get device status
  @objc func getDeviceStatus(
    _ deviceID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        let status = try self.deviceControlManager.getDeviceStatus(deviceID)
        resolve(status.toDictionary())
      } catch {
        reject(
          "DEVICE_CONTROL_ERROR",
          "Failed to get device status: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  /// Lock the device
  @objc func lockDevice(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        try self.deviceControlManager.lockDevice()
        
        self.emitEvent("DEVICE_LOCKED", data: [:])
        
        resolve(["success": true])
      } catch {
        reject(
          "DEVICE_CONTROL_ERROR",
          "Failed to lock device: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  // MARK: - Event Methods
  
  /// Acknowledge a warning event
  @objc func acknowledgeWarning(
    _ warningID: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.global().async {
      do {
        try self.screenTimeManager.acknowledgeWarning(warningID)
        resolve(["success": true])
      } catch {
        reject(
          "WARNING_ERROR",
          "Failed to acknowledge warning: \(error.localizedDescription)",
          error
        )
      }
    }
  }
  
  // MARK: - Private Helpers
  
  private func emitEvent(_ eventName: String, data: [String: Any]) {
    eventEmitter?.sendEvent(withName: eventName, body: data)
  }
  
  // MARK: - Lifecycle
  
  deinit {
    eventEmitter = nil
  }
}
