import { motion } from 'framer-motion'
import { MoveRight, ScanEye, Hand, Grid2x2, PackageCheck, User } from 'lucide-react'
import { Section } from './ui.jsx'

const steps = [
  { icon: MoveRight, title: 'Conveior de alimentare', text: 'Găletile pline sosesc de pe linia de umplere.' },
  { icon: ScanEye, title: 'Viziune 2D SICK', text: 'Verifică orientarea mânerului înainte de prindere.' },
  { icon: Hand, title: 'Gripper pneumatic', text: 'Gripper dedicat, montat pe cobotul UR20.' },
  { icon: Grid2x2, title: '2 poziții de palet', text: 'Robotul așază pe unul din cele 2 paleți ai celulei.' },
  { icon: PackageCheck, title: 'Palet finalizat', text: 'Schemă de așezare repetabilă, strat cu strat.' },
]

export default function HowItWorks() {
  return (
    <Section id="cum-functioneaza" eyebrow="Cum funcționează" title="O celulă de paletizare, în 5 pași" intro="Fluxul din aplicația de referință. Siguranța este asigurată de 3 scanere de siguranță pe celulă (încetinire / oprire de protecție).">
      <div className="relative grid gap-4 md:grid-cols-5">
        <div className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-sky-400/60 via-sky-400/20 to-transparent md:left-0 md:right-0 md:top-7 md:bottom-auto md:h-px md:w-auto md:bg-gradient-to-r" />
        {steps.map(({ icon: Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="relative flex gap-4 md:flex-col"
          >
            <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/40 bg-slate-900 text-sky-300 shadow-lg shadow-sky-500/10 md:h-14 md:w-14">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Pasul {i + 1}</p>
              <h3 className="font-display font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-400">{text}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-10 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
        <User className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <p className="text-sm text-slate-300">
          <strong className="text-amber-300">Rămâne manual:</strong> schimbarea paleților și așezarea separatoarelor între straturi. Transportul paleților la logistică, înfolierea și expedierea nu fac parte din celulă.
        </p>
      </motion.div>
    </Section>
  )
}
