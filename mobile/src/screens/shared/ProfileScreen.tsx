import { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronRight, LogOut } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import { isBiometricSupported, authenticateWithBiometrics } from "@/services/biometrics";
import { toast } from "@/utils/toast";
import type { ProfileStackParamList } from "@/navigation/types";
import type { MobileRole } from "@/types";

function ProfileRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center justify-between border-b border-border py-4">
      <Text className="text-base text-foreground">{label}</Text>
      <ChevronRight size={18} color="rgb(107, 114, 128)" />
    </Pressable>
  );
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View className="flex-row gap-1 rounded-lg bg-secondary p-1">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className={`flex-1 items-center rounded-md py-1.5 ${active ? "bg-card" : ""}`}
          >
            <Text className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { session, logout } = useAuthStore();
  const biometricLockEnabled = useAppStore((s) => s.biometricLockEnabled);
  const setBiometricLockEnabled = useAppStore((s) => s.setBiometricLockEnabled);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const setColorScheme = useAppStore((s) => s.setColorScheme);
  const activeRole = useAppStore((s) => s.activeRole);
  const setActiveRole = useAppStore((s) => s.setActiveRole);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    void isBiometricSupported().then(setBiometricAvailable);
  }, []);

  const availableRoles = (["acheteur", "vendeur"] as MobileRole[]).filter((r) => session?.user.roles.includes(r));

  const onToggleBiometric = async (value: boolean) => {
    if (value) {
      const success = await authenticateWithBiometrics("Activer le verrouillage biométrique");
      if (!success) {
        toast.error("Activation annulée");
        return;
      }
    }
    setBiometricLockEnabled(value);
    toast.success(value ? "Verrouillage biométrique activé" : "Verrouillage biométrique désactivé");
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 py-6">
      <Text className="text-2xl font-bold text-foreground">{session?.user.nom}</Text>
      <Text className="mt-1 text-base text-muted-foreground">{session?.user.email}</Text>
      <Text className="mt-1 text-sm capitalize text-muted-foreground">{session?.user.roles.join(" · ")}</Text>

      {availableRoles.length > 1 ? (
        <View className="mt-8">
          <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Mode d'affichage</Text>
          <Segmented
            value={(activeRole ?? availableRoles[0]) as MobileRole}
            options={availableRoles.map((r) => ({ key: r, label: r === "acheteur" ? "Acheteur" : "Vendeur" }))}
            onChange={(r) => setActiveRole(r)}
          />
        </View>
      ) : null}

      <View className="mt-8">
        <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Apparence</Text>
        <Segmented
          value={colorScheme}
          options={[
            { key: "system", label: "Système" },
            { key: "light", label: "Clair" },
            { key: "dark", label: "Sombre" },
          ]}
          onChange={setColorScheme}
        />
      </View>

      <View className="mt-8">
        <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sécurité</Text>
        <ProfileRow label="Changer le mot de passe" onPress={() => navigation.navigate("ChangePassword")} />
        {biometricAvailable ? (
          <View className="flex-row items-center justify-between border-b border-border py-4">
            <Text className="text-base text-foreground">Verrouillage biométrique</Text>
            <Switch value={biometricLockEnabled} onValueChange={onToggleBiometric} />
          </View>
        ) : null}
      </View>

      <View className="mt-8">
        <Text className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Compte</Text>
        <ProfileRow label="Notifications" onPress={() => navigation.navigate("Notifications")} />
        <ProfileRow label="Support" onPress={() => navigation.navigate("Support")} />
      </View>

      <Pressable onPress={logout} className="mt-8 flex-row items-center justify-center rounded-lg bg-destructive px-4 py-3.5">
        <LogOut size={18} color="#FFFFFF" />
        <Text className="ml-2 font-semibold text-destructive-foreground">Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}
