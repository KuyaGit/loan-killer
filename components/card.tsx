import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing, cardShadow } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type CardVariant = 'default' | 'elevated' | 'accent';

interface CardProps extends ViewProps {
  variant?: CardVariant;
}

export function Card({ variant = 'default', style, children, ...rest }: CardProps) {
  const scheme = useColorScheme();

  const cardBg = useThemeColor({}, 'card');
  const cardElevatedBg = useThemeColor({}, 'cardElevated');
  const primaryBg = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  const isAccent = variant === 'accent';
  const bg = isAccent ? primaryBg : variant === 'elevated' ? cardElevatedBg : cardBg;
  const shadow = cardShadow(scheme, { strong: variant !== 'default' });

  // In light mode, shadow separates from background — no border needed.
  // In dark mode or accent, add a hairline border.
  const hasBorder = scheme === 'dark' || isAccent;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg },
        shadow,
        hasBorder && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isAccent ? primary + '40' : border,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
});
