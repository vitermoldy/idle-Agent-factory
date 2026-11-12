// Plays the game with a greedy bot and prints when each line and product opens.
// Run: npm run balance  [-- --stars 40]
import { FACTORIES, type FactoryId } from '../src/game/factories.ts'
import * as E from '../src/game/engine.ts'

const starsArg = process.argv.indexOf('--stars')
let s = E.newGame(0)
if (starsArg > 0) s = { ...s, stars: Number(process.argv[starsArg + 1]) }

const fmt = (n: number) => {
  if (n < 1e3) return n.toFixed(1)
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx']
  const e = Math.min(u.length, Math.floor(Math.log10(n) / 3))
  return (n / 10 ** (e * 3)).toFixed(2) + u[e - 1]
}
const clock = (t: number) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, '0')}s`

type Option = { payback: number; cost: number; apply: () => void }

const dt = 0.5
let t = 0
const marks: string[] = []
const report = new Set([60, 300, 600, 1200, 1800, 2700, 3600, 5400, 7200, 10800, 14400])
while (t <= 4 * 3600) {
  for (const def of FACTORIES) {
    const fs = s.factories[def.id]
    if (fs.unlocked && !fs.agent) while (s.factories[def.id].queue < E.QUEUE_MAX) s = E.takeOrder(s, def.id)
  }
  for (let guard = 0; guard < 5000; guard++) {
    const next = FACTORIES.find((f) => !s.factories[f.id].unlocked)
    if (next && s.cash >= next.unlockCost) {
      s = E.unlockFactory(s, next.id)
      marks.push(`${clock(t)}  open ${next.name}`)
