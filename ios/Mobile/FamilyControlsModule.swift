import Foundation
import FamilyControls

@available(iOS 16.0, *)
@objc(FamilyControlsModule)
final class FamilyControlsModule: RCTEventEmitter {
  private let screenTimeManager = ScreenTimeManager()

  override init() {
    super.init()
    screenTimeManager.onUpdate = { [weak self] grant in
      self?.sendEvent(withName: "onScreenTimeUpdate", body: self?.screenTimeManager.grantDictionary(grant) ?? [:])
    }
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["onScreenTimeUpdate"]
  }

  @objc
  func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    screenTimeManager.requestAuthorization { result in
      switch result {
      case .success(let authorized):
        resolve(authorized)
      case .failure(let error):
        reject("AUTH_REQUEST_FAILED", error.localizedDescription, error)
      }
    }
  }

  @objc
  func isAuthorized(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(screenTimeManager.isAuthorized())
  }

  @objc
  func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(screenTimeManager.authorizationStatusString())
  }

  @objc
  func grantScreenTime(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let childUserId = options["childUserId"] as? String ?? ""
      let durationMinutes = (options["durationMinutes"] as? NSNumber)?.intValue ?? 0
      let allowedBundleIds = options["allowedBundleIds"] as? [String]
      let allowedCategories = options["allowedCategories"] as? [String]

      let grant = try screenTimeManager.grantScreenTime(
        childUserId: childUserId,
        durationMinutes: durationMinutes,
        allowedBundleIds: allowedBundleIds,
        allowedCategories: allowedCategories
      )

      let remainingMinutes = screenTimeManager
        .getScreenTimeStatus(childUserId: childUserId)
        .remainingMinutes

      resolve([
        "success": true,
        "remainingMinutes": remainingMinutes,
        "grant": screenTimeManager.grantDictionary(grant)
      ])
    } catch {
      reject("GRANT_FAILED", error.localizedDescription, error)
    }
  }

  @objc
  func revokeScreenTime(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let childUserId = options["childUserId"] as? String ?? ""
      let revokedGrant = try screenTimeManager.revokeScreenTime(childUserId: childUserId)
      resolve([
        "success": true,
        "revokedGrant": revokedGrant != nil ? screenTimeManager.grantDictionary(revokedGrant!) : NSNull()
      ])
    } catch {
      reject("REVOKE_FAILED", error.localizedDescription, error)
    }
  }

  @objc
  func getScreenTimeStatus(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let childUserId = options["childUserId"] as? String
    let status = screenTimeManager.getScreenTimeStatus(childUserId: childUserId)
    let activeGrants = status.activeGrants.map { screenTimeManager.grantDictionary($0) }
    resolve([
      "remainingMinutes": status.remainingMinutes,
      "activeGrants": activeGrants
    ])
  }

  @objc
  func syncGrantFromServer(
    _ grantData: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let grant = try screenTimeManager.syncGrantFromServer(
        grantData: grantData as? [String: Any] ?? [:]
      )
      resolve([
        "success": true,
        "grant": screenTimeManager.grantDictionary(grant)
      ])
    } catch {
      reject("SYNC_FAILED", error.localizedDescription, error)
    }
  }
}
