import { createNavigationContainerRef } from "@react-navigation/native";

/**
 * Global navigation ref — lets code outside the React tree (push-notification
 * tap handlers) drive navigation. Wired into the NavigationContainer in App.tsx.
 */
export const navigationRef = createNavigationContainerRef();

export function navigateWhenReady(action: () => void) {
  if (navigationRef.isReady()) {
    action();
  } else {
    // Container not mounted yet (cold start from a notification tap) — retry
    // briefly until it is.
    const id = setInterval(() => {
      if (navigationRef.isReady()) {
        clearInterval(id);
        action();
      }
    }, 100);
    // Give up after 5s so we never leak the interval.
    setTimeout(() => clearInterval(id), 5000);
  }
}
