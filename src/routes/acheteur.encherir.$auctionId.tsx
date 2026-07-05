import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * This page used to duplicate /auctions/$auctionId with its own bidding UI
 * and its own (buggy) realtime handling — consolidated into a single
 * bidding page to avoid drift between the two. Kept as a redirect so old
 * links/bookmarks still land somewhere useful instead of 404ing.
 */
export const Route = createFileRoute("/acheteur/encherir/$auctionId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/auctions/$auctionId", params: { auctionId: params.auctionId } });
  },
});
