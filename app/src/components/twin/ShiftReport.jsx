import { motion, AnimatePresence } from 'framer-motion'
import { X, FileBarChart } from 'lucide-react'
import { fmtNum, fmtDur } from '../../sim/useSimulation.js'
import { COMPONENT_RO, explainBottleneck } from '../../sim/insights.js'

const LOSS_RO = { feed: 'Robotul așteaptă găleți (alimentare)', operator: 'Robotul așteaptă palet liber (operator)', robotFault: 'Defect robot', conveyorVision: 'Defect conveior / viziune' }

export default function ShiftReport({ report, onClose, onSend, onPrint }) {
  return (
    <AnimatePresence>
      {report && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label="Raport de schimb" onClick={(e) => e.stopPropagation()}
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-5 sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-sky-400"><FileBarChart className="h-4 w-4" /> Raport de schimb · simulare</p>
                <h3 className="font-display text-xl font-bold text-white">{fmtDur(report.duration)} simulate</h3>
              </div>
              <button onClick={onClose} aria-label="Închide" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Găleți paletizate', fmtNum(report.buckets)],
                ['Paleți compleți', fmtNum(report.pallets)],
                ['Kg paletizate', fmtNum(report.kg)],
                ['Ritm mediu', `${fmtNum(report.avgRate, 2)} /min`],
                ['Realizare țintă 6/min', `${fmtNum(report.targetPct, 0)}%`],
                ['Opriri (defecte)', fmtDur(report.downtime)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] text-slate-500">{k}</p>
                  <p className="font-display text-lg font-bold tabular-nums text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3">
              <p className="text-xs text-slate-400">Blocaj principal</p>
              <p className="font-display font-bold text-amber-300">{COMPONENT_RO[report.bottleneck.component]}</p>
              <p className="mt-1 text-xs text-slate-300">{explainBottleneck(report.stats).action}</p>
            </div>
            <p className="mt-4 mb-2 text-sm font-semibold text-white">Pierderi pe cauze (capacitate robot nefolosită)</p>
            <ul className="space-y-2">
              {report.losses.map((l) => {
                const max = Math.max(1, ...report.losses.map((x) => x.seconds))
                return (
                  <li key={l.cause}>
                    <div className="mb-1 flex justify-between gap-2 text-xs"><span className="text-slate-300">{LOSS_RO[l.cause]}</span><span className="shrink-0 tabular-nums text-slate-200">{fmtDur(l.seconds)} · ~{fmtNum(l.buckets)} găleți</span></div>
                    <div className="h-2 rounded-full bg-slate-800"><motion.div className="h-full rounded-full bg-rose-400" initial={{ width: 0 }} animate={{ width: `${(l.seconds / max) * 100}%` }} transition={{ duration: 0.8 }} /></div>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-slate-400">Găleți respinse la intrare: {fmtNum(report.lostArrivals.blocked)} (coadă plină) · {fmtNum(report.lostArrivals.conveyorFault)} (defect conveior). În realitate linia din amonte ar trebui să se oprească.</p>
            <p className="mt-3 text-[11px] text-slate-500">Simulare cu parametri de test și ipoteze; nu reprezintă garanții de performanță. Fără calcule financiare.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button onClick={onSend} className="rounded-xl bg-amber-400 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-300">Trimite această configurație la Tech-Con</button>
              <button onClick={onPrint} className="rounded-xl border border-sky-400/60 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-400/10">Raport pentru directorul de investiții</button>
              <button onClick={onClose} className="rounded-xl border border-slate-700 py-2.5 text-sm text-slate-300 hover:text-white sm:col-span-2">Închide</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
