import { useQuery } from "@tanstack/react-query";
import { listAuctions, type AuctionFilter } from "@/services/supabase/auctionsApi";

export function useAuctions(filter: AuctionFilter = "live") {
  return useQuery({
    queryKey: ["auctions", filter],
    queryFn: () => listAuctions(filter),
    staleTime: 15_000,
  });
}
