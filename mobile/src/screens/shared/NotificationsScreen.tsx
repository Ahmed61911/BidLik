import { useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import {
  Bell,
  Gavel,
  Trophy,
  XCircle,
  Clock,
  ShieldCheck,
  CreditCard,
  Truck,
  Megaphone,
  Info,
  type LucideIcon,
} from "lucide-react-native";
import { useNotificationsStore } from "@/store/notificationsStore";
import { routeNotification } from "@/services/notificationRouting";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Notification, NotifType } from "@/types";

const TYPE_ICON: Record<NotifType, { icon: LucideIcon; color: string }> = {
  outbid: { icon: Gavel, color: "#DC2626" },
  won: { icon: Trophy, color: "#16A34A" },
  lost: { icon: XCircle, color: "#6B7280" },
  ending_soon: { icon: Clock, color: "#D97706" },
  auction_starting: { icon: Gavel, color: "#1F2D4D" },
  caution: { icon: ShieldCheck, color: "#16A34A" },
  payment_approved: { icon: CreditCard, color: "#16A34A" },
  payment_rejected: { icon: CreditCard, color: "#DC2626" },
  vehicle_ready: { icon: Truck, color: "#16A34A" },
  announcement: { icon: Megaphone, color: "#E94E2C" },
  system: { icon: Info, color: "#6B7280" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function NotificationRow({ item, onPress }: { item: Notification; onPress: () => void }) {
  const meta = TYPE_ICON[item.type] ?? TYPE_ICON.system;
  const Icon = meta.icon;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row gap-3 border-b border-border px-4 py-3 active:opacity-80 ${item.read ? "" : "bg-accent/5"}`}
    >
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-secondary">
        <Icon size={18} color={meta.color} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-start justify-between gap-2">
          <Text className={`flex-1 text-sm ${item.read ? "font-medium" : "font-bold"} text-foreground`}>{item.titre}</Text>
          {!item.read ? <View className="mt-1.5 h-2 w-2 rounded-full bg-accent" /> : null}
        </View>
        <Text className="mt-0.5 text-sm text-muted-foreground">{item.message}</Text>
        <Text className="mt-1 text-xs text-muted-foreground">{timeAgo(item.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export function NotificationsScreen() {
  const notifications = useNotificationsStore((s) => s.notifications);
  const refresh = useNotificationsStore((s) => s.refresh);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const unread = notifications.filter((n) => !n.read).length;
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function onPressNotification(n: Notification) {
    if (!n.read) void markRead(n.id);
    routeNotification({ type: n.type, auctionId: n.auctionId });
  }

  return (
    <View className="flex-1 bg-background">
      {unread > 0 ? (
        <View className="flex-row items-center justify-between border-b border-border px-4 py-2">
          <Text className="text-xs text-muted-foreground">
            {unread} non {unread > 1 ? "lues" : "lue"}
          </Text>
          <Pressable onPress={() => markAllRead()} hitSlop={6}>
            <Text className="text-xs font-semibold text-accent">Tout marquer comme lu</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => <NotificationRow item={item} onPress={() => onPressNotification(item)} />}
        ListEmptyComponent={
          <EmptyState icon={Bell} title="Aucune notification" subtitle="Vos alertes d'enchères et de paiements apparaîtront ici." />
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}
