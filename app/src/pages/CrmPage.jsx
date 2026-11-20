import { useState } from 'react'
import { Info, RotateCcw } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { loadLeads, setStatus, resetDemo, funnel, STATUSES, sourceLabel, SCORE_RULES_TEXT } from '../lib/crm.js'

const scoreTone = (s) => (s >= 70 ? 'text-emerald-300 border-emerald-500/40' : s >= 40 ? 'text-amber-300 border-amber-400/40' : 'text-rose-300 border-rose-500/40')

export default function CrmPage() {
  const [leads, setLeads] = useState(loadLeads)
  const f = funnel(leads)
  const change = (id, status) => { setStatus(id, status); setLeads(loadLeads()) }
  return (
    <div className="pt-14">
      <PageHeader eyebrow="Tech-Con · vedere internă" title="Cereri Tech-Con (CRM demo)" text="Solicitările trimise din Evaluator și Digital Twin, cu scor transparent și pasul următor. Datele stau doar în acest browser." />
      <section className="px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Pâlnie · demo – date fictive</p>
            <button onClick={() => { resetDemo(); setLeads(loadLeads()) }} title="Readuce statusurile la valorile demo" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white"><RotateCcw className="h-3.5 w-3.5" /> Resetează demo</button>
          </div>
          <div className="mb-6 grid grid-cols-5 gap-1.5 sm:gap-3" data-testid="funnel">
            {f.map((x, i) => (
              <div key={x.status} className="rounded-xl border border-slate-800 bg-slate-900/60 px-2 py-3 text-center" style={{ opacity: 1 - i * 0.08 }}>
                <p className="font-display text-2xl font-bold text-white sm:text-3xl">{x.count}</p>
                <p className="truncate text-[10px] text-slate-400 sm:text-xs">{x.status}</p>
              </div>
            ))}
          </div>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
            Scor 0–100
            <span tabIndex={0} title={SCORE_RULES_TEXT} aria-label={`Reguli scor: ${SCORE_RULES_TEXT}`} className="group relative inline-flex cursor-help">
              <Info className="h-3.5 w-3.5 text-sky-400" />
              <span role="tooltip" className="pointer-events-none absolute left-0 top-5 z-20 hidden w-64 whitespace-pre-line rounded-lg border border-slate-700 bg-[#0f172a] p-2.5 text-[11px] text-slate-200 shadow-xl group-hover:block group-focus:block">{SCORE_RULES_TEXT}</span>
            </span>
            · reguli transparente, fără valori financiare
          </p>
          <ul className="space-y-3" data-testid="crm-list">
            {leads.map((l) => (
              <li key={l.id} data-testid={`crm-${l.id}`} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-slate-500">{l.id} · {new Date(l.createdAt ?? Date.now()).toLocaleDateString('ro-RO')}{l.fictiv && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-amber-300">fictiv</span>}{!l.fictiv && <span className="ml-2 rounded bg-sky-400/15 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-sky-300">din acest browser</span>}</p>
                    <p className="mt-0.5 truncate font-display text-lg font-bold text-white">{l.company}</p>
                    <p className="text-xs text-slate-400">Sursă: {sourceLabel(l.source)}</p>
                  </div>
                  <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 ${scoreTone(l.score)}`} title={l.rules.map((r) => `${r.ok ? '✓' : '✗'} +${r.points} ${r.label}`).join('\n')}>
                    <span className="font-display text-lg font-bold leading-none">{l.score}</span>
                    <span className="text-[9px] text-slate-500">scor</span>
                  </div>
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3 sm:block"><dt className="text-xs text-slate-500">Verdict evaluator</dt><dd className="text-right text-slate-200 sm:text-left">{l.verdict ?? '—'}</dd></div>
                  <div className="flex justify-between gap-3 sm:block"><dt className="text-xs text-slate-500">Blocaj principal (simulare)</dt><dd className="text-right text-slate-200 sm:text-left">{l.simConfig?.bottleneckLabel ?? '—'}</dd></div>
                </dl>
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-300"><span className="text-xs text-slate-500">Pas următor: </span>{l.next}</p>
                  <label className="flex items-center gap-2 text-xs text-slate-400">Status
                    <select value={l.status} onChange={(e) => change(l.id, e.target.value)} aria-label={`Status ${l.id}`} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white">
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
