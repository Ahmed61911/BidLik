import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Trophy, AlertTriangle, Clock, Landmark } from "lucide-react-native";
import { useAcheteurStore } from "@/store/acheteurStore";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatMad } from "@/utils/format";
import type { AcheteurMyBidsStackParamList } from "@/navigation/types";
import type { MonEnchere, EnchereStatus } from "@/types";

function statusInfo(status: EnchereStatus, jeSuisLeader: boolean) {
  if (status === "gagnee") return { tone: "emerald" as const, label: "Gagnée", icon: Trophy };
  if (status === "perdue") return { tone: "destructive" as const, label: "Perdue", icon: AlertTriangle };
  if (status === "en_attente_validation") return { tone: "amber" as const, label: "En attente de validation", icon: Clock };
  return jeSuisLeader
    ? { tone: "emerald" as const, label: "En tête", icon: Trophy }
    : { tone: "destructive" as const, label: "Surenchéri", icon: AlertTriangle };
}

function EnchereRow({ item, onPress }: { item: MonEnchere; onPress: () => void }) {
  const info = statusInfo(item.status, item.jeSuisLeader);
  const Icon = info.icon;
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl border border-border bg-card p-4 active:opacity-80">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold text-foreground" numberOfLines={1}>
          {item.marque} {item.modele} ({item.annee})
        </Text>
        <StatusBadge tone={info.tone} label={info.label} icon={Icon} />
      </View>
      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text className="text-xs text-muted-foreground">Mon offre</Text>
          <Text className="text-base font-bold text-foreground">{formatMad(item.monMontant)}</Text>
          {!item.jeSuisLeader ? (
            <Text className="mt-0.5 text-xs text-muted-foreground">Offre actuelle: {formatMad(item.prixActuel)}</Text>
          ) : null}
        </View>
        {item.status === "active" ? <CountdownTimer endsAt={item.endsAt} compact /> : null}
      </View>
    </Pressable>
  );
}

export function MesEncheresScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurMyBidsStackParamList>>();
  const encheres = useAcheteurStore((s) => s.encheres);
  const loading = useAcheteurStore((s) => s.loading);
  const refresh = useAcheteurStore((s) => s.refresh);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={encheres}
        keyExtractor={(item) => item.auctionId}
        contentContainerClassName="px-4 pt-3 pb-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <EnchereRow item={item} onPress={() => navigation.navigate("AuctionDetail", { auctionId: item.auctionId })} />
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon={Landmark} title="Aucune enchère" subtitle="Vos offres sur les enchères en cours apparaîtront ici." />
          ) : null
        }
      />
    </View>
  );
}
