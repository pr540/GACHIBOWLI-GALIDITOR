# ggsplitops — Complete Documentation & KT Guide

> One unique app, online + offline. This is the full knowledge-transfer (KT)
> document: what the system is, how it runs, how to test, deploy, and operate it.

---

## 1. What this is

**ggsplitops** (display name "ggsplitops", tagline "SplitOps") is a mobile-first,
collaborative expense-splitting platform for the "SplitOps / Our GG Group" circle
(15 members, owner **Zubair**). Currency is **INR (₹)** throughout.

It ships in **three forms, one experience**:

| Form | Entry point | Works online | Works offline |
| ---- | ----------- | ------------ | ------------- |
| Web app (Next.js) | `http://localhost:3000` / tunnel link / Vercel | Yes (API :3001) | Yes (localStorage state, offline-first group creation) |
| Android APK | `ggsplitops-v1.2.0.apk` (repo root) | Yes (WebView → live server URL, configurable by long-press) | Yes (embedded `assets/www/index.html` standalone bundle) |
| Backend API + DB | `http://localhost:3001`, Postgres :5432 | n/a (it *is* the online part) | n/a |

Origin: built on the open-source **SplitBills** base (MIT, credit `aaron-seq`,
LICENSE kept in `ggsplitops/`), then renamed/re-themed/extended over Prompts 1–12
(full history in `PROMPTS.md`).

---

## 2. Tech stack

| Layer | Technology |
| ----- | ---------- |
| Monorepo | pnpm 10 workspaces + Turborepo 2 (`ggsplitops/`) |
| Web | Next.js 16 App Router, React 19, Tailwind CSS v4, TanStack React Query 5 |
| API | Hono 4 (Node 22), Zod validation, Better Auth (all providers currently **off**) |
| DB | PostgreSQL 17 + pgvector, Drizzle ORM, Redis 7, MinIO (S3 stand-in), Frankfurter (self-hosted FX) |
| Money engine | `@splitbills/core` — pure TypeScript, zero I/O, tested with plain `node --test` |
| Android | Java WebView app (`com.splitops.ggsplitops`), hand-built with `aapt2/d8/zipalign/apksigner`, debug-signed |
| Infra | Docker Compose (postgres, redis, minio, frankfurter, web), Vercel (web), Cloudflare quick tunnel (public tester links) |
| Node | >= 22.18.0 (native TS type-stripping for core tests) |

---

## 3. Repository layout

```
GACHIBOWLI-GALIDITOR/                 # GitHub repo root (this is what Vercel sees)
├── PROMPTS.md                        # Prompt history + change log (Prompts 1–12)
├── DOCUMENTATION.md                  # This file
├── ggsplitops.apk                    # Installable APK (mirrors in-repo build)
├── ggsplitops-v1.1.0.apk / -v1.2.0.apk  # Versioned tester files
└── ggsplitops/                       # pnpm monorepo root (Vercel Root Directory)
    ├── apps/web/                     # Next.js 16 UI (:3000)
    │   ├── app/ (page, login, groups, groups/[groupId], globals.css)
    │   ├── components/ (amount, edit-expense-modal, member-manager-modal,
    │   │                month-dashboard, theme-toggle)
    │   ├── lib/ (api, auth-client, excel-export, split-calculator, user-context)
    │   ├── eslint.config.mjs         # Flat config (Next 16 has no `next lint`)
    │   └── next.config.ts            # standalone + security headers
    ├── apps/api/                     # Hono API (:3001)
    │   └── src/ (app, auth, env, index,
    │              lib/{access,errors,json,session},
    │              routes/{groups,expenses,settlements},
    │              services/{expenses,ledger})
    ├── apps/android/                 # Native wrapper (WebView + offline bundle)
    │   ├── build-apk.sh              # Full local build pipeline
    │   └── app/src/main/{AndroidManifest.xml, res/, assets/www/index.html}
    ├── packages/core/                # money.ts, split.ts, balance.ts (+ tests)
    ├── packages/db/                  # Drizzle schema, client, seed
    ├── Dockerfile / docker-compose.yml / vercel.json / turbo.json
    └── .env (git-ignored) / .env.example
```

---

## 4. Golden rules (non-negotiable, from CLAUDE.md)

1. **Money is `bigint` minor units** — never float. Amounts travel with currency codes; use `exponentOf()`, never hardcoded `100`.
2. **Money crosses HTTP as decimal strings** (`"12.34"` + `currency`), never JSON numbers.
3. **Splits go through `computeSplit`** — guarantees `sum(shares) === total` exactly.
4. **Balances are derived, never stored** — fold over expense + settlement rows.
5. **Every group route calls `requireMembership`** — the only row-level auth gate (plus `assertMembersInGroup` for member ids in bodies).
6. **Never trust client-supplied split amounts** — server recomputes.
7. **Multi-table writes use one transaction.**
8. Domain conventions: expenses always belong to a group (1:1 = group of two); expenses reference `group_members` (null `user_id` = placeholder); soft delete via `deletedAt`; retryable mutations take `idempotencyKey`; FX snapshotted at creation.
9. **Run `pnpm check` (typecheck + test + lint) before saying done.**

---

## 5. Features (what the tester validates)

- **Login** — Google chooser (Praneeth account + any-email entry), 1-tap grid of all 15 members, guest-name entry; remembered on device (`ggsplitops_active_user`).
- **Groups** — SplitOps primary card, 3 curated groups (Flat 4B, Goa Trip, Cricket), custom groups; search + Favorites-Only filter + star toggles; **offline-first creation** (API failure → saved to `ggsplitops_custom_groups` with "On this device" badge, no NetworkError).
- **Members** — equal permissions for all; Member Manager (add/rename/remove/tag/guest); 15 seeded: Zubair (Owner), Pranu, Abhi Venkata Sai Samsani, Pavan (Kasula Pavan Sai), Prasanth, Ajay, Ajay Kumar, Dlip, Mouni, Sameena Sultana, Tharun Reddy, Uday, Devi, Hassi, Prakash.
- **Expenses** — title, amount, date, single/multi payer, participants, 4 split types (equal/exact/percentage/shares); no negatives; exact-balance validation; 2-decimal rounding; **Transport add-on** (None/Cab 🚕/Bike 🏍️ radios + fare merged into bill total, badge in history); "Last edited by \<name> at \<time>" on every card; search + member/date filters; delete confirm; Clear History.
- **Dashboard** — KPI cards + month calendar heatmap with working day filter; personal "My View" scoping per active account.
- **Balances & settle-up** — derived net balances, simplified transfers, one-tap Record.
- **Excel export** — `.xls` with live formulas (`=1/N`, `=ROUND`, `=SUM`, participation matrix).
- **Theme** — dark/light toggle, CSS vars via Tailwind v4 `@theme inline` + `[var(--color-*)]` classes (the old `[--color-*]` shorthand emits invalid CSS — do not reintroduce).
- **Tosca automation hooks** — stable `data-testid` on login, groups, expense modal, transport radios, APK bundle (23 hooks in the APK, e.g. `apk-google-signin`, `apk-transport-cab`, `apk-exp-save`).

---

## 6. API reference (base `http://localhost:3001/api`, session cookie required)

| Method | Path | Notes |
| ------ | ---- | ----- |
| GET | `/health` | Public. `{status, version, features}` |
| GET/POST | `/auth/*` | Better Auth (all providers currently off) |
| GET `/me` | `/me` | Current session user |
| GET / POST | `/groups` | List mine / create (INR default, zod-validated) |
| GET | `/groups/:groupId` | Group + members |
| GET | `/groups/:groupId/balances` | Balances + simplified transfers |
| GET / POST | `/groups/:groupId/expenses` | List / create (server recomputes splits) |
| GET / DELETE | `/groups/:groupId/expenses/:expenseId` | Detail / delete |
| GET / POST | `/groups/:groupId/settlements` | List / record (idempotencyKey) |

API middleware order: `logger → secureHeaders → cors(single WEB_ORIGIN) → csrf → withSession → requireAuth`. **Anonymous calls get 401** — by design; the web/APK degrade to on-device state instead.

---

## 7. Database

Postgres tables (`packages/db/src/schema.ts`): Better-Auth tables (`user`, `session`, `account`, `verification`) plus `friendships`, `groups`, `groupMembers`, `groupInvitations`, `categories`, `expenses`, `expensePayers`, `expenseShares`, `expenseVersions`, `recurringExpenses`, `settlements`, `attachments`, `receipts(+Items)`, `comments`, `activityLog`, `notifications`, `auditLogs`, `exchangeRates`, `expenseEmbeddings`, `aiChatMessages`, `merchantCache`. Key env: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `WEB_ORIGIN`.

---

## 8. Runbook (daily ops)

```bash
cd ggsplitops
pnpm install
docker compose up -d            # postgres+redis+minio+frankfurter (use -H unix:///var/run/docker.sock if needed)
pnpm db:push                    # apply schema (dev)
pnpm dev                        # web :3000, api :3001
pnpm check                      # typecheck + test + lint (before saying done)
pnpm --filter @splitbills/core test   # 30 money-engine tests, fast, no DB
```

- **API died?** (`curl :3001/api/health` fails): `setsid nohup pnpm --filter @splitbills/api dev > /tmp/opencode/api.log 2>&1 < /dev/null &` (plain `&` gets reaped — use `setsid`).
- **Web stale after edits?** No volume mounts — `docker compose build web && docker compose up -d web`.
- **Public tester link?** `cloudflared tunnel --url http://localhost:3000` (quick tunnels **expire** — old links die; laptop must stay on). For permanence, use Vercel (Root Directory = `ggsplitops`).
- **APK rebuild?** `cd apps/android && bash build-apk.sh`, verify (`apksigner verify`, `apkanalyzer manifest …`), copy to repo root + versioned filename. Bump `versionCode/versionName` in **both** `build-apk.sh` and `app/build.gradle`. Debug keystore: `apps/android/debug.keystore` (keep it — updates must reuse the same key).
- **Push?** `git add -A && git commit -m "…" && git push origin main` (SSH key must be registered on GitHub; see Troubleshooting).

---

## 9. Testing (app-tester role)

| Tool | What it proves | Command |
| ---- | -------------- | ------- |
| ESLint 9 (`eslint-config-next` flat) | 0 errors (warnings ok) | `pnpm --filter @splitbills/web lint` |
| `tsc --noEmit` ×4 packages | Types clean | `pnpm typecheck` |
| `node --test` (no framework) | 30/30 money tests | `pnpm --filter @splitbills/core test` |
| `next build` | Production build (7 routes) | `pnpm --filter @splitbills/web build` |
| `node --check` | APK bundle JS syntax | on extracted `<script>` |
| `apksigner` / `apkanalyzer` | APK signature + manifest truth | `apksigner verify`, `manifest version-code/version-name` |
| `curl` smoke | Live routes 200 | `/`, `/groups`, `/groups/:id`, `/api/health` |
| Tosca (UI automation) | End-to-end flows | Stable `data-testid` hooks (web + APK) |

Latest full pass: lint 0 errors, typecheck clean, 30/30 tests, prod build OK, APK v1.2.0 signature+manifest verified, local/tunnel/API all HTTP 200.

---

## 10. Security posture

- **Backend**: `secureHeaders`, single-origin CORS + CSRF, `requireAuth` on every `/api/*` route, Zod on all inputs, transactions on multi-table writes. **Not weakened for testers** — anonymous gets 401 by design.
- **DB**: credentials via `.env` (git-ignored, never committed); local compose uses dev defaults — **rotate to strong secrets before any production deploy**.
- **Website**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, strict `Referrer-Policy`, minimal `Permissions-Policy` (verified live in response headers).
- **APK**: only `INTERNET` + `ACCESS_NETWORK_STATE` permissions; debug-signed (testers enable "Install unknown apps").

---

## 11. Troubleshooting (solved before — don't regress)

| Symptom | Cause → Fix |
| ------- | ----------- |
| `NetworkError` on Create Group (public link) | Browser hits `localhost:3001` off-machine + API needs session → offline-first local save (kept). |
| Theme unstyled / invalid CSS | `[--color-x]` Tailwind shorthand → always use `[var(--color-x)]`, `@theme inline`. |
| `pnpm lint` fails ("Invalid project directory…/lint") | Next 16 removed `next lint` → `eslint .` + `eslint.config.mjs`. |
| New `react-hooks/*` lint errors | Intentional client hydration → downgraded to `warn` in config; only `no-explicit-any` stays error. |
| Tunnel link dead (`000`) | Quick tunnels expire → start a new one, share the new URL. |
| `git push` → `Permission denied (publickey)` | Register `~/.ssh/id_ed25519.pub` at GitHub → SSH keys. |
| APK won't install (old) | Missing sdk-version/aapt flags, API<26 icons, manifest screens, signing → all fixed in `build-apk.sh`/manifest/`build.gradle` (v1.1.0+). |
| API `000`/dead after shell exit | Background proc reaped → restart with `setsid … &`. |
| Web serves stale code | No volume mounts → `compose build web && up -d web`. |
| `pnpm db:push` hangs | Non-TTY prompt — run interactively or with `yes \|`. |

---

## 12. Release log (short)

- **v1.2.0 (code 3)** — current APK: online+offline bundle (Google sign-in, all 15 members, 4 group ledgers, cab/bike fare, balances, calendar filter, 23 testids). Files: `ggsplitops-v1.2.0.apk`, `ggsplitops.apk`, `ggsplitops/ggsplitops.apk` (identical).
- **v1.1.0 (code 2)** — install-fix release (sdk flags, icons, manifest, signing). File: `ggsplitops-v1.1.0.apk`.
- Web: same feature set + offline-first groups + Tosca hooks, deployed via Docker; public links via Cloudflare tunnel; Vercel needs Root Directory = `ggsplitops`.
- Full prompt-by-prompt history: `PROMPTS.md` (Prompts 1–12).

## 13. Glossary for KT

- **SplitOps** = the primary group/workspace ("Our GG Group"). **Curated groups** = 3 static demo groups. **On-device groups** = created while backend unreachable. **Paisa-accurate** = exact 2-decimal math. **Tosca** = UI automation tool driven via `data-testid`. **Quick tunnel** = temporary public URL (expires). **Offline-first** = UI works from localStorage, syncs when backend reachable.
