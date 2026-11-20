import { motion, useInView, animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { Section } from './ui.jsx'

function Counter({ to, decimals = 0, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration: 1.4, ease: 'easeOut', onUpdate: setVal })
    return () => c.stop()
  }, [inView, to])
  return <span ref={ref}>{val.toLocaleString('ro-RO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

const stats = [
  { value: 8.6, decimals: 1, label: 'găleți/min la 5 kg', sub: 'rezultat test' },
  { value: 7.4, decimals: 1, label: 'găleți/min la 13 kg', sub: 'rezultat test' },
  { value: 6, decimals: 0, label: 'găleți/min țintă', sub: 'cerință minimă proiect' },
  { value: 0, decimals: 0, label: 'prinderi eșuate la FAT', sub: 'test de acceptanță în fabrica integratorului' },
]

const facts = [
  ['Client', 'PURATOS – ingrediente pentru panificație'],
  ['Integrator', 'Tech-Con Industry'],
  ['Soluție', '2 celule de paletizare cu Universal Robots UR20'],
  ['Produs', 'Găleți din plastic cu mâner, 5 kg și 13 kg'],
  ['Palet', '100 găleți × 5 kg sau 44 găleți × 13 kg'],
  ['Înainte', 'Paletizare manuală, 2 operatori/schimb, 2–3 schimburi/zi'],
  ['Livrare', 'aproximativ 4 luni'],
  ['Siguranță', '3 scanere de siguranță pe celulă'],
]

export default function ReferenceCase() {
  return (
    <Section id="referinta" eyebrow="Caz de referință" title="PURATOS × Tech-Con Industry" intro="Ce s-a implementat și ce s-a măsurat la testare.">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5">
            <p className="font-display text-4xl font-bold text-white sm:text-5xl"><Counter to={s.value} decimals={s.decimals} /></p>
            <p className="mt-2 text-sm font-medium text-slate-200">{s.label}</p>
            <p className="text-xs text-slate-500">{s.sub}</p>
          </motion.div>
        ))}
      </div>
      <motion.dl initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 bg-slate-950 p-4 sm:flex-row sm:gap-4">
            <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:pt-0.5">{k}</dt>
            <dd className="text-sm text-slate-200">{v}</dd>
          </div>
        ))}
      </motion.dl>
      <p className="mt-4 flex items-start gap-2 text-sm text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        Rezultate de test ale unei aplicații; nu reprezintă garanții. Un robot mai rapid nu crește automat debitul fabricii – trebuie verificate și etapele din amonte și din aval.
      </p>
    </Section>
  )
}
