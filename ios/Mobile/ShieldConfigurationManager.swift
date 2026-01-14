import Foundation
import ManagedSettingsUI
import UIKit

@available(iOS 16.0, *)
final class ShieldConfigurationManager: ShieldConfigurationDataSource {
  private let subtitleText = "Complete a task to unlock!"

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    return makeConfiguration()
  }

  override func configuration(shielding applicationCategory: ActivityCategory) -> ShieldConfiguration {
    return makeConfiguration()
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return makeConfiguration()
  }

  override func configuration(shielding webDomainCategory: ActivityCategory) -> ShieldConfiguration {
    return makeConfiguration()
  }

  private func makeConfiguration() -> ShieldConfiguration {
    return ShieldConfiguration(
      backgroundBlurStyle: .systemChromeMaterial,
      backgroundColor: UIColor.systemIndigo.withAlphaComponent(0.85),
      icon: UIImage(systemName: "lock.fill"),
      title: ShieldConfiguration.Label(text: "Access Locked"),
      subtitle: ShieldConfiguration.Label(text: subtitleText),
      primaryButtonLabel: ShieldConfiguration.Label(text: "OK"),
      secondaryButtonLabel: nil
    )
  }
}
