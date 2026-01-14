import Foundation
import UserNotifications
import UIKit

@objc(PushNotificationModule)
final class PushNotificationModule: RCTEventEmitter {
  static weak var shared: PushNotificationModule?

  private let tokenKey = "famconomy_apns_device_token"
  private let deviceIdKey = "famconomy_device_id"
  private let pendingQueue = DispatchQueue(label: "com.famconomy.push.pending")
  private var pendingNotifications: [[String: Any]] = []
  private var pendingOpened: [[String: Any]] = []

  override init() {
    super.init()
    PushNotificationModule.shared = self
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc
  override func supportedEvents() -> [String]! {
    return ["onNotificationReceived", "onNotificationOpened"]
  }

  @objc
  func requestPermissions(
    _ options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let alert = options["alert"] as? Bool ?? true
    let badge = options["badge"] as? Bool ?? true
    let sound = options["sound"] as? Bool ?? true

    var authOptions: UNAuthorizationOptions = []
    if alert { authOptions.insert(.alert) }
    if badge { authOptions.insert(.badge) }
    if sound { authOptions.insert(.sound) }

    UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
      if let error = error {
        reject("PERMISSION_ERROR", error.localizedDescription, error)
        return
      }

      DispatchQueue.main.async {
        UIApplication.shared.registerForRemoteNotifications()
      }

      UNUserNotificationCenter.current().getNotificationSettings { settings in
        let result: [String: Any] = [
          "alert": settings.alertSetting == .enabled,
          "badge": settings.badgeSetting == .enabled,
          "sound": settings.soundSetting == .enabled
        ]
        resolve(result)
      }
    }
  }

  @objc
  func getDeviceToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if let token = UserDefaults.standard.string(forKey: tokenKey) {
      resolve(token)
    } else {
      reject("TOKEN_NOT_AVAILABLE", "APNs device token not available yet", nil)
    }
  }

  @objc
  func getDeviceId(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if let id = UIDevice.current.identifierForVendor?.uuidString {
      resolve(id)
      return
    }
    if let stored = UserDefaults.standard.string(forKey: deviceIdKey) {
      resolve(stored)
      return
    }
    let generated = UUID().uuidString
    UserDefaults.standard.set(generated, forKey: deviceIdKey)
    resolve(generated)
  }

  @objc
  func setBadgeCount(
    _ count: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      UIApplication.shared.applicationIconBadgeNumber = count.intValue
      resolve(true)
    }
  }

  @objc
  func clearAllNotifications(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    DispatchQueue.main.async {
      UIApplication.shared.applicationIconBadgeNumber = 0
      resolve(true)
    }
  }

  func updateDeviceToken(_ token: String) {
    UserDefaults.standard.set(token, forKey: tokenKey)
  }

  func handleNotificationReceived(
    title: String?,
    body: String?,
    userInfo: [AnyHashable: Any]
  ) {
    let payload = notificationPayload(title: title, body: body, userInfo: userInfo)
    sendOrQueue(event: "onNotificationReceived", payload: payload, store: &pendingNotifications)
  }

  func handleNotificationOpened(
    title: String?,
    body: String?,
    userInfo: [AnyHashable: Any]
  ) {
    let payload = notificationPayload(title: title, body: body, userInfo: userInfo)
    sendOrQueue(event: "onNotificationOpened", payload: payload, store: &pendingOpened)
  }

  override func startObserving() {
    flushPending()
  }

  private func flushPending() {
    pendingQueue.sync {
      for payload in pendingNotifications {
        sendEvent(withName: "onNotificationReceived", body: payload)
      }
      for payload in pendingOpened {
        sendEvent(withName: "onNotificationOpened", body: payload)
      }
      pendingNotifications.removeAll()
      pendingOpened.removeAll()
    }
  }

  private func sendOrQueue(
    event: String,
    payload: [String: Any],
    store: inout [[String: Any]]
  ) {
    pendingQueue.sync {
      if self.bridge != nil {
        sendEvent(withName: event, body: payload)
      } else {
        store.append(payload)
      }
    }
  }

  private func notificationPayload(
    title: String?,
    body: String?,
    userInfo: [AnyHashable: Any]
  ) -> [String: Any] {
    var payload: [String: Any] = [
      "title": title ?? "",
      "body": body ?? ""
    ]

    let data = userInfo.reduce(into: [String: Any]()) { result, entry in
      if let key = entry.key as? String {
        result[key] = entry.value
      }
    }
    if !data.isEmpty {
      payload["data"] = data
    }
    if let type = userInfo["type"] as? String {
      payload["type"] = type
    }
    return payload
  }
}
