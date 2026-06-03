import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

interface ProgressBarProps {
  /** Progress value between 0 and 1 */
  value: number;
  /** Height of the bar in pixels */
  height?: number;
  /** Override the fill color (defaults to theme primary) */
  color?: string;
  /** Override the track color */
  trackColor?: string;
  /** Border radius override (defaults to pill) */
  borderRadius?: number;
}

export function ProgressBar({
  value,
  height = 8,
  color,
  trackColor,
  borderRadius = Radius.pill,
}: ProgressBarProps) {
  const primary = useThemeColor({}, 'primary');
  const track = useThemeColor({}, 'track');

  const clampedValue = Math.min(1, Math.max(0, value));
  const fillColor = color ?? primary;
  const trackBg = trackColor ?? track;

  return (
    <View
      style={[styles.track, { height, borderRadius, backgroundColor: trackBg }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedValue * 100) }}>
      <View
        style={[
          styles.fill,
          { width: `${clampedValue * 100}%`, height, borderRadius, backgroundColor: fillColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
