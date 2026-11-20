import { useCallback, useMemo, useState } from 'react'
import Hero from './components/Hero.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import ReferenceCase from './components/ReferenceCase.jsx'
import Evaluator from './components/Evaluator.jsx'
import Footer from './components/Footer.jsx'
import DigitalTwin from './components/twin/DigitalTwin.jsx'
import LeadForm from './components/LeadForm.jsx'
import { LeadContext } from './lib/leadContext.js'

export default function App() {
  const [lead, setLead] = useState({ open: false, values: null, result: null, simConfig: null, key: 0 })
  const [lastLead, setLastLead] = useState(null)
  const openLead = useCallback(({ values = null, result = null, simConfig = null } = {}) => {
    setLead((l) => ({ open: true, values, result, simConfig, key: l.key + 1 }))
  }, [])
  const ctx = useMemo(() => ({ openLead, lastLead }), [openLead, lastLead])
  return (
    <LeadContext.Provider value={ctx}>
      <div className="min-h-screen overflow-x-hidden bg-[#0b1220] font-sans">
        <Hero />
        <DigitalTwin />
        <HowItWorks />
        <ReferenceCase />
        <Evaluator />
        <Footer />
      </div>
      <LeadForm key={lead.key} open={lead.open} onClose={() => setLead((l) => ({ ...l, open: false }))} values={lead.values} result={lead.result} simConfig={lead.simConfig} onSubmitted={setLastLead} />
    </LeadContext.Provider>
  )
}
