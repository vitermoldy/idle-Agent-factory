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
