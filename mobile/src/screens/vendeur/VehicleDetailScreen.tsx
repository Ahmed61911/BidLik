import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useRoute, type RouteProp } from "@react-navigation/native";
import { useSellerCar } from "@/hooks/useVendeur";
import { resolveCarImageUrl } from "@/services/storage";
import { ImageGallery } from "@/components/ImageGallery";
import { formatMad } from "@/utils/format";
import type { VendeurVehiclesStackParamList } from "@/navigation/types";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[31%] rounded-lg border border-border bg-card px-3 py-2.5">
      <Text className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold capitalize text-foreground">{value}</Text>
    </View>
  );
}

export function VehicleDetailScreen() {
  const route = useRoute<RouteProp<VendeurVehiclesStackParamList, "VehicleDetail">>();
  const { carId } = route.params;
  const { data: car, isPending, error } = useSellerCar(carId);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error || !car) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-sm text-muted-foreground">{(error as Error)?.message ?? "Introuvable"}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <ImageGallery images={car.images.map(resolveCarImageUrl)} marque={car.marque} />
      <View className="px-4 pt-4">
        <Text className="text-xl font-bold text-foreground">
          #{car.id} — {car.marque} {car.modele}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">{car.finition} · {car.annee}</Text>
        <Text className="mt-3 text-lg font-extrabold text-foreground">Prix plancher : {formatMad(car.prixPlancher)}</Text>

        <View className="mt-6 flex-row flex-wrap gap-2">
          <Spec label="MEC" value={String(car.annee)} />
          <Spec label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
          <Spec label="Carburant" value={car.carburant} />
          <Spec label="Boîte" value={car.transmission} />
          <Spec label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
          <Spec label="Carrosserie" value={car.bodyType ? String(car.bodyType) : "—"} />
          <Spec label="Couleur ext." value={car.couleurExterieur || "—"} />
          <Spec label="Couleur int." value={car.couleurInterieur || "—"} />
          <Spec label="Nombre de clés" value={String(car.nombreCles)} />
          <Spec label="Note expert" value={car.noteExpert ? `${car.noteExpert}/10` : "—"} />
          <Spec label="Opposition" value={car.opposition ? "Oui" : "Non"} />
          <Spec label="Main levée" value={car.mainLevee ? "Oui" : "Non"} />
          <Spec label="Carte grise barrée" value={car.carteGriseBarree ? "Oui" : "Non"} />
          <Spec label="Procuration" value={car.procuration} />
        </View>
      </View>
    </ScrollView>
  );
}
