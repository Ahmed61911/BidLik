/**
 * Syncs the persisted colorScheme preference (appStore) into NativeWind's
 * runtime color scheme, and reports the *effective* scheme (resolving
 * "system") so the NavigationContainer theme and status bar can follow it.
 */
import { useEffect } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { useAppStore } from "@/store/appStore";

export function useAppTheme(): "light" | "dark" {
  const pref = useAppStore((s) => s.colorScheme);
  const device = useDeviceColorScheme();
  const { setColorScheme } = useNativewindColorScheme();

  useEffect(() => {
    setColorScheme(pref);
  }, [pref, setColorScheme]);

  return pref === "system" ? (device === "dark" ? "dark" : "light") : pref;
}
