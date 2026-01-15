import Foundation
import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16.0, *)
final class ShieldConfigurationManager: ShieldConfigurationDataSource {
  private let subtitleText = "Complete a task to unlock!"

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    return makeConfiguration()
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return makeConfiguration()
  }

  private func makeConfiguration() -> ShieldConfiguration {
    return ShieldConfiguration(
      backgroundBlurStyle: .systemChromeMaterial,
      backgroundColor: UIColor.systemIndigo.withAlphaComponent(0.85),
      icon: UIImage(systemName: "lock.fill"),
      title: ShieldConfiguration.Label(text: "Access Locked", color: UIColor.label),
      subtitle: ShieldConfiguration.Label(text: subtitleText, color: UIColor.secondaryLabel),
      primaryButtonLabel: ShieldConfiguration.Label(text: "OK", color: UIColor.label),
      secondaryButtonLabel: nil
    )
  }
}
