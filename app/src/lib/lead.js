// Validation for the "request technical evaluation" form. Pure.
export function validateLead(raw, today = new Date()) {
  const e = {}
  const name = String(raw.name ?? '').trim()
  if (name.length < 2) e.name = 'Introduceți numele (minim 2 caractere).'
  const email = String(raw.email ?? '').trim()
  if (!email) e.email = 'Introduceți adresa de e-mail.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) e.email = 'Adresa de e-mail nu este validă.'
  const phone = String(raw.phone ?? '').trim()
  if (phone && !/^\+?[\d\s.-]{9,16}$/.test(phone)) e.phone = 'Numărul de telefon nu este valid (ex. 07xx xxx xxx).'
  if (!raw.date) e.date = 'Alegeți data preferată pentru demonstrație.'
  else {
    const d = new Date(raw.date + 'T00:00:00')
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    if (Number.isNaN(d.getTime())) e.date = 'Data nu este validă.'
    else if (d < t) e.date = 'Data trebuie să fie azi sau în viitor.'
  }
  if (!raw.consent) e.consent = 'Este necesar acordul pentru a fi contactat(ă).'
  return e
}

export function makeReferenceId(rand = Math.random) {
  return 'TC-' + String(Math.floor(rand() * 10000)).padStart(4, '0')
}

export function saveLead(lead) {
  try {
    const key = 'ur20-leads'
    const list = JSON.parse(localStorage.getItem(key) || '[]')
    list.push(lead)
    localStorage.setItem(key, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

/** Build the stored lead object. Evaluator data and simulator config are both optional. */
export function buildLead({ form, values = null, result = null, simConfig = null, id = makeReferenceId(), now = new Date() }) {
  return {
    id,
    createdAt: now.toISOString(),
    ...form,
    company: values?.companyName || form.company?.trim() || 'Nespecificat',
    source: simConfig && values ? 'evaluator+digital-twin' : simConfig ? 'digital-twin' : 'evaluator',
    input: values,
    verdict: result?.verdict ?? null,
    daily: result?.daily ?? null,
    simConfig,
  }
}
