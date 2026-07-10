import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "./types";
import { ProfileScreen } from "@/screens/shared/ProfileScreen";
import { ChangePasswordScreen } from "@/screens/shared/ChangePasswordScreen";
import { NotificationsScreen } from "@/screens/shared/NotificationsScreen";
import { SupportScreen } from "@/screens/shared/SupportScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/** Shared between AcheteurTabs and VendeurTabs — same screens regardless of role. */
export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profil" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Mot de passe" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: "Support" }} />
    </Stack.Navigator>
  );
}
