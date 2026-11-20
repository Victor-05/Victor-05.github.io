import { memo } from 'react'
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts'
import { LineChart as Icon } from 'lucide-react'
import { Card } from './Panels.jsx'

const axis = { stroke: '#475569', fontSize: 10, tickLine: false }
const tip = { contentStyle: { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#94a3b8' } }

function Charts({ samples }) {
  const data = samples.slice(1).map((s) => ({ min: Math.round(s.t / 60), output: s.output, rate: +s.rate.toFixed(2), queue: s.queue, util: Math.round(s.robotUtil * 100) }))
  const thin = data.length > 240 ? data.filter((_, i) => i % Math.ceil(data.length / 240) === 0) : data
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="Producție în timp" icon={Icon}>
        <div className="h-44">
          {thin.length < 2 ? <p className="pt-14 text-center text-xs text-slate-500">Datele apar după primele minute simulate.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={thin} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="min" {...axis} unit="m" />
                <YAxis yAxisId="o" {...axis} />
                <YAxis yAxisId="r" orientation="right" {...axis} domain={[0, 12]} hide />
                <Tooltip {...tip} formatter={(v, n) => [v, n === 'output' ? 'Găleți cumulat' : 'Ritm (găleți/min)']} labelFormatter={(l) => `minutul ${l}`} />
                <Area yAxisId="o" type="monotone" dataKey="output" stroke="#38bdf8" fill="url(#g1)" strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="r" type="monotone" dataKey="rate" stroke="#fbbf24" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
      <Card title="Coadă conveior și utilizare robot" icon={Icon}>
        <div className="h-44">
          {thin.length < 2 ? <p className="pt-14 text-center text-xs text-slate-500">Datele apar după primele minute simulate.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={thin} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="min" {...axis} unit="m" />
                <YAxis yAxisId="q" {...axis} allowDecimals={false} />
                <YAxis yAxisId="u" orientation="right" {...axis} domain={[0, 100]} unit="%" width={36} />
                <Tooltip {...tip} formatter={(v, n) => (n === 'queue' ? [v, 'Coadă (găleți)'] : [`${v}%`, 'Utilizare robot'])} labelFormatter={(l) => `minutul ${l}`} />
                <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => (v === 'queue' ? 'Coadă' : 'Utilizare robot')} />
                <ReferenceLine yAxisId="u" y={100} stroke="#334155" />
                <Line yAxisId="q" type="stepAfter" dataKey="queue" stroke="#fbbf24" dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="u" type="monotone" dataKey="util" stroke="#34d399" dot={false} strokeWidth={1.5} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  )
}

export default memo(Charts, (a, b) => a.count === b.count && a.version === b.version)
