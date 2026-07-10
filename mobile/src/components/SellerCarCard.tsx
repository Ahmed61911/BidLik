import { View, Text, Pressable } from "react-native";
import { STAGE_LABEL, STAGE_TONE } from "@/constants/vendeurStages";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMad, priceTier, priceTierTextClass } from "@/utils/format";
import type { SellerCar } from "@/types";

function Info({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <View className="w-[48%]">
      <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Text>
      <Text className={`mt-0.5 text-sm font-medium ${colorClass ?? "text-foreground"}`}>{value}</Text>
    </View>
  );
}

export function SellerCarCard({ car, onPress }: { car: SellerCar; onPress: () => void }) {
  const courant = car.prixCourant ?? car.prixFinal ?? 0;
  const tier = courant > 0 ? priceTier(courant, car.prixPlancher) : undefined;

  return (
    <Pressable onPress={onPress} className="mb-3 rounded-xl border border-border bg-card p-4 active:opacity-80">
      <View className="flex-row flex-wrap items-center gap-2">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          #{car.id} — {car.marque} {car.modele} ({car.annee})
        </Text>
      </View>
      <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
        <StatusBadge tone={STAGE_TONE[car.stage]} label={STAGE_LABEL[car.stage]} />
        {car.noteExpert !== null ? <StatusBadge tone="secondary" label={`Note ${car.noteExpert}/10`} /> : null}
      </View>

      <View className="mt-3 flex-row flex-wrap gap-y-3">
        <Info label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
        <Info label="Prix plancher" value={formatMad(car.prixPlancher)} />
        <Info
          label="Prix actuel"
          value={courant > 0 ? formatMad(courant) : "—"}
          colorClass={tier ? priceTierTextClass(tier) : undefined}
        />
        <Info label="Expert" value={car.expertNom ?? "Non assigné"} />
      </View>

      <Text className="mt-2 text-xs text-muted-foreground">
        Soumise le {car.soumisLe}
        {car.acheteurNom ? ` · acheteur ${car.acheteurNom}` : ""}
      </Text>
    </Pressable>
  );
}
