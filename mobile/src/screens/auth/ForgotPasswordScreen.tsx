import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Linking from "expo-linking";
import { CheckCircle2 } from "lucide-react-native";
import { supabase } from "@/services/supabase/client";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { toast } from "@/utils/toast";
import type { AuthStackParamList } from "@/navigation/types";

const schema = z.object({ email: z.string().min(1, "L'e-mail est requis").email("E-mail invalide") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async ({ email }: FormValues) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Linking.createURL("reset-password"),
      });
      if (error) throw error;
      setSent(true);
    } catch (e) {
      toast.error("Envoi impossible", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <CheckCircle2 size={48} color="rgb(22, 163, 74)" />
        <Text className="mt-4 text-xl font-semibold text-foreground text-center">E-mail envoyé</Text>
        <Text className="mt-2 text-base text-muted-foreground text-center">
          Suivez le lien reçu par e-mail pour choisir un nouveau mot de passe.
        </Text>
        <Pressable onPress={() => navigation.navigate("Login")} className="mt-8" hitSlop={6}>
          <Text className="text-sm font-semibold text-accent">Retour à la connexion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="flex-1 justify-center px-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-1 text-2xl font-bold text-foreground">Mot de passe oublié</Text>
        <Text className="mb-6 text-base text-muted-foreground">
          Indiquez votre e-mail, nous vous enverrons un lien de réinitialisation.
        </Text>
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
            />
          )}
        />
        <Button label="Envoyer le lien" onPress={handleSubmit(onSubmit)} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
