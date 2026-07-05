# 03 — Frontend

## Stack

| Piece | Version | Role |
|-------|---------|------|
| React | 19.2 | View layer |
| TanStack Start | 1.167 | Full-stack framework (SSR + server fns + file routing) |
| TanStack Router | 1.168 | Type-safe file-based routing |
| TanStack Query | 5.83 | Async cache — used both from loaders and from components |
| Vite | 8.0 | Bundler / dev server |
| Tailwind CSS | 4.2 | Utility-first CSS, native `@theme` + `@import` |
| shadcn/ui + Radix | latest | Design-system primitives |
| Lucide React | 0.575 | Icons |
| Sonner | 2.0 | Toasts |
| Zod | 3.24 | Runtime validation (forms + server routes) |
| React Hook Form + @hookform/resolvers | 7 + 5 | Forms |
| date-fns | 4.1 | Dates |
| Recharts | 2.15 | Admin analytics charts |
| Embla Carousel | 8.6 | Car gallery |
| Vaul | 1.1 | Mobile drawer used by shadcn |
| CMDK | 1.1 | Command palette (unused in routes but wired via ui/) |

## Boot sequence

```
Browser hits /some-url
   │
   ▼
Nitro/Worker fetch handler (dev = Vite, prod = Cloudflare)
   │
   ▼
src/server.ts  →  @tanstack/react-start/server-entry
   │
   ▼
getRouter() (src/router.tsx)  — new QueryClient per request
   │
   ▼
routeTree.gen.ts   ── matches URL ──►  concrete route file(s)
   │
   ▼
__root.tsx  → RootShell (html/head/body)
             → RootComponent → SiteHeader / <Outlet/> / SiteFooter / Toaster
```

## `__root.tsx`

- `createRootRouteWithContext<{ queryClient: QueryClient }>()`.
- `head()` sets French SEO metadata (title, description, og:*, twitter:card,
  `theme-color: #1F2D4D`).
- `links: [{ rel:"stylesheet", href: appCss }, manifest, icon]` — `appCss`
  is imported as `import appCss from "../styles.css?url"`.
- `RootShell` returns `<html lang="fr">` and inlines `THEME_BOOT_SCRIPT`
  (from `lib/theme.ts`) to set `data-theme` before hydration → no
  light-mode flash.
- `RootComponent` mounts `QueryClientProvider`, then `SiteHeader`,
  `<Outlet />`, `SiteFooter`, and `<Toaster position="top-center" richColors closeButton>`.
- `errorComponent` reports the error via `reportLovableError` and shows
  `<ErrorState>`.

## Styling & theme

- `src/styles.css`
  - `@import "tailwindcss";` (Tailwind v4 native import).
  - `@font-face` declarations for **Parkson** (`woff2` + `woff`) and
    **Yalta Sans** — both point at `/src/assets/fonts/*`.
  - `@theme` block: hex color tokens (`--color-*`), radii, spacing tokens,
    and `--font-parkson`, `--font-yalta`.
  - `html { font-size: 17px }` — global +6% type scale.
  - Custom typography: `h1..h4` → `font-family: var(--font-parkson)`;
    body/UI → `var(--font-yalta)`. H3=`2rem`/`600`, H4=`1.75rem`/`600`.
  - Dark mode: `[data-theme="dark"]` overrides. Boot script in
    `lib/theme.ts` sets the attribute pre-hydration from `localStorage`.
- `src/lib/utils.ts` exports `cn()` = `twMerge(clsx(...))`, used by every
  component to compose class strings.

## Design system

All UI primitives live under `src/components/ui/` and wrap Radix
(unstyled a11y primitives) with variants via CVA
(`class-variance-authority`) reading tokens from `styles.css`. No component
hard-codes colors — everything goes through semantic tokens
(`bg-background`, `text-foreground`, `text-primary`, `border`, `ring`, etc.),
so light/dark and future re-brands only touch `styles.css`.

## Data-fetching pattern

Two shapes coexist:

1. **Loader + Suspense (public pages).** Route `loader` calls
   `context.queryClient.ensureQueryData({ queryKey, queryFn })`, component
   reads with `useSuspenseQuery`. Preloading is off
   (`defaultPreloadStaleTime: 0`) so navigation between filters always
   revalidates.
2. **Ad-hoc `useQuery` / `useMutation` (protected areas).** Because
   `/acheteur`, `/vendeur`, `/expert`, `/admin` are role-gated and cannot be
   safely prerendered, their data is fetched in-component so the loader
   doesn't 401 during SSR.

## State management

- **Server state** — TanStack Query.
- **Auth state** — custom `useSyncExternalStore` store in `src/lib/auth.ts`
  (see 06-authentication). Chosen over React Context so non-React code
  (server fns, route guards) can call `authStore.getState()`.
- **UI state** — component-local `useState`. No Redux / Zustand / Context
  in the codebase.
- **Theme** — persisted in `localStorage`, mirrored to `data-theme` on
  `<html>`.

## Real-time UI

`src/lib/realtime.ts` exposes `subscribeToAuction(auctionId, cb)` which:

```ts
supabase
  .channel(`auction:${auctionId}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${auctionId}` }, cb)
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auctionId}` }, cb)
  .subscribe();
```

The auction detail pages (`auctions.$auctionId.tsx`,
`acheteur.encherir.$auctionId.tsx`) call this in a `useEffect` and
`queryClient.invalidateQueries` on every event → live prices/bid counts
without polling.

## Page lifecycle (example: `/auctions/:auctionId`)

```
User navigates
   │
   ▼
Router matches route → runs loader:
    context.queryClient.ensureQueryData({
      queryKey: ["auction", id],
      queryFn: () => api.getAuction(id),
    })
   │  api → supabaseApi.getAuction → supabase.from("auctions").select(...)
   │  → Kong /rest/v1/auctions?id=eq...
   │
   ▼
Component mounts:
    const { data } = useSuspenseQuery({ queryKey:["auction",id], queryFn:... })
    useEffect: subscribeToAuction(id, () => queryClient.invalidateQueries(...))
   │
   ▼
Renders <CarGallery/>, <Countdown/>, bid list (useQuery on list_auction_bids RPC)
```

## Forms

React Hook Form + Zod resolver. Example: `login.tsx` defines a Zod schema,
`useForm({ resolver: zodResolver(schema) })`, uses shadcn `<Form/>` +
`<FormField/>`. Server-side validation is duplicated inside each RPC and
each `/api/public/*` route via `z.object(...)`.

## SEO

- Every top-level route defines its own `head()` with unique
  `title`/`description`/`og:*`.
- `og:image` is set only at leaf routes when a meaningful image exists.
- `sitemap`/`robots` — not present in the repo (would be added as static
  files under `public/`).
