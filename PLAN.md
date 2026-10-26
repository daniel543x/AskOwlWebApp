# AskOwl WebApp — Prototype Plan

Goal: a **full, runnable prototype** against the real AskOwl backend —
register/login, chat in all three modes (search / research / agent) with live
SSE streaming, conversation history, and user settings (model preferences,
personas, API keys). Clean PrimeVue UI styled by the Gleap design system
(warm paper + graphite ink, light + dark).

Constraints and conventions live in [CRUSH.md](CRUSH.md). Working agreement:

- Work phase by phase, in order. Keep every task's checkbox (`- [x]`) updated.
- `bun run build` must stay green after every phase.
- Read the `.reference/docs_api/` page listed in a phase before starting it.
- When a phase has an "Acceptance" line, verify it in `bun run dev` against
  the real backend before moving on.

## Phase 0 — Foundation

- [x] Add dependencies: `bun add pinia marked`
- [x] Configure the API proxy in `vite.config.ts`: `server.proxy` and
      `preview.proxy` map `/api` → `env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'`,
      `changeOrigin: true`, rewrite strips the `/api` prefix (use `loadEnv`).
      Create `.env.example` documenting `VITE_API_PROXY_TARGET`.
- [x] Theme module `src/shared/theme/`:
      - composable that resolves the initial mode from `localStorage['askowl.theme']`
        or `prefers-color-scheme`, exposes `mode` + `toggle()`, persists the
        explicit choice, toggles `app-dark` on `<html>`, and calls
        `updatePrimaryPalette()` (teal for dark, indigo for light)
      - apply the initial mode before the app mounts (no flash of wrong theme)
- [x] `src/app/main.ts`: register PrimeVue with the Aura preset and
      `darkModeSelector: '.app-dark'`, register `ToastService` +
      `ConfirmationService`, install pinia and the router
- [x] `src/assets/style.css`: system font stack, page background from surface
      tokens, remove the Vite template defaults; delete `src/components/HelloWorld.vue`
- [x] Router skeleton with lazy-loaded routes and `meta: { public: true }`
      on auth pages:
      `/login`, `/register` (AuthLayout) · `/` → redirect `/chat` ·
      `/chat` and `/chat/:conversationId` (AppShell) · `/settings` (AppShell)
- [x] Placeholder page components so the shell of the app compiles

**Acceptance:** dev server runs, theme toggle flips teal-dark ↔ indigo-light
and survives reload, build is green.

## Phase 1 — API layer & entities

Read first: `.reference/docs_api/api/authentication.md`, `api/errors.md`,
schemas in `.reference/AskOwlAPI.json`.

- [x] `src/entities/`: `user.ts` (`UserCreate`, `LoginRequest`, `TokenData`,
      `UserRead`), `persona.ts` (`PersonaCreate/Update/Read`), `apiKey.ts`
      (`ApiKeyCreate/Read/Created`), `models.ts` (`ModelEntry`,
      `PreferenceRead`), `history.ts` (`ConversationRead`,
      `ConversationWithMessages`, `Message`), `ask.ts` (`Source`, SSE event
      payload types for all three modes)
- [x] `src/shared/api/http.ts`: typed fetch wrapper (JSON, bearer token,
      query params, 204 handling, `ApiError` with status + message; on 401 →
      clear session, redirect `/login`)
- [x] `src/shared/api/sse.ts`: `streamSse(url, { method, body, signal }, onEvent)`
      over fetch + `ReadableStream`; parses `event:/id:/data:` frames, parses
      JSON data, ends cleanly on `done` / `error`
- [x] `src/features/auth/authStore.ts` (pinia): `login(usernameOrEmail,
      password)`, `register(...)`, `logout()`, `fetchMe()`; token persisted in
      `localStorage['askowl.token']`; on boot restore token + `fetchMe()`
- [x] Router guard: unauthenticated → `/login` (except public routes);
      authenticated on public routes → `/chat`

**Acceptance:** type-check green; auth store usable (exercised in Phase 2).

## Phase 2 — Auth pages

- [x] `src/components/auth/AuthLayout.vue`: split screen — brand panel
      (logo, "AskOwl", one-line tagline, theme-aware) + centered form card
- [x] `src/pages/auth/Login.vue`: identifier (email or nickname) + password,
      loading state on submit, 401 → inline error message, link to register
- [x] `src/pages/auth/Register.vue`: email + nickname + password + confirm
      password; client-side validation (required, email format, nickname ≤ 50,
      password match); `POST /user` then auto-login → `/chat`;
      400 duplicate → field-level error
- [x] Surface backend/network errors via toast

**Acceptance:** register a fresh user and log in against the real backend;
wrong password shows a clear error.

## Phase 3 — App shell

- [x] `src/components/layout/AppShell.vue`: sidebar + main area; all routes
      below use it
- [x] Sidebar: logo, "New chat" button (→ `/chat`), conversation list from
      `GET /history` (title + relative date, active highlight), Settings nav
      item, theme toggle, user footer (nickname + logout menu)
- [x] Chat store (`src/features/chat/`): conversation list state, load/
      create/continue conversations, delete (with `ConfirmationService`),
      shared by sidebar and chat view
- [x] Responsive: sidebar collapses to a drawer (hamburger) on narrow screens
- [x] Empty state when there are no conversations yet

**Acceptance:** after login the shell renders with real user data and the
real conversation list; logout returns to `/login`.

## Phase 4 — Chat: search mode

Read first: `.reference/docs_api/api/ask_search_sse.md`.

- [x] `src/pages/chat/ChatView.vue`: handles both `/chat` (new) and
      `/chat/:conversationId` (loads `GET /history/{id}` and renders prior
      messages; the next ask continues that conversation)
- [x] Composer: PrimeVue Textarea (auto-resize) + send button; Enter sends,
      Shift+Enter newline; disabled while streaming; Stop button aborts via
      `AbortController`
- [x] Wire `POST /ask/search` (SSE): consume `conversation`, `status`,
      `query`, `sources`, `context`, `message`, `grounding`, `done`, `error`
- [x] Streaming UI: status line while working; "Searched: <rewritten query>";
      source chips (favicon-less link chip: title + score) above the answer;
      answer deltas appended and rendered as markdown (`marked`) with a
      minimal `.markdown-body` style (headings, lists, code, links);
      grounding badge when the `grounding` event arrives
- [x] Terminal handling: `done: no_context` → show its notice message;
      `error` event → error message in the thread; new conversation id from
      the `conversation` event refreshes the sidebar and updates the URL
- [x] Chat model picker (small Select in the composer footer): options from
      `GET /models?kind=chat` (label = `display_name || model_name`), default
      from `GET /models/preferences`, sends `model_id` as query param
- [x] Empty states: new-chat hero ("What do you want to know?") and prompt
      input centered

**Acceptance:** full search conversation streams live, citations render,
history persists (reload → conversation is there and continuable).

## Phase 5 — Chat: research & agent modes

Read first: `.reference/docs_api/api/ask_research_sse.md`.

- [x] Mode switcher (SelectButton: Search / Research / Agent) in the chat
      header; agent mode relabels the composer to "Describe a goal…"
- [x] Research (`GET /ask/research?query=…&stream=true`): render `plan`
      subquestions as a checklist, group `sources`/`context` per `subquery`,
      stream the report as markdown; `done: budget_exhausted` shows a notice
      with the `reason`
- [x] Agent (`GET /ask/agent?goal=…`): optional persona Select above the
      composer (from `GET /personas`); tool-call statuses rendered as a
      compact activity log; terminal answer streamed
- [x] Role gating: on 403 show a friendly "requires the research role"
      notice (roles are not exposed by the API — optimistic UI, graceful 403)

**Acceptance:** with an elevated account all three modes produce a streamed,
cited answer; with a plain `user` account the 403 notice appears.

## Phase 6 — History details

- [x] Delete conversation from the sidebar (confirm dialog → `DELETE`,
      update list; if the open conversation is deleted → `/chat`)
- [x] Conversation messages: user / assistant bubbles, assistant as markdown
- [x] Sidebar list refresh after the first answer of a new conversation

**Acceptance:** create → see in sidebar → open after reload → continue →
delete works end to end.

## Phase 7 — Settings

Read first: `.reference/docs_api/api/users.md`, `api/models.md`.

- [ ] `src/pages/settings/SettingsView.vue` with Tabs: Models · Personas ·
      API Keys
- [ ] Models tab: per-kind Select (chat / embedding / reranker / decision
      entries from `GET /models`), current defaults from
      `GET /models/preferences`, change → `PUT /models/{id}/preference`
- [ ] Personas tab: DataTable (name, updated), create/edit Dialog (name,
      system_context textarea, `allowed_domains` / `allowed_engines` /
      `allowed_keywords` as tag inputs, JSON editor hint for
      `default_parameters`), delete with confirm
- [ ] API Keys tab: DataTable (name, `key_prefix`, scopes, status, expiry,
      last used), create Dialog (name, scopes multi-select, optional
      expires_at date), **one-time `raw_key` dialog with copy button and a
      "shown only once" warning**, delete (revoke) with confirm

**Acceptance:** all three tabs round-trip against the backend (create, edit,
delete, preference changes reflected in the chat model picker).

## Phase 8 — Polish & handoff

- [x] Loading skeletons for sidebar / history / settings tables
- [x] Backend-offline state: `GET /healthy` probe → banner "Backend
      unreachable at <target>" when down
- [x] Error coverage pass per `.reference/docs_api/api/errors.md`
      (toast copy for 400/403/404/409/422/429/500/502/503 where reachable)
- [x] Mobile pass: shell, chat composer, settings tables
- [x] Remove dead code and leftover template files; final `bun run build`
- [x] Manual walkthrough of the full journey (register → all 3 modes →
      history → settings → logout) and fix what feels off
- [x] Update CRUSH.md if the structure or conventions drifted

## Phase 9 — Admin panel

Read first: `.reference/docs_api/api/models.md`, `api/users.md`.

- [x] `src/features/admin/` + `src/entities/provider.ts`: providers CRUD and
      health probe against `GET /admin/models/providers` and `GET /health/models`
- [x] Admin page `/admin` (AppShell + sidebar "Admin" link): Connections ·
      Models · Defaults tabs
- [x] Connections tab: DataTable (type, base URL, health tag, key set, active,
      last probe), create/edit Dialog (name, provider type, base URL, API key
      replace/remove, active), delete with confirm, health re-probe button
- [x] Models tab: admin entries CRUD (`/admin/models/entries`) with provider
      select, kind, role, capabilities, vector dims, default params JSON
- [x] Defaults tab: global defaults per kind (`PUT /admin/models/defaults/{kind}?model_id=`)
- [x] 403 gating: roles are not exposed — the page probes
      `GET /admin/models/providers` and shows a friendly notice on 403
- [x] `bun run build` green

## Phase 10 — Gleap redesign

Style reference: [docs/design/DESIGN.md](docs/design/DESIGN.md) (moved from
`.crush/design/`). Locked decision change agreed with the owner: the
teal/indigo dual-accent theme is replaced by the Gleap warm-paper system.

New dependency (justification: DESIGN.md names Inter as the substitute for
the Switzer typeface; shipped as a variable font, one woff2):

- `@fontsource-variable/inter`

Tasks:

- [x] `src/shared/theme/preset.ts`: custom `AskOwlPreset` on the Aura base —
      warm surface ramps (light: linen canvas + white cards; dark: warm-dark
      inverse), graphite-ink primary (light) / cream primary (dark), status
      palettes aliased to neutral ramps (achromatic severities), pill radii
      (200px controls, 12px cards/dialogs/messages), segmented pill tabs
- [x] `theme.ts` simplified to class toggling only (both schemes live in the
      preset); `main.ts` uses `AskOwlPreset`
- [x] `style.css`: Inter Variable + `--askowl-lime` token, pill tab list,
      hairline "drawn" data tables, markdown link polish
- [x] Shell: transparent sidebar on canvas, graphite offline banner,
      lime backend-online status dot, graphite "New chat" pill, pill nav
      items with ink active dot
- [x] Auth: centered brand stack (pebble circular logo tile), white card,
      pill inputs, graphite submit
- [x] Chat: graphite user bubbles, white composer card, white pill source
      chips, pebble hero tile, weight-400 hero title, lime plan checkmarks
- [x] Settings/admin: white section cards on canvas, pill tabs/selects,
      status dots (lime active key / up provider)
- [x] CRUSH.md theming section + locked decisions updated
- [x] Verified in `bun run dev` (light + dark, computed-style probes) and
      `bun run build` green

## Phase 11 — Refresh-token sessions

Read first: `.reference/docs_api/api/authentication.md` (JWT section),
`.reference/docs_api/architecture/auth.md` (decision #5), schemas
`TokenData` / `RefreshRequest` / `LogoutRequest` in
`.reference/AskOwlAPI.json`.

Backend contract: login now returns
`{access_token, token_type, refresh_token}`; `POST /auth/refresh`
`{refresh_token}` → a fresh pair; `POST /auth/logout` `{refresh_token}` →
idempotent 204. The refresh token is **single-use** (rotation): every
refresh retires the presented token and mints a new one — the latest
response pair must always be persisted. Replaying a rotated/revoked token
is treated as theft and revokes the whole chain with a generic 401.
Sessions expire only after `REFRESH_TOKEN_EXPIRE_DAYS` (90) unused;
blocked users fail JWT validation with 403.

Design notes (why the flow is shaped this way):

- **Single-flight refresh is mandatory.** Two concurrent 401s that each
  fire `/auth/refresh` would replay the same single-use token; the second
  call reads as theft and kills the whole session chain. All refresh
  callers must share one in-flight promise.
- **Refresh only on 401**, never on 403 — 403 means authenticated-but-
  denied (mode gating / blocked), which a re-auth cannot fix; the
  optimistic role-gating notice stays as is.
- **SSE shares the flow**: `streamSse` reads the token at connect time, so
  once `http.ts` persists the rotated pair, streams automatically use the
  latest access token; a 401 at connect gets one refresh + reconnect
  attempt.
- **Network error during refresh keeps the session** (may be a transient
  outage; the next request retries). Only a definitive 401 from the
  refresh route ends the session. If a consumed token was lost this way,
  the following refresh 401s and lands on `/login` — inherent to
  hash-only, single-use tokens.
- Retry after a successful refresh is safe even for POSTs: a 401 means
  the backend rejected the request before any side effect.

Tasks:

- [x] `src/entities/user.ts`: add `refresh_token` to `TokenData` (required
      by the schema); add `RefreshRequest {refresh_token}` and
      `LogoutRequest {refresh_token}`
- [x] New `src/shared/api/tokens.ts`: both storage keys
      (`askowl.token` / `askowl.refresh`) with `getStoredToken`,
      `getStoredRefreshToken`, `setStoredTokens`, `clearStoredTokens` —
      one writer for the token pair; http/auth store/sse use it
- [x] New `src/shared/api/refresh.ts`: `refreshSession(): Promise<string | null>`
      — single-flight (module-scoped in-flight promise), calls
      `POST /auth/refresh` with `skipUnauthorizedRedirect: true`, persists
      the new pair via `setStoredTokens`, resolves the new access token;
      resolves `null` on 401 and propagates network errors
- [x] `http.ts` 401 handling: for requests that carried a token (and are
      not `skipUnauthorizedRedirect` / auth routes), on 401 call
      `refreshSession()` once — success → retry the original request with
      the new token (single retry, no loop); `null` → `triggerUnauthorized()`
      (existing handler clears + routes to `/login`)
- [x] `sse.ts`: on 401 at connect, one `refreshSession()` + reconnect
      attempt; still `triggerUnauthorized()` when that fails
- [x] `authStore.ts`: `login()` persists both tokens; `clearSession()` also
      drops the refresh key; `logout()` becomes async — best-effort
      `POST /auth/logout` with the stored refresh token (204, network
      errors ignored), then `clearSession()`; legacy sessions predating the
      refresh token simply expire into the normal 401 → `/login` path
- [x] `AppSidebar.vue`: await the now-async `logout()` before routing
- [x] CRUSH.md: update the HTTP/401 and gotcha text (6 h access token,
      refresh flow, `askowl.refresh` key) once implemented
- [x] `bun run build` green

**Acceptance:** verified end to end (2026-10-26). Contract smoke against
the real API: refresh 200 + rotation, replay of a rotated token 401s and
kills the whole chain, logout 204 and post-logout refresh 401s. Browser
walkthrough (Playwright, 13/13): login stores both tokens; booting with a
tampered access token transparently refreshes exactly once and stays in
the shell; a parallel 401 burst (settings tabs) fires exactly one
`/auth/refresh`; reload keeps the session; sidebar logout routes to
`/login`, clears both keys, and the retired refresh token is rejected
server-side. Backend note: live testing surfaced a `MissingGreenlet` 500
on the refresh success path (commit-expired `User` in
`refresh_session`/`_access_token_for`); fixed in the API before sign-off.

## Out of scope for the prototype (do not build)

- Admin user management, roles administration (`/admin/users`, `/roles/*`)
- i18n / locales, tests, E2E, PWA, virtualized lists
- DOMPurify sanitization of LLM markdown (future hardening task)
- API-key authentication in the UI (JWT only)

## Icon migration (owner request)

New dependency (justification: owner asked to switch every icon to Heroicons;
`primeicons` removed):

- `@heroicons/vue` (24/outline set only)

- [x] Replace all primeicons usages across pages/components with Heroicon
      components via PrimeVue `#icon` slots (Button, Message, Tag) and inline
      SVGs elsewhere; `.askowl-icon` global utility for 1em sizing and the
      spinner (`.spin` on ArrowPathIcon)
- [x] ConfirmDialog gets a global warning-icon slot in `AppShell.vue`
- [x] Remove `primeicons` dependency and its `main.ts` import
- [x] `bun run build` green

## Definition of done

`bun run dev` against a running backend: register → login → search/research/
agent conversations stream live with citations → history browses and deletes →
model preferences / personas / API keys manage correctly → theme toggle gives
the warm-paper light and warm-dark Gleap modes, persists, and follows the
system on first visit. `bun run build` is green.
