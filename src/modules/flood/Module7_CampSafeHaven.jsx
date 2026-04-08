import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ── Constants ────────────────────────────────────────────────────────────────

const SITES = [
  {
    id: 'ridge',
    label: 'Ridge (Hilltop)',
    desc: 'Exposed hilltop with panoramic views. Excellent drainage but fully exposed to wind.',
    windLevel: 3,
    drainageLevel: 3,
    floodRisk: 0,
    convectionLoss: -0.4,
    emoji: '⛰️',
    color: '#f59e0b',
    terrainY: 28,
  },
  {
    id: 'depression',
    label: 'Depression (Valley)',
    desc: 'Cozy sheltered valley. Wind-blocked but collects water when rain arrives.',
    windLevel: 0,
    drainageLevel: 0,
    floodRisk: 3,
    convectionLoss: -0.05,
    emoji: '🏕️',
    color: '#22d3ee',
    terrainY: 72,
  },
  {
    id: 'midslope',
    label: 'Midslope (Slight Elevation)',
    desc: 'Moderate elevation on the hillside. Balanced wind protection and good drainage.',
    windLevel: 1,
    drainageLevel: 2,
    floodRisk: 0,
    convectionLoss: -0.15,
    emoji: '🏔️',
    color: '#4ade80',
    terrainY: 50,
  },
]

const EQUIPMENT = [
  { id: 'ground_pad', label: 'Ground Pad', desc: 'Insulation layer — blocks conductive heat loss from cold earth', emoji: '🟦', color: '#3b82f6' },
  { id: 'tent', label: 'Tent Body', desc: 'Main shelter structure — provides enclosure', emoji: '⛺', color: '#f97316' },
  { id: 'sleeping_bag', label: 'Sleeping Bag', desc: 'Thermal cocoon — traps body heat inside', emoji: '🛏️', color: '#a855f7' },
  { id: 'rainfly', label: 'Rainfly', desc: 'Waterproof outer layer — prevents rain from soaking gear', emoji: '🛡️', color: '#eab308' },
]

const CORRECT_ORDER = ['ground_pad', 'tent', 'sleeping_bag', 'rainfly']

const TICK_MS = 400
const SIM_TICKS = 38 // ~15 seconds at 400ms per tick
const RAIN_START_TICK = 10
const HYPOTHERMIA_THRESHOLD = 95.0
const STARTING_TEMP = 98.6

// ── Helper: temperature color ────────────────────────────────────────────────

function tempColor(temp) {
  const t = Math.max(0, Math.min(1, (temp - 90) / (99 - 90)))
  const r = Math.round(200 * (1 - t) + 60 * t)
  const g = Math.round(60 * (1 - t) + 120 * t)
  const b = Math.round(220 * (1 - t) + 60 * t)
  return `rgb(${r},${g},${b})`
}

// ── CSS Keyframe injection (once) ────────────────────────────────────────────

const KEYFRAMES_ID = 'module7-keyframes'
function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAMES_ID
  style.textContent = `
    @keyframes m7rain {
      0% { transform: translateY(-20px); opacity: 0.7; }
      100% { transform: translateY(340px); opacity: 0.2; }
    }
    @keyframes m7wind {
      0% { transform: translateX(-40px); opacity: 0; }
      30% { opacity: 0.8; }
      100% { transform: translateX(120px); opacity: 0; }
    }
    @keyframes m7pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes m7shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
    @keyframes m7flood {
      0% { height: 0px; }
      100% { height: 60px; }
    }
  `
  document.head.appendChild(style)
}

// ── Terrain SVG Cross-Section ────────────────────────────────────────────────

function TerrainCrossSection({ selectedSite, phase, groundSaturation, showRain, showWind }) {
  const siteObj = SITES.find(s => s.id === selectedSite)

  return (
    <div style={{ position: 'relative', width: '100%', height: 280, overflow: 'hidden', borderRadius: 12, background: '#0c1425' }}>
      {/* Sky gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0f172a 0%, #1a1a3e 40%, #1e293b 100%)' }} />

      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${(i * 37 + 13) % 100}%`,
          top: `${(i * 23 + 7) % 35}%`,
          width: i % 3 === 0 ? 2 : 1,
          height: i % 3 === 0 ? 2 : 1,
          background: '#e2e8f0',
          borderRadius: '50%',
          opacity: 0.4 + (i % 5) * 0.12,
          animation: 'm7pulse 2s ease-in-out infinite',
          animationDelay: `${i * 0.3}s`,
        }} />
      ))}

      {/* Rain overlay */}
      {showRain && [...Array(40)].map((_, i) => (
        <div key={`rain-${i}`} style={{
          position: 'absolute',
          left: `${(i * 2.5) % 100}%`,
          top: -20,
          width: 1,
          height: 14,
          background: 'rgba(96,165,250,0.5)',
          animation: 'm7rain 0.7s linear infinite',
          animationDelay: `${(i * 0.05) % 0.7}s`,
        }} />
      ))}

      {/* Wind arrows */}
      {showWind && [...Array(6)].map((_, i) => (
        <div key={`wind-${i}`} style={{
          position: 'absolute',
          left: -40,
          top: 60 + i * 28,
          fontSize: 16,
          color: 'rgba(148,163,184,0.6)',
          animation: 'm7wind 1.5s linear infinite',
          animationDelay: `${i * 0.25}s`,
        }}>
          {'>>>'}
        </div>
      ))}

      {/* Terrain layers (SVG) */}
      <svg viewBox="0 0 800 180" style={{ position: 'absolute', bottom: 0, width: '100%', height: 180 }} preserveAspectRatio="none">
        {/* Deep earth */}
        <path d="M0,180 L0,140 Q100,130 200,120 Q350,160 500,110 Q650,90 750,100 L800,95 L800,180 Z" fill="#3d2008" />
        {/* Topsoil */}
        <path d="M0,140 Q100,120 200,100 Q350,140 500,90 Q650,70 750,82 L800,75 L800,140 Q650,90 500,110 Q350,160 200,120 Q100,130 0,140 Z" fill="#5c3a1e" />
        {/* Grass layer */}
        <path d="M0,138 Q100,118 200,98 Q350,138 500,88 Q650,68 750,80 L800,73 L800,78 Q650,73 500,93 Q350,143 200,103 Q100,123 0,143 Z" fill="#2d5a27" />

        {/* Elevation contour lines */}
        <path d="M0,145 Q100,125 200,105 Q350,145 500,95 Q650,75 750,87 L800,80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="6,4" />
        <path d="M0,155 Q100,140 200,125 Q350,155 500,115 Q650,95 750,105 L800,98" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,6" />

        {/* Site markers */}
        {phase !== 'intro' && SITES.map(site => {
          const x = site.id === 'ridge' ? 700 : site.id === 'depression' ? 380 : 550
          const y = site.id === 'ridge' ? 72 : site.id === 'depression' ? 135 : 92
          const isSelected = selectedSite === site.id
          return (
            <g key={site.id}>
              <circle cx={x} cy={y} r={isSelected ? 8 : 5} fill={isSelected ? site.color : 'rgba(255,255,255,0.3)'} stroke={site.color} strokeWidth={isSelected ? 2 : 1} />
              {isSelected && <circle cx={x} cy={y} r={14} fill="none" stroke={site.color} strokeWidth={1} opacity={0.4} />}
            </g>
          )
        })}
      </svg>

      {/* Temperature gradient overlay at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 6,
        background: `linear-gradient(90deg, #3b82f6, #8b5cf6, #ef4444)`,
        opacity: 0.5,
      }} />

      {/* Ground saturation water fill in depression */}
      {selectedSite === 'depression' && groundSaturation > 0.1 && (
        <div style={{
          position: 'absolute', bottom: 10, left: '38%', width: '24%',
          height: Math.min(60, groundSaturation * 60),
          background: 'rgba(59,130,246,0.25)',
          borderRadius: '0 0 8px 8px',
          transition: 'height 0.5s ease',
        }} />
      )}

      {/* Tent icon on selected site */}
      {selectedSite && (phase === 'equip' || phase === 'simulate' || phase === 'result') && (
        <div style={{
          position: 'absolute',
          left: selectedSite === 'ridge' ? '85%' : selectedSite === 'depression' ? '46%' : '66%',
          bottom: selectedSite === 'ridge' ? 112 : selectedSite === 'depression' ? 52 : 92,
          fontSize: 28,
          transform: 'translateX(-50%)',
          filter: groundSaturation > 0.7 ? 'hue-rotate(180deg) brightness(0.6)' : 'none',
          transition: 'filter 0.5s',
        }}>
          ⛺
        </div>
      )}
    </div>
  )
}

// ── Thermometer Gauge ────────────────────────────────────────────────────────

function Thermometer({ temp, label }) {
  const pct = Math.max(0, Math.min(100, ((temp - 90) / (99 - 90)) * 100))
  const col = tempColor(temp)
  const isHypo = temp < HYPOTHERMIA_THRESHOLD

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      <div style={{
        width: 32, height: 160, borderRadius: 16, position: 'relative',
        background: 'linear-gradient(180deg, #1e40af 0%, #7c3aed 50%, #dc2626 100%)',
        border: '2px solid rgba(255,255,255,0.1)',
        overflow: 'hidden',
      }}>
        {/* Fill from bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${pct}%`,
          background: col,
          transition: 'height 0.3s ease, background 0.3s ease',
          borderRadius: '0 0 14px 14px',
          boxShadow: isHypo ? '0 0 12px rgba(59,130,246,0.6)' : `0 0 8px ${col}66`,
        }} />
        {/* Tick marks */}
        {[95, 96, 97, 98].map(t => (
          <div key={t} style={{
            position: 'absolute',
            bottom: `${((t - 90) / 9) * 100}%`,
            left: 0, right: 0, height: 1,
            background: t === 95 ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.15)',
          }} />
        ))}
        {/* Bulb at bottom */}
        <div style={{
          position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: col, border: '2px solid rgba(255,255,255,0.15)',
        }} />
      </div>
      <span style={{
        fontSize: 18, fontWeight: 800,
        color: isHypo ? '#60a5fa' : col,
        fontFamily: 'monospace',
      }}>
        {temp.toFixed(1)}°F
      </span>
      {isHypo && (
        <span style={{ fontSize: 10, color: '#f87171', fontWeight: 700, animation: 'm7pulse 1s infinite' }}>
          HYPOTHERMIA
        </span>
      )}
    </div>
  )
}

// ── Equipment Card ───────────────────────────────────────────────────────────

function EquipCard({ item, index, placed, isNext, isWrongPick, onClick }) {
  const borderCol = placed ? '#22c55e' : isNext ? item.color : 'rgba(255,255,255,0.07)'
  const bgCol = placed ? 'rgba(34,197,94,0.1)' : isNext ? `${item.color}1a` : 'rgba(255,255,255,0.03)'

  return (
    <button
      onClick={!placed && onClick ? onClick : undefined}
      disabled={placed}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 10, width: '100%', textAlign: 'left',
        border: `2px solid ${isWrongPick ? '#ef4444' : borderCol}`,
        background: isWrongPick ? 'rgba(239,68,68,0.15)' : bgCol,
        cursor: placed ? 'default' : 'pointer',
        opacity: placed ? 0.6 : 1,
        transform: isNext ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isWrongPick ? '0 0 16px rgba(239,68,68,0.4)' : isNext ? `0 0 14px ${item.color}44` : 'none',
        transition: 'all 0.2s',
        animation: isWrongPick ? 'm7shake 0.4s ease' : 'none',
        fontFamily: 'inherit',
      }}
    >
      <span style={{
        fontSize: 22, width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: placed ? 'rgba(34,197,94,0.2)' : `${item.color}25`,
      }}>
        {placed ? '✅' : item.emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: placed ? '#4ade80' : isWrongPick ? '#f87171' : '#f1f5f9',
        }}>
          {index + 1}. {item.label}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
          {item.desc}
        </div>
      </div>
      {placed && <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 700 }}>PLACED</span>}
    </button>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function Module7_CampSafeHaven() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | site_select | equip | simulate | result
  const [selectedSite, setSelectedSite] = useState(null)
  const [placedEquip, setPlacedEquip] = useState([])
  const [wrongPick, setWrongPick] = useState(null)
  const [wrongCount, setWrongCount] = useState(0)
  const [equipFeedback, setEquipFeedback] = useState(null)

  // Simulation state
  const [coreBodyTemp, setCoreBodyTemp] = useState(STARTING_TEMP)
  const [windChill, setWindChill] = useState(0)
  const [groundSaturation, setGroundSaturation] = useState(0)
  const [simTick, setSimTick] = useState(0)
  const [simRunning, setSimRunning] = useState(false)
  const [simLog, setSimLog] = useState([])
  const [simDone, setSimDone] = useState(false)

  const simRef = useRef(null)
  const tempRef = useRef(STARTING_TEMP)
  const satRef = useRef(0)

  // Inject CSS keyframes on mount
  useEffect(() => { injectKeyframes() }, [])

  // ── Simulation Engine ────────────────────────────────────────────────────

  const startSimulation = useCallback(() => {
    const site = SITES.find(s => s.id === selectedSite)
    if (!site) return

    const hasGroundPad = placedEquip.includes('ground_pad')
    const hasRainfly = placedEquip.includes('rainfly')
    const hasTent = placedEquip.includes('tent')
    const hasSleepingBag = placedEquip.includes('sleeping_bag')

    tempRef.current = STARTING_TEMP
    satRef.current = 0
    setCoreBodyTemp(STARTING_TEMP)
    setGroundSaturation(0)
    setSimTick(0)
    setSimLog([])
    setSimDone(false)
    setSimRunning(true)

    let tick = 0
    const logs = []

    simRef.current = setInterval(() => {
      tick++
      const isRaining = tick >= RAIN_START_TICK
      let tempDelta = 0
      let logEntry = `Hour ${tick}: `

      // Base ambient cooling
      tempDelta -= 0.08

      // Conductive loss (ground)
      const conductionLoss = hasGroundPad ? -0.05 : -0.8
      tempDelta += conductionLoss
      if (!hasGroundPad && tick <= 3) {
        logEntry += 'No ground pad! Cold earth drains heat rapidly. '
      }

      // Convection loss (wind)
      const convectionLoss = site.convectionLoss * (hasTent ? 0.4 : 1.0)
      tempDelta += convectionLoss
      setWindChill(Math.abs(convectionLoss * 10).toFixed(1))

      // Sleeping bag insulation bonus
      if (hasSleepingBag) {
        tempDelta += 0.15
      }

      // Rain effects
      if (isRaining) {
        satRef.current = Math.min(1, satRef.current + (site.floodRisk > 0 ? 0.12 : 0.02))
        setGroundSaturation(satRef.current)

        if (!hasRainfly) {
          tempDelta -= 0.3
          if (tick === RAIN_START_TICK) logEntry += 'Rain starts! No rainfly — gear getting soaked! '
        }

        // Depression flooding
        if (site.id === 'depression' && satRef.current > 0.5) {
          tempDelta -= 0.6
          logEntry += 'FLOODING! Water fills the depression! '
        }
      }

      tempRef.current = Math.max(88, tempRef.current + tempDelta)
      setCoreBodyTemp(tempRef.current)
      setSimTick(tick)

      const tempStr = tempRef.current.toFixed(1)
      if (tempRef.current < HYPOTHERMIA_THRESHOLD) {
        logEntry += `Core temp ${tempStr}°F — HYPOTHERMIA! `
      } else {
        logEntry += `Core temp ${tempStr}°F`
      }
      logs.push(logEntry)
      setSimLog([...logs])

      if (tick >= SIM_TICKS) {
        clearInterval(simRef.current)
        simRef.current = null
        setSimRunning(false)
        setSimDone(true)
      }
    }, TICK_MS)
  }, [selectedSite, placedEquip])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => { if (simRef.current) clearInterval(simRef.current) }
  }, [])

  // ── Handle site selection ────────────────────────────────────────────────

  const handleSelectSite = (siteId) => {
    setSelectedSite(siteId)
    setPhase('equip')
    setPlacedEquip([])
    setWrongCount(0)
    setWrongPick(null)
    setEquipFeedback(null)
  }

  // ── Handle equipment placement ───────────────────────────────────────────

  const handlePlaceEquip = (itemId) => {
    if (equipFeedback) return
    const expectedId = CORRECT_ORDER[placedEquip.length]

    if (itemId === expectedId) {
      const newPlaced = [...placedEquip, itemId]
      setPlacedEquip(newPlaced)
      setWrongPick(null)
      const item = EQUIPMENT.find(e => e.id === itemId)
      setEquipFeedback({ correct: true, text: `${item.label} placed correctly! ${item.desc}` })
      setTimeout(() => setEquipFeedback(null), 1800)
    } else {
      setWrongCount(c => c + 1)
      setWrongPick(itemId)
      const expected = EQUIPMENT.find(e => e.id === expectedId)
      setEquipFeedback({ correct: false, text: `Wrong order! "${expected.label}" must be placed first. ${expected.desc}` })
      setTimeout(() => { setWrongPick(null); setEquipFeedback(null) }, 2200)
    }
  }

  // ── Start simulation when all equipment placed ───────────────────────────

  const handleStartSim = () => {
    setPhase('simulate')
    startSimulation()
  }

  // ── Finish: calculate score ──────────────────────────────────────────────

  const handleFinish = () => {
    const site = SITES.find(s => s.id === selectedSite)
    let score = 0

    // Site choice: midslope = 30pts, ridge = 15pts, depression = 5pts
    if (selectedSite === 'midslope') score += 30
    else if (selectedSite === 'ridge') score += 15
    else score += 5

    // Equipment order: 30pts minus penalties
    score += Math.max(0, 30 - wrongCount * 8)

    // Final temp score: 0-40 based on how warm they stayed
    const tempScore = Math.max(0, Math.min(40, ((tempRef.current - 90) / (98.6 - 90)) * 40))
    score += Math.round(tempScore)

    score = Math.max(0, Math.min(100, Math.round(score)))
    const passed = tempRef.current >= HYPOTHERMIA_THRESHOLD

    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-7', result: { score, passed } } })
    setPhase('result')
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const allEquipPlaced = placedEquip.length === EQUIPMENT.length
  const isRaining = simTick >= RAIN_START_TICK
  const site = SITES.find(s => s.id === selectedSite)
  const showWind = site && site.windLevel >= 2 && (phase === 'simulate' || phase === 'equip')

  // ── INTRO PHASE ──────────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={{ fontSize: 56 }}>⛺</div>
          <h1 style={styles.title}>Module 7: Camp Safe Haven</h1>
          <p style={styles.subtitle}>Topography and Heat Loss</p>
          <p style={styles.body}>
            A flash flood has forced your group to camp overnight in the wilderness.
            You must choose the right campsite and assemble your shelter correctly, or
            <strong style={{ color: '#f87171' }}> hypothermia will set in before dawn</strong>.
          </p>
          <div style={styles.warnBox}>
            <p style={{ color: '#fbbf24', fontWeight: 700, margin: '0 0 6px', fontSize: 14 }}>
              The Professor's Hook
            </p>
            <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, lineHeight: 1.65 }}>
              That cozy depression blocks the wind (convection) — but becomes a puddle when it rains.
              And if you skip the Ground Pad, the cold wet earth pulls heat from your body via
              <strong style={{ color: '#60a5fa' }}> conduction</strong> — 25x faster than air.
              You can have a sleeping bag and still freeze.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, textAlign: 'left' }}>
              <strong style={{ color: '#f1f5f9' }}>Conduction:</strong> Heat transfer through direct contact (ground → body)
            </p>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, textAlign: 'left' }}>
              <strong style={{ color: '#f1f5f9' }}>Convection:</strong> Heat carried away by moving air (wind chill)
            </p>
          </div>
          <button style={styles.primaryBtn} onClick={() => setPhase('site_select')}>
            Scout the Terrain
          </button>
          <button style={styles.ghost} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── SITE SELECTION PHASE ─────────────────────────────────────────────────

  if (phase === 'site_select') {
    return (
      <div style={styles.screen}>
        <div style={{ ...styles.card, maxWidth: 700 }}>
          <h2 style={{ ...styles.title, fontSize: 22 }}>Choose Your Campsite</h2>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Study the terrain cross-section. Where you pitch matters as much as how you build.
          </p>

          <TerrainCrossSection selectedSite={null} phase={phase} groundSaturation={0} showRain={false} showWind={false} />

          <div style={{ display: 'flex', gap: 12, width: '100%', flexWrap: 'wrap' }}>
            {SITES.map(s => (
              <button key={s.id} onClick={() => handleSelectSite(s.id)} style={{
                flex: '1 1 180px', padding: '16px 14px', borderRadius: 12, textAlign: 'left',
                background: 'rgba(255,255,255,0.04)', border: `2px solid ${s.color}44`,
                cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{s.emoji}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.label}</div>
                <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 8px', lineHeight: 1.5 }}>{s.desc}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={tagStyle(s.windLevel >= 2 ? '#f87171' : '#4ade80')}>
                    Wind: {['None', 'Low', 'Med', 'High'][s.windLevel]}
                  </span>
                  <span style={tagStyle(s.drainageLevel >= 2 ? '#4ade80' : '#f87171')}>
                    Drain: {['Poor', 'Fair', 'Good', 'Great'][s.drainageLevel]}
                  </span>
                  {s.floodRisk > 0 && (
                    <span style={tagStyle('#f87171')}>Flood Risk!</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button style={styles.ghost} onClick={() => setPhase('intro')}>← Back</button>
        </div>
      </div>
    )
  }

  // ── EQUIP PHASE ──────────────────────────────────────────────────────────

  if (phase === 'equip') {
    return (
      <div style={{ ...styles.screenFull, flexDirection: 'column' }}>
        {/* Top terrain view */}
        <div style={{ padding: '16px 20px 0', width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0 }}>
                Assemble Shelter — {site.label}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0' }}>
                Place equipment in the correct order. Ground insulation first!
              </p>
            </div>
            <button style={styles.ghost} onClick={() => { setPhase('site_select'); setSelectedSite(null) }}>
              ← Change Site
            </button>
          </div>
          <TerrainCrossSection selectedSite={selectedSite} phase={phase} groundSaturation={0} showRain={false} showWind={showWind} />
        </div>

        {/* Equipment cards */}
        <div style={{ padding: '16px 20px', width: '100%', maxWidth: 900, margin: '0 auto', flex: 1, overflow: 'auto' }}>
          {/* Progress */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              <span>Equipment Placed</span>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>{placedEquip.length} / {EQUIPMENT.length}</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5, transition: 'width 0.4s',
                width: `${(placedEquip.length / EQUIPMENT.length) * 100}%`,
                background: 'linear-gradient(90deg,#3b82f6,#22c55e)',
              }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EQUIPMENT.map((item, idx) => {
              const isPlaced = placedEquip.includes(item.id)
              const isNext = !isPlaced && idx === CORRECT_ORDER.indexOf(CORRECT_ORDER[placedEquip.length])
              return (
                <EquipCard
                  key={item.id}
                  item={item}
                  index={idx}
                  placed={isPlaced}
                  isNext={!isPlaced}
                  isWrongPick={wrongPick === item.id}
                  onClick={() => handlePlaceEquip(item.id)}
                />
              )
            })}
          </div>

          {/* Feedback toast */}
          {equipFeedback && (
            <div style={{
              marginTop: 12, padding: '12px 16px', borderRadius: 10,
              background: equipFeedback.correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${equipFeedback.correct ? '#22c55e' : '#ef4444'}`,
            }}>
              <p style={{ color: equipFeedback.correct ? '#4ade80' : '#f87171', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                {equipFeedback.correct ? '✅' : '❌'} {equipFeedback.text}
              </p>
            </div>
          )}

          {wrongCount > 0 && (
            <p style={{ color: '#f87171', fontSize: 11, marginTop: 8 }}>
              {wrongCount} wrong-order attempt{wrongCount > 1 ? 's' : ''} (score penalty: -{wrongCount * 8} pts)
            </p>
          )}

          {allEquipPlaced && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <p style={{ color: '#4ade80', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                All equipment placed! Ready to survive the night.
              </p>
              <button style={styles.primaryBtn} onClick={handleStartSim}>
                Begin Overnight Simulation
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── SIMULATE PHASE ───────────────────────────────────────────────────────

  if (phase === 'simulate') {
    const nightProgress = Math.min(100, (simTick / SIM_TICKS) * 100)
    const isHypo = coreBodyTemp < HYPOTHERMIA_THRESHOLD

    return (
      <div style={{ ...styles.screenFull, flexDirection: 'row', gap: 0 }}>
        {/* Left panel: terrain + info */}
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: 0 }}>
            Overnight Simulation — {site.label}
          </h2>

          <TerrainCrossSection
            selectedSite={selectedSite}
            phase={phase}
            groundSaturation={groundSaturation}
            showRain={isRaining && simRunning}
            showWind={showWind && simRunning}
          />

          {/* Night progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              <span>{isRaining ? '🌧️ Raining' : '🌙 Clear skies'}</span>
              <span>Night progress: {nightProgress.toFixed(0)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 5, transition: 'width 0.3s',
                width: `${nightProgress}%`,
                background: isHypo
                  ? 'linear-gradient(90deg,#1e40af,#60a5fa)'
                  : 'linear-gradient(90deg,#1e293b,#475569)',
              }} />
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatBox label="Wind Chill" value={`${windChill}°F`} color={parseFloat(windChill) > 2 ? '#f87171' : '#4ade80'} />
            <StatBox label="Ground Sat." value={`${(groundSaturation * 100).toFixed(0)}%`} color={groundSaturation > 0.5 ? '#f87171' : '#4ade80'} />
            <StatBox label="Site" value={site.label.split('(')[0].trim()} color={site.color} />
            <StatBox
              label="Ground Pad"
              value={placedEquip.includes('ground_pad') ? 'YES' : 'NO'}
              color={placedEquip.includes('ground_pad') ? '#4ade80' : '#f87171'}
            />
          </div>

          {/* Sim log */}
          <div style={{
            flex: 1, minHeight: 100, maxHeight: 160, overflow: 'auto',
            background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '8px 12px',
            fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', lineHeight: 1.6,
          }}>
            {simLog.length === 0 && <span style={{ color: '#475569' }}>Simulation starting...</span>}
            {simLog.map((log, i) => (
              <div key={i} style={{
                color: log.includes('HYPOTHERMIA') ? '#f87171' :
                  log.includes('FLOODING') ? '#60a5fa' :
                  log.includes('No ground pad') ? '#fbbf24' : '#94a3b8',
              }}>
                {log}
              </div>
            ))}
          </div>

          {simDone && (
            <div style={{ textAlign: 'center' }}>
              <button style={styles.primaryBtn} onClick={handleFinish}>
                {isHypo ? 'View Results (Hypothermia!)' : 'View Results'}
              </button>
            </div>
          )}
        </div>

        {/* Right panel: thermometer */}
        <div style={{
          width: 120, padding: '30px 20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20,
          background: 'rgba(0,0,0,0.2)', borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Thermometer temp={coreBodyTemp} label="Core Temp" />
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: tempColor(coreBodyTemp),
            opacity: 0.3,
            transition: 'background 0.3s',
            boxShadow: `0 0 30px ${tempColor(coreBodyTemp)}44`,
          }} />
          {isHypo && (
            <div style={{
              padding: '6px 12px', borderRadius: 6,
              background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444',
              color: '#f87171', fontSize: 11, fontWeight: 700, textAlign: 'center',
            }}>
              DANGER<br />Hypothermia
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── RESULT PHASE ─────────────────────────────────────────────────────────

  if (phase === 'result') {
    const finalTemp = tempRef.current
    const passed = finalTemp >= HYPOTHERMIA_THRESHOLD
    const siteScore = selectedSite === 'midslope' ? 30 : selectedSite === 'ridge' ? 15 : 5
    const orderScore = Math.max(0, 30 - wrongCount * 8)
    const tempScore = Math.round(Math.max(0, Math.min(40, ((finalTemp - 90) / (98.6 - 90)) * 40)))
    const totalScore = Math.min(100, siteScore + orderScore + tempScore)

    return (
      <div style={styles.screen}>
        <div style={{ ...styles.card, maxWidth: 620 }}>
          <div style={{ fontSize: 52 }}>{passed ? '⛺✅' : '🥶❌'}</div>
          <h1 style={{ ...styles.title, color: passed ? '#22c55e' : '#f87171' }}>
            {passed ? 'You Survived the Night!' : 'Hypothermia — Mission Failed'}
          </h1>
          <p style={{
            fontSize: 32, fontWeight: 800, margin: '4px 0 8px',
            color: passed ? '#60a5fa' : '#f87171',
          }}>
            {totalScore}%
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Final core temperature: <strong style={{ color: tempColor(finalTemp) }}>{finalTemp.toFixed(1)}°F</strong>
          </p>

          {/* Score breakdown */}
          <div style={{ ...styles.warnBox, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)', textAlign: 'left', width: '100%' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, margin: '0 0 10px', fontSize: 14 }}>Score Breakdown</p>
            <ScoreRow label={`Site Choice: ${site.label}`} pts={siteScore} max={30} good={selectedSite === 'midslope'} />
            <ScoreRow label={`Equipment Order (${wrongCount} errors)`} pts={orderScore} max={30} good={wrongCount === 0} />
            <ScoreRow label={`Temperature Survival`} pts={tempScore} max={40} good={finalTemp >= HYPOTHERMIA_THRESHOLD} />
          </div>

          {/* Lessons */}
          <div style={{ ...styles.warnBox, textAlign: 'left', width: '100%' }}>
            <p style={{ color: '#fbbf24', fontWeight: 700, margin: '0 0 8px', fontSize: 14 }}>Key Lessons</p>
            <Lesson text="The Ground Pad is the most critical piece. Cold ground conducts heat away 25x faster than cold air. Always insulate from below FIRST." />
            <Lesson text="Midslope sites balance wind protection and drainage. Ridges are too exposed; depressions flood." />
            <Lesson text="The Rainfly goes on LAST but is essential. Without it, rain soaks everything and accelerates heat loss." />
            <Lesson text="Conduction (ground contact) kills faster than convection (wind). Prioritize insulation over windbreaks." />
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={styles.primaryBtn} onClick={() => {
              setPhase('site_select')
              setSelectedSite(null)
              setPlacedEquip([])
              setWrongCount(0)
              setWrongPick(null)
              setEquipFeedback(null)
              setCoreBodyTemp(STARTING_TEMP)
              setGroundSaturation(0)
              setWindChill(0)
              setSimTick(0)
              setSimLog([])
              setSimDone(false)
            }}>
              Try Again
            </button>
            <button style={styles.secondaryBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Small helper components ──────────────────────────────────────────────────

function StatBox({ label, value, color }) {
  return (
    <div style={{
      flex: '1 1 100px', padding: '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

function ScoreRow({ label, pts, max, good }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ color: '#cbd5e1', fontSize: 13 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: good ? '#4ade80' : '#f87171',
      }}>
        {pts}/{max}
      </span>
    </div>
  )
}

function Lesson({ text }) {
  return (
    <p style={{ color: '#cbd5e1', fontSize: 12, margin: '0 0 8px', lineHeight: 1.55, paddingLeft: 16, position: 'relative' }}>
      <span style={{ position: 'absolute', left: 0, color: '#fbbf24' }}>•</span>
      {text}
    </p>
  )
}

function tagStyle(color) {
  return {
    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
    background: `${color}20`, color, border: `1px solid ${color}44`,
  }
}

// ── Shared UI styles ─────────────────────────────────────────────────────────

const styles = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
    fontFamily: 'system-ui, sans-serif',
  },
  screenFull: {
    minHeight: '100vh', display: 'flex',
    background: '#0f172a',
    fontFamily: 'system-ui, sans-serif',
    overflow: 'hidden',
  },
  card: {
    maxWidth: 560, padding: '40px 36px', textAlign: 'center',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20, backdropFilter: 'blur(10px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  },
  title: { color: '#f1f5f9', fontSize: 26, fontWeight: 800, margin: 0 },
  subtitle: { color: '#94a3b8', fontSize: 14, margin: '-6px 0 0', fontWeight: 500, letterSpacing: 1 },
  body: { color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, margin: 0 },
  warnBox: {
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 12, padding: '14px 18px', width: '100%',
  },
  primaryBtn: {
    padding: '13px 36px', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg, #ea580c, #f97316)',
    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(234,88,12,0.4)',
    fontFamily: 'inherit',
  },
  secondaryBtn: {
    padding: '13px 28px', fontSize: 15, fontWeight: 600,
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
    color: '#a5b4fc', borderRadius: 12, cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ghost: {
    background: 'none', border: 'none', color: '#64748b',
    cursor: 'pointer', fontSize: 13, padding: 0,
    fontFamily: 'inherit',
  },
}
