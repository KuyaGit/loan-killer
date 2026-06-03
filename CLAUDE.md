# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
expo start          # Start dev server (opens QR for Expo Go / dev client)
expo start --ios    # Open in iOS Simulator
expo start --android
expo lint           # Run ESLint (eslint-config-expo)
```

There is no test suite configured. Type-checking is via `tsc --noEmit` (inferred from tsconfig strict mode).

## Architecture

**Loan Killer** is an offline-first personal loan tracker built with Expo SDK 54 / React Native 0.81. All data lives in a local SQLite database (`loanlogs.db`) — there is no backend, no authentication, and no network dependency.

### Navigation (Expo Router v6, file-based)

```
app/
  _layout.tsx          # Root: SQLiteProvider + ThemeProvider + Stack
  (tabs)/
    _layout.tsx        # Bottom tab bar (4 tabs)
    index.tsx          # Dashboard — aggregate KPIs
    loans.tsx          # Loan list with search + status filter
    add.tsx            # Create-loan form with term picker + schedule preview
    settings.tsx       # Export/import JSON backups, about
  loan/[id].tsx        # Loan detail — summary card + monthly checkbox list
```

### Data layer

- **Schema & migrations**: `constants/database.ts` — `migrate()` runs on every DB open and applies v0→v1 DDL if needed. WAL mode and foreign keys are enabled via pragmas.
- **Service functions**: `services/database.ts` — all SQL lives here. Key functions: `createLoan`, `getLoans`, `getLoanById`, `getLoanMonths`, `getDashboardStats`, `markMonthAsPaid`, `updateLoanCalculations`, `deleteLoan`, `exportToJSON`, `importFromJSON`.
- **Reactivity**: `services/notify.ts` provides a tiny pub/sub (`notifyDbChange` / `subscribeDbChange`). Every mutation calls `notifyDbChange()`, and `hooks/use-live-query.ts` re-runs its query on that signal as well as on screen focus.
- **Arithmetic**: Loan amounts are stored as integer cents (×100) and converted back to display units at the service boundary to avoid floating-point drift. The last monthly payment absorbs the remainder.
- **Boolean mapping**: SQLite stores `isPaid` as `0`/`1`; the service layer converts to/from TypeScript `boolean`.

### State management

No Redux or Zustand. State flows through:
1. `SQLiteProvider` (from `expo-sqlite`) — provides the `db` handle via `useSQLiteContext()`.
2. `useLiveQuery(queryFn, deps)` — wraps a query function, subscribes to DB-change events and screen focus, returns `{ data, loading, error, refetch }`.
3. After every mutation the calling component invokes `notifyDbChange()` to trigger re-renders across all live queries.

### Design system (`constants/theme.ts`)

- **Colors**: Emerald primary (`#059669` light / `#10b981` dark), semantic danger/success/pending tokens, text and surface hierarchy tokens.
- **Typography**: Named scale — `screenTitle`, `heroNumber`, `sectionLabel`, `cardTitle`, `body`, `bodyStrong`, `caption`, `button`.
- **Spacing**: 4pt base rhythm — `xs=4, sm=8, md=12, lg=16, xl=20, xxl=24, xxxl=32`.
- **Radius**: `sm=8, md=12, lg=16, pill=999`.
- `cardShadow()` returns iOS shadow + Android elevation props; shadows are suppressed in dark mode.
- Platform-specific fonts: system font stack on iOS, fallbacks on Android.

### Formatting (`constants/format.ts`)

- `formatPeso(amount)` — manually formats ₱ to avoid a Hermes JS engine glyph issue (do not replace with `Intl.NumberFormat`).
- `formatDate(iso)` → `"Jun 3, 2026"`.
- `formatPercent(0..1)` → `"33%"`.

### Types (`types/loan.ts`)

Core interfaces: `Loan`, `LoanMonth`, `CreateLoanInput`, `DashboardStats`. Import from here, not inline.

### Path alias

`@/*` maps to the repo root (configured in `tsconfig.json`). Use `@/components/...`, `@/services/...`, etc. for all internal imports.

### Key constraints

- **Completed loans are locked**: `markMonthAsPaid` is a no-op when `loan.status === 'completed'`; the detail screen disables checkboxes in this state.
- **Transactions**: `createLoan` and `importFromJSON` use `withTransactionAsync` — keep mutations transactional.
- **New Architecture + React Compiler** are both enabled (`app.json`). Avoid patterns that break with the React Compiler (no manual memoization that contradicts compiler output).
- **Typed routes** are enabled (`experiments.typedRoutes`). Use the generated types from `expo-router` for `href` props.
