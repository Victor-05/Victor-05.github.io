// CRM demo for Tech-Con: requests from localStorage + 4 fictional seeds.
// Transparent scoring rules; status persisted per request id. No money figures.
import { TESTED } from '../sim/engine.js'

export const STATUSES = ['Nouă', 'Evaluare tehnică', 'Demo', 'Ofertă', 'Comandă']
const STATUS_KEY = 'ur20-crm-status'
const LEADS_KEY = 'ur20-leads'

export const SEED_LEADS = [
  { id: 'TC-0101', fictiv: true, seedStatus: 'Nouă', createdAt: '2026-11-17T09:12:00.000Z', company: 'Crema Dolce Ingrediente SRL (fictiv)', name: 'Contact demo (fictiv)', email: 'demo1@exemplu.ro', phone: '', source: 'evaluator',
    input: { weightKg: 13, bucketsPerPallet: 44, hasHandle: 'da', material: 'plastic', lineRate: 6.5, shifts: 2, hoursPerShift: 8 }, verdict: 'Compatibil cu cazul de referință', simConfig: null },
  { id: 'TC-0102', fictiv: true, seedStatus: 'Evaluare tehnică', createdAt: '2026-11-15T13:40:00.000Z', company: 'Panifix Umpluturi SA (fictiv)', name: 'Contact demo (fictiv)', email: 'demo2@exemplu.ro', phone: '0700 000 002', source: 'digital-twin',
    input: null, verdict: null, simConfig: { weightKg: 5, perPallet: 100, feedRate: 8.2, speedFactor: 1, hypothetical: false, palletChangeTime: 90, simulatedHours: 8, buckets: 3895, pallets: 38, avgRate: 8.11, targetPct: 135, bottleneck: 'feed', bottleneckLabel: 'Alimentarea liniei (amonte)' } },
  { id: 'TC-0103', fictiv: true, seedStatus: 'Demo', createdAt: '2026-11-12T08:05:00.000Z', company: 'Glazura Nordului SRL (fictiv)', name: 'Contact demo (fictiv)', email: 'demo3@exemplu.ro', phone: '0700 000 003', source: 'evaluator+digital-twin',
    input: { weightKg: 13, bucketsPerPallet: 44, hasHandle: 'da', material: 'plastic', lineRate: 9, shifts: 3, hoursPerShift: 8 }, verdict: 'Necesită evaluare tehnică',
    simConfig: { weightKg: 13, perPallet: 44, feedRate: 9, speedFactor: 1, hypothetical: false, palletChangeTime: 90, simulatedHours: 8, buckets: 3552, pallets: 80, avgRate: 7.4, targetPct: 123, bottleneck: 'robot', bottleneckLabel: 'Robotul UR20 (timp de ciclu)' } },
  { id: 'TC-0104', fictiv: true, seedStatus: 'Ofertă', createdAt: '2026-11-08T15:22:00.000Z', company: 'Cofetar Pro Ingrediente SRL (fictiv)', name: 'Contact demo (fictiv)', email: 'demo4@exemplu.ro', phone: '', source: 'evaluator',
    input: { weightKg: 10, bucketsPerPallet: 60, hasHandle: 'nu', material: 'plastic', lineRate: 5, shifts: 1, hoursPerShift: 8 }, verdict: 'Necesită evaluare tehnică', simConfig: null },
]

const SOURCE_RO = { evaluator: 'Evaluator', 'digital-twin': 'Digital Twin', 'evaluator+digital-twin': 'Evaluator + Digital Twin' }
export const sourceLabel = (s) => SOURCE_RO[s] ?? 'Evaluator'

/** Transparent 0–100 score. Each rule: points if satisfied; unknown data scores 0. */
export function scoreLead(lead) {
  const inp = lead.input || {}
  const sim = lead.simConfig || {}
  const weight = inp.weightKg ?? sim.weightKg
  const feed = inp.lineRate ?? sim.feedRate
  const rules = [
    { id: 'format', label: 'Format testat (5 sau 13 kg)', points: 25, ok: weight === 5 || weight === 13 },
    { id: 'handle', label: 'Găleată din plastic cu mâner', points: 15, ok: inp.hasHandle === 'da' && inp.material === 'plastic' },
    { id: 'feed', label: 'Alimentare ≥ ținta de 6 găleți/min', points: 20, ok: typeof feed === 'number' && feed >= 6 },
    { id: 'shifts', label: '2–3 schimburi pe zi', points: 15, ok: inp.shifts === 2 || inp.shifts === 3 },
    { id: 'sim', label: 'Date de simulare atașate', points: 15, ok: !!lead.simConfig },
    { id: 'phone', label: 'Telefon de contact completat', points: 10, ok: !!String(lead.phone || '').trim() },
  ]
  return { score: rules.reduce((s, r) => s + (r.ok ? r.points : 0), 0), rules }
}
export const SCORE_RULES_TEXT = scoreLead({}).rules.map((r) => `+${r.points} ${r.label}`).join('\n')

export function nextStep(lead, status, score) {
  switch (status) {
    case 'Nouă': return score >= 70 ? 'Sunați în 48 h și programați evaluarea tehnică' : 'Clarificați formatul găleții și ritmul liniei (apel scurt)'
    case 'Evaluare tehnică': return TESTED[lead.input?.weightKg ?? lead.simConfig?.weightKg] ? 'Verificați linia din amonte și aval la client' : 'Validați sarcina totală (găleată + gripper) cu Tech-Con'
    case 'Demo': return 'Demonstrație pe aplicația de referință / Digital Twin cu datele clientului'
    case 'Ofertă': return 'Trimiteți oferta tehnică și urmăriți decizia directorului de investiții'
    case 'Comandă': return 'Planificați proiectul (în cazul de referință livrarea a durat ~4 luni)'
    default: return '—'
  }
}

export function readStatuses() {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') } catch { return {} }
}
export function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error('Status invalid')
  const all = readStatuses()
  all[id] = status
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(all)) } catch { /* ignore */ }
  return all
}
export function resetDemo() {
  try { localStorage.removeItem(STATUS_KEY) } catch { /* ignore */ }
}
export function loadLeads() {
  let own = []
  try { own = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]') } catch { own = [] }
  const statuses = readStatuses()
  return [...own.slice().reverse(), ...SEED_LEADS].map((l) => {
    const status = statuses[l.id] ?? l.seedStatus ?? 'Nouă'
    const { score, rules } = scoreLead(l)
    return { ...l, source: l.source ?? (l.simConfig ? 'digital-twin' : 'evaluator'), status, score, rules, next: nextStep(l, status, score) }
  })
}
export function funnel(leads) {
  return STATUSES.map((s) => ({ status: s, count: leads.filter((l) => l.status === s).length }))
}
