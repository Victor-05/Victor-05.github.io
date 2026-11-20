import { MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-white">Tech-Con Industry</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            {['Dragomirești-Deal', 'Iași', 'Timișoara'].map((c) => (
              <span key={c} className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-sky-400" />{c}</span>
            ))}
          </p>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-slate-500">
          Prototip realizat pentru AI-Powered Business Challenge. Nu este un instrument oficial și nu reprezintă o ofertă tehnică sau comercială. Evaluarea este orientativă; compatibilitatea finală se stabilește doar printr-o evaluare tehnică. Folosiți doar date fictive.
        </p>
      </div>
    </footer>
  )
}
