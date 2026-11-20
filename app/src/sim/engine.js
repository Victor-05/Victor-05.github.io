// Discrete-event simulation of one UR20 palletizing cell (digital twin).
// Pure & deterministic: virtual clock (seconds), binary-heap event queue with
// (time, seq) ordering, no Math.random, no React. The UI only reads snapshots.
//
// Modelling decisions (documented, see also UI "[ipoteză]" labels):
// - Conveyor: a bucket arrives every 60/feedRate s. If the accumulation queue is
//   full, the arriving bucket is LOST for the cell (counted in lost.blocked) –
//   in reality the upstream filling line would have to stop. During a conveyor
//   fault arrivals are also lost (lost.conveyorFault) and transport is frozen.
// - Robot: cycle = pick + move out + place + move back. Move time =
//   baseMove / speedFactor, with a minimum cycle-time floor. The robot fills
//   one pallet station until FULL, then switches to the other one; it waits
//   only if both stations are unavailable (WAITING_PALLET).
// - Operator (single person, manual): changes full pallets (incl. separators)
//   after a response delay = responseTime * 100 / availability%.
// - Faults pause the current state; in-progress robot motion resumes after.

export const TESTED = {
  5: { rate: 8.6, perPallet: 100 },
  13: { rate: 7.4, perPallet: 44 },
}
export const TARGET_RATE = 6
export const SHIFT_SECONDS = 8 * 3600
const SAMPLE_EVERY = 60

export const ROBOT = { IDLE: 'IDLE', PICKING: 'PICKING', MOVING: 'MOVING', PLACING: 'PLACING', RETURNING: 'RETURNING', WAITING_BUCKET: 'WAITING_BUCKET', WAITING_PALLET: 'WAITING_PALLET', FAULT: 'FAULT' }
export const STATION = { AVAILABLE: 'AVAILABLE', FILLING: 'FILLING', FULL: 'FULL', WAITING_OPERATOR: 'WAITING_OPERATOR', REPLACEMENT: 'REPLACEMENT' }
export const CONVEYOR = { RUNNING: 'RUNNING', BLOCKED: 'BLOCKED', STOPPED: 'STOPPED', FAULT: 'FAULT' }
const BUSY = new Set([ROBOT.PICKING, ROBOT.MOVING, ROBOT.PLACING, ROBOT.RETURNING])
const NEXT_PHASE = { PICKING: 'MOVING', MOVING: 'PLACING', PLACING: 'RETURNING', RETURNING: null }

const PICK_PLACE_DEFAULT = 1.5
/** One-way move time at speedFactor 1 so that the cycle equals the tested rate. */
export function baseMoveFor(weightKg) {
  const t = TESTED[weightKg] ?? TESTED[13]
  return (60 / t.rate - 2 * PICK_PLACE_DEFAULT) / 2
}

export function defaultParams(weightKg = 13) {
  return {
    weightKg,
    perPallet: (TESTED[weightKg] ?? TESTED[13]).perPallet,
    feedRate: 6.5, // buckets/min, same as evaluator demo
    speedFactor: 1,
    pickTime: PICK_PLACE_DEFAULT,
    placeTime: PICK_PLACE_DEFAULT,
    baseMove: baseMoveFor(weightKg),
    minCycle: 5, // [ASSUMPTION] mechanical floor for a full cycle (s)
    queueCapacity: 6, // [ASSUMPTION] accumulation positions on the conveyor
    travelTime: 6, // [ASSUMPTION] conveyor entry -> pick zone (s)
    indexTime: 1, // [ASSUMPTION] gap before the next bucket reaches the pick zone (s)
    palletChangeTime: 90, // [ASSUMPTION] manual pallet + separator change (s)
    operatorResponse: 30, // [ASSUMPTION] time until operator starts the change (s)
    operatorAvailability: 100, // %
    surgeFactor: 2, // [ASSUMPTION] feed multiplier during a feed surge
  }
}

export function cycleTimes(p) {
  let move = p.baseMove / p.speedFactor
  const sum = p.pickTime + p.placeTime + 2 * move
  if (sum < p.minCycle) move = (p.minCycle - p.pickTime - p.placeTime) / 2
  const cycle = p.pickTime + p.placeTime + 2 * move
  const tested = 60 / (TESTED[p.weightKg] ?? TESTED[13]).rate
  return { PICKING: p.pickTime, MOVING: move, PLACING: p.placeTime, RETURNING: move, cycle, rate: 60 / cycle, testedCycle: tested, aboveTested: cycle < tested - 1e-6 }
}

export function layerLayout(perPallet) {
  const perLayer = perPallet <= 50 ? 11 : 20 // [ASSUMPTION] illustrative layer pattern
  const cols = perLayer <= 12 ? 4 : 5
  const rows = Math.ceil(perLayer / cols)
  return { perLayer, cols, rows, layers: Math.ceil(perPallet / perLayer) }
}

// ---------- heap ----------
function push(heap, ev) {
  heap.push(ev)
  let i = heap.length - 1
  while (i > 0) {
    const p = (i - 1) >> 1
    if (less(heap[i], heap[p])) { [heap[i], heap[p]] = [heap[p], heap[i]]; i = p } else break
  }
}
function pop(heap) {
  const top = heap[0]
  const last = heap.pop()
  if (heap.length) {
    heap[0] = last
    let i = 0
    for (;;) {
      const l = 2 * i + 1, r = l + 1
      let m = i
      if (l < heap.length && less(heap[l], heap[m])) m = l
      if (r < heap.length && less(heap[r], heap[m])) m = r
      if (m === i) break
      ;[heap[i], heap[m]] = [heap[m], heap[i]]
      i = m
    }
  }
  return top
}
const less = (a, b) => a.t < b.t || (a.t === b.t && a.seq < b.seq)

function zeroAcc() {
  return { robotBusy: 0, robotWaitBucket: 0, robotWaitPallet: 0, robotFault: 0, robotStarved: 0, conveyorBlocked: 0, blockedByRobot: 0, conveyorFault: 0, visionFault: 0, operatorBusy: 0, downtime: 0 }
}

export class Simulation {
  constructor(params = defaultParams(), state = null) {
    if (state) { this.s = state; return }
    this.s = {
      params: { ...params },
      now: 0,
      seq: 0,
      heap: [],
      nextId: 1,
      queue: [], // buckets on conveyor: {id, arr, readyAt}
      lastPickAt: -Infinity,
      robot: { state: ROBOT.IDLE, phase: null, phaseStart: 0, phaseEnd: 0, token: 0, station: 0, slot: 0, holding: null, paused: null, lastStation: 1 },
      stations: [0, 1].map((i) => ({ id: i, state: STATION.AVAILABLE, count: 0, since: 0 })),
      operator: { state: 'IDLE', station: null, phaseEnd: 0, token: 0, queue: [], unavailableUntil: 0 },
      faults: { robot: null, conveyor: null, vision: null }, // {until, logId}
      surgeUntil: 0,
      conveyorFrozenAt: null,
      palletized: 0,
      pallets: 0,
      arrived: 0,
      lost: { blocked: 0, conveyorFault: 0 },
      acc: zeroAcc(),
      samples: [{ t: 0, output: 0, rate: 0, queue: 0, robotUtil: 0, acc: zeroAcc() }],
      log: [],
    }
    this._schedule(0, { type: 'ARRIVAL' })
    this._schedule(SAMPLE_EVERY, { type: 'SAMPLE' })
  }

  clone() { return new Simulation(null, structuredClone(this.s)) }
  get now() { return this.s.now }
  get params() { return this.s.params }

  setParams(patch) {
    const p = (this.s.params = { ...this.s.params, ...patch })
    for (const st of this.s.stations) {
      if (st.state === STATION.FILLING && st.count >= p.perPallet) this._stationFull(st)
    }
    this._tryRobot()
  }

  _schedule(t, ev) { push(this.s.heap, { ...ev, t, seq: this.s.seq++ }) }

  /** Advance virtual time by dt seconds, processing all events in between. */
  advance(dt) { this.runUntil(this.s.now + dt) }

  runUntil(tEnd) {
    const s = this.s
    while (s.heap.length && s.heap[0].t <= tEnd) {
      const ev = pop(s.heap)
      this._accumulate(ev.t)
      this._handle(ev)
    }
    this._accumulate(tEnd)
  }

  /** Step mode: process exactly the next event. */
  step() {
    const s = this.s
    if (!s.heap.length) return null
    const ev = pop(s.heap)
    this._accumulate(ev.t)
    this._handle(ev)
    return ev.type
  }

  runShift() {
    const end = Math.max(SHIFT_SECONDS, Math.ceil((this.s.now + 1) / SHIFT_SECONDS) * SHIFT_SECONDS)
    this.runUntil(end)
    return this.report()
  }

  // ---------- time accounting ----------
  _accumulate(t) {
    const s = this.s
    const dt = t - s.now
    if (dt <= 0) { s.now = Math.max(s.now, t); return }
    const a = s.acc
    const r = s.robot.state
    const convDown = !!s.faults.conveyor
    const visDown = !!s.faults.vision
    if (BUSY.has(r)) a.robotBusy += dt
    else if (r === ROBOT.WAITING_BUCKET) { if (convDown || visDown) a.robotStarved += dt; else a.robotWaitBucket += dt }
    else if (r === ROBOT.WAITING_PALLET) a.robotWaitPallet += dt
    else if (r === ROBOT.FAULT) a.robotFault += dt
    if (convDown) a.conveyorFault += dt
    else if (s.queue.length >= s.params.queueCapacity && r !== ROBOT.FAULT && !visDown) {
      a.conveyorBlocked += dt
      if (BUSY.has(r)) a.blockedByRobot += dt // queue full while robot works flat out
    }
    if (visDown) a.visionFault += dt
    if (s.operator.state !== 'IDLE') a.operatorBusy += dt
    if (s.faults.robot || convDown || visDown) a.downtime += dt
    s.now = t
  }

  // ---------- events ----------
  _handle(ev) {
    const s = this.s
    switch (ev.type) {
      case 'ARRIVAL': this._arrival(); break
      case 'ROBOT_END': if (ev.token === s.robot.token) this._robotPhaseEnd(); break
      case 'ROBOT_WAKE': this._tryRobot(); break
      case 'OP_END': if (ev.token === s.operator.token) this._operatorPhaseEnd(); break
      case 'OP_WAKE': this._tryOperator(); break
      case 'FAULT_END': this._faultEnd(ev.kind, ev.logId); break
      case 'SURGE_END': this._closeLog(ev.logId); break
      case 'DELAY_END': this._closeLog(ev.logId); this._tryOperator(); break
      case 'SAMPLE': this._sample(); this._schedule(s.now + SAMPLE_EVERY, { type: 'SAMPLE' }); break
    }
  }

  _feedInterval() {
    const s = this.s
    const rate = s.params.feedRate * (s.now < s.surgeUntil ? s.params.surgeFactor : 1)
    return 60 / Math.max(rate, 0.01)
  }

  _arrival() {
    const s = this.s
    s.arrived++
    if (s.faults.conveyor) s.lost.conveyorFault++
    else if (s.queue.length >= s.params.queueCapacity) s.lost.blocked++
    else s.queue.push({ id: s.nextId++, arr: s.now, readyAt: s.now + s.params.travelTime })
    this._schedule(s.now + this._feedInterval(), { type: 'ARRIVAL' })
    this._tryRobot()
  }

  _targetStation() {
    const s = this.s
    const ok = (st) => st.state === STATION.AVAILABLE || st.state === STATION.FILLING
    const filling = s.stations.find((st) => st.state === STATION.FILLING)
    if (filling) return filling
    const other = s.stations[1 - s.robot.lastStation]
    if (ok(other)) return other
    const same = s.stations[s.robot.lastStation]
    return ok(same) ? same : null
  }

  _tryRobot() {
    const s = this.s
    const r = s.robot
    if (r.state === ROBOT.FAULT || BUSY.has(r.state)) return
    const st = this._targetStation()
    if (!st) { r.state = ROBOT.WAITING_PALLET; return }
    const head = s.queue[0]
    const blocked = s.faults.conveyor || s.faults.vision
    const readyAt = head ? Math.max(head.readyAt, s.lastPickAt + s.params.indexTime) : Infinity
    if (blocked || !head || readyAt > s.now + 1e-9) {
      r.state = ROBOT.WAITING_BUCKET
      if (!blocked && head && r.wakeAt !== readyAt) { r.wakeAt = readyAt; this._schedule(readyAt, { type: 'ROBOT_WAKE' }) }
      return
    }
    // start a cycle
    s.queue.shift()
    s.lastPickAt = s.now
    if (st.state === STATION.AVAILABLE) { st.state = STATION.FILLING; st.since = s.now }
    r.station = st.id
    r.lastStation = st.id
    r.slot = st.count
    r.holding = head.id
    this._startPhase(ROBOT.PICKING)
  }

  _startPhase(phase, duration) {
    const s = this.s
    const r = s.robot
    const d = duration ?? cycleTimes(s.params)[phase]
    r.state = phase
    r.phase = phase
    r.phaseStart = s.now
    r.phaseEnd = s.now + d
    r.token++
    this._schedule(r.phaseEnd, { type: 'ROBOT_END', token: r.token })
  }

  _robotPhaseEnd() {
    const s = this.s
    const r = s.robot
    if (r.phase === ROBOT.PLACING) {
      const st = s.stations[r.station]
      st.count++
      s.palletized++
      r.holding = null
      if (st.count >= s.params.perPallet) this._stationFull(st)
    }
    const next = NEXT_PHASE[r.phase]
    if (next) this._startPhase(next)
    else { r.state = ROBOT.IDLE; r.phase = null; this._tryRobot() }
  }

  _stationFull(st) {
    const s = this.s
    st.state = STATION.FULL
    st.since = s.now
    s.pallets++
    s.operator.queue.push(st.id)
    this._tryOperator()
  }

  _tryOperator() {
    const s = this.s
    const op = s.operator
    if (op.state !== 'IDLE' || !op.queue.length) return
    if (s.now < op.unavailableUntil) { this._schedule(op.unavailableUntil, { type: 'OP_WAKE' }); return }
    const id = op.queue.shift()
    const st = s.stations[id]
    st.state = STATION.WAITING_OPERATOR
    st.since = s.now
    op.state = 'RESPONDING'
    op.station = id
    op.token++
    op.phaseEnd = s.now + (s.params.operatorResponse * 100) / Math.max(1, s.params.operatorAvailability)
    this._schedule(op.phaseEnd, { type: 'OP_END', token: op.token })
  }

  _operatorPhaseEnd() {
    const s = this.s
    const op = s.operator
    const st = s.stations[op.station]
    if (op.state === 'RESPONDING') {
      op.state = 'REPLACING'
      st.state = STATION.REPLACEMENT
      st.since = s.now
      op.token++
      op.phaseEnd = s.now + s.params.palletChangeTime
      this._schedule(op.phaseEnd, { type: 'OP_END', token: op.token })
      return
    }
    st.state = STATION.AVAILABLE
    st.count = 0
    st.since = s.now
    op.state = 'IDLE'
    op.station = null
    this._tryOperator()
    this._tryRobot()
  }

  // ---------- user events ----------
  /** kind: 'robot' | 'conveyor' | 'vision' | 'palletDelay' | 'surge' */
  trigger(kind, duration) {
    const s = this.s
    const baseline = this.clone()
    const entry = { id: s.log.length + 1, kind, start: s.now, duration, end: null, lost: null, active: true }
    s.log.push(entry)
    this._baselines ??= new Map()
    this._baselines.set(entry.id, baseline)
    if (kind === 'surge') {
      s.surgeUntil = Math.max(s.surgeUntil, s.now + duration)
      this._schedule(s.now + duration, { type: 'SURGE_END', logId: entry.id })
      return entry
    }
    if (kind === 'palletDelay') {
      s.operator.unavailableUntil = Math.max(s.operator.unavailableUntil, s.now + duration)
      // an operator already walking to a pallet is also delayed
      if (s.operator.state === 'RESPONDING') {
        s.operator.token++
        s.operator.phaseEnd += duration
        this._schedule(s.operator.phaseEnd, { type: 'OP_END', token: s.operator.token })
      }
      this._schedule(s.now + duration, { type: 'DELAY_END', logId: entry.id })
      return entry
    }
    const prev = s.faults[kind]
    const until = Math.max(prev?.until ?? 0, s.now + duration)
    s.faults[kind] = { until, logId: entry.id }
    if (kind === 'robot') {
      const r = s.robot
      if (r.state !== ROBOT.FAULT) {
        r.paused = BUSY.has(r.state) ? { phase: r.phase, remaining: r.phaseEnd - s.now, progress: (s.now - r.phaseStart) / Math.max(1e-9, r.phaseEnd - r.phaseStart) } : null
        r.token++ // cancel pending phase end
        r.state = ROBOT.FAULT
      }
    }
    if (kind === 'conveyor') s.conveyorFrozenAt = s.conveyorFrozenAt ?? s.now
    this._schedule(until, { type: 'FAULT_END', kind, logId: entry.id })
    return entry
  }

  _faultEnd(kind, logId) {
    const s = this.s
    const f = s.faults[kind]
    this._closeLog(logId)
    if (!f || f.until > s.now + 1e-9) return
    s.faults[kind] = null
    if (kind === 'conveyor') {
      const frozen = s.now - s.conveyorFrozenAt
      for (const b of s.queue) {
        if (b.readyAt > s.conveyorFrozenAt) b.readyAt += frozen
        b.arr += frozen // visual only: transport resumes where it froze
      }
      s.conveyorFrozenAt = null
    }
    if (kind === 'robot') {
      const r = s.robot
      if (r.paused) {
        const { phase, remaining, progress } = r.paused
        r.paused = null
        this._startPhase(phase, remaining)
        // keep visual continuity: fake phaseStart so progress continues from where it froze
        const total = remaining / Math.max(1e-9, 1 - progress)
        r.phaseStart = r.phaseEnd - total
        return
      }
      r.state = ROBOT.IDLE
    }
    this._tryRobot()
  }

  _closeLog(logId) {
    const s = this.s
    const e = s.log.find((l) => l.id === logId)
    if (!e || !e.active) return
    e.active = false
    e.end = s.now
    const base = this._baselines?.get(logId)
    if (base) {
      base.setParams(s.params)
      base.runUntil(s.now)
      e.lost = Math.max(0, base.s.palletized - s.palletized)
      this._baselines.delete(logId)
    }
  }

  _sample() {
    const s = this.s
    const prev = s.samples[s.samples.length - 1]
    const back = s.samples[Math.max(0, s.samples.length - 5)]
    const dt = s.now - prev.t
    s.samples.push({
      t: s.now,
      output: s.palletized,
      rate: ((s.palletized - back.output) / Math.max(1, s.now - back.t)) * 60,
      queue: s.queue.length,
      robotUtil: dt > 0 ? (s.acc.robotBusy - prev.acc.robotBusy) / dt : 0,
      acc: { ...s.acc },
    })
  }

  // ---------- read side ----------
  conveyorState() {
    const s = this.s
    if (s.faults.conveyor) return CONVEYOR.FAULT
    if (s.queue.length >= s.params.queueCapacity) return CONVEYOR.BLOCKED
    return CONVEYOR.RUNNING
  }

  /** Windowed stats; window in seconds (null = whole run). */
  stats(window = null) {
    const s = this.s
    let from = { t: 0, output: 0, acc: zeroAcc() }
    if (window) {
      for (let i = s.samples.length - 1; i >= 0; i--) {
        from = s.samples[i]
        if (s.now - s.samples[i].t >= window) break
      }
    }
    const E = Math.max(1e-9, s.now - from.t)
    const d = {}
    for (const k of Object.keys(s.acc)) d[k] = s.acc[k] - from.acc[k]
    const ct = cycleTimes(s.params)
    const p = s.params
    return {
      elapsed: E,
      output: s.palletized - from.output,
      actualRate: ((s.palletized - from.output) / E) * 60,
      robotCapacity: ct.rate,
      feedCapacity: p.feedRate,
      operatorCapacity: (60 * p.perPallet) / (p.palletChangeTime + (p.operatorResponse * 100) / Math.max(1, p.operatorAvailability)),
      robotUtil: d.robotBusy / E,
      conveyorUtil: Math.max(0, 1 - (d.conveyorBlocked + d.conveyorFault) / E),
      operatorUtil: d.operatorBusy / E,
      share: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v / E])),
      time: d,
    }
  }

  snapshot() {
    const s = this.s
    return { now: s.now, faultsFrozenAt: s.conveyorFrozenAt, robot: s.robot, stations: s.stations, queue: s.queue, conveyor: this.conveyorState(), faults: s.faults, operator: s.operator, params: s.params, surge: s.now < s.surgeUntil }
  }

  report() {
    const s = this.s
    const st = this.stats()
    const ct = cycleTimes(s.params)
    const lostCap = (sec) => Math.round((sec * ct.rate) / 60)
    const a = s.acc
    return {
      duration: s.now,
      buckets: s.palletized,
      pallets: s.pallets,
      kg: s.palletized * s.params.weightKg,
      avgRate: st.actualRate,
      targetPct: (st.actualRate / TARGET_RATE) * 100,
      downtime: a.downtime,
      bottleneck: detectBottleneck(st),
      losses: [
        { cause: 'feed', seconds: a.robotWaitBucket, buckets: lostCap(a.robotWaitBucket) },
        { cause: 'operator', seconds: a.robotWaitPallet, buckets: lostCap(a.robotWaitPallet) },
        { cause: 'robotFault', seconds: a.robotFault, buckets: lostCap(a.robotFault) },
        { cause: 'conveyorVision', seconds: a.robotStarved, buckets: lostCap(a.robotStarved) },
      ],
      lostArrivals: { ...s.lost },
      stats: st,
    }
  }
}

/**
 * Bottleneck detector from measured times (not hardcoded).
 * Scores are the share of elapsed time a component made the system lose:
 *  robot    – conveyor blocked (queue full) while the robot is busy
 *  feed     – robot waiting for buckets with no fault active
 *  operator – robot waiting for a free pallet station
 *  fault    – downtime from faults
 */
export function detectBottleneck(st, threshold = 0.05) {
  const sh = st.share
  const faultShare = sh.robotFault + sh.robotStarved
  const scores = {
    robot: sh.blockedByRobot,
    feed: sh.robotWaitBucket,
    operator: sh.robotWaitPallet,
    fault: faultShare,
  }
  let component = 'none'
  let best = threshold
  for (const [k, v] of Object.entries(scores)) if (v > best) { best = v; component = k }
  return { component, score: component === 'none' ? 0 : best, scores }
}
