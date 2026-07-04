# PairUp — Product & Security Audit / Roadmap

> **Goal:** Make PairUp credible and viral among a technical audience.
> **Method:** Reviewed by a four-role team — Senior Full-Stack, Security, Product, Business.
> **Date:** 2026-07-04 · **Scope:** current `main` branch.
>
> **Status (2026-07-04):** P0.1, P0.2, P1.1, P1.3 (client), and P1.5 addressed in code — see
> "Fix log" at the bottom. Remaining: email verification (P0.2 follow-up), server-side security
> middleware baseline (P1.2), server-side consent storage (P1.3), lead quality (P1.4), and the
> P2 growth items.

The single organizing insight: PairUp is a **lead-generation funnel disguised as a game**, and its
audience is people who open DevTools for fun. Every recommendation below serves one of two goals —
**protect credibility** (techies will probe and cheat) or **drive the viral loop** (leaderboard + sharing).

---

## Severity legend

| Tag | Meaning |
|-----|---------|
| 🔴 P0 | Ship-blocker for a technical audience. Will be broken/abused on day one. |
| 🟠 P1 | Materially hurts lead quality, trust, or scale. |
| 🟡 P2 | Polish / growth lever. Do after P0–P1. |

Effort is rough: **S** ≤ half a day, **M** ≈ 1–2 days, **L** ≈ 3–5 days.

---

## 🔴 P0 — Credibility ship-blockers

### P0.1 — The leaderboard is trivially forgeable · effort **M**
`game.completeGame` is a `publicProcedure` that accepts client-supplied `moves` and `timeSeconds`
and writes them straight into `scores` + `leaderboard`. No server-side proof a game was played.

- **Where:** [server/routers.ts:237-282](../server/routers.ts#L237-L282)
- **Exploit:** `POST game.completeGame {gameId, moves:1, timeSeconds:0}` → instant #1.
- **Why it matters:** the leaderboard is the viral hook. A forgeable board gets screenshotted and
  mocked, and the mock spreads faster than the game.
- **Fix:**
  1. Server owns the clock — stamp `startedAt` at `createGame`, compute `timeSeconds` server-side
     from wall-clock on completion; ignore the client's number.
  2. Bound `moves` to a sane range for the grid (min = pairs, reject absurd lows/highs).
  3. Reject completing an already-completed game, and reject completion faster than a floor
     (e.g. < ~0.4s/pair is physically impossible).
  4. Optionally sign the game session (HMAC of `gameId+startedAt`) so the completion must present it.
- **Test gap:** [server/game.test.ts](../server/game.test.ts) covers happy-path scoring only. Add an
  anti-cheat suite — the exact scenario that matters most is currently uncovered.

### P0.2 — Lead form is an open spam / notification cannon · effort **S**
`lead.submit` is public, unauthenticated, with **no rate limit, no CAPTCHA, no email verification**,
and fires an owner push notification **per submit**.

- **Where:** [server/routers.ts:313-353](../server/routers.ts#L313-L353) (notify at
  [:344](../server/routers.ts#L344))
- **Exploit:** a `for` loop floods the `leads` table and the owner's phone.
- **Fix:** per-IP + per-email rate limit (e.g. 3/min, 10/hour); debounce/batch owner notifications;
  add a honeypot field and/or lightweight CAPTCHA; verify email (magic link or code) before the lead
  counts as qualified. See also P1.4 (lead quality).

---

## 🟠 P1 — Trust, quality & scale

### P1.1 — Guest games are unbounded in-memory & not horizontally safe · effort **M**
Guest games live in a module-level `Map` that is never evicted and is per-process.

- **Where:** [server/routers.ts:36-76](../server/routers.ts#L36-L76)
- **Problems:** (a) slow memory leak → eventual OOM/DoS; (b) breaks the moment Railway scales past one
  instance — a guest game created on pod A and completed on pod B returns `NOT_FOUND`.
- **Fix:** persist guest games to the DB with a nullable `userId` (schema already allows it), or move
  the map to a TTL cache (Redis) with expiry. Simplest: just write guest games to `games` like
  authenticated ones and drop the in-memory path.

### P1.2 — No security middleware baseline · effort **S**
No rate limiting, `helmet`, explicit CORS policy, or CSRF consideration anywhere in `server/`.

- **Fix:** add `helmet`, a global rate limiter, and lock CORS to the known origin. Session cookie
  hardening (SameSite/secure) should be re-verified in `server/_core/cookies.ts`.

### P1.3 — PII collected with no consent / privacy surface · effort **S–M**
Name, email, company captured with no consent checkbox, privacy policy link, or unsubscribe path.

- **Why it matters:** given the `wingbank.com.kh` context, PDPA-style expectations apply; a bank-brand
  lead tool with no consent trail is a compliance and reputational risk.
- **Fix:** explicit opt-in checkbox with privacy-policy link on the lead form; store consent timestamp;
  provide an unsubscribe/delete path.

### P1.4 — Weak lead quality · effort **S**
Techies won't hand over a real email for nothing, and nothing verifies the one they give.

- **Fix:** gate a reward behind verification — "verify your email to lock your leaderboard handle /
  unlock your shareable score card." Ties directly into P2.1.

### P1.5 — Code smells that will bite · effort **S**
- `(result as any).insertId` untyped casts — [routers.ts:224](../server/routers.ts#L224),
  [:352](../server/routers.ts#L352).
- Static-vs-DB theme merge keys on exact `name`
  ([routers.ts:90-95](../server/routers.ts#L90-L95)) but dedup on **lowercased** name
  ([:146](../server/routers.ts#L146)) → duplicate-looking themes slip through.

---

## 🟡 P2 — Growth & virality levers

### P2.1 — Shareable score card (OG image) · effort **M**
Current sharing is plain buttons. Techies share *artifacts*.

- **Fix:** generate a per-score OG image (rank, theme, time, personal-best delta) so a shared link on
  Twitter/LinkedIn renders a rich card. This is the single biggest organic-reach lever.

### P2.2 — Daily challenge (shared seed) · effort **M**
Everyone gets the same shuffle for the day → apples-to-apples competition and a reason to return daily.

- **Fix:** deterministic seed derived from the date; a daily leaderboard resets at midnight.

### P2.3 — Retention mechanics · effort **M**
Streaks, personal-best deltas ("−3s vs your best"), and per-theme mastery. Cheap dopamine that techies
respond to and that reinforces the daily loop.

### P2.4 — Theme angle is already smart — lean in · effort **S**
"Products / Features / Team Members" means the game *teaches your product while they play*. Add a subtle
"learn more" surface on matched pairs to convert play into product interest.

---

## Suggested sequence

1. **P0.1 + P0.2** — stop the bleeding on credibility and abuse. (Same sprint.)
2. **P1.1–P1.2** — make it safe to scale and expose publicly.
3. **P1.3–P1.4** — compliance + lead quality before any real marketing push.
4. **P2.1 + P2.2** — turn on the viral loop.
5. **P1.5 / P2.3 / P2.4** — polish and retention.

## Explicitly *not* broken (verified)
- **Admin authorization is solid.** `role` is never settable from client input; it's auto-granted only
  when `openId === OWNER_OPEN_ID` ([db.ts:65-71](../server/db.ts#L65-L71)), and every admin procedure
  re-checks `ctx.user.role === "admin"` server-side (e.g.
  [routers.ts:131-198](../server/routers.ts#L131-L198), [:355-361](../server/routers.ts#L355-L361)).
- OAuth callback does not trust client-provided identity fields for role.

---

## Fix log — 2026-07-04

Implemented in this pass:

- **P0.1 — Anti-cheat scoring** — new `server/gameLogic.ts` (`validateAndNormalizeCompletion`)
  wired into `game.completeGame`. Server measures wall-clock elapsed from the game's `createdAt`;
  rejects completions faster than physically possible, rejects move counts below the perfect-game
  minimum, rejects re-submitting an already-completed game, and clamps the reported time into the
  plausible window. The client now shows the server's authoritative values. Covered by
  `server/gameLogic.test.ts` (8 tests). *Residual:* a bot that waits the minimum time + submits a
  perfect move count can still post a hard score — closing that needs server-side board state.
- **P0.2 — Lead spam** — new `server/rateLimit.ts` (in-memory fixed-window limiter, tested) applied
  to `lead.submit` (5/min per IP, 3/hour per email) and `game.createGame` (30/min per IP). Added a
  honeypot field (`website`) that silently traps bots. *Follow-up:* email verification + cluster-wide
  (Redis) limiting.
- **P1.1 — Guest-game memory leak** — `guestGames` map now TTL-evicts entries older than 2h on each
  create. *Follow-up:* persist guest games to the DB for multi-instance correctness.
- **P1.3 — Consent (client)** — required consent checkbox + honeypot on the lead form; `lead.submit`
  now requires `consent: true`. *Follow-up:* persist consent timestamp server-side + privacy policy
  link + delete/unsubscribe path.
- **P1.5 — Code smells** — theme merge now dedups case-insensitively (consistent with `createTheme`);
  removed the `(result as any).insertId` cast in `createGame`.

Verification: `tsc --noEmit` clean; new logic tests pass (`gameLogic`, `rateLimit`, `auth.logout`).
The DB-integration suites (`game.test.ts`, `lead.test.ts`) require a live `DATABASE_URL` and were
already failing without one — unchanged by this work.

---

## Fix log — 2026-07-04 (email verification)

**P0.2 / P1.4 — Email verification via Resend + server-side consent (P1.3):**

Flow: `lead.submit` creates an **unverified** lead, emails a 6-digit code (Resend), and does
*not* notify the owner. `lead.verify` checks the code (hashed, expiring, attempt-limited) and only
then marks the lead verified and notifies the owner — so **only verified emails become qualified
leads**. `lead.resend` issues a fresh code. If Resend isn't configured, the flow falls back to the
previous immediate-capture behavior (useful for local dev).

- New: `server/email.ts` (Resend via `fetch`, no new dependency), `server/leadVerification.ts`
  (code gen / SHA-256 hashing / expiry / email template — tested in `leadVerification.test.ts`).
- Schema: `leads` gains `verified`, `verifiedAt`, `consentAt`, `verificationCodeHash`,
  `verificationExpiresAt`, `verificationAttempts` (migration `drizzle/0004_fast_sheva_callister.sql`).
  Consent timestamp is now persisted server-side (closes the P1.3 storage gap).
- Client: `Completion.tsx` gains a code-entry step with resend.
- Verification codes are hashed with SHA-256 (never stored/returned in plaintext), expire in 15 min,
  are limited to 5 wrong attempts, and both `verify`/`resend` are rate-limited.

### Deploy steps required
1. **Run the migration** against the DB: `pnpm db:push` (or apply
   `drizzle/0004_fast_sheva_callister.sql`). *Note:* migration `0004`'s auto-generated form also
   re-emitted `CREATE TABLE gameThemes/gameThemePairs` due to a stale drizzle snapshot from `0003`;
   the committed `0004` SQL was trimmed to just the `leads` additions to avoid failing on the live DB.
2. **Set env vars** (e.g. in Railway):
   - `RESEND_API_KEY` — Resend API key
   - `RESEND_FROM_EMAIL` — a sender on a domain verified in Resend (e.g. `no-reply@yourdomain`)
   - `RESEND_FROM_NAME` — optional display name (defaults to `PairUp`)

*Follow-up still open:* unsubscribe / data-deletion path + privacy-policy link (P1.3), and moving
rate-limit state to Redis for multi-instance (P1.2).
