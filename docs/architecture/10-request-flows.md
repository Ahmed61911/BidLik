# 10 — Request Flows

Each flow lists every file touched, in execution order.

## 1. Register

```
login.tsx (register tab, RHF + Zod)
  → authStore.register  (src/lib/auth.ts)
    → supabase.auth.signUp({ email, password, options: { data: { nom, telephone, role, actif: true } } })
      → Kong /auth/v1/signup → GoTrue :9999
        → INSERT INTO auth.users
          → trigger handle_new_user()  (supabase/migrations/…)
            → INSERT INTO public.profiles
            → INSERT INTO public.user_roles
      → returns session (MAILER_AUTOCONFIRM=true) or requires signInWithPassword
    → loadProfileAndRoles(uid)
      → rpc get_my_profile  → PostgREST /rest/v1/rpc/get_my_profile
      → select user_roles   → PostgREST /rest/v1/user_roles
    → setState({ status:"authenticated", session })
  → onAuthStateChange('SIGNED_IN')  (dedup filter in auth.ts)
  → navigate(ROLE_HOME[role])
```

Files: `login.tsx`, `src/lib/auth.ts`, `src/integrations/supabase/client.ts`,
`supabase/migrations/*` (`handle_new_user`).

## 2. Login

```
login.tsx (submit)
  → authStore.login({email,password})   (src/lib/auth.ts)
    → supabase.auth.signInWithPassword(...)
      → Kong /auth/v1/token?grant_type=password → GoTrue
    if error and email ∈ DEMO_ACCOUNTS:
      → fetch POST /api/public/seed-demo
        → src/routes/api/public/seed-demo.ts  → supabaseAdmin.auth.admin.createUser/updateUserById
      → signInWithPassword retry
    → loadProfileAndRoles(uid)
    → setState authenticated
    → navigate(ROLE_HOME[user.role])
```

Files: `login.tsx`, `src/lib/auth.ts`, `src/routes/api/public/seed-demo.ts`,
`src/integrations/supabase/client.server.ts`.

## 3. Place bid (open auction)

```
acheteur.encherir.$auctionId.tsx  (submit)
  → useMutation({ mutationFn: () => api.placeBid({ auctionId, amount }) })
    → src/lib/api.ts (re-exports supabaseApi)
    → src/lib/supabaseApi.ts::placeBid
      → supabase.rpc("place_bid", { p_auction_id, p_amount })
        → Kong /rest/v1/rpc/place_bid → PostgREST → Postgres
          → place_bid() SECURITY DEFINER:
              SELECT ... FROM auctions FOR UPDATE
              validate status/type/amount
              INSERT INTO bids
                → trigger notify_on_bid → INSERT INTO notifications (prior leader)
              UPDATE auctions SET current_price, bid_count, top_bidder_id,
                     ends_at = (< 2 min → now()+2min else unchanged)
              RETURN bids row
  ← mutation onSuccess
    → queryClient.invalidateQueries(["auction", id]) + ["bids", id]
    → sonner toast "Enchère placée"
  ↕ Realtime channel emits UPDATE on auctions & INSERT on bids
    → subscribeToAuction  (src/lib/realtime.ts)  → invalidateQueries → all watchers refresh
```

Files: route + `src/lib/api.ts` + `src/lib/supabaseApi.ts` + RPC + triggers.

## 4. Submit sealed offer

```
auctions.$auctionId.tsx renders <SealedBidPanel/> when auction_type='fermee'
  → SealedBidPanel.tsx submit
    → api.submitOffer({ auctionId, amount })
      → supabaseApi.submitOffer → supabase.rpc("submit_offer",{...})
        → submit_offer() SECURITY DEFINER:
            SELECT ... FROM auctions FOR UPDATE
            require amount > minimum_accepted_price (or starting_price)
            INSERT INTO offers ON CONFLICT(auction_id,user_id) DO UPDATE
            UPDATE auctions.bid_count = COUNT(offers)
```

Files: `auctions.$auctionId.tsx`, `SealedBidPanel.tsx`, `supabaseApi.ts`,
`submit_offer` RPC.

## 5. Upload payment proof (winner)

```
acheteur.paiements.tsx
  → uploads proof file: supabase.storage.from("payment-proofs").upload(path, file)
    → Kong /storage/v1/object/payment-proofs/<path>
  → then rpc("buyer_submit_payment", { p_auction_id, p_amount, p_reference, p_proof_url, p_proof_name, p_notes, p_payment_method, p_bank, p_due_date })
    → buyer_submit_payment() SECURITY DEFINER:
        require auction.status='validated' AND top_bidder_id=auth.uid()
        require now() < payment_deadline
        INSERT/UPDATE payments (own row, type='achat', status='en_attente')
        loop through admin user_ids → INSERT notifications
```

Files: `acheteur.paiements.tsx`, `supabaseAcheteurStore.ts`,
`buyer_submit_payment` RPC.

## 6. Admin validates auction

```
admin.validations.tsx
  → rpc("validate_auction",{ p_auction_id, p_decision: "validee"|"annulee" })
    → validate_auction():
        require has_role(auth.uid(),'admin')
        require status='closed'
        if validee: status='validated', validated_at, payment_deadline=now()+48h;
                    car.status='vendu_validee'; notify winner "Paiement requis sous 48h"
        else:      status='cancelled'; car.status='vendu_annulee'
```

Files: `admin.validations.tsx`, `supabaseAdminApi.ts`, `validate_auction`.

## 7. Expert submits report

```
expert.inspections.$inspectionId.tsx
  → rpc("submit_expert_report",{ p_car_id, p_note })
    → submit_expert_report():
        require has_role(auth.uid(),'expert' OR 'admin')
        note ∈ [0,10]
        UPDATE expert_assignments SET status='rapport_recu', note_finale
        UPDATE cars SET note_expert
```

Files: expert route, `supabaseExpertApi.ts`, `submit_expert_report`.

## 8. CMI deposit (caution)

```
acheteur.caution.tsx (button "Payer par carte")
  → fetch POST /api/public/cmi-init  { type:"caution", amount }
    → src/routes/api/public/cmi-init.ts
      → verifies Bearer via supabaseAdmin.auth.getUser
      → INSERT INTO payments (status='en_attente', reference=oid)
      → computes hash (src/lib/cmi.ts)
      → returns { action, fields }
  → client builds a hidden <form action=action method=POST> with fields, submits
      → CMI hosted 3D-Secure page → user completes payment
  → CMI POSTs form-urlencoded → /api/public/cmi-callback
    → src/routes/api/public/cmi-callback.ts
      → verifyCmiCallback(body, storeKey)
      → UPDATE payments.status='paye' | 'annule'
      → if type='caution' AND success → UPDATE profiles.caution_validee=true
      → return "APPROVED"|"FAILURE"
```

Files: `acheteur.caution.tsx`, `src/routes/api/public/cmi-init.ts`,
`src/routes/api/public/cmi-callback.ts`, `src/lib/cmi.ts`.

## 9. Auction state advancement (cron)

```
pg_cron every 30 s → SELECT public.tick_auctions();
  tick_auctions():
    UPDATE auctions SET status='live'   WHERE status='scheduled' AND starts_at<=now()
    UPDATE auctions SET status='closed' WHERE status='live'      AND ends_at<=now()
    UPDATE auction_events likewise
    FOR each closed auction past admin_validation_deadline:
       status='cancelled'; car.status='vendu_annulee'; notify winner
    FOR each validated auction past payment_deadline without a 'paye' payment:
       status='cancelled'; car.status='vendu_annulee'; notify winner
```

Realtime pushes `UPDATE` events on `auctions` → connected clients refresh
without polling.

## 10. Sign out

```
SiteHeader "Déconnexion"
  → authStore.logout()
    → setState({ status:"anonymous", session:null })  // optimistic
    → supabase.auth.signOut()   // fire-and-forget
      → clears localStorage
  → onAuthStateChange('SIGNED_OUT') → already anonymous, no-op
```
