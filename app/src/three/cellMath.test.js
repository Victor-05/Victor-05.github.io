import { describe, it, expect } from 'vitest'
import { solveIK, cyclePose, slot, PER_PALLET, PALLETS } from './cellMath.js'

describe('3D cell math', () => {
  it('every pallet slot is reachable by the stylised arm (tool hits target)', () => {
    for (let p = 0; p < PALLETS.length; p++) {
      for (let k = 0; k < PER_PALLET; k++) {
        const s = slot(p, k)
        const t = { x: s.x, y: s.y + 0.28 + 0.22, z: s.z } // hover above the top layer
        const { tool } = solveIK(t)
        expect(Math.hypot(tool.x - t.x, tool.y - t.y, tool.z - t.z)).toBeLessThan(1e-6)
      }
    }
  })
  it('cycle pose is continuous', () => {
    const dest = slot(0, 43)
    let prev = null, max = 0
    for (let i = 0; i <= 1000; i++) {
      const { target } = cyclePose(i / 1000, dest)
      if (prev) max = Math.max(max, Math.hypot(target.x - prev.x, target.y - prev.y, target.z - prev.z))
      prev = target
    }
    expect(max).toBeLessThan(0.05)
  })
})
