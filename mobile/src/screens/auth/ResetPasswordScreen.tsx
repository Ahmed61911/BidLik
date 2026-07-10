import { useEffect, useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/services/supabase/client";
import { parseRecoveryUrl } from "@/utils/recoveryUrl";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { toast } from "@/utils/toast";
import type { AuthStackParamList } from "@/navigation/types";

const schema = z
  .object({
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const route = useRoute<RouteProp<AuthStackParamList, "ResetPassword">>();
  const [status, setStatus] = useState<"establishing" | "ready" | "invalid">("establishing");
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The recovery tokens can arrive either as route params (React Navigation
      // parsed the deep link itself) or need to be read directly off the raw
      // URL that opened the app (cold start before the linking config runs).
      let params = route.params;
      if (!params?.code && !params?.access_token) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) params = parseRecoveryUrl(initialUrl);
      }

      try {
        if (params?.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params?.access_token && params?.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
        } else {
          if (!cancelled) setStatus("invalid");
          return;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [route.params]);

  const onSubmit = async ({ password }: FormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe mis à jour", "Vous pouvez maintenant vous connecter.");
      await supabase.auth.signOut();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (e) {
      toast.error("Échec de la mise à jour", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "establishing") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "invalid") {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-xl font-semibold text-foreground text-center">Lien invalide ou expiré</Text>
        <Text className="mt-2 text-base text-muted-foreground text-center">
          Demandez un nouveau lien de réinitialisation depuis l'écran de connexion.
        </Text>
        <Button
          label="Retour à la connexion"
          variant="outline"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })}
          className="mt-8"
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-foreground">Nouveau mot de passe</Text>
        <Text className="mb-6 text-base text-muted-foreground">Choisissez un nouveau mot de passe pour votre compte.</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField label="Nouveau mot de passe" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureToggle />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Confirmer le mot de passe"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              secureToggle
            />
          )}
        />
        <Button label="Mettre à jour" onPress={handleSubmit(onSubmit)} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
