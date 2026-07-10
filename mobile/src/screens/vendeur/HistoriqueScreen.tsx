import { useMemo } from "react";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { CheckCircle2, XCircle, TrendingUp, History, type LucideIcon } from "lucide-react-native";
import { useSellerCars, useSellerPayouts } from "@/hooks/useVendeur";
import { STAGE_LABEL, STAGE_TONE } from "@/constants/vendeurStages";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMad } from "@/utils/format";
import type { SellerCarStage } from "@/types";

const PAST_STAGES: SellerCarStage[] = ["vendu", "annulee"];

function Kpi({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: LucideIcon; tone?: "success" }) {
  const toneClass = tone === "success" ? "text-success" : "text-foreground";
  const iconColor = tone === "success" ? "#16A34A" : "#22283A";
  return (
    <View className="flex-1 rounded-xl border border-border bg-card p-3">
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text className="text-[10px] font-medium text-muted-foreground">{label}</Text>
        <Icon size={14} color={iconColor} />
      </View>
      <Text className={`text-base font-bold ${toneClass}`}>{value}</Text>
    </View>
  );
}

function Info({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <View className="w-[48%]">
      <Text className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Text>
      <Text className={`mt-0.5 text-sm font-medium ${colorClass ?? "text-foreground"}`}>{value}</Text>
    </View>
  );
}

export function HistoriqueScreen() {
  const { data: cars, isRefetching: carsRefetching, refetch: refetchCars } = useSellerCars();
  const { data: payouts, isRefetching: payoutsRefetching, refetch: refetchPayouts } = useSellerPayouts();

  const past = useMemo(
    () => (cars ?? []).filter((c) => PAST_STAGES.includes(c.stage)).sort((a, b) => (a.soumisLe < b.soumisLe ? 1 : -1)),
    [cars],
  );
  const ventes = past.filter((c) => c.stage === "vendu");
  const totalVentes = ventes.reduce((s, c) => s + (c.prixFinal ?? 0), 0);
  const totalPayouts = (payouts ?? []).filter((p) => p.status === "vire").reduce((s, p) => s + p.net, 0);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 py-4"
      refreshControl={<RefreshControl refreshing={carsRefetching || payoutsRefetching} onRefresh={() => { refetchCars(); refetchPayouts(); }} />}
    >
      <View className="flex-row gap-2">
        <Kpi label="Ventes finalisées" value={ventes.length} icon={CheckCircle2} tone="success" />
        <Kpi label="CA brut total" value={formatMad(totalVentes)} icon={TrendingUp} />
        <Kpi label="Net versé" value={formatMad(totalPayouts)} icon={TrendingUp} tone="success" />
      </View>

      {past.length === 0 ? (
        <EmptyState icon={History} title="Aucun historique" subtitle="Vos ventes finalisées apparaîtront ici." />
      ) : (
        <View className="mt-4">
          {past.map((c) => {
            const isVendu = c.stage === "vendu";
            const Icon = isVendu ? CheckCircle2 : XCircle;
            return (
              <View key={c.id} className="mb-3 rounded-xl border border-border bg-card p-4">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Icon size={16} color={isVendu ? "#16A34A" : "#DC2626"} />
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    #{c.id} — {c.marque} {c.modele} ({c.annee})
                  </Text>
                  <StatusBadge tone={STAGE_TONE[c.stage]} label={STAGE_LABEL[c.stage]} />
                </View>
                <View className="mt-3 flex-row flex-wrap gap-y-3">
                  <Info label="Prix plancher" value={formatMad(c.prixPlancher)} />
                  <Info label="Prix final" value={c.prixFinal ? formatMad(c.prixFinal) : "—"} colorClass={isVendu ? "text-success" : undefined} />
                  <Info label="Acheteur" value={c.acheteurNom ?? "—"} />
                  <Info label="Date" value={c.soumisLe} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {payouts && payouts.length > 0 ? (
        <View className="mt-4 rounded-xl border border-border bg-card p-4">
          <Text className="mb-3 text-sm font-semibold text-foreground">Versements</Text>
          {payouts.map((p) => (
            <View key={p.id} className="flex-row items-center justify-between border-t border-border py-3 first:border-t-0">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground" numberOfLines={1}>#{p.carId} — {p.carLabel}</Text>
                <Text className="text-[11px] text-muted-foreground">{p.date} · commission {formatMad(p.commission)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <StatusBadge
                  tone={p.status === "vire" ? "emerald" : p.status === "en_attente" ? "amber" : "destructive"}
                  label={p.status === "vire" ? "Versé" : p.status === "en_attente" ? "En attente" : "Annulé"}
                />
                <Text className="text-base font-bold text-foreground">{formatMad(p.net)}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
