import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/authStore";
import { BidlikLogo } from "@/components/BidlikLogo";
import { TextField } from "@/components/ui/TextField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { toast } from "@/utils/toast";
import type { AuthStackParamList } from "@/navigation/types";

const schema = z.object({
  email: z.string().min(1, "L'e-mail est requis").email("E-mail invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});
type FormValues = z.infer<typeof schema>;

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const login = useAuthStore((s) => s.login);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await login(values, remember);
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "PENDING_ACTIVATION") {
        navigation.reset({ index: 0, routes: [{ name: "PendingActivation" }] });
        return;
      }
      toast.error("Connexion impossible", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <BidlikLogo width={140} />
        </View>
        <Text className="mb-8 text-base text-muted-foreground text-center">Connectez-vous pour continuer</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="E-mail"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              keyboardType="email-address"
              autoComplete="email"
              placeholder="vous@exemple.com"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Mot de passe"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              secureToggle
              autoComplete="password"
              placeholder="••••••••"
            />
          )}
        />

        <View className="mb-6 flex-row items-center justify-between">
          <Checkbox checked={remember} onChange={setRemember} label="Se souvenir de moi" />
          <Pressable onPress={() => navigation.navigate("ForgotPassword")} hitSlop={6}>
            <Text className="text-sm font-medium text-accent">Mot de passe oublié ?</Text>
          </Pressable>
        </View>

        <Button label="Se connecter" onPress={handleSubmit(onSubmit)} loading={submitting} />

        <View className="mt-8 flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Pas encore de compte ? </Text>
          <Pressable onPress={() => navigation.navigate("Register")} hitSlop={6}>
            <Text className="text-sm font-semibold text-accent">Créer un compte</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
