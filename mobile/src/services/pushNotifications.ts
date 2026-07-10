/**
 * Push notifications via Expo's push service (see architecture plan §7).
 * All entry points are best-effort and non-fatal: on a simulator, without an
 * EAS projectId, or if the user denies permission, the app keeps working with
 * in-app notifications only.
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "@/services/supabase/client";
import { routeNotification } from "./notificationRouting";
import type { NotifType } from "@/types";

// Show a banner + play a sound even when the app is foregrounded — parity with
// the OS behavior when backgrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface PushData {
  type?: NotifType;
  notification_id?: string;
  auction_id?: string | null;
}

// register_push_token / unregister_push_token were added by the Phase 3 backend
// migration, which post-dates the checked-in generated database.types.ts — cast
// through a loose signature until those types are regenerated against the DB.
const rpcLoose = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "Bidlik",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#E94E2C",
  });
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/**
 * Requests permission, obtains the Expo push token, and registers it against
 * the current user via the register_push_token RPC (Phase 3 backend). Safe to
 * call repeatedly (e.g. after every login). Returns the token or null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null; // no push on simulators/emulators

    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== "granted") return null;

    const projectId = getProjectId();
    if (!projectId) {
      // Dev build without EAS configured — can't mint an Expo push token.
      console.warn("[push] no EAS projectId; skipping token registration (in-app notifications still work).");
      return null;
    }

    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenRes.data;

    const { error } = await rpcLoose("register_push_token", {
      p_token: token,
      p_platform: Platform.OS === "ios" ? "ios" : "android",
    });
    if (error) console.warn("[push] register_push_token failed", error.message);

    return token;
  } catch (e) {
    console.warn("[push] registration failed", e);
    return null;
  }
}

/** Unregister the current device token (called on logout). Best-effort. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const projectId = getProjectId();
    if (!projectId || !Device.isDevice) return;
    const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
    await rpcLoose("unregister_push_token", { p_token: tokenRes.data });
  } catch {
    /* ignore */
  }
}

/**
 * Wires tap handlers so notifications deep-link into the right screen. Also
 * handles the cold-start case (app opened by tapping a notification while
 * killed). Returns a cleanup function.
 */
export function setupNotificationTapHandling(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as PushData;
    if (data?.type) routeNotification({ type: data.type, auctionId: data.auction_id });
  });

  // Cold start: app was launched by a notification tap.
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    const data = response?.notification.request.content.data as PushData | undefined;
    if (data?.type) routeNotification({ type: data.type, auctionId: data.auction_id });
  });

  return () => sub.remove();
}
