import { Pressable, View, Text } from "react-native";
import { Check } from "lucide-react-native";

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-center py-1"
      hitSlop={6}
    >
      <View
        className={`h-5 w-5 items-center justify-center rounded border ${
          checked ? "bg-primary border-primary" : "bg-transparent border-border"
        }`}
      >
        {checked ? <Check size={14} color="#FAFBFC" /> : null}
      </View>
      <Text className="ml-2 text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}
