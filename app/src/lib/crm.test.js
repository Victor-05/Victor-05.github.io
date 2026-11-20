// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { scoreLead, setStatus, readStatuses, loadLeads, resetDemo, funnel, SEED_LEADS, STATUSES } from './crm.js'

describe('CRM scoring', () => {
  it('scores by transparent rules (sum of satisfied rule points)', () => {
    const full = scoreLead({ phone: '0700', input: { weightKg: 13, hasHandle: 'da', material: 'plastic', lineRate: 6.5, shifts: 2 }, simConfig: { weightKg: 13 } })
    expect(full.score).toBe(100)
    expect(scoreLead({}).score).toBe(0)
    const simOnly = scoreLead({ simConfig: { weightKg: 5, feedRate: 8 } })
    expect(simOnly.score).toBe(25 + 20 + 15) // format + feed + sim data; handle/shifts unknown
    const weak = scoreLead({ input: { weightKg: 10, hasHandle: 'nu', material: 'plastic', lineRate: 5, shifts: 1 } })
    expect(weak.score).toBe(0)
    expect(full.rules.reduce((s, r) => s + r.points, 0)).toBe(100)
  })
  it('seeds are clearly fictional bakery/confectionery producers', () => {
    expect(SEED_LEADS).toHaveLength(4)
    for (const l of SEED_LEADS) { expect(l.fictiv).toBe(true); expect(l.company).toMatch(/\(fictiv\)/) }
  })
})

describe('CRM status persistence', () => {
  beforeEach(() => localStorage.clear())
  it('persists status changes, merges own leads with seeds, resets demo', () => {
    localStorage.setItem('ur20-leads', JSON.stringify([{ id: 'TC-9999', company: 'Test (fictiv)', simConfig: { weightKg: 13, feedRate: 6.5, bottleneckLabel: 'x' } }]))
    let leads = loadLeads()
    expect(leads).toHaveLength(5)
    expect(leads[0].id).toBe('TC-9999')
    expect(leads[0].status).toBe('Nouă')
    setStatus('TC-9999', 'Demo')
    expect(readStatuses()['TC-9999']).toBe('Demo')
    leads = loadLeads() // simulates reload
    expect(leads.find((l) => l.id === 'TC-9999').status).toBe('Demo')
    expect(funnel(leads).find((f) => f.status === 'Demo').count).toBe(2)
    expect(() => setStatus('TC-9999', 'Plătit')).toThrow()
    resetDemo()
    expect(loadLeads().find((l) => l.id === 'TC-9999').status).toBe('Nouă')
    expect(STATUSES).toEqual(['Nouă', 'Evaluare tehnică', 'Demo', 'Ofertă', 'Comandă'])
  })
})
