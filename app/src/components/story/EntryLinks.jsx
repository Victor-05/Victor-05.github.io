import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, ClipboardCheck } from 'lucide-react'

export default function EntryLinks({ compact = false }) {
  const items = [
    { to: '/digital-twin', icon: Cpu, title: 'Digital Twin', text: 'Simulați celula live: blocaje, defecte, schimb complet de 8 h.', cls: 'bg-[#ff7a1a] text-slate-950 hover:bg-[#ff9445]' },
    { to: '/evaluator', icon: ClipboardCheck, title: 'Evaluator', text: 'Verificați în 2 minute dacă formatul dvs. seamănă cu aplicația testată.', cls: 'border border-slate-600 bg-[#0b1220] text-white hover:border-slate-400' },
  ]
  return (
    <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'md:grid-cols-2'}`}>
      {items.map(({ to, icon: Icon, title, text, cls }) => (
        <Link key={to} to={to} className={`group flex items-center gap-4 rounded-2xl px-5 py-4 transition ${cls}`}>
          <Icon className="h-7 w-7 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold">{title}</span>
            {!compact && <span className="block text-sm opacity-80">{text}</span>}
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  )
}
