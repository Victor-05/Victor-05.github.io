import { cycleTimes, Simulation, defaultParams, TESTED } from './engine.js'
import { COMPONENT_RO } from './insights.js'

/** Read-only summary of the simulated configuration + results (pure). */
export function buildSimConfig(sim, report = sim.report()) {
  const p = sim.params
  const ct = cycleTimes(p)
  return {
    weightKg: p.weightKg,
    perPallet: p.perPallet,
    feedRate: +p.feedRate.toFixed(2),
    speedFactor: +p.speedFactor.toFixed(2),
    robotRate: +ct.rate.toFixed(2),
    hypothetical: ct.aboveTested,
    palletChangeTime: p.palletChangeTime,
    queueCapacity: p.queueCapacity,
    operatorAvailability: p.operatorAvailability,
    simulatedHours: +(report.duration / 3600).toFixed(2),
    buckets: report.buckets,
    pallets: report.pallets,
    avgRate: +report.avgRate.toFixed(2),
    targetPct: Math.round(report.targetPct),
    downtimeMin: Math.round(report.downtime / 60),
    bottleneck: report.bottleneck.component,
    bottleneckLabel: COMPONENT_RO[report.bottleneck.component],
  }
}

export function simConfigRows(c) {
  const n = (v, d = 0) => Number(v).toLocaleString('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d })
  return [
    ['Găleată', `${c.weightKg} kg · ${c.perPallet} găleți/palet`],
    ['Alimentare linie', `${n(c.feedRate, 1)} găleți/min`],
    ['Factor viteză robot', `${n(c.speedFactor, 2)}× (${n(c.robotRate, 1)} găleți/min)${c.hypothetical ? ' – ipotetic, peste rezultatul testat' : ''}`],
    ['Schimbare palet', `${c.palletChangeTime} s [ipoteză]`],
    ['Durată simulată', `${n(c.simulatedHours, 1)} h`],
    ['Găleți / paleți', `${n(c.buckets)} găleți · ${n(c.pallets)} paleți`],
    ['Ritm mediu', `${n(c.avgRate, 2)} găleți/min · ${c.targetPct}% din ținta de 6/min`],
    ['Blocaj principal', c.bottleneckLabel],
  ]
}

/** Evaluator inputs -> one simulated 8 h shift for the print report. */
export function evaluatorPrintData(values) {
  const base = defaultParams(TESTED[values.weightKg] ? values.weightKg : 13)
  const sim = new Simulation({ ...base, weightKg: values.weightKg, perPallet: values.bucketsPerPallet, feedRate: values.lineRate })
  const report = sim.runShift()
  return { report, config: buildSimConfig(sim, report), params: { ...sim.params }, scenarios: null }
}
