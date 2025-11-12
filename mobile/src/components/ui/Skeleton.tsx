import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

type Dimension = number | `${number}%`;

interface SkeletonProps {
  width?: Dimension;
  height?: number;
  radius?: number;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lightweight skeleton placeholder. Keep it simple (no shimmer) for stability.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  radius = 8,
  isDark = false,
  style,
}) => {
  const baseColor = isDark ? '#374151' : '#e5e7eb';
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    />
  );
};

export const SkeletonRow: React.FC<{
  count?: number;
  gap?: number;
  isDark?: boolean;
  itemHeight?: number;
}> = ({ count = 3, gap = 12, isDark = false, itemHeight = 14 }) => {
  return (
    <View style={{ flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton key={idx} height={itemHeight} isDark={isDark} />
      ))}
    </View>
  );
};
