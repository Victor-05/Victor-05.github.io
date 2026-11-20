import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle, X, CheckCircle2, Circle, ArrowRight, RotateCcw } from 'lucide-react'
import { readGuide, setHintSeen, resetGuide, highlight, GUIDE_EVENT } from '../lib/guide.js'

const STEPS = [
  { n: 1, title: 'Digital Twin: rulați un schimb complet', text: 'Apăsați „Rulează schimb complet” și citiți raportul de 8 h.', route: '/digital-twin', targets: ['[data-guide="run-shift"]'] },
  { n: 2, title: 'Scenarii: robot +25% = +0', text: 'Apăsați „Compară scenarii”: un robot mai rapid nu ajută când limitează alimentarea.', route: '/digital-twin', targets: ['[data-guide="scenarios"]'] },
  { n: 3, title: 'Trimiteți configurația la Tech-Con', text: 'Din raport sau din scenarii: „Trimite această configurație” → date fictive → primiți TC-XXXX.', route: '/digital-twin', targets: ['[data-guide="send-config"]', '[data-guide="run-shift"]'] },
  { n: 4, title: 'Evaluator: date greșite', text: 'Lăsați greutatea goală sau scrieți 0 și apăsați „Evaluează” → mesaj de validare.', route: '/evaluator', targets: ['[data-guide="weight"]'], focus: true },
]

export default function TestGuide() {
  const [g, setG] = useState(readGuide)
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const on = () => setG(readGuide())
    window.addEventListener(GUIDE_EVENT, on)
    return () => window.removeEventListener(GUIDE_EVENT, on)
  }, [])
  const [hint, setHint] = useState(() => !readGuide().hintSeen)
  useEffect(() => {
    if (!hint) return
    const hide = () => { setHint(false); setHintSeen() }
    const t = setTimeout(hide, 9000)
    window.addEventListener('scroll', hide, { once: true, passive: true })
    return () => { clearTimeout(t); window.removeEventListener('scroll', hide) }
  }, [hint])

  const doneCount = STEPS.filter((s) => g.done[s.n]).length
  const go = (s) => {
    navigate(s.route)
    setOpen(false) // never leave the panel over the highlighted control
    setTimeout(() => highlight(s.targets, { focus: s.focus }), 450)
  }
  const toggle = () => { setOpen((o) => !o); setHint(false); setHintSeen() }

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-30 flex flex-col items-end gap-2 sm:bottom-5 sm:right-5">
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Ghid de testare" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            className="pointer-events-auto max-h-[calc(100svh-140px)] w-[min(340px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0f172a] p-4 shadow-2xl shadow-black/50">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="font-display font-bold text-white">Cum testez? (60 s)</p>
                <p className="text-xs text-slate-400">{doneCount}/4 pași finalizați · se bifează automat</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Închide ghidul" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="mb-3 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-[#ff7a1a] transition-all" style={{ width: `${doneCount * 25}%` }} /></div>
            <ol className="space-y-2">
              {STEPS.map((s) => {
                const done = !!g.done[s.n]
                return (
                  <li key={s.n} data-testid={`guide-step-${s.n}`} data-done={done} className={`rounded-xl border p-2.5 ${done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950/50'}`}>
                    <div className="flex items-start gap-2">
                      {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${done ? 'text-emerald-300' : 'text-white'}`}>{s.n}. {s.title}</p>
                        <p className="text-xs text-slate-400">{s.text}</p>
                        <button onClick={() => go(s)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#ff7a1a] hover:text-[#ff9445]">Du-mă acolo <ArrowRight className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
            {doneCount > 0 && <button onClick={resetGuide} className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"><RotateCcw className="h-3 w-3" /> Resetează pașii</button>}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {hint && !open && (
          <motion.button onClick={toggle} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="pointer-events-auto max-w-[220px] rounded-xl border border-[#ff7a1a]/50 bg-[#0f172a] px-3 py-2 text-left text-xs text-slate-200 shadow-lg">
            Prima vizită? Testați aplicația în 60 s ↓
          </motion.button>
        )}
      </AnimatePresence>
      <button onClick={toggle} aria-label="Cum testez? (60 s)" aria-expanded={open}
        className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full border border-[#ff7a1a]/60 bg-[#0f172a] pl-2.5 pr-3 text-xs font-semibold text-white shadow-lg shadow-black/40 transition hover:border-[#ff7a1a] sm:h-auto sm:py-2.5 sm:text-sm">
        <HelpCircle className="h-5 w-5 text-[#ff7a1a]" />
        <span className="hidden sm:inline">Cum testez? (60 s)</span>
        <span className="sm:hidden">60 s</span>
        <span className="rounded-full bg-slate-800 px-1.5 text-[10px] tabular-nums text-slate-300">{doneCount}/4</span>
      </button>
    </div>
  )
}
