// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Loan Logs tab icons
  'chart.bar.fill': 'bar-chart',
  'list.bullet': 'list',
  'plus.circle.fill': 'add-circle',
  'gearshape.fill': 'settings',
  // Loan Logs UI icons
  'checkmark.circle.fill': 'check-circle',
  'circle': 'radio-button-unchecked',
  'trash': 'delete',
  'square.and.arrow.up': 'share',
  'square.and.arrow.down': 'download',
  'magnifyingglass': 'search',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle.fill': 'warning',
  'checkmark.seal.fill': 'verified',
  'banknote': 'account-balance',
  'calendar': 'calendar-today',
  'lock.fill': 'lock',
  // Loan Logs aesthetic icons
  'creditcard.fill': 'credit-card',
  'chart.pie.fill': 'pie-chart',
  'calendar.badge.clock': 'event',
  'tray': 'inbox',
  'info.circle.fill': 'info',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'checkmark.circle': 'check-circle-outline',
  // App lock icons
  'faceid': 'fingerprint',
  'lock.shield.fill': 'security',
  // Edit
  'pencil': 'edit',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
