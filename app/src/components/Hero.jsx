import { motion } from 'framer-motion'
import { ArrowRight, Gauge, Layers, ShieldCheck } from 'lucide-react'

const points = [
  { icon: ShieldCheck, text: 'Mai puțină ridicare manuală repetitivă la paletizare' },
  { icon: Layers, text: 'Schemă de paletizare repetabilă, palet după palet' },
  { icon: Gauge, text: 'Ritm măsurabil, în găleți pe minut' },
]

export default function Hero() {
  return (
    <header className="relative overflow-hidden">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <motion.div
        aria-hidden
        className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-sky-500/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <img src="./favicon.svg" alt="" className="h-8 w-8" />
          Evaluator&nbsp;<span className="text-sky-400">UR20</span>
        </div>
        <div className="flex gap-2"><a href="#digital-twin" className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-400 hover:text-white sm:block">Digital Twin</a><a href="#evaluator" className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-sky-400 hover:text-white sm:block">Verifică compatibilitatea</a></div>
      </nav>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pb-28 sm:pt-16">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Pentru producătorii de ingrediente de panificație și cofetărie
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl"
        >
          Găleți de 5–13 kg paletizate de un{' '}
          <span className="bg-gradient-to-r from-sky-300 via-sky-400 to-amber-300 bg-clip-text text-transparent">cobot UR20</span>,
          nu de spatele operatorilor.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          Director de producție? Aflați în 2 minute dacă linia dumneavoastră de umplere seamănă cu o aplicație de paletizare robotizată deja testată – și ce trebuie validat tehnic înainte de o investiție.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#evaluator" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 py-4 font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-300">
            Verifică compatibilitatea <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
          </a>
          <a href="#digital-twin" className="inline-flex items-center justify-center rounded-xl border border-emerald-400/50 bg-emerald-400/10 px-6 py-4 font-medium text-emerald-200 transition hover:bg-emerald-400/20">
            Pornește Digital Twin
          </a>
        </motion.div>

        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } } }} className="mt-12 grid gap-3 sm:grid-cols-3">
          {points.map(({ icon: Icon, text }) => (
            <motion.li key={text} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
              <span className="text-sm text-slate-300">{text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </header>
  )
}
