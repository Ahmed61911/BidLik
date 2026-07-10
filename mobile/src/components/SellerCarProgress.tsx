import { View } from "react-native";
import { priceTier, priceTierBgClass } from "@/utils/format";

/** Live-auction progress bar: current price vs floor price, colored by tier. */
export function SellerCarProgress({ current, plancher }: { current: number; plancher: number }) {
  const pct = plancher > 0 ? Math.min(100, Math.round((current / plancher) * 100)) : 0;
  const tier = priceTier(current, plancher);
  return (
    <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
      <View className={`h-full ${priceTierBgClass(tier)}`} style={{ width: `${pct}%` }} />
    </View>
  );
}
