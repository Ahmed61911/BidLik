/**
 * TanStack Query client + AsyncStorage persister — read-only offline cache
 * (view last-loaded auctions/purchases/vehicles while offline, per
 * architecture plan §3 "Offline strategy"). Bidding itself always requires a
 * live connection, so mutations are never persisted/replayed offline.
 */
import { QueryClient, onlineManager } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Drive TanStack Query's online state from real device connectivity so it
// pauses fetches while offline and refetches automatically on reconnect
// (React Native has no browser `online`/`offline` events to hook by default).
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "bidlik-query-cache",
});
