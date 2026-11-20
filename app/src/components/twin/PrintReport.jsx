import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { simConfigRows } from '../../sim/summary.js'
import { explainBottleneck } from '../../sim/insights.js'

const ASSUMPTIONS = (p) => [
  `Capacitate coadă conveior: ${p.queueCapacity} găleți [ipoteză]`,
  `Timp schimbare palet + separatoare: ${p.palletChangeTime} s [ipoteză]`,
  `Timp de reacție operator: 30 s la 100% disponibilitate; disponibilitate setată ${p.operatorAvailability}% [ipoteză]`,
  'Timp de transport pe conveior 6 s; timp minim de ciclu robot 5 s [ipoteză]',
  'Durata defectelor simulate este aleasă de utilizator [ipoteză]',
  'Ritmurile robotului pornesc de la rezultatele de test PURATOS (7,4 găleți/min la 13 kg; 8,6 la 5 kg) – rezultate de test, nu garanții',
  'Găletile sosite cu coada plină sunt considerate respinse (linia din amonte ar trebui oprită)',
]

const n = (v, d = 0) => Number(v).toLocaleString('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d })

export default function PrintReport({ open, onClose, config, report, params, scenarios, leadId }) {
  if (!open || !config) return null
  const b = explainBottleneck(report.stats)
  return createPortal(
    <div className="print-portal fixed inset-0 z-[60] overflow-y-auto bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Raport pentru directorul de investiții">
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] flex-wrap items-center justify-between gap-2">
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-300"><Printer className="h-4 w-4" /> Descarcă raport PDF</button>
        <button onClick={onClose} aria-label="Închide raportul" className="flex items-center gap-1 rounded-xl border border-slate-600 px-3 py-2.5 text-sm text-slate-200"><X className="h-4 w-4" /> Închide</button>
      </div>
      <article className="print-page mx-auto max-w-[210mm] bg-white p-6 text-[11px] leading-snug text-slate-900 shadow-2xl sm:p-[14mm]">
        <header className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-2">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Tech-Con Industry · Digital Twin UR20 · prototip</p>
            <h1 className="text-lg font-bold">Raport pentru directorul de investiții</h1>
            <p className="text-slate-600">Celulă de paletizare robotizată UR20 – rezultate simulate</p>
          </div>
          <div className="text-right text-[10px] text-slate-600">
            <p>{new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {leadId && <p className="mt-1 rounded border border-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">Ref. {leadId}</p>}
          </div>
        </header>

        <section className="mt-3 grid grid-cols-4 gap-2">
          {[
            ['Găleți / schimb simulat', n(config.buckets)],
            ['Paleți compleți', n(config.pallets)],
            ['Ritm mediu', `${n(config.avgRate, 2)}/min`],
            ['Realizare țintă 6/min', `${config.targetPct}%`],
          ].map(([k, v]) => (
            <div key={k} className="rounded border border-slate-300 p-2"><p className="text-[9px] text-slate-500">{k}</p><p className="text-base font-bold">{v}</p></div>
          ))}
        </section>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <section>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Configurație simulată</h2>
            <table className="w-full"><tbody>
              {simConfigRows(config).map(([k, v]) => <tr key={k} className="border-b border-slate-200"><td className="py-0.5 pr-2 text-slate-500">{k}</td><td className="py-0.5">{v}</td></tr>)}
              <tr className="border-b border-slate-200"><td className="py-0.5 pr-2 text-slate-500">Opriri (defecte)</td><td>{config.downtimeMin} min</td></tr>
              <tr className="border-b border-slate-200"><td className="py-0.5 pr-2 text-slate-500">Kg paletizate</td><td>{n(report.kg)} kg</td></tr>
            </tbody></table>
          </section>
          <section>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Blocaj principal</h2>
            <p className="font-bold">{b.label}</p>
            <p className="mt-0.5 text-slate-700">{b.why}</p>
            <p className="mt-1 text-slate-700"><strong>Acțiune:</strong> {b.action}</p>
            <table className="mt-2 w-full"><tbody>
              <tr className="border-b border-slate-200"><td className="py-0.5 text-slate-500">Utilizare robot</td><td className="text-right">{n(report.stats.robotUtil * 100)}%</td></tr>
              <tr className="border-b border-slate-200"><td className="py-0.5 text-slate-500">Utilizare conveior</td><td className="text-right">{n(report.stats.conveyorUtil * 100)}%</td></tr>
              <tr className="border-b border-slate-200"><td className="py-0.5 text-slate-500">Robot așteaptă găleți</td><td className="text-right">{n(report.stats.share.robotWaitBucket * 100)}%</td></tr>
              <tr className="border-b border-slate-200"><td className="py-0.5 text-slate-500">Robot așteaptă palet</td><td className="text-right">{n(report.stats.share.robotWaitPallet * 100)}%</td></tr>
            </tbody></table>
          </section>
        </div>

        {scenarios && (
          <section className="mt-3">
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Scenarii (schimb de 8 h, fără evenimente)</h2>
            <table className="w-full">
              <thead><tr className="border-b border-slate-900 text-left"><th className="py-0.5">Scenariu</th><th>Găleți</th><th>Ritm</th><th>Țintă</th><th>Blocaj</th></tr></thead>
              <tbody>{scenarios.map((r) => <tr key={r.id} className="border-b border-slate-200"><td className="py-0.5">{r.name}</td><td>{n(r.buckets)}</td><td>{n(r.avgRate, 2)}/min</td><td>{n(r.targetPct)}%</td><td>{r.bottleneckLabel}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        <div className="mt-3 grid grid-cols-2 gap-4">
          <section>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Ipoteze</h2>
            <ul className="list-disc space-y-0.5 pl-4 text-slate-700">{ASSUMPTIONS(params).map((a) => <li key={a}>{a}</li>)}</ul>
          </section>
          <section>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide">Pași următori</h2>
            <ol className="list-decimal space-y-0.5 pl-4 text-slate-700">
              <li><strong>Evaluare tehnică</strong> Tech-Con: format găleți, mâner, greutate cu gripper, ritmul real al liniei.</li>
              <li><strong>Demonstrație</strong> pe aplicația de referință sau pe date reale ale liniei.</li>
              <li><strong>Ofertă</strong> tehnică și comercială, după validare.</li>
            </ol>
            <p className="mt-2 text-slate-700">Rămân manuale: schimbarea paleților și a separatoarelor. Nu sunt incluse: transportul la logistică, înfolierea, expedierea.</p>
          </section>
        </div>

        <footer className="mt-3 border-t border-slate-300 pt-2 text-[9px] text-slate-500">
          Valori simulate pe baza rezultatelor de test ale unei singure aplicații și a ipotezelor de mai sus; nu reprezintă garanții de performanță și nu includ calcule financiare. Prototip demonstrativ realizat pentru AI-Powered Business Challenge – date fictive.
        </footer>
      </article>
    </div>,
    document.body,
  )
}
