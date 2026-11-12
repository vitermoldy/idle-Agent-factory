// Number and time formatting for the game. Short scale (K, M, B, T) because idle numbers grow
// past what words can carry; one decimal style everywhere so figures line up.

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function short(n: number): string {
  if (!Number.isFinite(n)) return '∞'
  if (n < 0) return '-' + short(-n)
