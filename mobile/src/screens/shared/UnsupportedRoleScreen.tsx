import { View, Text, Pressable } from "react-native";
import { LogOut } from "lucide-react-native";
import { useAuthStore } from "@/store/authStore";

/** Shown when an authenticated account has neither the acheteur nor vendeur role
 * (e.g. admin/expert-only). Renders its own logout button rather than reusing
 * ScreenPlaceholder — this screen doesn't mount either tab navigator, so
 * ProfileScreen (where "Se déconnecter" normally lives) is unreachable from here. */
export function UnsupportedRoleScreen() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-2xl font-semibold text-foreground text-center">Compte non pris en charge</Text>
      <Text className="mt-2 text-base text-muted-foreground text-center">
        Ce compte n'a pas de rôle Acheteur ou Vendeur. Utilisez la plateforme web Bidlik pour y accéder.
      </Text>
      <Pressable
        onPress={logout}
        className="mt-8 flex-row items-center justify-center self-stretch rounded-lg bg-destructive px-4 py-3.5"
      >
        <LogOut size={18} color="#FFFFFF" />
        <Text className="ml-2 font-semibold text-destructive-foreground">Se déconnecter</Text>
      </Pressable>
    </View>
  );
}
