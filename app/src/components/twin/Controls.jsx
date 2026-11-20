import { Play, Pause, RotateCcw, FastForward, SlidersHorizontal } from 'lucide-react'
import { Card } from './Panels.jsx'
import { cycleTimes, defaultParams } from '../../sim/engine.js'
import { fmtNum } from '../../sim/useSimulation.js'

function Slider({ label, value, min, max, step, onChange, fmt = (v) => v, tag, warn }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-300">{label} {tag && <span className="text-[10px] text-amber-400/80">{tag}</span>}</span>
        <span className="shrink-0 font-semibold tabular-nums text-white">{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-6 w-full cursor-pointer" aria-label={label} />
      {warn && <p className="text-[10px] font-medium text-amber-400">{warn}</p>}
    </label>
  )
}

const SPEEDS = [1, 2, 5, 10, 20]

export default function Controls({ sim, running, setRunning, speed, setSpeed, onReset, onShift, onStep, onParams }) {
  const p = sim.params
  const ct = cycleTimes(p)
  const set = (k) => (v) => onParams({ [k]: v })
  return (
    <Card title="Panou de control" icon={SlidersHorizontal}>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setRunning(!running)} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${running ? 'bg-amber-400 text-slate-950 hover:bg-amber-300' : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300'}`}>
          {running ? <><Pause className="h-4 w-4" /> Pauză</> : <><Play className="h-4 w-4" /> Pornește</>}
        </button>
        <button onClick={onReset} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2.5 text-sm text-slate-200 transition hover:border-slate-500"><RotateCcw className="h-4 w-4" /> Reset</button>
        <button onClick={onShift} data-guide="run-shift" className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-400 px-2 py-2.5 text-xs font-semibold leading-tight text-slate-950 transition hover:bg-sky-300"><FastForward className="h-4 w-4 shrink-0" /> Rulează schimb complet</button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onStep} title="Avansează la următorul eveniment" className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:border-slate-500 hover:text-white">Pas ▸</button>
        <div className="grid flex-1 grid-cols-5 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setSpeed(s)} aria-pressed={speed === s} className={`rounded-lg py-1.5 text-xs font-semibold transition ${speed === s ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{s}×</button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-slate-400">Găleată</span>
        <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
          {[13, 5].map((w) => (
            <button key={w} onClick={() => onParams({ ...defaultParams(w), feedRate: p.feedRate, queueCapacity: p.queueCapacity, palletChangeTime: p.palletChangeTime, operatorAvailability: p.operatorAvailability }, true)} aria-pressed={p.weightKg === w} className={`rounded-lg py-1.5 text-xs font-semibold transition ${p.weightKg === w ? 'bg-sky-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{w} kg</button>
          ))}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Slider label="Alimentare linie" value={p.feedRate} min={2} max={14} step={0.1} onChange={set('feedRate')} fmt={(v) => `${fmtNum(v, 1)} găleți/min`} />
        <Slider label="Factor viteză robot" value={p.speedFactor} min={0.6} max={1.6} step={0.05} onChange={set('speedFactor')} fmt={(v) => `${fmtNum(v, 2)}×`}
          warn={ct.aboveTested ? `ipotetic – peste rezultatul testat (${fmtNum(ct.rate, 1)} vs ${fmtNum(60 / ct.testedCycle, 1)} găleți/min)` : null} />
        <Slider label="Timp prindere / așezare" value={p.pickTime} min={0.8} max={3} step={0.1} onChange={(v) => onParams({ pickTime: v, placeTime: v })} fmt={(v) => `${fmtNum(v, 1)} s`} />
        <p className="-mt-1 text-[11px] text-slate-500">Ciclu robot: <strong className="text-slate-300">{fmtNum(ct.cycle, 1)} s</strong> → {fmtNum(ct.rate, 1)} găleți/min (testat: {fmtNum(60 / ct.testedCycle, 1)})</p>
        <Slider label="Găleți pe palet" value={p.perPallet} min={20} max={120} step={1} onChange={set('perPallet')} fmt={(v) => `${v}`} />
        <Slider label="Capacitate coadă conveior" tag="[ipoteză]" value={p.queueCapacity} min={1} max={15} step={1} onChange={set('queueCapacity')} fmt={(v) => `${v} găleți`} />
        <Slider label="Timp schimbare palet + separatoare" tag="[ipoteză]" value={p.palletChangeTime} min={30} max={900} step={10} onChange={set('palletChangeTime')} fmt={(v) => `${v} s`} />
        <Slider label="Disponibilitate operator" tag="[ipoteză]" value={p.operatorAvailability} min={20} max={100} step={5} onChange={set('operatorAvailability')} fmt={(v) => `${v}%`} />
        <p className="text-[11px] text-slate-500">Timp de reacție operator: {fmtNum((p.operatorResponse * 100) / p.operatorAvailability, 0)} s (30 s la 100%) [ipoteză]. Rezultatele de test nu reprezintă garanții.</p>
      </div>
    </Card>
  )
}
