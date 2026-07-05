# 11 — Dependencies

## Runtime — npm

### Core framework
| Package | Purpose | Replaceable? | Alternative |
|---------|---------|--------------|-------------|
| `react`, `react-dom` 19 | View layer | No | – |
| `@tanstack/react-start` | Full-stack framework, SSR, server fns | Rewrite | Next.js, Remix |
| `@tanstack/react-router` | File-based routing | Rewrite | React Router 6 |
| `@tanstack/router-plugin` | Vite integration for route tree | Coupled to react-router | – |
| `@tanstack/react-query` | Async cache | Yes | SWR, RTK Query |

### Backend / Data
| `@supabase/supabase-js` | Auth + REST + Realtime + Storage client | Yes when replacing backend | Custom `fetch` layer |
| `zod` | Runtime validation | Yes | yup, valibot, ArkType |

### Styling & UI
| `tailwindcss`, `@tailwindcss/vite` v4 | Utility CSS + native `@theme` | Yes | UnoCSS, plain CSS modules |
| `tw-animate-css` | Extra animation utilities | Yes | Framer Motion |
| `class-variance-authority` | Variant compositor for shadcn | Yes | Custom |
| `clsx`, `tailwind-merge` | `cn()` helper | Yes | Trivial |
| `lucide-react` | Icons | Yes | Heroicons, Phosphor |
| `sonner` | Toasts | Yes | react-hot-toast |
| `cmdk` | Command palette | Yes | – |

### Radix primitives (all `@radix-ui/react-*`)
`accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible,
context-menu, dialog, dropdown-menu, hover-card, label, menubar,
navigation-menu, popover, progress, radio-group, scroll-area, select,
separator, slider, slot, switch, tabs, toggle, toggle-group, tooltip`.
Underpin shadcn/ui — headless a11y primitives. Replaceable by Ark UI or
custom builds if you want to drop Radix.

### Forms
| `react-hook-form` | Form state | Yes | Formik, TanStack Form |
| `@hookform/resolvers` | Zod bridge | Yes | – |
| `input-otp` | OTP input | Yes | – |
| `react-day-picker` | Calendar (used by shadcn `calendar`) | Yes | – |

### Charts & misc UI
| `recharts` | Admin analytics | Yes | Chart.js, Nivo |
| `embla-carousel-react` | Car gallery | Yes | Swiper |
| `react-resizable-panels` | Splitters (shadcn `resizable`) | Yes | – |
| `vaul` | Mobile drawer for shadcn | Yes | – |

### Dates
| `date-fns` 4 | Date formatting | Yes | dayjs, luxon |

## Dev dependencies

| Package | Purpose |
|---------|---------|
| `vite` 8 + `@vitejs/plugin-react` | Bundler / HMR |
| `@lovable.dev/vite-tanstack-config` | Pre-wired Vite config (React + Tailwind v4 + TanStack Start + Nitro + Cloudflare target) |
| `vite-tsconfig-paths` | Resolves `@/*` aliases |
| `nitro` 3.0 beta | Cloudflare-compatible server bundler used by TanStack Start prod |
| `typescript` 5.8 | Type checking |
| `@types/*` | Node/React types |
| `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `eslint-plugin-prettier` | Linting stack |
| `prettier` 3.7 | Formatting |
| `globals` | ESLint globals list |

## Docker images

| Image | Version | Purpose | Alternative |
|-------|---------|---------|-------------|
| `supabase/postgres` | 15.6.1.139 | Postgres + Supabase extensions | vanilla `postgres:15` + manual role/schema setup |
| `postgres` | 15-alpine | Base for the `migrate` container | – |
| `supabase/gotrue` | v2.158.1 | Auth | keycloak, custom Identity |
| `postgrest/postgrest` | v12.2.3 | REST-over-Postgres | Hasura, custom API |
| `supabase/realtime` | v2.30.34 | WebSocket over WAL | SignalR, Ably, Pusher |
| `supabase/storage-api` | v1.11.13 | Object storage front-end | MinIO, Ceph, S3 |
| `supabase/postgres-meta` | v0.84.2 | Studio DB inspector | pgAdmin |
| `supabase/studio` | 20241014-c083b3b | Admin UI | pgAdmin, Retool |
| `kong` | 2.8.1 | API gateway | Traefik, Nginx, Envoy |
| `inbucket/inbucket` | 3.0.4 | Dev mail | MailHog, Mailpit |
| `oven/bun` | 1.3-alpine | App runtime | node:20-alpine |

## Removability quick reference

- **Cannot remove**: React, TanStack Start/Router, Supabase-js, Vite,
  Tailwind, Postgres, GoTrue, PostgREST, Kong (or a substitute reverse
  proxy).
- **Cheap swaps**: sonner ↔ react-hot-toast, date-fns ↔ dayjs,
  `zod` ↔ valibot, `lucide-react` ↔ any icon set.
- **Dead code**: `src/lib/mock*.ts` — legacy in-memory API kept only for
  reference.
