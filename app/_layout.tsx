import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AnimatedSplash } from '@/components/animated-splash';
import { LockGate } from '@/components/lock-gate';
import { migrate } from '@/services/database';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the native splash visible until the JS overlay is ready to take over.
// Must be called at module scope (un-awaited) — calling inside a component
// risks running after the native splash has already auto-hidden.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function LoadingFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AnimatedSplash>
      <Suspense fallback={<LoadingFallback />}>
        <SQLiteProvider databaseName="loanlogs.db" onInit={migrate}>
          <LockGate>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="loan/[id]"
                  options={{ title: 'Loan Details', headerBackTitle: 'Loans' }}
                />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </LockGate>
        </SQLiteProvider>
      </Suspense>
    </AnimatedSplash>
  );
}
