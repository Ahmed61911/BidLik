import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "./types";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import { ForgotPasswordScreen } from "@/screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/auth/ResetPasswordScreen";
import { PendingActivationScreen } from "@/screens/auth/PendingActivationScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: "Mot de passe oublié" }} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: true, title: "Nouveau mot de passe" }} />
      <Stack.Screen name="PendingActivation" component={PendingActivationScreen} />
    </Stack.Navigator>
  );
}
