import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";

/**
 * Shows a thin banner while offline. Data already loaded stays visible from
 * the persisted TanStack Query cache (see architecture plan §3 offline
 * strategy); this just makes the offline state explicit. On reconnect,
 * TanStack Query's onlineManager (wired in services/queryClient.ts) refetches.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      // Treat "unknown" as online to avoid a false banner flash at startup.
      setOffline(state.isConnected === false);
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View style={{ paddingTop: insets.top }} className="bg-destructive">
      <View className="flex-row items-center justify-center gap-2 py-1.5">
        <WifiOff size={14} color="#FFFFFF" />
        <Text className="text-xs font-semibold text-destructive-foreground">Hors ligne — données mises en cache</Text>
      </View>
    </View>
  );
}
