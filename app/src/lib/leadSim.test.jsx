// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Simulation, defaultParams } from '../sim/engine.js'
import { buildSimConfig } from '../sim/summary.js'
import { buildLead, saveLead } from './lead.js'
import LeadForm from '../components/LeadForm.jsx'

const shiftConfig = (patch = {}) => {
  const sim = new Simulation({ ...defaultParams(13), ...patch })
  return buildSimConfig(sim, sim.runShift())
}

describe('lead with digital twin config', () => {
  beforeEach(() => localStorage.clear())

  it('builds sim config and flags hypothetical robot speed', () => {
    const c = shiftConfig()
    expect(c).toMatchObject({ weightKg: 13, perPallet: 44, feedRate: 6.5, hypothetical: false, bottleneck: 'feed', simulatedHours: 8 })
    expect(c.pallets).toBe(Math.floor(c.buckets / 44))
    expect(shiftConfig({ speedFactor: 1.3 }).hypothetical).toBe(true)
  })

  it('stores simConfig with the lead; evaluator-only lead still works', () => {
    const form = { name: 'Ana Test', email: 'ana@exemplu.ro', phone: '', date: '2099-01-01', consent: true, company: 'Demo SRL (fictiv)' }
    const simConfig = shiftConfig()
    const lead = buildLead({ form, simConfig, id: 'TC-0001' })
    expect(lead.source).toBe('digital-twin')
    expect(lead.company).toBe('Demo SRL (fictiv)')
    expect(saveLead(lead)).toBe(true)
    expect(JSON.parse(localStorage.getItem('ur20-leads'))[0].simConfig.buckets).toBe(simConfig.buckets)
    const evalOnly = buildLead({ form, values: { companyName: 'X SRL' }, result: { verdict: 'v', daily: {} } })
    expect(evalOnly.source).toBe('evaluator')
    expect(evalOnly.simConfig).toBeNull()
  })

  it('pre-fills the form with the read-only summary and shows it in the confirmation', async () => {
    const simConfig = shiftConfig({ speedFactor: 1.3 })
    render(<LeadForm open onClose={() => {}} simConfig={simConfig} />)
    const box = screen.getByTestId('sim-summary')
    expect(box.textContent).toMatch(/ipotetic, peste rezultatul testat/)
    expect(box.textContent).toMatch(/44 găleți\/palet/)
    fireEvent.change(screen.getByLabelText(/Nume și prenume/), { target: { value: 'Ana Test' } })
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'ana@exemplu.ro' } })
    fireEvent.change(screen.getByLabelText(/Data preferată/), { target: { value: '2099-01-15' } })
    fireEvent.click(screen.getByRole('checkbox'))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Trimite solicitarea/i })) })
    expect(await screen.findByText(/^TC-\d{4}$/)).toBeTruthy()
    expect(screen.getByText('Simulare · Blocaj principal')).toBeTruthy()
    const stored = JSON.parse(localStorage.getItem('ur20-leads'))
    expect(stored[0].simConfig.speedFactor).toBe(1.3)
  })
})
