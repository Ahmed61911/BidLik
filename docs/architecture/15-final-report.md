# 15 — Finish-in-Place Roadmap

The project keeps its current stack. This document replaces the previous
.NET migration report and describes what is left to ship a production-ready
v1 on React 19 + TanStack Start + self-hosted Supabase.

## 1. Current architecture (unchanged, target state)

```
                Browser (React 19 + TanStack Router/Query)
                       │            │
              supabase-js         WebSocket
                       │            │
                       ▼            ▼
                  Kong :8000  ─►  Realtime :4000
                   │  │  │
     ┌─────────────┘  │  └────────────┐
     ▼                ▼               ▼
  Auth :9999   PostgREST :3000   Storage :5000
     │                │               │
     └────────┬───────┴───────┬───────┘
              ▼               ▼
                Postgres 15 (RLS + RPCs + pg_cron)
                ▲
                │
  ┌─────────────┴─────────────┐
  │ App container (Bun/Vite)   │
  │  SSR + /api/public/*       │
  │  service-role for CMI +    │
  │  admin user create/delete  │
  └────────────────────────────┘
```

Nothing above changes. All remaining work is feature completion, hardening,
and deployment on this exact topology.

## 2. What's already done

- Database: 10 tables, enums, RLS, GRANTs, 20+ RPCs (`place_bid`,
  `submit_offer`, `tick_auctions`, `buyer_submit_payment`…), pg_cron.
- Auth: GoTrue + `has_role` + `_authenticated` gate + demo seeder.
- Frontend shell: routing, Home V3, brand fonts (Parkson / Yalta Sans),
  theme, all shadcn primitives, partial role dashboards.
- Docker offline stack: db, auth, rest, realtime, storage, kong, migrate.
- Security hardening pass already applied (anon revoke, restrictive INSERT
  policies on `bids` / `offers`, `EXECUTE` grants tightened).

## 3. Remaining work

| Area | Task | Effort (solo full-time) |
|------|------|-------------------------|
| CMI payment gateway | Real HMAC signature, sandbox integration, callback verification, error/retry UI | 1–2 weeks |
| Kill mock code | Delete `src/lib/mockApi.ts`, `mockAdmin.ts`, `mockAcheteur.ts`; route all callers to `supabase*Api.ts` | 3–5 days |
| Realtime polish | Wire `src/lib/realtime.ts` broadcast into bid list, countdown, notifications; reconnect handling | 4–6 days |
| Expert workflow end-to-end | Assignment → report form → photo upload → publish → notify vendeur/admin | 1–2 weeks |
| Admin console gaps | Payment validation queue, refunds, user activation, audit view | 1–2 weeks |
| File uploads | Signed URLs for car photos + payment proofs, MIME/size guards, image compression | 4–6 days |
| Notifications | Email (Inbucket → real SMTP in prod) + in-app bell dropdown wired to `notifications` table | 3–5 days |
| Email templates | Register / reset / auction won / payment received (French copy) | 2–3 days |
| Legal + static pages | CGU, Charte Vendeurs, mentions légales, RGPD | 2–3 days |
| SEO + metadata | Per-route `head()`, OG images, sitemap, robots.txt | 2 days |
| Testing | Playwright happy paths (register → bid → win → pay), Vitest for RPCs | 1 week |
| Production deploy | Real SMTP, Postgres backups, HTTPS/domain, secrets rotation, CDN for images | 3–5 days |
| Bugfix + polish buffer | ~20% of the above | 1–2 weeks |

## 4. Effort totals

| Pace | Solo, no AI | Solo + AI assistance |
|------|-------------|----------------------|
| Full-time senior (40h/wk) | 8–10 weeks (~2–2.5 months) | **5–6 weeks** |
| Full-time mid-level | 12–16 weeks (~3–4 months) | **7–9 weeks** |
| Part-time (~15h/wk) | 20–28 weeks (~5–7 months) | **12–16 weeks** |

AI speedup by task type: 3–5× on CRUD/screens/refactor/tests, 1–1.3× on
CMI signature and RLS work (needs human review), 1× on deploy/infra.

## 5. Suggested build order

1. CMI real integration — blocks revenue.
2. Delete mock code + wire real APIs everywhere.
3. Realtime + notifications (perceived quality).
4. Expert + admin flows.
5. Uploads, emails, legal pages.
6. Tests + deploy.

## 6. Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CMI signature bug | Medium | Severe (money) | Port `computeCmiHash` against CMI test vectors; unit-test with fixed inputs; sandbox before prod. |
| Bid race conditions under load | Low | Severe | RPC `place_bid` already runs `FOR UPDATE`; add k6 load test before launch. |
| RLS policy regression | Medium | Severe (PII) | Integration test per policy; run `supabase--linter` after every migration. |
| Realtime reconnect gaps | Medium | Medium | Implement exponential backoff + re-fetch on `SUBSCRIBED` event. |
| pg_cron drift on `tick_auctions` | Low | High | Monitor `auction_events` for missed transitions; alarm if lag > 60s. |
| SMTP deliverability in prod | Medium | Medium | Warm domain via Postmark/Resend; SPF/DKIM/DMARC before launch. |
| Storage cost blowout | Low | Medium | Compress car photos ≤400 KB; cap payment proof at 5 MB. |
| Timezone bugs in countdown | Low | Medium | Store `timestamptz` UTC; render with `Intl.DateTimeFormat("fr-MA")`. |

## 7. Difficulty per remaining module

| Module | Difficulty | Notes |
|--------|-----------|-------|
| CMI integration | 4 / 5 | Signature parity + sandbox loop. |
| Realtime bid updates | 3 / 5 | Existing infra, needs UI wiring + reconnect. |
| Expert workflow | 3 / 5 | Schema done, UI + upload glue. |
| Admin payment console | 3 / 5 | CRUD + validation queue. |
| Notifications (email + bell) | 3 / 5 | SMTP config + UI. |
| Uploads (photos + proofs) | 2 / 5 | Storage bucket + signed URLs. |
| Legal + SEO pages | 1 / 5 | Copy + metadata. |
| Mock code removal | 1 / 5 | Mechanical refactor. |
| Playwright test suite | 3 / 5 | Flake management. |
| Production deploy | 3 / 5 | DNS, TLS, backups, secrets. |

## 8. Do NOT touch

- Auto-generated: `src/integrations/supabase/{client.ts, client.server.ts,
  auth-middleware.ts, auth-attacher.ts, types.ts}`, `src/routeTree.gen.ts`,
  `supabase/config.toml`, `.env` Supabase variables.
- Schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Working RPCs: don't rewrite `place_bid`, `submit_offer`, `tick_auctions`
  without a strong reason — they're the money loop.

## 9. Launch checklist

- [ ] CMI sandbox → production credentials + callback tested.
- [ ] All `mock*.ts` deleted; grep confirms zero imports.
- [ ] Playwright suite green in CI on every PR.
- [ ] `supabase--linter` clean.
- [ ] Real SMTP configured; test email to Gmail/Outlook/ProtonMail.
- [ ] Postgres backup schedule (daily + WAL) verified restorable.
- [ ] HTTPS + domain live; HSTS + security headers set.
- [ ] Secrets rotated; `.env.docker` not in git.
- [ ] Load test: 100 concurrent bidders on a single auction, zero lost bids.
- [ ] Legal pages published; footer links working.
- [ ] `og:image` per route; social share preview validated.
- [ ] Admin runbook written (validate payment, activate user, resolve dispute).

## 10. Overall strategy

1. **Vertical slices, not layers.** For each remaining feature, ship
   schema → RPC → API → UI → realtime → test in one go. Avoids
   half-finished features rotting.
2. **Test the money loop first.** Playwright: register → bid → win →
   pay → admin validate. Once green, freeze the RPCs.
3. **Prod-parity dev.** Keep using the Docker stack for local dev; the
   only prod difference should be domain + SMTP + backups.
4. **Delete aggressively.** Mock code, dead demo pages, and any
   `home-old`-style leftovers should go before launch — they confuse
   future contributors.
5. **Launch small.** Soft-launch to a handful of vendeurs; monitor
   `auction_events` and `payments` daily for the first 30 days; iterate.

## Closing table — component status

| Component | Status |
|-----------|--------|
| React app / TanStack Router/Query | Kept, ~80% done |
| Tailwind + shadcn/ui + brand fonts | Done |
| Supabase GoTrue auth | Done |
| PostgREST + RPCs | Done |
| Supabase Realtime | Infra done, UI wiring pending |
| Supabase Storage | Bucket ready, upload UI pending |
| Kong gateway | Done |
| pg_cron `tick_auctions` | Done |
| Postgres 15 schema + RLS | Done + hardened |
| `/api/public/*` server routes | Seed done; CMI callback pending |
| Docker offline stack | Done |
| CMI payment integration | **Pending — highest priority** |
| Email (SMTP + templates) | Pending |
| Playwright + Vitest tests | Pending |
| Production deployment | Pending |
