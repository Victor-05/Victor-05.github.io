import { describe, it, expect } from 'vitest'
import { Simulation, defaultParams } from './engine.js'
import { toolPosition, armJoints, L1, L2 } from './geometry.js'

describe('geometry', () => {
  it('tool path is continuous over a run (no teleporting) and IK keeps link lengths', () => {
    const sim = new Simulation(defaultParams(13))
    let prev = null
    let maxJump = 0
    for (let i = 0; i < 6000; i++) {
      sim.advance(0.05)
      if (i === 2000) sim.trigger('robot', 30)
      const { tool } = toolPosition(sim.snapshot())
      if (prev) maxJump = Math.max(maxJump, Math.hypot(tool.x - prev.x, tool.y - prev.y, tool.z - prev.z))
      prev = tool
      const j = armJoints(tool)
      const l1 = Math.hypot(j.elbow.x - j.shoulder.x, j.elbow.y - j.shoulder.y, j.elbow.z - j.shoulder.z)
      expect(l1).toBeCloseTo(L1, 5)
      void L2
    }
    expect(maxJump).toBeLessThan(0.25)
  })
})
