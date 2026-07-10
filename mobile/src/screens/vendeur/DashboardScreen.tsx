import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Car as CarIcon, Gavel, ClipboardCheck, TrendingUp, type LucideIcon } from "lucide-react-native";
import { useSellerCars, useSellerStats } from "@/hooks/useVendeur";
import { STAGE_LABEL } from "@/constants/vendeurStages";
import { SellerCarProgress } from "@/components/SellerCarProgress";
import { formatMad, priceTier, priceTierTextClass } from "@/utils/format";
import type { VendeurTabParamList } from "@/navigation/types";
import type { SellerCar } from "@/types";

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone?: "accent" | "success" }) {
  const toneClass = tone === "accent" ? "text-accent" : tone === "success" ? "text-success" : "text-foreground";
  const iconColor = tone === "accent" ? "#E94E2C" : tone === "success" ? "#16A34A" : "#22283A";
  return (
    <View className="w-[48%] rounded-xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
        <Icon size={16} color={iconColor} />
      </View>
      <Text className={`text-2xl font-bold ${toneClass}`}>{value}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VendeurTabParamList>>();
  const { data: stats, isRefetching: statsRefetching, refetch: refetchStats } = useSellerStats();
  const { data: cars, isRefetching: carsRefetching, refetch: refetchCars } = useSellerCars();

  const live = (cars ?? []).filter((c) => c.stage === "en_enchere");
  const closed = (cars ?? []).filter((c) => c.stage === "vendu" || c.stage === "en_attente_validation");

  function openAuctions() {
    navigation.navigate("AuctionsTab");
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      refreshControl={<RefreshControl refreshing={statsRefetching || carsRefetching} onRefresh={() => { refetchStats(); refetchCars(); }} />}
    >
      <View className="flex-row flex-wrap justify-between gap-y-3">
        <Kpi label="Voitures actives" value={stats?.voituresActives ?? "—"} icon={CarIcon} />
        <Kpi label="En inspection" value={stats?.enInspection ?? "—"} icon={ClipboardCheck} />
        <Kpi label="En enchère live" value={stats?.enEnchereLive ?? "—"} icon={Gavel} tone="accent" />
        <Kpi label="Net du mois" value={stats ? formatMad(stats.caNetMois) : "—"} icon={TrendingUp} tone="success" />
      </View>

      <View className="mt-5 rounded-xl border border-border bg-card p-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-foreground">Mes enchères en cours</Text>
          <Pressable onPress={openAuctions} hitSlop={6}>
            <Text className="text-xs font-medium text-accent">Tout voir →</Text>
          </Pressable>
        </View>
        {live.length === 0 ? (
          <View className="rounded-md border border-dashed border-border p-6">
            <Text className="text-center text-sm text-muted-foreground">Aucune voiture en enchère pour le moment.</Text>
          </View>
        ) : (
          live.map((c: SellerCar) => {
            const courant = c.prixCourant ?? 0;
            const tier = priceTier(courant, c.prixPlancher);
            return (
              <View key={c.id} className="mb-2 rounded-md border border-border p-3">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      #{c.id} — {c.marque} {c.modele} ({c.annee})
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {c.bidCount ?? 0} offres · plancher {formatMad(c.prixPlancher)}
                    </Text>
                  </View>
                  <Text className={`text-base font-bold ${priceTierTextClass(tier)}`}>{formatMad(courant)}</Text>
                </View>
                <SellerCarProgress current={courant} plancher={c.prixPlancher} />
              </View>
            );
          })
        )}
      </View>

      {closed.length > 0 ? (
        <View className="mt-5 rounded-xl border border-border bg-card p-4">
          <Text className="mb-3 text-sm font-semibold text-foreground">Mes enchères terminées</Text>
          {closed.map((c) => (
            <View key={c.id} className="mb-2 flex-row items-center justify-between rounded-md border border-border p-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  #{c.id} — {c.marque} {c.modele} ({c.annee})
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {STAGE_LABEL[c.stage]} · {c.bidCount ?? 0} offres
                </Text>
              </View>
              <Text className="text-base font-bold text-foreground">{formatMad(c.prixFinal ?? c.prixCourant ?? 0)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {stats?.prochainPaiement ? (
        <View className="mt-5 rounded-xl border border-border bg-card p-4">
          <Text className="mb-2 text-sm font-semibold text-foreground">Prochain virement</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Prévu le {stats.prochainPaiement}</Text>
            <Text className="text-lg font-bold text-success">{formatMad(stats.prochainPaiementMontant)}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
