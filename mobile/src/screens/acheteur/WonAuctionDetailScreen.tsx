import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getMyWonCarDetails } from "@/services/supabase/wonAuctionsApi";
import { getCarExpertise } from "@/services/supabase/auctionsApi";
import { schedulePaymentDeadlineReminder } from "@/services/localNotifications";
import { resolveCarImageUrl } from "@/services/storage";
import { ImageGallery } from "@/components/ImageGallery";
import { ExpertiseSection } from "@/components/ExpertiseSection";
import { Timeline, TimelineItem } from "@/components/Timeline";
import { Button } from "@/components/ui/Button";
import { formatMad } from "@/utils/format";
import type { AcheteurWonStackParamList } from "@/navigation/types";

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[31%] rounded-lg border border-border bg-card px-3 py-2.5">
      <Text className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold capitalize text-foreground">{value}</Text>
    </View>
  );
}

export function WonAuctionDetailScreen() {
  const route = useRoute<RouteProp<AcheteurWonStackParamList, "WonAuctionDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurWonStackParamList>>();
  const { auctionId } = route.params;

  const { data, isPending, error } = useQuery({
    queryKey: ["won-auction-detail", auctionId],
    queryFn: () => getMyWonCarDetails(auctionId),
  });

  const { data: expertise } = useQuery({
    queryKey: ["car-expertise", data?.car.id],
    queryFn: () => getCarExpertise(data!.car.id),
    enabled: !!data?.car.id,
  });

  // Local reminder: nudge the buyer before the payment deadline lapses.
  useEffect(() => {
    if (!data) return;
    const { auction, car } = data;
    if (auction.status === "validated" && car.paymentStatus !== "paye" && auction.paymentDeadline) {
      void schedulePaymentDeadlineReminder(auction.id, auction.paymentDeadline, `${car.marque} ${car.modele}`);
    }
  }, [data]);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-center text-sm text-muted-foreground">{(error as Error)?.message ?? "Introuvable"}</Text>
      </View>
    );
  }

  const { auction, car } = data;
  const isValidated = auction.status === "validated";
  const isPaid = car.paymentStatus === "paye";
  const isDelivered = car.deliveryStatus === "livre";
  const isCancelled = auction.status === "cancelled" || car.status === "vendu_annulee";

  return (
    <ScrollView className="flex-1 bg-background">
      <ImageGallery images={car.images.map(resolveCarImageUrl)} marque={car.marque} />

      <View className="px-4 pt-4">
        <Text className="text-xl font-bold text-foreground">
          #{car.id} — {car.marque} {car.modele}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {car.finition} · {car.annee} · vendu par {car.vendeurNom}
        </Text>
        <Text className="mt-3 text-2xl font-extrabold text-foreground">{formatMad(auction.currentPrice)}</Text>

        {!isCancelled ? (
          <View className="mt-6 rounded-xl border border-border bg-card p-4">
            <Text className="mb-4 text-base font-bold text-foreground">Suivi de la transaction</Text>
            <Timeline>
              <TimelineItem done title="Enchère remportée" date={auction.closedAt} />
              <TimelineItem
                done={isValidated}
                active={!isValidated}
                title="Validation par l'administrateur"
                date={auction.validatedAt}
                note={!isValidated ? "En attente…" : undefined}
              />
              <TimelineItem
                done={isPaid}
                active={isValidated && !isPaid}
                title="Paiement du véhicule"
                note={
                  isValidated && !isPaid && auction.paymentDeadline ? (
                    <Text className="text-xs text-warning-foreground">Délai bientôt dépassé — voir ci-dessous</Text>
                  ) : undefined
                }
              />
              <TimelineItem done={isDelivered} active={isPaid && !isDelivered} title="Livraison du véhicule" isLast />
            </Timeline>

            {isValidated && !isPaid ? (
              <Button
                label="Régler et téléverser le justificatif"
                onPress={() => navigation.navigate("UploadPaymentProof", { auctionId })}
                className="mt-2"
              />
            ) : null}
          </View>
        ) : (
          <View className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <Text className="text-sm font-semibold text-destructive">Cette vente a été annulée.</Text>
          </View>
        )}

        <View className="mt-6 flex-row flex-wrap gap-2">
          <Spec label="Marque" value={car.marque} />
          <Spec label="Modèle" value={car.modele} />
          <Spec label="Année" value={String(car.annee)} />
          <Spec label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
          <Spec label="Carburant" value={car.carburant} />
          <Spec label="Boîte" value={car.transmission} />
          <Spec label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
          <Spec label="Nombre de clés" value={String(car.nombreCles)} />
          <Spec label="Vendeur" value={car.vendeurNom} />
        </View>

        {expertise ? <ExpertiseSection expertise={expertise} canPreviewPhotos={expertise.expertImages !== null} /> : null}
      </View>
    </ScrollView>
  );
}
