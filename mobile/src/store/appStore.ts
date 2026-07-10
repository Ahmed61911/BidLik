/**
 * App/client state that isn't "the auth session" — active role (for users who
 * hold both acheteur and vendeur), theme, biometric-lock and notification
 * preferences. See architecture plan §6. Persisted so the role/theme/lock
 * choice survives an app restart.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MobileRole } from "@/types/auth";

interface AppState {
  activeRole: MobileRole | null;
  setActiveRole: (role: MobileRole) => void;
  colorScheme: "light" | "dark" | "system";
  setColorScheme: (scheme: "light" | "dark" | "system") => void;
  biometricLockEnabled: boolean;
  setBiometricLockEnabled: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeRole: null,
      setActiveRole: (role) => set({ activeRole: role }),
      colorScheme: "system",
      setColorScheme: (colorScheme) => set({ colorScheme }),
      biometricLockEnabled: false,
      setBiometricLockEnabled: (biometricLockEnabled) => set({ biometricLockEnabled }),
    }),
    {
      name: "bidlik-app-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
