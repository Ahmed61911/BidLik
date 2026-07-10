import { View, Text } from "react-native";
import type { Bid, Car } from "@/types";
import { formatMad, formatDateTimePrecise, formatBidInterval, microsecondsBetween, priceTierTextClass, listingPriceTier } from "@/utils/format";

/** Ported from webapp/src/routes/auctions.$auctionId.tsx's bid history list. */
export function BidHistoryList({ bids, car }: { bids: Bid[]; car: Car }) {
  if (bids.length === 0) {
    return (
      <View className="mt-3 rounded-xl border border-border bg-card p-6">
        <Text className="text-center text-sm text-muted-foreground">
          Aucune offre pour l'instant. Soyez le premier à enchérir !
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
      {bids.map((b, i) => {
        // bids is newest-first, so the bid this one followed chronologically
        // is the NEXT entry in the array.
        const previousBid = bids[i + 1];
        const tier = listingPriceTier(b.amount, car);
        return (
          <View
            key={b.id}
            className={`flex-row items-center justify-between gap-3 px-4 py-3 ${i === 0 ? "bg-accent/5" : ""} ${
              i < bids.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <Text className="text-xs font-bold text-secondary-foreground">{b.bidderName.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">{b.bidderName}</Text>
                <Text className="text-xs text-muted-foreground">{formatDateTimePrecise(b.createdAt)}</Text>
                <Text className="text-[11px] text-muted-foreground/80">
                  {previousBid
                    ? `+${formatBidInterval(microsecondsBetween(previousBid.createdAt, b.createdAt))} après l'offre précédente`
                    : "Offre d'ouverture"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              {b.isAuto ? (
                <View className="rounded-full bg-secondary px-2 py-0.5">
                  <Text className="text-[10px] font-semibold text-secondary-foreground">AUTO</Text>
                </View>
              ) : null}
              <Text className={`font-bold ${priceTierTextClass(tier)}`}>{formatMad(b.amount)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
