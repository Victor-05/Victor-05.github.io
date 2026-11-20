import { animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

export default function Counter({ value, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.6 })
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, value, { duration: 1.6, ease: 'easeOut', onUpdate: setV })
    return () => c.stop()
  }, [inView, value])
  return <span ref={ref} className="tabular-nums">{Math.round(v).toLocaleString('ro-RO')}{suffix}</span>
}
