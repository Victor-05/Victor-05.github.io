import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { CheckCircle2, X, FlaskConical } from 'lucide-react'
import { Field, inputCls } from './ui.jsx'
import { validateLead, makeReferenceId, saveLead } from '../lib/lead.js'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LeadForm({ open, onClose, values, result }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', date: '', consent: false })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = (e) => {
    e.preventDefault()
    const errs = validateLead(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const lead = { id: makeReferenceId(), createdAt: new Date().toISOString(), ...form, company: values.companyName, input: values, verdict: result.verdict, daily: result.daily }
    const stored = saveLead(lead)
    setDone({ ...lead, stored })
  }

  const close = () => {
    onClose()
    setTimeout(() => { setDone(null); setErrors({}) }, 300)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog" aria-modal="true" aria-label="Solicită evaluare tehnică"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-700 bg-slate-900 p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-bold text-white">{done ? 'Solicitare înregistrată' : 'Solicită evaluare tehnică'}</h3>
              <button onClick={close} aria-label="Închide" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-5 flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              <FlaskConical className="h-4 w-4 shrink-0" /> Prototip demonstrativ – folosiți doar date fictive. Datele rămân doar în acest browser.
            </p>

            {done ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                  <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
                </motion.div>
                <p className="mt-3 text-sm text-slate-400">Număr de referință</p>
                <p className="font-display text-4xl font-bold tracking-wider text-white">{done.id}</p>
                <dl className="mt-6 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left text-sm">
                  {[
                    ['Companie', done.company],
                    ['Contact', `${done.name} · ${done.email}${done.phone ? ' · ' + done.phone : ''}`],
                    ['Dată demo preferată', new Date(done.date + 'T00:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })],
                    ['Format', `${done.input.weightKg} kg · ${done.input.bucketsPerPallet} găleți/palet`],
                    ['Verdict orientativ', done.verdict],
                    ['Estimare / zi', `${done.daily.buckets.toLocaleString('ro-RO')} găleți · ${done.daily.pallets.toLocaleString('ro-RO')} paleți`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4"><dt className="text-slate-500">{k}</dt><dd className="text-right text-slate-200">{v}</dd></div>
                  ))}
                </dl>
                {!done.stored && <p className="mt-3 text-xs text-rose-400">Notă: salvarea locală nu a fost posibilă în acest browser.</p>}
                <button onClick={close} className="mt-6 w-full rounded-xl bg-sky-400 py-3.5 font-semibold text-slate-950 hover:bg-sky-300">Închide</button>
              </motion.div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-4">
                <Field label="Nume și prenume *" htmlFor="l-name" error={errors.name}>
                  <input id="l-name" className={inputCls(errors.name)} value={form.name} onChange={set('name')} placeholder="ex. Ana Popescu (fictiv)" autoComplete="off" />
                </Field>
                <Field label="E-mail *" htmlFor="l-email" error={errors.email}>
                  <input id="l-email" type="email" inputMode="email" className={inputCls(errors.email)} value={form.email} onChange={set('email')} placeholder="ana@exemplu.ro" autoComplete="off" />
                </Field>
                <Field label="Telefon (opțional)" htmlFor="l-phone" error={errors.phone}>
                  <input id="l-phone" type="tel" inputMode="tel" className={inputCls(errors.phone)} value={form.phone} onChange={set('phone')} placeholder="07xx xxx xxx" autoComplete="off" />
                </Field>
                <Field label="Data preferată pentru demonstrație *" htmlFor="l-date" error={errors.date}>
                  <input id="l-date" type="date" min={todayStr()} className={inputCls(errors.date)} value={form.date} onChange={set('date')} />
                </Field>
                <div>
                  <label className="flex items-start gap-3 text-sm text-slate-300">
                    <input type="checkbox" checked={form.consent} onChange={set('consent')} className="mt-0.5 h-5 w-5 shrink-0 accent-sky-400" />
                    Sunt de acord să fiu contactat(ă) în legătură cu această solicitare. *
                  </label>
                  {errors.consent && <p role="alert" className="mt-1 text-sm text-rose-400">{errors.consent}</p>}
                </div>
                <button type="submit" className="w-full rounded-xl bg-amber-400 py-4 font-semibold text-slate-950 transition hover:bg-amber-300">Trimite solicitarea</button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
