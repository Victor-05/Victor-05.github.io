import { Simulation, cycleTimes } from './engine.js'
import { COMPONENT_RO } from './insights.js'

/** A = current, B = faster robot only (hypothetical), C = balanced/optimised. Full 8 h shift, no events. */
export function compareScenarios(params) {
  const robotRate = cycleTimes(params).rate
  const defs = [
    { id: 'A', name: 'A · Actual', patch: {} },
    { id: 'B', name: 'B · Robot +25% (ipotetic)', patch: { speedFactor: params.speedFactor * 1.25 } },
    { id: 'C', name: 'C · Optimizat', patch: { feedRate: Math.max(params.feedRate, +(robotRate * 0.98).toFixed(2)), palletChangeTime: Math.min(params.palletChangeTime, 60), operatorAvailability: 100, queueCapacity: Math.max(params.queueCapacity, 8) } },
  ]
  return defs.map((d) => {
    const sim = new Simulation({ ...params, ...d.patch })
    const r = sim.runShift()
    return { ...d, params: sim.params, buckets: r.buckets, pallets: r.pallets, avgRate: r.avgRate, targetPct: r.targetPct, robotUtil: r.stats.robotUtil, bottleneck: r.bottleneck.component, bottleneckLabel: COMPONENT_RO[r.bottleneck.component] }
  })
}
