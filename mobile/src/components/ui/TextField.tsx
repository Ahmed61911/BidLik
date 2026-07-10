import { useState, forwardRef } from "react";
import { View, Text, TextInput, Pressable, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

/** Shared text input — label, inline error, and an optional show/hide toggle for passwords. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, secureToggle, secureTextEntry, ...props },
  ref,
) {
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
      <View className="relative justify-center">
        <TextInput
          ref={ref}
          className={`rounded-lg border px-4 py-3 text-base text-foreground bg-card ${
            error ? "border-destructive" : "border-border"
          } ${secureToggle ? "pr-12" : ""}`}
          placeholderTextColor="rgb(107, 114, 128)"
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          autoCapitalize="none"
          {...props}
        />
        {secureToggle ? (
          <Pressable onPress={() => setHidden((h) => !h)} className="absolute right-3" hitSlop={8}>
            {hidden ? <EyeOff size={20} color="rgb(107, 114, 128)" /> : <Eye size={20} color="rgb(107, 114, 128)" />}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="mt-1 text-sm text-destructive">{error}</Text> : null}
    </View>
  );
});
