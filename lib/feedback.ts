/**
 * Haptic + audio feedback helpers for warehouse operations.
 * Uses navigator.vibrate with silent fallback.
 */

export function success() {
  try {
    navigator.vibrate?.(100);
  } catch {
    // silent fallback
  }
}

export function error() {
  try {
    navigator.vibrate?.([100, 50, 100, 50, 100]);
  } catch {
    // silent fallback
  }
}

export function warning() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // silent fallback
  }
}
