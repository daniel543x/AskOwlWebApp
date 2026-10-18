# AskOwl WebApp — Prototype Plan

Goal: a **full, runnable prototype** against the real AskOwl backend —
register/login, chat in all three modes (search / research / agent) with live
SSE streaming, conversation history, and user settings (model preferences,
personas, API keys). Clean PrimeVue UI, light (indigo) + dark (teal) themes.

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

## Out of scope for the prototype (do not build)

- Admin panel (user management, roles, model catalog CRUD, health)
- i18n / locales, tests, E2E, PWA, virtualized lists
- DOMPurify sanitization of LLM markdown (future hardening task)
- API-key authentication in the UI (JWT only)

## Definition of done

`bun run dev` against a running backend: register → login → search/research/
agent conversations stream live with citations → history browses and deletes →
model preferences / personas / API keys manage correctly → theme toggle gives
teal-dark and indigo-light, persists, and follows the system on first visit.
`bun run build` is green.
