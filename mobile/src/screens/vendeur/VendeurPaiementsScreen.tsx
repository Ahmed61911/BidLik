import { View, Text, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { Banknote } from "lucide-react-native";
import { useSellerPayouts } from "@/hooks/useVendeur";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMad } from "@/utils/format";
import type { SellerPayout } from "@/types";

const STATUS_META: Record<SellerPayout["status"], { label: string; tone: "amber" | "emerald" | "destructive" }> = {
  en_attente: { label: "En attente", tone: "amber" },
  vire: { label: "Viré", tone: "emerald" },
  annule: { label: "Annulé", tone: "destructive" },
};

export function VendeurPaiementsScreen() {
  const { data: payouts, isPending, isRefetching, refetch } = useSellerPayouts();

  const totalNet = (payouts ?? []).filter((p) => p.status === "vire").reduce((s, p) => s + p.net, 0);
  const enAttente = (payouts ?? []).filter((p) => p.status === "en_attente").reduce((s, p) => s + p.net, 0);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-3 px-4 pt-4">
        <View className="flex-1 rounded-xl border border-border bg-card p-3">
          <Text className="text-[11px] font-medium text-muted-foreground">Total reçu</Text>
          <Text className="mt-1 text-lg font-bold text-success">{formatMad(totalNet)}</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border bg-card p-3">
          <Text className="text-[11px] font-medium text-muted-foreground">En attente</Text>
          <Text className="mt-1 text-lg font-bold text-warning-foreground">{formatMad(enAttente)}</Text>
        </View>
      </View>

      <FlatList
        data={payouts}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-4 pb-6"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const meta = STATUS_META[item.status];
          return (
            <View className="mb-3 rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground">#{item.carId}</Text>
                  <Text className="mt-0.5 text-sm text-foreground" numberOfLines={1}>{item.carLabel}</Text>
                  <Text className="mt-1 text-xs text-muted-foreground">{item.date}</Text>
                </View>
                <StatusBadge tone={meta.tone} label={meta.label} />
              </View>
              <View className="mt-3 flex-row justify-between border-t border-border pt-3">
                <View>
                  <Text className="text-[11px] text-muted-foreground">Prix final</Text>
                  <Text className="mt-0.5 text-sm font-medium text-foreground">{formatMad(item.prixFinal)}</Text>
                </View>
                <View>
                  <Text className="text-[11px] text-muted-foreground">Commission</Text>
                  <Text className="mt-0.5 text-sm font-medium text-foreground">−{formatMad(item.commission)}</Text>
                </View>
                <View>
                  <Text className="text-[11px] text-muted-foreground">Net</Text>
                  <Text className="mt-0.5 text-sm font-semibold text-success">{formatMad(item.net)}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon={Banknote} title="Aucun paiement" subtitle="Vos versements apparaîtront ici." />}
      />
    </View>
  );
}
