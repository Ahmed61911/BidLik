import { useQuery } from "@tanstack/react-query";
import { listMyPendingPaymentAuctions } from "@/services/supabase/paymentsApi";

export function usePendingPayments() {
  return useQuery({
    queryKey: ["pending-payments"],
    queryFn: listMyPendingPaymentAuctions,
    staleTime: 15_000,
  });
}
