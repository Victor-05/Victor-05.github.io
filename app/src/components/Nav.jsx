import { Link, NavLink } from 'react-router-dom'
import { useLead } from '../lib/leadContext.js'

const linkCls = ({ isActive }) =>
  `rounded-full px-2.5 py-1.5 text-xs font-medium transition sm:px-3.5 sm:text-sm ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`

export default function Nav() {
  const { openLead } = useLead()
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-[#0b1220]/85 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-base font-bold text-white sm:text-lg" aria-label="Acasă">
          <img src="./favicon.svg" alt="" className="h-7 w-7" />
          <span className="hidden min-[400px]:inline">UR20</span><span className="hidden text-[#ff7a1a] sm:inline">·Cell</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          <NavLink to="/digital-twin" className={linkCls}>Digital Twin</NavLink>
          <NavLink to="/evaluator" className={linkCls}>Evaluator</NavLink>
          <button onClick={() => openLead({})} className="ml-1 rounded-full bg-[#ff7a1a] px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-[#ff9445] sm:px-4 sm:text-sm">
            <span className="sm:hidden">Solicită</span><span className="hidden sm:inline">Solicită evaluare</span>
          </button>
        </div>
      </nav>
    </header>
  )
}
