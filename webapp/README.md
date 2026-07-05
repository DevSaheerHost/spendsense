# SpendSense - Lifetime Income & Expense Tracker

A mobile-first Next.js (App Router) application for tracking lifetime income,
expenses, loans/EMIs, and getting smart budget recommendations. Built with
Next.js, Tailwind CSS, Firebase (Authentication, Firestore, Cloud Messaging),
and Recharts.

## Features

- **Authentication** - Email/password login via Firebase Authentication. One
  email = one account; every Firestore document is keyed by the user's UID.
- **Dashboard** - Monthly income, expense, and balance summary cards, a
  category spending pie chart, and a 6-month income vs. expense trend chart.
- **Transaction entry** - Add income/expenses with a detailed description,
  date, amount, and category.
- **Money-type flags** - Every transaction is flagged Green (healthy), Yellow
  (neutral), or Red (unhealthy). Logging a Red flag shows an immediate
  on-screen alert and sends a push notification.
- **Loan & EMI management** - Track total loan amount, amount paid, monthly
  EMI, and due date; record payments with one tap.
- **Push notifications (FCM)** - Foreground toasts plus background push for:
  upcoming EMI reminders, monthly budget overspend, and red-flag alerts.
- **Smart recommendations** - Personalized budget advice. Uses the Google
  Gemini free-tier API when `GEMINI_API_KEY` is configured; otherwise falls
  back to a deterministic 50/30/20 rule-based engine (never unavailable).

## Project structure

```
src/
  app/
    login/, register/            Auth pages
    dashboard/                   Summary cards + charts + budget + notif opt-in
    transactions/                Add/list transactions, red-flag alert
    loans/                       Add/list loans, record EMI payments
    recommendations/             Recommendation engine UI
    api/
      recommendations/route.ts        Gemini call with local fallback
      notifications/send/route.ts     Push a notification to the caller's own devices
      cron/check-reminders/route.ts   Daily EMI + budget check (external scheduler)
  components/                    UI components, grouped by feature
  contexts/AuthContext.tsx       Firebase Auth state + login/register/logout
  hooks/                         useTransactions, useLoans, useUserProfile, useMonthlyStats
  lib/
    firebase/client.ts           Firebase client SDK (browser only)
    firebase/admin.ts            Firebase Admin SDK (server only, API routes)
    firestore/                   Firestore CRUD + realtime subscriptions
    notifications/fcm.ts         Client-side FCM registration & foreground listener
    recommendations/             50/30/20 engine.ts + gemini.ts
    types.ts                     Shared TypeScript types
public/firebase-messaging-sw.js  FCM background service worker
firestore.rules                 Security rules (a user can only access their own data)
vercel.json                      Vercel Cron config for the reminders job
```

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication > Sign-in method > Email/Password**.
3. Enable **Firestore Database** (start in production mode).
4. Deploy `firestore.rules` (Firebase Console > Firestore > Rules, or via the Firebase CLI: `firebase deploy --only firestore:rules`).
5. Under **Project Settings > General > Your apps**, add a Web app and copy the config values.
6. Under **Project Settings > Cloud Messaging > Web Push certificates**, generate a key pair (this is your VAPID key).
7. Under **Project Settings > Service Accounts**, click "Generate new private key" to get Admin SDK credentials (used by API routes).

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from step 1:

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_VAPID_KEY` - client config (safe to expose to the browser).
- `GEMINI_API_KEY` - optional, get a free-tier key at [Google AI Studio](https://aistudio.google.com/apikey). If left empty, recommendations automatically use the local 50/30/20 fallback logic.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Admin SDK service account, used only by the push-notification routes (`/api/notifications/send`, `/api/cron/check-reminders`). Keep these secret. **Not required for Gemini recommendations** - that route verifies the user's ID token via the Identity Toolkit REST API using only the Web API key, so it works with just `NEXT_PUBLIC_FIREBASE_API_KEY` + `GEMINI_API_KEY`.
- `CRON_SECRET` - a random string you choose, used to authorize the daily reminders job.

> **Model note:** the recommendation engine defaults to `gemini-2.5-flash`
> (free-tier eligible). Override with `GEMINI_MODEL` if your key has quota for
> a different model.

Also update `public/firebase-messaging-sw.js` with the same `NEXT_PUBLIC_FIREBASE_*` values (service workers cannot read `.env` files, so the config is duplicated there).

### 3. Install and run

```bash
npm install
npm run dev
```

Open http://localhost:3000. New users register with an email and password; each email maps to exactly one account, keyed by the Firebase Auth UID in Firestore at `users/{uid}`.

### 4. Schedule the daily reminders job

`src/app/api/cron/check-reminders/route.ts` checks every user for EMIs due within 3 days and monthly budget overspend, then sends FCM push notifications. It is not triggered automatically — wire up a scheduler to call it once a day:

- **Vercel Cron** (already configured in `vercel.json`, runs daily at 09:00 UTC): set the `CRON_SECRET` environment variable in your Vercel project; Vercel automatically sends it as `Authorization: Bearer <CRON_SECRET>`.
- **Any other scheduler** (GitHub Actions, cron-job.org, etc.): call `GET /api/cron/check-reminders` with header `x-cron-secret: <CRON_SECRET>`.

### 5. Deploy

Deploy to [Vercel](https://vercel.com/new) (or any Node.js host that supports Next.js). Set all the environment variables from `.env.local` in your hosting provider's dashboard.

## Notes on the recommendation engine

`src/lib/recommendations/engine.ts` implements the 50/30/20 rule (50% needs,
30% wants, 20% savings) purely from the user's own transaction and loan data
— no external calls, always available. `src/app/api/recommendations/route.ts`
tries Gemini first (if `GEMINI_API_KEY` is set) and transparently falls back
to this engine on any failure, so the feature never breaks for the user.

## Notes on notifications

- Red-flag alerts fire immediately: the client shows an on-screen modal and
  calls `/api/notifications/send`, which pushes to the user's own registered
  device tokens via the Firebase Admin SDK.
- EMI reminders and budget-overspend warnings are computed by the daily cron
  route across all users, since they depend on the current date rather than
  a specific user action.
- A user must click "Enable notifications" on the dashboard once to grant
  browser permission and register their FCM device token.
