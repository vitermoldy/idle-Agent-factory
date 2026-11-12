import { describe, expect, it } from 'vitest'
import * as E from '../src/game/engine'
import { FACTORIES, FACTORY_BY_ID } from '../src/game/factories'

const video = FACTORY_BY_ID.video
const rich = (cash: number) => ({ ...E.newGame(0), cash })

describe('a new game', () => {
  it('opens only the first line, with its first product', () => {
    const g = E.newGame(0)
    expect(g.factories.video.unlocked).toBe(true)
    expect(g.factories.video.product).toBe('short')
    expect(FACTORIES.slice(1).every((f) => !g.factories[f.id].unlocked)).toBe(true)
  })

