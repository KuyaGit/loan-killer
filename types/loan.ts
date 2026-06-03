/**
 * TypeScript models and DTOs for Loan Logs.
 */

export type LoanStatus = 'active' | 'completed';

export interface Loan {
  id: string;
  name: string;
  originalAmount: number;
  remainingBalance: number;
  monthlyPayment: number;
  totalMonths: number;
  paidMonths: number;
  /** Progress expressed as 0..1 */
  progress: number;
  status: LoanStatus;
  startDate: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface LoanMonth {
  id: string;
  loanId: string;
  monthNumber: number;
  amount: number;
  /** Mapped from INTEGER 0/1 at the service boundary */
  isPaid: boolean;
  paidDate: string | null;
}

export interface CreateLoanInput {
  name: string;
  originalAmount: number;
  /** Number of monthly payment terms (1–60). Monthly payment is auto-computed. */
  termMonths: number;
  startDate?: string | null;
  notes?: string | null;
}

export interface DashboardStats {
  totalLoans: number;
  activeLoans: number;
  completedLoans: number;
  /** SUM(originalAmount) */
  totalBorrowed: number;
  /** SUM(remainingBalance) of active loans */
  totalRemaining: number;
  /** SUM(monthlyPayment) of active loans */
  totalMonthlyPayments: number;
  /** totalBorrowed - totalRemaining */
  totalPaid: number;
  /** AVG(progress) over active loans, 0..1 */
  avgProgress: number;
}

export interface LoansQuery {
  search?: string;
  status?: LoanStatus | 'all';
}

export interface ExportBundle {
  schema: 'loan-logs';
  version: 1;
  exportedAt: string;
  loans: Loan[];
  loanMonths: LoanMonth[];
}
