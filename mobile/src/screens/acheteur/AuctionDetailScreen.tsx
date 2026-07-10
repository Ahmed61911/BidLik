import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, AppState } from "react-native";
import { useRoute, useNavigation, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "@/utils/toast";
import { useAuthStore } from "@/store/authStore";
import { getAuction, listBids, getCarExpertise, placeBid as placeBidApi, setAutoBid, getAutoBid } from "@/services/supabase/auctionsApi";
import { subscribeToAuction } from "@/services/realtime";
import { scheduleAuctionEndingReminder } from "@/services/localNotifications";
import { resolveCarImageUrl } from "@/services/storage";
import type { Auction, Bid, CarExpertise } from "@/types";
import { ImageGallery } from "@/components/ImageGallery";
import { BidPanel } from "@/components/BidPanel";
import { BidHistoryList } from "@/components/BidHistoryList";
import { ExpertiseSection } from "@/components/ExpertiseSection";
import type { AcheteurHomeStackParamList, AcheteurPaymentsStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<AcheteurHomeStackParamList>;

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-[31%] rounded-lg border border-border bg-card px-3 py-2.5">
      <Text className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold capitalize text-foreground">{value}</Text>
    </View>
  );
}

export function AuctionDetailScreen() {
  const route = useRoute<RouteProp<AcheteurHomeStackParamList, "AuctionDetail">>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { auctionId } = route.params;

  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const user = session?.user ?? null;
  const isAuthenticated = !!session;
  const isAcheteur = user?.roles.includes("acheteur") ?? false;
  const isVendeur = user?.roles.includes("vendeur") ?? false;
  const isAdmin = user?.roles.includes("admin") ?? false;
  const cautionOk = user?.cautionValidee ?? false;

  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [expertise, setExpertise] = useState<CarExpertise | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoBidEnabled, setAutoBidEnabled] = useState(false);
  const [autoBidSaving, setAutoBidSaving] = useState(false);
  const [maxBid, setMaxBid] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getAuction(auctionId), listBids(auctionId), getAutoBid(auctionId)])
      .then(([a, b, ab]) => {
        if (cancelled) return;
        setAuction(a);
        setBids(b);
        setAutoBidEnabled(ab?.enabled ?? false);
        if (ab) setMaxBid(String(ab.maxAmount));
        return getCarExpertise(a.car.id).catch(() => null);
      })
      .then((exp) => {
        if (!cancelled && exp !== undefined) setExpertise(exp);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auctionId]);

  // Realtime bid subscription — patches auction/bids state directly on the
  // hot path, mirrors webapp/src/routes/auctions.$auctionId.tsx.
  useEffect(() => {
    const unsub = subscribeToAuction(auctionId, ({ bid }) => {
      setBids((prev) => {
        if (prev.some((b) => b.id === bid.id)) return prev;
        const displayBid = bid.bidderId === userIdRef.current ? bid : { ...bid, bidderName: "Anonyme" };
        return [displayBid, ...prev.filter((b) => !b.id.startsWith("optimistic-"))].slice(0, 50);
      });
      setAuction((prev) => {
        if (!prev) return prev;
        if (bid.amount <= prev.currentPrice && prev.topBidderId === bid.bidderId) return prev;
        const myId = userIdRef.current;
        if (myId && bid.bidderId !== myId && prev.topBidderId === myId) {
          toast.info("Vous avez été surenchéri", `Nouveau prix ${bid.amount} DH`);
        } else if (myId && bid.bidderId === myId && bid.isAuto) {
          toast.success("Auto-enchère utilisée", `Nouvelle offre automatique de ${bid.amount} DH.`);
        }
        const msLeft = new Date(prev.endsAt).getTime() - Date.now();
        return {
          ...prev,
          currentPrice: Math.max(prev.currentPrice, bid.amount),
          bidCount: prev.bidCount + 1,
          topBidderId: bid.bidderId,
          // Anti-sniping: a bid inside the last 2 minutes extends the clock.
          endsAt: msLeft <= 120_000 ? new Date(Date.now() + 120_000).toISOString() : prev.endsAt,
        };
      });
    });
    return unsub;
  }, [auctionId]);

  // Reconciliation: realtime doesn't replay events missed while backgrounded,
  // so refresh from the server whenever the app returns to the foreground.
  useEffect(() => {
    function reconcile() {
      Promise.all([getAuction(auctionId), listBids(auctionId), getAutoBid(auctionId)])
        .then(([freshAuction, freshBids, freshAutoBid]) => {
          setAuction(freshAuction);
          setBids(freshBids);
          if (freshAutoBid) setMaxBid(String(freshAutoBid.maxAmount));
          setAutoBidEnabled((prevEnabled) => {
            if (prevEnabled && !freshAutoBid?.enabled) {
              toast.info("Auto-enchère désactivée", "Votre montant maximum a été atteint.");
            }
            return freshAutoBid?.enabled ?? false;
          });
        })
        .catch(() => {});
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcile();
    });
    return () => sub.remove();
  }, [auctionId]);

  // Local reminder: if the user has bid on this live auction, schedule an
  // on-device "ending in 5 min" alert (re-scheduling replaces by id).
  useEffect(() => {
    if (!auction || auction.status !== "live" || !user) return;
    if (!bids.some((b) => b.bidderId === user.id)) return;
    void scheduleAuctionEndingReminder(auction.id, auction.endsAt, `${auction.car.marque} ${auction.car.modele}`);
  }, [auction, bids, user]);

  async function handlePlaceBid(amount: number) {
    if (submitting || !auction) return;
    const canBid = isAuthenticated && isAcheteur && cautionOk;
    if (!canBid) {
      toast.error(
        "Action non autorisée",
        !isAuthenticated ? "Connectez-vous pour enchérir." : !isAcheteur ? "Seuls les acheteurs peuvent enchérir." : "Votre caution doit être validée avant d'enchérir.",
      );
      return;
    }
    const prevAuction = auction;
    const prevBids = bids;
    const optimisticId = `optimistic-${Date.now()}`;
    setAuction((a) => (a ? { ...a, currentPrice: amount, bidCount: a.bidCount + 1, topBidderId: user?.id ?? a.topBidderId } : a));
    setBids((b) =>
      [
        {
          id: optimisticId,
          auctionId: auction.id,
          carId: auction.car.id,
          bidderId: user?.id ?? "",
          bidderName: user?.nom ?? "Vous",
          amount,
          isAuto: false,
          createdAt: new Date().toISOString(),
        },
        ...b,
      ].slice(0, 50),
    );
    setSubmitting(true);
    try {
      await placeBidApi({ auctionId: auction.id, amount });
      toast.success("Offre placée", `Votre offre a été enregistrée.`);
    } catch (e) {
      setAuction(prevAuction);
      setBids(prevBids);
      toast.error("Offre refusée", e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveAutoBid(enable: boolean) {
    if (autoBidSaving || !auction) return;
    let max: number | undefined;
    const minAutoBidMax = auction.currentPrice + 1000;
    if (enable) {
      max = Number(maxBid.replace(/\s/g, ""));
      if (!Number.isFinite(max) || max < minAutoBidMax) {
        toast.error("Montant max invalide", `Le montant doit être d'au moins ${minAutoBidMax} DH.`);
        return;
      }
    }
    setAutoBidSaving(true);
    try {
      const result = await setAutoBid(auction.id, enable, max);
      setAutoBidEnabled(result.enabled);
      if (result.enabled) setMaxBid(String(result.maxAmount));
      if (enable) {
        const [freshAuction, freshBids] = await Promise.all([getAuction(auction.id), listBids(auction.id)]);
        setAuction(freshAuction);
        setBids(freshBids);
      }
      toast.success(result.enabled ? "Auto-enchère activée" : "Auto-enchère désactivée");
    } catch (e) {
      toast.error("Erreur", e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setAutoBidSaving(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loadError || !auction) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <Text className="text-lg font-semibold text-foreground text-center">Une erreur est survenue</Text>
        <Text className="mt-2 text-sm text-muted-foreground text-center">{loadError}</Text>
      </View>
    );
  }

  const car = auction.car;
  const userHasBid = !!user && bids.some((b) => b.bidderId === user.id);
  const isLeading = !!user && auction.topBidderId === user.id;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <ImageGallery images={car.images.map(resolveCarImageUrl)} marque={car.marque} />

      <View className="px-4 pt-4">
        <Text className="text-xl font-bold text-foreground">
          <Text className="font-mono text-primary">#{car.id}</Text> — {car.marque} {car.modele}
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {car.finition} · {car.annee} · vendu par {car.vendeurNom}
        </Text>

        <View className="mt-5">
          <BidPanel
            auction={auction}
            isAuthenticated={isAuthenticated}
            isAcheteur={isAcheteur}
            isVendeur={isVendeur}
            isAdmin={isAdmin}
            cautionOk={cautionOk}
            userHasBid={userHasBid}
            isLeading={isLeading}
            submitting={submitting}
            onPlaceBid={handlePlaceBid}
            autoBidEnabled={autoBidEnabled}
            autoBidSaving={autoBidSaving}
            maxBid={maxBid}
            onChangeMaxBid={setMaxBid}
            onSaveAutoBid={handleSaveAutoBid}
            onLogin={logout}
            onGoToCaution={() =>
              navigation.getParent<NativeStackNavigationProp<{ PaymentsTab: { screen: keyof AcheteurPaymentsStackParamList } }>>()?.navigate("PaymentsTab", { screen: "Caution" })
            }
          />
        </View>

        <View className="mt-6 flex-row flex-wrap gap-2">
          <Spec label="MEC" value={String(car.annee)} />
          <Spec label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
          <Spec label="Carburant" value={car.carburant} />
          <Spec label="Transmission" value={car.transmission} />
          <Spec label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
          <Spec label="Note expert" value={car.noteExpert ? `${car.noteExpert}/10` : "—"} />
          <Spec label="Nombre de clés" value={String(car.nombreCles)} />
          <Spec label="Type" value={car.type} />
          <Spec label="Opposition" value={car.opposition ? "Oui" : "Non"} />
        </View>

        {expertise ? <ExpertiseSection expertise={expertise} canPreviewPhotos={expertise.expertImages !== null} /> : null}

        {auction.auctionType === "fermee" ? (
          <View className="mt-6 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <Text className="font-semibold text-foreground">🔒 Enchère à enveloppe fermée</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              L'historique et les offres concurrentes sont confidentiels. Vous ne verrez que vos propres offres.
            </Text>
          </View>
        ) : (
          <View className="mt-6">
            <Text className="text-lg font-bold text-foreground">Historique des offres</Text>
            <BidHistoryList bids={bids} car={car} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
