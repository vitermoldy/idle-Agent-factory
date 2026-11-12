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

  it('earns nothing until an order is taken or an agent is hired', () => {
    const { state } = E.advance(E.newGame(0), 60)
    expect(state.cash).toBe(0)
  })
})

describe('the line', () => {
  it('runs as fast as its slowest station', () => {
