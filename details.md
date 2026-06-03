# Loan Killer — Technical Details

## 1. Overview

**Loan Killer** is an offline-first personal loan tracker built for Android (with iOS support). All data lives in a local SQLite database — there is no backend, no user accounts, and no network dependency. The app helps users track multi-month personal loans: create a loan, mark monthly payments as paid, and watch the debt progress toward zero.

| Property | Value |
|---|---|
| Display Name | Loan Killer |
| Slug | `loan-killer` |
| Deep-link Scheme | `loankiller` |
| Version | 1.0.0 |
| Android Package | `com.kuyagit.loankiller` |
| Build Type | APK (sideloaded) |
| Expo SDK | 54 |
| React Native | 0.81.5 |
| React | 19.1.0 |
| Database File | `loanlogs.db` |
| Supports Tablet | Yes |

> **Note:** The About section inside the app refers to the app as "Loan Logs" — this is an in-app text inconsistency; the official display name is "Loan Killer".

### Enabled Experiments

- New Architecture (`newArchEnabled: true`)
- React Compiler (`reactCompiler: true` via experiments)
- Typed Routes (`typedRoutes: true`)
- Edge-to-Edge on Android (`edgeToEdgeEnabled: true`)
- System-driven dark mode (`userInterfaceStyle: automatic`)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigation | Expo Router v6 (file-based) |
| Database | `expo-sqlite` v16 (WAL mode, foreign keys enabled) |
| Biometric Auth | `expo-local-authentication` |
| UUID Generation | `expo-crypto` (`randomUUID()`, Hermes-safe) |
| Backup Export | `expo-sharing` + `expo-file-system` |
| Backup Import | `expo-document-picker` + `expo-file-system` |
| Animations | `react-native-reanimated` v4 |
| Gestures | `react-native-gesture-handler` v2 |
| Icons | `@expo/vector-icons` + `expo-symbols` (SF Symbols on iOS) |
| Haptics | `expo-haptics` |
| Language | TypeScript (strict mode) |
| Linting | ESLint with `eslint-config-expo` |
| Path Alias | `@/*` → repo root (`tsconfig.json`) |

---

## 3. App Structure

```
app/
  _layout.tsx          # Root: SQLiteProvider + ThemeProvider + Stack navigator
  (tabs)/
    _layout.tsx        # Bottom tab bar (4 tabs)
    index.tsx          # Dashboard — aggregate KPIs
    loans.tsx          # Loan list with search + status filter
    add.tsx            # Create-loan form with term picker + schedule preview
    settings.tsx       # Export/import JSON backups, app lock, about
  loan/[id].tsx        # Loan detail — summary card + monthly payment checklist

constants/
  database.ts          # Schema DDL, migrations, DB_VERSION
  format.ts            # formatPeso, formatDate, formatPercent
  theme.ts             # Design tokens: colors, typography, spacing, radius

services/
  database.ts          # All SQL: createLoan, getLoans, getLoanById, etc.
  app-lock.ts          # Biometric auth helpers
  notify.ts            # Tiny pub/sub: notifyDbChange / subscribeDbChange

hooks/
  use-live-query.ts    # useLiveQuery(queryFn, deps) — reactive DB hook

types/
  loan.ts              # Loan, LoanMonth, CreateLoanInput, DashboardStats, etc.

components/
  lock-gate.tsx        # Wraps the whole app; shows lock screen when enabled
  loan-card.tsx
  monthly-item-checkbox.tsx
  edit-amount-modal.tsx
  progress-bar.tsx
  term-chips.tsx
  card.tsx
  primary-button.tsx
  empty-state.tsx
  screen-header.tsx
  themed-text.tsx
  haptic-tab.tsx       # Tab press haptic feedback (iOS)
  ui/icon-symbol.tsx   # Cross-platform icon abstraction
```

---

## 4. Screens & Features

### 4.1 Dashboard — `app/(tabs)/index.tsx`

Read-only aggregate view. Pulls from `getDashboardStats()` via `useLiveQuery`.

- **Empty state**: shown when no loans exist; includes an "Add Your First Loan" CTA.
- **Hero card**: "Overall Debt Progress" — average progress % across active loans, a progress bar, and a "₱X paid / ₱Y remaining" footer.
- **6 KPI stat cards** (2-column grid):

| Card | Value |
|---|---|
| Total Borrowed | Sum of `originalAmount` across all loans |
| Remaining Balance | Sum of `remainingBalance` across all loans |
| Monthly Due | Sum of `monthlyPayment` across **active** loans only |
| Total Paid | Total Borrowed − Remaining Balance |
| Active Loans | Count of loans with `status = 'active'` |
| Completed | Count of loans with `status = 'completed'` |

- Subtitle below the grid: "X active · Y completed".

---

### 4.2 Loans — `app/(tabs)/loans.tsx`

- **Search bar**: filters by loan name (case-insensitive substring match).
- **Status filter pills**: All / Active / Completed — defaults to **Active** on mount.
- **Loan list**: `FlatList` of `LoanCard` components.
  - Tap → navigate to `app/loan/[id].tsx`.
  - **Long-press → delete confirmation** (`Alert.alert` with Cancel / Delete options).
- **Empty states**:
  - No results (search/filter mismatch): "No Results" illustration.
  - No loans at all: "No Loans Yet" illustration.

---

### 4.3 Add Loan — `app/(tabs)/add.tsx`

Form for creating a new loan. No interest rate field — payments are principal only.

| Field | Input type | Constraint |
|---|---|---|
| Loan Name | Text | Required |
| Total Loan Amount | Decimal pad | Required; stored as integer cents |
| Terms (months) | `TermChips` selector | 1–60 months (`MAX_TERM_MONTHS = 60`) |
| Start Date | Text (YYYY-MM-DD) | Defaults to today |
| Notes | Multiline text | Optional |

- **Live Schedule Preview card**: updates as the user types amount/term. Shows:
  - Computed monthly payment (months 1 to n−1).
  - Last-month payment (highlighted if different from regular payment due to the remainder).
  - Total months.
- On save: calls `createLoan()`, resets the form, navigates to the Loans tab.

---

### 4.4 Settings — `app/(tabs)/settings.tsx`

#### Data Summary Card
Shows: Total Loans / Active / Completed counts, and a footer note "Database: loanlogs.db · Offline only".

#### Export Backup
- Calls `exportToJSON()` → produces an `ExportBundle` JSON.
- Writes to the cache directory via `expo-file-system`.
- Opens the system share sheet via `expo-sharing`.

#### Import Backup
- File picker (`expo-document-picker`) for `.json` files.
- Two import modes (user chooses via an `Alert`):
  - **Merge** — keeps existing loans, skips conflicts (no duplicates by ID).
  - **Replace All** — destructive; double-confirmation dialog required.
- Calls `importFromJSON()`.

#### App Lock
- Toggle to enable/disable biometric locking of the entire app.
- Both enabling and disabling require biometric/PIN confirmation first.
- State persisted to the `settings` table (`key = 'appLockEnabled'`, value `'0'`/`'1'`).
- Falls back to device PIN if biometrics unavailable.

#### Appearance / About
- Informational only. Notes that dark mode follows the system setting.
- "About" section contains the display name, version, and a short description.

---

### 4.5 Loan Detail — `app/loan/[id].tsx`

#### Summary Card
| Field | Source |
|---|---|
| Status badge | `active` → blue; `completed` → green "✓ Completed + date" |
| Loan Name | `loan.name` |
| Original Amount | `loan.originalAmount` |
| Remaining Balance | `loan.remainingBalance` |
| Monthly Payment | `loan.monthlyPayment` |
| Start Date | `loan.startDate` |
| Progress | `X / Y months paid` + % + bar |
| Notes | `loan.notes` (optional) |

#### Payment Schedule List
- One `MonthlyItemCheckbox` row per `LoanMonth`.
- Each row shows month number, amount, and paid status.
- **Toggle paid/unpaid**: calls `markMonthAsPaid()` → triggers `updateLoanCalculations()`.
- **Edit amount**: opens `EditAmountModal` → calls `updateMonthAmount()`, which re-derives `originalAmount` from the sum of all month amounts.
- When the last unpaid month is marked paid, the loan auto-transitions to `completed`.

#### Completed Loan Lock
- All toggles and edit buttons are **disabled** for completed loans.
- A "🎉 Fully paid! Payment history is locked." notice is shown at the bottom of the list.

#### Delete Loan
- "Delete Loan" button (danger outline style) at the bottom of the screen.
- Requires confirmation via `Alert`.
- Calls `deleteLoan()` → cascades to `loan_months` via FK.

---

## 5. Data Model

### Schema (`constants/database.ts`) — `DB_VERSION = 2`

```sql
-- Enabled on every open
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS loans (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  originalAmount  REAL NOT NULL,
  remainingBalance REAL NOT NULL,
  monthlyPayment  REAL NOT NULL,
  totalMonths     INTEGER NOT NULL,
  paidMonths      INTEGER NOT NULL DEFAULT 0,
  progress        REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed'
  startDate       TEXT NOT NULL,
  notes           TEXT,
  createdAt       TEXT NOT NULL,
  completedAt     TEXT
);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

CREATE TABLE IF NOT EXISTS loan_months (
  id          TEXT PRIMARY KEY,
  loanId      TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  monthNumber INTEGER NOT NULL,
  amount      REAL NOT NULL,
  isPaid      INTEGER NOT NULL DEFAULT 0,  -- 0 = false, 1 = true
  paidDate    TEXT
);
CREATE INDEX IF NOT EXISTS idx_loan_months_loanId ON loan_months(loanId);

-- Added in MIGRATION_V2
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Migrations are gated by `PRAGMA user_version`. The `migrate()` function runs on every DB open inside `SQLiteProvider`.

### TypeScript Types (`types/loan.ts`)

```ts
interface Loan {
  id: string;
  name: string;
  originalAmount: number;   // in display units (₱)
  remainingBalance: number;
  monthlyPayment: number;
  totalMonths: number;
  paidMonths: number;
  progress: number;         // 0.0–1.0
  status: 'active' | 'completed';
  startDate: string;        // YYYY-MM-DD
  notes?: string;
  createdAt: string;        // ISO 8601
  completedAt?: string;
}

interface LoanMonth {
  id: string;
  loanId: string;
  monthNumber: number;
  amount: number;
  isPaid: boolean;          // converted from 0/1 at service boundary
  paidDate?: string;
}

interface CreateLoanInput {
  name: string;
  totalAmount: number;
  termMonths: number;       // 1–60
  startDate: string;
  notes?: string;
}

interface DashboardStats {
  totalBorrowed: number;
  remainingBalance: number;
  monthlyDue: number;
  totalPaid: number;
  activeLoans: number;
  completedLoans: number;
  overallProgress: number;  // 0.0–1.0
}

// Used for backup files
interface ExportBundle {
  schema: 'loan-logs';
  version: 1;
  exportedAt: string;
  loans: Loan[];
  loanMonths: LoanMonth[];
}
```

---

## 6. Loan Calculation Logic (`services/database.ts`)

### No Interest
Loan Killer tracks **principal only** — there is no interest rate field. Monthly payments are even splits of the total.

### Integer-Cents Arithmetic
All internal math uses integer cents to avoid floating-point drift:

```
amountCents    = round(totalAmount × 100)
monthlyCents   = floor(amountCents / termMonths)
lastMonthCents = amountCents − monthlyCents × (termMonths − 1)
```

The last month absorbs the remainder, ensuring the schedule sums exactly to the original amount. Amounts are converted back to display units (divide by 100) at the service boundary.

### `createLoan(input)`
1. Compute the payment schedule using integer-cents arithmetic.
2. Generate UUIDs via `expo-crypto`.
3. Insert the `loans` row and all `loan_months` rows inside a **`withTransactionAsync`** block.

### `updateLoanCalculations(db, loanId)`
Called after every `markMonthAsPaid` or `updateMonthAmount`. Re-derives:
- `paidMonths` — count of `isPaid = 1` rows.
- `paidSum` — sum of `amount` for paid months.
- `remainingBalance` = `originalAmount − paidSum`, clamped to ≥ 0.
- `progress` = `paidMonths / totalMonths`.
- `status`:
  - If `paidMonths ≥ totalMonths` → `'completed'`; sets `completedAt` to current ISO timestamp.
  - Otherwise → `'active'`; clears `completedAt`.

### `markMonthAsPaid(db, monthId, isPaid)`
- No-op when `loan.status === 'completed'` (completed loans are locked).
- Updates `isPaid` and `paidDate` on the `loan_months` row.
- Calls `updateLoanCalculations`.

### `updateMonthAmount(db, monthId, newAmount)`
- Blocked on completed loans.
- Updates the `amount` for the specified month.
- Re-derives `loan.originalAmount` as `SUM(amount)` from all months for that loan.
- Calls `updateLoanCalculations`.

### `importFromJSON(db, bundle, mode)`
- `'merge'`: inserts only loans/months whose IDs don't already exist.
- `'replace'`: deletes all existing loans (cascades months), then inserts all from bundle.
- Both modes run inside **`withTransactionAsync`**.

---

## 7. State & Reactivity

```
SQLiteProvider (expo-sqlite)
  └─ useSQLiteContext()        → raw db handle

useLiveQuery(queryFn, deps)    → { data, loading, error, refetch }
  - Subscribes to services/notify.ts pub/sub
  - Refetches on useScreenFocus (useFocusEffect)
  - Re-runs queryFn on notifyDbChange signal

Mutations:
  component calls service function (createLoan, markMonthAsPaid, …)
  → service mutates SQLite
  → component calls notifyDbChange()
  → all active useLiveQuery hooks refetch
```

No Redux, Zustand, or React Context for data — state flows through SQLite + the notify bus.

---

## 8. Security — App Lock

### `services/app-lock.ts`
Wraps `expo-local-authentication`:
- `isAuthAvailable()` — checks if biometric or device PIN is enrolled.
- `authenticate(prompt)` — triggers Face ID / fingerprint with PIN fallback (`disableDeviceFallback: false`).

### `components/lock-gate.tsx`
Wraps the entire app tree (mounted in `app/_layout.tsx`):
- On launch: if `appLockEnabled = '1'` in DB, shows the lock screen and auto-triggers auth.
- **Locks on background**: listens to `AppState`; transitions to `background` re-arm the lock.
- **Ignores `inactive`**: prevents a biometric-prompt loop when the auth dialog itself causes the app to briefly go inactive.
- **Re-prompts on `active`**: if locked when the app comes back to foreground, triggers auth immediately.
- On failure or cancel: shows a lock screen with a manual "Unlock" button.

---

## 9. Design System (`constants/theme.ts`)

### Color Palette

| Token | Light | Dark |
|---|---|---|
| Primary | `#059669` (emerald-600) | `#10b981` (emerald-400) |
| Background | `#f9fafb` | `#0f172a` |
| Surface | `#ffffff` | `#1e293b` |
| Surface2 | `#f3f4f6` | `#334155` |
| Text Primary | `#111827` | `#f9fafb` |
| Text Secondary | `#6b7280` | `#94a3b8` |
| Danger | `#ef4444` | `#f87171` |
| Success | `#10b981` | `#34d399` |
| Pending | `#f59e0b` | `#fbbf24` |

### Typography Scale

| Name | Usage |
|---|---|
| `screenTitle` | Screen/section headings |
| `heroNumber` | Large KPI values |
| `sectionLabel` | Group labels |
| `cardTitle` | Card headings |
| `body` | Default body text |
| `bodyStrong` | Bold body text |
| `caption` | Small supplementary text |
| `button` | Button labels |

- **Font**: `ui-rounded` on iOS (system rounded font), fallbacks on Android.

### Spacing Scale (4pt base)

| Token | Value |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `xxl` | 24 |
| `xxxl` | 32 |

### Radius Scale

| Token | Value |
|---|---|
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `pill` | 999 |

### Shadows
`cardShadow()` returns iOS shadow props + Android `elevation`. Shadows are **suppressed in dark mode** to avoid the glow-on-dark artifact.

### Currency Formatting
`formatPeso(amount)` manually formats amounts as `₱X,XXX.XX`. Do **not** replace with `Intl.NumberFormat` — the Hermes JS engine on Android renders the ₱ glyph incorrectly.

---

## 10. Build & Release

### EAS Configuration (`eas.json`)

```json
{
  "cli": { "appVersionSource": "local" },
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  }
}
```

- Single profile: `production`.
- Android only; APK output (sideloaded, not Play Store AAB).
- `credentialsSource: local` — the signing keystore (`release.keystore`) is committed in the repo root and injected at build time via CI secrets.

### GitHub Actions Release Pipeline (`.github/workflows/release.yml`)

Triggers: push to `main` or manual dispatch (`workflow_dispatch`).

| Step | Detail |
|---|---|
| Checkout | Full history (`fetch-depth: 0`) for conventional-commit analysis |
| Setup | Node 22, Java 17 |
| Install | `npm ci` |
| Version bump | `node scripts/bump-version.mjs` — reads conventional commits since the last `v*` tag |
| Prebuild | `expo prebuild --platform android --clean` with `VERSION_CODE=${{ github.run_number }}` |
| Sign | Decodes base64 keystore secret, injects into Gradle release signing config |
| Build | `./gradlew assembleRelease` |
| Commit bump | Pushes updated `app.json` back to `main` with `[skip ci]` |
| Release | Creates a GitHub Release tagged `v<semver>` with the APK attached |

### Versioning Scheme (`scripts/bump-version.mjs`)

Conventional commit analysis since the last `v*` tag:

| Commit pattern | Version bump |
|---|---|
| `BREAKING CHANGE` in footer **or** `type!:` in subject | Major |
| `feat:` | Minor |
| Anything else (`fix:`, `chore:`, etc.) | Patch |

- Writes the new semver into `app.json` (`version` field).
- Android `versionCode` = `github.run_number` (strictly increasing, set as an env var via `app.config.js`).
