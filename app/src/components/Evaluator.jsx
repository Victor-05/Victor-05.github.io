import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { Sparkles, RotateCcw, ClipboardCheck, AlertCircle } from 'lucide-react'
import { Section, Field, inputCls, Segmented } from './ui.jsx'
import Results from './Results.jsx'
import { useLead } from '../lib/leadContext.js'
import { validateInputs, evaluate, defaultBucketsPerPallet, DEMO_INPUT } from '../lib/evaluate.js'

const EMPTY = { companyName: '', weightKg: '', bucketsPerPallet: '', hasHandle: '', material: '', lineRate: '', shifts: '', hoursPerShift: '8' }

export default function Evaluator() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [out, setOut] = useState(null)
  const { openLead } = useLead()
  const resultsRef = useRef(null)

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }
  const onInput = (k) => (e) => update(k, e.target.value)
  const autoPallet = defaultBucketsPerPallet(form.weightKg)

  const submit = (e) => {
    e.preventDefault()
    const { errors: errs, values } = validateInputs(form)
    setErrors(errs)
    if (!values) {
      setOut(null)
      setTimeout(() => document.querySelector('form [role="alert"]')?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }
    setOut({ values, result: evaluate(values), key: Date.now() })
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const errorCount = Object.values(errors).filter(Boolean).length

  return (
    <Section id="evaluator" eyebrow="Instrument" title="Evaluator de compatibilitate UR20" intro="Introduceți datele liniei. Comparăm cu aplicația de referință și estimăm ce ar putea paletiza celula pe zi.">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <motion.form onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="h-fit space-y-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur sm:p-7 lg:sticky lg:top-6">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setForm(DEMO_INPUT); setErrors({}) }} className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-3.5 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-400/20">
              <Sparkles className="h-4 w-4" /> Completează exemplu
            </button>
            <button type="button" onClick={() => { setForm(EMPTY); setErrors({}); setOut(null) }} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3.5 py-2 text-sm text-slate-400 transition hover:text-white">
              <RotateCcw className="h-4 w-4" /> Resetează
            </button>
          </div>

          <Field label="Numele companiei *" htmlFor="companyName" error={errors.companyName} hint="Folosiți un nume fictiv.">
            <input id="companyName" className={inputCls(errors.companyName)} value={form.companyName} onChange={onInput('companyName')} placeholder="ex. Exemplu Ingrediente SRL (fictiv)" autoComplete="off" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Greutate (kg) *" htmlFor="weightKg" error={errors.weightKg} hint="Testat: 5 sau 13 kg">
              <input id="weightKg" inputMode="decimal" className={inputCls(errors.weightKg)} value={form.weightKg} onChange={onInput('weightKg')} placeholder="13" />
            </Field>
            <Field label={`Găleți / palet${autoPallet ? '' : ' *'}`} htmlFor="bucketsPerPallet" error={errors.bucketsPerPallet} hint={autoPallet ? `Implicit: ${autoPallet} (ca la referință)` : 'Obligatoriu pentru alte formate'}>
              <input id="bucketsPerPallet" inputMode="numeric" className={inputCls(errors.bucketsPerPallet)} value={form.bucketsPerPallet} onChange={onInput('bucketsPerPallet')} placeholder={autoPallet ? String(autoPallet) : 'ex. 60'} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Găleata are mâner? *" error={errors.hasHandle}>
              <Segmented name="hasHandle" value={form.hasHandle} onChange={(v) => update('hasHandle', v)} error={errors.hasHandle} options={[{ value: 'da', label: 'Da' }, { value: 'nu', label: 'Nu' }]} />
            </Field>
            <Field label="Material ambalaj *" error={errors.material}>
              <Segmented name="material" value={form.material} onChange={(v) => update('material', v)} error={errors.material} options={[{ value: 'plastic', label: 'Plastic' }, { value: 'altul', label: 'Altul' }]} />
            </Field>
          </div>

          <Field label="Ritmul liniei de umplere (găleți/min) *" htmlFor="lineRate" error={errors.lineRate} hint="Câte găleți livrează linia pe minut, în medie.">
            <input id="lineRate" inputMode="decimal" className={inputCls(errors.lineRate)} value={form.lineRate} onChange={onInput('lineRate')} placeholder="ex. 6,5" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Schimburi / zi *" error={errors.shifts}>
              <Segmented name="shifts" value={form.shifts} onChange={(v) => update('shifts', v)} error={errors.shifts} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            </Field>
            <Field label="Ore / schimb" htmlFor="hoursPerShift" error={errors.hoursPerShift} hint="Implicit 8">
              <input id="hoursPerShift" inputMode="decimal" className={inputCls(errors.hoursPerShift)} value={form.hoursPerShift} onChange={onInput('hoursPerShift')} placeholder="8" />
            </Field>
          </div>

          <AnimatePresence>
            {errorCount > 0 && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" /> Verificați {errorCount === 1 ? 'câmpul marcat' : `cele ${errorCount} câmpuri marcate`}.
              </motion.p>
            )}
          </AnimatePresence>

          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-400 px-6 py-4 font-semibold text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-300 active:scale-[0.99]">
            <ClipboardCheck className="h-5 w-5" /> Evaluează compatibilitatea
          </button>
        </motion.form>

        <div ref={resultsRef} className="scroll-mt-6">
          <AnimatePresence mode="wait">
            {out ? (
              <Results key={out.key} result={out.result} values={out.values} onRequest={() => openLead({ values: out.values, result: out.result })} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 p-8 text-center">
                <div className="mb-4 grid grid-cols-4 gap-1.5 opacity-40">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div key={i} className="h-6 w-6 rounded-full bg-slate-600" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.12 }} />
                  ))}
                </div>
                <p className="font-display text-lg font-semibold text-slate-300">Rezultatele apar aici</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">Completați formularul sau apăsați „Completează exemplu” pentru un caz demonstrativ.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}
