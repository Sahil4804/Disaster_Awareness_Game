import { useState, useEffect, useReducer, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ─── Thermal Palette ────────────────────────────────────────────────────────
const THERMAL = {
  deepBlue:  '#1a237e',
  purple:    '#6a1b9a',
  orange:    '#ff6d00',
  red:       '#ff1744',
  white:     '#ffffff',
}

const FONT = "'JetBrains Mono', 'Courier New', monospace"

// Map core temp (28..37) to a FLIR color
function tempToColor(t) {
  const clamped = Math.max(28, Math.min(37, t))
  const ratio = (clamped - 28) / (37 - 28) // 0 = cold, 1 = warm
  if (ratio < 0.2) return THERMAL.deepBlue
  if (ratio < 0.4) return THERMAL.purple
  if (ratio < 0.6) return '#fdd835' // yellow
  if (ratio < 0.75) return THERMAL.orange
  if (ratio < 0.9) return THERMAL.red
  return THERMAL.white
}

function tempToGradient(t) {
  const core = tempToColor(t)
  return `radial-gradient(ellipse at 50% 40%, ${core} 0%, ${THERMAL.purple} 50%, ${THERMAL.deepBlue} 100%)`
}

// ─── Reducer ────────────────────────────────────────────────────────────────
const initialState = {
  phase: 'intro',

  // Daylight phase
  daylightTime: 120,
  exertionPace: 0.5,

  // Structures
  tentBuilt: false,
  groundPadLaid: false,
  reflectorBuilt: false,

  // Building
  buildingAction: null,
  buildProgress: 0,
  buildDuration: 0,

  // Night phase
  nightTime: 180,

  // Vitals
  coreTemp: 37.0,
  moistureLevel: 0,
  co_ppm: 0,
  calorieReserve: 2000,

  // Night controls
  heatSourceOn: false,
  ventsOpen: true,

  // Environment
  ambientTemp: -5,
  windSpeed: 25,

  // Outcome
  causeOfDeath: null,
  survived: false,
}

function simReducer(state, action) {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.payload }

    case 'SET_EXERTION':
      return { ...state, exertionPace: action.payload }

    case 'START_BUILD': {
      const { target, duration } = action.payload
      return { ...state, buildingAction: target, buildProgress: 0, buildDuration: duration }
    }

    case 'UPDATE_BUILD_PROGRESS':
      return { ...state, buildProgress: Math.min(100, state.buildProgress + action.payload) }

    case 'FINISH_BUILD': {
      const built = state.buildingAction
      const costs = { tent: 200, pad: 100, reflector: 150 }
      const cost = costs[built] || 0
      return {
        ...state,
        buildingAction: null,
        buildProgress: 0,
        buildDuration: 0,
        calorieReserve: Math.max(0, state.calorieReserve - cost),
        tentBuilt: built === 'tent' ? true : state.tentBuilt,
        groundPadLaid: built === 'pad' ? true : state.groundPadLaid,
        reflectorBuilt: built === 'reflector' ? true : state.reflectorBuilt,
      }
    }

    case 'CANCEL_BUILD':
      return { ...state, buildingAction: null, buildProgress: 0, buildDuration: 0 }

    case 'DAYLIGHT_TICK': {
      const dt = state.daylightTime - 0.1
      const moistInc = state.buildingAction ? state.exertionPace * 0.3 : state.exertionPace * 0.05
      const calDrain = 0.5 + (state.exertionPace * 1.5)
      return {
        ...state,
        daylightTime: Math.max(0, dt),
        moistureLevel: Math.min(100, state.moistureLevel + moistInc * 0.1),
        calorieReserve: Math.max(0, state.calorieReserve - calDrain * 0.1),
      }
    }

    case 'NIGHT_TICK': {
      let { coreTemp, co_ppm, calorieReserve, moistureLevel,
            groundPadLaid, tentBuilt, reflectorBuilt,
            heatSourceOn, ventsOpen, nightTime } = state

      // Base heat losses per tick
      let conductiveLoss = groundPadLaid ? 0.002 : 0.02
      let convectiveLoss = tentBuilt ? 0.005 : 0.018
      const evaporativeLoss = moistureLevel > 10 ? 0.01 * (moistureLevel / 100) : 0

      // Ventilation compromise
      if (ventsOpen) {
        convectiveLoss *= 1.15
      }

      // Evaporative penalty multiplier
      const totalLoss = (conductiveLoss + convectiveLoss + evaporativeLoss) * (1 + (moistureLevel * 0.05))

      // Radiant heat gain
      let radiantGain = 0
      if (heatSourceOn) {
        radiantGain = 0.015
        if (reflectorBuilt) radiantGain *= 2.0
      }

      // CO poisoning
      if (heatSourceOn && !ventsOpen) {
        co_ppm += 3.0
      }
      if (ventsOpen) {
        co_ppm = Math.max(0, co_ppm - 5.0)
      }

      // Temperature update
      coreTemp -= totalLoss
      if (heatSourceOn) coreTemp += radiantGain

      // Calorie drain at night
      calorieReserve -= 0.3
      if (calorieReserve <= 0) {
        calorieReserve = 0
        coreTemp -= 0.005
      }

      // Death checks
      let causeOfDeath = null
      if (co_ppm > 400) causeOfDeath = 'co'
      if (coreTemp <= 28.0) causeOfDeath = 'hypothermia'

      const newNightTime = Math.max(0, nightTime - 0.1)
      const survived = newNightTime <= 0 && !causeOfDeath

      return {
        ...state,
        coreTemp: Math.round(coreTemp * 100) / 100,
        co_ppm: Math.round(co_ppm * 10) / 10,
        calorieReserve: Math.max(0, Math.round(calorieReserve * 10) / 10),
        nightTime: newNightTime,
        causeOfDeath,
        survived,
        phase: causeOfDeath ? 'result' : (survived ? 'result' : state.phase),
      }
    }

    case 'TOGGLE_HEAT':
      return { ...state, heatSourceOn: !state.heatSourceOn }

    case 'TOGGLE_VENTS':
      return { ...state, ventsOpen: !state.ventsOpen }

    case 'SET_SURVIVED':
      return { ...state, survived: true, phase: 'result' }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function Module7_Thermodynamics() {
  const { dispatch: gameDispatch } = useGame()
  const [sim, simDispatch] = useReducer(simReducer, initialState)
  const tickRef = useRef(null)
  const buildTickRef = useRef(null)
  const [pulseAnim, setPulseAnim] = useState(0)
  const animFrameRef = useRef(null)

  // Pulse animation for moisture aura
  useEffect(() => {
    let frame = 0
    const animate = () => {
      frame++
      setPulseAnim(Math.sin(frame * 0.05) * 0.5 + 0.5)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  // ── Daylight timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (sim.phase !== 'daylight') return
    tickRef.current = setInterval(() => {
      simDispatch({ type: 'DAYLIGHT_TICK' })
    }, 100)
    return () => clearInterval(tickRef.current)
  }, [sim.phase])

  // Auto-transition daylight -> night
  useEffect(() => {
    if (sim.phase === 'daylight' && sim.daylightTime <= 0) {
      if (sim.buildingAction) simDispatch({ type: 'CANCEL_BUILD' })
      simDispatch({ type: 'SET_PHASE', payload: 'night' })
    }
  }, [sim.phase, sim.daylightTime, sim.buildingAction])

  // ── Night timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (sim.phase !== 'night') return
    tickRef.current = setInterval(() => {
      simDispatch({ type: 'NIGHT_TICK' })
    }, 100)
    return () => clearInterval(tickRef.current)
  }, [sim.phase])

  // ── Build progress ticker ───────────────────────────────────────────────
  useEffect(() => {
    if (!sim.buildingAction || sim.phase !== 'daylight') {
      clearInterval(buildTickRef.current)
      return
    }
    const duration = sim.buildDuration
    const incrementPer100ms = (100 / (duration * 10)) // % per 100ms
    buildTickRef.current = setInterval(() => {
      simDispatch({ type: 'UPDATE_BUILD_PROGRESS', payload: incrementPer100ms })
    }, 100)
    return () => clearInterval(buildTickRef.current)
  }, [sim.buildingAction, sim.buildDuration, sim.phase])

  // Finish build when progress hits 100
  useEffect(() => {
    if (sim.buildProgress >= 100 && sim.buildingAction) {
      simDispatch({ type: 'FINISH_BUILD' })
    }
  }, [sim.buildProgress, sim.buildingAction])

  // ── Scoring ─────────────────────────────────────────────────────────────
  const computeScore = useCallback(() => {
    const survivalBonus = sim.survived ? 40 : 0
    const tempScore = Math.max(0, (sim.coreTemp - 28) / (37 - 28)) * 30
    const buildScore = (sim.tentBuilt ? 10 : 0) + (sim.groundPadLaid ? 10 : 0) + (sim.reflectorBuilt ? 10 : 0)
    const moisturePenalty = sim.moistureLevel > 50 ? -10 : 0
    const coPenalty = sim.causeOfDeath === 'co' ? -30 : 0
    const total = Math.round(survivalBonus + tempScore + buildScore + moisturePenalty + coPenalty)
    return Math.max(0, Math.min(100, total))
  }, [sim.survived, sim.coreTemp, sim.tentBuilt, sim.groundPadLaid, sim.reflectorBuilt, sim.moistureLevel, sim.causeOfDeath])

  // Record score on result phase
  useEffect(() => {
    if (sim.phase === 'result') {
      const score = computeScore()
      const passed = score >= 50
      gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-7', result: { score, passed } } })
    }
  }, [sim.phase, computeScore, gameDispatch])

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleStartBuild = useCallback((target) => {
    if (sim.buildingAction) return
    if (sim.calorieReserve <= 0) return
    if (target === 'tent' && sim.tentBuilt) return
    if (target === 'pad' && sim.groundPadLaid) return
    if (target === 'reflector' && sim.reflectorBuilt) return

    const baseDurations = { tent: 30, pad: 15, reflector: 25 }
    const duration = baseDurations[target] / (0.5 + sim.exertionPace)
    simDispatch({ type: 'START_BUILD', payload: { target, duration } })
  }, [sim.buildingAction, sim.calorieReserve, sim.tentBuilt, sim.groundPadLaid, sim.reflectorBuilt, sim.exertionPace])

  const handleBack = useCallback(() => {
    gameDispatch({ type: 'BACK_TO_MODULES' })
  }, [gameDispatch])

  const handleRestart = useCallback(() => {
    simDispatch({ type: 'RESET' })
  }, [])

  // ── Computed values for rendering ───────────────────────────────────────
  const coBlur = sim.co_ppm > 100 ? sim.co_ppm / 200 : 0
  const coGray = sim.co_ppm > 100 ? Math.min(1, sim.co_ppm / 500) : 0
  const showMoistureAura = sim.moistureLevel > 20
  const humanColor = tempToColor(sim.coreTemp)
  const humanGradient = tempToGradient(sim.coreTemp)
  const finalScore = sim.phase === 'result' ? computeScore() : 0
  const finalPassed = finalScore >= 50

  // ─── STYLES ─────────────────────────────────────────────────────────────
  const styles = {
    container: {
      width: '100%',
      minHeight: '100vh',
      background: '#121212',
      color: '#e0e0e0',
      fontFamily: FONT,
      fontSize: '13px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      filter: (sim.phase === 'night' && sim.co_ppm > 100)
        ? `blur(${coBlur}px) grayscale(${coGray})`
        : 'none',
      transition: 'filter 0.3s ease',
    },
    header: {
      width: '100%',
      padding: '12px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(0,0,0,0.4)',
      boxSizing: 'border-box',
    },
    headerTitle: {
      fontSize: '16px',
      fontWeight: 700,
      color: THERMAL.orange,
      letterSpacing: '2px',
      textTransform: 'uppercase',
    },
    backBtn: {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.2)',
      color: '#aaa',
      padding: '6px 14px',
      cursor: 'pointer',
      fontFamily: FONT,
      fontSize: '12px',
      borderRadius: '4px',
    },
    mainArea: {
      display: 'flex',
      width: '100%',
      maxWidth: '1200px',
      flex: 1,
      padding: '16px',
      gap: '16px',
      boxSizing: 'border-box',
    },
    leftPanel: {
      width: '220px',
      flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '16px',
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
    rightPanel: {
      width: '220px',
      flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '16px',
      background: 'rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
    centerView: {
      flex: 1,
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      background: `linear-gradient(180deg, #0a0a2e 0%, ${THERMAL.deepBlue} 60%, #0d0d0d 100%)`,
      position: 'relative',
      overflow: 'hidden',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bottomDeck: {
      width: '100%',
      maxWidth: '1200px',
      padding: '16px',
      boxSizing: 'border-box',
    },
    telemetryLabel: {
      fontSize: '10px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginBottom: '4px',
    },
    telemetryValue: {
      fontSize: '20px',
      fontWeight: 700,
      letterSpacing: '1px',
    },
    telemetryUnit: {
      fontSize: '11px',
      color: '#666',
      marginLeft: '4px',
    },
    telemetryRow: {
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      paddingBottom: '10px',
    },
  }

  // ─── RENDER: INTRO ────────────────────────────────────────────────────
  if (sim.phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>FLIR Thermal Telemetry // Camp SafeHaven</span>
          <button style={styles.backBtn} onClick={handleBack}>[ ESC ] ABORT</button>
        </div>
        <div style={{
          maxWidth: '750px',
          padding: '40px 24px',
          lineHeight: '1.8',
          color: '#ccc',
        }}>
          <h2 style={{ color: THERMAL.orange, fontSize: '22px', marginBottom: '20px', letterSpacing: '2px' }}>
            MISSION BRIEFING: OVERNIGHT SURVIVAL THERMODYNAMICS
          </h2>

          <div style={{
            background: 'rgba(255,109,0,0.08)',
            border: '1px solid rgba(255,109,0,0.25)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <p style={{ margin: '0 0 12px 0', color: '#ff6d00', fontWeight: 700, fontSize: '14px' }}>
              SCENARIO
            </p>
            <p style={{ margin: 0, fontSize: '13px' }}>
              You are stranded in sub-zero wilderness (-5 C ambient, 25 km/h wind). You have 120 seconds
              of daylight to prepare camp, then 180 seconds of night to survive. Your body must maintain
              core temperature above 28 C or you die of hypothermia.
            </p>
          </div>

          <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '12px', letterSpacing: '1px' }}>
            FOUR MODES OF HEAT TRANSFER
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            {[
              { name: 'CONDUCTION', color: '#42a5f5', desc: 'Heat flows through direct contact. The frozen ground leaches warmth from your body. A ground pad insulates against this.' },
              { name: 'CONVECTION', color: '#ab47bc', desc: 'Moving air carries heat away. Wind is lethal. A tent blocks convective currents and traps a warm air pocket.' },
              { name: 'RADIATION', color: '#ff7043', desc: 'All bodies emit infrared heat. A fire radiates warmth. A reflector wall bounces thermal radiation back to you.' },
              { name: 'EVAPORATION', color: '#26c6da', desc: 'Moisture evaporating from skin or clothing pulls enormous energy. Sweat from exertion becomes a deadly liability at night.' },
            ].map(m => (
              <div key={m.name} style={{
                background: 'rgba(0,0,0,0.3)',
                border: `1px solid ${m.color}40`,
                borderRadius: '6px',
                padding: '14px',
              }}>
                <div style={{ color: m.color, fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>{m.name}</div>
                <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.6' }}>{m.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(255,23,68,0.08)',
            border: '1px solid rgba(255,23,68,0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '28px',
          }}>
            <p style={{ margin: '0 0 8px 0', color: THERMAL.red, fontWeight: 700, fontSize: '13px' }}>
              THE MOISTURE TRAP
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#ccc', lineHeight: '1.7' }}>
              Building fast (high exertion) means sweating. Wet clothing at night massively amplifies
              ALL heat loss. A frantic builder may finish every structure but freeze faster than someone
              who paced themselves. Every decision is a trade-off.
            </p>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '28px',
          }}>
            <p style={{ margin: '0 0 8px 0', color: '#fff', fontWeight: 700, fontSize: '13px' }}>
              CO POISONING RISK
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#ccc', lineHeight: '1.7' }}>
              At night you can ignite a fire for warmth. But if your shelter vents are sealed,
              carbon monoxide accumulates. Above 400 PPM = asphyxiation. Open vents clear CO
              but let cold air in. You must manage the balance.
            </p>
          </div>

          <button
            onClick={() => simDispatch({ type: 'SET_PHASE', payload: 'daylight' })}
            style={{
              background: `linear-gradient(135deg, ${THERMAL.orange}, ${THERMAL.red})`,
              border: 'none',
              color: '#fff',
              padding: '14px 40px',
              fontSize: '15px',
              fontFamily: FONT,
              fontWeight: 700,
              borderRadius: '6px',
              cursor: 'pointer',
              letterSpacing: '2px',
              display: 'block',
              margin: '0 auto',
            }}
          >
            BEGIN DAYLIGHT PHASE
          </button>
        </div>
      </div>
    )
  }

  // ─── RENDER: RESULT ───────────────────────────────────────────────────
  if (sim.phase === 'result') {
    const survivalBonus = sim.survived ? 40 : 0
    const tempScore = Math.max(0, (sim.coreTemp - 28) / (37 - 28)) * 30
    const buildScore = (sim.tentBuilt ? 10 : 0) + (sim.groundPadLaid ? 10 : 0) + (sim.reflectorBuilt ? 10 : 0)
    const moisturePenalty = sim.moistureLevel > 50 ? -10 : 0
    const coPenalty = sim.causeOfDeath === 'co' ? -30 : 0

    const breakdownItems = [
      { label: 'Survival Bonus', value: survivalBonus, max: 40 },
      { label: 'Core Temperature Retention', value: Math.round(tempScore * 10) / 10, max: 30 },
      { label: 'Structures Built', value: buildScore, max: 30 },
      { label: 'Moisture Penalty', value: moisturePenalty, max: 0 },
      { label: 'CO Asphyxiation Penalty', value: coPenalty, max: 0 },
    ]

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>FLIR // MISSION DEBRIEF</span>
          <button style={styles.backBtn} onClick={handleBack}>[ ESC ] EXIT</button>
        </div>
        <div style={{ maxWidth: '700px', padding: '40px 24px', width: '100%', boxSizing: 'border-box' }}>
          {/* Outcome banner */}
          <div style={{
            textAlign: 'center',
            padding: '24px',
            borderRadius: '8px',
            marginBottom: '24px',
            background: sim.survived
              ? 'rgba(76,175,80,0.1)'
              : 'rgba(255,23,68,0.1)',
            border: `1px solid ${sim.survived ? 'rgba(76,175,80,0.4)' : 'rgba(255,23,68,0.4)'}`,
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: 700,
              color: sim.survived ? '#4caf50' : THERMAL.red,
              marginBottom: '8px',
            }}>
              {sim.survived ? 'SURVIVED' : sim.causeOfDeath === 'co' ? 'CO ASPHYXIATION' : 'FATAL HYPOTHERMIA'}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 700, color: finalPassed ? '#4caf50' : THERMAL.red }}>
              {finalScore}
              <span style={{ fontSize: '18px', color: '#888' }}>/100</span>
            </div>
            <div style={{ fontSize: '14px', color: finalPassed ? '#4caf50' : THERMAL.red, marginTop: '4px' }}>
              {finalPassed ? 'PASSED' : 'FAILED'} (50 required)
            </div>
          </div>

          {/* Score breakdown */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '12px', color: '#888', letterSpacing: '1.5px', marginBottom: '14px', textTransform: 'uppercase' }}>
              Score Breakdown
            </div>
            {breakdownItems.map(item => (
              <div key={item.label} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <span style={{ color: '#aaa', fontSize: '12px' }}>{item.label}</span>
                <span style={{
                  color: item.value < 0 ? THERMAL.red : item.value > 0 ? '#4caf50' : '#666',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  {item.value > 0 ? '+' : ''}{typeof item.value === 'number' ? Math.round(item.value) : item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Science debrief */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <div style={{ fontSize: '12px', color: '#888', letterSpacing: '1.5px', marginBottom: '14px', textTransform: 'uppercase' }}>
              Thermodynamic Analysis
            </div>

            <div style={{ fontSize: '12px', color: '#bbb', lineHeight: '1.8', marginBottom: '12px' }}>
              <strong style={{ color: THERMAL.orange }}>Final Core Temp:</strong> {sim.coreTemp.toFixed(1)} C
              {sim.coreTemp < 33 && <span style={{ color: THERMAL.red }}> -- Severe hypothermia zone (below 33 C)</span>}
            </div>

            <div style={{ fontSize: '12px', color: '#bbb', lineHeight: '1.8', marginBottom: '12px' }}>
              <strong style={{ color: '#26c6da' }}>Moisture Level:</strong> {sim.moistureLevel.toFixed(0)}%
              {sim.moistureLevel > 50 && (
                <span style={{ color: THERMAL.red }}>
                  {' '}-- Excessive moisture amplified heat loss by {(sim.moistureLevel * 5).toFixed(0)}%.
                  Pacing exertion would have kept clothing drier.
                </span>
              )}
              {sim.moistureLevel <= 20 && (
                <span style={{ color: '#4caf50' }}> -- Dry clothing maintained. Excellent pacing.</span>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#bbb', lineHeight: '1.8', marginBottom: '12px' }}>
              <strong style={{ color: '#ab47bc' }}>Shelter:</strong>{' '}
              {sim.tentBuilt ? 'Tent blocked 70% convective loss. ' : 'No tent -- full wind exposure. '}
              {sim.groundPadLaid ? 'Ground pad blocked 90% conductive loss. ' : 'No ground pad -- ground sapped heat. '}
              {sim.reflectorBuilt ? 'Reflector doubled radiant heat from fire.' : 'No reflector -- fire heat dispersed.'}
            </div>

            {sim.causeOfDeath === 'co' && (
              <div style={{ fontSize: '12px', color: THERMAL.red, lineHeight: '1.8' }}>
                <strong>CO Poisoning:</strong> Sealing vents with an active fire caused carbon monoxide
                to accumulate past 400 PPM, resulting in loss of consciousness and death.
                Periodically opening vents flushes CO while accepting moderate heat loss.
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handleRestart}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#e0e0e0',
                padding: '12px 28px',
                fontFamily: FONT,
                fontSize: '13px',
                borderRadius: '6px',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
            >
              RETRY MISSION
            </button>
            <button
              onClick={handleBack}
              style={{
                background: `linear-gradient(135deg, ${THERMAL.orange}, ${THERMAL.red})`,
                border: 'none',
                color: '#fff',
                padding: '12px 28px',
                fontFamily: FONT,
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
            >
              RETURN TO MODULES
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── RENDER: DAYLIGHT / NIGHT ─────────────────────────────────────────
  const isDaylight = sim.phase === 'daylight'
  const isNight = sim.phase === 'night'

  // Format time
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // Temp danger color
  const tempColor = sim.coreTemp >= 36 ? '#4caf50'
    : sim.coreTemp >= 34 ? '#fdd835'
    : sim.coreTemp >= 31 ? THERMAL.orange
    : THERMAL.red

  // CO danger color
  const coColor = sim.co_ppm < 100 ? '#4caf50'
    : sim.co_ppm < 250 ? '#fdd835'
    : sim.co_ppm < 400 ? THERMAL.orange
    : THERMAL.red

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>
          FLIR // {isDaylight ? 'DAYLIGHT SETUP' : 'NIGHT SURVIVAL'}
          <span style={{
            marginLeft: '16px',
            color: isDaylight ? '#fdd835' : '#5c6bc0',
            fontSize: '14px',
          }}>
            T-{formatTime(isDaylight ? sim.daylightTime : sim.nightTime)}
          </span>
        </span>
        <button style={styles.backBtn} onClick={handleBack}>[ ESC ] ABORT</button>
      </div>

      {/* Main 3-column area */}
      <div style={styles.mainArea}>

        {/* ── LEFT TELEMETRY ──────────────────────────────────────────── */}
        <div style={styles.leftPanel}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            VITAL TELEMETRY
          </div>

          {/* Core Temp */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Core Body Temp</div>
            <div style={{ ...styles.telemetryValue, color: tempColor }}>
              {sim.coreTemp.toFixed(1)}
              <span style={styles.telemetryUnit}>C</span>
            </div>
            <div style={{
              height: '3px',
              background: '#333',
              borderRadius: '2px',
              marginTop: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.max(0, ((sim.coreTemp - 28) / 9) * 100)}%`,
                background: tempColor,
                borderRadius: '2px',
                transition: 'width 0.2s',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '2px' }}>
              <span>28 FATAL</span><span>37 NORMAL</span>
            </div>
          </div>

          {/* Moisture */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Base Layer Moisture</div>
            <div style={{ ...styles.telemetryValue, color: sim.moistureLevel > 50 ? '#26c6da' : sim.moistureLevel > 20 ? '#66bb6a' : '#4caf50' }}>
              {sim.moistureLevel.toFixed(0)}
              <span style={styles.telemetryUnit}>%</span>
            </div>
            <div style={{
              height: '3px',
              background: '#333',
              borderRadius: '2px',
              marginTop: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${sim.moistureLevel}%`,
                background: sim.moistureLevel > 50 ? '#26c6da' : '#4caf50',
                borderRadius: '2px',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>

          {/* CO PPM */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Ambient CO</div>
            <div style={{ ...styles.telemetryValue, color: coColor }}>
              {sim.co_ppm.toFixed(0)}
              <span style={styles.telemetryUnit}>PPM</span>
            </div>
            {sim.co_ppm > 200 && (
              <div style={{
                fontSize: '10px',
                color: THERMAL.red,
                marginTop: '4px',
                animation: 'none',
              }}>
                WARNING: CO CRITICAL
              </div>
            )}
          </div>

          {/* Calories */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Calorie Reserve</div>
            <div style={{ ...styles.telemetryValue, color: sim.calorieReserve < 300 ? THERMAL.red : sim.calorieReserve < 800 ? THERMAL.orange : '#e0e0e0' }}>
              {Math.round(sim.calorieReserve)}
              <span style={styles.telemetryUnit}>kcal</span>
            </div>
            <div style={{
              height: '3px',
              background: '#333',
              borderRadius: '2px',
              marginTop: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(sim.calorieReserve / 2000) * 100}%`,
                background: sim.calorieReserve < 300 ? THERMAL.red : THERMAL.orange,
                borderRadius: '2px',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
        </div>

        {/* ── CENTER: FLIR CROSS SECTION ──────────────────────────────── */}
        <div style={styles.centerView}>
          {/* Ground line */}
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: 0,
            right: 0,
            height: '3px',
            background: sim.groundPadLaid
              ? 'linear-gradient(90deg, #333 20%, #3b82f6 30%, #3b82f6 70%, #333 80%)'
              : '#333',
          }} />
          {/* Ground pad label */}
          {sim.groundPadLaid && (
            <div style={{
              position: 'absolute',
              bottom: '42px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: '#3b82f6',
              letterSpacing: '1px',
            }}>
              GROUND PAD
            </div>
          )}

          {/* Tent structure */}
          {sim.tentBuilt && (
            <div style={{
              position: 'absolute',
              bottom: '63px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '180px',
              height: '120px',
              borderLeft: '2px solid rgba(255,152,0,0.5)',
              borderRight: '2px solid rgba(255,152,0,0.5)',
              borderTop: '2px solid rgba(255,152,0,0.5)',
              borderRadius: '60px 60px 0 0',
              background: 'rgba(255,152,0,0.05)',
            }}>
              <div style={{
                position: 'absolute',
                top: '-16px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: '#ff9800',
                letterSpacing: '1px',
              }}>
                TENT
              </div>
            </div>
          )}

          {/* Fire reflector */}
          {sim.reflectorBuilt && (
            <div style={{
              position: 'absolute',
              bottom: '63px',
              right: 'calc(50% - 130px)',
              width: '6px',
              height: '90px',
              background: 'linear-gradient(180deg, #ff6d00 0%, #bf360c 100%)',
              borderRadius: '3px',
              boxShadow: '-4px 0 12px rgba(255,109,0,0.3)',
            }}>
              <div style={{
                position: 'absolute',
                top: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '8px',
                color: '#ff6d00',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
              }}>
                REFLECTOR
              </div>
            </div>
          )}

          {/* Fire source at night */}
          {isNight && sim.heatSourceOn && (
            <div style={{
              position: 'absolute',
              bottom: '63px',
              left: 'calc(50% + 50px)',
              width: '24px',
              height: '30px',
              background: 'radial-gradient(ellipse at bottom, #ff6d00 0%, #ff1744 40%, transparent 70%)',
              borderRadius: '50% 50% 20% 20%',
              animation: `flicker 0.3s infinite alternate`,
              boxShadow: '0 0 20px rgba(255,109,0,0.6), 0 0 40px rgba(255,109,0,0.3)',
            }} />
          )}

          {/* Wind arrows (when no tent) */}
          {!sim.tentBuilt && (isDaylight || isNight) && (
            <>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={`wind-${i}`} style={{
                  position: 'absolute',
                  top: `${80 + i * 40}px`,
                  left: `${-20 + (((Date.now() / (300 + i * 50)) + i * 60) % 100)}%`,
                  color: 'rgba(100,180,255,0.3)',
                  fontSize: '18px',
                  fontWeight: 700,
                  pointerEvents: 'none',
                  transition: 'left 0.1s linear',
                }}>
                  {'>'}{'>'}{'>'}
                </div>
              ))}
            </>
          )}

          {/* Human thermal figure */}
          <div style={{
            position: 'relative',
            width: '60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 2,
            marginBottom: '-20px',
          }}>
            {/* Moisture aura */}
            {showMoistureAura && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                left: '-20px',
                right: '-20px',
                bottom: '-10px',
                borderRadius: '50%',
                boxShadow: `0 0 ${20 + pulseAnim * 20}px ${8 + pulseAnim * 10}px rgba(38,198,218,${0.15 + pulseAnim * 0.2})`,
                pointerEvents: 'none',
              }} />
            )}

            {/* Head */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: humanGradient,
              marginBottom: '2px',
              boxShadow: `0 0 8px ${humanColor}66`,
            }} />

            {/* Torso */}
            <div style={{
              width: '36px',
              height: '50px',
              borderRadius: '8px 8px 4px 4px',
              background: humanGradient,
              marginBottom: '2px',
              boxShadow: `0 0 12px ${humanColor}44`,
            }} />

            {/* Legs */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{
                width: '14px',
                height: '40px',
                borderRadius: '4px',
                background: humanGradient,
                boxShadow: `0 0 6px ${humanColor}33`,
              }} />
              <div style={{
                width: '14px',
                height: '40px',
                borderRadius: '4px',
                background: humanGradient,
                boxShadow: `0 0 6px ${humanColor}33`,
              }} />
            </div>

            {/* Temp readout on figure */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '10px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 0 4px #000, 0 0 8px #000',
              whiteSpace: 'nowrap',
            }}>
              {sim.coreTemp.toFixed(1)} C
            </div>
          </div>

          {/* Phase overlay info */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '1px',
          }}>
            FLIR CROSS-SECTION
          </div>
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            fontSize: '10px',
            color: isDaylight ? '#fdd835' : '#5c6bc0',
            letterSpacing: '1px',
          }}>
            {isDaylight ? 'DAYLIGHT' : 'NIGHT'} // T-{formatTime(isDaylight ? sim.daylightTime : sim.nightTime)}
          </div>

          {/* Environment temp label */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            fontSize: '10px',
            color: 'rgba(100,150,255,0.5)',
          }}>
            AMBIENT: {sim.ambientTemp} C // WIND: {sim.windSpeed} km/h
          </div>

          {/* Vent status during night */}
          {isNight && (
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              fontSize: '10px',
              color: sim.ventsOpen ? '#4caf50' : THERMAL.red,
              letterSpacing: '1px',
            }}>
              VENTS: {sim.ventsOpen ? 'OPEN' : 'SEALED'}
            </div>
          )}
        </div>

        {/* ── RIGHT TELEMETRY ─────────────────────────────────────────── */}
        <div style={styles.rightPanel}>
          <div style={{ fontSize: '11px', color: '#666', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
            STATUS
          </div>

          {/* Current phase info */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Phase</div>
            <div style={{
              fontSize: '16px',
              fontWeight: 700,
              color: isDaylight ? '#fdd835' : '#5c6bc0',
            }}>
              {isDaylight ? 'DAYLIGHT' : 'NIGHT'}
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {isDaylight ? 'Build shelter before dark' : 'Survive until dawn'}
            </div>
          </div>

          {/* Wind */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Wind Speed</div>
            <div style={{
              ...styles.telemetryValue,
              color: sim.tentBuilt ? '#4caf50' : '#ef5350',
            }}>
              {sim.windSpeed}
              <span style={styles.telemetryUnit}>km/h</span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              {sim.tentBuilt ? 'Blocked by tent' : 'Direct exposure'}
            </div>
          </div>

          {/* Shelter status */}
          <div style={styles.telemetryRow}>
            <div style={styles.telemetryLabel}>Shelter Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              {[
                { label: 'Tent', built: sim.tentBuilt, effect: '-70% convection' },
                { label: 'Ground Pad', built: sim.groundPadLaid, effect: '-90% conduction' },
                { label: 'Reflector', built: sim.reflectorBuilt, effect: '2x radiant heat' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: s.built ? '#4caf50' : '#333',
                    border: `1px solid ${s.built ? '#4caf50' : '#555'}`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '11px', color: s.built ? '#ccc' : '#555' }}>
                    {s.label}
                  </span>
                  {s.built && (
                    <span style={{ fontSize: '9px', color: '#4caf50', marginLeft: 'auto' }}>
                      {s.effect}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Heat source (night) */}
          {isNight && (
            <div style={styles.telemetryRow}>
              <div style={styles.telemetryLabel}>Heat Source</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: sim.heatSourceOn ? THERMAL.orange : '#555',
              }}>
                {sim.heatSourceOn ? 'ACTIVE' : 'OFF'}
              </div>
              {sim.heatSourceOn && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
                  +{sim.reflectorBuilt ? '0.030' : '0.015'} C/tick
                </div>
              )}
            </div>
          )}

          {/* Exertion during daylight */}
          {isDaylight && (
            <div style={styles.telemetryRow}>
              <div style={styles.telemetryLabel}>Exertion Level</div>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: sim.exertionPace > 0.7 ? THERMAL.red : sim.exertionPace > 0.4 ? THERMAL.orange : '#4caf50',
              }}>
                {sim.exertionPace < 0.3 ? 'CAUTIOUS' : sim.exertionPace < 0.6 ? 'MODERATE' : 'FRANTIC'}
              </div>
              <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                Speed vs moisture trade-off
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM ACTION DECK ──────────────────────────────────────── */}
      <div style={styles.bottomDeck}>
        <div style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '16px 20px',
          background: 'rgba(0,0,0,0.3)',
        }}>
          {/* DAYLIGHT CONTROLS */}
          {isDaylight && (
            <>
              {/* Exertion slider */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                  <span style={{ fontSize: '11px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Exertion Pace
                  </span>
                  <span style={{ fontSize: '13px', color: THERMAL.orange, fontWeight: 700 }}>
                    {(sim.exertionPace * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10px', color: '#4caf50' }}>CAUTIOUS</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sim.exertionPace}
                    onChange={(e) => simDispatch({ type: 'SET_EXERTION', payload: parseFloat(e.target.value) })}
                    style={{
                      flex: 1,
                      height: '4px',
                      appearance: 'auto',
                      accentColor: THERMAL.orange,
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: THERMAL.red }}>FRANTIC</span>
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                  Higher exertion = faster builds + more sweat accumulation
                </div>
              </div>

              {/* Build buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {[
                  { key: 'tent', label: 'Build Tent', cost: 200, time: 30, built: sim.tentBuilt, effect: 'Blocks 70% convective loss' },
                  { key: 'pad', label: 'Lay Ground Pad', cost: 100, time: 15, built: sim.groundPadLaid, effect: 'Blocks 90% conductive loss' },
                  { key: 'reflector', label: 'Build Fire Reflector', cost: 150, time: 25, built: sim.reflectorBuilt, effect: 'Doubles radiant heat gain' },
                ].map(item => {
                  const isActive = sim.buildingAction === item.key
                  const effectiveTime = (item.time / (0.5 + sim.exertionPace)).toFixed(0)
                  const disabled = item.built || (sim.buildingAction && !isActive) || sim.calorieReserve <= 0

                  return (
                    <button
                      key={item.key}
                      disabled={disabled}
                      onClick={() => handleStartBuild(item.key)}
                      style={{
                        flex: '1 1 200px',
                        background: item.built
                          ? 'rgba(76,175,80,0.1)'
                          : isActive
                            ? 'rgba(255,109,0,0.15)'
                            : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${item.built ? 'rgba(76,175,80,0.3)' : isActive ? 'rgba(255,109,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '6px',
                        padding: '12px 16px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled && !item.built ? 0.4 : 1,
                        fontFamily: FONT,
                        textAlign: 'left',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Progress bar overlay */}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: `${sim.buildProgress}%`,
                          background: 'rgba(255,109,0,0.12)',
                          transition: 'width 0.1s linear',
                        }} />
                      )}

                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: item.built ? '#4caf50' : isActive ? THERMAL.orange : '#ccc',
                          marginBottom: '4px',
                        }}>
                          {item.built ? `[BUILT] ${item.label}` : isActive ? `BUILDING... ${sim.buildProgress.toFixed(0)}%` : item.label}
                        </div>
                        <div style={{ fontSize: '10px', color: '#777' }}>
                          {item.effect}
                        </div>
                        {!item.built && (
                          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                            {effectiveTime}s // {item.cost} kcal
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* NIGHT CONTROLS */}
          {isNight && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
              {/* Fire toggle */}
              <button
                onClick={() => simDispatch({ type: 'TOGGLE_HEAT' })}
                style={{
                  flex: 1,
                  background: sim.heatSourceOn
                    ? 'rgba(255,109,0,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${sim.heatSourceOn ? 'rgba(255,109,0,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '6px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: sim.heatSourceOn ? THERMAL.orange : '#666',
                  marginBottom: '4px',
                }}>
                  IGNITE HEAT SOURCE
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 16px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: sim.heatSourceOn ? 'rgba(255,109,0,0.2)' : 'rgba(255,255,255,0.05)',
                  color: sim.heatSourceOn ? THERMAL.orange : '#555',
                  border: `1px solid ${sim.heatSourceOn ? THERMAL.orange : '#333'}`,
                  marginTop: '6px',
                }}>
                  {sim.heatSourceOn ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
                  Provides radiant warmth. Produces CO in sealed space.
                </div>
              </button>

              {/* Vent toggle */}
              <button
                onClick={() => simDispatch({ type: 'TOGGLE_VENTS' })}
                style={{
                  flex: 1,
                  background: sim.ventsOpen
                    ? 'rgba(76,175,80,0.08)'
                    : 'rgba(255,23,68,0.08)',
                  border: `1px solid ${sim.ventsOpen ? 'rgba(76,175,80,0.3)' : 'rgba(255,23,68,0.3)'}`,
                  borderRadius: '6px',
                  padding: '16px 20px',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: sim.ventsOpen ? '#4caf50' : THERMAL.red,
                  marginBottom: '4px',
                }}>
                  SHELTER VENTS
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 16px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: sim.ventsOpen ? 'rgba(76,175,80,0.15)' : 'rgba(255,23,68,0.15)',
                  color: sim.ventsOpen ? '#4caf50' : THERMAL.red,
                  border: `1px solid ${sim.ventsOpen ? '#4caf50' : THERMAL.red}`,
                  marginTop: '6px',
                }}>
                  {sim.ventsOpen ? 'OPEN' : 'SEALED'}
                </div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '8px' }}>
                  {sim.ventsOpen
                    ? 'CO venting active. +15% convective loss from cold air.'
                    : 'CO accumulating! Warmer but dangerous.'}
                </div>
              </button>

              {/* CO warning display */}
              {sim.co_ppm > 100 && (
                <div style={{
                  flex: '0 0 160px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `rgba(255,23,68,${Math.min(0.2, sim.co_ppm / 2000)})`,
                  border: '1px solid rgba(255,23,68,0.4)',
                  borderRadius: '6px',
                  padding: '12px',
                }}>
                  <div style={{ fontSize: '10px', color: THERMAL.red, letterSpacing: '1.5px', marginBottom: '6px' }}>
                    CO ALERT
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: coColor,
                  }}>
                    {sim.co_ppm.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#888' }}>PPM</div>
                  <div style={{
                    height: '4px',
                    width: '100%',
                    background: '#333',
                    borderRadius: '2px',
                    marginTop: '8px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (sim.co_ppm / 400) * 100)}%`,
                      background: `linear-gradient(90deg, #fdd835, ${THERMAL.red})`,
                      borderRadius: '2px',
                      transition: 'width 0.2s',
                    }} />
                  </div>
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>
                    LETHAL: 400 PPM
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Injected keyframes for fire flicker */}
      <style>{`
        @keyframes flicker {
          0% { opacity: 0.8; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.1) scaleX(0.95); }
          100% { opacity: 0.9; transform: scaleY(0.95) scaleX(1.05); }
        }
      `}</style>
    </div>
  )
}
