import { useMemo } from 'react'
import { Gauge, AlertTriangle, Lightbulb, CheckCircle2 } from 'lucide-react'
import { fmtNum, fmtDur } from '../../sim/useSimulation.js'
import { explainBottleneck, whatIf } from '../../sim/insights.js'
import { TARGET_RATE } from '../../sim/engine.js'

export function Card({ title, icon: Icon, children, className = '', right }) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur ${className}`}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">{Icon && <Icon className="h-4 w-4 text-sky-400" />}{title}</p>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function Kpis({ sim }) {
  const s = sim.s
  const st = sim.stats()
  const last = s.samples[s.samples.length - 1]
  const hours = s.now / 3600
  const target = (st.actualRate / TARGET_RATE) * 100
  const items = [
    { k: 'Găleți paletizate', v: fmtNum(s.palletized) },
    { k: 'Paleți compleți', v: fmtNum(s.pallets) },
    { k: 'Ritm curent', v: fmtNum(s.now >= 60 ? last.rate : 0, 1), u: 'găleți/min' },
    { k: 'Ritm mediu', v: fmtNum(st.actualRate, 2), u: 'găleți/min' },
    { k: 'Realizare țintă (6/min)', v: `${fmtNum(target, 0)}%`, tone: target >= 100 ? 'ok' : 'warn' },
    { k: 'Utilizare robot', v: `${fmtNum(st.robotUtil * 100, 0)}%` },
    { k: 'Utilizare conveior', v: `${fmtNum(st.conveyorUtil * 100, 0)}%` },
    { k: 'Robot inactiv', v: fmtDur(st.time.robotWaitBucket + st.time.robotWaitPallet + st.time.robotStarved) },
    { k: 'Conveior blocat', v: fmtDur(st.time.conveyorBlocked), tone: st.time.conveyorBlocked > 0 ? 'warn' : undefined },
    { k: 'Așteptare operator', v: fmtDur(st.time.robotWaitPallet), tone: st.time.robotWaitPallet > 0 ? 'warn' : undefined },
    { k: 'Opriri (defecte)', v: fmtDur(st.time.downtime), tone: st.time.downtime > 0 ? 'bad' : undefined },
    { k: 'Kg paletizate', v: fmtNum(s.palletized * s.params.weightKg), u: hours > 0 ? 'fără ridicare manuală' : '' },
  ]
  const tone = { ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-rose-400' }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((i) => (
        <div key={i.k} className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
          <p className="truncate text-[11px] text-slate-500">{i.k}</p>
          <p className={`font-display text-lg font-bold tabular-nums ${tone[i.tone] ?? 'text-white'}`}>{i.v}</p>
          {i.u && <p className="truncate text-[10px] text-slate-500">{i.u}</p>}
        </div>
      ))}
    </div>
  )
}

function Bar({ label, value, highlight }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className={highlight ? 'font-semibold text-amber-300' : 'text-slate-400'}>{label}</span><span className="tabular-nums text-slate-200">{fmtNum(value * 100, 0)}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full transition-[width] duration-300 ${highlight ? 'bg-amber-400' : 'bg-sky-500'}`} style={{ width: `${Math.min(100, value * 100)}%` }} /></div>
    </div>
  )
}

export function BottleneckPanel({ sim }) {
  const window = sim.now > 1200 ? 900 : null
  const st = sim.stats(window)
  const b = explainBottleneck(st)
  const p = sim.params
  const key = JSON.stringify(p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wi = useMemo(() => whatIf(p), [key])
  const none = b.component === 'none'
  const fmtDelta = (d) => `${d >= 0 ? '+' : ''}${fmtNum(d, 0)} găleți/h`
  const capRows = [
    { k: 'Robot', cap: st.robotCapacity, util: st.robotUtil, c: 'robot' },
    { k: 'Alimentare linie', cap: st.feedCapacity, util: st.conveyorUtil, c: 'feed' },
    { k: 'Operator (schimb palet)', cap: st.operatorCapacity, util: st.operatorUtil, c: 'operator' },
  ]
  return (
    <Card title="Analiză blocaj (calculat din simulare)" icon={Gauge} right={<span className="text-[10px] text-slate-500">{window ? 'ultimele 15 min' : 'de la start'}</span>}>
      <div className={`mb-3 flex items-start gap-3 rounded-xl border p-3 ${none ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-400/40 bg-amber-400/10'}`}>
        {none ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />}
        <div className="min-w-0">
          <p className={`font-display font-bold ${none ? 'text-emerald-300' : 'text-amber-300'}`}>{b.label}</p>
          <p className="mt-0.5 text-xs text-slate-300">{b.why}</p>
          <p className="mt-1.5 text-xs text-slate-400"><strong className="text-slate-200">Acțiune:</strong> {b.action}</p>
        </div>
      </div>
      <div className="mb-3 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-500"><tr><th className="px-2 py-1.5 font-medium">Componentă</th><th className="px-2 py-1.5 font-medium">Capacitate</th><th className="px-2 py-1.5 font-medium">Utilizare</th></tr></thead>
          <tbody>
            {capRows.map((r) => (
              <tr key={r.k} className={`border-t border-slate-800 ${b.component === r.c ? 'bg-amber-400/10 text-amber-200' : 'text-slate-300'}`}>
                <td className="px-2 py-1.5">{r.k}</td>
                <td className="px-2 py-1.5 tabular-nums">{fmtNum(r.cap, 1)} /min</td>
                <td className="px-2 py-1.5 tabular-nums">{fmtNum(r.util * 100, 0)}%</td>
              </tr>
            ))}
            <tr className="border-t border-slate-800 font-semibold text-white"><td className="px-2 py-1.5">Ieșire reală</td><td className="px-2 py-1.5 tabular-nums" colSpan="2">{fmtNum(st.actualRate, 2)} găleți/min</td></tr>
          </tbody>
        </table>
      </div>
      <div className="space-y-2">
        <Bar label="Robot ocupat" value={st.robotUtil} highlight={b.component === 'robot'} />
        <Bar label="Robot așteaptă găleți" value={st.share.robotWaitBucket} highlight={b.component === 'feed'} />
        <Bar label="Robot așteaptă palet liber" value={st.share.robotWaitPallet} highlight={b.component === 'operator'} />
        <Bar label="Conveior blocat (coadă plină)" value={st.share.conveyorBlocked} highlight={b.component === 'robot'} />
      </div>
      <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-400/5 p-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-sky-300"><Lightbulb className="h-3.5 w-3.5" /> Ce-ar fi dacă? (simulare 2 h, fără evenimente)</p>
        <ul className="space-y-1 text-xs text-slate-300">
          <li className="flex justify-between gap-2"><span>Robot cu 25% mai rapid <em className="text-amber-300/80 not-italic">(ipotetic)</em></span><span className="tabular-nums font-semibold">{fmtDelta(wi.robotFaster)}</span></li>
          <li className="flex justify-between gap-2"><span>Alimentare +25%</span><span className="tabular-nums font-semibold">{fmtDelta(wi.feedHigher)}</span></li>
          <li className="flex justify-between gap-2"><span>Schimbare palet de 2× mai rapidă</span><span className="tabular-nums font-semibold">{fmtDelta(wi.fasterChange)}</span></li>
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">Bază: {fmtNum(wi.base, 0)} găleți/h. Creșterea unei componente care nu limitează nu crește producția.</p>
      </div>
    </Card>
  )
}
