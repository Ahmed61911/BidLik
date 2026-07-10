/**
 * Role-agnostic in-app notification store — the single source for the shared
 * NotificationsScreen (both acheteur and vendeur) and the unread badge.
 * Reads the same `notifications` table the webapp uses (RLS scopes it to the
 * current user), and subscribes to realtime INSERT/UPDATE so the badge and
 * list update live. This is the in-app half of the notification system whose
 * push half is the Phase 3 backend (send-push) — both share one source of
 * truth: a row in `notifications`.
 */
import { create } from "zustand";
import { supabase } from "@/services/supabase/client";
import type { Notification, NotifType } from "@/types";

interface NotificationsState {
  notifications: Notification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  unreadCount: () => number;
}

async function fetchNotifications(uid: string): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as NotifType,
    titre: n.titre,
    message: n.message,
    createdAt: n.created_at,
    read: n.read,
    auctionId: n.auction_id ?? undefined,
  }));
}

let refreshing = false;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  loading: true,

  async refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        set({ notifications: [], loading: false });
        return;
      }
      const notifications = await fetchNotifications(uid);
      set({ notifications, loading: false });
    } finally {
      refreshing = false;
    }
  },

  async markRead(id) {
    // Optimistic — reflect the read state immediately, reconcile via realtime.
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  },

  async markAllRead() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
  },

  unreadCount() {
    return get().notifications.filter((n) => !n.read).length;
  },
}));

let installed = false;
export function initNotificationsStore() {
  if (installed) return;
  installed = true;

  void useNotificationsStore.getState().refresh();

  supabase.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    void useNotificationsStore.getState().refresh();
  });

  supabase
    .channel("notifications-center")
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void useNotificationsStore.getState().refresh())
    .subscribe();
}
