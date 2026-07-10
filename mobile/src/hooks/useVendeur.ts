import { useQuery } from "@tanstack/react-query";
import { listSellerCars, getSellerStats, listSellerPayouts, getSellerCar } from "@/services/supabase/vendeurApi";

export function useSellerCars() {
  return useQuery({ queryKey: ["seller-cars"], queryFn: listSellerCars, staleTime: 15_000 });
}

export function useSellerStats() {
  return useQuery({ queryKey: ["seller-stats"], queryFn: getSellerStats, staleTime: 15_000 });
}

export function useSellerPayouts() {
  return useQuery({ queryKey: ["seller-payouts"], queryFn: listSellerPayouts, staleTime: 15_000 });
}

export function useSellerCar(carId: string) {
  return useQuery({ queryKey: ["seller-car", carId], queryFn: () => getSellerCar(carId) });
}
