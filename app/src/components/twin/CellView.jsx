import { memo } from 'react'
import { iso, pt, CONVEYOR, PICK, STATIONS, ZONE, SCANNERS, PALLET_Z, bucketSize, slotPosition, toolPosition, armJoints } from '../../sim/geometry.js'
import { layerLayout } from '../../sim/engine.js'

const C = {
  ok: '#34d399', active: '#38bdf8', warn: '#fbbf24', fault: '#f43f5e', idle: '#64748b', violet: '#a78bfa',
}

function poly(points) { return points.map((p) => pt(iso(...p))).join(' ') }

function Box({ x0, x1, y0, y1, z0 = 0, z1, top, left, right, stroke = 'none', opacity = 1 }) {
  return (
    <g opacity={opacity}>
      <polygon points={poly([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} fill={left} stroke={stroke} strokeWidth="0.5" />
      <polygon points={poly([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])} fill={right} stroke={stroke} strokeWidth="0.5" />
      <polygon points={poly([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} fill={top} stroke={stroke} strokeWidth="0.5" />
    </g>
  )
}

function Bucket({ x, y, z, kg, opacity = 1, glow }) {
  const { r, h } = bucketSize(kg)
  const [bx, by] = iso(x, y, z)
  const [, ty] = iso(x, y, z + h)
  const rx = r * 0.866 * 2 * 31
  const ry = rx * 0.5
  const big = kg >= 10
  return (
    <g opacity={opacity}>
      <path d={`M${bx - rx},${ty} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${bx + rx},${ty} Z`} fill={big ? '#0284c7' : '#d97706'} />
      <ellipse cx={bx} cy={ty} rx={rx} ry={ry} fill={big ? '#7dd3fc' : '#fcd34d'} stroke={glow || 'rgba(255,255,255,.35)'} strokeWidth={glow ? 1.5 : 0.6} />
      <ellipse cx={bx} cy={ty} rx={rx * 0.62} ry={ry * 0.62} fill="none" stroke="rgba(15,23,42,.45)" strokeWidth="1.2" />
    </g>
  )
}

const stationColor = (st) => ({ AVAILABLE: C.idle, FILLING: C.active, FULL: C.warn, WAITING_OPERATOR: C.warn, REPLACEMENT: C.violet })[st.state]
const STATION_RO = { AVAILABLE: 'Liber', FILLING: 'Se umple', FULL: 'Plin', WAITING_OPERATOR: 'Așteaptă operator', REPLACEMENT: 'Schimbare palet' }
const ROBOT_RO = { IDLE: 'Inactiv', PICKING: 'Prindere', MOVING: 'Deplasare', PLACING: 'Așezare', RETURNING: 'Revenire', WAITING_BUCKET: 'Așteaptă găleată', WAITING_PALLET: 'Așteaptă palet', FAULT: 'DEFECT' }
const CONV_RO = { RUNNING: 'Funcționează', BLOCKED: 'Blocat (coadă plină)', STOPPED: 'Oprit', FAULT: 'DEFECT' }
export { ROBOT_RO, STATION_RO, CONV_RO }

function robotColor(state) {
  if (state === 'FAULT') return C.fault
  if (state.startsWith('WAITING')) return C.warn
  if (state === 'IDLE') return C.idle
  return C.ok
}

function Station({ idx, st, snap }) {
  const { params, now } = snap
  const g = STATIONS[idx]
  const x0 = g.cx - g.w / 2, x1 = g.cx + g.w / 2, y0 = g.cy - g.d / 2, y1 = g.cy + g.d / 2
  const col = stationColor(st)
  const { perLayer } = layerLayout(params.perPallet)
  const fade = st.state === 'REPLACEMENT' ? Math.max(0, 1 - (now - st.since) / Math.max(1, params.palletChangeTime)) : 1
  const items = []
  for (let k = 0; k < Math.min(st.count, params.perPallet); k++) items.push(slotPosition(idx, k, params.perPallet, params.weightKg))
  items.sort((a, b) => a.layer - b.layer || a.x + a.y - (b.x + b.y))
  const layersDone = Math.floor(st.count / perLayer)
  const bh = bucketSize(params.weightKg).h + 0.02
  const pulse = st.state === 'WAITING_OPERATOR' || st.state === 'FULL'
  const [lx, ly] = iso(g.cx, g.cy, 0)
  return (
    <g>
      <polygon points={poly([[x0 - 0.12, y0 - 0.12, 0], [x1 + 0.12, y0 - 0.12, 0], [x1 + 0.12, y1 + 0.12, 0], [x0 - 0.12, y1 + 0.12, 0]])} fill={col} fillOpacity="0.08" stroke={col} strokeWidth="1.5" strokeDasharray="5 4" className={pulse ? 'twin-pulse' : ''} filter="url(#glow)" />
      <Box x0={x0} x1={x1} y0={y0} y1={y1} z1={PALLET_Z} top="#a16207" left="#713f12" right="#854d0e" />
      {items.map((p, i) => {
        const nodes = [<Bucket key={i} x={p.x} y={p.y} z={p.z} kg={params.weightKg} opacity={fade} />]
        if ((i + 1) % perLayer === 0 && (i + 1) / perLayer <= layersDone && i + 1 < params.perPallet) {
          const z = PALLET_Z + ((i + 1) / perLayer) * bh
          nodes.push(<polygon key={`s${i}`} points={poly([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]])} fill="#e7e5e4" fillOpacity={0.55 * fade} stroke="#f5f5f4" strokeWidth="0.6" />)
        }
        return nodes
      })}
      <text x={lx} y={ly + 52} textAnchor="middle" className="fill-slate-200 text-[13px] font-semibold">Stația {idx === 0 ? 'A' : 'B'}</text>
      <text x={lx} y={ly + 67} textAnchor="middle" fill={col} className="text-[11px]">{STATION_RO[st.state]} · {Math.min(st.count, params.perPallet)}/{params.perPallet}</text>
    </g>
  )
}

function Operator({ snap }) {
  const op = snap.operator
  const home = { x: 3.2, y: -0.6 }
  let pos = home
  if (op.state !== 'IDLE' && op.station !== null) {
    const g = STATIONS[op.station]
    const target = op.station === 0 ? { x: g.cx + g.w / 2 + 0.35, y: g.cy } : { x: g.cx, y: g.cy + g.d / 2 + 0.35 }
    if (op.state === 'RESPONDING') {
      const total = (snap.params.operatorResponse * 100) / Math.max(1, snap.params.operatorAvailability)
      const t = Math.min(1, Math.max(0, 1 - (op.phaseEnd - snap.now) / total))
      pos = { x: home.x + (target.x - home.x) * t, y: home.y + (target.y - home.y) * t }
    } else pos = target
  }
  const [x, y] = iso(pos.x, pos.y, 0)
  const col = op.state === 'IDLE' ? '#94a3b8' : C.violet
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy="0" rx="9" ry="4.5" fill="#000" opacity="0.35" />
      <rect x="-5" y="-30" width="10" height="24" rx="5" fill={col} />
      <circle cx="0" cy="-36" r="5.5" fill="#fde68a" />
      <rect x="-6" y="-42" width="12" height="4" rx="2" fill="#fbbf24" />
    </g>
  )
}

function Robot({ snap }) {
  const kin = toolPosition(snap)
  const j = armJoints(kin.tool)
  const col = robotColor(snap.robot.state)
  const P = (q) => iso(q.x, q.y, q.z)
  const [sx, sy] = P(j.shoulder), [ex, ey] = P(j.elbow), [wx, wy] = P(j.wrist), [tx, ty] = P(j.tool)
  const [bx, by] = iso(0, 0, 0)
  const [px, py] = iso(0, 0, 0.5)
  const b = bucketSize(snap.params.weightKg)
  return (
    <g>
      <ellipse cx={bx} cy={by} rx="34" ry="17" fill="#0f172a" stroke={col} strokeOpacity="0.6" strokeWidth="2" filter="url(#glow)" />
      <path d={`M${bx - 22},${by} L${px - 22},${py} A22,11 0 0 1 ${px + 22},${py} L${bx + 22},${by} A22,11 0 0 1 ${bx - 22},${by}`} fill="#1e293b" />
      <ellipse cx={px} cy={py} rx="22" ry="11" fill="#334155" />
      <line x1={px} y1={py} x2={sx} y2={sy} stroke="#cbd5e1" strokeWidth="18" strokeLinecap="round" />
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={col} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <line x1={ex} y1={ey} x2={wx} y2={wy} stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round" />
      <line x1={ex} y1={ey} x2={wx} y2={wy} stroke={col} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
      <circle cx={sx} cy={sy} r="10" fill="#0f172a" stroke={col} strokeWidth="3" filter="url(#glow)" />
      <circle cx={ex} cy={ey} r="8" fill="#0f172a" stroke={col} strokeWidth="3" filter="url(#glow)" />
      <circle cx={wx} cy={wy} r="6" fill="#0f172a" stroke={col} strokeWidth="2.5" />
      <line x1={wx} y1={wy} x2={tx} y2={ty} stroke="#94a3b8" strokeWidth="6" />
      <rect x={tx - 14} y={ty - 3} width="28" height="6" rx="2" fill="#475569" stroke={col} strokeWidth="1" />
      {kin.holding && <Bucket x={kin.tool.x} y={kin.tool.y} z={kin.tool.z - b.h} kg={snap.params.weightKg} />}
    </g>
  )
}

function CellView({ snap, paused }) {
  const { params, now, queue, robot, faults, conveyor } = snap
  const kin = toolPosition(snap)
  const cv = CONVEYOR
  const convCol = paused ? C.idle : conveyor === 'FAULT' ? C.fault : conveyor === 'BLOCKED' ? C.warn : C.active
  const b = bucketSize(params.weightKg)
  const spacing = b.r * 2 + 0.08
  // conveyor buckets: travel progress, accumulated behind the pick position
  const convBuckets = queue.map((q, i) => {
    const tEff = snap.faults.conveyor ? Math.min(now, snap.faultsFrozenAt ?? now) : now
    const f = Math.min(1, Math.max(0, (tEff - q.arr) / params.travelTime))
    const x = Math.min(cv.x0 + 0.25 + (PICK.x - cv.x0 - 0.25) * f, PICK.x - i * spacing)
    return { id: q.id, x }
  })
  const visionCol = faults.vision ? C.fault : kin.phase === 'PICKING' ? C.ok : C.active
  const [vx, vy] = iso(PICK.x, PICK.y, 2.0)
  const v1 = iso(PICK.x - 0.35, PICK.y - 0.3, cv.z), v2 = iso(PICK.x + 0.35, PICK.y - 0.3, cv.z), v3 = iso(PICK.x + 0.35, PICK.y + 0.3, cv.z), v4 = iso(PICK.x - 0.35, PICK.y + 0.3, cv.z)
  const zoneCol = faults.robot ? C.fault : snap.operator.state === 'REPLACING' ? C.warn : C.ok
  const beltPhase = paused || conveyor !== 'RUNNING' ? 0 : (now * 40) % 20

  return (
    <svg viewBox="-235 -238 480 432" className="h-full w-full select-none" role="img" aria-label="Celula de paletizare – vizualizare izometrică">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id="belt" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={`translate(${beltPhase},0)`}>
          <rect width="20" height="20" fill="#1e293b" />
          <rect width="2" height="20" fill="#334155" />
        </pattern>
      </defs>
      {/* floor grid */}
      {Array.from({ length: 15 }).map((_, i) => {
        const v = -4.5 + i * 0.6
        return (
          <g key={i} stroke="#1e293b" strokeWidth="0.7">
            <line x1={iso(v, -2.6)[0]} y1={iso(v, -2.6)[1]} x2={iso(v, 3.2)[0]} y2={iso(v, 3.2)[1]} />
            <line x1={iso(-4.5, v + 1.4)[0]} y1={iso(-4.5, v + 1.4)[1]} x2={iso(3.2, v + 1.4)[0]} y2={iso(3.2, v + 1.4)[1]} />
          </g>
        )
      })}
      {/* safety zone */}
      <polygon points={poly([[ZONE.x0, ZONE.y0, 0], [ZONE.x1, ZONE.y0, 0], [ZONE.x1, ZONE.y1, 0], [ZONE.x0, ZONE.y1, 0]])} fill={zoneCol} fillOpacity="0.04" stroke={zoneCol} strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="8 6" />
      {SCANNERS.map((s, i) => {
        const [x, y] = iso(s.x, s.y, 0)
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="14" fill={zoneCol} opacity="0.15" className="twin-pulse" />
            <rect x={x - 5} y={y - 9} width="10" height="10" rx="2" fill="#0f172a" stroke={zoneCol} strokeWidth="2" filter="url(#glow)" />
          </g>
        )
      })}
      {/* conveyor */}
      <Box x0={cv.x0} x1={cv.x1} y0={cv.y - cv.w / 2} y1={cv.y + cv.w / 2} z1={cv.z - 0.06} top="#1e293b" left="#0f172a" right="#111827" />
      <polygon points={poly([[cv.x0, cv.y - cv.w / 2, cv.z], [cv.x1, cv.y - cv.w / 2, cv.z], [cv.x1, cv.y + cv.w / 2, cv.z], [cv.x0, cv.y + cv.w / 2, cv.z]])} fill="url(#belt)" stroke={convCol} strokeWidth="1.5" filter="url(#glow)" />
      <polygon points={[v1, v2, v3, v4].map(pt).join(' ')} fill={visionCol} fillOpacity="0.12" stroke={visionCol} strokeWidth="1" strokeDasharray="3 3" />
      {convBuckets.map((q) => <Bucket key={q.id} x={q.x} y={cv.y} z={cv.z} kg={params.weightKg} />)}
      {kin.pickWaiting && <Bucket x={PICK.x} y={PICK.y} z={cv.z} kg={params.weightKg} glow={C.ok} />}
      {/* vision camera */}
      <line x1={vx} y1={vy} x2={iso(PICK.x, PICK.y, cv.z + 0.9)[0]} y2={iso(PICK.x, PICK.y, cv.z + 0.9)[1]} stroke="#334155" strokeWidth="3" />
      <polygon points={[[vx, vy], v1, v2].map(pt).join(' ')} fill={visionCol} opacity="0.07" />
      <polygon points={[[vx, vy], v2, v3].map(pt).join(' ')} fill={visionCol} opacity="0.1" />
      <rect x={vx - 10} y={vy - 7} width="20" height="12" rx="3" fill="#0f172a" stroke={visionCol} strokeWidth="2" filter="url(#glow)" />
      <text x={vx + 16} y={vy} className="fill-slate-400 text-[10px]">Viziune 2D</text>
      {/* stations + robot (painter order) */}
      <Station idx={0} st={snap.stations[0]} snap={snap} />
      {kin.placedAtSlot && robot.station === 0 && (() => { const p = slotPosition(0, robot.slot, params.perPallet, params.weightKg); return <Bucket x={p.x} y={p.y} z={p.z} kg={params.weightKg} /> })()}
      <Robot snap={snap} />
      <Station idx={1} st={snap.stations[1]} snap={snap} />
      {kin.placedAtSlot && robot.station === 1 && (() => { const p = slotPosition(1, robot.slot, params.perPallet, params.weightKg); return <Bucket x={p.x} y={p.y} z={p.z} kg={params.weightKg} /> })()}
      <Operator snap={snap} />
    </svg>
  )
}

export default memo(CellView)
