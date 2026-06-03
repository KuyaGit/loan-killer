/**
 * Formatting utilities for Loan Logs.
 *
 * We use a manual peso formatter instead of Intl.NumberFormat('en-PH', {currency:'PHP'})
 * because Hermes on some Android builds renders "PHP" instead of the "₱" glyph.
 */

/**
 * Format a number as Philippine Peso, e.g. ₱1,234.56
 */
export function formatPeso(amount: number): string {
  const absAmount = Math.abs(amount);
  const [intPart, decPart] = absAmount.toFixed(2).split('.');
  // Add thousands separators to integer part
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = `₱${grouped}.${decPart}`;
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Format an ISO date string (or null) to a human-readable date, e.g. "Jun 3, 2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a percentage (0..1) as "33%"
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
