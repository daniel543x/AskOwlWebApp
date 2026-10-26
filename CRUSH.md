# AskOwl WebApp — Agent Guide

Vue 3 + TypeScript SPA: the frontend client for the **AskOwl API** — a
self-hosted, LLM-powered search engine ("private Perplexity": web search →
page fetch → hybrid ranking → cited answers, streamed over SSE).

**Current objective: a full, runnable prototype wired to the real backend.**
**Status: all phases complete and verified against the real backend** (see
PLAN.md). The phased task list lives in [PLAN.md](PLAN.md) — read it before
writing code and keep its checkboxes up to date.

## Reference material (read-only)

- `.reference/docs_api/` — backend documentation. Read the relevant page
  before working on an area:
  - `api/authentication.md` — JWT login, API keys, roles, per-route auth matrix
  - `api/users.md` — users, personas, API keys, conversation history schemas
  - `api/models.md` — model catalog, user preferences
  - `api/ask_search_sse.md` — search SSE protocol v2 (+ JSON mode)
  - `api/ask_research_sse.md` — research/agent SSE extensions
  - `api/errors.md` — HTTP status codes and SSE error events
- `.reference/AskOwlAPI.json` — OpenAPI schema (exact route/field names).
- `docs/design/DESIGN.md` — the UI style reference ("Gleap": warm
  cream-paper canvas, graphite-ink CTAs, pill controls, Inter). Read it
  before any styling work; the theme implementation in `src/shared/theme/`
  encodes it.

Never edit anything under `.reference/` and never import from it in app code —
re-declare the types you need in `src/entities/`. The remaining `docs/`
subfolders (`administration/`, `development/`, `using/`) are empty
placeholders; ignore them.

## Commands

```bash
bun run dev       # dev server with HMR (Vite)
bun run build     # vue-tsc -b && vite build — production build
bun run preview   # serve the production build
```

- Package manager is **Bun** (`bun add …`). Never use npm/yarn/pnpm.
- `bun run build` type-checks first and **fails on any type error**, including
  unused locals/parameters (`tsconfig.app.json` is strict). Keep the build
  green after every task.
- No tests and no linter are configured yet. Match the existing code style.

### Container image (lighttpd)

Production deploy serves the built SPA with lighttpd, which also reverse-proxies
same-origin `/api/*` to the backend (prefix stripped) — see `Containerfile`,
`container/lighttpd.conf`, `container/entrypoint.sh`:

```bash
podman build -t askowl-webapp .
# run on the same network as the API; the default PROXY_HOST is "api"
podman run -d --name AskOwl-Webapp -p 8090:80 --network askowlapi_AskOwl-Net askowl-webapp
# API elsewhere: -e PROXY_HOST=<host> -e PROXY_PORT=<port>
```

## LSP (Vue + TypeScript)

Two language servers are configured in the global `~/.config/crush/crushrc`
and start automatically for this project (root marker: `package.json`):

| Name | Server | Filetypes | What it gives |
|---|---|---|---|
| `vue` | `@vue/language-server` (Volar) | `.vue` | diagnostics, symbols in SFCs |
| `typescript` | `typescript-language-server` | `.ts`, `.tsx` | diagnostics, symbols, rename, references |

- **No Node.js on this machine** — the servers are launched as
  `bun <global-entrypoint> --stdio` (installed via `bun add -g
  @vue/language-server typescript typescript-language-server`; entrypoints
  live under `~/.bun/install/global/node_modules/`). Update them with the
  same `bun add -g` command.
- Prefer LSP tools (`lsp_diagnostics`, `lsp_symbols`, `lsp_definition`,
  `lsp_references`, `lsp_rename`, `lsp_call_hierarchy`) over grep/glob when
  navigating or refactoring code — they are language-aware. If a tool
  reports no client, the servers may still be warming up; retry or
  `lsp_restart`. Config changes require restarting Crush.
- LSP diagnostics catch type errors as you edit, but `bun run build` remains
  the source of truth — run it before finishing a task.

## Locked product decisions

Do not re-litigate these; they were agreed with the owner:

| Topic | Decision |
|---|---|
| Backend | Real AskOwl API only — **no mocks**. Reached through the Vite proxy (`/api`). |
| Chat modes | **search, research, agent** — all three, with optimistic role gating (see "Roles" below). |
| Prototype scope | Auth, chat (3 modes), history, user settings (model preferences, personas, API keys), and the admin panel for connections (providers), model entries, and global defaults under `/admin`. User/role administration stays out of scope. |
| Layout | Sidebar app shell: collapsible sidebar with conversation list; chat fills the rest. |
| Language | UI text in English. |
| Theme | Light + dark per the **Gleap** design system ([docs/design/DESIGN.md](docs/design/DESIGN.md)): warm linen canvas, white cards, graphite-ink primary CTAs; lime `#4cc02b` reserved for status dots/checkmarks. Follow system on first visit; toggle persisted in localStorage. |
| Auth in UI | JWT login only (API-key auth is for other clients, not this UI). |

## Stack rules

- Vue 3.5 Composition API, `<script setup lang="ts">` in every component.
- UI components: **PrimeVue 4 only** (installed) + `@heroicons/vue`
  (24/outline) for icons — owner decision, primeicons was removed. Icon
  sizing/composition goes through the global `.askowl-icon` utility and the
  PrimeVue `#icon` slots (Button, Message, Tag, ConfirmDialog). Do NOT add
  any other component library, CSS framework, or icon set.
- Approved dependencies beyond what's installed: `pinia` (state),
  `marked` (assistant-answer markdown), `@fontsource-variable/inter` (UI
  typeface, the DESIGN.md substitute for Switzer). Anything else must be
  justified in PLAN.md before adding.
- No i18n framework. No tests required for the prototype.
- Custom CSS is for layout/spacing polish only — colors come from theme
  tokens, components come from PrimeVue.

## Directory layout

```
src/
├── app/           # bootstrap only: main.ts, App.vue, router.ts
├── pages/         # route components per area: auth/, chat/, settings/
├── components/    # reusable components shared across pages
├── features/      # stateful feature modules (auth store, chat, …)
├── entities/      # API entity types mirroring backend schemas
├── shared/        # api client, SSE parser, theme module, small utils
└── assets/        # global styles (style.css), logo
```

Pages are thin; logic and state live in `features/` (pinia stores +
composables) and `shared/`.

## Theming — the Gleap paper/graphite system

Implemented in `src/shared/theme/` (`preset.ts` + `theme.ts`); every page
inherits it. Source of truth: [docs/design/DESIGN.md](docs/design/DESIGN.md)
(the "Gleap" style reference — read it before styling work).

- PrimeVue 4 styled mode with the custom **`AskOwlPreset`** (Aura base,
  `definePreset` in `src/shared/theme/preset.ts`), configured in `main.ts`
  with `darkModeSelector: '.app-dark'`.
- **Warm paper language**: light mode = linen canvas `#edede8`, white cards,
  graphite-ink primary (`#141414`) pill CTAs. Dark mode is the derived
  warm-dark inverse: canvas `#171716`, cards `#212120`, cream primary
  `#e8e7e1` with dark text. Both schemes live in the preset —
  toggling the `app-dark` class on `<html>` is all the theme module does
  (no `updatePrimaryPalette` calls anymore).
- **Card surfaces** use the custom `card.background` semantic token
  (`var(--p-card-background)`: white in light, `#212120` in dark), NOT
  `var(--p-surface-0)` — in dark mode the surface ramp's light end doubles
  as the ink color (`text.color` derives from it), so `surface.0` is cream
  and unreadable as a card fill.
- **Color rationing**: the status palettes (green/red/sky/… primitives) are
  aliased to warm-neutral ramps in the preset, so every success/warn/error
  surface (toasts, messages, tags, invalid inputs) is achromatic. The TWO
  chromatic exceptions are defined once in `style.css`: lime `#4cc02b`
  (`--askowl-lime`) for positive status dots/checkmarks (active API key,
  up-provider health light, completed research-plan steps — never a fill),
  and red `#dc2626` (`--askowl-red`) for destructive/danger indicators
  (user-menu logout, "down" provider health light).
- **Shapes**: buttons/inputs/selects/tabs are pills (radius 200px via
  `formField.borderRadius` + component overrides); cards, dialogs, messages,
  toasts = 12px; textareas = 12px. Tabs render as a segmented pill control
  (stone track, graphite active segment).
- **Type**: `@fontsource-variable/inter` ("Inter Variable") as the Switzer
  substitute; weight 400 for headings with `-0.01em` tracking, 500 for
  labels/emphasis. Never bold a headline above body weight.
- On boot: use `localStorage['askowl.theme']` if set, else follow
  `prefers-color-scheme`. The toggle (sun/moon Heroicon in the sidebar
  footer / auth layout) persists the explicit choice back to the same key.
  Apply the initial class before mounting the app to avoid a flash.
- Never hardcode hex colors in components (the single exception is the
  `--askowl-lime` token defined once in `style.css`). Use PrimeVue design
  tokens (`var(--p-primary-color)`, `var(--p-text-color)`,
  `var(--p-content-background)`, `var(--p-surface-0)` for cards, …) or
  scoped CSS built on them. Depth comes from surface tone, not shadows.

## API access

### Local backend stack (verified setup)

- The real AskOwl backend runs as a container stack (`podman-compose` in the
  sibling `AskOwlAPI` repo) with the API on **http://localhost:3000** — not
  8000. The webapp `.env` (gitignored) sets
  `VITE_API_PROXY_TARGET=http://localhost:3000`; `.env.example` keeps the
  generic default.
- Dev login used for verification: `admin@askowl.dev` (elevated). Registration
  via the UI assigns the plain `user` role.
- Upstream search engines are rate-limited/CAPTCHA-prone from this network:
  the backend `.env` needs `SEARXNG_ENGINES=bing,duckduckgo` (others return
  empty result sets or throttle after a few queries). Expect occasional
  `no_context` / 429 / 502 outcomes — the UI handles all terminal paths.
- Backend schema drift encountered and fixed ad hoc in the dev DB (flag for
  the backend PLAN §1 audit, do NOT fix opportunistically): the `user` table
  lacked the model's `is_active` column, and the personas / api-keys /
  history tables were never migrated — they were created via the backend's
  own `SQLModel.metadata.create_all`.

### HTTP

All requests go through the shared client `src/shared/api/http.ts`:

- Base path is same-origin **`/api`**; the Vite dev **and preview** servers
  proxy `/api` → `VITE_API_PROXY_TARGET` (default `http://localhost:8000`),
  stripping the prefix (configure in `vite.config.ts`, `.env.example`).
  This avoids CORS entirely. SSE streams pass through the proxy unchanged.
- The client attaches `Authorization: Bearer <token>` from the auth store,
  sends/receives JSON, handles 204, and maps non-2xx responses to a typed
  `ApiError` (status + message).
- **401 anywhere** → the client transparently refreshes once (single-flight
  `POST /auth/refresh`, then retry the original request) and only clears
  the session + routes to `/login` when the refresh itself 401s. Access
  tokens last ~6 h; the single-use refresh token rotates on every refresh
  (90-day sliding session window). Network/5xx failures during a refresh
  keep the session and surface the original error instead.
- Remember: **404 means "not found OR owned by someone else"** — surface it
  as a plain not-found message.

### SSE (important)

All three ask routes stream. **Never use `EventSource`:** `POST /ask/search`
cannot (EventSource is GET-only) and the GET routes need an `Authorization`
header EventSource cannot set. Instead, `src/shared/api/sse.ts` wraps
`fetch` + `response.body` and parses text/event-stream frames into
`{ event, id, data }` (data is parsed JSON). `done` and `error` are terminal
events; after either, close the stream.

Event overview (payload details in the reference docs):

| Event | Search | Research/agent | Notes |
|---|---|---|---|
| `conversation` | ✓ | | `{conversation_id, created}` — first frame |
| `status` | ✓ | ✓ | human-readable step text — show as progress |
| `query` | ✓ | | rewritten query |
| `plan` | | ✓ research | `{subquestions, tool_call}` |
| `sources` | ✓ | ✓ (+`subquery`) | ranked `{url, title, score}[]` — show as source chips |
| `context` | ✓ | ✓ (+`subquery`) | internal context; show chunk count only |
| `message` | ✓ | ✓ | answer/report deltas — concatenate and render as markdown |
| `grounding` | ✓ | | `{supported: 0..1}` — optional confidence badge |
| `done` | ✓ | ✓ | `completed` \| `no_context` \| `budget_exhausted` (+`reason`) |
| `error` | ✓ | ✓ | terminal failure — show as error message |

### Auth & roles

- `POST /auth/login` body `{ username_or_email, password }` →
  `{ access_token, token_type, refresh_token }`. Store BOTH tokens —
  `localStorage['askowl.token']` and `localStorage['askowl.refresh']`
  (single writer: `src/shared/api/tokens.ts`) — and fetch
  `GET /auth/users/me` on boot for the user's `nickname`/`email`. The
  refresh token is single-use: persist the NEW pair from every refresh
  response; replaying a rotated token revokes the whole session chain.
  `POST /auth/logout` `{refresh_token}` revokes server-side (idempotent
  204) and is fired by the sidebar logout.
- Registration: `POST /user/` (`{ email, nickname, password }` — note the
  trailing slash, all other routes have none; 201 = success, 400 = duplicate
  email/nickname) then auto-login.
- **Roles are NOT exposed to the client** — `UserRead` has no role field and
  `/roles` is admin-only. Therefore gate research/agent **optimistically**:
  always show the mode switcher; on 403 show a friendly "requires the
  research role" notice. Do not invent role detection.

### Endpoint map (prototype scope)

| Area | Endpoints (all behind `/api` proxy) |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/users/me`, `POST /user` |
| Ask | `POST /ask/search` (body `{query, stream, conversation_id?}`, model ids on query string), `GET /ask/research?query=&stream=true`, `GET /ask/agent?goal=&persona_id=` |
| History | `GET /history`, `GET /history/{id}`, `DELETE /history/{id}` |
| Personas | `GET/POST /personas`, `GET/PATCH/DELETE /personas/{id}` |
| API keys | `GET/POST /api-keys`, `DELETE /api-keys/{id}` (`raw_key` shown exactly once at creation; revoke **keeps the row** with `is_active: false` — the UI shows it as "revoked", not deleted) |
| Models | `GET /models?kind=`, `GET /models/preferences`, `PUT /models/{id}/preference` |
| Admin | `GET/POST /admin/models/providers`, `PATCH/DELETE /admin/models/providers/{id}`, `GET/POST /admin/models/entries`, `PATCH/DELETE /admin/models/entries/{id}`, `GET /admin/models/defaults`, `PUT /admin/models/defaults/{kind}?model_id=`, `GET /health/models` (re-probe) |
| Liveness | `GET /healthy` — useful for a "backend offline" indicator |

## Gotchas

- Build fails on unused locals/params — delete dead imports immediately.
- PrimeVue services must be registered in `main.ts` before use:
  `ToastService` (toast errors), `ConfirmationService` (delete confirms).
- Assistant answers are markdown with citation links (`[Source](url)`) —
  render with `marked`. Answers come from our own backend, which is
  acceptable for the prototype; note that DOMPurify hardening is a listed
  future task, not part of this phase.
- `conversation_id` continuation: omit it to start a conversation (its id
  arrives in the `conversation` event / JSON response); pass it to continue.
  Unknown id → 404 (JSON) or terminal `error` event (SSE).
- `.reference/` and its contents must never be modified or imported.
