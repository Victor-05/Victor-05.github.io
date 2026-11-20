import { useCallback, useEffect, useRef, useState } from 'react'
import { Simulation, defaultParams } from './engine.js'

// React adapter: the engine owns all state; rAF advances virtual time by
// realDt * speed and triggers a re-render from the engine snapshot.
export function useSimulation(initial = defaultParams(13)) {
  const simRef = useRef(null)
  if (!simRef.current) simRef.current = new Simulation(initial)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [, setFrame] = useState(0)
  const refresh = useCallback(() => setFrame((f) => (f + 1) % 1e9), [])

  useEffect(() => {
    if (!running) return
    let raf
    let last = performance.now()
    const loop = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      simRef.current.advance(dt * speed)
      refresh()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, speed, refresh])

  const reset = useCallback((params) => {
    simRef.current = new Simulation(params ?? simRef.current.params)
    refresh()
  }, [refresh])

  return { sim: simRef.current, running, setRunning, speed, setSpeed, refresh, reset }
}

export function fmtClock(sec) {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
export const fmtNum = (n, d = 0) => Number(n).toLocaleString('ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d })
export function fmtDur(sec) {
  if (sec < 60) return `${Math.round(sec)} s`
  const m = Math.floor(sec / 60), s = Math.round(sec % 60)
  if (m < 60) return s ? `${m} min ${s} s` : `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}
