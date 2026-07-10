import { useQuery } from "@tanstack/react-query";
import { listMyWonAuctions } from "@/services/supabase/wonAuctionsApi";

export function useWonAuctions() {
  return useQuery({
    queryKey: ["won-auctions"],
    queryFn: listMyWonAuctions,
    staleTime: 15_000,
  });
}
