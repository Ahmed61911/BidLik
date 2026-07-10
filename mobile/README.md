# Bidlik Mobile

Native mobile app (React Native + Expo + TypeScript) for the two customer-facing
Bidlik roles — **Acheteur** (buyer) and **Vendeur** (seller). It reuses the
existing Bidlik backend (self-hosted Supabase + the webapp's storage/payment
API) — there is **no separate backend**. Admin and Expert roles remain web-only.

## Architecture

This app lives alongside the webapp in the same repo (`../` from here) and shares
its backend — there is no separate project to look up elsewhere:

- **Backend**: the same self-hosted Supabase stack the webapp uses (Postgres,
  GoTrue auth, PostgREST, Realtime) plus the webapp server's custom
  `/api/storage/*` (file uploads) and `/api/public/cmi-*` (payments) routes.
- **Data**: TanStack Query for server state (with an AsyncStorage-persisted
  read-only offline cache); Zustand for app/client state (auth session mirror,
  active role, theme, biometric lock).
- **Realtime**: Supabase `postgres_changes` for live bids/auctions/notifications.
- **Auth**: `supabase.auth` with an encrypted `expo-secure-store` session
  adapter; accounts are admin-activated (same gate as the webapp).
- **Notifications**: in-app center backed by the `notifications` table + Expo
  push (registered against the `device_push_tokens` table added in the backend
  migrations under `../supabase/migrations/2026070912*`).

## Prerequisites

- Node 20+, the Bidlik backend running and reachable (see below).
- Android Studio (emulator) and/or Xcode (iOS simulator, macOS only).

## Environment

Copy `.env.example` to `.env` and fill in the deployed backend URLs:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-host
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-webapp-origin
```

**Emulator note:** an Android emulator cannot reach the host's `localhost`.
Use `http://10.0.2.2:<port>` to reach services running on your dev machine
(the `.env` in this repo is preset that way for local dev). A physical device
needs your machine's LAN IP and the same Wi-Fi network.

## Run (development)

Several native modules (secure-store, local-authentication, notifications,
webview) aren't fully supported in Expo Go, so use a **development build**:

```bash
npm install
npx expo run:android      # builds + installs a dev client on the emulator/device
# or, on macOS:
npx expo run:ios
```

After the first build, `npm start` + pressing `a`/`i` relaunches instantly.

Seed demo accounts from the webapp (`POST /api/public/seed-demo`) and log in
with e.g. `acheteur@bidlik.ma` / `Acheteur1234!` (already activated).

## Push notifications

Device push needs an EAS project id. Run `eas init` (fills
`app.json → extra.eas.projectId`) and upload your FCM key to the Expo project.
Until then, in-app notifications work and device push is skipped gracefully.

## Building (EAS)

Profiles are defined in `eas.json`:

```bash
eas build --profile development --platform android   # internal dev client
eas build --profile preview --platform android       # installable APK
eas build --profile production --platform all         # store builds
```

## Project layout

```
src/
  api/ services/   backend clients (supabase, storage, upload, push, cmi)
  store/           Zustand stores (auth, app, acheteur, notifications)
  hooks/           TanStack Query hooks
  navigation/      root + auth + acheteur/vendeur tab trees, deep-link config
  screens/         auth / acheteur / vendeur / shared
  components/      reusable UI (cards, bid panel, gallery, skeletons, ...)
  theme/ constants/ utils/ types/
```
