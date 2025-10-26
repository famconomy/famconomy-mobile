import Foundation

class PollingManager {
  private let config: InitConfig
  private weak var delegate: FamilyControlsNativeModule?
  private var activePollings: [String: PollingSession] = [:]
  private let pollingLock = NSLock()
  private var timers: [String: Timer] = [:]
  
  init(config: InitConfig, delegate: FamilyControlsNativeModule) {
    self.config = config
    self.delegate = delegate
  }
  
  func startPolling(options: PollingOptions) throws -> PollingResult {
    let pollingId = UUID().uuidString
    let nextPollAt = Date().addingTimeInterval(TimeInterval(options.intervalSeconds)).timeIntervalSince1970
    
    let session = PollingSession(
      id: pollingId,
      options: options,
      startedAt: Date().timeIntervalSince1970,
      nextPollAt: nextPollAt
    )
    
    pollingLock.lock()
    activePollings[pollingId] = session
    pollingLock.unlock()
    
    // Start timer for polling
    let timer = Timer.scheduledTimer(withTimeInterval: TimeInterval(options.intervalSeconds), repeats: true) { [weak self] _ in
      self?.performPoll(pollingId: pollingId)
    }
    
    timers[pollingId] = timer
    
    return PollingResult(
      success: true,
      pollingId: pollingId,
      startedAt: session.startedAt,
      nextPollAt: nextPollAt
    )
  }
  
  func stopPolling(pollingId: String) throws -> [String: Any] {
    pollingLock.lock()
    let session = activePollings.removeValue(forKey: pollingId)
    pollingLock.unlock()
    
    if let timer = timers[pollingId] {
      timer.invalidate()
      timers.removeValue(forKey: pollingId)
    }
    
    guard session != nil else {
      throw NSError(domain: "PollingManager", code: -1, userInfo: ["message": "Polling session not found"])
    }
    
    return [
      "success": true,
      "stoppedAt": Date().timeIntervalSince1970,
      "totalUpdates": session?.updateCount ?? 0
    ]
  }
  
  private func performPoll(pollingId: String) {
    pollingLock.lock()
    guard var session = activePollings[pollingId] else {
      pollingLock.unlock()
      return
    }
    
    session.updateCount += 1
    session.nextPollAt = Date().addingTimeInterval(TimeInterval(session.options.intervalSeconds)).timeIntervalSince1970
    activePollings[pollingId] = session
    pollingLock.unlock()
    
    // Emit polling update event
    delegate?.sendEvent(withName: "POLLING_UPDATE", body: [
      "pollingId": pollingId,
      "updateCount": session.updateCount,
      "timestamp": Date().timeIntervalSince1970
    ])
  }
}

// MARK: - Supporting Types

struct PollingSession {
  let id: String
  let options: PollingOptions
  let startedAt: TimeInterval
  var nextPollAt: TimeInterval
  var updateCount: Int = 0
  var errorCount: Int = 0
}
