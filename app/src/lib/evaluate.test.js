import { describe, it, expect } from 'vitest'
import { validateInputs, evaluate, VERDICT, DEMO_INPUT, defaultBucketsPerPallet } from './evaluate.js'

const run = (overrides = {}) => {
  const { errors, values } = validateInputs({ ...DEMO_INPUT, ...overrides })
  expect(errors).toEqual({})
  return evaluate(values)
}

describe('evaluate', () => {
  it('normal case 13 kg: line feed limits throughput, compatible', () => {
    const r = run()
    expect(r.verdict).toBe(VERDICT.COMPATIBLE)
    expect(r.rate.reference).toBe(7.4)
    expect(r.rate.robotIsBottleneck).toBe(false)
    expect(r.rate.effective).toBe(6.5)
    // 6.5 * 60 * 8 * 2 = 6240 buckets; /44 = 141.8 pallets; *13 = 81120 kg
    expect(r.daily.buckets).toBe(6240)
    expect(r.daily.pallets).toBe(141.8)
    expect(r.daily.kg).toBe(81120)
  })

  it('5 kg case: auto 100 buckets/pallet, robot bottleneck when line faster', () => {
    const r = run({ weightKg: '5', lineRate: '10', shifts: '3' })
    expect(defaultBucketsPerPallet(5)).toBe(100)
    expect(r.rate.reference).toBe(8.6)
    expect(r.rate.robotIsBottleneck).toBe(true)
    expect(r.rate.effective).toBe(8.6)
    expect(r.daily.buckets).toBe(Math.round(8.6 * 60 * 24))
    expect(r.verdict).toBe(VERDICT.REVIEW)
  })

  it('out-of-range weight (>15 kg) => outside reference case, target rate 6', () => {
    const r = run({ weightKg: '20', bucketsPerPallet: '30' })
    expect(r.verdict).toBe(VERDICT.OUT)
    expect(r.rate.reference).toBe(6)
    expect(r.rate.rateIsTested).toBe(false)
  })

  it('intermediate weight / no handle / other material => needs technical review', () => {
    const r = run({ weightKg: '10', bucketsPerPallet: '60', hasHandle: 'nu', material: 'altul' })
    expect(r.verdict).toBe(VERDICT.REVIEW)
    expect(r.checks.filter((c) => c.status === 'validate').length).toBeGreaterThanOrEqual(3)
  })
})

describe('validateInputs', () => {
  it('rejects missing and invalid data with Romanian messages', () => {
    const { errors, values } = validateInputs({ companyName: '', weightKg: 'abc', hasHandle: '', material: 'x', lineRate: '-1', shifts: '4', hoursPerShift: '20' })
    expect(values).toBeNull()
    expect(Object.keys(errors).sort()).toEqual(['companyName', 'hasHandle', 'hoursPerShift', 'lineRate', 'material', 'shifts', 'weightKg'].sort())
    expect(errors.weightKg).toMatch(/greutatea/i)
  })

  it('requires buckets per pallet for non-reference weights', () => {
    const { errors } = validateInputs({ ...DEMO_INPUT, weightKg: '10', bucketsPerPallet: '' })
    expect(errors.bucketsPerPallet).toBeDefined()
  })

  it('rejects shifts x hours > 24 and accepts comma decimals', () => {
    expect(validateInputs({ ...DEMO_INPUT, shifts: '3', hoursPerShift: '9' }).errors.hoursPerShift).toBeDefined()
    expect(validateInputs({ ...DEMO_INPUT, lineRate: '6,5' }).values.lineRate).toBe(6.5)
  })
})

import { validateLead, makeReferenceId } from './lead.js'
describe('validateLead', () => {
  const today = new Date(2026, 10, 20)
  it('accepts a valid lead', () => {
    expect(validateLead({ name: 'Ana Test', email: 'ana@exemplu.ro', phone: '', date: '2026-11-25', consent: true }, today)).toEqual({})
  })
  it('rejects bad email, past date, missing consent', () => {
    const e = validateLead({ name: 'A', email: 'x@', phone: 'abc', date: '2026-11-01', consent: false }, today)
    expect(Object.keys(e).sort()).toEqual(['consent', 'date', 'email', 'name', 'phone'])
  })
  it('builds TC-XXXX ids', () => {
    expect(makeReferenceId(() => 0.0421)).toBe('TC-0421')
  })
})
