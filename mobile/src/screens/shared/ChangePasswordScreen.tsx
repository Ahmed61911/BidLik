import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/services/supabase/client";
import { useAuthStore } from "@/store/authStore";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { toast } from "@/utils/toast";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordScreen() {
  const navigation = useNavigation();
  const email = useAuthStore((s) => s.session?.user.email);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ currentPassword, newPassword }: FormValues) => {
    if (!email) return;
    setSubmitting(true);
    try {
      // Re-authenticate with the current password before allowing the change —
      // supabase.auth.updateUser() doesn't require it on its own since it
      // trusts the current session's JWT, but asking for it here is an
      // intentional extra confirmation step for a security-sensitive action.
      const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (reauthError) throw new Error("Mot de passe actuel incorrect.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Mot de passe mis à jour");
      navigation.goBack();
    } catch (e) {
      toast.error("Échec de la mise à jour", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-6 py-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-6 text-base text-muted-foreground">
          Pour votre sécurité, confirmez votre mot de passe actuel avant d'en choisir un nouveau.
        </Text>
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Mot de passe actuel"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.currentPassword?.message}
              secureToggle
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Nouveau mot de passe"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.newPassword?.message}
              secureToggle
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Confirmer le nouveau mot de passe"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              secureToggle
            />
          )}
        />
        <Button label="Mettre à jour le mot de passe" onPress={handleSubmit(onSubmit)} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
