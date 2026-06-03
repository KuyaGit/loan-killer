/**
 * Thin wrapper around expo-local-authentication.
 *
 * Uses the device's biometrics (Face ID / fingerprint) with automatic PIN fallback.
 * The caller never deals with the raw expo-local-authentication API directly.
 */

import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Perform a biometric/PIN authentication challenge.
 *
 * @param prompt Human-readable reason shown on the OS prompt (e.g. "Unlock Loan Logs")
 * @returns `true` when authentication succeeded, `false` when it was canceled or failed.
 */
export async function authenticate(prompt: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      cancelLabel: 'Cancel',
      // disableDeviceFallback defaults to false → PIN/passcode fallback is allowed
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Returns whether the device has biometric hardware AND has enrolled biometrics,
 * OR whether a device PIN/passcode is available as a fallback.
 *
 * Practically: always returns true on any modern locked device;
 * false only on emulators / stripped devices with zero security configured.
 */
export async function isAuthAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    // If hardware exists and something is enrolled (biometrics OR passcode) → available
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}
