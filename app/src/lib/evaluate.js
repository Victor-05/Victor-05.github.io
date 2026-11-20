// Pure evaluation logic for the UR20 compatibility evaluator.
// Reference facts come from the PURATOS case (test results, not guarantees).

export const REFERENCE = {
  formats: {
    5: { bucketsPerPallet: 100, testedRate: 8.6 },
    13: { bucketsPerPallet: 44, testedRate: 7.4 },
  },
  targetRate: 6, // contractual target in the reference project (min 6 buckets/min)
}

// [ASSUMPTION] 15 kg is an internal screening threshold, NOT a published robot
// limit. UR20 payload must include the custom gripper, so anything other than
// the tested 5/13 kg formats needs technical validation by Tech-Con.
export const WEIGHT_SCREENING_LIMIT_KG = 15

export const STATUS = { OK: 'ok', VALIDATE: 'validate', OUT: 'out', INFO: 'info' }

export const VERDICT = {
  COMPATIBLE: 'Compatibil cu cazul de referință',
  REVIEW: 'Necesită evaluare tehnică',
  OUT: 'În afara cazului de referință',
}

const LIMITS = {
  weightKg: [0, 100],
  bucketsPerPallet: [1, 500],
  lineRate: [0, 60],
  shifts: [1, 3],
  hoursPerShift: [1, 12],
}

function toNumber(v) {
  if (v === null || v === undefined) return NaN
  const s = String(v).trim().replace(',', '.')
  if (s === '') return NaN
  return Number(s)
}

export function defaultBucketsPerPallet(weightKg) {
  const f = REFERENCE.formats[toNumber(weightKg)]
  return f ? f.bucketsPerPallet : null
}

/** Validate raw form input. Returns { errors: {field: msg}, values|null }. */
export function validateInputs(raw = {}) {
  const errors = {}
  const companyName = String(raw.companyName ?? '').trim()
  if (companyName.length < 2) errors.companyName = 'Introduceți numele companiei (minim 2 caractere).'

  const weightKg = toNumber(raw.weightKg)
  if (Number.isNaN(weightKg)) errors.weightKg = 'Introduceți greutatea găleții în kg.'
  else if (weightKg <= LIMITS.weightKg[0] || weightKg > LIMITS.weightKg[1])
    errors.weightKg = 'Greutatea trebuie să fie mai mare de 0 și cel mult 100 kg.'

  let bucketsPerPallet = toNumber(raw.bucketsPerPallet)
  if (Number.isNaN(bucketsPerPallet) && !errors.weightKg) {
    bucketsPerPallet = defaultBucketsPerPallet(weightKg) ?? NaN
  }
  if (Number.isNaN(bucketsPerPallet)) {
    if (!errors.weightKg) errors.bucketsPerPallet = 'Introduceți numărul de găleți pe palet (obligatoriu pentru formate diferite de 5 / 13 kg).'
  } else if (!Number.isInteger(bucketsPerPallet) || bucketsPerPallet < LIMITS.bucketsPerPallet[0] || bucketsPerPallet > LIMITS.bucketsPerPallet[1])
    errors.bucketsPerPallet = 'Numărul de găleți pe palet trebuie să fie un număr întreg între 1 și 500.'

  if (raw.hasHandle !== 'da' && raw.hasHandle !== 'nu') errors.hasHandle = 'Selectați dacă găleata are mâner.'
  if (raw.material !== 'plastic' && raw.material !== 'altul') errors.material = 'Selectați materialul ambalajului.'

  const lineRate = toNumber(raw.lineRate)
  if (Number.isNaN(lineRate)) errors.lineRate = 'Introduceți ritmul liniei (găleți/minut).'
  else if (lineRate <= LIMITS.lineRate[0] || lineRate > LIMITS.lineRate[1])
    errors.lineRate = 'Ritmul liniei trebuie să fie mai mare de 0 și cel mult 60 găleți/minut.'

  const shifts = toNumber(raw.shifts)
  if (Number.isNaN(shifts) || !Number.isInteger(shifts) || shifts < 1 || shifts > 3)
    errors.shifts = 'Numărul de schimburi trebuie să fie 1, 2 sau 3.'

  const hoursRaw = raw.hoursPerShift === '' || raw.hoursPerShift == null ? 8 : raw.hoursPerShift
  const hoursPerShift = toNumber(hoursRaw)
  if (Number.isNaN(hoursPerShift) || hoursPerShift < LIMITS.hoursPerShift[0] || hoursPerShift > LIMITS.hoursPerShift[1])
    errors.hoursPerShift = 'Orele pe schimb trebuie să fie între 1 și 12.'
  else if (!errors.shifts && hoursPerShift * shifts > 24)
    errors.hoursPerShift = 'Totalul orelor pe zi (schimburi × ore) nu poate depăși 24.'

  if (Object.keys(errors).length) return { errors, values: null }
  return {
    errors: {},
    values: { companyName, weightKg, bucketsPerPallet, hasHandle: raw.hasHandle, material: raw.material, lineRate, shifts, hoursPerShift },
  }
}

const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d

/** Evaluate validated values. Pure; no money calculations by design. */
export function evaluate(v) {
  const checks = []
  const format = REFERENCE.formats[v.weightKg]

  // 1. Weight
  if (format) {
    checks.push({ id: 'weight', status: STATUS.OK, label: 'Greutate găleată', detail: `${v.weightKg} kg – Format testat în aplicația de referință.` })
  } else if (v.weightKg <= WEIGHT_SCREENING_LIMIT_KG) {
    checks.push({ id: 'weight', status: STATUS.VALIDATE, label: 'Greutate găleată', detail: `${v.weightKg} kg – De validat tehnic (sarcina totală include gripperul).` })
  } else {
    checks.push({ id: 'weight', status: STATUS.OUT, label: 'Greutate găleată', detail: `${v.weightKg} kg – În afara cazului de referință – necesită evaluare separată de către Tech-Con.` })
  }

  // 2. Handle (vision checks handle orientation in the reference)
  checks.push(v.hasHandle === 'da'
    ? { id: 'handle', status: STATUS.OK, label: 'Mâner', detail: 'Găleată cu mâner – ca în aplicația de referință (viziunea 2D verifică orientarea mânerului).' }
    : { id: 'handle', status: STATUS.VALIDATE, label: 'Mâner', detail: 'Fără mâner – de validat (referința folosește viziune pe orientarea mânerului și gripper dedicat).' })

  // 3. Material
  checks.push(v.material === 'plastic'
    ? { id: 'material', status: STATUS.OK, label: 'Material ambalaj', detail: 'Plastic – ca în aplicația de referință.' }
    : { id: 'material', status: STATUS.VALIDATE, label: 'Material ambalaj', detail: 'Alt material decât plastic – de validat (gripperul de referință a fost proiectat pentru găleți din plastic).' })

  // 4. Pallet pattern
  if (format && v.bucketsPerPallet === format.bucketsPerPallet) {
    checks.push({ id: 'pattern', status: STATUS.OK, label: 'Schemă palet', detail: `${v.bucketsPerPallet} găleți/palet – identic cu referința.` })
  } else {
    checks.push({ id: 'pattern', status: STATUS.VALIDATE, label: 'Schemă palet', detail: `${v.bucketsPerPallet} găleți/palet – schema de paletizare trebuie configurată și validată.` })
  }

  // 5. Rate
  const referenceRate = format ? format.testedRate : REFERENCE.targetRate
  const rateIsTested = Boolean(format)
  const robotIsBottleneck = v.lineRate > referenceRate
  const effectiveRate = Math.min(v.lineRate, referenceRate)
  checks.push(robotIsBottleneck
    ? { id: 'rate', status: STATUS.VALIDATE, label: 'Ritm linie vs. robot', detail: `Linia livrează ${v.lineRate} găleți/min, peste referința de ${referenceRate} găleți/min${rateIsTested ? '' : ' (țintă, nu rezultat testat)'}. Robotul poate deveni gâtul de sticlă – de verificat.` }
    : { id: 'rate', status: STATUS.OK, label: 'Ritm linie vs. robot', detail: `Linia livrează ${v.lineRate} găleți/min ≤ referința de ${referenceRate} găleți/min${rateIsTested ? '' : ' (țintă, nu rezultat testat)'}. Alimentarea liniei limitează debitul; robotul are rezervă.` })

  // Daily estimates (effective rate is the min of line and reference)
  const bucketsPerDay = effectiveRate * 60 * v.hoursPerShift * v.shifts
  const palletsPerDay = bucketsPerDay / v.bucketsPerPallet
  const kgPerDay = bucketsPerDay * v.weightKg

  const statuses = checks.map((c) => c.status)
  const verdict = statuses.includes(STATUS.OUT) ? VERDICT.OUT
    : statuses.includes(STATUS.VALIDATE) ? VERDICT.REVIEW
    : VERDICT.COMPATIBLE
  const verdictLevel = verdict === VERDICT.OUT ? STATUS.OUT : verdict === VERDICT.REVIEW ? STATUS.VALIDATE : STATUS.OK

  return {
    verdict,
    verdictLevel,
    checks,
    rate: { line: v.lineRate, reference: referenceRate, rateIsTested, effective: round(effectiveRate, 2), robotIsBottleneck },
    daily: {
      buckets: Math.round(bucketsPerDay),
      pallets: round(palletsPerDay, 1),
      kg: Math.round(kgPerDay),
      hours: v.hoursPerShift * v.shifts,
    },
  }
}

export const DEMO_INPUT = {
  companyName: 'Dulcis Ingrediente SRL (fictiv)',
  weightKg: '13',
  bucketsPerPallet: '',
  hasHandle: 'da',
  material: 'plastic',
  lineRate: '6.5',
  shifts: '2',
  hoursPerShift: '8',
}
