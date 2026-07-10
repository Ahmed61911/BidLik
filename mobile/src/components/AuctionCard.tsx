import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { Star } from "lucide-react-native";
import type { Auction } from "@/types";
import { formatMad, listingPriceTier, priceTierBgClass } from "@/utils/format";
import { resolveCarImageUrl } from "@/services/storage";
import { CountdownTimer } from "./CountdownTimer";

interface Props {
  auction: Auction;
  onPress: () => void;
}

/** Ported from webapp/src/components/AuctionCard.tsx — single-image (no slideshow) for v1. */
export function AuctionCard({ auction, onPress }: Props) {
  const { car, currentPrice, bidCount, status } = auction;
  const isSealed = auction.auctionType === "fermee";
  const displayPrice = isSealed ? (car.minimumAcceptedPrice ?? auction.startingPrice) : currentPrice;
  const priceLabel = isSealed ? "Prix minimum" : "Offre actuelle";
  const tier = listingPriceTier(displayPrice, car);
  const isLive = status === "live";
  const image = car.images?.[0] ? resolveCarImageUrl(car.images[0]) : null;

  return (
    <Pressable
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-xl border border-border bg-card active:opacity-90"
    >
      <View className="relative aspect-[16/10] w-full bg-secondary">
        {image ? (
          <Image source={{ uri: image }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        ) : (
          <View className="h-full w-full items-center justify-center bg-primary">
            <Text className="text-2xl font-bold text-primary-foreground">{car.marque}</Text>
          </View>
        )}
        <View className="absolute left-3 top-3">
          {isLive ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-white" />
              <Text className="text-xs font-semibold text-destructive-foreground">EN DIRECT</Text>
            </View>
          ) : (
            <View className="rounded-full bg-foreground/80 px-2.5 py-1">
              <Text className="text-xs font-semibold text-background">
                {status === "validated" ? "VALIDÉE" : status === "cancelled" ? "ANNULÉE" : "TERMINÉE"}
              </Text>
            </View>
          )}
        </View>
        {car.noteExpert != null ? (
          <View className="absolute right-3 top-3 flex-row items-center gap-1 rounded-full bg-background/95 px-2.5 py-1">
            <Star size={12} color="#D97706" fill="#D97706" />
            <Text className="text-xs font-bold text-foreground">{car.noteExpert}/10</Text>
          </View>
        ) : null}
      </View>

      <View className="gap-3 p-4">
        <View>
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            <Text className="font-mono text-primary">#{car.id}</Text> — {car.marque} {car.modele}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {car.annee} · {car.kilometrage.toLocaleString("fr-MA")} km · {car.carburant}
          </Text>
        </View>

        <View className={`rounded-lg px-3 py-2.5 ${priceTierBgClass(tier)}`}>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-white/85">{priceLabel}</Text>
          <Text className="text-lg font-extrabold text-white">{formatMad(displayPrice)}</Text>
        </View>

        <View className="flex-row items-center justify-between border-t border-border pt-3">
          <Text className="text-xs text-muted-foreground">
            {bidCount} {bidCount > 1 ? "offres" : "offre"}
          </Text>
          {isLive ? <CountdownTimer endsAt={auction.endsAt} compact /> : (
            <Text className="text-xs font-medium text-muted-foreground">Terminée</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
