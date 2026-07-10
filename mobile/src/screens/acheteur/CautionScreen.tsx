import { useMemo } from "react";
import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CheckCircle2, Clock, XCircle, AlertCircle, Shield, FileText } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useAcheteurStore } from "@/store/acheteurStore";
import { CAUTION_AMOUNT } from "@/services/supabase/cautionApi";
import { signedPaymentProofUrl } from "@/services/supabase/paymentsApi";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { formatMad } from "@/utils/format";
import type { AcheteurPaymentsStackParamList } from "@/navigation/types";
import type { Paiement, PaiementStatus } from "@/types";

const STATUS_META: Record<PaiementStatus, { tone: StatusTone; label: string }> = {
  en_attente: { tone: "amber", label: "En attente" },
  regle: { tone: "emerald", label: "Validée" },
  rembourse: { tone: "secondary", label: "Remboursé" },
  rejete: { tone: "destructive", label: "Refusée" },
};

export function CautionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurPaymentsStackParamList>>();
  const user = useAuthStore((s) => s.session?.user);
  const paiements = useAcheteurStore((s) => s.paiements);
  const validated = user?.cautionValidee ?? false;

  const cautionPaiements = useMemo(() => paiements.filter((p) => p.type === "caution"), [paiements]);
  const latestCaution = cautionPaiements[0];
  const hasPending = !validated && cautionPaiements.some((p) => p.status === "en_attente");
  const wasRejected = !validated && !hasPending && latestCaution?.status === "rejete";

  const state = validated ? "validated" : hasPending ? "pending" : wasRejected ? "rejected" : "unpaid";

  const stateMeta = {
    validated: { icon: CheckCircle2, wrapBg: "bg-success/15", wrapText: "text-success", iconColor: "#16A34A", title: "Caution validée" },
    pending: { icon: Clock, wrapBg: "bg-warning/15", wrapText: "text-warning-foreground", iconColor: "#D97706", title: "En attente de validation" },
    rejected: { icon: XCircle, wrapBg: "bg-destructive/10", wrapText: "text-destructive", iconColor: "#DC2626", title: "Caution refusée" },
    unpaid: { icon: AlertCircle, wrapBg: "bg-destructive/10", wrapText: "text-destructive", iconColor: "#DC2626", title: "Caution requise" },
  }[state];
  const StateIcon = stateMeta.icon;

  async function openProof(path?: string) {
    if (!path) return;
    try {
      const url = await signedPaymentProofUrl(path);
      Linking.openURL(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 py-4">
      <View className={`items-center rounded-2xl p-6 ${stateMeta.wrapBg}`}>
        <StateIcon size={40} color={stateMeta.iconColor} />
        <Text className={`mt-3 text-lg font-bold ${stateMeta.wrapText}`}>{stateMeta.title}</Text>
        {state === "validated" ? (
          <View className="mt-2 flex-row items-center gap-1 rounded-full bg-success/20 px-2.5 py-1">
            <Shield size={12} color="#16A34A" />
            <Text className="text-xs font-semibold text-success">Active</Text>
          </View>
        ) : null}
      </View>

      <Text className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Une caution remboursable de {formatMad(CAUTION_AMOUNT)} est nécessaire pour participer aux enchères. Elle vous est
        restituée intégralement si vous ne remportez aucune enchère.
      </Text>

      {state === "pending" ? (
        <Text className="mt-3 text-sm text-muted-foreground">
          Votre justificatif a bien été reçu. Un administrateur va vérifier le paiement — vous serez notifié dès validation.
        </Text>
      ) : null}

      {!validated ? (
        <>
          <Text className="mt-4 text-xs text-muted-foreground">
            Virement, chèque ou espèces — validation manuelle par un administrateur. Paiement par carte bientôt disponible.
          </Text>
          <Button
            label={state === "rejected" ? "Soumettre un nouveau justificatif" : "Déposer ma caution"}
            onPress={() => navigation.navigate("CautionPaiement")}
            className="mt-4"
          />
        </>
      ) : null}

      {cautionPaiements.length > 0 ? (
        <View className="mt-8">
          <Text className="mb-3 text-base font-bold text-foreground">Historique des cautions</Text>
          {cautionPaiements.map((p: Paiement) => {
            const meta = STATUS_META[p.status];
            return (
              <View key={p.id} className="mb-3 rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">Dépôt de caution</Text>
                    <Text className="mt-0.5 text-xs text-muted-foreground">{new Date(p.date).toLocaleString("fr-MA")}</Text>
                  </View>
                  <StatusBadge tone={meta.tone} label={meta.label} />
                </View>
                {p.paymentMethod ? (
                  <Text className="mt-2 text-xs text-muted-foreground capitalize">{p.paymentMethod}{p.bank ? ` · ${p.bank}` : ""}</Text>
                ) : null}
                {p.reference ? <Text className="mt-1 font-mono text-xs text-muted-foreground">{p.reference}</Text> : null}
                {p.notes ? <Text className="mt-1 text-xs text-muted-foreground">Note: {p.notes}</Text> : null}
                <View className="mt-2 flex-row items-center justify-between">
                  {p.proofUrl ? (
                    <Pressable onPress={() => openProof(p.proofUrl)} className="flex-row items-center gap-1.5">
                      <FileText size={14} color="rgb(31, 45, 77)" />
                      <Text className="text-xs font-medium text-primary">{p.proofName ?? "Voir le justificatif"}</Text>
                    </Pressable>
                  ) : (
                    <View />
                  )}
                  <Text className="text-sm font-bold text-foreground">{formatMad(p.montant)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}
