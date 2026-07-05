/**
 * API client — backed by the local self-hosted Supabase stack.
 * The interface is preserved 1:1 with the original mock so all routes
 * keep working without changes. See src/lib/supabaseApi.ts for the impl.
 */

import type { Auction, AuctionEvent, Bid, Offer } from "@/types/auction";
import { supabaseApi } from "./supabaseApi";

export interface PlaceBidInput {
  auctionId: string;
  amount: number;
  isAuto?: boolean;
}

export interface SubmitOfferInput {
  auctionId: string;
  amount: number;
}

export interface AutoBidState {
  enabled: boolean;
  maxAmount: number;
}

export interface ApiClient {
  listAuctions(filter: "live" | "closed" | "all"): Promise<Auction[]>;
  getAuction(id: string): Promise<Auction>;
  listBids(auctionId: string): Promise<Bid[]>;
  placeBid(input: PlaceBidInput): Promise<Bid>;
  /** maxAmount is required when enabling; ignored when disabling. Returns the resulting persisted state. */
  setAutoBid(auctionId: string, enabled: boolean, maxAmount?: number): Promise<AutoBidState>;
  /** The caller's own persisted auto-bid state for this auction, if any. */
  getAutoBid(auctionId: string): Promise<AutoBidState | null>;
  listEvents(filter: "live" | "closed" | "all"): Promise<AuctionEvent[]>;
  getEvent(id: string): Promise<{ event: AuctionEvent; lots: Auction[] }>;
  submitOffer(input: SubmitOfferInput): Promise<Offer>;
  listMyOffers(auctionId: string): Promise<Offer[]>;
  listAllOffersAdmin(auctionId: string): Promise<Offer[]>;
}

export const api: ApiClient = supabaseApi;
