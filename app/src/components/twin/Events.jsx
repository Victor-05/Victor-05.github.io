import { useState } from 'react'
import { Siren, Bot, Waypoints, ScanEye, Clock, TrendingUp, ScrollText } from 'lucide-react'
import { Card } from './Panels.jsx'
import { fmtClock, fmtDur, fmtNum } from '../../sim/useSimulation.js'

export const EVENT_RO = {
  robot: { label: 'Defect robot', icon: Bot, tone: 'rose' },
  conveyor: { label: 'Defect conveior', icon: Waypoints, tone: 'rose' },
  vision: { label: 'Eroare viziune / detecție', icon: ScanEye, tone: 'rose' },
  palletDelay: { label: 'Întârziere schimbare palet', icon: Clock, tone: 'amber' },
  surge: { label: 'Vârf de alimentare (×2)', icon: TrendingUp, tone: 'sky' },
}
const DURS = [60, 180, 300, 600]

export function AlarmBanner({ sim }) {
  const active = sim.s.log.filter((l) => l.active)
  if (!active.length) return null
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
      <Siren className="twin-pulse h-4 w-4 shrink-0 text-rose-400" />
      {active.map((l) => (
        <span key={l.id} className="font-semibold">{EVENT_RO[l.kind].label} <span className="font-normal tabular-nums text-rose-300/80">· încă {fmtDur(Math.max(0, l.start + l.duration - sim.now))}</span></span>
      ))}
    </div>
  )
}

export default function Events({ sim, onTrigger }) {
  const [dur, setDur] = useState(180)
  const tones = { rose: 'border-rose-500/40 text-rose-300 hover:bg-rose-500/15', amber: 'border-amber-400/40 text-amber-300 hover:bg-amber-400/15', sky: 'border-sky-400/40 text-sky-300 hover:bg-sky-400/15' }
  const log = [...sim.s.log].reverse()
  return (
    <Card title="Evenimente" icon={Siren}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">Durată <span className="text-[10px] text-amber-400/80">[ipoteză]</span></span>
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {DURS.map((d) => (
            <button key={d} onClick={() => setDur(d)} aria-pressed={dur === d} className={`rounded-lg py-1.5 text-xs font-semibold ${dur === d ? 'bg-slate-200 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{d / 60} min</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(EVENT_RO).map(([k, e]) => {
          const Icon = e.icon
          return (
            <button key={k} onClick={() => onTrigger(k, dur)} className={`flex items-center gap-2 rounded-xl border bg-slate-950/40 px-3 py-2.5 text-left text-xs font-medium transition ${tones[e.tone]} ${k === 'surge' ? 'col-span-2 sm:col-span-1' : ''}`}>
              <Icon className="h-4 w-4 shrink-0" /> {e.label}
            </button>
          )
        })}
      </div>
      <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-300"><ScrollText className="h-3.5 w-3.5" /> Jurnal evenimente</p>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
        {log.length === 0 ? <p className="p-3 text-xs text-slate-500">Niciun eveniment încă.</p> : (
          <ul className="divide-y divide-slate-800 text-xs">
            {log.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0"><span className="font-mono text-slate-500">{fmtClock(l.start)}</span> <span className="text-slate-200">{EVENT_RO[l.kind].label}</span> <span className="text-slate-500">· {fmtDur(l.duration)}</span></span>
                <span className={`shrink-0 tabular-nums ${l.active ? 'text-rose-400' : 'text-slate-300'}`}>{l.active ? 'activ' : `${l.lost > 0 ? '−' : ''}${fmtNum(l.lost ?? 0)} găleți`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-slate-500">Găleți pierdute = diferența față de aceeași simulare fără eveniment, la finalul evenimentului.</p>
    </Card>
  )
}
