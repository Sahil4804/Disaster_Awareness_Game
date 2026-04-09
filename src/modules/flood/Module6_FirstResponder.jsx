/**
 * Module 6 — Mass Casualty Triage (START Protocol)
 *
 * Flash flood aftermath: 5 casualties, scavenged supplies, 180-second golden window.
 * Real-time patient deterioration. Correctly triage, stabilize saveable patients,
 * avoid the PT-04 (expectant) resource trap.
 */
import { useState, useEffect, useReducer, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ── Constants ────────────────────────────────────────────────────────────────
const TICK_MS = 100
const FONT = "'JetBrains Mono', 'Courier New', monospace"
const TAG_COLORS = {
  GREEN:  '#39ff14',
  YELLOW: '#ffe600',
  RED:    '#ff1744',
  BLACK:  '#424242',
}
const TAG_LABELS = ['GREEN', 'YELLOW', 'RED', 'BLACK']

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ── Reducer ──────────────────────────────────────────────────────────────────
const initialState = {
  timeRemaining: 180,
  phase: 'intro',
  activePatient: null,
  triageTags: { 0: null, 1: null, 2: null, 3: null, 4: null },
  patients: [
    {
      id: 'PT-01', name: 'Marcus', age: 34, label: 'Severe Laceration',
      desc: 'Arterial spurt from right thigh. Tourniquet-grade hemorrhage.',
      correctTag: 'RED',
      bpm: 118, map: 62, coreTemp: 36.4, respRate: 28,
      bleedRate: 0.8,
      tissueDamage: 0,
      treated: false, stabilized: false, deceased: false,
    },
    {
      id: 'PT-02', name: 'Diana', age: 28, label: 'Open Femur Fracture',
      desc: 'Exposed bone fragment from left femur. Screaming in agony.',
      correctTag: 'YELLOW',
      bpm: 105, map: 78, coreTemp: 36.8, respRate: 22,
      painSpike: 0.3,
      shockTimer: 0,
      treated: false, stabilized: false, deceased: false,
    },
    {
      id: 'PT-03', name: 'James', age: 52, label: 'Severe Hypothermia',
      desc: 'Pulled from submerged vehicle. Shivering violently. Lips blue.',
      correctTag: 'RED',
      bpm: 52, map: 70, coreTemp: 33.5, respRate: 10,
      coolingRate: 0.015,
      treated: false, stabilized: false, deceased: false,
    },
    {
      id: 'PT-04', name: 'Ruth', age: 67, label: 'Massive Head Trauma',
      desc: 'Unresponsive. No spontaneous breathing. Fixed dilated pupils.',
      correctTag: 'BLACK',
      bpm: 0, map: 0, coreTemp: 34.0, respRate: 0,
      treated: false, stabilized: false, deceased: true,
    },
    {
      id: 'PT-05', name: 'Alex', age: 19, label: 'Minor Cuts, Hysterical',
      desc: 'Superficial lacerations. Hyperventilating. Blocking your workspace.',
      correctTag: 'GREEN',
      bpm: 138, map: 95, coreTemp: 37.1, respRate: 32,
      hysteriaLevel: 80,
      taskAssigned: false,
      treated: false, stabilized: false, deceased: false,
    },
  ],
  inventory: {
    tornShirts: 4,
    ductTapeSplint: 2,
    garbageBags: 3,
    bottledWater: 1,
  },
  log: [],
  resourceWastedOnBlack: false,
  timeSpentOnPT04: 0,
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return {
        ...initialState,
        phase: 'active',
        log: [{ text: 'GOLDEN WINDOW ACTIVE. 180 seconds. Triage and stabilize.', warn: false, t: Date.now() }],
      }

    case 'TICK': {
      if (state.phase !== 'active') return state
      const newTime = state.timeRemaining - 0.1
      if (newTime <= 0) {
        return { ...state, timeRemaining: 0, phase: 'result' }
      }

      const pts = state.patients.map((p, idx) => {
        const pt = { ...p }
        if (pt.deceased) return pt

        // PT-01: Marcus — Arterial hemorrhage
        if (idx === 0) {
          if (!pt.treated) {
            pt.map = pt.map - pt.bleedRate
          } else {
            // Tourniquet applied: bleedRate = 0 but tissue damage accrues
            pt.tissueDamage = (pt.tissueDamage || 0) + 0.1
          }
          if (pt.map <= 0) {
            pt.map = 0; pt.deceased = true; pt.bpm = 0; pt.respRate = 0
          }
        }

        // PT-02: Diana — Open femur fracture
        if (idx === 1) {
          if (!pt.treated) {
            pt.bpm = pt.bpm + pt.painSpike
            if (pt.bpm > 160) {
              pt.shockTimer = (pt.shockTimer || 0) + 1
              pt.map = pt.map - 0.4
            }
          }
          if (pt.map <= 0) {
            pt.map = 0; pt.deceased = true; pt.bpm = 0; pt.respRate = 0
          }
        }

        // PT-03: James — Hypothermia
        if (idx === 2) {
          if (!pt.treated) {
            pt.coreTemp = pt.coreTemp - pt.coolingRate
          } else {
            // Vapor barrier: slowly rewarm
            pt.coolingRate = -0.005
            pt.coreTemp = pt.coreTemp - pt.coolingRate // subtracting negative = adding
          }
          if (pt.coreTemp <= 28.0) {
            pt.deceased = true; pt.bpm = 0; pt.respRate = 0; pt.map = 0
          }
        }

        // PT-05: Alex — Hysteria
        if (idx === 4) {
          if (pt.taskAssigned) {
            pt.bpm = Math.max(90, pt.bpm - 0.5)
            pt.hysteriaLevel = Math.max(0, (pt.hysteriaLevel || 0) - 0.4)
          }
        }

        return pt
      })

      // Track time spent on PT-04
      let pt04Time = state.timeSpentOnPT04
      if (state.activePatient === 3) {
        pt04Time += 0.1
      }

      return { ...state, timeRemaining: newTime, patients: pts, timeSpentOnPT04: pt04Time }
    }

    case 'SELECT_PATIENT':
      return { ...state, activePatient: action.payload }

    case 'ASSIGN_TAG':
      return {
        ...state,
        triageTags: { ...state.triageTags, [action.payload.idx]: action.payload.tag },
      }

    case 'APPLY_TOURNIQUET': {
      if (state.inventory.tornShirts <= 0) return state
      const pts = [...state.patients]
      const pt = { ...pts[0] }
      if (pt.treated || pt.deceased) return state
      pt.treated = true
      pt.stabilized = true
      pt.bleedRate = 0
      pts[0] = pt
      return {
        ...state,
        patients: pts,
        inventory: { ...state.inventory, tornShirts: state.inventory.tornShirts - 1 },
        log: [...state.log, { text: 'Tourniquet applied to PT-01 (Marcus). Hemorrhage controlled.', warn: false, t: Date.now() }],
      }
    }

    case 'APPLY_SPLINT': {
      if (state.inventory.ductTapeSplint <= 0) return state
      const pts = [...state.patients]
      const pt = { ...pts[1] }
      if (pt.treated || pt.deceased) return state
      pt.treated = true
      pt.stabilized = true
      pt.painSpike = 0
      pts[1] = pt
      return {
        ...state,
        patients: pts,
        inventory: { ...state.inventory, ductTapeSplint: state.inventory.ductTapeSplint - 1 },
        log: [...state.log, { text: 'Improvised splint applied to PT-02 (Diana). Fracture immobilized.', warn: false, t: Date.now() }],
      }
    }

    case 'APPLY_VAPOR_BARRIER': {
      if (state.inventory.garbageBags <= 0) return state
      const pts = [...state.patients]
      const pt = { ...pts[2] }
      if (pt.treated || pt.deceased) return state
      pt.treated = true
      pt.stabilized = true
      pts[2] = pt
      return {
        ...state,
        patients: pts,
        inventory: { ...state.inventory, garbageBags: state.inventory.garbageBags - 1 },
        log: [...state.log, { text: 'Vapor barrier (garbage bag) applied to PT-03 (James). Rewarming initiated.', warn: false, t: Date.now() }],
      }
    }

    case 'ASSIGN_TASK': {
      const pts = [...state.patients]
      const pt = { ...pts[4] }
      if (pt.taskAssigned) return state
      pt.taskAssigned = true
      pt.treated = true
      pts[4] = pt
      return {
        ...state,
        patients: pts,
        log: [...state.log, { text: 'PT-05 (Alex) assigned task: sorting supplies. Hysteria subsiding.', warn: false, t: Date.now() }],
      }
    }

    case 'GIVE_WATER': {
      if (state.inventory.bottledWater <= 0) return state
      const targetIdx = action.payload
      const pts = [...state.patients]
      const pt = { ...pts[targetIdx] }
      let newLog = [...state.log]
      let wasted = state.resourceWastedOnBlack

      if (targetIdx === 3) {
        // PT-04 trap
        wasted = true
        newLog.push({ text: 'CRITICAL: Resources wasted on expectant patient. Others may die.', warn: true, t: Date.now() })
      } else if (targetIdx === 0) {
        pt.map = Math.min(100, pt.map + 5)
        newLog.push({ text: 'Water given to PT-01 (Marcus). Small MAP boost (+5).', warn: false, t: Date.now() })
      } else {
        newLog.push({ text: `Water given to ${pt.id} (${pt.name}).`, warn: false, t: Date.now() })
      }
      pts[targetIdx] = pt
      return {
        ...state,
        patients: pts,
        inventory: { ...state.inventory, bottledWater: state.inventory.bottledWater - 1 },
        log: newLog,
        resourceWastedOnBlack: wasted,
      }
    }

    case 'END_GAME':
      return { ...state, phase: 'result' }

    default:
      return state
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Module6_MassCasualtyTriage() {
  const { dispatch: gameDispatch } = useGame()
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const tickRef = useRef(null)
  const logEndRef = useRef(null)
  const stateRef = useRef(state)
  const [pulse, setPulse] = useState(false)
  const [hiddenInvItem, setHiddenInvItem] = useState(null)
  const [pt04Warning, setPt04Warning] = useState(false)
  const [crashingPatients, setCrashingPatients] = useState(new Set())
  const hysteriaTimerRef = useRef(0)
  const scoreRecorded = useRef(false)

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state })

  // Scroll log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.log.length])

  // Game loop
  useEffect(() => {
    if (state.phase !== 'active') {
      clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => {
      dispatch({ type: 'TICK' })
      setPulse(p => !p)
    }, TICK_MS)
    return () => clearInterval(tickRef.current)
  }, [state.phase])

  // PT-05 hysteria: hide random inventory item
  useEffect(() => {
    if (state.phase !== 'active') return
    const pt05 = state.patients[4]
    if (pt05.taskAssigned || pt05.deceased) {
      setHiddenInvItem(null)
      return
    }
    hysteriaTimerRef.current += TICK_MS
    if (hysteriaTimerRef.current >= 3000) {
      hysteriaTimerRef.current = 0
      const items = ['tornShirts', 'ductTapeSplint', 'garbageBags', 'bottledWater']
      const randomItem = items[Math.floor(Math.random() * items.length)]
      setHiddenInvItem(randomItem)
      setTimeout(() => setHiddenInvItem(null), 1500)
    }
  }, [state.timeRemaining, state.phase, state.patients])

  // PT-04 warning
  useEffect(() => {
    setPt04Warning(state.timeSpentOnPT04 > 5)
  }, [state.timeSpentOnPT04])

  // Crashing patients detection
  useEffect(() => {
    const crashing = new Set()
    state.patients.forEach((pt, idx) => {
      if (pt.deceased || pt.stabilized) return
      if (idx === 0 && pt.map < 30 && !pt.treated) crashing.add(idx)
      if (idx === 1 && pt.bpm > 150 && !pt.treated) crashing.add(idx)
      if (idx === 2 && pt.coreTemp < 30 && !pt.treated) crashing.add(idx)
    })
    setCrashingPatients(crashing)
  }, [state.patients])

  // Record score on result phase
  useEffect(() => {
    if (state.phase !== 'result' || scoreRecorded.current) return
    scoreRecorded.current = true

    const { triageTags, patients, resourceWastedOnBlack } = state
    let triageScore = 0
    patients.forEach((pt, idx) => {
      if (triageTags[idx] === pt.correctTag) triageScore += 15
    })

    let survivalScore = 0
    ;[0, 1, 2].forEach(idx => {
      if (!patients[idx].deceased) survivalScore += 20
    })

    const resourcePenalty = resourceWastedOnBlack ? -25 : 0
    const pt05Bonus = patients[4].taskAssigned ? 10 : -10

    const total = clamp(triageScore + survivalScore + resourcePenalty + pt05Bonus, 0, 100)
    const passed = total >= 50

    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: { score: total, passed } } })
  }, [state.phase, state.triageTags, state.patients, state.resourceWastedOnBlack, gameDispatch])

  const handleBack = useCallback(() => {
    clearInterval(tickRef.current)
    gameDispatch({ type: 'BACK_TO_MODULES' })
  }, [gameDispatch])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // ── Scoring calculation for result display ─────────────────────────────────
  const computeScore = () => {
    const { triageTags, patients, resourceWastedOnBlack } = state
    let triageScore = 0
    const triageDetails = []
    patients.forEach((pt, idx) => {
      const correct = triageTags[idx] === pt.correctTag
      if (correct) triageScore += 15
      triageDetails.push({ id: pt.id, name: pt.name, assigned: triageTags[idx], correct: pt.correctTag, ok: correct })
    })

    let survivalScore = 0
    const survivalDetails = []
    ;[0, 1, 2].forEach(idx => {
      const alive = !patients[idx].deceased
      if (alive) survivalScore += 20
      survivalDetails.push({ id: patients[idx].id, name: patients[idx].name, alive })
    })

    const resourcePenalty = resourceWastedOnBlack ? -25 : 0
    const pt05Bonus = patients[4].taskAssigned ? 10 : -10

    const total = clamp(triageScore + survivalScore + resourcePenalty + pt05Bonus, 0, 100)
    const passed = total >= 50
    return { triageScore, survivalScore, resourcePenalty, pt05Bonus, total, passed, triageDetails, survivalDetails }
  }

  // ── RENDER: INTRO ──────────────────────────────────────────────────────────
  if (state.phase === 'intro') {
    return (
      <div style={styles.screen}>
        <div style={styles.introCard}>
          <div style={{ fontSize: 14, letterSpacing: 4, color: '#ff1744', fontFamily: FONT, textTransform: 'uppercase' }}>
            EMERGENCY DISPATCH
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: 24, margin: '12px 0 4px', fontFamily: FONT }}>
            Module 6: Mass Casualty Triage
          </h1>
          <h2 style={{ color: '#39ff14', fontSize: 13, fontWeight: 400, margin: 0, fontFamily: FONT, letterSpacing: 2 }}>
            START PROTOCOL
          </h2>

          <div style={styles.briefingBox}>
            <div style={{ color: '#ffe600', fontFamily: FONT, fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
              SITUATION BRIEFING
            </div>
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.8, margin: 0, fontFamily: FONT }}>
              Flash flood aftermath. Infrastructure destroyed. You are the first responder on scene.
              Five casualties identified. Medical supplies are scavenged from debris: torn clothing,
              duct tape, garbage bags, one bottle of water.
            </p>
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.8, margin: '10px 0 0', fontFamily: FONT }}>
              You have a <span style={{ color: '#ff1744', fontWeight: 700 }}>180-second golden window</span> before
              professional EMS arrives. Triage all patients using START protocol. Stabilize who you can.
              Do NOT waste resources on expectant (BLACK tag) patients.
            </p>
          </div>

          <div style={{ ...styles.briefingBox, borderColor: 'rgba(57,255,20,0.25)', background: 'rgba(57,255,20,0.04)' }}>
            <div style={{ color: '#39ff14', fontFamily: FONT, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
              START TRIAGE CATEGORIES
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { tag: 'GREEN', label: 'Minor', desc: 'Walking wounded. Can wait.' },
                { tag: 'YELLOW', label: 'Delayed', desc: 'Serious but stable. Can wait briefly.' },
                { tag: 'RED', label: 'Immediate', desc: 'Life-threatening. Treat NOW.' },
                { tag: 'BLACK', label: 'Expectant', desc: 'Dead or unsurvivable. Do not treat.' },
              ].map(t => (
                <div key={t.tag} style={{ flex: '1 1 120px', padding: '6px 0' }}>
                  <div style={{ color: TAG_COLORS[t.tag], fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
                    {t.tag} - {t.label}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11, fontFamily: FONT }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              style={styles.primaryBtn}
              onClick={() => dispatch({ type: 'START_GAME' })}
            >
              BEGIN TRIAGE
            </button>
            <button style={styles.ghostBtn} onClick={handleBack}>
              &larr; Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER: RESULT ─────────────────────────────────────────────────────────
  if (state.phase === 'result') {
    const sc = computeScore()
    return (
      <div style={styles.screen}>
        <div style={{ ...styles.introCard, maxWidth: 700 }}>
          <div style={{ fontSize: 14, letterSpacing: 4, color: sc.passed ? '#39ff14' : '#ff1744', fontFamily: FONT, textTransform: 'uppercase' }}>
            {sc.passed ? 'MISSION COMPLETE' : 'MISSION FAILED'}
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, fontFamily: FONT, color: sc.passed ? '#39ff14' : '#ff1744', margin: '8px 0' }}>
            {sc.total}/100
          </div>
          <div style={{ color: sc.passed ? '#39ff14' : '#ff1744', fontSize: 13, fontFamily: FONT }}>
            {sc.passed ? 'PASSED' : 'DID NOT PASS'} (threshold: 50)
          </div>

          {/* Score breakdown */}
          <div style={{ width: '100%', marginTop: 16 }}>
            <div style={styles.scoreRow}>
              <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 12 }}>Triage Accuracy ({sc.triageDetails.filter(d => d.ok).length}/5 correct x 15)</span>
              <span style={{ color: '#39ff14', fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>+{sc.triageScore}</span>
            </div>
            <div style={styles.scoreRow}>
              <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 12 }}>Patient Survival ({sc.survivalDetails.filter(d => d.alive).length}/3 alive x 20)</span>
              <span style={{ color: '#39ff14', fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>+{sc.survivalScore}</span>
            </div>
            <div style={styles.scoreRow}>
              <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 12 }}>Resource Allocation {state.resourceWastedOnBlack ? '(wasted on BLACK)' : '(no waste)'}</span>
              <span style={{ color: sc.resourcePenalty < 0 ? '#ff1744' : '#39ff14', fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>
                {sc.resourcePenalty < 0 ? sc.resourcePenalty : '+0'}
              </span>
            </div>
            <div style={styles.scoreRow}>
              <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 12 }}>PT-05 Management {state.patients[4].taskAssigned ? '(task assigned)' : '(not managed)'}</span>
              <span style={{ color: sc.pt05Bonus > 0 ? '#39ff14' : '#ff1744', fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>
                {sc.pt05Bonus > 0 ? '+' : ''}{sc.pt05Bonus}
              </span>
            </div>
          </div>

          {/* Triage detail */}
          <div style={{ width: '100%', marginTop: 12 }}>
            <div style={{ color: '#ffe600', fontFamily: FONT, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>TRIAGE RESULTS</div>
            {sc.triageDetails.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 11, width: 55 }}>{d.id}</span>
                <span style={{ color: '#e2e8f0', fontFamily: FONT, fontSize: 11, flex: 1 }}>{d.name}</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: d.assigned ? TAG_COLORS[d.assigned] : '#555', minWidth: 60 }}>
                  {d.assigned || 'NONE'}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: TAG_COLORS[d.correct], minWidth: 60 }}>
                  {d.correct}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 12, width: 20, textAlign: 'center' }}>
                  {d.ok ? '\u2713' : '\u2717'}
                </span>
              </div>
            ))}
          </div>

          {/* Survival detail */}
          <div style={{ width: '100%', marginTop: 12 }}>
            <div style={{ color: '#ffe600', fontFamily: FONT, fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>PATIENT OUTCOMES</div>
            {state.patients.map((pt, idx) => (
              <div key={pt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 11, width: 55 }}>{pt.id}</span>
                <span style={{ color: '#e2e8f0', fontFamily: FONT, fontSize: 11, flex: 1 }}>{pt.name}</span>
                <span style={{
                  fontFamily: FONT, fontSize: 11,
                  color: pt.deceased ? '#ff1744' : pt.stabilized ? '#38bdf8' : '#ffe600',
                }}>
                  {pt.deceased ? 'DECEASED' : pt.stabilized ? 'STABILIZED' : idx === 3 ? 'EXPECTANT' : 'UNSTABLE'}
                </span>
              </div>
            ))}
          </div>

          {/* Lessons */}
          <div style={{ ...styles.briefingBox, borderColor: 'rgba(56,189,248,0.25)', background: 'rgba(56,189,248,0.04)', marginTop: 12 }}>
            <div style={{ color: '#38bdf8', fontFamily: FONT, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>KEY LESSONS</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ color: '#fca5a5', fontSize: 12, fontFamily: FONT, lineHeight: 2 }}>1. START triage: sort patients BEFORE treating. Tag determines priority.</li>
              <li style={{ color: '#fde68a', fontSize: 12, fontFamily: FONT, lineHeight: 2 }}>2. BLACK tag patients consume resources without benefit. Hard triage saves lives.</li>
              <li style={{ color: '#bbf7d0', fontSize: 12, fontFamily: FONT, lineHeight: 2 }}>3. RED patients die fastest. Treat them first with available improvised tools.</li>
              <li style={{ color: '#e0e7ff', fontSize: 12, fontFamily: FONT, lineHeight: 2 }}>4. GREEN tag patients (like PT-05) can be given tasks to reduce chaos.</li>
              <li style={{ color: '#fda4af', fontSize: 12, fontFamily: FONT, lineHeight: 2 }}>5. Scavenged materials can substitute for medical supplies in emergencies.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              style={styles.primaryBtn}
              onClick={() => {
                scoreRecorded.current = false
                dispatch({ type: 'START_GAME' })
              }}
            >
              RETRY
            </button>
            <button style={styles.ghostBtn} onClick={handleBack}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER: ACTIVE ─────────────────────────────────────────────────────────
  const activePt = state.activePatient !== null ? state.patients[state.activePatient] : null
  const activeIdx = state.activePatient

  // MAP bar color
  const mapColor = (map) => {
    if (map > 70) return '#39ff14'
    if (map > 50) return '#ffe600'
    if (map > 30) return '#ff9100'
    return '#ff1744'
  }

  return (
    <div style={styles.activeContainer}>
      {/* ── HEADER BAR ── */}
      <div style={styles.headerBar}>
        <button style={styles.ghostBtn} onClick={handleBack}>&larr; QUIT</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: '#94a3b8', fontFamily: FONT, fontSize: 11, letterSpacing: 2 }}>GOLDEN WINDOW</span>
          <span style={{
            fontFamily: FONT, fontSize: 22, fontWeight: 800,
            color: state.timeRemaining > 60 ? '#39ff14' : state.timeRemaining > 30 ? '#ffe600' : '#ff1744',
          }}>
            {formatTime(state.timeRemaining)}
          </span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div style={styles.threeCol}>

        {/* LEFT PANEL: Triage Board */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHeader}>TRIAGE BOARD</div>
          {state.patients.map((pt, idx) => {
            const tag = state.triageTags[idx]
            const isActive = activeIdx === idx
            const isCrashing = crashingPatients.has(idx)

            let borderStyle = '1px solid rgba(255,255,255,0.12)'
            let boxShadow = 'none'
            if (pt.stabilized) {
              borderStyle = '1px solid rgba(56,189,248,0.4)'
              boxShadow = '0 0 12px rgba(56,189,248,0.5)'
            } else if (pt.deceased) {
              borderStyle = '1px solid rgba(255,255,255,0.06)'
            } else if (isCrashing) {
              borderStyle = '1px solid #ff1744'
              boxShadow = `0 0 ${pulse ? '8' : '4'}px rgba(255,23,68,0.6)`
            }

            return (
              <div
                key={pt.id}
                onClick={() => dispatch({ type: 'SELECT_PATIENT', payload: idx })}
                style={{
                  padding: '8px 10px',
                  marginBottom: 6,
                  border: borderStyle,
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.06)' : pt.deceased ? 'rgba(66,66,66,0.15)' : 'rgba(255,255,255,0.02)',
                  boxShadow,
                  transition: 'all 0.2s',
                  opacity: pt.deceased && idx !== 3 ? 0.5 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: pt.deceased ? '#666' : '#e2e8f0', fontWeight: 700 }}>
                    {pt.id} {pt.name}
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: '#94a3b8' }}>
                    {pt.age}y
                  </span>
                </div>
                <div style={{ fontFamily: FONT, fontSize: 10, color: pt.deceased ? '#555' : '#94a3b8', marginBottom: 6 }}>
                  {pt.label}
                </div>
                {/* Tag buttons */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {TAG_LABELS.map(t => (
                    <button
                      key={t}
                      onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ASSIGN_TAG', payload: { idx, tag: t } }) }}
                      style={{
                        flex: 1,
                        padding: '3px 0',
                        fontSize: 9,
                        fontFamily: FONT,
                        fontWeight: 700,
                        border: tag === t ? `2px solid ${TAG_COLORS[t]}` : '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 3,
                        background: tag === t ? `${TAG_COLORS[t]}22` : 'transparent',
                        color: TAG_COLORS[t],
                        cursor: 'pointer',
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Event Log */}
          <div style={{ marginTop: 12 }}>
            <div style={styles.panelHeader}>EVENT LOG</div>
            <div style={styles.logScroll}>
              {state.log.map((entry, i) => (
                <div key={i} style={{
                  color: entry.warn ? '#ff1744' : '#94a3b8',
                  fontSize: 10, fontFamily: FONT, lineHeight: 1.6, padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {entry.text}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Patient Telemetry */}
        <div style={styles.centerPanel}>
          {activePt === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
              <div style={{ fontSize: 32, fontFamily: FONT, color: '#555' }}>SELECT PATIENT</div>
              <div style={{ fontSize: 12, fontFamily: FONT, color: '#444', marginTop: 8 }}>Click a patient on the left panel to view telemetry</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
              {/* Patient header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: activePt.deceased ? '#666' : '#e2e8f0' }}>
                    {activePt.id}: {activePt.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 12, color: activePt.deceased ? '#555' : '#ffe600', marginTop: 2 }}>
                    {activePt.label} | Age {activePt.age}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {activePt.stabilized && (
                    <span style={{ fontFamily: FONT, fontSize: 10, color: '#38bdf8', border: '1px solid #38bdf8', padding: '2px 8px', borderRadius: 4 }}>
                      STABILIZED
                    </span>
                  )}
                  {activePt.deceased && (
                    <span style={{ fontFamily: FONT, fontSize: 10, color: '#ff1744', border: '1px solid #ff1744', padding: '2px 8px', borderRadius: 4 }}>
                      DECEASED
                    </span>
                  )}
                  {state.triageTags[activeIdx] && (
                    <span style={{
                      fontFamily: FONT, fontSize: 10, fontWeight: 700,
                      color: TAG_COLORS[state.triageTags[activeIdx]],
                      border: `1px solid ${TAG_COLORS[state.triageTags[activeIdx]]}`,
                      padding: '2px 8px', borderRadius: 4,
                    }}>
                      {state.triageTags[activeIdx]}
                    </span>
                  )}
                </div>
              </div>

              {/* PT-04 warning */}
              {activeIdx === 3 && pt04Warning && (
                <div style={{
                  background: 'rgba(255,23,68,0.1)', border: '1px solid #ff1744',
                  borderRadius: 6, padding: '8px 12px', marginBottom: 12, textAlign: 'center',
                  animation: 'none',
                  boxShadow: pulse ? '0 0 16px rgba(255,23,68,0.4)' : '0 0 4px rgba(255,23,68,0.2)',
                  transition: 'box-shadow 0.1s',
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, color: '#ff1744', fontWeight: 700 }}>
                    WARNING: RESOURCE MISALLOCATION. EXPECTANT PATIENT.
                  </span>
                </div>
              )}

              {/* Vitals Grid */}
              <div style={styles.vitalsGrid}>
                {/* BPM */}
                <div style={styles.vitalBox}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                    HEART RATE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontFamily: FONT, fontSize: 40, fontWeight: 800,
                      color: activePt.deceased ? '#444' : activePt.bpm > 120 ? '#ff1744' : activePt.bpm < 60 ? '#ffe600' : '#39ff14',
                      transform: !activePt.deceased && pulse ? 'scale(1.06)' : 'scale(1)',
                      transition: 'transform 0.08s',
                    }}>
                      {activePt.deceased ? '--' : Math.round(activePt.bpm)}
                    </span>
                    <span style={{
                      fontSize: 22,
                      color: activePt.deceased ? '#333' : '#ff1744',
                      opacity: !activePt.deceased && pulse ? 1 : 0.4,
                      transition: 'opacity 0.08s',
                    }}>
                      {activePt.deceased ? '\u2014' : '\u2665'}
                    </span>
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#555' }}>BPM</div>
                </div>

                {/* MAP */}
                <div style={styles.vitalBox}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                    MEAN ART. PRESSURE
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: activePt.deceased ? '#444' : mapColor(activePt.map), marginTop: 4 }}>
                    {activePt.deceased ? '--' : Math.round(activePt.map)}
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#1e1e1e', overflow: 'hidden', marginTop: 6, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, transition: 'width 0.15s',
                      width: `${clamp(activePt.map, 0, 100)}%`,
                      background: activePt.deceased ? '#333' : `linear-gradient(90deg, #ff1744, ${mapColor(activePt.map)})`,
                    }} />
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#555', marginTop: 4 }}>mmHg</div>
                </div>

                {/* Core Temp */}
                <div style={styles.vitalBox}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                    CORE TEMP
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: 28, fontWeight: 800, marginTop: 4,
                    color: activePt.deceased ? '#444' : activePt.coreTemp < 30 ? '#ff1744' : activePt.coreTemp < 35 ? '#ffe600' : '#39ff14',
                  }}>
                    {activePt.deceased ? '--' : activePt.coreTemp.toFixed(1)}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#555' }}>C</div>
                </div>

                {/* Resp Rate */}
                <div style={styles.vitalBox}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
                    RESP RATE
                  </div>
                  <div style={{
                    fontFamily: FONT, fontSize: 28, fontWeight: 800, marginTop: 4,
                    color: activePt.deceased ? '#444' : activePt.respRate > 28 ? '#ffe600' : activePt.respRate < 12 ? '#ff1744' : '#39ff14',
                  }}>
                    {activePt.deceased ? '--' : Math.round(activePt.respRate)}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#555' }}>/min</div>
                </div>
              </div>

              {/* Symptom Description */}
              <div style={{
                marginTop: 16, padding: '12px 14px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.02)',
                flex: 1, overflowY: 'auto',
              }}>
                <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', letterSpacing: 2, marginBottom: 8 }}>
                  CLINICAL NOTES
                </div>
                <p style={{ fontFamily: FONT, fontSize: 12, color: activePt.deceased ? '#555' : '#cbd5e1', lineHeight: 1.8, margin: 0 }}>
                  {activePt.desc}
                </p>
                {/* Dynamic status lines */}
                {activeIdx === 0 && !activePt.deceased && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: activePt.treated ? '#38bdf8' : '#ff1744', lineHeight: 1.8, marginTop: 8 }}>
                    {activePt.treated
                      ? `Tourniquet applied. Tissue damage accruing: ${(activePt.tissueDamage || 0).toFixed(1)} units. Needs surgical intervention.`
                      : `ACTIVE ARTERIAL BLEED. MAP declining at ${activePt.bleedRate}/tick. APPLY TOURNIQUET IMMEDIATELY.`}
                  </p>
                )}
                {activeIdx === 1 && !activePt.deceased && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: activePt.treated ? '#38bdf8' : '#ffe600', lineHeight: 1.8, marginTop: 8 }}>
                    {activePt.treated
                      ? 'Splint applied. Pain managed. Fracture immobilized for transport.'
                      : `Pain escalating. BPM rising (+${activePt.painSpike}/tick). ${activePt.bpm > 160 ? 'NEUROGENIC SHOCK: MAP dropping rapidly!' : 'Risk of neurogenic shock if BPM exceeds 160.'}`}
                  </p>
                )}
                {activeIdx === 2 && !activePt.deceased && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: activePt.treated ? '#38bdf8' : '#ffe600', lineHeight: 1.8, marginTop: 8 }}>
                    {activePt.treated
                      ? `Vapor barrier applied. Rewarming in progress. Core temp: ${activePt.coreTemp.toFixed(1)}C.`
                      : `Core temperature dropping. ${activePt.coreTemp < 30 ? 'CRITICAL: Cardiac arrest imminent!' : 'Below 28C = cardiac arrest.'}`}
                  </p>
                )}
                {activeIdx === 3 && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: '#ff1744', lineHeight: 1.8, marginTop: 8 }}>
                    No spontaneous respiration. No pulse. Fixed dilated pupils. This patient is beyond intervention. Allocate resources to salvageable patients.
                  </p>
                )}
                {activeIdx === 4 && (
                  <p style={{ fontFamily: FONT, fontSize: 11, color: activePt.taskAssigned ? '#38bdf8' : '#ffe600', lineHeight: 1.8, marginTop: 8 }}>
                    {activePt.taskAssigned
                      ? `Task assigned. Hysteria level: ${Math.round(activePt.hysteriaLevel || 0)}%. Calming down. BPM normalizing.`
                      : `Hysteria level: ${Math.round(activePt.hysteriaLevel)}%. Blocking workspace. Interfering with inventory access. ASSIGN TASK to redirect.`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Inventory & Actions */}
        <div style={styles.rightPanel}>
          <div style={styles.panelHeader}>SCAVENGED INVENTORY</div>
          <div style={{ marginBottom: 16 }}>
            {[
              { key: 'tornShirts', label: 'Torn T-Shirts', icon: '\uD83D\uDC55' },
              { key: 'ductTapeSplint', label: 'Duct Tape Splints', icon: '\uD83E\uDE79' },
              { key: 'garbageBags', label: 'Garbage Bags', icon: '\uD83D\uDDD1' },
              { key: 'bottledWater', label: 'Bottled Water', icon: '\uD83D\uDCA7' },
            ].map(item => (
              <div
                key={item.key}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontFamily: FONT, fontSize: 11,
                  opacity: hiddenInvItem === item.key ? 0 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <span style={{ color: '#94a3b8' }}>{item.icon} {item.label}</span>
                <span style={{ color: state.inventory[item.key] > 0 ? '#39ff14' : '#ff1744', fontWeight: 700 }}>
                  x{state.inventory[item.key]}
                </span>
              </div>
            ))}
          </div>

          <div style={styles.panelHeader}>ACTIONS</div>
          {activePt === null ? (
            <div style={{ fontFamily: FONT, fontSize: 11, color: '#555', padding: '12px 0', textAlign: 'center' }}>
              Select a patient to see actions
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* PT-01: Apply Tourniquet */}
              {activeIdx === 0 && !activePt.deceased && !activePt.treated && (
                <button
                  style={{
                    ...styles.actionBtn,
                    borderColor: 'rgba(255,23,68,0.4)',
                    background: 'rgba(255,23,68,0.08)',
                    opacity: state.inventory.tornShirts > 0 ? 1 : 0.35,
                  }}
                  disabled={state.inventory.tornShirts <= 0}
                  onClick={() => dispatch({ type: 'APPLY_TOURNIQUET' })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ff1744' }}>Apply Tourniquet</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Costs 1 Torn T-Shirt</div>
                </button>
              )}

              {/* PT-02: Improvised Splint */}
              {activeIdx === 1 && !activePt.deceased && !activePt.treated && (
                <button
                  style={{
                    ...styles.actionBtn,
                    borderColor: 'rgba(255,230,0,0.4)',
                    background: 'rgba(255,230,0,0.08)',
                    opacity: state.inventory.ductTapeSplint > 0 ? 1 : 0.35,
                  }}
                  disabled={state.inventory.ductTapeSplint <= 0}
                  onClick={() => dispatch({ type: 'APPLY_SPLINT' })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ffe600' }}>Improvised Splint</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Costs 1 Duct Tape Splint</div>
                </button>
              )}

              {/* PT-03: Vapor Barrier */}
              {activeIdx === 2 && !activePt.deceased && !activePt.treated && (
                <button
                  style={{
                    ...styles.actionBtn,
                    borderColor: 'rgba(57,255,20,0.4)',
                    background: 'rgba(57,255,20,0.08)',
                    opacity: state.inventory.garbageBags > 0 ? 1 : 0.35,
                  }}
                  disabled={state.inventory.garbageBags <= 0}
                  onClick={() => dispatch({ type: 'APPLY_VAPOR_BARRIER' })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#39ff14' }}>Vapor Barrier</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Costs 1 Garbage Bag</div>
                </button>
              )}

              {/* PT-05: Assign Task */}
              {activeIdx === 4 && !activePt.taskAssigned && (
                <button
                  style={{
                    ...styles.actionBtn,
                    borderColor: 'rgba(57,255,20,0.4)',
                    background: 'rgba(57,255,20,0.08)',
                  }}
                  onClick={() => dispatch({ type: 'ASSIGN_TASK' })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#39ff14' }}>Assign Task</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>No cost. Redirect hysteria.</div>
                </button>
              )}

              {/* Give Water — available for any selected patient */}
              {state.inventory.bottledWater > 0 && (
                <button
                  style={{
                    ...styles.actionBtn,
                    borderColor: 'rgba(56,189,248,0.4)',
                    background: 'rgba(56,189,248,0.08)',
                  }}
                  onClick={() => dispatch({ type: 'GIVE_WATER', payload: activeIdx })}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>Give Water</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>
                    {activeIdx === 3 ? 'WARNING: Expectant patient' : activeIdx === 0 ? 'Small MAP boost (+5)' : 'Hydration support'}
                  </div>
                </button>
              )}

              {/* Show status if patient already treated */}
              {activePt.treated && (
                <div style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid rgba(56,189,248,0.3)',
                  background: 'rgba(56,189,248,0.06)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: '#38bdf8', fontWeight: 700 }}>
                    TREATMENT APPLIED
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#64748b', marginTop: 4 }}>
                    {activeIdx === 0 && 'Tourniquet in place. Monitor tissue damage.'}
                    {activeIdx === 1 && 'Splint secured. Pain managed.'}
                    {activeIdx === 2 && 'Vapor barrier applied. Rewarming.'}
                    {activeIdx === 4 && 'Task assigned. Hysteria subsiding.'}
                  </div>
                </div>
              )}

              {/* If viewing deceased PT-04, show expectant info */}
              {activeIdx === 3 && (
                <div style={{
                  padding: '10px 12px', borderRadius: 6,
                  border: '1px solid rgba(66,66,66,0.5)',
                  background: 'rgba(66,66,66,0.1)',
                  textAlign: 'center', marginTop: 4,
                }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: '#666', fontWeight: 700 }}>
                    EXPECTANT (BLACK TAG)
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: '#555', marginTop: 4 }}>
                    No spontaneous respiration. No pulse. Fixed pupils. This patient cannot be saved. Move on.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick triage stats */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <div style={styles.panelHeader}>TRIAGE STATUS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {state.patients.map((pt, idx) => {
                const tag = state.triageTags[idx]
                return (
                  <div
                    key={pt.id}
                    style={{
                      width: 42, height: 42, borderRadius: 4,
                      border: `1px solid ${tag ? TAG_COLORS[tag] : 'rgba(255,255,255,0.12)'}`,
                      background: tag ? `${TAG_COLORS[tag]}15` : 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontFamily: FONT, fontSize: 8, color: tag ? TAG_COLORS[tag] : '#555' }}>
                      {pt.id.slice(-2)}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, color: tag ? TAG_COLORS[tag] : '#555' }}>
                      {tag ? tag.charAt(0) : '?'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#121212',
    fontFamily: FONT,
  },
  introCard: {
    maxWidth: 640,
    padding: '36px 32px',
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  briefingBox: {
    background: 'rgba(255,230,0,0.04)',
    border: '1px solid rgba(255,230,0,0.25)',
    borderRadius: 6,
    padding: '14px 18px',
    width: '100%',
    textAlign: 'left',
  },
  primaryBtn: {
    padding: '12px 36px',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: FONT,
    background: '#ff1744',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  ghostBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: FONT,
    padding: '4px 8px',
  },
  activeContainer: {
    height: '100vh',
    width: '100vw',
    background: '#121212',
    fontFamily: FONT,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    background: '#0e0e0e',
    flexShrink: 0,
  },
  threeCol: {
    display: 'grid',
    gridTemplateColumns: '250px 1fr 280px',
    flex: 1,
    overflow: 'hidden',
  },
  leftPanel: {
    borderRight: '1px solid rgba(255,255,255,0.12)',
    padding: '12px 10px',
    overflowY: 'auto',
    background: '#141414',
    display: 'flex',
    flexDirection: 'column',
  },
  centerPanel: {
    overflow: 'hidden',
    background: '#121212',
  },
  rightPanel: {
    borderLeft: '1px solid rgba(255,255,255,0.12)',
    padding: '12px 10px',
    overflowY: 'auto',
    background: '#141414',
    display: 'flex',
    flexDirection: 'column',
  },
  panelHeader: {
    fontFamily: FONT,
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  vitalsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  vitalBox: {
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
    textAlign: 'center',
  },
  actionBtn: {
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: FONT,
    display: 'block',
    width: '100%',
  },
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logScroll: {
    maxHeight: 140,
    overflowY: 'auto',
  },
}
