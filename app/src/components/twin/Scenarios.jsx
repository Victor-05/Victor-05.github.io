import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from 'recharts'
import { GitCompareArrows } from 'lucide-react'
import { Card } from './Panels.jsx'
import { compareScenarios } from '../../sim/scenarios.js'
import { COMPONENT_RO } from '../../sim/insights.js'
import { fmtNum } from '../../sim/useSimulation.js'

const COLORS = { A: '#64748b', B: '#fbbf24', C: '#34d399' }

export default function Scenarios({ params }) {
  const [rows, setRows] = useState(null)
  return (
    <Card title="Comparație scenarii (schimb de 8 h)" icon={GitCompareArrows}
      right={<button onClick={() => setRows(compareScenarios(params))} className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300">{rows ? 'Recalculează' : 'Compară scenarii'}</button>}>
      {!rows ? (
        <p className="text-xs text-slate-400">Rulează 3 schimburi complete cu parametrii actuali: <strong className="text-slate-200">A</strong> actual, <strong className="text-amber-300">B</strong> doar robot mai rapid (ipotetic – peste rezultatul testat), <strong className="text-emerald-300">C</strong> optimizat (alimentare echilibrată cu robotul, schimbare palet ≤ 60 s, coadă ≥ 8).</p>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 16, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="id" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }} formatter={(v) => [fmtNum(v), 'Găleți / schimb']} labelFormatter={(l) => rows.find((r) => r.id === l)?.name} cursor={{ fill: '#1e293b' }} />
                <Bar dataKey="buckets" radius={[6, 6, 0, 0]} isAnimationActive>
                  {rows.map((r) => <Cell key={r.id} fill={COLORS[r.id]} />)}
                  <LabelList dataKey="buckets" position="top" fill="#e2e8f0" fontSize={11} formatter={(v) => fmtNum(v)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="text-slate-500"><tr><th className="py-1.5 font-medium">Scenariu</th><th className="font-medium">Găleți</th><th className="font-medium">Ritm</th><th className="font-medium">Țintă</th><th className="font-medium">Blocaj</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-800 text-slate-300">
                    <td className="py-1.5 pr-2" style={{ color: COLORS[r.id] }}>{r.name}</td>
                    <td className="tabular-nums">{fmtNum(r.buckets)}</td>
                    <td className="tabular-nums">{fmtNum(r.avgRate, 2)}/min</td>
                    <td className="tabular-nums">{fmtNum(r.targetPct, 0)}%</td>
                    <td>{COMPONENT_RO[r.bottleneck]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Robot mai rapid (B) față de actual: <strong className="text-amber-300">{rows[1].buckets - rows[0].buckets >= 0 ? '+' : ''}{fmtNum(rows[1].buckets - rows[0].buckets)} găleți/schimb</strong>.
            {' '}{Math.abs(rows[1].buckets - rows[0].buckets) < rows[0].buckets * 0.02 ? 'Practic fără efect: robotul nu este componenta care limitează.' : 'Robotul limita producția în scenariul actual.'}
          </p>
        </>
      )}
    </Card>
  )
}
