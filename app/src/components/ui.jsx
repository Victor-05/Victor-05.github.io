import { motion } from 'framer-motion'

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function Section({ id, eyebrow, title, intro, children, className = '', bare = false, wide = false }) {
  return (
    <section id={id} className={`relative px-4 ${bare ? 'py-8 sm:py-12' : 'py-16 sm:py-24'} ${className}`}>
      <div className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>
        {!bare && <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="mb-10 max-w-3xl">
          {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">{eyebrow}</p>}
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">{title}</h2>
          {intro && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{intro}</p>}
        </motion.div>}
        {children}
      </div>
    </section>
  )
}

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-1.5 [&>label]:min-h-5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-200">{label}</label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export const inputCls = (err) =>
  `w-full rounded-xl border bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
    err ? 'border-rose-500/70 focus:ring-rose-500/40' : 'border-slate-700 focus:border-sky-400 focus:ring-sky-400/30'
  }`

export function Segmented({ name, value, onChange, options, error }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} className={`grid gap-1 rounded-xl border p-1 ${error ? 'border-rose-500/70' : 'border-slate-700'} bg-slate-900/70`}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o.value}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-2.5 text-sm font-medium transition ${value === o.value ? 'text-slate-950' : 'text-slate-300 hover:text-white'}`}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${name}`} className="absolute inset-0 rounded-lg bg-sky-400" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
