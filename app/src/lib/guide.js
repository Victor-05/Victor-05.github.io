// In-app test guide state (localStorage) + navigation/highlight helper.
const KEY = 'ur20-guide'
export const GUIDE_EVENT = 'ur20-guide-update'

export function readGuide() {
  try { return { done: {}, hintSeen: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { done: {}, hintSeen: false } }
}
function write(g) {
  try { localStorage.setItem(KEY, JSON.stringify(g)) } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(GUIDE_EVENT))
}
export function markStep(n) {
  const g = readGuide()
  if (g.done[n]) return
  g.done[n] = true
  write(g)
}
export function setHintSeen() { const g = readGuide(); if (!g.hintSeen) { g.hintSeen = true; write(g) } }
export function resetGuide() { write({ done: {}, hintSeen: true }) }

/** Wait for the first *visible* element matching one of the selectors, scroll to it and pulse it. */
export function highlight(selectors, { focus = false, timeout = 4000 } = {}) {
  const t0 = Date.now()
  const find = () => {
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) return el
      }
    }
    return null
  }
  const tick = () => {
    const el = find()
    if (!el) { if (Date.now() - t0 < timeout) setTimeout(tick, 120); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('guide-pulse')
    void el.offsetWidth
    el.classList.add('guide-pulse')
    setTimeout(() => el.classList.remove('guide-pulse'), 3200)
    if (focus) setTimeout(() => el.focus({ preventScroll: true }), 400)
  }
  tick()
}
