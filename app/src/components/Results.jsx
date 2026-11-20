import { motion, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Info } from 'lucide-react'
import PalletViz from './PalletViz.jsx'

const LEVEL = {
  ok: { icon: CheckCircle2, color: 'text-emerald-400', ring: 'border-emerald-400/40 bg-emerald-400/10', label: 'OK' },
  validate: { icon: AlertTriangle, color: 'text-amber-400', ring: 'border-amber-400/40 bg-amber-400/10', label: 'De validat' },
  out: { icon: XCircle, color: 'text-rose-400', ring: 'border-rose-400/40 bg-rose-400/10', label: 'În afara referinței' },
}

function Num({ value, decimals = 0 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const c = animate(0, value, { duration: 1.2, ease: 'easeOut', onUpdate: setV })
    return () => c.stop()
  }, [value])
  return v.toLocaleString('ro-RO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export default function Results({ result, values, onRequest, onPrint }) {
  const lv = LEVEL[result.verdictLevel]
  const VIcon = lv.icon
  const cards = [
    { label: 'Ritm efectiv estimat', value: result.rate.effective, decimals: 1, unit: 'găleți/min', note: result.rate.robotIsBottleneck ? 'limitat de robot (referință)' : 'limitat de alimentarea liniei' },
    { label: 'Găleți paletizate / zi', value: result.daily.buckets, unit: 'găleți', note: `${values.shifts} schimb(uri) × ${values.hoursPerShift} h` },
    { label: 'Paleți / zi', value: result.daily.pallets, decimals: 1, unit: 'paleți', note: `${values.bucketsPerPallet} găleți / palet` },
    { label: 'Kg / zi', value: result.daily.kg, unit: 'kg', note: 'care nu mai sunt ridicate manual de operatori la paletizare' },
  ]
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className="space-y-5">
      <motion.div initial={{ scale: 0.96 }} animate={{ scale: 1 }} className={`flex items-start gap-4 rounded-2xl border p-5 ${lv.ring}`}>
        <motion.div initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.15 }}>
          <VIcon className={`h-10 w-10 ${lv.color}`} />
        </motion.div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Verdict pentru {values.companyName}</p>
          <p className={`font-display text-2xl font-bold ${lv.color}`}>{result.verdict}</p>
          <p className="mt-1 text-sm text-slate-400">Evaluare orientativă, comparată cu aplicația de referință. Decizia finală necesită evaluarea tehnică Tech-Con.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl"><Num value={c.value} decimals={c.decimals} /></p>
            <p className="text-xs text-slate-500">{c.unit} · {c.note}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-3 text-sm font-semibold text-white">Ritm linie vs. referință robot</p>
        {[
          { label: 'Alimentare linie', v: result.rate.line, color: 'bg-sky-400' },
          { label: `Referință robot${result.rate.rateIsTested ? ' (testat)' : ' (țintă, nu rezultat testat)'}`, v: result.rate.reference, color: 'bg-amber-400' },
        ].map((b) => {
          const max = Math.max(result.rate.line, result.rate.reference) * 1.1
          return (
            <div key={b.label} className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{b.label}</span><span className="font-semibold text-slate-200">{b.v} găleți/min</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <motion.div className={`h-full rounded-full ${b.color}`} initial={{ width: 0 }} animate={{ width: `${(b.v / max) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
            </div>
          )
        })}
        <p className="flex items-start gap-2 text-xs text-slate-400"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />Un robot mai rapid nu crește automat debitul fabricii; verificați și etapele din amonte și aval.</p>
      </div>

      <ul className="space-y-2">
        {result.checks.map((c, i) => {
          const L = LEVEL[c.status]
          const Icon = L.icon
          return (
            <motion.li key={c.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.1 }} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${L.color}`} />
              <div>
                <p className="text-sm font-semibold text-white">{c.label} <span className={`ml-1 text-xs font-medium ${L.color}`}>· {L.label}</span></p>
                <p className="text-sm text-slate-400">{c.detail}</p>
              </div>
            </motion.li>
          )
        })}
      </ul>

      <PalletViz count={values.bucketsPerPallet} weightKg={values.weightKg} />

      <button onClick={onRequest} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 py-4 font-semibold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300">
        Solicită evaluare tehnică <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
      </button>
      {onPrint && (
        <button onClick={onPrint} className="w-full rounded-xl border border-sky-400/50 px-6 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-400/10">
          Raport pentru directorul de investiții (simulare 8 h cu datele dvs.)
        </button>
      )}
    </motion.div>
  )
}
