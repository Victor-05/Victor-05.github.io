// Derived, engine-computed insights (pure). Romanian copy for the UI.
import { Simulation, detectBottleneck } from './engine.js'

export const COMPONENT_RO = {
  robot: 'Robotul UR20 (timp de ciclu)',
  feed: 'Alimentarea liniei (amonte)',
  operator: 'Schimbarea manuală a paleților',
  fault: 'Opriri / defecte',
  none: 'Niciun blocaj semnificativ',
}

const pct = (x) => `${Math.round(x * 100)}%`

export function explainBottleneck(st) {
  const b = detectBottleneck(st)
  const sh = st.share
  const map = {
    robot: {
      capacity: st.robotCapacity,
      util: st.robotUtil,
      why: `Coada de pe conveior este plină ${pct(sh.blockedByRobot)} din timp, în timp ce robotul lucrează continuu. Găletile în plus nu pot fi preluate.`,
      action: 'Reduceți ritmul de alimentare sau măriți zona de acumulare; orice optimizare a ciclului robotului trebuie validată cu Tech-Con (rezultat testat: 7,4 găleți/min la 13 kg, 8,6 la 5 kg).',
    },
    feed: {
      capacity: st.feedCapacity,
      util: st.conveyorUtil,
      why: `Robotul așteaptă găleți ${pct(sh.robotWaitBucket)} din timp: linia de umplere livrează mai puțin decât poate paletiza celula.`,
      action: 'Un robot mai rapid NU crește producția aici. Verificați linia de umplere din amonte.',
    },
    operator: {
      capacity: st.operatorCapacity,
      util: st.operatorUtil,
      why: `Robotul așteaptă un palet liber ${pct(sh.robotWaitPallet)} din timp: ambele poziții sunt pline sau în schimbare manuală.`,
      action: 'Reduceți timpul de schimbare (palet gol pregătit, separatoare la îndemână) sau asigurați disponibilitatea operatorului. Un robot mai rapid nu ajută.',
    },
    fault: {
      capacity: st.robotCapacity,
      util: st.robotUtil,
      why: `Opririle (robot, conveior, viziune) au blocat paletizarea ${pct(sh.robotFault + sh.robotStarved)} din timp.`,
      action: 'Analizați cauza opririlor: mentenanță preventivă, verificarea viziunii și a orientării mânerului.',
    },
    none: {
      capacity: Math.min(st.robotCapacity, st.feedCapacity, st.operatorCapacity),
      util: st.robotUtil,
      why: 'Nicio componentă nu produce pierderi de peste 5% din timp. Capacitățile sunt echilibrate pentru parametrii actuali.',
      action: 'Mențineți parametrii; testați scenarii cu butoanele de evenimente.',
    },
  }
  return { ...b, label: COMPONENT_RO[b.component], actual: st.actualRate, ...map[b.component] }
}

/** What-if from a clean start with the current params (no events). */
export function whatIf(params, seconds = 2 * 3600) {
  const out = (patch) => {
    const s = new Simulation({ ...params, ...patch })
    s.runUntil(seconds)
    return (s.s.palletized / seconds) * 3600
  }
  const base = out({})
  return {
    base,
    robotFaster: out({ speedFactor: params.speedFactor * 1.25 }) - base,
    feedHigher: out({ feedRate: params.feedRate * 1.25 }) - base,
    fasterChange: out({ palletChangeTime: params.palletChangeTime * 0.5 }) - base,
  }
}
