//
//  AuthorizationShield.swift
//  FamConomy
//
//  Authorization and permission validation layer
//  Enforces role-based access control and permission policies
//

import Foundation
import FamilyControls

// MARK: - Authorization Status

struct AuthStatus {
  let authorized: Bool
  let familyId: String
  let userRole: UserRole
  let canControlOtherDevices: Bool
  let timestamp: Date
  
  func toDictionary() -> [String: Any] {
    return [
      "authorized": authorized,
      "familyId": familyId,
      "userRole": userRole.rawValue,
      "canControlOtherDevices": canControlOtherDevices,
      "timestamp": timestamp.timeIntervalSince1970
    ]
  }
}

// MARK: - User Role

enum UserRole: String, Codable {
  case admin = "admin"
  case parent = "parent"
  case guardian = "guardian"
  case child = "child"
  case none = "none"
}

// MARK: - Authorization Shield

class AuthorizationShield {
  
  // MARK: - Properties
  
  private var authorizationCache: [String: AuthStatus] = [:]
  private let cacheQueue = DispatchQueue(label: "com.famconomy.auth.cache")
  
  // MARK: - Public Methods
  
  /// Request Family Controls authorization
  func requestAuthorization(for familyID: String) throws -> Bool {
    // Check system-level Family Controls permission
    let center = FamilyControlsCenter.shared
    
    do {
      _ = try center.requestAuthorization(for: .individual)
      
      // If successful, cache the result
      let status = AuthStatus(
        authorized: true,
        familyId: familyID,
        userRole: .parent,
        canControlOtherDevices: true,
        timestamp: Date()
      )
      
      cacheQueue.sync {
        authorizationCache[familyID] = status
      }
      
      return true
    } catch {
      throw FamilyControlsError.familyControlsNotAuthorized
    }
  }
  
  /// Get current authorization status
  func getAuthorizationStatus(for familyID: String) throws -> AuthStatus {
    // Check cache first
    if let cached = cacheQueue.sync({ authorizationCache[familyID] }) {
      return cached
    }
    
    // Check system authorization
    let center = FamilyControlsCenter.shared
    let authorized = (try? center.requestAuthorization(for: .individual)) != nil
    
    let status = AuthStatus(
      authorized: authorized,
      familyId: familyID,
      userRole: .child,
      canControlOtherDevices: false,
      timestamp: Date()
    )
    
    cacheQueue.sync {
      authorizationCache[familyID] = status
    }
    
    return status
  }
  
  /// Validate that a user can perform a parental control action
  func validateParentalAccess(
    userID: String,
    userRole: UserRole
  ) throws {
    guard userRole == .parent || userRole == .admin else {
      throw FamilyControlsError.insufficientPermissions
    }
  }
  
  /// Check if user can view child activity
  func canViewChildActivity(
    parentID: String,
    parentRole: UserRole,
    childID: String
  ) -> Bool {
    // Parent can view their own children
    if parentRole == .parent || parentRole == .admin {
      return true
    }
    return false
  }
  
  /// Check if user can modify device settings
  func canModifyDeviceSettings(
    userRole: UserRole,
    deviceOwner: String?,
    requestingUserID: String?
  ) -> Bool {
    switch userRole {
    case .admin:
      return true
    case .parent:
      return true
    case .guardian:
      // Guardian can only modify their own device
      return deviceOwner == requestingUserID
    case .child, .none:
      return false
    }
  }
  
  /// Validate permission for specific action
  func validatePermission(
    action: ControlAction,
    userRole: UserRole,
    targetUserRole: UserRole?
  ) throws {
    let hasPermission = canPerformAction(
      role: userRole,
      action: action,
      targetRole: targetUserRole
    )
    
    guard hasPermission else {
      throw FamilyControlsError.insufficientPermissions
    }
  }
  
  /// Enforce a control policy
  func enforcePolicy(_ policy: ControlPolicy) throws {
    // Validate policy parameters
    switch policy {
    case .setScreenTimeLimit(let minutes):
      guard minutes > 0 && minutes <= 1440 else {
        throw FamilyControlsError.invalidTimeLimit
      }
    case .blockApplication(let bundleID):
      guard !bundleID.isEmpty else {
        throw FamilyControlsError.invalidAppBundle
      }
    case .setDowntime(let schedule):
      guard !schedule.isEmpty else {
        throw FamilyControlsError.invalidDowntimeSchedule
      }
    @unknown default:
      throw FamilyControlsError.unknownPolicy
    }
  }
  
  /// Clear authorization cache
  func clearCache(for familyID: String? = nil) {
    cacheQueue.sync {
      if let familyID = familyID {
        authorizationCache.removeValue(forKey: familyID)
      } else {
        authorizationCache.removeAll()
      }
    }
  }
  
  // MARK: - Private Methods
  
  private func canPerformAction(
    role: UserRole,
    action: ControlAction,
    targetRole: UserRole? = nil
  ) -> Bool {
    switch role {
    case .admin:
      // Admins can perform all actions
      return true
      
    case .parent:
      // Parents can perform most actions except some admin-only ones
      switch action {
      case .modifyOtherUsers:
        return false
      default:
        return true
      }
      
    case .guardian:
      // Guardians can perform limited actions
      switch action {
      case .viewActivity, .setScreenTimeLimit, .blockApplication:
        return true
      case .approveAdditionalTime:
        return true
      default:
        return false
      }
      
    case .child:
      // Children can perform minimal actions (request additional time, etc.)
      switch action {
      case .requestAdditionalTime:
        return true
      default:
        return false
      }
      
    case .none:
      return false
    }
  }
}

// MARK: - Control Action

enum ControlAction {
  case viewActivity
  case setScreenTimeLimit
  case blockApplication
  case lockDevice
  case approveAdditionalTime
  case requestAdditionalTime
  case modifyOtherUsers
  case setDowntime
  case custom(String)
}

// MARK: - Control Policy

enum ControlPolicy {
  case setScreenTimeLimit(minutes: Int)
  case blockApplication(bundleID: String)
  case setDowntime(schedule: String)
}

// MARK: - Family Controls Error

enum FamilyControlsError: LocalizedError {
  // Authorization Errors
  case unauthorized(reason: String)
  case insufficientPermissions
  case userNotFound(userId: String)
  case familyNotFound(familyId: String)
  case familyControlsNotAuthorized
  
  // System Errors
  case familyControlsNotAvailable
  case screenTimeNotAuthorized
  case systemError(description: String)
  
  // Validation Errors
  case invalidUserRole
  case invalidTimeLimit
  case invalidAppBundle
  case invalidDowntimeSchedule
  case invalidParameters
  case unknownPolicy
  
  // Device Errors
  case deviceNotSupported
  case operationNotSupported(reason: String)
  
  var errorDescription: String? {
    switch self {
    case .unauthorized(let reason):
      return "Unauthorized: \(reason)"
    case .insufficientPermissions:
      return "Insufficient permissions to perform this action"
    case .userNotFound(let userId):
      return "User not found: \(userId)"
    case .familyNotFound(let familyId):
      return "Family not found: \(familyId)"
    case .familyControlsNotAuthorized:
      return "Family Controls is not authorized"
    case .familyControlsNotAvailable:
      return "Family Controls feature is not available"
    case .screenTimeNotAuthorized:
      return "Screen Time authorization is not available"
    case .systemError(let description):
      return "System error: \(description)"
    case .invalidUserRole:
      return "Invalid user role"
    case .invalidTimeLimit:
      return "Invalid time limit (must be between 1 and 1440 minutes)"
    case .invalidAppBundle:
      return "Invalid application bundle ID"
    case .invalidDowntimeSchedule:
      return "Invalid downtime schedule"
    case .invalidParameters:
      return "Invalid parameters provided"
    case .unknownPolicy:
      return "Unknown control policy"
    case .deviceNotSupported:
      return "This device is not supported"
    case .operationNotSupported(let reason):
      return "Operation not supported: \(reason)"
    }
  }
}
