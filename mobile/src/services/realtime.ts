/**
 * Realtime client — ported from webapp/src/lib/realtime.ts, unchanged API.
 * Subscribes to INSERTs on `bids` for a given auction id and emits the new
 * bid immediately to listeners — no extra HTTP round-trip on the hot path.
 */
import { supabase } from "@/services/supabase/client";
import type { Bid } from "@/types";

type Listener = (payload: { bid: Bid }) => void;

const channels = new Map<string, ReturnType<typeof supabase.channel>>();
const refCounts = new Map<string, number>();
const perChannelListeners = new Map<string, Set<Listener>>();

function listenersFor(channelName: string): Set<Listener> {
  let s = perChannelListeners.get(channelName);
  if (!s) {
    s = new Set();
    perChannelListeners.set(channelName, s);
  }
  return s;
}

export function subscribeToAuction(auctionId: string, onBid: Listener): () => void {
  const channelName = `auction:${auctionId}`;

  let channel = channels.get(channelName);
  if (!channel) {
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auctionId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            auction_id: string;
            car_id: string;
            bidder_id: string;
            bidder_name: string;
            amount: number;
            is_auto: boolean;
            created_at: string;
          };
          const bid: Bid = {
            id: row.id,
            auctionId: row.auction_id,
            carId: row.car_id,
            bidderId: row.bidder_id,
            bidderName: row.bidder_name,
            amount: row.amount,
            isAuto: row.is_auto,
            createdAt: row.created_at,
          };
          listenersFor(channelName).forEach((l) => l({ bid }));
        },
      )
      .subscribe();
    channels.set(channelName, channel);
  }

  const listeners = listenersFor(channelName);
  listeners.add(onBid);
  refCounts.set(channelName, (refCounts.get(channelName) ?? 0) + 1);

  return () => {
    const set = listenersFor(channelName);
    set.delete(onBid);
    const next = (refCounts.get(channelName) ?? 1) - 1;
    refCounts.set(channelName, next);
    if (next <= 0) {
      const ch = channels.get(channelName);
      if (ch) supabase.removeChannel(ch);
      channels.delete(channelName);
      perChannelListeners.delete(channelName);
      refCounts.delete(channelName);
    }
  };
}
