import { useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Clock, CheckCircle2, Truck, XCircle, Trophy } from "lucide-react-native";
import { useWonAuctions } from "@/hooks/useWonAuctions";
import { computeWonStatus, type WonRow, type WonStatus } from "@/services/supabase/wonAuctionsApi";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatMad } from "@/utils/format";
import type { AcheteurWonStackParamList } from "@/navigation/types";

const TABS: { key: WonStatus | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "en_attente", label: "En attente" },
  { key: "validee", label: "Validée" },
  { key: "livree", label: "Livrée" },
  { key: "annulee", label: "Annulée" },
];

const STATUS_META: Record<WonStatus, { tone: StatusTone; label: string; icon: typeof Clock }> = {
  en_attente: { tone: "amber", label: "En attente", icon: Clock },
  validee: { tone: "secondary", label: "Validée", icon: CheckCircle2 },
  livree: { tone: "emerald", label: "Livrée", icon: Truck },
  annulee: { tone: "muted", label: "Annulée", icon: XCircle },
};

function WonCard({ row, onPress }: { row: WonRow; onPress: () => void }) {
  const status = computeWonStatus(row);
  const meta = STATUS_META[status];
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl border border-border bg-card p-4 active:opacity-80">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
          #{row.carId} — {row.marque} {row.modele} ({row.annee})
        </Text>
        <StatusBadge tone={meta.tone} label={meta.label} icon={meta.icon} />
      </View>

      <View className="mt-2 flex-row items-center gap-2">
        <Text className="text-base font-bold text-foreground">{formatMad(row.prixFinal)}</Text>
        {row.paymentStatus === "paye" ? <StatusBadge tone="emerald" label="Payée" /> : null}
      </View>

      {status === "en_attente" ? (
        <Text className="mt-2 text-xs text-muted-foreground">En attente de la validation de l'administrateur.</Text>
      ) : status === "validee" && row.paymentDeadline && row.paymentStatus !== "paye" ? (
        <View className="mt-2 flex-row items-center gap-1.5">
          <Clock size={12} color="#D97706" />
          <Text className="text-xs text-muted-foreground">Paiement sous : </Text>
          <CountdownTimer endsAt={row.paymentDeadline} compact />
        </View>
      ) : status === "validee" && row.paymentStatus === "paye" ? (
        <Text className="mt-2 text-xs text-muted-foreground">Paiement validé — en attente de livraison.</Text>
      ) : status === "livree" ? (
        <Text className="mt-2 text-xs text-muted-foreground">Véhicule livré. Transaction terminée.</Text>
      ) : status === "annulee" ? (
        <Text className="mt-2 text-xs text-muted-foreground">Cette vente a été annulée.</Text>
      ) : null}
    </Pressable>
  );
}

export function GagneesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurWonStackParamList>>();
  const { data: rows, isPending, isRefetching, refetch, error } = useWonAuctions();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 };
    for (const t of TABS.slice(1)) c[t.key] = 0;
    rows?.forEach((r) => {
      const s = computeWonStatus(r);
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (tab === "all") return rows;
    return rows.filter((r) => computeWonStatus(r) === tab);
  }, [rows, tab]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-border" contentContainerClassName="px-4 py-2 gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`rounded-full px-3 py-1.5 ${active ? "bg-primary" : "bg-secondary"}`}
            >
              <Text className={`text-xs font-semibold ${active ? "text-primary-foreground" : "text-secondary-foreground"}`}>
                {t.label} ({counts[t.key] ?? 0})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <EmptyState title="Impossible de charger" subtitle={(error as Error).message} icon={Trophy} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.auctionId}
          contentContainerClassName="px-4 pt-3 pb-6"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <WonCard row={item} onPress={() => navigation.navigate("WonAuctionDetail", { auctionId: item.auctionId })} />
          )}
          ListEmptyComponent={<EmptyState icon={Trophy} title="Aucune enchère gagnée" subtitle="Vos véhicules remportés apparaîtront ici." />}
        />
      )}
    </View>
  );
}
