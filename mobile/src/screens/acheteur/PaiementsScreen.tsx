import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Linking, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Search, FileText, Wallet } from "lucide-react-native";
import { useAcheteurStore } from "@/store/acheteurStore";
import { usePendingPayments } from "@/hooks/usePendingPayments";
import { signedPaymentProofUrl } from "@/services/supabase/paymentsApi";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountdownTimer } from "@/components/CountdownTimer";
import { formatMad } from "@/utils/format";
import type { AcheteurWonStackParamList } from "@/navigation/types";
import type { Paiement, PaiementStatus, PaiementType } from "@/types";

const STATUS_META: Record<PaiementStatus, { tone: StatusTone; label: string }> = {
  en_attente: { tone: "amber", label: "En attente" },
  regle: { tone: "emerald", label: "Validée" },
  rembourse: { tone: "secondary", label: "Remboursé" },
  rejete: { tone: "destructive", label: "Refusée" },
};
const TYPE_LABELS: Record<PaiementType, string> = {
  achat: "Achat",
  caution: "Caution",
  commission: "Commission",
  remboursement: "Remboursement",
  virement_vendeur: "Virement vendeur",
};

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: "warn" | "info" | "ok" }) {
  const toneClass = tone === "warn" ? "text-destructive" : tone === "info" ? "text-warning-foreground" : "text-success";
  return (
    <View className="flex-1 rounded-xl border border-border bg-card p-3">
      <Text className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className={`mt-1 text-base font-extrabold ${toneClass}`}>{value}</Text>
    </View>
  );
}

export function PaiementsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AcheteurWonStackParamList>>();
  const paiements = useAcheteurStore((s) => s.paiements);
  const refreshStore = useAcheteurStore((s) => s.refresh);
  const { data: pending, refetch: refetchPending, isRefetching } = usePendingPayments();
  const [search, setSearch] = useState("");

  const totals = useMemo(() => {
    const list = pending ?? [];
    const totalDu = list.filter((p) => p.paymentStatus !== "en_attente" && p.paymentStatus !== "paye").reduce((s, p) => s + p.prixFinal, 0);
    const totalEnVerification = list.filter((p) => p.paymentStatus === "en_attente").reduce((s, p) => s + p.prixFinal, 0);
    const totalRegle = paiements.filter((p) => p.type === "achat" && p.status === "regle").reduce((s, p) => s + p.montant, 0);
    return { totalDu, totalEnVerification, totalRegle };
  }, [pending, paiements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return paiements;
    return paiements.filter((p) => [p.libelle, p.reference, p.type, p.notes ?? "", p.bank ?? ""].some((v) => v.toLowerCase().includes(q)));
  }, [paiements, search]);

  async function openProof(path?: string) {
    if (!path) return;
    try {
      const url = await signedPaymentProofUrl(path);
      Linking.openURL(url);
    } catch {
      /* ignore */
    }
  }

  async function onRefresh() {
    await Promise.all([refreshStore(), refetchPending()]);
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />}
    >
      <View className="flex-row gap-2">
        <SummaryCard label="Solde dû" value={formatMad(totals.totalDu)} tone={totals.totalDu > 0 ? "warn" : "ok"} />
        <SummaryCard label="En vérification" value={formatMad(totals.totalEnVerification)} tone={totals.totalEnVerification > 0 ? "info" : "ok"} />
        <SummaryCard label="Total réglé" value={formatMad(totals.totalRegle)} tone="ok" />
      </View>

      {pending && pending.length > 0 ? (
        <View className="mt-5 rounded-xl border-2 border-warning/30 bg-warning/5 p-4">
          <Text className="mb-3 text-sm font-bold text-foreground">À régler — 48h après validation</Text>
          {pending.map((item) => {
            const isPaid = item.paymentStatus === "paye";
            const isPendingReview = item.paymentStatus === "en_attente";
            return (
              <View key={item.auctionId} className="mb-3 rounded-lg border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {item.marque} {item.modele} ({item.annee})
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">Prix final · {formatMad(item.prixFinal)}</Text>
                {item.paymentDeadline ? (
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <Text className="text-xs text-muted-foreground">Délai paiement :</Text>
                    <CountdownTimer endsAt={item.paymentDeadline} compact />
                  </View>
                ) : null}
                <View className="mt-2 flex-row items-center justify-between">
                  {isPaid ? (
                    <StatusBadge tone="emerald" label="Paiement validé" />
                  ) : isPendingReview ? (
                    <StatusBadge tone="amber" label="En vérification admin" />
                  ) : (
                    <View />
                  )}
                  {!isPaid ? (
                    <Pressable
                      onPress={() =>
                        navigation.getParent<NativeStackNavigationProp<{ WonTab: { screen: "UploadPaymentProof"; params: { auctionId: string } } }>>()?.navigate("WonTab", {
                          screen: "UploadPaymentProof",
                          params: { auctionId: item.auctionId },
                        })
                      }
                      className="rounded-lg bg-primary px-3 py-1.5"
                    >
                      <Text className="text-xs font-semibold text-primary-foreground">{isPendingReview ? "Remplacer" : "Soumettre"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-5 flex-row items-center rounded-lg border border-border bg-card px-3">
        <Search size={16} color="rgb(107, 114, 128)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Libellé, référence, banque..."
          placeholderTextColor="rgb(107, 114, 128)"
          className="ml-2 flex-1 py-2.5 text-sm text-foreground"
        />
      </View>

      <View className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="Aucun paiement" subtitle="Votre historique de paiements apparaîtra ici." />
        ) : (
          filtered.map((p: Paiement) => {
            const meta = STATUS_META[p.status];
            return (
              <View key={p.id} className="mb-3 rounded-xl border border-border bg-card p-4">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">{TYPE_LABELS[p.type]}</Text>
                    <Text className="text-sm font-semibold text-foreground">{p.libelle}</Text>
                    {p.reference ? <Text className="mt-0.5 font-mono text-xs text-muted-foreground">{p.reference}</Text> : null}
                  </View>
                  <StatusBadge tone={meta.tone} label={meta.label} />
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString("fr-MA")}</Text>
                  <Text className="text-sm font-bold text-foreground">{formatMad(p.montant)}</Text>
                </View>
                {p.proofUrl ? (
                  <Pressable onPress={() => openProof(p.proofUrl)} className="mt-2 flex-row items-center gap-1.5 self-start">
                    <FileText size={14} color="rgb(31, 45, 77)" />
                    <Text className="text-xs font-medium text-primary">{p.proofName ?? "Voir"}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
