// Number and time formatting for the game. Short scale (K, M, B, T) because idle numbers grow
// past what words can carry; one decimal style everywhere so figures line up.

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']

export function short(n: number): string {
  if (!Number.isFinite(n)) return '∞'
  if (n < 0) return '-' + short(-n)
  if (n < 10) return trim(n.toFixed(2))
  if (n < 100) return trim(n.toFixed(1))
  if (n < 1000) return Math.floor(n).toString()
  const e = Math.min(UNITS.length - 1, Math.floor(Math.log10(n) / 3))
  const v = n / 10 ** (e * 3)
  if (e === UNITS.length - 1 && v >= 1000) return n.toExponential(2)
  // Three significant digits: 1.23K, 12.3K, 123K.
  return v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) + UNITS[e]
}

const trim = (s: string) => s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')

export const money = (n: number) => '$' + short(n)

/** Orders per second, as the station rows show it. */
export function perSecond(n: number) {
  if (n <= 0) return '0/dtk'
  return short(n) + '/dtk'
}

/** Seconds per order for slow lines, orders per second for fast ones. */
export function pace(ordersPerSec: number) {
  if (ordersPerSec <= 0) return 'berhenti'
  if (ordersPerSec < 1) return `${trim((1 / ordersPerSec).toFixed(1))} dtk per order`
  return `${short(ordersPerSec)} order/dtk`
