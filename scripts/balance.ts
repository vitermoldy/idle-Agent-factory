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
      continue
    }
    const hire = FACTORIES.find((f) => s.factories[f.id].unlocked && !s.factories[f.id].agent && s.cash >= f.agentCost)
    if (hire) {
      s = E.hireAgent(s, hire.id)
      marks.push(`${clock(t)}  agent ${hire.name}`)
      continue
    }
    let best: Option | null = null
    const consider = (o: Option) => {
      if (!best || o.payback < best.payback) best = o
    }
    for (const def of FACTORIES) {
      const fs = s.factories[def.id]
      if (!fs.unlocked) continue
      const id: FactoryId = def.id
      const before = E.lineIncome(def, fs, s.stars)
      for (let i = 0; i < 5; i++) {
        const levels = fs.levels.slice()
        levels[i]++
        const gain = E.lineIncome(def, fs, s.stars, levels) - before
        const cost = E.upgradeCost(def, i, fs.levels[i])
        if (gain > 0) consider({ payback: cost / gain, cost, apply: () => (s = E.buyLevels(s, id, i, 1)) })
      }
      // Tied bottlenecks: no single upgrade helps, so price the whole tie together.
      for (const p of E.ownedProducts(def, fs)) {
        const tied = E.bottlenecks(def, fs, p)
        if (tied.length < 2) continue
        const levels = fs.levels.slice()
        for (const i of tied) levels[i]++
        const gain = E.lineIncome(def, fs, s.stars, levels) - before
        const total = tied.reduce((sum, i) => sum + E.upgradeCost(def, i, fs.levels[i]), 0)
        const cheapest = tied.reduce((a, b) =>
          E.upgradeCost(def, a, fs.levels[a]) <= E.upgradeCost(def, b, fs.levels[b]) ? a : b
        )
