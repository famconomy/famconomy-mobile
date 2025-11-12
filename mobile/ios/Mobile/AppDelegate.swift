import UIKit
import React
@main
class AppDelegate: RCTAppDelegate {
  override init() {
    super.init()
    moduleName = "Mobile"
    initialProps = [:]
  }

  override func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "src/main")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
