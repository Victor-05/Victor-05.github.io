import { motion } from 'framer-motion'

// Subtle 3D header in pure CSS (no three.js on these routes): perspective floor grid + lit horizon.
export default function PageHeader({ eyebrow, title, text }) {
  return (
    <div className="relative overflow-hidden border-b border-white/5">
      <div aria-hidden className="pointer-events-none absolute inset-0 [perspective:600px]">
        <div className="absolute -inset-x-1/2 bottom-[-60%] h-[160%] origin-top [transform:rotateX(68deg)] [background-image:linear-gradient(rgba(148,163,184,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.12)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,transparent,black_30%,transparent_95%)]" />
        <div className="absolute inset-x-0 top-[38%] h-px bg-[#ff7a1a]/50 shadow-[0_0_40px_6px_rgba(255,122,26,.35)]" />
        <div className="absolute left-1/2 top-[38%] h-40 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[#ff7a1a]/10 blur-3xl" />
      </div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:pb-14 sm:pt-16">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">{eyebrow}</p>
        <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">{text}</p>
      </motion.div>
    </div>
  )
}
