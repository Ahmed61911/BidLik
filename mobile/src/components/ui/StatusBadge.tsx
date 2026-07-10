import { View, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

export type StatusTone = "amber" | "emerald" | "secondary" | "destructive" | "muted";

const TONE_CLASSES: Record<StatusTone, string> = {
  amber: "bg-warning/15",
  emerald: "bg-success/15",
  secondary: "bg-secondary",
  destructive: "bg-destructive/15",
  muted: "bg-muted",
};
const TONE_TEXT_CLASSES: Record<StatusTone, string> = {
  amber: "text-warning-foreground",
  emerald: "text-success",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};
const TONE_ICON_COLORS: Record<StatusTone, string> = {
  amber: "#D97706",
  emerald: "#16A34A",
  secondary: "#22283A",
  destructive: "#DC2626",
  muted: "#6B7280",
};

export function StatusBadge({ tone, label, icon: Icon }: { tone: StatusTone; label: string; icon?: LucideIcon }) {
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${TONE_CLASSES[tone]}`}>
      {Icon ? <Icon size={12} color={TONE_ICON_COLORS[tone]} /> : null}
      <Text className={`text-xs font-semibold ${TONE_TEXT_CLASSES[tone]}`}>{label}</Text>
    </View>
  );
}
