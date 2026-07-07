-- expert_assignments.car_id and payments.car_id referenced cars.id in
-- practice but had no actual FOREIGN KEY constraint (unlike auctions.car_id
-- and storage_files.car_id, which both already cascade correctly) — found
-- via deleteCar() leaving a dangling expert_assignments row after deleting
-- a car, which then showed up as a phantom "à assigner" entry in
-- admin.experts.tsx. Paired with an application-level guard in
-- supabaseAdminApi.ts's deleteCar() that now refuses to delete a car once
-- an auction exists for it — this constraint only ever fires for the
-- pre-auction cars that guard still allows deleting, so CASCADE (clean up
-- the assignment/payment row along with the car) is correct here, unlike
-- auctions/bids which must never be silently destroyed.
ALTER TABLE public.expert_assignments
  ADD CONSTRAINT expert_assignments_car_id_fkey
  FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_car_id_fkey
  FOREIGN KEY (car_id) REFERENCES public.cars(id) ON DELETE CASCADE;
