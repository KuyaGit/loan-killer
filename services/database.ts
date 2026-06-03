/**
 * SQLite service layer for Loan Logs.
 *
 * All functions accept a SQLiteDatabase instance (from useSQLiteContext()).
 * Integer ↔ boolean mapping for `isPaid` happens exclusively in this file.
 * IDs are generated via expo-crypto randomUUID to guarantee Hermes compatibility.
 */

import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_TERM_MONTHS, MIGRATION_V1, MIGRATION_V2, SETTING_APP_LOCK } from '@/constants/database';
import type {
  CreateLoanInput,
  DashboardStats,
  ExportBundle,
  Loan,
  LoanMonth,
  LoanStatus,
  LoansQuery,
} from '@/types/loan';
import { notifyDbChange } from './notify';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return Crypto.randomUUID();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Row shape returned by SQLite (isPaid is 0/1 integer, not boolean)
interface LoanRow extends Omit<Loan, 'isPaid'> {
  isPaid?: number;
}

interface LoanMonthRow extends Omit<LoanMonth, 'isPaid'> {
  isPaid: number;
}

function rowToLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    name: row.name,
    originalAmount: row.originalAmount,
    remainingBalance: row.remainingBalance,
    monthlyPayment: row.monthlyPayment,
    totalMonths: row.totalMonths,
    paidMonths: row.paidMonths,
    progress: row.progress,
    status: row.status as LoanStatus,
    startDate: row.startDate ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? null,
  };
}

function rowToLoanMonth(row: LoanMonthRow): LoanMonth {
  return {
    id: row.id,
    loanId: row.loanId,
    monthNumber: row.monthNumber,
    amount: row.amount,
    isPaid: row.isPaid === 1,
    paidDate: row.paidDate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

/**
 * Run on every database open via SQLiteProvider onInit.
 * Pragmas are set every open (foreign_keys is per-connection).
 * Schema is created once, gated by user_version.
 */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  // Must run on every open — foreign_keys does not persist across connections
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(MIGRATION_V1);
  }
  if (currentVersion < 2) {
    await db.execAsync(MIGRATION_V2);
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Get whether the app lock (biometric / PIN) is enabled. Defaults to false. */
export async function getAppLockEnabled(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [SETTING_APP_LOCK]
  );
  return row?.value === '1';
}

/** Enable or disable the app lock preference. */
export async function setAppLockEnabled(db: SQLiteDatabase, enabled: boolean): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SETTING_APP_LOCK, enabled ? '1' : '0']
  );
  notifyDbChange();
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a new loan and auto-generate its monthly schedule.
 *
 * The user supplies `termMonths` (1–60); the monthly payment is derived as:
 *   monthlyCents = floor(amountCents / termMonths)
 *   last month   = amountCents - monthlyCents * (termMonths - 1)
 *
 * Integer-cents arithmetic guarantees the schedule sums exactly to originalAmount.
 * Returns the new loan id.
 */
export async function createLoan(
  db: SQLiteDatabase,
  input: CreateLoanInput
): Promise<string> {
  const { name, originalAmount, termMonths, startDate = null, notes = null } = input;

  // --- Validate ---
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > MAX_TERM_MONTHS) {
    throw new Error(`Terms must be a whole number between 1 and ${MAX_TERM_MONTHS}.`);
  }
  const amountCents = Math.round(originalAmount * 100);
  if (amountCents < termMonths) {
    throw new Error('Loan amount is too small for the number of terms (monthly payment would be less than ₱0.01).');
  }

  // --- Compute schedule ---
  // Use floor so the last payment absorbs the remainder (always ≥ monthly)
  const monthlyCents = Math.floor(amountCents / termMonths);
  const monthlyPayment = round2(monthlyCents / 100);

  const loanId = newId();
  const createdAt = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    // Insert loan row
    await db.runAsync(
      `INSERT INTO loans (id, name, originalAmount, remainingBalance, monthlyPayment,
        totalMonths, paidMonths, progress, status, startDate, notes, createdAt, completedAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?, ?, NULL)`,
      [loanId, name, originalAmount, originalAmount, monthlyPayment, termMonths, startDate, notes, createdAt]
    );

    // Generate monthly schedule (integer-cents arithmetic for exact last payment)
    for (let i = 1; i <= termMonths; i++) {
      const isLast = i === termMonths;
      const monthCents = isLast
        ? amountCents - monthlyCents * (termMonths - 1)
        : monthlyCents;
      const monthAmount = round2(monthCents / 100);

      await db.runAsync(
        `INSERT INTO loan_months (id, loanId, monthNumber, amount, isPaid, paidDate)
         VALUES (?, ?, ?, ?, 0, NULL)`,
        [newId(), loanId, i, monthAmount]
      );
    }
  });

  notifyDbChange();
  return loanId;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Get all loans, optionally filtered by search term and status. */
export async function getLoans(db: SQLiteDatabase, query?: LoansQuery): Promise<Loan[]> {
  const search = query?.search ?? '';
  const status = query?.status ?? 'all';

  const rows = await db.getAllAsync<LoanRow>(
    `SELECT * FROM loans
     WHERE (? = '' OR name LIKE '%' || ? || '%')
       AND (? = 'all' OR status = ?)
     ORDER BY (status = 'completed'), createdAt DESC`,
    [search, search, status, status]
  );

  return rows.map(rowToLoan);
}

/** Get a single loan by id, or null if not found. */
export async function getLoanById(db: SQLiteDatabase, id: string): Promise<Loan | null> {
  const row = await db.getFirstAsync<LoanRow>('SELECT * FROM loans WHERE id = ?', [id]);
  return row ? rowToLoan(row) : null;
}

/** Get all monthly schedule items for a loan, ordered by monthNumber. */
export async function getLoanMonths(db: SQLiteDatabase, loanId: string): Promise<LoanMonth[]> {
  const rows = await db.getAllAsync<LoanMonthRow>(
    'SELECT * FROM loan_months WHERE loanId = ? ORDER BY monthNumber ASC',
    [loanId]
  );
  return rows.map(rowToLoanMonth);
}

/** Get aggregated dashboard statistics from SQLite. */
export async function getDashboardStats(db: SQLiteDatabase): Promise<DashboardStats> {
  const row = await db.getFirstAsync<{
    totalLoans: number;
    activeLoans: number;
    completedLoans: number;
    totalBorrowed: number;
    totalRemaining: number;
    totalMonthlyPayments: number;
    avgProgress: number;
  }>(
    `SELECT
      COUNT(*) AS totalLoans,
      COALESCE(SUM(status = 'active'), 0) AS activeLoans,
      COALESCE(SUM(status = 'completed'), 0) AS completedLoans,
      COALESCE(SUM(originalAmount), 0) AS totalBorrowed,
      COALESCE(SUM(CASE WHEN status = 'active' THEN remainingBalance ELSE 0 END), 0) AS totalRemaining,
      COALESCE(SUM(CASE WHEN status = 'active' THEN monthlyPayment ELSE 0 END), 0) AS totalMonthlyPayments,
      COALESCE(AVG(CASE WHEN status = 'active' THEN progress END), 0) AS avgProgress
     FROM loans`
  );

  const totalBorrowed = row?.totalBorrowed ?? 0;
  const totalRemaining = row?.totalRemaining ?? 0;

  return {
    totalLoans: row?.totalLoans ?? 0,
    activeLoans: row?.activeLoans ?? 0,
    completedLoans: row?.completedLoans ?? 0,
    totalBorrowed,
    totalRemaining,
    totalMonthlyPayments: row?.totalMonthlyPayments ?? 0,
    totalPaid: round2(totalBorrowed - totalRemaining),
    avgProgress: row?.avgProgress ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Toggle a monthly payment as paid or unpaid.
 *
 * - Supports toggle (un-mark) on active loans.
 * - Blocked entirely when the loan is already completed (locked per spec).
 * - Calls updateLoanCalculations + notifyDbChange after the update.
 */
export async function markMonthAsPaid(
  db: SQLiteDatabase,
  monthId: string,
  paid: boolean
): Promise<void> {
  // Fetch parent loan to enforce completion lock
  const monthRow = await db.getFirstAsync<{ loanId: string }>(
    'SELECT loanId FROM loan_months WHERE id = ?',
    [monthId]
  );
  if (!monthRow) return;

  const loan = await getLoanById(db, monthRow.loanId);
  if (!loan) return;

  // Lock: no toggles allowed on completed loans
  if (loan.status === 'completed') return;

  const paidDate = paid ? new Date().toISOString() : null;

  await db.runAsync(
    'UPDATE loan_months SET isPaid = ?, paidDate = ? WHERE id = ?',
    [paid ? 1 : 0, paidDate, monthId]
  );

  await updateLoanCalculations(db, monthRow.loanId);
  notifyDbChange();
}

/**
 * Recompute paidMonths, remainingBalance, progress, and status for a loan
 * using pure SQL aggregates over loan_months. Clamps remainingBalance ≥ 0.
 */
export async function updateLoanCalculations(
  db: SQLiteDatabase,
  loanId: string
): Promise<void> {
  const loan = await getLoanById(db, loanId);
  if (!loan) return;

  const calcRow = await db.getFirstAsync<{
    paidMonths: number;
    paidSum: number;
    totalMonths: number;
  }>(
    `SELECT
      SUM(isPaid) AS paidMonths,
      SUM(isPaid * amount) AS paidSum,
      COUNT(*) AS totalMonths
     FROM loan_months WHERE loanId = ?`,
    [loanId]
  );

  const paidMonths = calcRow?.paidMonths ?? 0;
  const paidSum = calcRow?.paidSum ?? 0;
  const totalMonths = calcRow?.totalMonths ?? loan.totalMonths;

  const remainingBalance = Math.max(0, round2(loan.originalAmount - paidSum));
  const progress = totalMonths > 0 ? paidMonths / totalMonths : 0;
  const newStatus: LoanStatus = paidMonths >= totalMonths ? 'completed' : 'active';

  // Determine completedAt: set when newly completing, clear when reverting
  let completedAt: string | null = loan.completedAt;
  if (newStatus === 'completed' && loan.status !== 'completed') {
    completedAt = new Date().toISOString();
  } else if (newStatus === 'active' && loan.status === 'completed') {
    completedAt = null;
  }

  await db.runAsync(
    `UPDATE loans SET
      paidMonths = ?,
      remainingBalance = ?,
      progress = ?,
      status = ?,
      completedAt = ?
     WHERE id = ?`,
    [paidMonths, remainingBalance, progress, newStatus, completedAt, loanId]
  );
}

/**
 * Update the amount of a single monthly schedule row.
 *
 * After updating the row, the loan's originalAmount is re-derived as
 * SUM(loan_months.amount) so the total always reflects the actual schedule.
 * Then `updateLoanCalculations` recomputes remainingBalance/progress/status.
 *
 * Blocked when the parent loan is completed (mirrors markMonthAsPaid lock).
 */
export async function updateMonthAmount(
  db: SQLiteDatabase,
  monthId: string,
  amount: number
): Promise<void> {
  if (!isFinite(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number.');
  }

  const monthRow = await db.getFirstAsync<{ loanId: string }>(
    'SELECT loanId FROM loan_months WHERE id = ?',
    [monthId]
  );
  if (!monthRow) return;

  const loan = await getLoanById(db, monthRow.loanId);
  if (!loan) return;

  // Completed loans are locked
  if (loan.status === 'completed') return;

  const safeAmount = round2(amount);

  await db.withTransactionAsync(async () => {
    // 1. Update the month row
    await db.runAsync('UPDATE loan_months SET amount = ? WHERE id = ?', [safeAmount, monthId]);

    // 2. Recompute originalAmount as the exact sum of all schedule rows
    await db.runAsync(
      `UPDATE loans
       SET originalAmount = (
         SELECT COALESCE(SUM(amount), 0) FROM loan_months WHERE loanId = ?
       )
       WHERE id = ?`,
      [monthRow.loanId, monthRow.loanId]
    );
  });

  // 3. Recompute remaining balance / progress / status using the new originalAmount
  //    (getLoanById inside updateLoanCalculations will now read the updated originalAmount)
  await updateLoanCalculations(db, monthRow.loanId);
  notifyDbChange();
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Delete a loan (and its months via ON DELETE CASCADE). */
export async function deleteLoan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM loans WHERE id = ?', [id]);
  notifyDbChange();
}

// ---------------------------------------------------------------------------
// Export / Import
// ---------------------------------------------------------------------------

/** Export all loans and months to a JSON-serializable bundle. */
export async function exportToJSON(db: SQLiteDatabase): Promise<ExportBundle> {
  const loans = await getLoans(db);
  const loanMonthRows = await db.getAllAsync<LoanMonthRow>(
    'SELECT * FROM loan_months ORDER BY loanId, monthNumber ASC'
  );
  const loanMonths = loanMonthRows.map(rowToLoanMonth);

  return {
    schema: 'loan-logs',
    version: 1,
    exportedAt: new Date().toISOString(),
    loans,
    loanMonths,
  };
}

/** Validate and import a JSON bundle. Mode 'replace' wipes existing data first. */
export async function importFromJSON(
  db: SQLiteDatabase,
  bundle: ExportBundle,
  mode: 'replace' | 'merge'
): Promise<void> {
  // Validate bundle
  if (bundle?.schema !== 'loan-logs') {
    throw new Error('Invalid backup file: missing or wrong schema field.');
  }
  if (bundle.version !== 1) {
    throw new Error(`Unsupported backup version: ${bundle.version}`);
  }
  if (!Array.isArray(bundle.loans)) {
    throw new Error('Invalid backup file: loans array is missing.');
  }
  if (!Array.isArray(bundle.loanMonths)) {
    throw new Error('Invalid backup file: loanMonths array is missing.');
  }

  // Verify FK integrity: every month must reference an existing loan in the bundle
  const loanIdSet = new Set(bundle.loans.map((l) => l.id));
  for (const month of bundle.loanMonths) {
    if (!loanIdSet.has(month.loanId)) {
      throw new Error(`Invalid backup: month ${month.id} references unknown loanId ${month.loanId}`);
    }
  }

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') {
      await db.execAsync('DELETE FROM loans;');
    }

    for (const loan of bundle.loans) {
      if (mode === 'merge') {
        // Skip if already exists
        await db.runAsync(
          `INSERT OR IGNORE INTO loans (id, name, originalAmount, remainingBalance,
            monthlyPayment, totalMonths, paidMonths, progress, status,
            startDate, notes, createdAt, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loan.id, loan.name, loan.originalAmount, loan.remainingBalance,
            loan.monthlyPayment, loan.totalMonths, loan.paidMonths, loan.progress,
            loan.status, loan.startDate, loan.notes, loan.createdAt, loan.completedAt,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO loans (id, name, originalAmount, remainingBalance,
            monthlyPayment, totalMonths, paidMonths, progress, status,
            startDate, notes, createdAt, completedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            loan.id, loan.name, loan.originalAmount, loan.remainingBalance,
            loan.monthlyPayment, loan.totalMonths, loan.paidMonths, loan.progress,
            loan.status, loan.startDate, loan.notes, loan.createdAt, loan.completedAt,
          ]
        );
      }
    }

    for (const month of bundle.loanMonths) {
      const insertFn = mode === 'merge' ? 'INSERT OR IGNORE' : 'INSERT';
      await db.runAsync(
        `${insertFn} INTO loan_months (id, loanId, monthNumber, amount, isPaid, paidDate)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [month.id, month.loanId, month.monthNumber, month.amount, month.isPaid ? 1 : 0, month.paidDate]
      );
    }
  });

  notifyDbChange();
}
