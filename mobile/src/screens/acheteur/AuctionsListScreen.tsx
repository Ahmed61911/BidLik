import { useMemo, useState } from "react";
import { View, FlatList, TextInput, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, Gavel } from "lucide-react-native";
import { useAuctions } from "@/hooks/useAuctions";
import { AuctionCard } from "@/components/AuctionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import type { AcheteurHomeStackParamList } from "@/navigation/types";
import type { Auction } from "@/types";

export function AuctionsListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurHomeStackParamList>>();
  const { data: auctions, isPending, isRefetching, refetch, error } = useAuctions("live");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!auctions) return [];
    const q = search.trim().toLowerCase();
    if (!q) return auctions;
    return auctions.filter((a) =>
      [a.car.marque, a.car.modele, a.car.id].some((v) => v.toLowerCase().includes(q)),
    );
  }, [auctions, search]);

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row items-center rounded-lg border border-border bg-card px-3">
          <Search size={16} color="rgb(107, 114, 128)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une marque, un modèle..."
            placeholderTextColor="rgb(107, 114, 128)"
            className="ml-2 flex-1 py-2.5 text-sm text-foreground"
          />
        </View>
      </View>

      {isPending ? (
        <ListSkeleton />
      ) : error ? (
        <EmptyState title="Impossible de charger les enchères" subtitle={(error as Error).message} icon={Gavel} />
      ) : (
        <FlatList<Auction>
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-6"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <AuctionCard auction={item} onPress={() => navigation.navigate("AuctionDetail", { auctionId: item.id })} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Gavel}
              title="Aucune enchère en cours"
              subtitle={search ? "Essayez une autre recherche." : "Revenez bientôt pour de nouvelles enchères."}
            />
          }
        />
      )}
    </View>
  );
}
