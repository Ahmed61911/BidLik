import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from "react-native-reanimated";

/** A single shimmering placeholder block. */
export function Skeleton({ className, style }: { className?: string; style?: object }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[animatedStyle, style]} className={`rounded-md bg-secondary ${className ?? ""}`} />;
}

/** Card-shaped placeholder matching AuctionCard's rough layout. */
export function AuctionCardSkeleton() {
  return (
    <View className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <View className="gap-3 p-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </View>
    </View>
  );
}

/** A list of N card skeletons for a list-screen loading state. */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View className="px-4 pt-3">
      {Array.from({ length: count }).map((_, i) => (
        <AuctionCardSkeleton key={i} />
      ))}
    </View>
  );
}
