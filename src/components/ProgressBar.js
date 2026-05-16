import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../utils/constants';

const ProgressBar = ({ percent = 0, showLabel = false, height = 4, color, style }) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const barColor = color || (clampedPercent === 100 ? COLORS.success : COLORS.primary);

  return (
    <View style={[styles.wrapper, style]}>
      {showLabel && (
        <Text style={styles.label}>{clampedPercent}%</Text>
      )}
      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPercent}%`, height, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: SIZES.xs,
    fontWeight: '600',
    textAlign: 'right',
  },
  track: {
    backgroundColor: COLORS.border,
    borderRadius: SIZES.borderRadiusFull,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: SIZES.borderRadiusFull,
  },
});

export default ProgressBar;
