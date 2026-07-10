import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Zap, Trophy, AlertTriangle, Lock } from "lucide-react-native";
import type { Auction } from "@/types";
import { formatMad, listingPriceTier, priceTierBgClass } from "@/utils/format";
import { CountdownTimer } from "./CountdownTimer";

interface Props {
  auction: Auction;
  isAuthenticated: boolean;
  isAcheteur: boolean;
  isVendeur: boolean;
  isAdmin: boolean;
  cautionOk: boolean;
  userHasBid: boolean;
  isLeading: boolean;
  submitting: boolean;
  onPlaceBid: (amount: number) => void;
  autoBidEnabled: boolean;
  autoBidSaving: boolean;
  maxBid: string;
  onChangeMaxBid: (v: string) => void;
  onSaveAutoBid: (enable: boolean) => void;
  onLogin: () => void;
  onGoToCaution: () => void;
}

/** Ported from webapp/src/routes/auctions.$auctionId.tsx's bidding panel. */
export function BidPanel({
  auction,
  isAuthenticated,
  isAcheteur,
  isVendeur,
  isAdmin,
  cautionOk,
  userHasBid,
  isLeading,
  submitting,
  onPlaceBid,
  autoBidEnabled,
  autoBidSaving,
  maxBid,
  onChangeMaxBid,
  onSaveAutoBid,
  onLogin,
  onGoToCaution,
}: Props) {
  const [customAmount, setCustomAmount] = useState("");
  const isLive = auction.status === "live";
  const canBid = isAuthenticated && isAcheteur && cautionOk;
  const tier = listingPriceTier(auction.currentPrice, auction.car);
  const minAutoBidMax = auction.currentPrice + 1000;

  function placeCustom() {
    const n = Number(customAmount.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) return;
    onPlaceBid(auction.currentPrice + n);
    setCustomAmount("");
  }

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      <View className={`p-5 ${priceTierBgClass(tier)}`}>
        <View className="flex-row items-start justify-between gap-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-white/85">Offre actuelle</Text>
            <Text className="mt-1 text-3xl font-extrabold text-white">{formatMad(auction.currentPrice)}</Text>
            <Text className="mt-1 text-xs text-white/85">
              {auction.bidCount} {auction.bidCount > 1 ? "offres" : "offre"}
            </Text>
          </View>
          {isLive ? (
            <View className="flex-row items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
              <View className="h-1.5 w-1.5 rounded-full bg-white" />
              <Text className="text-xs font-semibold text-white">EN DIRECT</Text>
            </View>
          ) : null}
        </View>
        <View className="mt-4 flex-row items-center justify-between border-t border-white/20 pt-3">
          <Text className="text-sm text-white/85">Temps restant</Text>
          <CountdownTimer endsAt={auction.endsAt} className="!text-white" />
        </View>
      </View>

      <View className="gap-3 p-5">
        {!isLive ? (
          <View className="rounded-lg bg-secondary p-4">
            <Text className="text-center text-sm text-secondary-foreground">Cette enchère est terminée.</Text>
          </View>
        ) : (isVendeur || isAdmin) && !isAcheteur ? (
          <View className="rounded-md border border-border bg-secondary/60 p-3">
            <Text className="text-xs leading-relaxed text-muted-foreground">
              Mode observateur — {isAdmin ? "vous pouvez suivre l'enchère en direct" : "vous pouvez suivre l'enchère de votre véhicule en direct"}, mais vous ne pouvez pas y participer.
            </Text>
          </View>
        ) : (
          <>
            {isAcheteur && cautionOk && userHasBid ? (
              <View
                className={`flex-row items-center gap-2 rounded-lg border px-3 py-2.5 ${
                  isLeading ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                }`}
              >
                {isLeading ? <Trophy size={16} color="#16A34A" /> : <AlertTriangle size={16} color="#DC2626" />}
                <Text className={`text-sm font-semibold ${isLeading ? "text-success" : "text-destructive"}`}>
                  {isLeading ? "Vous êtes en tête de l'enchère" : "Vous avez été surenchéri"}
                </Text>
              </View>
            ) : null}
            {isAcheteur && cautionOk && !userHasBid ? (
              <View className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
                <Text className="text-xs text-muted-foreground">Vous n'avez pas encore enchéri sur ce lot.</Text>
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <Pressable
                onPress={() => onPlaceBid(auction.currentPrice + 1000)}
                disabled={submitting}
                className="flex-1 items-center rounded-lg bg-accent py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-base font-bold text-accent-foreground">+1 000 DH</Text>
              </Pressable>
              <Pressable
                onPress={() => onPlaceBid(auction.currentPrice + 5000)}
                disabled={submitting}
                className="flex-1 items-center rounded-lg bg-accent py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-base font-bold text-accent-foreground">+5 000 DH</Text>
              </Pressable>
            </View>

            <View className="flex-row gap-2">
              <TextInput
                value={customAmount}
                onChangeText={(v) => setCustomAmount(v.replace(/[^\d\s]/g, ""))}
                placeholder="Montant à ajouter"
                placeholderTextColor="rgb(107, 114, 128)"
                keyboardType="numeric"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"
              />
              <Pressable
                onPress={placeCustom}
                disabled={submitting || !customAmount}
                className="items-center justify-center rounded-lg bg-primary px-4 py-2.5 disabled:opacity-50"
              >
                <Text className="text-sm font-semibold text-primary-foreground">Enchérir</Text>
              </Pressable>
            </View>

            <View className={`rounded-xl border-2 p-3.5 ${autoBidEnabled ? "border-accent bg-accent/5" : "border-border bg-secondary/30"}`}>
              <Pressable
                onPress={() => onSaveAutoBid(!autoBidEnabled)}
                disabled={autoBidSaving}
                className="flex-row items-center justify-between disabled:opacity-60"
              >
                <View className="flex-row items-center gap-2">
                  <Zap size={16} color={autoBidEnabled ? "#E94E2C" : "rgb(107, 114, 128)"} />
                  <Text className="text-sm font-semibold text-foreground">Auto-enchère</Text>
                </View>
                <View className={`h-5 w-9 justify-center rounded-full p-0.5 ${autoBidEnabled ? "bg-accent" : "bg-muted"}`}>
                  <View className={`h-4 w-4 rounded-full bg-white ${autoBidEnabled ? "self-end" : "self-start"}`} />
                </View>
              </Pressable>

              <Text className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Place automatiquement +1 000 DH à chaque fois qu'un autre acheteur vous surenchérit, jusqu'au montant max
                ci-dessous. Se désactive tout seul si ce montant est atteint.
              </Text>

              <View className="mt-2.5 flex-row items-end gap-2">
                <View className="flex-1">
                  <Text className="mb-1 text-[11px] font-medium text-muted-foreground">Montant max</Text>
                  <TextInput
                    value={maxBid}
                    onChangeText={(v) => onChangeMaxBid(v.replace(/[^\d\s]/g, ""))}
                    placeholder={`ex. ${formatMad(minAutoBidMax)}`}
                    placeholderTextColor="rgb(107, 114, 128)"
                    keyboardType="numeric"
                    className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground"
                  />
                </View>
                {autoBidEnabled ? (
                  <Pressable
                    onPress={() => onSaveAutoBid(true)}
                    disabled={autoBidSaving}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5 disabled:opacity-50"
                  >
                    <Text className="text-xs font-semibold text-accent">Mettre à jour</Text>
                  </Pressable>
                ) : null}
              </View>

              {autoBidEnabled ? (
                <Text className="mt-2 text-[11px] font-medium text-accent">
                  Active jusqu'à {formatMad(Number(maxBid.replace(/\s/g, "")) || 0)}
                </Text>
              ) : null}
            </View>

            {!isAuthenticated ? (
              <Pressable onPress={onLogin} className="rounded-md border border-warning/40 bg-warning/10 p-3">
                <Text className="text-xs leading-relaxed text-warning-foreground">
                  🔒 <Text className="font-semibold underline">Connectez-vous</Text> pour participer à cette enchère.
                </Text>
              </Pressable>
            ) : !isAcheteur ? (
              <View className="rounded-md border border-border bg-secondary/60 p-3">
                <Text className="text-xs leading-relaxed text-muted-foreground">
                  Seuls les comptes acheteurs peuvent placer des enchères.
                </Text>
              </View>
            ) : !cautionOk ? (
              <Pressable onPress={onGoToCaution} className="flex-row items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <Lock size={14} color="#DC2626" />
                <Text className="flex-1 text-xs leading-relaxed text-destructive">
                  Votre caution n'est pas validée. <Text className="font-semibold underline">Régulariser</Text>
                </Text>
              </Pressable>
            ) : (
              <View className="rounded-md bg-secondary/60 p-3">
                <Text className="text-xs leading-relaxed text-muted-foreground">
                  ✓ Caution validée. Toutes les offres sont fermes et engageantes.
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
