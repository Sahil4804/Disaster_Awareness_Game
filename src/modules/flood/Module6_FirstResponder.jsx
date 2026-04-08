/**
 * Module 6 — First Responder: Contamination Triage
 * Aesthetic: Clinical telemetry monitor · high-stress · real-time vitals
 *
 * Prompt spec: Track bloodVolume, sepsisTimer. Inventory: sterileSaline,
 * floodWater, bandages. Raw floodwater accelerates Vibrio vulnificus sepsis.
 * Must prioritize stopping blood loss over perfect sterility.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ── Constants ────────────────────────────────────────────────────────────────
const TICK_MS = 400
const BLEED_RATE = 1.8          // %/tick base bleed
const BLEED_RATE_TOURNIQUET = 0.15
const BLEED_RATE_PRESSURE = 0.6
const SEPSIS_RATE_RAW = 4.5     // sepsis %/tick if raw floodwater used
const SEPSIS_RATE_BOILED = 1.2  // boiled floodwater — slower but still risky
const SEPSIS_RATE_SALINE = 0    // sterile saline — no sepsis
const LETHAL_BLOOD = 30         // below this = death
const LETHAL_SEPSIS = 100       // sepsis hits 100 = organ failure
const SAFE_BLOOD = 55           // stabilised if above this at end
const PASS_THRESHOLD = 50

const INITIAL_INVENTORY = {
  sterileSaline: 2,
  boiledFloodwater: 3,
  rawFloodwater: 99,
  pressureBandage: 2,
  tourniquet: 1,
  suturePack: 1,
}

// ── Treatment actions ────────────────────────────────────────────────────────
const ACTIONS = [
  {
    id: 'tourniquet', label: 'Apply Tourniquet', emoji: '🔗', cat: 'bleed',
    desc: 'Cuts blood flow to limb. Stops major bleeding instantly.',
    inv: 'tourniquet', invCost: 1,
    effect: (s) => ({ ...s, bleedState: 'tourniquet', tourniqueApplied: true }),
    scienceOk: 'tourniquet compresses the artery upstream of the wound — blood loss drops to near zero. This buys you time to clean and close.',
    scienceBad: null,
  },
  {
    id: 'pressure', label: 'Apply Pressure Bandage', emoji: '🩹', cat: 'bleed',
    desc: 'Direct pressure slows bleeding significantly.',
    inv: 'pressureBandage', invCost: 1,
    effect: (s) => ({ ...s, bleedState: 'pressure' }),
    scienceOk: 'Direct pressure compresses the wound bed, allowing clotting factors to form a platelet plug. Bleeding slows dramatically.',
    scienceBad: null,
  },
  {
    id: 'cleanSaline', label: 'Clean with Sterile Saline', emoji: '💧', cat: 'clean',
    desc: 'Irrigate wound with sterile saline solution.',
    inv: 'sterileSaline', invCost: 1,
    effect: (s) => ({ ...s, cleaned: true, cleanMethod: 'saline', sepsisRate: SEPSIS_RATE_SALINE }),
    scienceOk: 'Sterile saline (0.9% NaCl) matches your body\'s tonicity. Zero bacterial load. Gold standard for wound irrigation.',
    scienceBad: null,
  },
  {
    id: 'cleanBoiled', label: 'Clean with Boiled Floodwater', emoji: '🫗', cat: 'clean',
    desc: 'Floodwater boiled for 1 min. Kills most bacteria.',
    inv: 'boiledFloodwater', invCost: 1,
    effect: (s) => ({ ...s, cleaned: true, cleanMethod: 'boiled', sepsisRate: SEPSIS_RATE_BOILED }),
    scienceOk: null,
    scienceBad: 'Boiling kills bacteria but does NOT remove chemical toxins, heavy metals, or endotoxins from sewage. Vibrio vulnificus endotoxin survives boiling. Sepsis risk is reduced but NOT eliminated.',
  },
  {
    id: 'cleanRaw', label: 'Clean with Raw Floodwater', emoji: '🚰', cat: 'clean',
    desc: 'Untreated water from the flooded street.',
    inv: 'rawFloodwater', invCost: 1,
    effect: (s) => ({ ...s, cleaned: true, cleanMethod: 'raw', sepsisRate: SEPSIS_RATE_RAW }),
    scienceOk: null,
    scienceBad: 'RAW FLOODWATER is agricultural runoff + raw sewage + industrial chemicals. Vibrio vulnificus, E. coli, Leptospira — you just injected necrotising fasciitis directly into an open wound. Sepsis is now accelerating rapidly.',
  },
  {
    id: 'suture', label: 'Suture / Close Wound', emoji: '🪡', cat: 'close',
    desc: 'Close the laceration to stop residual bleeding.',
    inv: 'suturePack', invCost: 1,
    effect: (s) => ({ ...s, sutured: true, bleedState: 'sutured' }),
    scienceOk: 'Wound closure with sutures stops residual capillary bleeding and protects the wound bed from further contamination.',
    scienceBad: null,
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

function heartRateFromBlood(blood) {
  if (blood > 80) return 72 + Math.floor(Math.random() * 6)
  if (blood > 60) return 95 + Math.floor(Math.random() * 15)
  if (blood > 40) return 120 + Math.floor(Math.random() * 20)
  return 140 + Math.floor(Math.random() * 25)
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Module6_FirstResponder() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | sim | result
  const [blood, setBlood] = useState(100)
  const [sepsis, setSepsis] = useState(0)
  const [bleedState, setBleedState] = useState('open') // open | pressure | tourniquet | sutured
  const [cleaned, setCleaned] = useState(false)
  const [cleanMethod, setCleanMethod] = useState(null)
  const [sutured, setSutured] = useState(false)
  const [sepsisRate, setSepsisRate] = useState(0)
  const [tourniqueApplied, setTourniqueApplied] = useState(false)
  const [inventory, setInventory] = useState({ ...INITIAL_INVENTORY })
  const [log, setLog] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [heartRate, setHeartRate] = useState(78)
  const [outcome, setOutcome] = useState(null) // null | { score, passed, cause }
  const [pulse, setPulse] = useState(false)

  const simRef = useRef(null)
  const stateRef = useRef({})

  // Keep ref in sync for interval callback
  useEffect(() => {
    stateRef.current = { blood, sepsis, bleedState, sepsisRate, cleaned, sutured, elapsed }
  })

  // ── Simulation tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'sim') return
    simRef.current = setInterval(() => {
      const s = stateRef.current

      // Blood loss
      let bleedAmt = BLEED_RATE
      if (s.bleedState === 'tourniquet') bleedAmt = BLEED_RATE_TOURNIQUET
      else if (s.bleedState === 'pressure') bleedAmt = BLEED_RATE_PRESSURE
      else if (s.bleedState === 'sutured') bleedAmt = 0.05

      const newBlood = clamp(s.blood - bleedAmt, 0, 100)
      setBlood(newBlood)

      // Sepsis
      const newSepsis = clamp(s.sepsis + s.sepsisRate, 0, 150)
      setSepsis(newSepsis)

      // Heart rate
      setHeartRate(heartRateFromBlood(newBlood))
      setPulse(p => !p)

      setElapsed(e => e + 1)

      // Check death conditions
      if (newBlood <= LETHAL_BLOOD) {
        clearInterval(simRef.current)
        const r = { score: 5, passed: false }
        setOutcome({ ...r, cause: 'hemorrhage' })
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: r } })
        setPhase('result')
      } else if (newSepsis >= LETHAL_SEPSIS) {
        clearInterval(simRef.current)
        const r = { score: 15, passed: false }
        setOutcome({ ...r, cause: 'sepsis' })
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: r } })
        setPhase('result')
      }
    }, TICK_MS)
    return () => clearInterval(simRef.current)
  }, [phase, dispatch])

  // ── Stabilise check (player can click "Stabilise Patient" when ready) ──
  const handleStabilise = useCallback(() => {
    clearInterval(simRef.current)
    const bld = stateRef.current.blood
    const sep = stateRef.current.sepsis
    const cm = cleanMethod

    let score = 0
    // Blood saved (max 40 pts)
    score += Math.round(clamp((bld - LETHAL_BLOOD) / (100 - LETHAL_BLOOD), 0, 1) * 40)
    // Sepsis avoided (max 30 pts)
    score += Math.round(clamp(1 - sep / LETHAL_SEPSIS, 0, 1) * 30)
    // Clean method bonus
    if (cm === 'saline') score += 20
    else if (cm === 'boiled') score += 10
    else if (cm === 'raw') score += 0
    else score += 0 // never cleaned
    // Correct order bonus (stopped bleeding before cleaning)
    if (tourniqueApplied || bleedState === 'pressure') score += 10

    score = clamp(score, 0, 100)
    const passed = score >= PASS_THRESHOLD && bld > SAFE_BLOOD && sep < 60

    const r = { score, passed }
    setOutcome({ ...r, cause: passed ? 'stabilised' : 'complications' })
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: r } })
    setPhase('result')
  }, [cleanMethod, tourniqueApplied, bleedState, dispatch])

  // ── Action handler ─────────────────────────────────────────────────────────
  const handleAction = useCallback((action) => {
    // Check inventory
    if (inventory[action.inv] <= 0) return

    // Apply
    setInventory(inv => ({ ...inv, [action.inv]: inv[action.inv] - action.invCost }))

    const newState = action.effect({
      bleedState, cleaned, cleanMethod, sepsisRate, sutured, tourniqueApplied,
    })
    if (newState.bleedState !== undefined) setBleedState(newState.bleedState)
    if (newState.cleaned !== undefined) setCleaned(newState.cleaned)
    if (newState.cleanMethod !== undefined) setCleanMethod(newState.cleanMethod)
    if (newState.sepsisRate !== undefined) setSepsisRate(newState.sepsisRate)
    if (newState.sutured !== undefined) setSutured(newState.sutured)
    if (newState.tourniqueApplied !== undefined) setTourniqueApplied(newState.tourniqueApplied)

    // Log
    const msg = action.scienceBad || action.scienceOk
    const isWarn = !!action.scienceBad
    setLog(l => [...l, { text: `${action.emoji} ${action.label}: ${msg}`, warn: isWarn, t: Date.now() }])
  }, [inventory, bleedState, cleaned, cleanMethod, sepsisRate, sutured, tourniqueApplied])

  // ── Start sim ──────────────────────────────────────────────────────────────
  const startSim = useCallback(() => {
    setPhase('sim')
    setBlood(100)
    setSepsis(0)
    setBleedState('open')
    setCleaned(false)
    setCleanMethod(null)
    setSutured(false)
    setSepsisRate(0)
    setTourniqueApplied(false)
    setInventory({ ...INITIAL_INVENTORY })
    setLog([{ text: '🩸 Patient presented: Deep leg laceration from flood debris. Arterial bleeding active.', warn: true, t: Date.now() }])
    setElapsed(0)
    setOutcome(null)
  }, [])

  // ── Render: INTRO ──────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={S.screen}>
        <div style={S.introCard}>
          <div style={{ fontSize: 56 }}>🚑</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 28, margin: '8px 0' }}>Module 6: First Responder</h1>
          <h2 style={{ color: '#f87171', fontSize: 16, fontWeight: 700, margin: 0 }}>Contamination Triage</h2>
          <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, marginTop: 16 }}>
            A survivor has a <strong style={{ color: '#ef4444' }}>severe leg laceration</strong> from
            flood debris. Arterial bleeding is active. You have limited medical supplies.
          </p>
          <div style={S.warnBox}>
            <p style={{ color: '#fbbf24', fontWeight: 700, margin: '0 0 8px', fontSize: 14 }}>
              THE DILEMMA
            </p>
            <p style={{ color: '#fde68a', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              You have only <strong>2 units</strong> of sterile saline. Floodwater is everywhere,
              but it is <strong>agricultural runoff + raw sewage</strong>. Using it on an open wound
              introduces <em>Vibrio vulnificus</em> — a flesh-eating bacteria that causes sepsis
              within hours.
            </p>
            <p style={{ color: '#fca5a5', fontSize: 13, lineHeight: 1.7, margin: '10px 0 0' }}>
              <strong>You must decide:</strong> stop the bleeding first, or clean the wound?
              Use sterile saline (limited) or floodwater (abundant but deadly)?
            </p>
          </div>
          <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, padding: '12px 16px', width: '100%', textAlign: 'left' }}>
            <p style={{ color: '#7dd3fc', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
              <strong>Controls:</strong> Click treatment actions to apply them. Watch the vitals monitor.
              Blood drains in real time. Click <em>"Stabilise Patient"</em> when you believe
              the patient is stable enough to transport.
            </p>
          </div>
          <button style={S.primaryBtn} onClick={startSim}>Begin Triage</button>
          <button style={S.ghost} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── Render: RESULT ─────────────────────────────────────────────────────────
  if (phase === 'result' && outcome) {
    const dead = outcome.cause === 'hemorrhage' || outcome.cause === 'sepsis'
    return (
      <div style={S.screen}>
        <div style={{ ...S.introCard, maxWidth: 620 }}>
          <div style={{ fontSize: 56 }}>{dead ? '💀' : outcome.passed ? '🏥' : '⚠️'}</div>
          <h1 style={{ color: dead ? '#ef4444' : outcome.passed ? '#4ade80' : '#fbbf24', fontSize: 26, margin: '8px 0' }}>
            {outcome.cause === 'hemorrhage' && 'Patient Lost: Hemorrhagic Shock'}
            {outcome.cause === 'sepsis' && 'Patient Lost: Septic Shock (Vibrio vulnificus)'}
            {outcome.cause === 'stabilised' && 'Patient Stabilised!'}
            {outcome.cause === 'complications' && 'Patient Survived with Complications'}
          </h1>
          <div style={{ fontSize: 40, fontWeight: 800, color: outcome.passed ? '#4ade80' : '#f87171' }}>
            {outcome.score}/100
          </div>

          {outcome.cause === 'sepsis' && (
            <div style={{ ...S.warnBox, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
              <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                <strong>Vibrio vulnificus</strong> entered through the wound via contaminated floodwater.
                This gram-negative bacteria causes necrotising fasciitis (flesh-eating disease) and
                septic shock. Mortality rate exceeds 50%. Floodwater is NOT water — it is raw sewage,
                agricultural runoff, and industrial chemicals.
              </p>
            </div>
          )}

          {outcome.cause === 'hemorrhage' && (
            <div style={{ ...S.warnBox, borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}>
              <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                <strong>Exsanguination.</strong> The patient lost too much blood before you could
                control the bleeding. In trauma, <strong>hemorrhage control is ALWAYS step 1</strong> —
                even before wound cleaning. Apply a tourniquet or direct pressure immediately.
                You can worry about infection later; a dead patient can't get sepsis.
              </p>
            </div>
          )}

          <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, padding: '14px 18px', width: '100%', textAlign: 'left' }}>
            <h3 style={{ color: '#38bdf8', margin: '0 0 10px', fontSize: 15 }}>Key Lessons</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2.2, fontSize: 13 }}>
              <li style={{ color: '#fca5a5' }}>1. <strong>Stop bleeding FIRST</strong> — tourniquet or pressure. Always. No exceptions.</li>
              <li style={{ color: '#fde68a' }}>2. <strong>Never use raw floodwater</strong> on wounds — it is sewage + chemicals.</li>
              <li style={{ color: '#bbf7d0' }}>3. <strong>Sterile saline</strong> is the gold standard for wound irrigation.</li>
              <li style={{ color: '#e0e7ff' }}>4. <strong>Boiled floodwater</strong> kills bacteria but endotoxins and chemicals survive boiling.</li>
              <li style={{ color: '#fda4af' }}>5. In triage, <strong>imperfect treatment now</strong> beats perfect treatment too late.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button style={S.primaryBtn} onClick={startSim}>Try Again</button>
            <button style={S.secondaryBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: SIMULATION ─────────────────────────────────────────────────────
  const bloodPct = clamp(blood, 0, 100)
  const sepsisPct = clamp(sepsis, 0, 100)
  const bloodColor = blood > 70 ? '#22c55e' : blood > 50 ? '#eab308' : blood > 35 ? '#f97316' : '#ef4444'
  const sepsisColor = sepsis < 20 ? '#22c55e' : sepsis < 50 ? '#eab308' : sepsis < 75 ? '#f97316' : '#ef4444'
  const hrColor = heartRate < 100 ? '#22c55e' : heartRate < 130 ? '#eab308' : '#ef4444'

  return (
    <div style={S.simContainer}>
      {/* ── TOP: Telemetry Monitor ── */}
      <div style={S.telemetry}>
        <div style={S.telHeader}>
          <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
            Patient Telemetry
          </span>
          <span style={{ color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>
            T+{Math.floor(elapsed * TICK_MS / 1000)}s
          </span>
        </div>

        <div style={S.vitalsRow}>
          {/* Heart Rate */}
          <div style={S.vitalCard}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>HR bpm</div>
            <div style={{
              fontSize: 32, fontWeight: 800, fontFamily: 'monospace', color: hrColor,
              transform: pulse ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.15s',
            }}>
              {heartRate}
            </div>
            <div style={{ fontSize: 18, color: hrColor, marginTop: -4 }}>
              {pulse ? '♥' : '♡'}
            </div>
          </div>

          {/* Blood Volume */}
          <div style={{ ...S.vitalCard, flex: 2 }}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Blood Volume
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={S.barOuter}>
                <div style={{
                  ...S.barInner,
                  width: `${bloodPct}%`,
                  background: `linear-gradient(90deg, ${bloodColor}, ${blood > 60 ? '#4ade80' : bloodColor})`,
                }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: bloodColor, minWidth: 48 }}>
                {Math.round(blood)}%
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
              {bleedState === 'open' && '🩸 ACTIVE BLEED — UNCONTROLLED'}
              {bleedState === 'pressure' && '🩹 Pressure applied — bleed slowed'}
              {bleedState === 'tourniquet' && '🔗 Tourniquet — bleed minimal'}
              {bleedState === 'sutured' && '🪡 Sutured — wound closed'}
            </div>
          </div>

          {/* Sepsis */}
          <div style={{ ...S.vitalCard, flex: 2 }}>
            <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Sepsis Risk
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <div style={S.barOuter}>
                <div style={{
                  ...S.barInner,
                  width: `${sepsisPct}%`,
                  background: `linear-gradient(90deg, #22c55e, ${sepsisColor})`,
                }} />
              </div>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: sepsisColor, minWidth: 48 }}>
                {Math.round(sepsis)}%
              </span>
            </div>
            <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
              {!cleaned && 'Wound uncleaned'}
              {cleanMethod === 'saline' && '💧 Cleaned with sterile saline — minimal risk'}
              {cleanMethod === 'boiled' && '🫗 Boiled floodwater — endotoxins present'}
              {cleanMethod === 'raw' && '🚰 RAW FLOODWATER — Vibrio vulnificus active!'}
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE: Patient + Actions ── */}
      <div style={S.midSection}>
        {/* Patient Visual */}
        <div style={S.patientPanel}>
          <div style={{ fontSize: 80, marginBottom: 8, filter: blood < 40 ? 'grayscale(0.6)' : 'none' }}>
            🦵
          </div>
          <div style={{
            width: 120, height: 14, borderRadius: 7, overflow: 'hidden',
            background: '#1e293b', border: '1px solid #334155', margin: '0 auto',
          }}>
            <div style={{
              height: '100%', borderRadius: 7,
              width: `${100 - bloodPct}%`,
              background: '#dc2626',
              transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ color: '#f87171', fontSize: 12, marginTop: 6, fontFamily: 'monospace' }}>
            {bleedState === 'open' ? '🩸 BLEEDING ACTIVELY' : bleedState === 'pressure' ? '🩹 Pressure on wound' : bleedState === 'tourniquet' ? '🔗 Tourniquet applied' : '🪡 Wound closed'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 8, lineHeight: 1.6, maxWidth: 200, textAlign: 'center' }}>
            Deep laceration on left thigh. Flood debris punctured through muscle tissue. Arterial bleed suspected.
          </div>
        </div>

        {/* Actions */}
        <div style={S.actionsPanel}>
          <div style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
            Treatment Actions
          </div>
          <div style={S.actionsGrid}>
            {ACTIONS.map(action => {
              const hasInv = inventory[action.inv] > 0
              const isUsed = (action.id === 'tourniquet' && tourniqueApplied) ||
                             (action.id === 'suture' && sutured) ||
                             (action.cat === 'clean' && cleaned && cleanMethod && action.id.includes(cleanMethod === 'saline' ? 'Saline' : cleanMethod === 'boiled' ? 'Boiled' : 'Raw'))
              const disabled = !hasInv || (action.cat === 'clean' && cleaned) || (action.id === 'suture' && sutured) || (action.id === 'tourniquet' && tourniqueApplied)

              return (
                <button
                  key={action.id}
                  disabled={disabled}
                  onClick={() => !disabled && handleAction(action)}
                  style={{
                    ...S.actionBtn,
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? 'default' : 'pointer',
                    borderColor: action.cat === 'bleed' ? 'rgba(239,68,68,0.3)' :
                                 action.cat === 'clean' ? 'rgba(56,189,248,0.3)' :
                                 'rgba(168,85,247,0.3)',
                    background: action.cat === 'bleed' ? 'rgba(239,68,68,0.06)' :
                                action.cat === 'clean' ? 'rgba(56,189,248,0.06)' :
                                'rgba(168,85,247,0.06)',
                  }}
                >
                  <div style={{ fontSize: 22 }}>{action.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{action.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{action.desc}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    Stock: {inventory[action.inv]}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Stabilise button */}
          <button
            onClick={handleStabilise}
            style={{
              ...S.stabiliseBtn,
              background: (blood > SAFE_BLOOD && cleaned && (bleedState === 'sutured' || bleedState === 'tourniquet' || bleedState === 'pressure'))
                ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                : '#334155',
            }}
          >
            Stabilise Patient &amp; Transport
          </button>
        </div>
      </div>

      {/* ── BOTTOM: Event Log ── */}
      <div style={S.logPanel}>
        <div style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
          Treatment Log
        </div>
        <div style={S.logScroll}>
          {log.map((entry, i) => (
            <div key={i} style={{
              color: entry.warn ? '#fbbf24' : '#94a3b8',
              fontSize: 12, lineHeight: 1.6, padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      {/* Back button */}
      <button style={{ ...S.ghost, position: 'absolute', top: 12, left: 16 }}
        onClick={() => { clearInterval(simRef.current); dispatch({ type: 'BACK_TO_MODULES' }) }}>
        ← Quit
      </button>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: '#0f172a', fontFamily: 'system-ui, sans-serif',
  },
  introCard: {
    maxWidth: 540, padding: '36px 32px', textAlign: 'center',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  warnBox: {
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 10, padding: '14px 18px', width: '100%', textAlign: 'left',
  },
  primaryBtn: {
    padding: '13px 40px', fontSize: 16, fontWeight: 700,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '13px 28px', fontSize: 15, fontWeight: 600,
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
    color: '#a5b4fc', borderRadius: 10, cursor: 'pointer',
  },
  ghost: {
    background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 13, padding: 0,
  },

  // Simulation layout
  simContainer: {
    minHeight: '100vh', width: '100vw', background: '#0a0f1a',
    fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  telemetry: {
    background: '#0f172a', borderBottom: '1px solid #1e293b',
    padding: '12px 24px',
  },
  telHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  vitalsRow: {
    display: 'flex', gap: 16, flexWrap: 'wrap',
  },
  vitalCard: {
    flex: 1, minWidth: 100, background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
    padding: '10px 14px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  barOuter: {
    flex: 1, height: 10, borderRadius: 5, background: '#1e293b',
    overflow: 'hidden', border: '1px solid #334155',
  },
  barInner: {
    height: '100%', borderRadius: 5, transition: 'width 0.3s, background 0.3s',
  },

  midSection: {
    flex: 1, display: 'flex', gap: 0, overflow: 'hidden',
  },
  patientPanel: {
    width: 260, background: '#0f172a', borderRight: '1px solid #1e293b',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 20,
  },
  actionsPanel: {
    flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column',
    overflow: 'auto',
  },
  actionsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170, 1fr))',
    gap: 10, marginBottom: 16,
  },
  actionBtn: {
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    padding: '10px 12px', textAlign: 'center', background: 'rgba(255,255,255,0.03)',
    transition: 'all 0.15s',
  },
  stabiliseBtn: {
    padding: '14px 32px', fontSize: 15, fontWeight: 700,
    color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
    width: '100%', marginTop: 'auto',
  },

  logPanel: {
    height: 130, background: '#0f172a', borderTop: '1px solid #1e293b',
    padding: '10px 24px', overflow: 'hidden',
  },
  logScroll: {
    height: 100, overflowY: 'auto',
  },
}
