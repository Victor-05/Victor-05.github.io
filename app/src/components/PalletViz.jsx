import { motion } from 'framer-motion'

const MAX_DRAWN = 120

// Illustrative top-down view of one pallet filling in. Not the real stacking pattern.
export default function PalletViz({ count, weightKg }) {
  const drawn = Math.min(count, MAX_DRAWN)
  const cols = Math.max(4, Math.ceil(Math.sqrt(drawn * 1.25)))
  const big = weightKg >= 10
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Palet completat</p>
        <p className="text-xs text-slate-500">{count} găleți × {weightKg} kg</p>
      </div>
      <div className="relative rounded-xl bg-[repeating-linear-gradient(90deg,#78350f_0,#78350f_14px,#92400e_14px,#92400e_28px)] p-2.5 shadow-inner">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: drawn }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.2, y: -18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 + i * Math.min(0.04, 2.4 / drawn), type: 'spring', stiffness: 380, damping: 22 }}
              className={`aspect-square rounded-full border ${big ? 'border-sky-200/70 bg-gradient-to-br from-sky-300 to-sky-600' : 'border-amber-100/70 bg-gradient-to-br from-amber-200 to-amber-500'} shadow-[inset_0_-3px_6px_rgba(0,0,0,.35)]`}
            >
              <div className="mx-auto mt-[22%] h-[12%] w-[60%] rounded-full bg-black/25" />
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Vizualizare ilustrativă (vedere de sus), nu schema reală de așezare.{count > MAX_DRAWN ? ` Afișate primele ${MAX_DRAWN}.` : ''}
      </p>
    </div>
  )
}
