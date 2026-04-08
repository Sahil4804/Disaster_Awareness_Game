import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ── PLACEMENT LOCATIONS ──
const LOCATIONS = [
  {
    id: 'garage',
    label: 'Inside Garage',
    x: 60, y: 160, w: 120, h: 100,
    room: 'garage',
    inside: true,
    baseCO: 800,
    description: 'Enclosed space — CO fills the house rapidly',
  },
  {
    id: 'kitchen',
    label: 'Inside Kitchen',
    x: 200, y: 60, w: 130, h: 100,
    room: 'kitchen',
    inside: true,
    baseCO: 700,
    description: 'Enclosed space — CO accumulates fast indoors',
  },
  {
    id: 'outside_5ft',
    label: 'Outside, 5ft from window',
    x: 380, y: 60, w: 80, h: 60,
    room: 'outside',
    inside: false,
    distanceFt: 5,
    baseCO: 250,
    description: 'Too close to open window — CO seeps inside',
  },
  {
    id: 'outside_15ft',
    label: 'Outside, 15ft from window',
    x: 420, y: 160, w: 80, h: 60,
    room: 'outside',
    inside: false,
    distanceFt: 15,
    baseCO: 120,
    description: 'Still within danger zone of open window',
  },
  {
    id: 'outside_20ft',
    label: 'Outside, 20ft+ downwind',
    x: 440, y: 280, w: 80, h: 60,
    room: 'outside',
    inside: false,
    distanceFt: 22,
    baseCO: 25,
    description: 'Safe distance, downwind from all openings',
  },
  {
    id: 'outside_25ft',
    label: 'Outside, 25ft+, windows closed',
    x: 380, y: 360, w: 80, h: 60,
    room: 'outside',
    inside: false,
    distanceFt: 25,
    baseCO: 8,
    description: 'Maximum safety — far away, all openings sealed',
  },
]

// ── WINDOW DEFINITIONS ──
const WINDOWS = [
  { id: 'win_kitchen', label: 'Kitchen Window', x: 330, y: 80, side: 'right', roomId: 'kitchen' },
  { id: 'win_living', label: 'Living Room Window', x: 330, y: 220, side: 'right', roomId: 'living' },
  { id: 'win_garage', label: 'Garage Window', x: 60, y: 270, side: 'bottom', roomId: 'garage' },
]

// CO facts for result screen
const CO_FACTS = [
  'Carbon monoxide (CO) is completely odorless and colorless — you cannot detect it without a monitor.',
  'At 400+ PPM, CO causes headaches, dizziness, and death within 2-3 hours of exposure.',
  'At 800+ PPM, unconsciousness occurs within minutes, death within the hour.',
  'The OSHA safe workplace limit is 50 PPM over 8 hours. Home detectors alarm at 70 PPM.',
  'Generators must be placed at least 20 feet from ANY opening — doors, windows, vents.',
  'More people die from CO poisoning during power outages than from the disaster itself.',
  'Even placing a generator in an open garage is lethal — CO accumulates in partially enclosed spaces.',
  'Symptoms of CO poisoning mimic the flu: headache, nausea, confusion — making it easy to ignore.',
]

// Calculate CO PPM based on placement and window state
function calculateCO(location, windowStates, elapsed) {
  if (!location) return 0
  const loc = LOCATIONS.find(l => l.id === location)
  if (!loc) return 0

  // Time ramp factor (0 to 1 over 20 seconds)
  const ramp = Math.min(elapsed / 12, 1)

  let basePPM = loc.baseCO

  // If outside and windows are closed, reduce CO infiltration significantly
  if (!loc.inside) {
    const openWindows = WINDOWS.filter(w => windowStates[w.id])
    if (openWindows.length === 0) {
      basePPM = Math.max(basePPM * 0.15, 5)
    } else {
      // More open windows = more CO entry for close placements
      const ventFactor = 0.6 + (openWindows.length * 0.15)
      basePPM = basePPM * ventFactor
    }
  } else {
    // Inside placement: open windows help slightly by venting some CO out
    const openWindows = WINDOWS.filter(w => windowStates[w.id])
    const ventReduction = openWindows.length * 0.08
    basePPM = basePPM * (1 - ventReduction)
  }

  // Apply time ramp with slight randomness
  const noise = 0.95 + Math.random() * 0.1
  return Math.round(basePPM * ramp * noise)
}

// Determine safety outcome
function getOutcome(peakCO) {
  if (peakCO >= 400) return { level: 'lethal', label: 'LETHAL EXPOSURE', color: '#dc2626', score: 0, passed: false }
  if (peakCO >= 100) return { level: 'dangerous', label: 'DANGEROUS EXPOSURE', color: '#f59e0b', score: 30, passed: false }
  if (peakCO >= 50) return { level: 'elevated', label: 'ELEVATED RISK', color: '#eab308', score: 55, passed: false }
  if (peakCO >= 35) return { level: 'borderline', label: 'BORDERLINE SAFE', color: '#84cc16', score: 70, passed: true }
  return { level: 'safe', label: 'SAFE PLACEMENT', color: '#22c55e', score: 100, passed: true }
}

export default function Module9_ToxicCleanup() {
  const { dispatch } = useGame()

  // Phase: intro | placement | simulation | result
  const [phase, setPhase] = useState('intro')
  const [placedLocation, setPlacedLocation] = useState(null)
  const [hoveredLocation, setHoveredLocation] = useState(null)
  const [windowStates, setWindowStates] = useState({
    win_kitchen: true,
    win_living: true,
    win_garage: false,
  })

  // Simulation state
  const [coPPM, setCoPPM] = useState(0)
  const [peakCO, setPeakCO] = useState(0)
  const [simElapsed, setSimElapsed] = useState(0)
  const [simDone, setSimDone] = useState(false)
  const [clickDelay, setClickDelay] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const simRef = useRef(null)
  const startTimeRef = useRef(null)

  // Grayscale and blur derived from CO PPM
  const grayscale = Math.min((coPPM / 600) * 100, 100)
  const blur = coPPM > 200 ? Math.min((coPPM - 200) / 300 * 3, 4) : 0
  const screenOpacity = coPPM > 600 ? Math.max(1 - (coPPM - 600) / 400, 0) : 1

  // Update click delay based on CO PPM
  useEffect(() => {
    if (coPPM > 400) setClickDelay(500)
    else if (coPPM > 200) setClickDelay(200)
    else setClickDelay(0)
  }, [coPPM])

  // Silent game over at extreme CO
  useEffect(() => {
    if (coPPM > 800 && !gameOver) {
      setGameOver(true)
      if (simRef.current) {
        clearInterval(simRef.current)
        simRef.current = null
      }
    }
  }, [coPPM, gameOver])

  // Simulation loop
  useEffect(() => {
    if (phase !== 'simulation' || simDone || gameOver) return

    startTimeRef.current = Date.now()
    simRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      setSimElapsed(elapsed)

      const ppm = calculateCO(placedLocation, windowStates, elapsed)
      setCoPPM(ppm)
      setPeakCO(prev => Math.max(prev, ppm))

      if (elapsed >= 20) {
        clearInterval(simRef.current)
        simRef.current = null
        setSimDone(true)
      }
    }, 200)

    return () => {
      if (simRef.current) {
        clearInterval(simRef.current)
        simRef.current = null
      }
    }
  }, [phase, placedLocation, windowStates, simDone, gameOver])

  // Delayed click wrapper to simulate hypoxia sluggishness
  const delayedAction = useCallback((fn) => {
    if (clickDelay > 0) {
      setTimeout(fn, clickDelay)
    } else {
      fn()
    }
  }, [clickDelay])

  const handlePlaceGenerator = useCallback((locId) => {
    setPlacedLocation(locId)
  }, [])

  const toggleWindow = useCallback((winId) => {
    if (phase === 'simulation') return
    setWindowStates(prev => ({ ...prev, [winId]: !prev[winId] }))
  }, [phase])

  const startSimulation = useCallback(() => {
    if (!placedLocation) return
    setCoPPM(0)
    setPeakCO(0)
    setSimElapsed(0)
    setSimDone(false)
    setGameOver(false)
    setPhase('simulation')
  }, [placedLocation])

  const goToResult = useCallback(() => {
    delayedAction(() => setPhase('result'))
  }, [delayedAction])

  const handleFinish = useCallback(() => {
    const outcome = getOutcome(peakCO)
    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-9', result: { score: outcome.score, passed: outcome.passed } },
    })
    dispatch({ type: 'BACK_TO_MODULES' })
  }, [peakCO, dispatch])

  const resetAndRetry = useCallback(() => {
    setPhase('placement')
    setPlacedLocation(null)
    setCoPPM(0)
    setPeakCO(0)
    setSimElapsed(0)
    setSimDone(false)
    setGameOver(false)
    setClickDelay(0)
    setWindowStates({ win_kitchen: true, win_living: true, win_garage: false })
  }, [])

  // ────────────────────────────────────────────
  // INTRO PHASE
  // ────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={styles.outerContainer}>
        <div style={styles.centeredCard}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>&#9889;</div>
          <h1 style={styles.title}>Module 9: Carbon Monoxide Danger</h1>
          <p style={styles.bodyText}>
            Power is out after the flood. You have a portable generator to run a sump pump
            and keep your basement from reflooding. But where you place that generator could
            be the difference between life and death.
          </p>
          <div style={styles.warningBox}>
            <p style={{ ...styles.bodyText, color: '#fbbf24', fontWeight: 600, margin: 0 }}>
              The Silent Killer
            </p>
            <p style={{ ...styles.bodyText, margin: '8px 0 0 0', fontSize: 13 }}>
              Carbon monoxide is odorless, colorless, and tasteless. You cannot see it, smell it,
              or taste it. By the time you feel symptoms, it may be too late. Hundreds die each year
              from generator CO poisoning during power outages.
            </p>
          </div>
          <p style={{ ...styles.bodyText, color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
            You will choose where to place the generator, then watch what happens.
            Pay attention to the PPM reading.
          </p>
          <button style={styles.btnPrimary} onClick={() => setPhase('placement')}>
            Begin Scenario
          </button>
          <button
            style={styles.btnBack}
            onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
          >
            Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────
  // RESULT PHASE
  // ────────────────────────────────────────────
  if (phase === 'result') {
    const outcome = getOutcome(peakCO)
    const loc = LOCATIONS.find(l => l.id === placedLocation)

    return (
      <div style={styles.outerContainer}>
        <div style={{ ...styles.centeredCard, maxWidth: 620 }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>
            {outcome.level === 'lethal' ? '\u2620\uFE0F' : outcome.level === 'dangerous' ? '\u26A0\uFE0F' : '\u2705'}
          </div>
          <h1 style={{ ...styles.title, color: outcome.color }}>{outcome.label}</h1>
          <p style={{ ...styles.bodyText, fontSize: 15, textAlign: 'center' }}>
            You placed the generator: <strong style={{ color: '#e2e8f0' }}>{loc ? loc.label : '—'}</strong>
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 32,
            margin: '12px 0', padding: '12px 20px',
            background: 'rgba(255,255,255,0.04)', borderRadius: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: outcome.color }}>{peakCO}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Peak PPM</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: outcome.color }}>{outcome.score}%</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Score</div>
            </div>
          </div>

          {/* Outcome narrative */}
          {outcome.level === 'lethal' && (
            <div style={{ ...styles.warningBox, borderColor: '#dc2626', background: 'rgba(220,38,38,0.08)' }}>
              <p style={{ ...styles.bodyText, margin: 0, fontSize: 13 }}>
                {gameOver
                  ? 'The screen faded to black. You lost consciousness from carbon monoxide poisoning before you could react. In real life, this happens silently — no alarm, no smell, no warning.'
                  : `Peak CO reached ${peakCO} PPM. At this concentration, severe headache, confusion, and loss of consciousness occur within minutes. Death follows without immediate rescue and fresh air.`
                }
              </p>
            </div>
          )}
          {outcome.level === 'dangerous' && (
            <div style={{ ...styles.warningBox, borderColor: '#f59e0b', background: 'rgba(245,158,11,0.08)' }}>
              <p style={{ ...styles.bodyText, margin: 0, fontSize: 13 }}>
                CO reached {peakCO} PPM inside the house. At this level, you would experience
                headaches, dizziness, and nausea within an hour. Prolonged exposure causes
                brain damage and death. The generator was too close to an opening.
              </p>
            </div>
          )}
          {(outcome.level === 'safe' || outcome.level === 'borderline') && (
            <div style={{ ...styles.warningBox, borderColor: '#22c55e', background: 'rgba(34,197,94,0.08)' }}>
              <p style={{ ...styles.bodyText, margin: 0, fontSize: 13 }}>
                CO stayed at safe levels. Placing the generator 20+ feet from any opening
                and ensuring windows near it are closed is the correct approach. Well done.
              </p>
            </div>
          )}

          {/* CO Education Facts */}
          <div style={{
            width: '100%', marginTop: 16, padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ margin: '0 0 10px 0', color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>
              Carbon Monoxide Facts
            </p>
            {CO_FACTS.map((fact, i) => (
              <p key={i} style={{ ...styles.bodyText, fontSize: 12, margin: '6px 0', lineHeight: 1.5 }}>
                {'\u2022'} {fact}
              </p>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={styles.btnSecondary} onClick={resetAndRetry}>
              Try Again
            </button>
            <button style={styles.btnPrimary} onClick={handleFinish}>
              {outcome.passed ? 'Complete Module' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────
  // PLACEMENT + SIMULATION PHASES (shared layout)
  // ────────────────────────────────────────────
  const isSimulating = phase === 'simulation'
  const simProgress = Math.min(simElapsed / 20, 1)

  // Build the filter string for desaturation effect
  const filterParts = []
  if (grayscale > 0) filterParts.push(`grayscale(${grayscale.toFixed(1)}%)`)
  if (blur > 0) filterParts.push(`blur(${blur.toFixed(1)}px)`)
  const filterStr = filterParts.length > 0 ? filterParts.join(' ') : 'none'

  return (
    <div style={{
      ...styles.outerContainer,
      filter: isSimulating ? filterStr : 'none',
      opacity: isSimulating ? screenOpacity : 1,
      transition: 'filter 0.8s ease, opacity 1.2s ease',
    }}>
      {/* Game Over overlay — silent fade to black */}
      {gameOver && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: '#000', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 3s ease forwards',
        }}>
          <div style={{ color: '#475569', fontSize: 18, fontWeight: 300, marginBottom: 20, textAlign: 'center' }}>
            You did not wake up.
          </div>
          <div style={{ color: '#334155', fontSize: 13, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            Carbon monoxide filled the house silently. There was no smell, no alarm,
            no warning. This is how CO poisoning kills — invisibly.
          </div>
          <button
            style={{ ...styles.btnPrimary, marginTop: 28, opacity: 0.7 }}
            onClick={() => setPhase('result')}
          >
            Continue
          </button>
        </div>
      )}

      {/* Top bar */}
      <div style={styles.topBar}>
        <button
          style={styles.btnSmall}
          onClick={() => {
            if (isSimulating) return
            dispatch({ type: 'BACK_TO_MODULES' })
          }}
        >
          Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
          Module 9: CO Danger
        </span>
        {/* PPM counter — clinical, unobtrusive */}
        <div style={{
          padding: '4px 12px', borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          fontFamily: 'monospace', fontSize: 13,
          color: coPPM > 200 ? '#f8fafc' : '#64748b',
          transition: 'color 1s',
        }}>
          {coPPM} PPM
        </div>
      </div>

      {/* Instructions */}
      <div style={{ textAlign: 'center', padding: '0 16px', marginBottom: 8 }}>
        {phase === 'placement' && (
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Click a highlighted zone to place the generator. Toggle windows open/closed for ventilation.
          </p>
        )}
        {isSimulating && !simDone && !gameOver && (
          <p style={{ color: '#64748b', fontSize: 12, margin: 0, transition: 'color 2s' }}>
            Simulation running... {Math.round(simElapsed)}s / 20s
          </p>
        )}
        {simDone && !gameOver && (
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Simulation complete. Peak CO: {peakCO} PPM
          </p>
        )}
      </div>

      {/* ── HOUSE MAP ── */}
      <div style={styles.mapContainer}>
        <svg
          viewBox="0 0 560 440"
          style={{ width: '100%', maxWidth: 560, height: 'auto' }}
        >
          {/* Background — outside area */}
          <rect x="0" y="0" width="560" height="440" rx="8" fill="#0c1222" />

          {/* Grass / outside area label */}
          <text x="470" y="30" fill="#334155" fontSize="11" fontFamily="sans-serif">OUTSIDE</text>

          {/* House outline */}
          <rect x="40" y="40" width="310" height="340" rx="4"
            fill="#131c2e" stroke="#1e3a5f" strokeWidth="2" />

          {/* Garage */}
          <rect x="50" y="150" width="140" height="120" rx="2"
            fill="#111827" stroke="#1e3a5f" strokeWidth="1.5" />
          <text x="90" y="215" fill="#475569" fontSize="12" fontFamily="sans-serif">Garage</text>

          {/* Kitchen */}
          <rect x="190" y="50" width="150" height="120" rx="2"
            fill="#111827" stroke="#1e3a5f" strokeWidth="1.5" />
          <text x="235" y="115" fill="#475569" fontSize="12" fontFamily="sans-serif">Kitchen</text>

          {/* Living Room */}
          <rect x="50" y="280" width="290" height="90" rx="2"
            fill="#111827" stroke="#1e3a5f" strokeWidth="1.5" />
          <text x="145" y="330" fill="#475569" fontSize="12" fontFamily="sans-serif">Living Room</text>

          {/* Sump pump indicator */}
          <rect x="70" y="300" width="30" height="30" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1" />
          <text x="76" y="320" fill="#64748b" fontSize="9" fontFamily="sans-serif">Pump</text>

          {/* Flood water indication in basement */}
          <rect x="52" y="352" width="286" height="16" rx="2" fill="rgba(59,130,246,0.12)" />
          <text x="155" y="363" fill="#3b82f6" fontSize="8" fontFamily="sans-serif" opacity="0.5">
            ~ flood water ~
          </text>

          {/* ── WINDOWS ── */}
          {WINDOWS.map(win => {
            const isOpen = windowStates[win.id]
            const winW = 24
            const winH = 10
            return (
              <g key={win.id}
                style={{ cursor: isSimulating ? 'default' : 'pointer' }}
                onClick={() => toggleWindow(win.id)}
              >
                <rect
                  x={win.x} y={win.y} width={winW} height={winH} rx="2"
                  fill={isOpen ? 'rgba(56,189,248,0.3)' : 'rgba(100,116,139,0.2)'}
                  stroke={isOpen ? '#38bdf8' : '#475569'}
                  strokeWidth="1.5"
                />
                {isOpen && (
                  <line x1={win.x + 3} y1={win.y + winH / 2}
                    x2={win.x + winW - 3} y2={win.y + winH / 2}
                    stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                )}
                <text x={win.x + winW / 2} y={win.y - 3}
                  fill={isOpen ? '#38bdf8' : '#475569'}
                  fontSize="7" textAnchor="middle" fontFamily="sans-serif"
                >
                  {isOpen ? 'OPEN' : 'SHUT'}
                </text>
              </g>
            )
          })}

          {/* ── PLACEMENT ZONES ── */}
          {LOCATIONS.map(loc => {
            const isPlaced = placedLocation === loc.id
            const isHovered = hoveredLocation === loc.id
            const showZones = phase === 'placement'

            return (
              <g key={loc.id}>
                {/* Zone highlight */}
                {(showZones || isPlaced) && (
                  <rect
                    x={loc.x} y={loc.y} width={loc.w} height={loc.h} rx="4"
                    fill={isPlaced
                      ? 'rgba(251,191,36,0.15)'
                      : isHovered
                        ? 'rgba(148,163,184,0.12)'
                        : 'rgba(148,163,184,0.05)'}
                    stroke={isPlaced ? '#fbbf24' : isHovered ? '#64748b' : '#334155'}
                    strokeWidth={isPlaced ? 2 : 1}
                    strokeDasharray={isPlaced ? '0' : '4 3'}
                    style={{ cursor: showZones ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (showZones) handlePlaceGenerator(loc.id)
                    }}
                    onMouseEnter={() => { if (showZones) setHoveredLocation(loc.id) }}
                    onMouseLeave={() => setHoveredLocation(null)}
                  />
                )}
                {/* Generator icon when placed here */}
                {isPlaced && (
                  <text
                    x={loc.x + loc.w / 2} y={loc.y + loc.h / 2 + 6}
                    textAnchor="middle" fontSize="22"
                  >
                    {'\u2699\uFE0F'}
                  </text>
                )}
                {/* Zone label on hover */}
                {(isHovered && showZones) && (
                  <text
                    x={loc.x + loc.w / 2} y={loc.y - 5}
                    textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="sans-serif"
                  >
                    {loc.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* CO cloud visualization during simulation */}
          {isSimulating && coPPM > 50 && (
            <>
              <circle cx="175" cy="200" r={Math.min(coPPM / 5, 80)}
                fill="rgba(148,163,184,0.04)" />
              <circle cx="220" cy="140" r={Math.min(coPPM / 6, 60)}
                fill="rgba(148,163,184,0.03)" />
              <circle cx="140" cy="300" r={Math.min(coPPM / 7, 50)}
                fill="rgba(148,163,184,0.03)" />
            </>
          )}
        </svg>
      </div>

      {/* Window legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
        {WINDOWS.map(win => (
          <button
            key={win.id}
            onClick={() => toggleWindow(win.id)}
            disabled={isSimulating}
            style={{
              background: windowStates[win.id] ? 'rgba(56,189,248,0.12)' : 'rgba(100,116,139,0.1)',
              border: `1px solid ${windowStates[win.id] ? '#38bdf8' : '#334155'}`,
              color: windowStates[win.id] ? '#38bdf8' : '#64748b',
              borderRadius: 6, padding: '4px 10px', fontSize: 11,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {win.label}: {windowStates[win.id] ? 'Open' : 'Closed'}
          </button>
        ))}
      </div>

      {/* Selected location info */}
      {placedLocation && phase === 'placement' && (
        <div style={{
          textAlign: 'center', marginTop: 10, padding: '8px 16px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 8,
          maxWidth: 400, marginLeft: 'auto', marginRight: 'auto',
        }}>
          <p style={{ color: '#e2e8f0', fontSize: 13, margin: 0, fontWeight: 500 }}>
            {LOCATIONS.find(l => l.id === placedLocation)?.label}
          </p>
          <p style={{ color: '#64748b', fontSize: 11, margin: '4px 0 0 0' }}>
            {LOCATIONS.find(l => l.id === placedLocation)?.description}
          </p>
        </div>
      )}

      {/* Simulation progress bar */}
      {isSimulating && (
        <div style={{
          width: '80%', maxWidth: 400, height: 3, background: '#1e293b',
          borderRadius: 2, margin: '10px auto 0',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            width: `${simProgress * 100}%`,
            background: coPPM > 200 ? '#64748b' : '#334155',
            transition: 'width 0.2s, background 1s',
          }} />
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        {phase === 'placement' && (
          <>
            <button
              style={{
                ...styles.btnSecondary,
                opacity: placedLocation ? 1 : 0.4,
                cursor: placedLocation ? 'pointer' : 'not-allowed',
              }}
              disabled={!placedLocation}
              onClick={startSimulation}
            >
              Start Generator
            </button>
            <button
              style={styles.btnSmall}
              onClick={() => {
                setPlacedLocation(null)
                setHoveredLocation(null)
              }}
            >
              Reset Placement
            </button>
          </>
        )}
        {isSimulating && simDone && !gameOver && (
          <button style={styles.btnPrimary} onClick={goToResult}>
            See Results
          </button>
        )}
        {isSimulating && !simDone && !gameOver && (
          <div style={{ color: '#334155', fontSize: 11 }}>
            Monitoring CO levels...
          </div>
        )}
      </div>

      {/* Placement hint for sluggish controls */}
      {isSimulating && clickDelay > 0 && !gameOver && (
        <div style={{
          textAlign: 'center', marginTop: 8,
          color: '#334155', fontSize: 10, transition: 'color 2s',
        }}>
          {clickDelay >= 500 ? 'Controls feel... heavy...' : 'Something feels off...'}
        </div>
      )}
    </div>
  )
}

// ── STYLES ──
const styles = {
  outerContainer: {
    minHeight: '100vh',
    width: '100%',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'filter 0.8s ease, opacity 1.2s ease',
  },
  centeredCard: {
    maxWidth: 520,
    width: '100%',
    background: '#1e293b',
    borderRadius: 16,
    padding: '32px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 40,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  topBar: {
    width: '100%',
    maxWidth: 580,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapContainer: {
    width: '100%',
    maxWidth: 580,
    background: '#0c1222',
    borderRadius: 12,
    padding: 10,
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'center',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: 700,
    margin: '8px 0 12px 0',
    textAlign: 'center',
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 1.6,
    margin: '0 0 8px 0',
    textAlign: 'left',
  },
  warningBox: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 10,
    border: '1px solid #fbbf24',
    background: 'rgba(251,191,36,0.06)',
    marginTop: 12,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 28px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 16,
    transition: 'opacity 0.2s',
  },
  btnSecondary: {
    background: 'rgba(37,99,235,0.15)',
    color: '#60a5fa',
    border: '1px solid rgba(37,99,235,0.3)',
    borderRadius: 8,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnBack: {
    background: 'none',
    border: '1px solid #334155',
    color: '#64748b',
    borderRadius: 8,
    padding: '10px 20px',
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 10,
    transition: 'color 0.2s',
  },
  btnSmall: {
    background: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
