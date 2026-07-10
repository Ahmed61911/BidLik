import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Gavel } from "lucide-react-native";
import { useSellerCars } from "@/hooks/useVendeur";
import { SellerCarProgress } from "@/components/SellerCarProgress";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMad, priceTier, priceTierTextClass } from "@/utils/format";
import type { VendeurAuctionsStackParamList } from "@/navigation/types";

export function MesEncheresLiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendeurAuctionsStackParamList>>();
  const { data: cars, isPending, isRefetching, refetch } = useSellerCars();
  const live = (cars ?? []).filter((c) => c.stage === "en_enchere");

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row justify-end border-b border-border px-4 py-2">
        <Pressable onPress={() => navigation.navigate("Historique")} hitSlop={6}>
          <Text className="text-xs font-medium text-accent">Historique →</Text>
        </Pressable>
      </View>
      <FlatList
        data={live}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-3 pb-6"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        renderItem={({ item }) => {
          const courant = item.prixCourant ?? 0;
          const tier = priceTier(courant, item.prixPlancher);
          return (
            <View className="mb-3 rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    #{item.id} — {item.marque} {item.modele} ({item.annee})
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {item.bidCount ?? 0} offres · plancher {formatMad(item.prixPlancher)}
                  </Text>
                </View>
                <Text className={`text-base font-bold ${priceTierTextClass(tier)}`}>{formatMad(courant)}</Text>
              </View>
              <SellerCarProgress current={courant} plancher={item.prixPlancher} />
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon={Gavel} title="Aucune enchère en direct" subtitle="Vos véhicules en enchère apparaîtront ici." />}
      />
    </View>
  );
}
