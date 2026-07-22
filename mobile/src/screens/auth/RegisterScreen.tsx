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
import { Button } from "@/components/ui/Button";
import { RoleSelector } from "@/components/ui/RoleSelector";
import { toast } from "@/utils/toast";
import type { AuthStackParamList } from "@/navigation/types";

const schema = z
  .object({
    nom: z.string().min(2, "Nom trop court"),
    email: z.string().min(1, "L'e-mail est requis").email("E-mail invalide"),
    telephone: z.string().min(8, "Numéro de téléphone invalide"),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
    role: z.enum(["acheteur", "vendeur"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const register = useAuthStore((s) => s.register);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", email: "", telephone: "", password: "", confirmPassword: "", role: "acheteur" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await register(values);
      navigation.reset({ index: 0, routes: [{ name: "PendingActivation" }] });
    } catch (e) {
      toast.error("Inscription impossible", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="mb-6 items-center">
          <BidlikLogo width={120} />
        </View>
        <Text className="mb-1 text-3xl font-bold text-foreground text-center">Créer un compte</Text>
        <Text className="mb-6 text-base text-muted-foreground text-center">Rejoignez Bidlik en quelques secondes</Text>

        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value } }) => <RoleSelector value={value} onChange={onChange} />}
        />

        <Controller
          control={control}
          name="nom"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField label="Nom complet" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.nom?.message} />
          )}
        />
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
        <Controller
          control={control}
          name="telephone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Téléphone"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.telephone?.message}
              keyboardType="phone-pad"
              placeholder="+212 6XX XXX XXX"
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
            />
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

        <Button label="Créer mon compte" onPress={handleSubmit(onSubmit)} loading={submitting} />

        <View className="mt-8 flex-row justify-center">
          <Text className="text-sm text-muted-foreground">Déjà inscrit ? </Text>
          <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
            <Text className="text-sm font-semibold text-accent">Se connecter</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
