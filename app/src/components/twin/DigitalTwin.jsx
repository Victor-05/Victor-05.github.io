import { useState } from 'react'
import { Cpu, Play, Pause, FastForward } from 'lucide-react'
const SPEEDS = [1, 2, 5, 10, 20]
import { Section } from '../ui.jsx'
import CellView, { ROBOT_RO, CONV_RO, STATION_RO } from './CellView.jsx'
import Controls from './Controls.jsx'
import Events, { AlarmBanner } from './Events.jsx'
import Charts from './Charts.jsx'
import ShiftReport from './ShiftReport.jsx'
import Scenarios from './Scenarios.jsx'
import { buildSimConfig } from '../../sim/summary.js'
import { useLead } from '../../lib/leadContext.js'
import { FileText } from 'lucide-react'
import { Kpis, BottleneckPanel } from './Panels.jsx'
import { useSimulation, fmtClock } from '../../sim/useSimulation.js'

export default function DigitalTwin({ bare = false }) {
  const { sim, running, setRunning, speed, setSpeed, refresh, reset } = useSimulation()
  const [report, setReport] = useState(null)
  const [version, setVersion] = useState(0)
  const [scenarios, setScenarios] = useState(null)
  const { openLead, openPrint: openPrintView } = useLead()

  // Under 1 h simulated there is too little data: report a full shift run on a clone (live sim untouched).
  const baseSim = () => {
    if (sim.now >= 3600) return sim
    const c = sim.clone()
    c.runShift()
    return c
  }
  const sendConfig = () => {
    const s = baseSim()
    setReport(null)
    openLead({ simConfig: buildSimConfig(s) })
  }
  const openPrint = () => {
    const s = baseSim()
    const r = s.report()
    setReport(null)
    openPrintView({ report: r, config: buildSimConfig(s, r), params: { ...s.params }, scenarios })
  }
  const snap = sim.snapshot()

  const onParams = (patch, full = false) => {
    if (full) { reset({ ...sim.params, ...patch }); setVersion((v) => v + 1); return }
    sim.setParams(patch)
    refresh()
  }
  const onReset = () => { setRunning(false); reset(); setVersion((v) => v + 1) }
  const onShift = () => { setRunning(false); setReport(sim.runShift()); refresh() }
  const onTrigger = (kind, dur) => {
    sim.trigger(kind, dur)
    if (!running) setRunning(true)
    refresh()
    if (window.innerWidth < 1280) document.getElementById('twin-cell')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const onStep = () => { setRunning(false); sim.step(); refresh() }

  const stateChip = (label, value, tone) => (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone}`}>{label}: <strong>{value}</strong></span>
  )
  const rTone = snap.robot.state === 'FAULT' ? 'border-rose-500/50 text-rose-300' : snap.robot.state.startsWith('WAITING') ? 'border-amber-400/50 text-amber-300' : 'border-emerald-500/40 text-emerald-300'
  const cTone = snap.conveyor === 'FAULT' ? 'border-rose-500/50 text-rose-300' : snap.conveyor === 'BLOCKED' ? 'border-amber-400/50 text-amber-300' : 'border-sky-500/40 text-sky-300'

  return (
    <Section id="digital-twin" bare={bare} wide eyebrow="Digital Twin · simulare live" title="Celula de paletizare, simulată în timp real"
      intro="Modificați alimentarea, viteza robotului sau timpul de schimbare a paletului și vedeți imediat unde apare blocajul. Un robot mai rapid nu crește automat producția fabricii.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div id="twin-cell" className="relative scroll-mt-2 overflow-hidden rounded-3xl border border-slate-800 bg-[radial-gradient(ellipse_at_center,#0f1d33_0%,#070d18_75%)]">
            <div className="flex flex-wrap gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 font-mono text-xs text-slate-200"><Cpu className="h-3.5 w-3.5 text-sky-400" />{fmtClock(snap.now)} <span className="text-slate-500">· {speed}×</span></span>
              {stateChip('Robot', ROBOT_RO[snap.robot.state], rTone)}
              {stateChip('Conveior', running ? CONV_RO[snap.conveyor] : 'Oprit', cTone)}
              {snap.surge && stateChip('Alimentare', 'vârf ×2', 'border-sky-400/50 text-sky-300')}
            </div>
            <div className="aspect-[480/432] w-full max-h-[70vh] mx-auto">
              <CellView snap={snap} paused={!running} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-800/80 px-3 py-2 text-[10px] text-slate-500">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />activ</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400" />în lucru</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />așteptare / atenție</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />defect</span>
              <span>A: {STATION_RO[snap.stations[0].state]} · B: {STATION_RO[snap.stations[1].state]}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:hidden">
            <button onClick={() => setRunning(!running)} aria-label={running ? 'Pauză simulare' : 'Start simulare'} className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold ${running ? 'bg-amber-400 text-slate-950' : 'bg-emerald-400 text-slate-950'}`}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? 'Pauză' : 'Start'}</button>
            <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label="Schimbă viteza" className="rounded-xl border border-slate-700 py-3 text-sm font-semibold text-slate-200">{speed}× ⟳</button>
            <button onClick={onShift} aria-label="Schimb complet 8 h" className="flex items-center justify-center gap-1 rounded-xl bg-sky-400 py-3 text-xs font-semibold text-slate-950"><FastForward className="h-4 w-4" />Schimb 8 h</button>
          </div>
          <AlarmBanner sim={sim} />
          <Kpis sim={sim} />
          <Charts samples={sim.s.samples} count={sim.s.samples.length} version={version} />
          <Scenarios params={sim.params} rows={scenarios} setRows={setScenarios} onSend={sendConfig} />
          <button onClick={openPrint} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-400/5 py-3 text-sm font-semibold text-sky-300 hover:bg-sky-400/10"><FileText className="h-4 w-4" /> Raport pentru directorul de investiții</button>
        </div>
        <div className="min-w-0 space-y-3">
          <Controls sim={sim} running={running} setRunning={setRunning} speed={speed} setSpeed={setSpeed} onReset={onReset} onShift={onShift} onStep={onStep} onParams={onParams} />
          <Events sim={sim} onTrigger={onTrigger} />
          <BottleneckPanel sim={sim} />
        </div>
      </div>
      <p className="mt-4 text-[11px] text-slate-500">Model: simulare cu evenimente discrete, deterministă. Ritmurile robotului pornesc de la rezultatele de test (7,4 găleți/min la 13 kg, 8,6 la 5 kg), care nu reprezintă garanții. Valorile marcate [ipoteză] sunt presupuneri editabile. Schimbarea paleților și a separatoarelor rămâne manuală; transportul la logistică, înfolierea și expedierea nu sunt modelate.</p>
      <ShiftReport report={report} onClose={() => setReport(null)} onSend={sendConfig} onPrint={openPrint} />
    </Section>
  )
}
