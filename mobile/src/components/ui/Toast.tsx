import React, { useEffect, useState } from 'react';
import { Animated, Text, ViewStyle } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number; // ms
  onHide?: () => void;
}

// Simple self-contained toast banner. Mount it conditionally near top of screen.
export const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 2500, onHide }) => {
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        onHide?.();
      });
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onHide, opacity]);

  const styleMap: Record<ToastType, ViewStyle> = {
    success: { backgroundColor: '#16a34a' },
    error: { backgroundColor: '#dc2626' },
    info: { backgroundColor: '#2563eb' },
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        opacity,
        ...styleMap[type],
      }}
    >
      <Text style={{ color: 'white', fontWeight: '600' }}>{message}</Text>
    </Animated.View>
  );
};
