import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Paperclip, Lock, CreditCard } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useAcheteurStore } from "@/store/acheteurStore";
import { CAUTION_AMOUNT, submitBuyerCaution } from "@/services/supabase/cautionApi";
import { pickProofFile, uploadProof, type PickedFile } from "@/services/upload";
import { TextField } from "@/components/ui/TextField";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { formatMad } from "@/utils/format";
import { toast } from "@/utils/toast";
import type { AcheteurPaymentsStackParamList } from "@/navigation/types";

const METHODS = [
  { key: "virement", label: "Virement bancaire", hint: "Dépôt en caisse ou virement" },
  { key: "cheque", label: "Chèque", hint: "Remise ou dépôt du chèque" },
  { key: "especes", label: "Espèces", hint: "Dépôt en agence / caisse" },
] as const;
type Method = (typeof METHODS)[number]["key"];

export function CautionPaiementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurPaymentsStackParamList>>();
  const user = useAuthStore((s) => s.session?.user);
  const paiements = useAcheteurStore((s) => s.paiements);
  const refresh = useAcheteurStore((s) => s.refresh);

  const [method, setMethod] = useState<Method>("virement");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.cautionValidee) {
      toast.info("Votre caution est déjà active.");
      navigation.goBack();
      return;
    }
    const hasPending = paiements.some((p) => p.type === "caution" && p.status === "en_attente");
    if (hasPending) {
      toast.info("Votre justificatif est déjà en attente de validation.");
      navigation.goBack();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePickFile() {
    try {
      const picked = await pickProofFile();
      if (picked) setFile(picked);
    } catch (e) {
      toast.error("Sélection impossible", (e as Error).message);
    }
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Justificatif requis", "Veuillez joindre un justificatif (image ou PDF).");
      return;
    }
    if (!accept) {
      toast.error("Conditions requises", "Veuillez accepter les conditions.");
      return;
    }
    if (method !== "especes" && !reference.trim()) {
      toast.error("Référence requise", "Merci d'indiquer la référence du paiement.");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = await uploadProof({ file, bucket: "payment-proofs", category: "caution" });
      await submitBuyerCaution({
        reference: reference.trim(),
        proofUrl: uploaded.path,
        proofName: uploaded.name,
        notes: notes.trim(),
        paymentMethod: method,
        bank: bank.trim(),
      });
      toast.success("Justificatif envoyé", "Un administrateur va valider votre caution.");
      await refresh();
      navigation.navigate("Caution");
    } catch (e) {
      toast.error("Échec de l'envoi", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 py-4">
        <Text className="text-base font-semibold text-foreground">Déposer ma caution — {formatMad(CAUTION_AMOUNT)}</Text>

        <Text className="mb-1.5 mt-5 text-sm font-medium text-foreground">Mode de paiement</Text>
        <View className="mb-4 gap-2">
          {METHODS.map((m) => {
            const active = method === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMethod(m.key)}
                className={`rounded-lg border p-3 ${active ? "border-primary bg-primary/5" : "border-border bg-card"}`}
              >
                <Text className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>{m.label}</Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">{m.hint}</Text>
              </Pressable>
            );
          })}
          <View className="flex-row items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 opacity-60">
            <CreditCard size={16} color="rgb(107, 114, 128)" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-muted-foreground">Carte bancaire (CMI)</Text>
              <Text className="text-xs text-muted-foreground">Bientôt disponible</Text>
            </View>
          </View>
        </View>

        {method !== "especes" ? (
          <>
            <TextField
              label={method === "cheque" ? "Numéro du chèque" : "Référence du virement"}
              value={reference}
              onChangeText={setReference}
              placeholder={method === "cheque" ? "N° du chèque" : "Ex: VIR-2026-01234"}
            />
            <TextField label="Banque (optionnel)" value={bank} onChangeText={setBank} placeholder="Nom de la banque" />
          </>
        ) : null}

        <TextField
          label="Notes (facultatif)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder="Toute information utile pour l'administrateur"
        />

        <Text className="mb-1.5 text-sm font-medium text-foreground">Justificatif (image ou PDF)</Text>
        <Pressable
          onPress={handlePickFile}
          className="mb-4 flex-row items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-3"
        >
          <Paperclip size={16} color="rgb(107, 114, 128)" />
          <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
            {file?.name ?? "Cliquez pour sélectionner un fichier"}
          </Text>
        </Pressable>

        <Checkbox
          checked={accept}
          onChange={setAccept}
          label="Je certifie que les informations et le justificatif fournis sont exacts et j'accepte les conditions générales."
        />

        <Button
          label="Envoyer le justificatif"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!accept || !file}
          className="mt-5"
        />
        <View className="mt-2 flex-row items-center justify-center gap-1.5">
          <Lock size={12} color="rgb(107, 114, 128)" />
          <Text className="text-xs text-muted-foreground">Vos données sont transmises de façon sécurisée.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
