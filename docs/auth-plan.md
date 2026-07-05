# Auth, Billing & Multi-App Plan — Implementation Handover

Handover doc for the implementation session. The UI shell already exists in the
repo (see "Current state"); this doc specifies the real backend to build behind
it. Before writing any Next.js route/middleware code, read the guides in
`node_modules/next/dist/docs/` — this Next version (16.x) has breaking changes
vs. what you may assume.

## 1. Context & product model

ReviewMockup is a dashboard of mockup tools ("apps"). Today: Telegram chat
builder (`/chat-builder`) and AI review generation (`/ai-reviews`). Planned:
Instagram and Twitter/X vouch mockups. Monetization gates:

| Capability            | Anonymous | Free (signed in) | Pro            |
|-----------------------|-----------|------------------|----------------|
| Build/edit mockups    | ✅        | ✅               | ✅             |
| Export PNG            | ❌ sign-in modal | ✅ (watermark? TBD) | ✅       |
| AI review generation  | ❌ upgrade modal | ❌ upgrade modal | ✅ (credits) |

Key UX rule: never block entry to the dashboard. Gates trigger only at the
action (export click / generate click).

## 2. Current state (already implemented — mock only)

- `components/AuthModal.tsx` — the sign-in/upgrade modal UI (two variants:
  `'export'` sign-in, `'upgrade'` Pro pitch). Fully styled per design; the
  Google/email/upgrade buttons currently call `onComplete` immediately.
- `lib/auth-mock.ts` — localStorage stub (`isAuthed/setAuthed/isPro/setPro`).
  **Delete this file** and replace all call sites with real session state.
- Call sites:
  - `app/(dashboard)/chat-builder/page.tsx` — `handleExport` gates on
    `isAuthed()`, opens `AuthModal variant="export"`, `onComplete` runs export.
  - `app/(dashboard)/ai-reviews/page.tsx` — `handleExport` same;
    `generate` gates on `isPro()`, opens `variant="upgrade"`.
- Server routes are currently **unprotected**: `app/api/export/route.ts`
  (Puppeteer PNG render) and `app/api/generate-reviews/route.ts` (Gemini,
  needs `GEMINI_API_KEY`). Client-side gating is cosmetic until these check
  sessions server-side.

## 3. Recommended stack

- **Auth**: [better-auth](https://better-auth.com) — first-class Next.js App
  Router support, built-in Google OAuth + email OTP/magic-link plugins, ships
  its own Drizzle schema. Alternative NextAuth v5 acceptable, but better-auth
  chosen for the email-OTP plugin and simpler session API.
- **DB**: Postgres (Neon serverless in prod, local Postgres or Neon branch in
  dev) + **Drizzle ORM** (schema below is Drizzle-flavored).
- **Billing**: Dodo Payments Checkout + customer portal + webhooks. One subscription
  product ("Pro"), monthly + yearly prices.
- **Sessions in client**: better-auth's `useSession()` hook replaces
  `isAuthed()`; plan/entitlement read from a `/api/me` payload or session
  customFields.

## 4. Database schema

better-auth generates its core tables; shown here for completeness, then the
app tables. All timestamps `timestamptz`, defaults `now()`.

```ts
// drizzle/schema.ts
import { pgTable, text, timestamp, boolean, integer, jsonb, pgEnum, uuid, index } from 'drizzle-orm/pg-core';

// ── better-auth core (generated via `npx @better-auth/cli generate`) ──
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),        // 'google' | 'credential'
  accountId: text('account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),          // email for OTP/magic link
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── App tables ────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'pro']);
export const subscriptionStatusEnum = pgEnum('subscription_status',
  ['active', 'trialing', 'past_due', 'canceled', 'incomplete']);
export const appTypeEnum = pgEnum('app_type', ['telegram', 'instagram', 'twitter']);

export const subscription = pgTable('subscription', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  plan: planEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  dodoCustomerId: text('dodo_customer_id').unique(),
  dodoSubscriptionId: text('dodo_subscription_id').unique(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Saved mockups — "No work lost". payload is the full builder state
// (messages, bot identity, device, hideNames, statusBarTime, …) so each app
// type can evolve its shape independently.
export const project = pgTable('project', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  app: appTypeEnum('app').notNull().default('telegram'),
  title: text('title').notNull().default('Untitled'),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('project_user_idx').on(t.userId, t.updatedAt)]);

// One row per successful PNG export — analytics + future free-tier caps.
export const exportLog = pgTable('export_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  app: appTypeEnum('app').notNull(),
  device: text('device'),                            // DeviceId from lib/devices.ts
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('export_log_user_idx').on(t.userId, t.createdAt)]);

// AI generation usage — ledger style so monthly caps/credits are auditable.
// delta negative = consumption, positive = grant (plan refresh, top-up).
export const creditLedger = pgTable('credit_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  delta: integer('delta').notNull(),
  reason: text('reason').notNull(),                  // 'generation' | 'monthly_grant' | 'topup' | …
  meta: jsonb('meta'),                               // { count, model, product }
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('credit_ledger_user_idx').on(t.userId, t.createdAt)]);
```

Entitlement derivation (no boolean flags on `user`): a user is Pro iff
`subscription.plan = 'pro' AND status IN ('active','trialing') AND
(current_period_end IS NULL OR current_period_end > now())`. Credits balance =
`SUM(delta)` for the user (cache per request).

## 5. Server enforcement (the part that actually matters)

1. `app/api/export/route.ts` — require session (`auth.api.getSession`), 401
   with `{ error: 'auth_required' }` otherwise. On success insert `export_log`.
   Rate-limit per user (e.g. 20/hour free) — Puppeteer is expensive.
2. `app/api/generate-reviews/route.ts` — require session AND Pro entitlement
   AND credits > 0; 402 `{ error: 'upgrade_required' }` / `{ error:
   'no_credits' }`. Deduct `delta: -count` on success.
3. Client maps `auth_required` to `AuthModal variant="export"`,
   `upgrade_required` to `variant="upgrade"` — keep the optimistic client
   gates, but the server is the source of truth.
4. Dodo webhook route `app/api/dodo/webhook/route.ts` —
   `subscription.active|renewed|updated|cancelled|failed|expired|on_hold`
   upsert `subscription`; subscription renewal/activation inserts `monthly_grant`
   credit row.

## 6. Auth wiring

- `lib/auth.ts` — better-auth server instance: Google provider + email OTP
  plugin, Drizzle adapter, session cookie 30 days.
- `app/api/auth/[...all]/route.ts` — better-auth handler.
- `lib/auth-client.ts` — `createAuthClient()`; exports `useSession`,
  `signIn.social({ provider: 'google' })`, `signIn.emailOtp(...)`.
- `AuthModal` changes:
  - "Continue with Google": `signIn.social({ provider: 'google', callbackURL:
    current page })`.
  - "Continue with email": swap right column to a small email + OTP two-step
    form inside the same modal (state machine: `email → otp`).
  - "Upgrade to Pro": POST `/api/dodo/checkout` then redirect to Dodo Checkout;
    return URL back to the originating page with `?upgraded=1` to re-run the
    pending action.
  - After OAuth redirect the pending action (export) is lost — persist
    `sessionStorage 'pending-action'` and re-trigger on mount when session
    exists.
- Header user chip (sidebar bottom) shows avatar/name + sign-out once session
  exists; "∞ credits · Pro" placeholder becomes real credits/plan.

## 7. Projects autosave (phase 2, schema already above)

- Debounced PUT `/api/projects/:id` with builder payload on change; anonymous
  users keep localStorage; on first sign-in, migrate the localStorage draft to
  a `project` row.
- Builder import/export localStorage bridge
  (`reviewmockup:builder-import`) stays as-is.

## 8. Env vars

```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=            # http://localhost:3000 in dev
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_KEY=
DODO_PAYMENTS_ENVIRONMENT=  # test_mode or live_mode
DODO_PRODUCT_PRO=
GEMINI_API_KEY=             # existing
RESEND_API_KEY=             # or other mailer, for email OTP
```

## 9. Phases

1. **Auth core**: better-auth + Drizzle + Google + email OTP; AuthModal wired;
   protect `/api/export`; delete `lib/auth-mock.ts`.
2. **Billing**: Dodo checkout/portal/webhooks; `subscription` table; protect
   `/api/generate-reviews`; credits ledger + monthly grant.
3. **Projects**: autosave, project list UI, localStorage migration.
4. **Multi-app**: Instagram/Twitter builders reuse `project.app` +
   `export_log.app`; sidebar entries already exist as disabled placeholders.

## 10. Non-goals / cautions

- Do not gate dashboard entry or builder editing — anonymous building is the
  acquisition funnel.
- Keep `AuthModal` visual design as-is; only swap button handlers/forms.
- Don't trust client gating; every paid capability re-checked server-side.
- Next 16: verify route handler + middleware APIs against
  `node_modules/next/dist/docs/` before coding (breaking changes vs. training
  data).
