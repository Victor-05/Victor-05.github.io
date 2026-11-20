// Decide whether the 3D story can run. Pure-ish (reads browser APIs, guarded for tests).
export function detect3D() {
  const w = typeof window !== 'undefined' ? window : null
  if (!w) return { use3D: false, webgl: false, reduced: false, lowEnd: false, mobile: false }
  const mm = (q) => (typeof w.matchMedia === 'function' ? w.matchMedia(q).matches : false)
  const reduced = mm('(prefers-reduced-motion: reduce)')
  let webgl = false
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { webgl = false }
  // No core-count rule: iPhones may report few cores but handle the low-detail scene.
  const mem = navigator.deviceMemory // Chromium only
  const lowEnd = typeof mem === 'number' && mem < 4
  let forced = false
  try { forced = w.localStorage.getItem('force3d') === '1' } catch { forced = false }
  const mobile = mm('(max-width: 768px)') || mm('(pointer: coarse)')
  return { use3D: webgl && !reduced && (!lowEnd || forced), webgl, reduced, lowEnd, mobile, forced }
}
