# 05 — Database

Postgres 15.6 with `pg_cron`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`,
`pgaudit`. Everything lives in the `public` schema unless noted.

## Enums

| Type | Values |
|------|--------|
| `app_role` | `acheteur`, `vendeur`, `expert`, `admin` |
| `auction_status_t` | `scheduled`, `live`, `closed`, `validated`, `cancelled` |
| `auction_type_t` | `ouverte`, `fermee` |
| `auction_visibility_t` | `ouvert`, `ferme` |
| `car_status` | `open`, `en_cours`, `en_attente_validation`, `vendu_validee`, `vendu_annulee`, `expertise` |
| `car_type_t` | `loueur`, `entreprise`, `particulier` |
| `carburant_t` | `essence`, `diesel`, `hybride`, `electrique`, `essence_hybride`, `diesel_hybride` |
| `delivery_status_t` | `non_livre`, `livre` |
| `expert_assignment_status_t` | `non_assigne`, `en_inspection`, `rapport_recu` |
| `notif_type_t` | `outbid`, `won`, `lost`, `ending_soon`, `caution`, `system` |
| `offer_status_t` | `active`, `winning`, `rejected` |
| `payment_status_t` | `non_paye`, `paye` |
| `procuration_t` | `procuration`, `carton_ouvert`, `carton_ferme` |
| `transmission_t` | `manuelle`, `automatique` |

## Tables

### `profiles`
Mirror of `auth.users` with app-level fields.

| Column | Type | Notes |
|--------|------|-------|
| `id` uuid PK | `gen_random_uuid()` | |
| `user_id` uuid UNIQUE | FK → `auth.users(id) ON DELETE CASCADE` | |
| `nom` text NOT NULL | | |
| `email` text NOT NULL | | |
| `telephone` text | | Column GRANT restricts cross-user reads |
| `ville` text | | |
| `avatar_url` text | | |
| `caution_validee` bool DEFAULT false | Set by CMI callback |
| `caution_montant` int | |
| `actif` bool DEFAULT false | Whether admin has activated the account |
| `created_at`, `updated_at` timestamptz DEFAULT now() | |

**RLS**
- `profiles_select_own_or_admin` — `user_id = auth.uid() OR has_role(uid,'admin')`.
- `profiles_insert_own` (public) — `WITH CHECK (auth.uid() = user_id)`.
- `profiles_update_own` (public) — `USING (auth.uid() = user_id)`.

Own `email`/`telephone` are read via `public.get_my_profile()` since
column GRANTs block direct cross-user reads.

### `user_roles`
Separate table to prevent privilege escalation.

| Column | |
|--------|--|
| `id` uuid PK, `user_id` uuid FK → `auth.users`, `role` `app_role`, `created_at` |
| UNIQUE `(user_id, role)` |

**RLS**
- `user_roles_select_own_or_admin`.
- `user_roles_admin_all` — full CRUD for admins.
- `user_roles_block_non_admin_writes` — restrictive `USING/CHECK (has_role(uid,'admin'))` on `anon`+`authenticated`.

### `cars`
Master vehicle record.

Domain columns:
`vendeur_id` uuid (FK → auth.users, nullable when admin creates), `vendeur_nom`,
`type` (car_type_t), `marque`, `modele`, `finition`, `transmission`,
`carburant`, `annee`, `kilometrage`, `couleur_exterieur`, `couleur_interieur`,
`note_expert` int, `nombre_cles` DEFAULT 2, `opposition` bool, `main_levee`
bool DEFAULT true, `puissance_fiscale` DEFAULT 8, `carte_grise_barree` bool,
`procuration` (procuration_t), `date_vente`, `status` (car_status),
`payment_status`, `delivery_status`, `prix_attendu`,
`minimum_accepted_price`, `images` jsonb DEFAULT `[]`, `body_type`,
`prix_plancher`, `prix_minimum`.

Index: `cars_pkey (id)`. Trigger: `ensure_expert_assignment` after insert.

**RLS**
- `cars_select_anon` (anon, `USING true`) — but sensitive columns
  (`vendeur_id`, `minimum_accepted_price`, `prix_plancher`, `prix_minimum`)
  are blocked by column-level `GRANT` filtering.
- `cars_select_authenticated`.
- `cars_insert_seller` — `WITH CHECK (auth.uid() = vendeur_id OR admin)`.
- `cars_update_owner_or_admin`.
- `cars_delete_admin`.

### `auctions`

`id` text PK, `car_id` text FK→cars, `event_id` text FK→auction_events,
`starts_at`, `ends_at`, `starting_price`, `current_price`, `bid_count` DEFAULT 0,
`status` (auction_status_t), `visibility`, `auction_type`, `top_bidder_id`
uuid, `closed_at`, `admin_validation_deadline`, `validated_at`,
`payment_deadline`, timestamps.

Indexes: `auctions_pkey`, `idx_auctions_status`, `idx_auctions_event`.

Trigger `stamp_auction_closure` BEFORE UPDATE: sets `closed_at` and
`admin_validation_deadline = now() + 24h` on `status → 'closed'`.
Trigger `notify_on_auction_status` AFTER UPDATE: emits `won`/`lost`
notifications.

**RLS**
- `auctions_select_anon`, `auctions_select_authenticated`.
- `auctions_admin_write` — admin `USING/CHECK`. Writes for buyers go via
  RPCs (`place_bid`, `submit_offer`) which are `SECURITY DEFINER`.

### `bids`

`id` uuid PK, `auction_id` text, `car_id` text, `bidder_id` uuid,
`bidder_name` text DEFAULT 'Anonyme', `amount` int, `is_auto` bool,
`created_at`.

Indexes: `bids_pkey`, `idx_bids_auction (auction_id, created_at DESC)`,
`idx_bids_bidder`.

Trigger `notify_on_bid` AFTER INSERT: notifies prior leader.

**RLS**
- `bids_select_own_or_admin`. Public bid history is read through
  `list_auction_bids(auction_id)` which redacts names.
- `bids_block_direct_writes` (restrictive) — inserts only via `place_bid`.

### `offers` (sealed-envelope)

`id` uuid PK, `auction_id`, `car_id`, `user_id` uuid, `user_name` text,
`amount`, `status` (offer_status_t) DEFAULT `active`, `created_at`,
`updated_at`.

UNIQUE `(auction_id, user_id)` → each user has exactly one offer per
sealed auction (UPSERT semantics).

**RLS**
- `offers_select_own_or_admin`.
- `offers_block_direct_writes` (restrictive) — writes only through
  `submit_offer`.

### `auction_events`

`id` text PK, `title`, `starts_at`, `ends_at`, `status` (auction_status_t)
DEFAULT scheduled, `visibility` DEFAULT ouvert.

**RLS**: `events_select_all` (public), `events_admin_write`.

### `payments`

`id` uuid PK, `user_id` uuid FK→auth.users, `type` text
(`caution|achat|remboursement`), `amount` int, `status` text
(`en_attente|paye|annule|rembourse`), `auction_id`, `car_id`,
`reference` text (also CMI oid), `proof_url`, `proof_name`, `notes`,
`paid_at`, `recorded_by`, `payment_method`, `bank`, `due_date`, timestamps.

Indexes: `payments_pkey`, `idx_payments_user`, `idx_payments_auction`.

**RLS**: `payments_select_own_or_admin`; `payments_admin_write` — buyer
inserts/updates go through `buyer_submit_payment`.

### `notifications`

`id` uuid PK, `user_id` uuid, `type` (notif_type_t), `titre`, `message`,
`auction_id` text, `lu` bool, `created_at`.

Indexes: `notifications_pkey`, `idx_notifications_user_created`.

**RLS**: `notifications_select_own`, `notifications_update_own` (mark read),
`notifications_delete_own`.

### `expert_assignments`

`id` uuid PK, `car_id` text UNIQUE, `expert_id` uuid, `status`
(expert_assignment_status_t), `assigne_le`, `rapport_recu_le`,
`note_finale` int, timestamps.

**RLS**: `ea_select_admin_or_assignee`, `ea_admin_write`.

### `_app_migrations`
Bookkeeping for the migrator (`filename PK, applied_at`).

## RPC catalogue

All are `SECURITY DEFINER, SET search_path=public` unless noted.

| Function | Signature | Callers | Notes |
|----------|-----------|---------|-------|
| `has_role(uuid, app_role) → bool` | STABLE | Every RLS policy + `/api/public/admin-*` | Central role check. |
| `handle_new_user()` | Trigger on `auth.users AFTER INSERT` | GoTrue | Populates `profiles` + `user_roles`. |
| `place_bid(text, int, bool DEFAULT false) → bids` | Web (buyer) | Locks auction, validates, inserts bid, extends `ends_at` by 2 min if <2 min remaining. |
| `submit_offer(text, int) → offers` | Web (buyer) | Sealed auctions; UPSERTs per user. |
| `validate_auction(text, text) → auctions` | Admin | Sets status `validated` or `cancelled`, `payment_deadline = now()+48h` on validate. |
| `buyer_submit_payment(...)` | Winner | Attaches proof, notifies admins. |
| `admin_upsert_payment(...) / admin_set_payment_status / admin_delete_payment` | Admin | Payment CRUD + car `payment_status` sync + notifications. |
| `admin_list_payments()` | Admin | Joins profiles + cars. |
| `admin_list_profiles / admin_get_profile / admin_list_pending_users / admin_set_user_active` | Admin | User management. |
| `assign_expert(car, expert) / submit_expert_report(car, note)` | Admin / Expert | Feeds `cars.note_expert`. |
| `list_auction_bids(text)` | Public | Redacts bidder names except own/admin. |
| `get_my_profile()` | Any signed-in user | Only way to read own `email`/`telephone` due to column GRANTs. |
| `is_my_account_active() → bool` | Kept but unused | Login used to gate on this. |
| `tick_auctions()` | pg_cron every 30 s | State-machine advancement + deadline cancellations. |
| `set_updated_at()` | Trigger util | Timestamp maintenance. |
| `ensure_expert_assignment()` | Trigger on `cars` | Creates empty assignment row. |
| `stamp_auction_closure()` | Trigger on `auctions` | Sets `closed_at`/`admin_validation_deadline`. |
| `notify_on_bid / notify_on_auction_status` | Triggers | Push rows into `notifications`. |

## Cron

Scheduled in the migration:

```sql
select cron.schedule('bidlik-tick', '30 seconds', $$SELECT public.tick_auctions();$$);
```

## Migrations

- `20260625154519_*.sql` — initial 1 970-line dump (enums, tables, RLS,
  RPCs, triggers, cron schedule, `handle_new_user` on `auth.users`).
- `20260629090302_*.sql` — security hardening (see 06).

Applied by `docker/migrate/run.sh` inside a transaction per file, recorded
in `public._app_migrations`.
