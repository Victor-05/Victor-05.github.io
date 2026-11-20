// Lazily loaded chunk: sticky R3F canvas + scroll-driven chapter panels (GSAP ScrollTrigger).
import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion } from 'framer-motion'
import { ChevronDown, MousePointer2 } from 'lucide-react'
import CellScene from './CellScene.jsx'
import { CHAPTERS } from '../components/story/chapters.js'
import Counter from '../components/story/Counter.jsx'
import EntryLinks from '../components/story/EntryLinks.jsx'

gsap.registerPlugin(ScrollTrigger)

function Panel({ c, i, interactive }) {
  const intro = i === 0
  const outro = c.id === 'outro'
  return (
    <div className={`flex h-svh px-4 ${intro ? 'items-end pb-24 sm:items-center sm:pb-0' : 'items-end pb-6 sm:items-center sm:pb-0'}`}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ amount: 0.55 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`pointer-events-auto mx-auto w-full max-w-7xl ${intro ? '' : ''}`}
      >
        <div className={intro ? 'max-w-2xl' : 'max-w-md rounded-2xl border border-white/10 bg-[#0b1220]/90 p-5 shadow-2xl shadow-black/40 sm:p-6'}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7a1a]">{c.kicker}</p>
          {intro
            ? <h1 className="mt-3 font-display text-4xl font-bold leading-[1.04] text-white [text-shadow:0_2px_30px_rgba(0,0,0,.6)] sm:text-6xl">{c.title}</h1>
            : <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-white sm:text-3xl">{c.title}</h2>}
          <p className={`mt-3 ${intro ? 'max-w-xl text-base text-slate-300 sm:text-lg [text-shadow:0_1px_12px_rgba(0,0,0,.8)]' : 'text-sm text-slate-400 sm:text-base'}`}>{c.text}</p>
          {c.counter && (
            <p className="mt-4 font-display text-5xl font-bold text-white"><Counter value={c.counter.value} suffix={c.counter.suffix} /><span className="mt-1 block text-sm font-normal text-slate-400">{c.counter.label}</span></p>
          )}
          {c.note && <p className="mt-3 text-xs text-slate-500">{c.note}</p>}
          {(intro || outro) && <div className="mt-6"><EntryLinks compact /></div>}
          {outro && interactive && <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MousePointer2 className="h-3.5 w-3.5" /> Trageți pentru a roti celula</p>}
          {intro && <p className="mt-8 flex items-center gap-1 text-xs text-slate-400"><ChevronDown className="h-4 w-4 animate-bounce" /> Derulați pentru povestea unei găleți</p>}
        </div>
      </motion.div>
    </div>
  )
}

export default function Story3D({ lowDetail, interactive }) {
  const wrap = useRef(null)
  const progress = useRef(0)
  const [visible, setVisible] = useState(true)
  const [chapter, setChapter] = useState(0)

  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: wrap.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.current = self.progress
        const c = Math.round(self.progress * (CHAPTERS.length - 1))
        setChapter((prev) => (prev === c ? prev : c))
      },
    })
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' })
    io.observe(wrap.current)
    return () => { st.kill(); io.disconnect() }
  }, [])

  return (
    <section ref={wrap} className="relative" data-testid="story-3d" aria-label="Povestea unei găleți">
      <div className="sticky top-0 h-svh w-full">
        <Canvas
          shadows={!lowDetail}
          dpr={[1, lowDetail ? 1.25 : 1.5]}
          frameloop={visible ? 'always' : 'never'}
          camera={{ fov: lowDetail ? 50 : 40, position: [5.6, 3.1, 6.2], near: 0.1, far: 60 }}
          gl={{ antialias: !lowDetail, powerPreference: 'high-performance' }}
          className={chapter === CHAPTERS.length - 1 && interactive ? 'cursor-grab active:cursor-grabbing' : ''}
          style={{ touchAction: 'pan-y' }}
        >
          <CellScene progressRef={progress} low={lowDetail} interactive={interactive} />
        </Canvas>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0b1220] to-transparent" />
        <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/70 to-transparent transition-opacity duration-700 sm:bg-gradient-to-r sm:via-[#0b1220]/40 ${chapter === 0 ? 'opacity-100' : 'opacity-0'}`} />
        <div aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
          {CHAPTERS.map((c, i) => <span key={c.id} className={`h-2 w-2 rounded-full transition ${i === chapter ? 'scale-125 bg-[#ff7a1a]' : 'bg-slate-600'}`} />)}
        </div>
      </div>
      <div className={`pointer-events-none relative -mt-[100svh] ${chapter === CHAPTERS.length - 1 ? '[&>*:last-child]:pointer-events-none' : ''}`}>
        {CHAPTERS.map((c, i) => <Panel key={c.id} c={c} i={i} interactive={interactive} />)}
      </div>
    </section>
  )
}
