// Procedural 3D cell for the scroll story ("the life of a bucket").
// Everything is built from primitives; one director useFrame drives camera,
// robot, counts and lights from the smoothed scroll progress.
import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  SH, L1, L2, TOOL, BELT_Y, BELT_Z, BUCKET, PICK, PALLETS, PALLET_H, PER_PALLET, PER_LAYER,
  clamp, smooth, lerp, slot, solveIK, cyclePose, HOME,
} from './cellMath.js'

const ORANGE = '#ff7a1a'
const STEEL = '#d8e0ea'
const NAVY = '#1d2f49'
const N_CH = 6 // chapters 0..6

// ---------- shared geometry / materials ----------
function useKit(low) {
  return useMemo(() => {
    const seg = low ? 14 : 28
    const g = {
      bucket: new THREE.CylinderGeometry(BUCKET.rTop, BUCKET.rBot, BUCKET.h, seg),
      lid: new THREE.CylinderGeometry(BUCKET.rTop * 1.04, BUCKET.rTop * 1.04, 0.025, seg),
      handle: new THREE.TorusGeometry(BUCKET.rTop * 0.95, 0.008, 6, low ? 12 : 20, Math.PI),
    }
    g.bucket.translate(0, BUCKET.h / 2, 0)
    g.lid.translate(0, BUCKET.h + 0.012, 0)
    g.handle.translate(0, BUCKET.h + 0.02, 0)
    const m = {
      bucket: new THREE.MeshStandardMaterial({ color: '#f7f9fb', roughness: 0.6, metalness: 0 }),
      lid: new THREE.MeshStandardMaterial({ color: '#2b7bd6', roughness: 0.4 }),
      handle: new THREE.MeshStandardMaterial({ color: '#8a96a6', roughness: 0.3, metalness: 0.6 }),
      handleGlow: new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 2.5 }),
      steel: new THREE.MeshStandardMaterial({ color: STEEL, roughness: 0.28, metalness: 0.65 }),
      orange: new THREE.MeshStandardMaterial({ color: ORANGE, roughness: 0.35, metalness: 0.2, emissive: ORANGE, emissiveIntensity: 0.15 }),
      dark: new THREE.MeshStandardMaterial({ color: '#141b28', roughness: 0.6, metalness: 0.4 }),
      navy: new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.5, metalness: 0.3 }),
      wood: new THREE.MeshStandardMaterial({ color: '#a87b4f', roughness: 0.9 }),
      woodDark: new THREE.MeshStandardMaterial({ color: '#6e5236', roughness: 0.95 }),
      belt: new THREE.MeshStandardMaterial({ color: '#1a2230', roughness: 0.85 }),
      sheet: new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.95 }),
      silhouette: new THREE.MeshStandardMaterial({ color: '#24364f', roughness: 0.7, emissive: '#ff7a1a', emissiveIntensity: 0.05 }),
    }
    return { g, m, seg }
  }, [low])
}

function Bucket({ kit, glow = false, ...props }) {
  return (
    <group {...props}>
      <mesh geometry={kit.g.bucket} material={kit.m.bucket} castShadow />
      <mesh geometry={kit.g.lid} material={kit.m.lid} />
      <mesh geometry={kit.g.handle} material={glow ? kit.m.handleGlow : kit.m.handle} />
    </group>
  )
}

// ---------- pallets with instanced bucket stacks ----------
function Pallet({ kit, p }) {
  const slats = []
  const along = p.w >= p.d ? 'x' : 'z'
  const long = Math.max(p.w, p.d), short = Math.min(p.w, p.d)
  for (let i = 0; i < 5; i++) {
    const o = -short / 2 + (short / 5) * (i + 0.5)
    slats.push(along === 'x'
      ? <mesh key={`s${i}`} position={[0, PALLET_H - 0.012, o]} material={kit.m.wood} castShadow receiveShadow><boxGeometry args={[long, 0.022, short / 5 - 0.03]} /></mesh>
      : <mesh key={`s${i}`} position={[o, PALLET_H - 0.012, 0]} material={kit.m.wood} castShadow receiveShadow><boxGeometry args={[short / 5 - 0.03, 0.022, long]} /></mesh>)
  }
  const blocks = []
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const x = along === 'x' ? a * (long / 2 - 0.07) : b * (short / 2 - 0.07)
    const z = along === 'x' ? b * (short / 2 - 0.07) : a * (long / 2 - 0.07)
    blocks.push(<mesh key={`b${a}${b}`} position={[x, 0.065, z]} material={kit.m.woodDark} castShadow><boxGeometry args={[0.14, 0.09, 0.14]} /></mesh>)
  }
  return (
    <group position={[p.x, 0, p.z]}>
      {slats}
      {blocks}
      <mesh position={[0, 0.01, 0]} material={kit.m.woodDark}><boxGeometry args={[p.w, 0.02, p.d]} /></mesh>
    </group>
  )
}

function Stack({ kit, pi, countRef }) {
  const body = useRef(), lid = useRef(), handle = useRef()
  const sheets = useRef([])
  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    for (let k = 0; k < PER_PALLET; k++) {
      const s = slot(pi, k)
      m.makeRotationY(((k * 37) % 360) * (Math.PI / 180) * 0.15 + (pi ? Math.PI / 2 : 0))
      m.setPosition(s.x, s.y, s.z)
      for (const r of [body, lid, handle]) r.current.setMatrixAt(k, m)
    }
    for (const r of [body, lid, handle]) { r.current.instanceMatrix.needsUpdate = true; r.current.count = 0 }
  }, [pi])
  useFrame(() => {
    const n = Math.round(countRef.current[pi])
    for (const r of [body, lid, handle]) r.current.count = n
    sheets.current.forEach((sh, i) => { if (sh) sh.visible = n >= (i + 1) * PER_LAYER && n < PER_PALLET + 1 && i < 3 })
  })
  const p = PALLETS[pi]
  return (
    <group>
      <instancedMesh ref={body} args={[kit.g.bucket, kit.m.bucket, PER_PALLET]} castShadow />
      <instancedMesh ref={lid} args={[kit.g.lid, kit.m.lid, PER_PALLET]} />
      <instancedMesh ref={handle} args={[kit.g.handle, kit.m.handle, PER_PALLET]} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (sheets.current[i] = el)} position={[p.x, PALLET_H + (i + 1) * (BUCKET.h + 0.02) - 0.006, p.z]} material={kit.m.sheet} visible={false}>
          <boxGeometry args={[p.w - 0.02, 0.006, p.d - 0.02]} />
        </mesh>
      ))}
    </group>
  )
}

// ---------- cobot ----------
function Joint({ kit, r, len, ring = true }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh material={kit.m.steel} castShadow><cylinderGeometry args={[r, r, len, kit.seg]} /></mesh>
      {ring && <mesh material={kit.m.orange}><cylinderGeometry args={[r * 1.03, r * 1.03, len * 0.22, kit.seg]} /></mesh>}
      <mesh material={kit.m.dark} position={[0, len / 2 + 0.004, 0]}><cylinderGeometry args={[r * 0.7, r * 0.7, 0.01, kit.seg]} /></mesh>
    </group>
  )
}

function Link({ kit, len, r, z = 0 }) {
  return (
    <mesh position={[len / 2, 0, z]} rotation={[0, 0, -Math.PI / 2]} material={kit.m.steel} castShadow>
      <cylinderGeometry args={[r, r * 1.08, len, kit.seg]} />
    </mesh>
  )
}

function Robot({ kit, rig }) {
  return (
    <group>
      {/* pedestal + base */}
      <mesh position={[0, 0.3, 0]} material={kit.m.navy} castShadow receiveShadow><cylinderGeometry args={[0.2, 0.26, 0.6, kit.seg]} /></mesh>
      <mesh position={[0, 0.605, 0]} material={kit.m.orange}><cylinderGeometry args={[0.205, 0.205, 0.012, kit.seg]} /></mesh>
      <group ref={rig.base}>
        <mesh position={[0, 0.68, 0]} material={kit.m.steel} castShadow><cylinderGeometry args={[0.13, 0.15, 0.16, kit.seg]} /></mesh>
        <group position={[0, SH, 0]} ref={rig.shoulder}>
          <Joint kit={kit} r={0.12} len={0.26} />
          <group position={[0, 0, 0.13]}>
            <Link kit={kit} len={L1} r={0.075} />
          </group>
          <group position={[L1, 0, 0]} ref={rig.elbow}>
            <group position={[0, 0, 0.13]}><Joint kit={kit} r={0.1} len={0.22} /></group>
            <Link kit={kit} len={L2} r={0.06} />
            <group position={[L2, 0, 0]} ref={rig.wrist}>
              <Joint kit={kit} r={0.07} len={0.16} ring={false} />
              {/* wrist 2/3 + flange, pointing along local +X (down after wrist rotation) */}
              <mesh position={[0.08, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={kit.m.steel}><cylinderGeometry args={[0.06, 0.06, 0.12, kit.seg]} /></mesh>
              <mesh position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={kit.m.orange}><cylinderGeometry args={[0.065, 0.065, 0.02, kit.seg]} /></mesh>
              {/* custom pneumatic gripper */}
              <mesh position={[0.2, 0, 0]} material={kit.m.dark} castShadow><boxGeometry args={[0.08, 0.2, 0.14]} /></mesh>
              <mesh ref={rig.fingerA} position={[TOOL - 0.02, 0.07, 0]} material={kit.m.steel}><boxGeometry args={[0.06, 0.018, 0.1]} /></mesh>
              <mesh ref={rig.fingerB} position={[TOOL - 0.02, -0.07, 0]} material={kit.m.steel}><boxGeometry args={[0.06, 0.018, 0.1]} /></mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

// ---------- conveyor, gantry, vision ----------
function Conveyor({ kit, beltBuckets, scanRef, coneRef }) {
  const len = 6.6, x0 = -6.1
  return (
    <group>
      <mesh position={[x0 + len / 2, BELT_Y - 0.06, BELT_Z]} material={kit.m.dark} castShadow receiveShadow><boxGeometry args={[len, 0.12, 0.62]} /></mesh>
      <mesh position={[x0 + len / 2, BELT_Y - 0.002, BELT_Z]} material={kit.m.belt} receiveShadow><boxGeometry args={[len, 0.01, 0.52]} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[x0 + len / 2, BELT_Y + 0.02, BELT_Z + s * 0.3]} material={kit.m.steel}><boxGeometry args={[len, 0.05, 0.025]} /></mesh>)}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={i} position={[x0 + 0.4 + i * 1.2, (BELT_Y - 0.12) / 2, BELT_Z]} material={kit.m.navy} castShadow><boxGeometry args={[0.08, BELT_Y - 0.12, 0.5]} /></mesh>
      ))}
      {beltBuckets.map((r, i) => <group key={i} ref={r}><Bucket kit={kit} /></group>)}
      {/* camera gantry */}
      {[-1, 1].map((s) => <mesh key={s} position={[0, 1.15, BELT_Z + s * 0.48]} material={kit.m.navy} castShadow><boxGeometry args={[0.06, 2.3, 0.06]} /></mesh>)}
      <mesh position={[0, 2.3, BELT_Z]} material={kit.m.navy}><boxGeometry args={[0.08, 0.08, 1.02]} /></mesh>
      <mesh position={[0, 2.2, BELT_Z]} material={kit.m.dark}><boxGeometry args={[0.16, 0.12, 0.12]} /></mesh>
      <mesh position={[0, 2.13, BELT_Z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 0.02, 16]} /><meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={3} /></mesh>
      <mesh ref={coneRef} position={[0, (2.13 + BELT_Y + BUCKET.h) / 2, BELT_Z]}>
        <coneGeometry args={[0.36, 2.13 - BELT_Y - BUCKET.h, 32, 1, true]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={scanRef} position={[0, BELT_Y + BUCKET.h + 0.03, BELT_Z]}>
        <boxGeometry args={[0.012, 0.004, 0.5]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

// ---------- safety scanners ----------
const ZONE = { x0: -1.9, x1: 2.45, z0: -2.3, z1: 2.4 }
function Safety({ fans }) {
  const corners = [
    { x: ZONE.x1, z: ZONE.z0, a: Math.PI / 2 },
    { x: ZONE.x1, z: ZONE.z1, a: Math.PI },
    { x: ZONE.x0, z: ZONE.z1, a: -Math.PI / 2 },
  ]
  const edges = [
    [(ZONE.x0 + ZONE.x1) / 2, ZONE.z0, ZONE.x1 - ZONE.x0, 0.02], [(ZONE.x0 + ZONE.x1) / 2, ZONE.z1, ZONE.x1 - ZONE.x0, 0.02],
    [ZONE.x0, (ZONE.z0 + ZONE.z1) / 2, 0.02, ZONE.z1 - ZONE.z0], [ZONE.x1, (ZONE.z0 + ZONE.z1) / 2, 0.02, ZONE.z1 - ZONE.z0],
  ]
  return (
    <group>
      {edges.map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.004, z]}><boxGeometry args={[w, 0.004, d]} /><meshBasicMaterial color="#fbbf24" transparent opacity={0.55} /></mesh>
      ))}
      {corners.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <mesh position={[0, 0.09, 0]}><boxGeometry args={[0.14, 0.18, 0.14]} /><meshStandardMaterial color="#141b28" emissive="#fbbf24" emissiveIntensity={0.4} /></mesh>
          <mesh ref={fans[i]} rotation={[-Math.PI / 2, 0, c.a]} position={[0, 0.012, 0]}>
            <circleGeometry args={[2.6, 40, 0, Math.PI / 2]} />
            <meshBasicMaterial color="#ffb020" transparent opacity={0.03} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ---------- manual-lifting silhouette ----------
function Worker({ kit, rig }) {
  return (
    <group position={[-3.5, 0, 1.6]} rotation={[0, 0.9, 0]} ref={rig.root}>
      {[-0.1, 0.1].map((x) => <mesh key={x} position={[x, 0.42, 0]} material={kit.m.silhouette}><capsuleGeometry args={[0.065, 0.7, 4, 10]} /></mesh>)}
      <group position={[0, 0.85, 0]} ref={rig.torso}>
        <mesh position={[0, 0.3, 0]} material={kit.m.silhouette} castShadow><capsuleGeometry args={[0.16, 0.42, 4, 12]} /></mesh>
        <mesh position={[0, 0.72, 0]} material={kit.m.silhouette}><sphereGeometry args={[0.11, 16, 12]} /></mesh>
        <mesh position={[0, 0.79, 0]} material={kit.m.orange}><sphereGeometry args={[0.115, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        {[-0.2, 0.2].map((x) => <mesh key={x} position={[x, 0.2, 0.18]} rotation={[1.2, 0, 0]} material={kit.m.silhouette}><capsuleGeometry args={[0.05, 0.42, 4, 8]} /></mesh>)}
        <group ref={rig.carry} position={[0, -0.1, 0.42]}><Bucket kit={kit} /></group>
      </group>
      {/* pile of buckets waiting */}
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <Bucket key={`${r}${c}`} kit={kit} position={[-0.6 + c * 0.29, 0, -0.5 - r * 0.29 + (c % 2) * 0.05]} />
      )))}
      {[0, 1].map((c) => <Bucket key={`t${c}`} kit={kit} position={[-0.45 + c * 0.29, BUCKET.h + 0.02, -0.65]} />)}
    </group>
  )
}

// ---------- dust ----------
function Dust({ count }) {
  const ref = useRef()
  const { positions, speeds } = useMemo(() => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = -4 + rnd() * 8
      positions[i * 3 + 1] = rnd() * 3.6
      positions[i * 3 + 2] = -3 + rnd() * 6
      speeds[i] = 0.02 + rnd() * 0.05
    }
    return { positions, speeds }
  }, [count])
  useFrame((_, dt) => {
    const a = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      let y = a.array[i * 3 + 1] + speeds[i] * dt
      if (y > 3.6) y = 0
      a.array[i * 3 + 1] = y
      a.array[i * 3] += Math.sin(y * 3 + i) * 0.0008
    }
    a.needsUpdate = true
  })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial size={0.022} color="#ffd9b0" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

// ---------- camera keys (position + target), interpolated around the cell ----------
const KEYS = [
  { f: 0, p: [5.6, 3.1, 6.2], t: [0.2, 0.9, 0] },
  { f: 1, p: [-0.9, 1.9, 4.9], t: [-3.4, 0.9, 1.0] },
  { f: 1.6, p: [-5.6, 1.7, 0.5], t: [-2.8, 0.85, -1.25] },
  { f: 2.35, p: [-1.4, 1.75, 0.35], t: [0, 1.0, -1.25] },
  { f: 3, p: [2.9, 2.3, 2.5], t: [0.3, 1.0, -0.3] },
  { f: 4, p: [-3.3, 3.5, 4.7], t: [0.4, 0.5, 0.6] },
  { f: 5, p: [3.2, 7.2, 3.6], t: [0.3, 0, 0.1] },
  { f: 6, p: [7.6, 4.6, 8.0], t: [0, 0.8, 0] },
]
const v3 = (a) => new THREE.Vector3(...a)
function cameraAt(f, outP, outT) {
  let i = 0
  while (i < KEYS.length - 2 && f > KEYS[i + 1].f) i++
  const A = KEYS[i], B = KEYS[i + 1]
  const t = smooth((f - A.f) / (B.f - A.f))
  // cylindrical interpolation around the cell centre -> orbit-like moves
  const pa = v3(A.p), pb = v3(B.p)
  const aa = Math.atan2(pa.z, pa.x), ab = Math.atan2(pb.z, pb.x)
  let d = ab - aa
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  const ang = aa + d * t
  const r = lerp(Math.hypot(pa.x, pa.z), Math.hypot(pb.x, pb.z), t)
  outP.set(Math.cos(ang) * r, lerp(pa.y, pb.y, t), Math.sin(ang) * r)
  outT.copy(v3(A.t)).lerp(v3(B.t), t)
}

export default function CellScene({ progressRef, low, interactive }) {
  const kit = useKit(low)
  const { camera, size } = useThree()
  const aspect = size.width / size.height
  const pull = aspect < 1 ? 1 + (1 - aspect) * 0.7 : 1
  useLayoutEffect(() => {
    if (aspect < 1) camera.setViewOffset(size.width, size.height, 0, size.height * 0.2, size.width, size.height)
    else camera.setViewOffset(size.width, size.height, -size.width * 0.16, 0, size.width, size.height) // subject right of the text panels
    camera.updateProjectionMatrix()
  }, [camera, size, aspect])
  const rig = { base: useRef(), shoulder: useRef(), elbow: useRef(), wrist: useRef(), fingerA: useRef(), fingerB: useRef() }
  const worker = { root: useRef(), torso: useRef(), carry: useRef() }
  const held = useRef()
  const beltBuckets = useMemo(() => Array.from({ length: 8 }, () => ({ current: null })), [])
  const scanRef = useRef(), coneRef = useRef()
  const fans = [useRef(), useRef(), useRef()]
  const counts = useRef([0, 0])
  const orbit = useRef()
  const st = useRef({ f: 0, p: new THREE.Vector3(), t: new THREE.Vector3(), look: new THREE.Vector3(0, 0.9, 0), init: false })
  const keyLight = useRef()

  useFrame((state, dt) => {
    const s = st.current
    const target = clamp(progressRef.current) * N_CH
    s.f = s.init ? s.f + (target - s.f) * (1 - Math.exp(-dt * 5)) : target
    const f = s.f
    const time = state.clock.elapsedTime

    // camera (+ subtle mouse parallax); hand over to OrbitControls at the very end on desktop
    const orbitOn = interactive && f > 5.85
    if (orbit.current) orbit.current.enabled = orbitOn
    if (!orbitOn) {
      cameraAt(f, s.p, s.t)
      if (pull !== 1) s.p.sub(s.t).multiplyScalar(pull).add(s.t)
      s.p.x += state.pointer.x * 0.35
      s.p.y += state.pointer.y * 0.2
      if (!s.init) { camera.position.copy(s.p); s.look.copy(s.t); s.init = true }
      camera.position.lerp(s.p, 1 - Math.exp(-dt * 6))
      s.look.lerp(s.t, 1 - Math.exp(-dt * 6))
      camera.lookAt(s.look)
      if (orbit.current) orbit.current.target.copy(s.look)
    }

    // conveyor buckets (time-driven), handle glows under the vision cone
    const visionW = smooth(1 - Math.abs(f - 2.1) / 0.9)
    beltBuckets.forEach((r, i) => {
      if (!r.current) return
      const x = -6 + ((time * 0.32 + i * 0.78) % 6.24)
      const nearPick = x > -0.14
      r.current.visible = !nearPick
      r.current.position.set(x, BELT_Y, BELT_Z)
      r.current.rotation.y = 0.3 * i
      const h = r.current.children[0]?.children[2]
      if (h) h.material = Math.abs(x + 0.2) < 0.3 && visionW > 0.2 ? kit.m.handleGlow : kit.m.handle
    })
    scanRef.current.position.z = BELT_Z + Math.sin(time * 3) * 0.22
    scanRef.current.material.opacity = visionW * 0.9
    coneRef.current.material.opacity = 0.05 + visionW * 0.14

    // robot: idle before ch3, scroll-driven cycle in ch3, time loop afterwards
    let pose = { target: HOME, holding: false, placed: false }
    let dest = slot(0, 0)
    if (f >= 2.5 && f < 3.5) {
      pose = cyclePose(clamp((f - 2.5) / 0.95), dest)
    } else if (f >= 3.5) {
      const k = Math.min(PER_PALLET - 1, Math.round(counts.current[0]))
      dest = counts.current[0] < PER_PALLET ? slot(0, k) : slot(1, Math.min(PER_PALLET - 1, Math.round(counts.current[1])))
      pose = cyclePose((time / 3.6) % 1, dest)
    } else {
      pose = { target: { ...HOME, y: HOME.y + Math.sin(time * 1.2) * 0.02 }, holding: false, placed: false }
    }
    const ik = solveIK(pose.target)
    rig.base.current.rotation.y = ik.yaw
    rig.shoulder.current.rotation.z = ik.a1
    rig.elbow.current.rotation.z = ik.a2 - ik.a1
    rig.wrist.current.rotation.z = -Math.PI / 2 - ik.a2
    const grip = pose.holding ? 0.0 : 0.035
    rig.fingerA.current.position.y = BUCKET.rTop + 0.01 + grip
    rig.fingerB.current.position.y = -(BUCKET.rTop + 0.01 + grip)
    held.current.visible = pose.holding
    held.current.position.set(ik.tool.x, ik.tool.y - BUCKET.h + 0.02, ik.tool.z)
    held.current.rotation.y = ik.yaw

    // pallet counts (scroll-driven)
    counts.current[0] = f < 3.45 ? 0 : f < 3.5 ? 1 : 1 + clamp((f - 3.5) / 0.85) * (PER_PALLET - 1)
    counts.current[1] = f < 3.95 ? 0 : clamp((f - 3.95) / 0.9) * 30

    // safety fans
    const safeW = smooth(1 - Math.abs(f - 5) / 0.9)
    fans.forEach((r, i) => { if (r.current) r.current.material.opacity = 0.02 + safeW * (0.32 + 0.12 * Math.sin(time * 4 + i)) })

    // manual lifter (visible only around chapter 1)
    const wv = f < 2.3
    worker.root.current.visible = wv
    if (wv) {
      const lift = 0.5 + 0.5 * Math.sin(time * 1.8)
      worker.torso.current.rotation.x = 0.75 * (1 - lift)
      worker.carry.current.position.y = -0.1 + lift * 0.05
    }
    if (keyLight.current) keyLight.current.intensity = 2.4
  })

  return (
    <>
      <color attach="background" args={['#0b1220']} />
      <fog attach="fog" args={['#0b1220', 11, 26]} />
      <ambientLight intensity={0.25} />
      <directionalLight ref={keyLight} position={[4, 7, 3]} intensity={2.4} castShadow={!low} shadow-mapSize={[1024, 1024]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} />
      <spotLight position={[-5, 4, -5]} angle={0.5} penumbra={0.9} intensity={10} color={ORANGE} />
      <spotLight position={[0, 5.5, 0]} angle={0.55} penumbra={1} intensity={12} color="#fff4e8" />
      <Environment resolution={low ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, 0]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" color={ORANGE} intensity={1.5} position={[-5, 2, 3]} scale={2} />
      </Environment>

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0d1626" roughness={0.9} metalness={0.05} />
      </mesh>
      <Grid position={[0, 0.002, 0]} args={[30, 30]} cellSize={0.5} cellThickness={0.5} cellColor="#1e2b40" sectionSize={2.5} sectionThickness={1} sectionColor="#3a4f6b" fadeDistance={22} fadeStrength={1.5} infiniteGrid />
      <ContactShadows position={[0, 0.003, 0]} scale={16} blur={2.4} opacity={0.65} far={3} resolution={low ? 256 : 512} />

      <Robot kit={kit} rig={rig} />
      <group ref={held}><Bucket kit={kit} /></group>
      <Conveyor kit={kit} beltBuckets={beltBuckets} scanRef={scanRef} coneRef={coneRef} />
      {PALLETS.map((p, i) => <Pallet key={i} kit={kit} p={p} />)}
      <Stack kit={kit} pi={0} countRef={counts} />
      <Stack kit={kit} pi={1} countRef={counts} />
      <Safety fans={fans} />
      <Worker kit={kit} rig={worker} />
      <Dust count={low ? 90 : 260} />
      {interactive && <OrbitControls ref={orbit} enabled={false} enablePan={false} enableZoom={false} minPolarAngle={0.5} maxPolarAngle={1.35} rotateSpeed={0.5} />}
    </>
  )
}
