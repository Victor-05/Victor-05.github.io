import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Nav from './components/Nav.jsx'
import Footer from './components/Footer.jsx'
import LeadForm from './components/LeadForm.jsx'
import PrintReport from './components/twin/PrintReport.jsx'
import Landing from './pages/Landing.jsx'
import { LeadContext } from './lib/leadContext.js'
import { markStep } from './lib/guide.js'
import TestGuide from './components/TestGuide.jsx'

// Route-level code splitting: recharts/simulator only load on their pages.
const TwinPage = lazy(() => import('./pages/TwinPage.jsx'))
const EvaluatorPage = lazy(() => import('./pages/EvaluatorPage.jsx'))
const CrmPage = lazy(() => import('./pages/CrmPage.jsx'))
const Loading = () => <div className="min-h-svh pt-14" aria-busy="true" />

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
      {/* opacity only: transforms would break sticky/fixed children */}
      <motion.main key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
        <Suspense fallback={<Loading />}>
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/digital-twin" element={<TwinPage />} />
          <Route path="/evaluator" element={<EvaluatorPage />} />
          <Route path="/cereri" element={<CrmPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </motion.main>
    </AnimatePresence>
  )
}

export default function App() {
  const [lead, setLead] = useState({ open: false, values: null, result: null, simConfig: null, key: 0 })
  const [lastLead, setLastLead] = useState(null)
  const [printData, setPrintData] = useState(null)
  const openLead = useCallback(({ values = null, result = null, simConfig = null } = {}) => {
    setLead((l) => ({ open: true, values, result, simConfig, key: l.key + 1 }))
  }, [])
  const ctx = useMemo(() => ({ openLead, openPrint: setPrintData, lastLead }), [openLead, lastLead])
  return (
    <HashRouter>
      <LeadContext.Provider value={ctx}>
        <div className="min-h-screen overflow-x-clip bg-[#0b1220] font-sans">
          <Nav />
          <AnimatedRoutes />
          <Footer />
        </div>
        <LeadForm key={lead.key} open={lead.open} onClose={() => setLead((l) => ({ ...l, open: false }))} values={lead.values} result={lead.result} simConfig={lead.simConfig} onSubmitted={(l) => { setLastLead(l); if (l.simConfig) markStep(3) }} />
        <TestGuide />
        <PrintReport open={!!printData} onClose={() => setPrintData(null)} {...(printData ?? {})} leadId={lastLead?.id} />
      </LeadContext.Provider>
    </HashRouter>
  )
}
