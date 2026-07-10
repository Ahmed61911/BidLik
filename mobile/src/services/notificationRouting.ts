/**
 * Maps a notification (type + optional auction_id) to an in-app navigation
 * action, per architecture plan §4/§7. Used both when a push is tapped and
 * when an in-app notification-center row is tapped, so the two behave
 * identically.
 *
 * The active role decides which tab tree is mounted (see RootNavigator), so
 * we target tab → nested stack → screen. Acheteur and vendeur mount different
 * tabs; a target only fires if that tab exists in the current role's tree
 * (React Navigation silently no-ops an unknown route, which is the desired
 * graceful fallback for a cross-role notification).
 */
import { navigationRef, navigateWhenReady } from "@/navigation/navigationRef";
import type { NotifType } from "@/types";

export interface NotificationTarget {
  type: NotifType;
  auctionId?: string | null;
}

export function routeNotification({ type, auctionId }: NotificationTarget) {
  navigateWhenReady(() => {
    if (!navigationRef.isReady()) return;
    // navigationRef is created without a param-list type, so its navigate
    // overloads reject dynamic tab/screen names — go through one loosely-typed
    // shim rather than sprinkling `as never` at every call site.
    const go = navigationRef.navigate as (tab: string, params?: object) => void;

    switch (type) {
      // Live-bidding events → the auction detail (buyer's Home stack).
      case "outbid":
      case "ending_soon":
      case "auction_starting":
        if (auctionId) go("HomeTab", { screen: "AuctionDetail", params: { auctionId } });
        break;

      // Post-close outcomes → the won-auction detail.
      case "won":
      case "vehicle_ready":
        if (auctionId) go("WonTab", { screen: "WonAuctionDetail", params: { auctionId } });
        else go("WonTab");
        break;
      case "lost":
        go("MyBidsTab");
        break;

      // Payment outcomes → payments.
      case "payment_approved":
      case "payment_rejected":
        go("PaymentsTab", { screen: "Paiements" });
        break;

      // Caution → caution status.
      case "caution":
        go("PaymentsTab", { screen: "Caution" });
        break;

      // Announcements / anything else → the in-app notification center.
      case "announcement":
      case "system":
      default:
        go("ProfileTab", { screen: "Notifications" });
        break;
    }
  });
}
