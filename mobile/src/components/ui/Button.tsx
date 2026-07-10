import { Pressable, Text, View, ActivityIndicator, type PressableProps } from "react-native";

interface ButtonProps extends PressableProps {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
}

export function Button({ label, loading, variant = "primary", disabled, className, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;

  const base = "rounded-lg py-3.5 items-center justify-center flex-row";
  const variantClass =
    variant === "primary"
      ? "bg-primary"
      : variant === "secondary"
        ? "bg-secondary"
        : "bg-transparent border border-border";
  const textClass =
    variant === "primary" ? "text-primary-foreground" : variant === "secondary" ? "text-secondary-foreground" : "text-foreground";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      className={`${base} ${variantClass} ${isDisabled ? "opacity-60" : ""} ${(className as string) ?? ""}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <View className="mr-2">
          <ActivityIndicator color={variant === "primary" ? "#FAFBFC" : "#22283A"} />
        </View>
      ) : null}
      <Text className={`text-base font-semibold ${textClass}`}>{label}</Text>
    </Pressable>
  );
}
