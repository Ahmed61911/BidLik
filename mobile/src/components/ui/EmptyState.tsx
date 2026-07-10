import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

export function EmptyState({ icon: Icon, title, subtitle }: { icon?: LucideIcon; title: string; subtitle?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {Icon ? (
        <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Icon size={26} color="rgb(107, 114, 128)" />
        </View>
      ) : null}
      <Text className="text-base font-semibold text-foreground text-center">{title}</Text>
      {subtitle ? <Text className="mt-1 text-sm text-muted-foreground text-center">{subtitle}</Text> : null}
    </View>
  );
}
