// Pure math for the 3D story cell (no three.js imports -> unit-testable).
export const SH = 0.9 // shoulder height (m)
export const L1 = 1.1
export const L2 = 1.0
export const TOOL = 0.26
export const BELT_Y = 0.78
export const BELT_Z = -1.25
export const BUCKET = { rTop: 0.13, rBot: 0.115, h: 0.28 }
export const PICK = { x: 0, y: BELT_Y + BUCKET.h, z: BELT_Z }
export const PALLET_H = 0.15
export const PALLETS = [
  { x: 1.15, z: 0.1, w: 0.8, d: 1.2 }, // A: long side along z
  { x: -0.35, z: 1.15, w: 1.2, d: 0.8 }, // B: long side along x
]
export const PER_LAYER = 11
export const PER_PALLET = 44

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const smooth = (t) => { const x = clamp(t); return x * x * (3 - 2 * x) }
export const lerp = (a, b, t) => a + (b - a) * t

export function slot(pi, k) {
  const p = PALLETS[pi]
  const layer = Math.floor(k / PER_LAYER)
  const i = k % PER_LAYER
  const cols = 4, rows = 3
  const c = i % cols, r = Math.floor(i / cols)
  const long = Math.max(p.w, p.d), short = Math.min(p.w, p.d)
  const u = -long / 2 + (long / cols) * (c + 0.5)
  const v = -short / 2 + (short / rows) * (r + 0.5)
  const [dx, dz] = p.w >= p.d ? [u, v] : [v, u]
  return { x: p.x + dx, y: PALLET_H + layer * (BUCKET.h + 0.02), z: p.z + dz, layer }
}

/** Planar 2-link IK (elbow up) + yaw; returns joint angles and the reachable tool point. */
export function solveIK(t) {
  const yaw = Math.atan2(-t.z, t.x)
  const r = Math.hypot(t.x, t.z)
  const wy = t.y + TOOL - SH
  const d = clamp(Math.hypot(r, wy), 0.2, L1 + L2 - 1e-3)
  const base = Math.atan2(wy, r)
  const a1 = base + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
  const ex = L1 * Math.cos(a1), ey = L1 * Math.sin(a1)
  const wx = d * Math.cos(base), wyy = d * Math.sin(base)
  const a2 = Math.atan2(wyy - ey, wx - ex)
  const toolR = wx
  const tool = { x: toolR * Math.cos(yaw), y: wyy + SH - TOOL, z: -toolR * Math.sin(yaw) }
  return { yaw, a1, a2, tool }
}

function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  return a + d * t
}
function travel(A, B, t, lift) {
  const e = smooth(t)
  const aA = Math.atan2(A.z, A.x), aB = Math.atan2(B.z, B.x)
  const ang = lerpAngle(aA, aB, e)
  const rad = lerp(Math.hypot(A.x, A.z), Math.hypot(B.x, B.z), e)
  return { x: Math.cos(ang) * rad, y: lerp(A.y, B.y, e) + lift * Math.sin(Math.PI * t), z: Math.sin(ang) * rad }
}

/** Tool target for one pick->place cycle, u in [0,1]. */
export function cyclePose(u, dest, hover = 0.22) {
  const top = { ...dest, y: dest.y + BUCKET.h }
  const up = (P) => ({ ...P, y: P.y + hover })
  let target, holding
  if (u < 0.12) { target = { ...PICK, y: PICK.y + hover * (1 - smooth(u / 0.12)) }; holding = false }
  else if (u < 0.22) { target = { ...PICK, y: PICK.y + hover * smooth((u - 0.12) / 0.1) }; holding = true }
  else if (u < 0.6) { target = travel(up(PICK), up(top), (u - 0.22) / 0.38, 0.25); holding = true }
  else if (u < 0.72) { target = { ...top, y: top.y + hover * (1 - smooth((u - 0.6) / 0.12)) }; holding = true }
  else if (u < 0.82) { target = { ...top, y: top.y + hover * smooth((u - 0.72) / 0.1) }; holding = false }
  else { target = travel(up(top), up(PICK), (u - 0.82) / 0.18, 0.2); holding = false }
  return { target, holding, placed: u >= 0.72 }
}

export const HOME = { ...PICK, y: PICK.y + 0.22 }
