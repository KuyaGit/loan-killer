/**
 * AnimatedSplash — full-screen JS overlay that hands off seamlessly from the
 * native expo-splash-screen and plays a 3s logo animation before revealing
 * the rest of the app.
 *
 * Layering contract:
 *   <AnimatedSplash>
 *     <Suspense> → <SQLiteProvider> → <LockGate> → … (real app)
 *   </AnimatedSplash>
 *
 * The overlay sits outside Suspense/SQLite so it masks the ActivityIndicator
 * fallback during DB migration AND the biometric-prompt warm-up inside LockGate.
 *
 * Native splash handoff (avoids white flash):
 *   1. preventAutoHideAsync() is called at module scope in _layout.tsx.
 *   2. This overlay renders with the EXACT same background (#ffffff / #000000)
 *      and the same logo image, so when the native splash hides the transition
 *      is visually imperceptible.
 *   3. hideAsync() is called only after the overlay's first onLayout, guarded
 *      by a ref so it fires exactly once.
 *   4. After 3s the overlay fades out, revealing children.
 *
 * Colors: hardcoded splash config literals — do NOT use theme.background tokens
 * (#f4f7f9 / #0e1417), which are different from the native splash background.
 *
 * React Compiler safe: no manual useMemo/useCallback around Reanimated hooks.
 */

import * as SplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Must match expo-splash-screen plugin backgroundColor / dark.backgroundColor
const SPLASH_BG_LIGHT = '#ffffff';
const SPLASH_BG_DARK  = '#000000';

// Logo rendered at imageWidth: 200 (same as native splash plugin config)
const LOGO_SIZE = 200;

// Total animation duration breakdown:
//   0–0.6s  fade-in + scale 0.85 → 1.05 → 1.0
//   0.6–2.4s  gentle pulse 1.0 → 1.03 → 1.0
//   2.4–3.0s  overlay fade-out

interface AnimatedSplashProps {
  children: React.ReactNode;
}

export function AnimatedSplash({ children }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const [done, setDone] = useState(false);

  // Native splash hide guard — fires once after overlay first paints
  const splashHidden = useRef(false);

  const logoOpacity = useSharedValue(0);
  const logoScale   = useSharedValue(0.85);
  const overlayOpacity = useSharedValue(1);

  // Kick off animation on mount
  useEffect(() => {
    // Fade-in + overshoot settle (0–600ms)
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSequence(
      withTiming(1.05, { duration: 350 }),
      withTiming(1.0,  { duration: 250 }),
      // Gentle pulse (600–2400ms)
      withDelay(200, withSequence(
        withTiming(1.03, { duration: 400 }),
        withTiming(1.0,  { duration: 400 }),
      )),
      // Fade out overlay (2400–3000ms)
      withDelay(
        400,
        withTiming(1, { duration: 0 }), // no-op scale hold
      ),
    );

    // Overlay dissolve starts at 2400ms
    overlayOpacity.value = withDelay(
      2400,
      withTiming(0, { duration: 600 }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setDone)(true);
        }
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  function handleLogoLayout() {
    if (splashHidden.current) return;
    splashHidden.current = true;
    // Give the overlay one more frame to composite before hiding native splash
    requestAnimationFrame(async () => {
      try {
        SplashScreen.setOptions({ duration: 200, fade: true });
        await SplashScreen.hideAsync();
      } catch {
        // Ignore — already hidden or not shown (e.g. Expo Go fast refresh)
      }
    });
  }

  const bg = colorScheme === 'dark' ? SPLASH_BG_DARK : SPLASH_BG_LIGHT;

  return (
    <View style={styles.root}>
      {/* App tree — always mounted so LockGate biometrics warm up underneath */}
      {children}

      {/* Overlay — unmounts once animation finishes */}
      {!done && (
        <Animated.View
          style={[styles.overlay, overlayStyle, { backgroundColor: bg }]}
          pointerEvents="none"
        >
          <Animated.View style={logoStyle}>
            <Image
              source={require('@/assets/images/splash-icon.png')}
              style={styles.logo}
              contentFit="contain"
              onLayout={handleLogoLayout}
            />
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
});
