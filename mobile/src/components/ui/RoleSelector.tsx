import { View, Text, Pressable } from "react-native";
import type { MobileRole } from "@/types/auth";

const OPTIONS: { value: MobileRole; label: string; hint: string }[] = [
  { value: "acheteur", label: "Acheteur", hint: "Enchérir et acheter des véhicules" },
  { value: "vendeur", label: "Vendeur", hint: "Vendre mes véhicules aux enchères" },
];

export function RoleSelector({ value, onChange }: { value: MobileRole; onChange: (v: MobileRole) => void }) {
  return (
    <View className="mb-4 flex-row gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`flex-1 rounded-lg border p-3 ${selected ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <Text className={`text-base font-semibold ${selected ? "text-primary" : "text-foreground"}`}>{opt.label}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">{opt.hint}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
