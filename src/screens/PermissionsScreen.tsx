/**
 * Permissions Screen
 * 
 * Guides parents through FamilyControls setup (iOS) or
 * Device Policy Manager enrollment (Android).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FamilyControlsBridge } from '../native/FamilyControlsBridge';
import { showPermissionsGuide, checkAndroidPermissions } from '../native/AndroidPermissionsHelper';

interface PermissionsScreenProps {
  onComplete: () => void;
}

export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  onComplete,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleEnableScreenTime() {
    setIsRequesting(true);

    try {
      if (Platform.OS === 'ios') {
        const authorized = await FamilyControlsBridge.requestAuthorization();
        if (authorized) {
          onComplete();
        } else {
          Alert.alert(
            'Authorization Required',
            'FamConomy needs Screen Time access to manage your children\'s device usage. Please enable it in Settings.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Skip for Now', onPress: onComplete, style: 'cancel' },
            ]
          );
        }
      } else {
        // Android - use guided permissions flow
        showPermissionsGuide(async () => {
          // Check if all permissions were granted
          const status = await checkAndroidPermissions();
          if (status.allGranted) {
            onComplete();
          } else {
            Alert.alert(
              'Permissions Incomplete',
              'Some permissions were not granted. Screen time features may be limited.',
              [
                { text: 'Try Again', onPress: handleEnableScreenTime },
                { text: 'Continue Anyway', onPress: onComplete },
              ]
            );
          }
        });
      }
    } catch (error) {
      console.error('[Permissions] Error:', error);
      Alert.alert(
        'Error',
        'Failed to enable screen time management. You can try again later in Settings.',
        [{ text: 'Continue', onPress: onComplete }]
      );
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏱️</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Enable Screen Time Management</Text>

        {/* Description */}
        <Text style={styles.description}>
          {Platform.OS === 'ios'
            ? 'FamConomy uses Apple\'s Screen Time API to help you manage your children\'s device usage. When they complete tasks, they\'ll earn screen time automatically!'
            : 'FamConomy needs Device Administrator access to manage app usage on your children\'s devices. When they complete tasks, they\'ll earn screen time automatically!'}
        </Text>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            emoji="✅"
            text="Automatically reward completed tasks with screen time"
          />
          <FeatureItem
            emoji="📱"
            text="Set daily limits and allowed hours"
          />
          <FeatureItem
            emoji="🔒"
            text="Block distracting apps during homework time"
          />
          <FeatureItem
            emoji="📊"
            text="View usage reports and activity"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEnableScreenTime}
            disabled={isRequesting}
          >
            <Text style={styles.primaryButtonText}>
              {isRequesting ? 'Setting Up...' : 'Enable Screen Time'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onComplete}
          >
            <Text style={styles.secondaryButtonText}>
              Skip for Now
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          Your data stays private. Screen time is managed locally on each device.
        </Text>
      </View>
    </SafeAreaView>
  );
};

interface FeatureItemProps {
  emoji: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ emoji, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  privacyNote: {
    marginTop: 24,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default PermissionsScreen;
