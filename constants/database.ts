/**
 * Database configuration and migration SQL for Loan Logs.
 */

export const DB_NAME = 'loanlogs.db';

/** Target schema version. Increment for each migration. */
export const DB_VERSION = 2;

/** Key for the app-lock enabled preference in the settings table. */
export const SETTING_APP_LOCK = 'appLockEnabled';

/** Maximum number of monthly terms allowed (5 years). */
export const MAX_TERM_MONTHS = 60;

/**
 * DDL for migration v0 → v1.
 * Includes PRAGMA user_version bump at end.
 * Note: WAL + foreign_keys pragmas are applied on every open (outside the version gate).
 */
export const MIGRATION_V1 = `
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  originalAmount REAL NOT NULL,
  remainingBalance REAL NOT NULL,
  monthlyPayment REAL NOT NULL,
  totalMonths INTEGER NOT NULL,
  paidMonths INTEGER NOT NULL DEFAULT 0,
  progress REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  startDate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  completedAt TEXT
);

CREATE TABLE IF NOT EXISTS loan_months (
  id TEXT PRIMARY KEY NOT NULL,
  loanId TEXT NOT NULL,
  monthNumber INTEGER NOT NULL,
  amount REAL NOT NULL,
  isPaid INTEGER NOT NULL DEFAULT 0,
  paidDate TEXT,
  FOREIGN KEY (loanId) REFERENCES loans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loan_months_loanId ON loan_months(loanId);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

PRAGMA user_version = 1;
`;

/**
 * DDL for migration v1 → v2.
 * Adds a generic key-value settings table for app preferences.
 */
export const MIGRATION_V2 = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

PRAGMA user_version = 2;
`;
