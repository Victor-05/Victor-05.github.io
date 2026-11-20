import { describe, it, expect } from 'vitest'
import { Simulation, defaultParams, detectBottleneck, cycleTimes, SHIFT_SECONDS } from './engine.js'

const run = (patch = {}, seconds = 3600) => {
  const sim = new Simulation({ ...defaultParams(13), ...patch })
  sim.runUntil(seconds)
  return sim
}

describe('engine', () => {
  it('default cycle matches tested rate (13 kg 7.4/min, 5 kg 8.6/min)', () => {
    expect(cycleTimes(defaultParams(13)).rate).toBeCloseTo(7.4, 5)
    expect(cycleTimes(defaultParams(5)).rate).toBeCloseTo(8.6, 5)
    expect(cycleTimes({ ...defaultParams(13), speedFactor: 1.5 }).aboveTested).toBe(true)
    expect(cycleTimes({ ...defaultParams(13), speedFactor: 100 }).cycle).toBeCloseTo(5, 5) // floor
  })

  it('is deterministic: same params -> same results', () => {
    const a = run({}, SHIFT_SECONDS)
    const b = run({}, SHIFT_SECONDS)
    a.trigger // noop
    expect(a.report()).toEqual(b.report())
    expect(a.s.samples).toEqual(b.s.samples)
    const c = new Simulation(defaultParams(13)); c.runUntil(600); c.trigger('robot', 120); c.runUntil(3600)
    const d = new Simulation(defaultParams(13)); d.runUntil(600); d.trigger('robot', 120); d.runUntil(3600)
    expect(c.report()).toEqual(d.report())
  })

  it('feed-limited: output ~= feed rate, bottleneck = feed', () => {
    const sim = run({ feedRate: 6.5 }, 7200)
    const st = sim.stats()
    expect(st.actualRate).toBeGreaterThan(6.2)
    expect(st.actualRate).toBeLessThanOrEqual(6.5 + 0.05)
    expect(sim.s.lost.blocked).toBe(0)
    expect(detectBottleneck(st).component).toBe('feed')
  })

  it('robot-limited: feed > robot capacity -> queue blocks, output ~= robot rate', () => {
    const sim = run({ feedRate: 10 }, 7200)
    const st = sim.stats()
    expect(sim.s.lost.blocked).toBeGreaterThan(0)
    expect(sim.s.queue.length).toBe(sim.params.queueCapacity)
    expect(st.actualRate).toBeGreaterThan(7.0)
    expect(st.actualRate).toBeLessThanOrEqual(7.4 + 0.01)
    expect(detectBottleneck(st).component).toBe('robot')
    // key insight: more feed does not raise output when the robot limits
    const more = run({ feedRate: 14 }, 7200).stats().actualRate
    expect(Math.abs(more - st.actualRate)).toBeLessThan(0.1)
  })

  it('operator-limited: long replacement -> robot waits for pallet', () => {
    const sim = run({ feedRate: 10, palletChangeTime: 900 }, 4 * 3600)
    const st = sim.stats()
    expect(st.time.robotWaitPallet).toBeGreaterThan(600)
    expect(detectBottleneck(st).component).toBe('operator')
    // faster robot does not help when the operator limits
    const fast = run({ feedRate: 10, palletChangeTime: 900, speedFactor: 1.5 }, 4 * 3600).stats().actualRate
    expect(fast - st.actualRate).toBeLessThan(0.3)
  })

  it('balanced case -> no significant bottleneck', () => {
    const sim = run({ feedRate: 7.35 }, 7200)
    expect(detectBottleneck(sim.stats()).component).toBe('none')
  })

  it('robot fault stops output, logs lost buckets vs baseline, then resumes', () => {
    const sim = run({}, 1200)
    const before = sim.s.palletized
    sim.trigger('robot', 300)
    sim.runUntil(1200 + 299)
    expect(sim.s.palletized - before).toBeLessThanOrEqual(1)
    sim.runUntil(1200 + 301)
    const e = sim.s.log[0]
    expect(e.active).toBe(false)
    expect(e.lost).toBeGreaterThan(25)
    sim.runUntil(3000)
    expect(sim.s.palletized).toBeGreaterThan(before + 100)
    expect(detectBottleneck(sim.stats(600)).component).not.toBe('fault')
  })

  it('conveyor and vision faults starve the robot; full shift report is consistent', () => {
    const sim = new Simulation(defaultParams(13))
    sim.runUntil(1000); sim.trigger('conveyor', 600)
    sim.runUntil(4000); sim.trigger('vision', 600)
    sim.runUntil(6000); sim.trigger('palletDelay', 600); sim.trigger('surge', 300)
    const r = sim.runShift()
    expect(r.duration).toBe(SHIFT_SECONDS)
    expect(r.downtime).toBeCloseTo(1200, 0)
    expect(r.lostArrivals.conveyorFault).toBeGreaterThan(50)
    expect(r.pallets).toBe(Math.floor(r.buckets / 44))
    expect(sim.s.log.every((l) => !l.active && l.lost !== null)).toBe(true)
  })
})

import { compareScenarios } from './scenarios.js'
describe('scenarios', () => {
  it('faster robot alone does not help in the feed-limited default case', () => {
    const [a, b, c] = compareScenarios(defaultParams(13))
    expect(Math.abs(b.buckets - a.buckets)).toBeLessThan(a.buckets * 0.02)
    expect(c.buckets).toBeGreaterThan(a.buckets)
  })
  it('step mode processes one event at a time', () => {
    const sim = new Simulation(defaultParams(13))
    expect(sim.step()).toBe('ARRIVAL')
    expect(sim.now).toBe(0)
    sim.step()
    expect(sim.now).toBeGreaterThan(0)
  })
})
