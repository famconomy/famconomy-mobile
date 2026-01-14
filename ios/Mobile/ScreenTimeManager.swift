import Foundation
import FamilyControls
import ManagedSettings

@available(iOS 16.0, *)
final class ScreenTimeManager {
  struct ScreenTimeGrantRecord: Codable {
    let grantId: String
    let childUserId: String
    let familyId: String
    let grantedMinutes: Int
    let grantedAt: Date
    let expiresAt: Date
    var status: String
    var revokedAt: Date?
    var allowedBundleIds: [String]
    var allowedCategories: [String]
    let grantedByUserId: String
    let sourceTaskId: String?
    var usedMinutesOverride: Int?
  }

  enum ScreenTimeError: LocalizedError {
    case invalidPayload
    case invalidDuration
    case missingChildUserId

    var errorDescription: String? {
      switch self {
      case .invalidPayload:
        return "Invalid payload."
      case .invalidDuration:
        return "Duration must be greater than zero."
      case .missingChildUserId:
        return "Child user ID is required."
      }
    }
  }

  private let settingsStore = ManagedSettingsStore()
  private let queue = DispatchQueue(label: "com.famconomy.familycontrols.grants")
  private let timerQueue = DispatchQueue(label: "com.famconomy.familycontrols.timer")
  private let defaultsKey = "famconomy_screen_time_grants_v1"
  private let dateFormatter = ISO8601DateFormatter()
  private var expiryTimer: DispatchSourceTimer?

  var onUpdate: ((ScreenTimeGrantRecord) -> Void)?

  init() {
    pruneExpiredGrants()
  }

  func requestAuthorization(completion: @escaping (Result<Bool, Error>) -> Void) {
    Task { @MainActor in
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        completion(.success(authorized))
      } catch {
        completion(.failure(error))
      }
    }
  }

  func isAuthorized() -> Bool {
    return AuthorizationCenter.shared.authorizationStatus == .approved
  }

  func authorizationStatusString() -> String {
    switch AuthorizationCenter.shared.authorizationStatus {
    case .approved:
      return "authorized"
    case .denied:
      return "denied"
    case .notDetermined:
      return "not_determined"
    @unknown default:
      return "not_determined"
    }
  }

  func grantScreenTime(
    childUserId: String,
    durationMinutes: Int,
    allowedBundleIds: [String]?,
    allowedCategories: [String]?
  ) throws -> ScreenTimeGrantRecord {
    guard !childUserId.isEmpty else {
      throw ScreenTimeError.missingChildUserId
    }
    guard durationMinutes > 0 else {
      throw ScreenTimeError.invalidDuration
    }

    let now = Date()
    let expiresAt = now.addingTimeInterval(TimeInterval(durationMinutes * 60))
    let grant = ScreenTimeGrantRecord(
      grantId: UUID().uuidString,
      childUserId: childUserId,
      familyId: "",
      grantedMinutes: durationMinutes,
      grantedAt: now,
      expiresAt: expiresAt,
      status: "active",
      revokedAt: nil,
      allowedBundleIds: allowedBundleIds ?? [],
      allowedCategories: allowedCategories ?? [],
      grantedByUserId: "local",
      sourceTaskId: nil,
      usedMinutesOverride: nil
    )

    queue.sync {
      var grants = loadGrants()
      grants.removeAll { $0.childUserId == childUserId }
      grants.append(grant)
      saveGrants(grants)
    }

    applyGrantSettings()
    scheduleExpiryTimer()
    onUpdate?(grant)
    return grant
  }

  func revokeScreenTime(childUserId: String) throws -> ScreenTimeGrantRecord? {
    guard !childUserId.isEmpty else {
      throw ScreenTimeError.missingChildUserId
    }

    var revokedGrant: ScreenTimeGrantRecord?
    queue.sync {
      var grants = loadGrants()
      let now = Date()
      grants = grants.map { grant in
        guard grant.childUserId == childUserId else { return grant }
        var updated = grant
        updated.status = "revoked"
        updated.revokedAt = now
        updated.usedMinutesOverride = usedMinutes(for: updated, at: now)
        revokedGrant = updated
        return updated
      }
      grants.removeAll { $0.childUserId == childUserId }
      saveGrants(grants)
    }

    applyDefaultShielding()
    scheduleExpiryTimer()
    if let revokedGrant = revokedGrant {
      onUpdate?(revokedGrant)
    }
    return revokedGrant
  }

  func getScreenTimeStatus(childUserId: String?) -> (remainingMinutes: Int, activeGrants: [ScreenTimeGrantRecord]) {
    pruneExpiredGrants()
    let grants = queue.sync { loadGrants() }
    let activeGrants = grants.filter { grant in
      guard grant.status == "active" else { return false }
      if let childUserId = childUserId {
        return grant.childUserId == childUserId
      }
      return true
    }

    let now = Date()
    let remaining = activeGrants
      .map { remainingMinutes(for: $0, at: now) }
      .max() ?? 0

    return (remaining, activeGrants)
  }

  func syncGrantFromServer(grantData: [String: Any]) throws -> ScreenTimeGrantRecord {
    guard let grantId = grantData["grantId"] as? String,
          let childUserId = grantData["childUserId"] as? String,
          let familyId = grantData["familyId"] as? String else {
      throw ScreenTimeError.invalidPayload
    }

    let grantedMinutes = intValue(from: grantData["grantedMinutes"])
    guard grantedMinutes > 0 else {
      throw ScreenTimeError.invalidDuration
    }

    guard let grantedAt = dateValue(from: grantData["grantedAt"]),
          let expiresAt = dateValue(from: grantData["expiresAt"]) else {
      throw ScreenTimeError.invalidPayload
    }

    let status = (grantData["status"] as? String) ?? "active"
    let revokedAt = dateValue(from: grantData["revokedAt"])
    let allowedBundleIds = grantData["allowedAppBundleIds"] as? [String] ?? []
    let allowedCategories = grantData["allowedCategories"] as? [String] ?? []
    let grantedByUserId = grantData["grantedByUserId"] as? String ?? "server"
    let sourceTaskId = grantData["sourceTaskId"] as? String
    let usedMinutesOverride = intValue(from: grantData["usedMinutes"])

    var grant = ScreenTimeGrantRecord(
      grantId: grantId,
      childUserId: childUserId,
      familyId: familyId,
      grantedMinutes: grantedMinutes,
      grantedAt: grantedAt,
      expiresAt: expiresAt,
      status: status,
      revokedAt: revokedAt,
      allowedBundleIds: allowedBundleIds,
      allowedCategories: allowedCategories,
      grantedByUserId: grantedByUserId,
      sourceTaskId: sourceTaskId,
      usedMinutesOverride: usedMinutesOverride > 0 ? usedMinutesOverride : nil
    )

    let now = Date()
    if grant.status == "active", grant.expiresAt <= now {
      grant.status = "expired"
      grant.usedMinutesOverride = usedMinutes(for: grant, at: now)
    }

    queue.sync {
      var grants = loadGrants()
      grants.removeAll { $0.grantId == grantId }
      grants.append(grant)
      saveGrants(grants)
    }

    applyGrantSettings()
    scheduleExpiryTimer()
    onUpdate?(grant)
    return grant
  }

  func grantDictionary(_ grant: ScreenTimeGrantRecord) -> [String: Any] {
    let now = Date()
    let usedMinutes = usedMinutes(for: grant, at: now)
    let remainingMinutes = remainingMinutes(for: grant, at: now)
    var payload: [String: Any] = [
      "grantId": grant.grantId,
      "childUserId": grant.childUserId,
      "familyId": grant.familyId,
      "grantedMinutes": grant.grantedMinutes,
      "usedMinutes": usedMinutes,
      "remainingMinutes": remainingMinutes,
      "status": grant.status,
      "grantedAt": dateFormatter.string(from: grant.grantedAt),
      "expiresAt": dateFormatter.string(from: grant.expiresAt),
      "grantedByUserId": grant.grantedByUserId
    ]

    if let revokedAt = grant.revokedAt {
      payload["revokedAt"] = dateFormatter.string(from: revokedAt)
    }
    if let sourceTaskId = grant.sourceTaskId {
      payload["sourceTaskId"] = sourceTaskId
    }
    if !grant.allowedBundleIds.isEmpty {
      payload["allowedAppBundleIds"] = grant.allowedBundleIds
    }
    if !grant.allowedCategories.isEmpty {
      payload["allowedCategories"] = grant.allowedCategories
    }
    return payload
  }

  // MARK: - Private helpers

  private func usedMinutes(for grant: ScreenTimeGrantRecord, at date: Date) -> Int {
    if let override = grant.usedMinutesOverride {
      return min(grant.grantedMinutes, max(0, override))
    }
    let elapsed = max(0, date.timeIntervalSince(grant.grantedAt))
    return min(grant.grantedMinutes, Int(elapsed / 60))
  }

  private func remainingMinutes(for grant: ScreenTimeGrantRecord, at date: Date) -> Int {
    if grant.status != "active" {
      return 0
    }
    if date >= grant.expiresAt {
      return 0
    }
    return max(0, grant.grantedMinutes - usedMinutes(for: grant, at: date))
  }

  private func loadGrants() -> [ScreenTimeGrantRecord] {
    guard let data = UserDefaults.standard.data(forKey: defaultsKey) else {
      return []
    }
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return (try? decoder.decode([ScreenTimeGrantRecord].self, from: data)) ?? []
  }

  private func saveGrants(_ grants: [ScreenTimeGrantRecord]) {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    guard let data = try? encoder.encode(grants) else { return }
    UserDefaults.standard.set(data, forKey: defaultsKey)
  }

  private func pruneExpiredGrants() {
    queue.sync {
      let now = Date()
      var grants = loadGrants()
      var didExpire = false
      grants = grants.map { grant in
        guard grant.status == "active", grant.expiresAt <= now else { return grant }
        var updated = grant
        updated.status = "expired"
        updated.usedMinutesOverride = usedMinutes(for: updated, at: now)
        didExpire = true
        return updated
      }
      if didExpire {
        saveGrants(grants)
      }

      let stillActive = grants.filter { $0.status == "active" }
      if stillActive.isEmpty {
        applyDefaultShielding()
      }
    }
  }

  private func applyGrantSettings() {
    let now = Date()
    let grants = queue.sync { loadGrants() }
    let activeGrants = grants.filter { $0.status == "active" && $0.expiresAt > now }

    guard !activeGrants.isEmpty else {
      applyDefaultShielding()
      return
    }

    var allowAll = false
    var allowedBundleIds = Set<String>()
    var allowedCategories = Set<String>()

    for grant in activeGrants {
      if grant.allowedCategories.contains("all") {
        allowAll = true
        break
      }
      if grant.allowedBundleIds.isEmpty, grant.allowedCategories.isEmpty {
        allowAll = true
        break
      }
      allowedBundleIds.formUnion(grant.allowedBundleIds)
      allowedCategories.formUnion(grant.allowedCategories)
    }

    if allowAll {
      settingsStore.clearAllSettings()
      return
    }

    let applicationTokens = Set(allowedBundleIds.compactMap { bundleId in
      ApplicationToken(bundleIdentifier: bundleId)
    })

    let categoryTokens = Set(allowedCategories.compactMap { categoryId in
      categoryToken(from: categoryId)
    })

    settingsStore.clearAllSettings()

    if !applicationTokens.isEmpty {
      settingsStore.shield.applications = .all(except: applicationTokens)
      settingsStore.shield.applicationCategories = .none
    } else if !categoryTokens.isEmpty {
      settingsStore.shield.applications = .none
      settingsStore.shield.applicationCategories = .all(except: categoryTokens)
    } else {
      settingsStore.clearAllSettings()
    }
  }

  private func applyDefaultShielding() {
    settingsStore.clearAllSettings()
    settingsStore.shield.applications = .all
  }

  private func scheduleExpiryTimer() {
    timerQueue.sync {
      expiryTimer?.cancel()
      expiryTimer = nil
      let grants = queue.sync { loadGrants() }
      let activeGrants = grants.filter { $0.status == "active" }
      guard let nextExpiry = activeGrants.map(\.expiresAt).min() else { return }
      let interval = max(1, nextExpiry.timeIntervalSinceNow)
      let timer = DispatchSource.makeTimerSource(queue: timerQueue)
      timer.schedule(deadline: .now() + interval, leeway: .seconds(1))
      timer.setEventHandler { [weak self] in
        self?.expireGrantsIfNeeded()
      }
      expiryTimer = timer
      timer.resume()
    }
  }

  private func expireGrantsIfNeeded() {
    let now = Date()
    var expiredGrants: [ScreenTimeGrantRecord] = []
    queue.sync {
      var grants = loadGrants()
      grants = grants.map { grant in
        guard grant.status == "active", grant.expiresAt <= now else { return grant }
        var updated = grant
        updated.status = "expired"
        updated.usedMinutesOverride = usedMinutes(for: updated, at: now)
        expiredGrants.append(updated)
        return updated
      }
      if !expiredGrants.isEmpty {
        saveGrants(grants)
      }
    }

    if !expiredGrants.isEmpty {
      applyGrantSettings()
      expiredGrants.forEach { onUpdate?($0) }
    }
    scheduleExpiryTimer()
  }

  private func categoryToken(from identifier: String) -> ActivityCategoryToken? {
    switch identifier {
    case "games":
      return ActivityCategoryToken(.games)
    case "social":
      return ActivityCategoryToken(.socialNetworking)
    case "entertainment":
      return ActivityCategoryToken(.entertainment)
    case "education":
      return ActivityCategoryToken(.education)
    case "productivity":
      return ActivityCategoryToken(.productivity)
    default:
      return nil
    }
  }

  private func dateValue(from rawValue: Any?) -> Date? {
    if let date = rawValue as? Date {
      return date
    }
    if let string = rawValue as? String {
      return dateFormatter.date(from: string)
    }
    return nil
  }

  private func intValue(from rawValue: Any?) -> Int {
    if let value = rawValue as? NSNumber {
      return value.intValue
    }
    if let value = rawValue as? Int {
      return value
    }
    if let string = rawValue as? String, let parsed = Int(string) {
      return parsed
    }
    return 0
  }
}
