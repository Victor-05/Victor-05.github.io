import { motion } from 'framer-motion'
import { Box, ScanEye, Hand, Grid2x2, ShieldCheck, Flag, User } from 'lucide-react'
import { CHAPTERS } from './chapters.js'
import Counter from './Counter.jsx'
import EntryLinks from './EntryLinks.jsx'

const ICONS = { problem: User, vision: ScanEye, pick: Hand, pallets: Grid2x2, safety: ShieldCheck, outro: Flag, intro: Box }

// Static fallback (no WebGL / reduced motion / low-end): same chapter copy, no three.js download.
export default function StoryStatic({ onForce3D }) {
  const [intro, ...rest] = CHAPTERS
  return (
    <section className="relative px-4 pb-16 pt-24 sm:pt-32" data-testid="story-static">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] [background:radial-gradient(ellipse_at_top,rgba(255,122,26,.16),transparent_65%)]" />
      <div className="relative mx-auto max-w-5xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">{intro.kicker}</p>
        <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">{intro.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-400">{intro.text}</p>
        <div className="mt-8 max-w-2xl"><EntryLinks compact /></div>
        {onForce3D && (
          <button onClick={onForce3D} className="mt-4 text-xs text-slate-500 underline underline-offset-4 hover:text-slate-300">Dispozitivul pare modest – afișăm versiunea statică. Încearcă versiunea 3D</button>
        )}
        <ol className="relative mt-16 space-y-10 border-l border-slate-800 pl-6 sm:pl-10">
          {rest.map((c) => {
            const Icon = ICONS[c.id]
            return (
              <motion.li key={c.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5 }} className="relative">
                <span className="absolute -left-[39px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-[#ff7a1a]/50 bg-[#0b1220] text-[#ff7a1a] sm:-left-[57px]"><Icon className="h-4 w-4" /></span>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ff7a1a]">{c.kicker}</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{c.title}</h2>
                <p className="mt-2 max-w-2xl text-slate-400">{c.text}</p>
                {c.counter && <p className="mt-3 font-display text-4xl font-bold text-white"><Counter value={c.counter.value} suffix={c.counter.suffix} /> <span className="block text-sm font-normal text-slate-400">{c.counter.label}</span></p>}
                {c.note && <p className="mt-2 text-xs text-slate-500">{c.note}</p>}
                {c.id === 'outro' && <div className="mt-6"><EntryLinks /></div>}
              </motion.li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
