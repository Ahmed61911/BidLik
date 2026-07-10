import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { View, Text, AppState, type AppStateStatus } from "react-native";
import { Fingerprint } from "lucide-react-native";
import { useAppStore } from "@/store/appStore";
import { authenticateWithBiometrics } from "@/services/biometrics";
import { Button } from "@/components/ui/Button";

/**
 * Gates its children behind a biometric prompt whenever the lock is enabled
 * (see architecture plan §3: "an app-lock layer on top of the persisted
 * Supabase session", not a replacement for password auth). Re-locks whenever
 * the app returns to the foreground from the background, not just on cold start.
 */
export function BiometricGate({ children }: PropsWithChildren) {
  const biometricLockEnabled = useAppStore((s) => s.biometricLockEnabled);
  const [hydrated, setHydrated] = useState(useAppStore.persist.hasHydrated());
  const [unlocked, setUnlocked] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (hydrated) return;
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  const attemptUnlock = async () => {
    setAuthenticating(true);
    try {
      const success = await authenticateWithBiometrics("Déverrouillez Bidlik");
      setUnlocked(success);
    } finally {
      setAuthenticating(false);
    }
  };

  useEffect(() => {
    if (!hydrated || !biometricLockEnabled) return;
    void attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, biometricLockEnabled]);

  useEffect(() => {
    if (!biometricLockEnabled) return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        setUnlocked(false);
        void attemptUnlock();
      }
      appState.current = next;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricLockEnabled]);

  if (!hydrated) return null;
  if (!biometricLockEnabled || unlocked) return <>{children}</>;

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Fingerprint size={32} color="rgb(31, 45, 77)" />
      </View>
      <Text className="mt-6 text-xl font-semibold text-foreground text-center">Application verrouillée</Text>
      <Text className="mt-2 text-base text-muted-foreground text-center">Authentifiez-vous pour continuer.</Text>
      <Button label="Déverrouiller" onPress={attemptUnlock} loading={authenticating} className="mt-8 self-stretch" />
    </View>
  );
}
