import { useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Paperclip } from "lucide-react-native";
import { getMyWonCarDetails } from "@/services/supabase/wonAuctionsApi";
import { submitBuyerPayment } from "@/services/supabase/paymentsApi";
import { pickProofFile, uploadProof, type PickedFile } from "@/services/upload";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatMad } from "@/utils/format";
import { toast } from "@/utils/toast";
import type { AcheteurWonStackParamList } from "@/navigation/types";

const METHODS = [
  { key: "virement", label: "Virement" },
  { key: "cheque", label: "Chèque" },
  { key: "especes", label: "Espèces" },
  { key: "carte", label: "Carte" },
  { key: "autre", label: "Autre" },
] as const;
type Method = (typeof METHODS)[number]["key"];

export function UploadPaymentProofScreen() {
  const route = useRoute<RouteProp<AcheteurWonStackParamList, "UploadPaymentProof">>();
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurWonStackParamList>>();
  const queryClient = useQueryClient();
  const { auctionId } = route.params;

  const { data, isPending } = useQuery({
    queryKey: ["won-auction-detail", auctionId],
    queryFn: () => getMyWonCarDetails(auctionId),
  });

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("virement");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const effectiveAmount = amount || String(data?.auction.currentPrice ?? "");

  async function handlePickFile() {
    try {
      const picked = await pickProofFile();
      if (picked) setFile(picked);
    } catch (e) {
      toast.error("Sélection impossible", (e as Error).message);
    }
  }

  async function handleSubmit() {
    if (!data) return;
    if (!file) {
      toast.error("Justificatif requis", "Veuillez joindre un justificatif (PDF ou image).");
      return;
    }
    const n = Number(effectiveAmount.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (!reference.trim()) {
      toast.error("Référence requise", "Merci d'indiquer la référence du paiement.");
      return;
    }
    if (method === "cheque" && !dueDate) {
      toast.error("Date d'échéance requise", "La date d'échéance du chèque est requise.");
      return;
    }
    setSubmitting(true);
    try {
      const uploaded = await uploadProof({ file, bucket: "payment-proofs", category: "car-payment", carId: data.car.id });
      await submitBuyerPayment({
        auctionId,
        amount: n,
        reference: reference.trim(),
        proofUrl: uploaded.path,
        proofName: uploaded.name,
        notes: notes.trim(),
        paymentMethod: method,
        bank: bank.trim() || null,
        dueDate: method === "cheque" ? dueDate : null,
      });
      await queryClient.invalidateQueries({ queryKey: ["won-auction-detail", auctionId] });
      toast.success("Paiement soumis", "En attente de vérification par un administrateur.");
      navigation.goBack();
    } catch (e) {
      toast.error("Échec de l'envoi", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (isPending || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-4 py-4">
        <Text className="text-base font-semibold text-foreground">
          {data.car.marque} {data.car.modele} ({data.car.annee}) — {formatMad(data.auction.currentPrice)}
        </Text>
        {data.auction.paymentDeadline ? (
          <View className="mt-1 flex-row items-center gap-1.5">
            <Text className="text-xs text-muted-foreground">Délai de paiement :</Text>
            <CountdownTimer endsAt={data.auction.paymentDeadline} compact />
          </View>
        ) : null}

        <View className="mt-5">
          <TextField
            label="Montant payé (DH)"
            value={effectiveAmount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder={String(data.auction.currentPrice)}
          />

          <Text className="mb-1.5 text-sm font-medium text-foreground">Mode de paiement</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {METHODS.map((m) => {
              const active = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  className={`rounded-full border px-3 py-1.5 ${active ? "border-primary bg-primary" : "border-border bg-card"}`}
                >
                  <Text className={`text-xs font-semibold ${active ? "text-primary-foreground" : "text-foreground"}`}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="Référence du virement / chèque"
            value={reference}
            onChangeText={setReference}
            placeholder="VIR-2026-..."
          />
          <TextField label="Banque (optionnel)" value={bank} onChangeText={setBank} placeholder="Attijariwafa, BMCE, CIH…" />
          {method === "cheque" ? (
            <TextField label="Date d'échéance du chèque" value={dueDate} onChangeText={setDueDate} placeholder="AAAA-MM-JJ" />
          ) : null}
          <TextField label="Notes (optionnel)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

          <Text className="mb-1.5 text-sm font-medium text-foreground">Justificatif (PDF, image)</Text>
          <Pressable
            onPress={handlePickFile}
            className="mb-4 flex-row items-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-3"
          >
            <Paperclip size={16} color="rgb(107, 114, 128)" />
            <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
              {file?.name ?? "Cliquez pour sélectionner un fichier"}
            </Text>
          </Pressable>

          <Button label="Soumettre le paiement" onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
