import { useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Car as CarIcon } from "lucide-react-native";
import { useSellerCars } from "@/hooks/useVendeur";
import { STAGE_LABEL } from "@/constants/vendeurStages";
import { SellerCarCard } from "@/components/SellerCarCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import type { VendeurVehiclesStackParamList } from "@/navigation/types";
import type { SellerCarStage } from "@/types";

const FILTERS: { key: SellerCarStage | "all"; label: string }[] = [
  { key: "all", label: "Tous" },
  ...(Object.entries(STAGE_LABEL) as [SellerCarStage, string][]).map(([key, label]) => ({ key, label })),
];

export function MesVehiculesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendeurVehiclesStackParamList>>();
  const { data: cars, isPending, isRefetching, refetch, error } = useSellerCars();
  const [filter, setFilter] = useState<SellerCarStage | "all">("all");

  const filtered = useMemo(() => {
    if (!cars) return [];
    return filter === "all" ? cars : cars.filter((c) => c.stage === filter);
  }, [cars, filter]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-border" contentContainerClassName="px-4 py-2 gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} className={`rounded-full px-3 py-1.5 ${active ? "bg-primary" : "bg-secondary"}`}>
              <Text className={`text-xs font-semibold ${active ? "text-primary-foreground" : "text-secondary-foreground"}`}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <EmptyState title="Impossible de charger" subtitle={(error as Error).message} icon={CarIcon} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-3 pb-6"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => <SellerCarCard car={item} onPress={() => navigation.navigate("VehicleDetail", { carId: item.id })} />}
          ListEmptyComponent={<EmptyState icon={CarIcon} title="Aucun véhicule" subtitle="Aucune voiture pour ce filtre." />}
        />
      )}
    </View>
  );
}
