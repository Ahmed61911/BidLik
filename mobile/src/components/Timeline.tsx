import { View, Text } from "react-native";
import { Check } from "lucide-react-native";
import type { ReactNode } from "react";

export interface TimelineItemProps {
  done: boolean;
  active?: boolean;
  title: string;
  date?: string | null;
  note?: ReactNode;
  isLast?: boolean;
}

export function TimelineItem({ done, active, title, date, note, isLast }: TimelineItemProps) {
  return (
    <View className="flex-row gap-3">
      <View className="items-center">
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            done ? "bg-success" : active ? "bg-accent" : "bg-secondary"
          }`}
        >
          {done ? <Check size={14} color="#fff" /> : <View className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-muted-foreground"}`} />}
        </View>
        {!isLast ? <View className={`w-0.5 flex-1 ${done ? "bg-success" : "bg-border"}`} /> : null}
      </View>
      <View className="flex-1 pb-5">
        <Text className={`text-sm font-semibold ${done || active ? "text-foreground" : "text-muted-foreground"}`}>{title}</Text>
        {date ? <Text className="mt-0.5 text-xs text-muted-foreground">{new Date(date).toLocaleString("fr-MA")}</Text> : null}
        {note ? <View className="mt-1">{typeof note === "string" ? <Text className="text-xs text-muted-foreground">{note}</Text> : note}</View> : null}
      </View>
    </View>
  );
}

export function Timeline({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}
