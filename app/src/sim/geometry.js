// Pure geometry for the isometric cell view. World units: metres.
import { layerLayout } from './engine.js'

export const S = 62 // px per metre
export function iso(x, y, z = 0) {
  return [(x - y) * 0.866 * S, (x + y) * 0.5 * S - z * S]
}
export const pt = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`

export const BASE = { x: 0, y: 0 }
export const SHOULDER_Z = 0.62
export const L1 = 0.9
export const L2 = 0.85
export const TOOL = 0.22
export const CONVEYOR = { x0: -4.3, x1: 0.45, y: -1.3, z: 0.72, w: 0.56 }
export const PICK = { x: 0, y: -1.3 }
export const PALLET_Z = 0.15
export const STATIONS = [
  { cx: 1.35, cy: 0.3, w: 0.8, d: 1.2 }, // A
  { cx: -0.35, cy: 1.4, w: 1.2, d: 0.8 }, // B
]
export const ZONE = { x0: -1.7, x1: 2.35, y0: -2.05, y1: 2.35 }
export const SCANNERS = [
  { x: ZONE.x1, y: ZONE.y0 }, { x: ZONE.x1, y: ZONE.y1 }, { x: ZONE.x0, y: ZONE.y1 },
]

export const bucketSize = (kg) => (kg >= 10 ? { r: 0.15, h: 0.3 } : { r: 0.12, h: 0.22 })

export function slotPosition(stationIdx, k, perPallet, kg) {
  const st = STATIONS[stationIdx]
  const { perLayer, cols, rows } = layerLayout(perPallet)
  const layer = Math.floor(k / perLayer)
  const i = k % perLayer
  const c = i % cols
  const r = Math.floor(i / cols)
  const long = Math.max(st.w, st.d)
  const short = Math.min(st.w, st.d)
  const u = -long / 2 + (long / cols) * (c + 0.5)
  const v = -short / 2 + (short / rows) * (r + 0.5)
  const [dx, dy] = st.w >= st.d ? [u, v] : [v, u]
  return { x: st.cx + dx, y: st.cy + dy, z: PALLET_Z + layer * (bucketSize(kg).h + 0.02), layer }
}

const lerp = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * (3 - 2 * t)
function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * t
}

/** End-effector position (tool tip) for the robot snapshot at time now. */
export function toolPosition(snap) {
  const { robot: r, params, now, stations } = snap
  const b = bucketSize(params.weightKg)
  const hover = 0.28
  const pick = { x: PICK.x, y: PICK.y, z: CONVEYOR.z + b.h }
  const slotK = r.slot
  const slot0 = slotPosition(r.station, Math.min(slotK, params.perPallet - 1), params.perPallet, params.weightKg)
  const place = { x: slot0.x, y: slot0.y, z: slot0.z + b.h }
  let phase = r.phase
  let p = 0
  if (r.state === 'FAULT' && r.paused) { phase = r.paused.phase; p = r.paused.progress }
  else if (r.phase && r.state !== 'IDLE' && !r.state.startsWith('WAITING') && r.state !== 'FAULT') p = Math.min(1, Math.max(0, (now - r.phaseStart) / Math.max(1e-9, r.phaseEnd - r.phaseStart)))
  else phase = null
  void stations
  const dip = (P, t) => ({ ...P, z: P.z + hover * (1 - Math.sin(Math.PI * t)) })
  const travel = (A, B, t) => {
    const e = ease(t)
    const aA = Math.atan2(A.y, A.x), aB = Math.atan2(B.y, B.x)
    const rA = Math.hypot(A.x, A.y), rB = Math.hypot(B.x, B.y)
    const ang = lerpAngle(aA, aB, e)
    const rad = lerp(rA, rB, e)
    return { x: Math.cos(ang) * rad, y: Math.sin(ang) * rad, z: lerp(A.z, B.z, e) + hover + 0.35 * Math.sin(Math.PI * t) }
  }
  const up = (P) => ({ ...P, z: P.z + hover })
  let tool
  let holding = false
  let placedAtSlot = false
  switch (phase) {
    case 'PICKING': tool = dip(pick, p); holding = p >= 0.5; break
    case 'MOVING': tool = travel(pick, place, p); holding = true; break
    case 'PLACING': tool = dip(place, p); holding = p < 0.5; placedAtSlot = p >= 0.5; break
    case 'RETURNING': { const t = travel(place, pick, p); tool = t; break }
    default: tool = up(pick)
  }
  return { tool, holding, placedAtSlot, phase, progress: p, pickWaiting: phase === 'PICKING' && p < 0.5 }
}

/** Two-link IK in the vertical plane (elbow up). Returns world joints. */
export function armJoints(tool) {
  const yaw = Math.atan2(tool.y - BASE.y, tool.x - BASE.x)
  const r = Math.hypot(tool.x - BASE.x, tool.y - BASE.y)
  const wz = tool.z + TOOL - SHOULDER_Z
  let d = Math.hypot(r, wz)
  d = Math.min(d, L1 + L2 - 1e-3)
  d = Math.max(d, Math.abs(L1 - L2) + 1e-3)
  const a = Math.atan2(wz, r) + Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))
  const er = L1 * Math.cos(a)
  const ez = SHOULDER_Z + L1 * Math.sin(a)
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return {
    yaw,
    shoulder: { x: BASE.x, y: BASE.y, z: SHOULDER_Z },
    elbow: { x: BASE.x + er * c, y: BASE.y + er * s, z: ez },
    wrist: { x: tool.x, y: tool.y, z: tool.z + TOOL },
    tool,
  }
}
