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
    const fs = E.newGame(0).factories.video
    const rates = E.lineRates(video, fs)
    expect(E.throughput(video, fs)).toBe(Math.min(...rates))
    expect(E.bottlenecks(video, fs)).toEqual([1])
  })

  it('doubles a station at each milestone level', () => {
    expect(E.stationRate(video, 0, 10) / E.stationRate(video, 0, 9)).toBeCloseTo((10 / 9) * 2)
  })

  it('works off a manual queue and then stops', () => {
    let g = E.newGame(0)
    g = E.takeOrder(E.takeOrder(g, 'video'), 'video')
    const { state, completed } = E.advance(g, 600)
    expect(completed.video?.orders).toBe(2)
    expect(state.cash).toBeCloseTo(2 * 29)
    expect(state.factories.video.queue).toBe(0)
  })

  it('caps the manual queue', () => {
    let g = E.newGame(0)
    for (let i = 0; i < 20; i++) g = E.takeOrder(g, 'video')
