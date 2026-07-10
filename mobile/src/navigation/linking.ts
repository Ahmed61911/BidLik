import type { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

/**
 * Deep link prefixes. `bidlik://` for the custom scheme (used by push
 * notification taps and the CMI WebView payment-callback redirect — see
 * architecture plan §3/§7), plus any configured universal link host.
 *
 * RootNavigator swaps its entire child tree (AuthStack vs Acheteur/VendeurTabs)
 * based on auth state rather than nesting them under stable "Auth"/"Acheteur"/
 * "Vendeur" route names, so this config maps directly to whichever leaf
 * screen names are actually mounted for the unauthenticated case (the only
 * one that matters for password recovery). The authenticated-side path map
 * (auction/:id, payment/:id, etc. — see architecture plan §7 step 5) is
 * filled in during phase 7 once those screens exist and notification
 * deep-linking is wired up.
 */
export const linking: LinkingOptions<Record<string, object | undefined>> = {
  prefixes: [Linking.createURL("/"), "bidlik://"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      PendingActivation: "pending-activation",
    },
  },
};
