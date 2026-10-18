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

Never edit anything under `.reference/` and never import from it in app code —
re-declare the types you need in `src/entities/`. The `docs/` folder in the
repo root contains empty placeholders; ignore it.

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
| Prototype scope | Auth, chat (3 modes), history, user settings (model preferences, personas, API keys). **Admin panel is out of scope.** |
| Layout | Sidebar app shell: collapsible sidebar with conversation list; chat fills the rest. |
| Language | UI text in English. |
| Theme | Light + dark. Follow system on first visit; toggle persisted in localStorage. **Dark mode = teal accent. Light mode = indigo accent.** |
| Auth in UI | JWT login only (API-key auth is for other clients, not this UI). |

## Stack rules

- Vue 3.5 Composition API, `<script setup lang="ts">` in every component.
- UI components: **PrimeVue 4 only** (installed) + `primeicons` for icons.
  Do NOT add any other component library, CSS framework, or icon set.
- Approved dependencies beyond what's installed: `pinia` (state),
  `marked` (assistant-answer markdown). Anything else must be justified in
  PLAN.md before adding.
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

## Theming — the dual-accent rule

Implemented once in `src/shared/theme/`; every page inherits it.

- PrimeVue 4 styled mode, **Aura** preset as base, configured in `main.ts`
  with `darkModeSelector: '.app-dark'`.
- **Dark mode → teal primary. Light mode → indigo primary.** Switch the
  primary palette at runtime with `updatePrimaryPalette()` from
  `@primevue/themes` (token refs like `50: '{teal.50}'` … `950: '{teal.950}'`)
  and toggle the `app-dark` class on `<html>` — the surface palette follows
  the class automatically.
- On boot: use `localStorage['askowl.theme']` if set, else follow
  `prefers-color-scheme`. The toggle (sun/moon primeicon in the shell header
  or sidebar footer) persists the explicit choice back to the same key.
  Apply the initial class/palette before mounting the app to avoid a flash.
- Never hardcode hex colors in components. Use PrimeVue design tokens
  (`var(--p-primary-color)`, `var(--p-text-color)`, `var(--p-content-background)`
  etc.) or scoped CSS built on them.

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
- **401 anywhere** → clear the session and route to `/login` (the JWT
  expires after ~30 min; sessions dropping mid-use is expected).
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
  `{ access_token, token_type }`. Store the token in
  `localStorage['askowl.token']`; fetch `GET /auth/users/me` on boot for the
  user's `nickname`/`email`.
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
| Auth | `POST /auth/login`, `GET /auth/users/me`, `POST /user` |
| Ask | `POST /ask/search` (body `{query, stream, conversation_id?}`, model ids on query string), `GET /ask/research?query=&stream=true`, `GET /ask/agent?goal=&persona_id=` |
| History | `GET /history`, `GET /history/{id}`, `DELETE /history/{id}` |
| Personas | `GET/POST /personas`, `GET/PATCH/DELETE /personas/{id}` |
| API keys | `GET/POST /api-keys`, `DELETE /api-keys/{id}` (`raw_key` shown exactly once at creation; revoke **keeps the row** with `is_active: false` — the UI shows it as "revoked", not deleted) |
| Models | `GET /models?kind=`, `GET /models/preferences`, `PUT /models/{id}/preference` |
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
