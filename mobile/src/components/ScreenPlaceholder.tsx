import { View, Text } from "react-native";

/** Temporary stand-in for screens not yet built out (phases 4-8 of the roadmap). */
export function ScreenPlaceholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-2xl font-semibold text-foreground text-center">{title}</Text>
      {subtitle ? <Text className="mt-2 text-base text-muted-foreground text-center">{subtitle}</Text> : null}
    </View>
  );
}
