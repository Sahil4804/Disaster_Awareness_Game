import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ALL_ZONES = [
  {
    id: 1,
    contaminated: true,
    label: 'Rainbow Oil Slick',
    emoji: '🌈🛢️',
    color: 'linear-gradient(135deg, #ff0000, #ff8800, #ffff00, #00ff00, #0088ff, #8800ff)',
    fact: 'Rainbow sheens on floodwater indicate petroleum or chemical spills. These contain benzene and other carcinogens. Boiling CANNOT remove chemical contaminants — it actually concentrates them.',
    top: '15%', left: '5%',
  },
  {
    id: 2,
    contaminated: false,
    label: 'Clear Muddy Water',
    emoji: '🌊',
    color: 'linear-gradient(135deg, #5b4a3a, #7a6a5a)',
    fact: 'Muddy water looks dirty but may only contain sediment. Unlike chemical contamination, sediment can be filtered and the water boiled to make it safer. Still, test before drinking!',
    top: '10%', left: '55%',
  },
  {
    id: 3,
    contaminated: true,
    label: 'Floating Chemical Drums',
    emoji: '🛢️🛢️☠️',
    color: 'linear-gradient(135deg, #2a0a2a, #6b0060, #2a0a2a)',
    fact: 'Industrial drums in floodwater can leak pesticides, solvents, or acids. Even touching this water can cause chemical burns. Evacuate the area immediately and report to hazmat teams.',
    top: '45%', left: '10%',
  },
  {
    id: 4,
    contaminated: true,
    label: 'Dead Fish Zone',
    emoji: '🐟💀🐟',
    color: 'linear-gradient(135deg, #1a3a1a, #3a5a1a, #1a3a1a)',
    fact: 'Dead fish indicate oxygen depletion or toxic chemicals in the water. This is a major biohazard — the bacteria from decomposition plus the original toxin make this water extremely dangerous.',
    top: '40%', left: '60%',
  },
  {
    id: 5,
    contaminated: false,
    label: 'Rainwater Puddle',
    emoji: '💧',
    color: 'linear-gradient(135deg, #3a5a8a, #4a6a9a)',
    fact: 'Fresh rainwater collected in clean containers is relatively safe. It has not contacted contaminated ground. In emergencies, captured rainwater can be boiled for drinking.',
    top: '70%', left: '35%',
  },
  {
    id: 6,
    contaminated: true,
    label: 'Discolored Green Patch',
    emoji: '🟢🧪',
    color: 'linear-gradient(135deg, #003300, #00ff00, #003300)',
    fact: 'Unusual green or bright coloration in floodwater often indicates algae blooms fed by sewage/fertilizer runoff, or dissolved copper/chromium compounds. These cause severe GI illness and liver damage.',
    top: '72%', left: '65%',
  },
  {
    id: 7,
    contaminated: true,
    label: 'Sewage Overflow',
    emoji: '🚽💩',
    color: 'linear-gradient(135deg, #5c3a1e, #3d5a2e, #5c3a1e)',
    fact: 'Floodwater mixes with raw sewage from overwhelmed treatment plants. This brown-green water carries E. coli, hepatitis A, and other dangerous pathogens. Never wade through it without full waterproof protection.',
    top: '75%', left: '55%',
  },
  {
    id: 8,
    contaminated: true,
    label: 'Agricultural Runoff',
    emoji: '🌾☠️',
    color: 'linear-gradient(135deg, #8a8a00, #5a7a00, #8a8a00)',
    fact: 'Farm runoff in floods contains pesticides, herbicides, fertilizers, and animal waste. These chemicals cause skin rashes, respiratory issues, and long-term organ damage. Agricultural flooding is especially toxic.',
    top: '25%', left: '80%',
  },
  {
    id: 9,
    contaminated: false,
    label: 'Flowing Stream Water',
    emoji: '🏞️',
    color: 'linear-gradient(135deg, #4a8ab0, #6aaad0)',
    fact: 'Moving water from an upstream, uncontaminated stream is relatively safer than stagnant floodwater. However, always filter and boil before drinking — even clear-looking water can carry Giardia.',
    top: '55%', left: '40%',
  },
  {
    id: 10,
    contaminated: false,
    label: 'Rooftop Collected Water',
    emoji: '🏠💧',
    color: 'linear-gradient(135deg, #7ab8e0, #a0d0f0)',
    fact: 'Rainwater collected from rooftops (in clean containers, not flood-level) is among the safest emergency water sources. Filter through cloth and boil as a precaution.',
    top: '5%', left: '30%',
  },
]

const TIMER_SECONDS = 75

export default function Module11_ToxicSoup() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro') // intro | play | result
  const [flagged, setFlagged] = useState({})
  const [popup, setPopup] = useState(null)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [result, setResult] = useState(null)
  const [shimmerFrame, setShimmerFrame] = useState(0)

  // Shuffle zones on each game session
  const ZONES = useMemo(() => shuffleArray(ALL_ZONES), [])

  // Timer
  useEffect(() => {
    if (phase !== 'play') return
    if (timeLeft <= 0) { endGame(); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase])

  // Shimmer animation
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => setShimmerFrame(f => f + 1), 200)
    return () => clearInterval(id)
  }, [phase])

  const toggleFlag = useCallback((zone) => {
    if (phase !== 'play') return
    const newFlagged = { ...flagged }
    if (newFlagged[zone.id]) {
      delete newFlagged[zone.id]
    } else {
      newFlagged[zone.id] = true
    }
    setFlagged(newFlagged)
    setPopup(zone)
    setTimeout(() => setPopup(null), 3500)
  }, [flagged, phase])

  const endGame = useCallback(() => {
    let correct = 0
    let total = ZONES.filter(z => z.contaminated).length
    let falseFlags = 0
    ZONES.forEach(z => {
      if (z.contaminated && flagged[z.id]) correct++
      if (!z.contaminated && flagged[z.id]) falseFlags++
    })
    const missed = total - correct
    const rawScore = Math.max(0, Math.round(((correct - falseFlags) / total) * 100))
    const score = Math.min(100, Math.max(0, rawScore))
    const passed = correct >= 4 && falseFlags <= 1
    setResult({ score, passed, correct, total, falseFlags, missed })
    setPhase('result')
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-11', result: { score, passed } } })
  }, [flagged, dispatch, ZONES])

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>☣️🌊</div>
          <h1 style={styles.title}>Module 11: Toxic Soup</h1>
          <p style={styles.text}>
            Floodwater is never just water. It mixes with sewage, chemicals, fuel, and industrial waste
            to create a deadly "toxic soup."
          </p>
          <p style={{ ...styles.text, color: '#ff6b6b', fontWeight: 'bold' }}>
            YOUR MISSION: Survey the flooded area and FLAG all contaminated water zones.
            Do NOT flag safe zones — false alarms waste rescue resources.
          </p>
          <p style={{ ...styles.text, color: '#fbbf24' }}>
            KEY FACT: Boiling CANNOT remove chemical contaminants. Only biological pathogens are killed by boiling.
          </p>
          <p style={styles.text}>Time limit: 75 seconds</p>
          <button style={styles.startBtn} onClick={() => setPhase('play')}>
            🔬 Begin Survey
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>{result.passed ? '✅' : '❌'}</div>
          <h1 style={{ ...styles.title, color: result.passed ? '#4ade80' : '#f87171' }}>
            {result.passed ? 'AREA SECURED' : 'CONTAMINATION MISSED'}
          </h1>
          <div style={styles.statGrid}>
            <div style={styles.statItem}>
              <div style={{ fontSize: 36, color: '#4ade80' }}>{result.correct}</div>
              <div style={styles.statLabel}>Correct Flags</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 36, color: '#f87171' }}>{result.falseFlags}</div>
              <div style={styles.statLabel}>False Flags</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 36, color: '#fbbf24' }}>{result.missed}</div>
              <div style={styles.statLabel}>Missed</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 36, color: '#38bdf8' }}>{result.score}%</div>
              <div style={styles.statLabel}>Score</div>
            </div>
          </div>
          <div style={{ ...styles.text, background: '#1e293b', padding: 16, borderRadius: 8, marginTop: 12 }}>
            <strong style={{ color: '#ff6b6b' }}>REMEMBER:</strong> Floodwater contaminated with chemicals
            CANNOT be made safe by boiling. Boiling only kills bacteria and viruses — chemical pollutants
            (petroleum, pesticides, heavy metals) remain and become MORE concentrated. Always assume
            floodwater is toxic until tested by professionals.
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button style={styles.startBtn} onClick={() => { setPhase('intro'); setFlagged({}); setTimeLeft(TIMER_SECONDS); setResult(null) }}>
              🔄 Retry
            </button>
            <button style={{ ...styles.startBtn, background: '#6366f1' }} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              📋 Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  return (
    <div style={styles.container}>
      {/* HUD */}
      <div style={styles.hud}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 18, color: timeLeft <= 15 ? '#f87171' : '#f1f5f9' }}>
            ⏱️ {timeLeft}s
          </span>
          <span style={{ fontSize: 18, color: '#38bdf8' }}>
            🚩 {Object.keys(flagged).length} flagged
          </span>
        </div>
        <button style={styles.submitBtn} onClick={endGame}>✅ Submit Report</button>
      </div>

      <h2 style={{ color: '#f1f5f9', textAlign: 'center', margin: '8px 0' }}>
        Click zones to FLAG contaminated water ☣️
      </h2>

      {/* Flood Scene */}
      <div style={styles.floodScene}>
        {/* Animated water background */}
        <div style={{
          ...styles.waterBg,
          backgroundPosition: `${shimmerFrame * 5}px ${shimmerFrame * 2}px`,
        }} />

        {ZONES.map(zone => (
          <div
            key={zone.id}
            onClick={() => toggleFlag(zone)}
            style={{
              position: 'absolute',
              top: zone.top,
              left: zone.left,
              width: 180,
              height: 120,
              background: zone.color,
              borderRadius: 12,
              border: flagged[zone.id] ? '4px solid #f87171' : '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: flagged[zone.id]
                ? '0 0 20px rgba(248,113,113,0.6)'
                : '0 4px 12px rgba(0,0,0,0.4)',
              animation: zone.contaminated && zone.id === 1 ? 'none' : 'none',
              overflow: 'hidden',
            }}
          >
            {flagged[zone.id] && (
              <div style={{
                position: 'absolute', top: -8, right: -8,
                background: '#f87171', borderRadius: '50%',
                width: 32, height: 32, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, zIndex: 5,
              }}>🚩</div>
            )}
            <div style={{ fontSize: 32, zIndex: 2 }}>{zone.emoji}</div>
            <div style={{
              fontSize: 11, color: '#f1f5f9', textAlign: 'center',
              fontWeight: 'bold', marginTop: 4, zIndex: 2,
              textShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}>
              {zone.label}
            </div>
            {/* Water ripple overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 12,
              background: `radial-gradient(circle at ${30 + (shimmerFrame % 5) * 10}% ${40 + (shimmerFrame % 3) * 10}%, rgba(255,255,255,0.15), transparent)`,
              pointerEvents: 'none',
            }} />
          </div>
        ))}
      </div>

      {/* Popup */}
      {popup && (
        <div style={styles.popup}>
          <div style={{ fontSize: 24 }}>{popup.emoji}</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            <strong style={{ color: popup.contaminated ? '#f87171' : '#4ade80' }}>
              {popup.contaminated ? '⚠️ CONTAMINATED' : '✅ RELATIVELY SAFE'}
            </strong>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>{popup.fact}</div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    fontFamily: 'system-ui, sans-serif',
    position: 'relative',
  },
  introBox: {
    maxWidth: 600,
    background: '#1e293b',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    marginTop: 40,
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 28,
    margin: '12px 0',
  },
  text: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 1.6,
    margin: '10px 0',
  },
  startBtn: {
    padding: '14px 36px',
    fontSize: 18,
    fontWeight: 'bold',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 16,
  },
  hud: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 800,
    padding: '8px 16px',
    background: '#1e293b',
    borderRadius: 10,
    marginBottom: 8,
  },
  submitBtn: {
    padding: '8px 20px',
    fontSize: 14,
    fontWeight: 'bold',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  floodScene: {
    position: 'relative',
    width: '100%',
    maxWidth: 800,
    height: 600,
    background: 'linear-gradient(180deg, #1a2a3a 0%, #0a1a2a 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid #334155',
  },
  waterBg: {
    position: 'absolute',
    inset: 0,
    background: 'repeating-linear-gradient(90deg, rgba(56,189,248,0.05) 0px, rgba(56,189,248,0.02) 20px, transparent 40px)',
    backgroundSize: '80px 80px',
    pointerEvents: 'none',
  },
  popup: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    border: '1px solid #475569',
    borderRadius: 12,
    padding: 16,
    maxWidth: 400,
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 100,
    color: '#f1f5f9',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginTop: 16,
  },
  statItem: {
    background: '#0f172a',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
}
