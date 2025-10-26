//
//  ScreenTimeManager.swift
//  FamConomy
//
//  Screen time tracking and management
//  Monitors usage, sets limits, and sends warnings
//

import Foundation
import ScreenTime

// MARK: - Screen Time Info

struct ScreenTimeInfo {
  let userId: String
  let remaining: Int          // seconds
  let limit: Int              // seconds
  let used: Int               // seconds
  let percentage: Float
  let lastUpdated: Date
  
  func toDictionary() -> [String: Any] {
    return [
      "userId": userId,
      "remaining": remaining,
      "limit": limit,
      "used": used,
      "percentage": percentage,
      "lastUpdated": lastUpdated.timeIntervalSince1970
    ]
  }
}

// MARK: - App Category

enum AppCategory: String, Codable {
  case socialMedia = "social_media"
  case entertainment = "entertainment"
  case productivity = "productivity"
  case games = "games"
  case education = "education"
  case other = "other"
}

// MARK: - Screen Time Manager

class ScreenTimeManager {
  
  // MARK: - Properties
  
  private var screenTimeLimits: [String: Int] = [:]   // userId -> minutes
  private var screenTimeUsage: [String: Int] = [:]    // userId -> minutes today
  private var monitoringEnabled: [String: Bool] = [:]
  private let queue = DispatchQueue(label: "com.famconomy.screentime")
  
  // MARK: - Public Methods
  
  /// Set daily screen time limit for a user
  func setDailyLimit(
    userID: String,
    minutes: Int,
    category: String? = nil
  ) throws {
    guard minutes > 0 && minutes <= 1440 else {
      throw FamilyControlsError.invalidTimeLimit
    }
    
    queue.async {
      self.screenTimeLimits[userID] = minutes
      // TODO: Apply to OS via ScreenTime framework
    }
  }
  
  /// Get screen time info for a user
  func getScreenTimeInfo(for userID: String) throws -> ScreenTimeInfo {
    let limit = queue.sync { screenTimeLimits[userID] ?? 0 }
    let used = queue.sync { screenTimeUsage[userID] ?? 0 }
    let remaining = max(0, limit - used)
    let percentage = limit > 0 ? Float(used) / Float(limit) * 100 : 0
    
    return ScreenTimeInfo(
      userId: userID,
      remaining: remaining * 60,    // convert to seconds
      limit: limit * 60,            // convert to seconds
      used: used * 60,              // convert to seconds
      percentage: percentage,
      lastUpdated: Date()
    )
  }
  
  /// Get remaining screen time in seconds
  func getRemainingTime(for userID: String) throws -> Int {
    let info = try getScreenTimeInfo(for: userID)
    return info.remaining
  }
  
  /// Approve additional screen time
  func approveAdditionalTime(
    userID: String,
    minutes: Int
  ) throws {
    guard minutes > 0 else {
      throw FamilyControlsError.invalidTimeLimit
    }
    
    queue.async {
      let current = self.screenTimeLimits[userID] ?? 0
      self.screenTimeLimits[userID] = current + minutes
      // TODO: Apply to OS via ScreenTime framework
    }
  }
  
  /// Enable screen time monitoring
  func enableMonitoring(
    userID: String,
    warningThreshold: Int = 20
  ) throws {
    guard warningThreshold > 0 && warningThreshold <= 100 else {
      throw FamilyControlsError.systemError(
        description: "Warning threshold must be between 1 and 100"
      )
    }
    
    queue.async {
      self.monitoringEnabled[userID] = true
      // TODO: Setup monitoring in OS
    }
  }
  
  /// Disable monitoring
  func disableMonitoring(for userID: String) throws {
    queue.async {
      self.monitoringEnabled[userID] = false
    }
  }
  
  /// Update screen time usage
  func updateUsage(userID: String, minutesUsed: Int) throws {
    guard minutesUsed >= 0 else {
      throw FamilyControlsError.invalidTimeLimit
    }
    
    queue.async {
      self.screenTimeUsage[userID] = minutesUsed
    }
  }
  
  /// Get screen time report
  func getScreenTimeReport(
    userID: String,
    period: ReportPeriod
  ) throws -> [String: Any] {
    let info = try getScreenTimeInfo(for: userID)
    
    return [
      "userId": userID,
      "period": period.rawValue,
      "limit": info.limit,
      "used": info.used,
      "remaining": info.remaining,
      "percentage": info.percentage,
      "date": Date().timeIntervalSince1970
    ]
  }
  
  /// Acknowledge a warning event
  func acknowledgeWarning(_ warningID: String) throws {
    // TODO: Handle warning acknowledgment
  }
  
  /// Check if user is within limits
  func isWithinLimits(userID: String) -> Bool {
    let used = queue.sync { screenTimeUsage[userID] ?? 0 }
    let limit = queue.sync { screenTimeLimits[userID] ?? 0 }
    return used < limit
  }
  
  /// Get warning status (e.g., at 80% of limit)
  func getWarningStatus(userID: String) -> WarningStatus? {
    let used = queue.sync { screenTimeUsage[userID] ?? 0 }
    let limit = queue.sync { screenTimeLimits[userID] ?? 0 }
    
    guard limit > 0 else { return nil }
    
    let percentage = Float(used) / Float(limit) * 100
    
    if percentage >= 100 {
      return .exceeded
    } else if percentage >= 80 {
      return .warning
    } else {
      return .normal
    }
  }
  
  // MARK: - Private Helpers
  
  /// Reset daily usage counters
  private func resetDailyUsage() {
    queue.async {
      self.screenTimeUsage.removeAll()
    }
  }
}

// MARK: - Supporting Types

enum ReportPeriod: String {
  case today = "today"
  case week = "week"
  case month = "month"
}

enum WarningStatus {
  case normal
  case warning
  case exceeded
}
