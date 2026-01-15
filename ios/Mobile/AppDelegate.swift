import UIKit
import React
import UserNotifications

/// Protocol to decouple AppDelegate from PushNotificationModule at compile time
@objc protocol PushNotificationHandler {
  func updateDeviceToken(_ token: String)
  func handleNotificationReceived(title: String?, body: String?, userInfo: [AnyHashable: Any])
  func handleNotificationOpened(title: String?, body: String?, userInfo: [AnyHashable: Any])
}

/// Global reference set by PushNotificationModule on init
var pushNotificationHandler: PushNotificationHandler?

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {
  override init() {
    super.init()
    moduleName = "Mobile"
    initialProps = [:]
  }

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    pushNotificationHandler?.updateDeviceToken(token)
  }

  override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    // Intentionally no-op; JS can retry via requestPermissions.
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let content = notification.request.content
    pushNotificationHandler?.handleNotificationReceived(
      title: content.title,
      body: content.body,
      userInfo: content.userInfo
    )
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let content = response.notification.request.content
    pushNotificationHandler?.handleNotificationOpened(
      title: content.title,
      body: content.body,
      userInfo: content.userInfo
    )
    completionHandler()
  }
}
