import Hero from './components/Hero.jsx'
import HowItWorks from './components/HowItWorks.jsx'
import ReferenceCase from './components/ReferenceCase.jsx'
import Evaluator from './components/Evaluator.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b1220] font-sans">
      <Hero />
      <HowItWorks />
      <ReferenceCase />
      <Evaluator />
      <Footer />
    </div>
  )
}
