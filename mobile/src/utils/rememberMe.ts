/**
 * "Remember me" preference — independent of Supabase's own token persistence
 * (which is always encrypted-persisted, see largeSecureStore.ts). When off,
 * a fully-restarted app signs the user back out even though a valid session
 * blob still exists on disk, forcing a fresh login each cold start. Session
 * survival across simple backgrounding (not a full restart) is unaffected.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "bidlik-remember-me";

export async function getRememberMe(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === null ? true : value === "true";
}

export async function setRememberMe(remember: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, remember ? "true" : "false");
}
