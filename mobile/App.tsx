import "react-native-gesture-handler";
import "./global.css";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";
import { useEffect } from "react";
import { RootNavigator } from "@/navigation/RootNavigator";
import { linking } from "@/navigation/linking";
import { navigationRef } from "@/navigation/navigationRef";
import { queryClient, asyncStoragePersister } from "@/services/queryClient";
import { setupNotificationTapHandling } from "@/services/pushNotifications";
import { useAppTheme } from "@/theme/useAppTheme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";

export default function App() {
  const scheme = useAppTheme();

  useEffect(() => {
    // Deep-link notification taps (including the cold-start case) into screens.
    return setupNotificationTapHandling();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
            <NavigationContainer ref={navigationRef} linking={linking} theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
              <OfflineBanner />
              <RootNavigator />
              <StatusBar style={scheme === "dark" ? "light" : "dark"} />
            </NavigationContainer>
            <Toast />
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
