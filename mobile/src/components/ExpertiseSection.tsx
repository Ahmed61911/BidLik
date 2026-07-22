import { useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { FileText, Star } from "lucide-react-native";
import type { CarExpertise } from "@/types";
import { getSignedUrl } from "@/services/storage";
import { ImageLightbox } from "@/components/ImageLightbox";

const CRITERIA: { key: keyof NonNullable<CarExpertise["checklist"]>; label: string }[] = [
  { key: "carrosserie", label: "Carrosserie" },
  { key: "moteur", label: "Moteur & boîte" },
  { key: "interieur", label: "Intérieur" },
  { key: "pneus", label: "Pneus & freins" },
  { key: "electronique", label: "Électronique" },
];

/** Ported from webapp/src/routes/auctions.$auctionId.tsx's ExpertiseSection. */
export function ExpertiseSection({ expertise, canPreviewPhotos }: { expertise: CarExpertise; canPreviewPhotos: boolean }) {
  const c = expertise.checklist;
  const [rapportSignedUrl, setRapportSignedUrl] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (expertise.rapportUrl) {
      void getSignedUrl("car-images", expertise.rapportUrl)
        .then((url) => {
          if (!cancelled) setRapportSignedUrl(url);
        })
        .catch(() => {});
    }
    const photos = expertise.expertImages ?? [];
    if (canPreviewPhotos && photos.length > 0) {
      void Promise.all(
        photos.map(async (path) => {
          try {
            return [path, await getSignedUrl("car-images", path)] as const;
          } catch {
            return [path, ""] as const;
          }
        }),
      ).then((pairs) => {
        if (!cancelled) setPhotoPreviews(Object.fromEntries(pairs));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [expertise.rapportUrl, expertise.expertImages, canPreviewPhotos]);

  return (
    <View className="mt-6 rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">Rapport d'expertise</Text>
          {expertise.rapportRecuLe ? (
            <Text className="mt-0.5 text-xs text-muted-foreground">
              Reçu le {new Date(expertise.rapportRecuLe).toLocaleDateString("fr-MA")}
            </Text>
          ) : null}
        </View>
        {expertise.noteFinale != null ? (
          <View className="flex-row items-center gap-1 rounded-lg bg-accent/10 px-3 py-1.5">
            <Star size={14} color="#E94E2C" fill="#E94E2C" />
            <Text className="text-base font-bold text-accent">{expertise.noteFinale}/10</Text>
          </View>
        ) : null}
      </View>

      {c ? (
        <View className="mt-4 gap-3">
          {CRITERIA.map(({ key, label }) => {
            const v = Number(c[key] ?? 0);
            const barColor = v >= 7 ? "bg-success" : v >= 5 ? "bg-warning" : "bg-destructive";
            return (
              <View key={key}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-muted-foreground">{label}</Text>
                  <Text className="text-xs font-semibold text-foreground">{v}/10</Text>
                </View>
                <View className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <View className={`h-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, v * 10))}%` }} />
                </View>
              </View>
            );
          })}
          <View className="flex-row items-center gap-2">
            <View className={`h-2 w-2 rounded-full ${c.documents ? "bg-success" : "bg-destructive"}`} />
            <Text className="text-xs text-muted-foreground">Documents complets — {c.documents ? "oui" : "non"}</Text>
          </View>
        </View>
      ) : null}

      {expertise.commentaire ? (
        <View className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
          <Text className="text-xs font-semibold uppercase text-muted-foreground">Commentaire de l'expert</Text>
          <Text className="mt-1 text-sm text-foreground">{expertise.commentaire}</Text>
        </View>
      ) : null}

      {expertise.rapportUrl && rapportSignedUrl ? (
        <Pressable
          onPress={() => Linking.openURL(rapportSignedUrl)}
          className="mt-4 flex-row items-center gap-2 self-start rounded-md border border-border bg-background px-3 py-2"
        >
          <FileText size={16} color="rgb(31, 45, 77)" />
          <Text className="text-sm font-medium text-foreground">
            Télécharger le rapport{expertise.rapportName ? ` (${expertise.rapportName})` : ""}
          </Text>
        </Pressable>
      ) : null}

      {canPreviewPhotos && expertise.expertImages && expertise.expertImages.length > 0 ? (
        <View className="mt-5">
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Photos d'expertise ({expertise.expertImages.length})
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {expertise.expertImages.map((src, i) => (
              <Pressable
                key={src}
                onPress={() => photoPreviews[src] && setLightboxIndex(i)}
                className="h-20 w-20 overflow-hidden rounded-md border border-border bg-secondary"
              >
                {photoPreviews[src] ? (
                  <Image source={{ uri: photoPreviews[src] }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {!canPreviewPhotos ? (
        <Text className="mt-4 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Les photos d'expertise sont réservées à l'administrateur, au vendeur et à l'expert assigné.
        </Text>
      ) : null}

      {lightboxIndex !== null && expertise.expertImages ? (
        <ImageLightbox
          images={expertise.expertImages.map((src) => photoPreviews[src]).filter(Boolean)}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </View>
  );
}
