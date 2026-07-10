import { useEffect, useMemo } from "react";
import { View, ActivityIndicator } from "react-native";
import { initAuth, useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import { AuthStack } from "./AuthStack";
import { AcheteurTabs } from "./AcheteurTabs";
import { VendeurTabs } from "./VendeurTabs";
import { UnsupportedRoleScreen } from "@/screens/shared/UnsupportedRoleScreen";
import { BiometricGate } from "@/components/BiometricGate";
import { initNotificationsStore } from "@/store/notificationsStore";
import { registerForPushNotifications } from "@/services/pushNotifications";
import type { MobileRole } from "@/types/auth";

const MOBILE_ROLES: MobileRole[] = ["acheteur", "vendeur"];

export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  const activeRole = useAppStore((s) => s.activeRole);
  const setActiveRole = useAppStore((s) => s.setActiveRole);

  useEffect(() => {
    initAuth();
  }, []);

  // Once authenticated: start the shared notification center and register this
  // device for push. Both are idempotent/best-effort.
  useEffect(() => {
    if (status !== "authenticated") return;
    initNotificationsStore();
    void registerForPushNotifications();
  }, [status]);

  const availableRoles = useMemo(
    () => (session ? MOBILE_ROLES.filter((r) => session.user.roles.includes(r)) : []),
    [session],
  );

  useEffect(() => {
    if (availableRoles.length === 0) return;
    if (activeRole && availableRoles.includes(activeRole)) return;
    setActiveRole(availableRoles[0]);
  }, [availableRoles, activeRole, setActiveRole]);

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (status === "anonymous" || !session) {
    return <AuthStack />;
  }

  if (availableRoles.length === 0) {
    return <UnsupportedRoleScreen />;
  }

  const roleToShow = activeRole && availableRoles.includes(activeRole) ? activeRole : availableRoles[0];
  return <BiometricGate>{roleToShow === "vendeur" ? <VendeurTabs /> : <AcheteurTabs />}</BiometricGate>;
}
