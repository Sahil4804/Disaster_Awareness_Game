import { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

const ITEMS = [
  {
    id: 1, name: 'Old Tire', emoji: '🛞', hasWater: true,
    fact: 'Old tires collect rainwater in their rims and are the #1 mosquito breeding site worldwide. A single tire can produce thousands of mosquitoes.',
    top: '12%', left: '8%',
  },
  {
    id: 2, name: 'Bucket', emoji: '🪣', hasWater: true,
    fact: 'Buckets, cans, and containers left outdoors fill with rainwater. Mosquitoes only need 1 tablespoon of standing water to lay 100-200 eggs.',
    top: '15%', left: '55%',
  },
  {
    id: 3, name: 'Flower Pot Saucer', emoji: '🪴', hasWater: true,
    fact: 'Flower pot saucers are sneaky breeding grounds. Empty them every 2-3 days or add sand to absorb water while still draining to the plant.',
    top: '40%', left: '15%',
  },
  {
    id: 4, name: 'Puddle', emoji: '💧', hasWater: true,
    fact: 'Stagnant puddles that last more than 7 days become mosquito nurseries. After floods, fill low spots with dirt or ensure drainage.',
    top: '65%', left: '45%',
  },
  {
    id: 5, name: 'Blocked Gutter', emoji: '🏚️', hasWater: true,
    fact: 'Clogged gutters hold water for weeks. After a flood, clearing gutters is one of the most important mosquito prevention steps.',
    top: '8%', left: '75%',
  },
  {
    id: 6, name: 'Abandoned Pool', emoji: '🏊', hasWater: true,
    fact: 'Abandoned or untreated pools become massive mosquito breeding lakes. Even a few inches of green water can produce millions of mosquitoes.',
    top: '55%', left: '70%',
  },
  {
    id: 7, name: 'Tarp Collecting Water', emoji: '⛺', hasWater: true,
    fact: 'Tarps, plastic sheeting, and covers sag and collect pools of water. Pull them taut or poke drain holes to prevent water accumulation.',
    top: '38%', left: '60%',
  },
  {
    id: 8, name: 'Birdbath', emoji: '🐦', hasWater: true,
    fact: 'Birdbaths should be emptied and refilled every 2-3 days after floods. Adding a small fountain/agitator prevents mosquitoes — they cannot breed in moving water.',
    top: '72%', left: '10%',
  },
  {
    id: 12, name: 'Discarded Bottle Cap', emoji: '\u{1F9E2}', hasWater: true,
    fact: 'Even a bottle cap holds enough water for mosquitoes! They only need 1 teaspoon of standing water. After floods, check for ANY small container that holds water.',
    top: '82%', left: '65%',
  },
  {
    id: 13, name: 'Tree Hollow', emoji: '\u{1F333}', hasWater: true,
    fact: 'Tree hollows collect and hold water for weeks. In tropical flood zones, tree holes are a major source of Aedes mosquitoes that carry dengue and Zika.',
    top: '25%', left: '70%',
  },
  {
    id: 14, name: 'Broken Pipe Puddle', emoji: '\u{1F527}', hasWater: true,
    fact: 'Floods break water/sewer pipes, creating persistent puddles that last long after floodwater recedes. Report broken pipes \u2014 they\'re both a contamination hazard and a mosquito factory.',
    top: '60%', left: '5%',
  },
  {
    id: 15, name: 'Pet Water Bowl', emoji: '\u{1F415}', hasWater: true,
    fact: 'Forgotten outdoor pet bowls are perfect mosquito nurseries. Change pet water daily and bring bowls inside at night.',
    top: '48%', left: '48%',
  },
  // Decoys
  {
    id: 9, name: 'Dry Rock', emoji: '\u{1FAA8}', hasWater: false,
    fact: 'Rocks and solid surfaces don\'t hold water. Good eye, but focus on containers and depressions that trap water!',
    top: '30%', left: '38%',
  },
  {
    id: 10, name: 'Wooden Fence', emoji: '\u{1FAB5}', hasWater: false,
    fact: 'Fences don\'t collect standing water. Look for items with concave surfaces or rims that trap water.',
    top: '50%', left: '30%',
  },
  {
    id: 11, name: 'Metal Sign', emoji: '\u{1FAA7}', hasWater: false,
    fact: 'Flat vertical surfaces don\'t collect water. Mosquitoes need horizontal surfaces with pooled water.',
    top: '20%', left: '35%',
  },
  {
    id: 16, name: 'Concrete Slab', emoji: '\u{1F9F1}', hasWater: false,
    fact: 'Flat, sloped surfaces like concrete slabs drain water. Mosquitoes need pooled water \u2014 check depressions and cracks in concrete instead.',
    top: '35%', left: '82%',
  },
  {
    id: 17, name: 'Hanging Clothesline', emoji: '\u{1F455}', hasWater: false,
    fact: 'Clotheslines don\'t hold water. However, check the area beneath for containers that might collect dripping water.',
    top: '15%', left: '42%',
  },
]

const TIMER_SECONDS = 60
const WATER_SOURCES_TOTAL = ITEMS.filter(i => i.hasWater).length

const MOSQUITO_FACTS = [
  "\u{1F99F} Mosquitoes can breed in as little as 1 teaspoon of water",
  "\u{1F99F} After floods, mosquito populations can increase 100x in one week",
  "\u{1F99F} Dengue, Zika, West Nile, and Malaria are all mosquito-borne",
  "\u{1F99F} Female mosquitoes need blood to produce eggs \u2014 males don't bite",
  "\u{1F99F} Mosquitoes kill more humans than any other animal on Earth",
  "\u{1F99F} A single mosquito can lay 100-200 eggs at a time",
  "\u{1F99F} Mosquito eggs can survive dry conditions for months, hatching when reflooded",
]

// Fisher-Yates shuffle for item positions
function shufflePositions(items) {
  const positions = items.map(i => ({ top: i.top, left: i.left }))
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]]
  }
  return items.map((item, idx) => ({ ...item, top: positions[idx].top, left: positions[idx].left }))
}

export default function Module14_TheSwarm() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [cleared, setCleared] = useState({})
  const [falseClicks, setFalseClicks] = useState(0)
  const [popup, setPopup] = useState(null)
  const [mosquitoCount, setMosquitoCount] = useState(5)
  const [mosquitoes, setMosquitoes] = useState([])
  const [result, setResult] = useState(null)
  const [currentFact, setCurrentFact] = useState(0)
  const [shuffledItems, setShuffledItems] = useState(ITEMS)
  const popupTimerRef = useRef(null)

  // Mosquito fact ticker — cycle every 5 seconds
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      setCurrentFact(f => (f + 1) % MOSQUITO_FACTS.length)
    }, 5000)
    return () => clearInterval(id)
  }, [phase])

  // Shuffle item positions when game starts
  useEffect(() => {
    if (phase === 'play') {
      setShuffledItems(shufflePositions(ITEMS))
    }
  }, [phase === 'play'])

  // Timer
  useEffect(() => {
    if (phase !== 'play') return
    if (timeLeft <= 0) { endGame(); return }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase])

  // Mosquito spawning
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      const remainingSources = ITEMS.filter(i => i.hasWater && !cleared[i.id]).length
      if (remainingSources > 0) {
        setMosquitoCount(prev => prev + remainingSources)
        // Add visual mosquitoes
        setMosquitoes(prev => {
          const newBugs = Array.from({ length: Math.min(remainingSources, 3) }, (_, i) => ({
            id: Date.now() + i,
            x: Math.random() * 90 + 5,
            y: Math.random() * 80 + 10,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
          }))
          return [...prev.slice(-30), ...newBugs]
        })
      }
    }, 2000)
    return () => clearInterval(id)
  }, [phase, cleared])

  // Animate mosquitoes
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => {
      setMosquitoes(prev => prev.map(m => ({
        ...m,
        x: Math.max(2, Math.min(95, m.x + m.dx + (Math.random() - 0.5) * 2)),
        y: Math.max(5, Math.min(90, m.y + m.dy + (Math.random() - 0.5) * 2)),
      })))
    }, 300)
    return () => clearInterval(id)
  }, [phase])

  const clickItem = useCallback((item) => {
    if (phase !== 'play' || cleared[item.id]) return

    if (item.hasWater) {
      setCleared(prev => ({ ...prev, [item.id]: true }))
    } else {
      setFalseClicks(prev => prev + 1)
    }

    setPopup(item)
    if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
    popupTimerRef.current = setTimeout(() => setPopup(null), 2500)
  }, [phase, cleared])

  const endGame = useCallback(() => {
    const correctClears = ITEMS.filter(i => i.hasWater && cleared[i.id]).length
    const pct = correctClears / WATER_SOURCES_TOTAL
    const penalty = falseClicks * 5
    const rawScore = Math.max(0, Math.round(pct * 100 - penalty))
    const passed = pct > 0.75
    const r = { score: rawScore, passed, cleared: correctClears, total: WATER_SOURCES_TOTAL, falseClicks, mosquitoCount }
    setResult(r)
    setPhase('result')
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-14', result: r } })
  }, [cleared, falseClicks, mosquitoCount, dispatch])

  const resetGame = () => {
    setPhase('intro')
    setTimeLeft(TIMER_SECONDS)
    setCleared({})
    setFalseClicks(0)
    setPopup(null)
    setMosquitoCount(5)
    setMosquitoes([])
    setResult(null)
    setCurrentFact(0)
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>🦟🌊</div>
          <h1 style={styles.title}>Module 14: The Swarm</h1>
          <p style={styles.text}>
            After a flood recedes, the REAL danger begins. Standing water becomes a breeding ground for
            mosquitoes carrying <strong style={{ color: '#f87171' }}>dengue, malaria, Zika, and West Nile virus</strong>.
          </p>
          <p style={{ ...styles.text, color: '#fbbf24', fontWeight: 'bold' }}>
            YOUR MISSION: Find and eliminate all sources of standing water before the mosquito population explodes.
          </p>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, margin: '12px 0' }}>
            <p style={{ ...styles.text, margin: 0, fontSize: 13 }}>
              ⏱️ Time: 60 seconds | 🎯 Goal: Clear 75%+ of water sources | ⚠️ Avoid clicking dry items (wastes time)
            </p>
          </div>
          <p style={{ ...styles.text, color: '#f87171', fontSize: 13 }}>
            Every 2 seconds, remaining water sources spawn more mosquitoes. Act fast!
          </p>
          <button style={styles.startBtn} onClick={() => setPhase('play')}>
            🦟 Start Cleanup
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
          <div style={{ fontSize: 64 }}>{result.passed ? '✅🦟' : '❌🦟'}</div>
          <h1 style={{ ...styles.title, color: result.passed ? '#4ade80' : '#f87171' }}>
            {result.passed ? 'AREA SECURED — BREEDING SITES ELIMINATED' : 'MOSQUITO OUTBREAK'}
          </h1>
          <div style={styles.statGrid}>
            <div style={styles.statItem}>
              <div style={{ fontSize: 32, color: '#4ade80' }}>{result.cleared}/{result.total}</div>
              <div style={styles.statLabel}>Sources Cleared</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 32, color: '#f87171' }}>{result.falseClicks}</div>
              <div style={styles.statLabel}>False Clicks</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 32, color: '#fbbf24' }}>{result.mosquitoCount}</div>
              <div style={styles.statLabel}>Mosquitoes Spawned</div>
            </div>
            <div style={styles.statItem}>
              <div style={{ fontSize: 32, color: '#38bdf8' }}>{result.score}%</div>
              <div style={styles.statLabel}>Score</div>
            </div>
          </div>
          <div style={{ ...styles.text, background: '#1e293b', padding: 16, borderRadius: 8, marginTop: 12 }}>
            <strong style={{ color: '#fbbf24' }}>POST-FLOOD DISEASE PREVENTION:</strong>
            <ul style={{ textAlign: 'left', color: '#cbd5e1', lineHeight: 1.8 }}>
              <li><strong style={{ color: '#f87171' }}>Dengue Fever</strong> — Causes severe joint pain ("breakbone fever"), potentially fatal hemorrhagic dengue</li>
              <li><strong style={{ color: '#f87171' }}>Malaria</strong> — Kills 600,000+ people annually. Symptoms appear 10-15 days after bite</li>
              <li><strong style={{ color: '#f87171' }}>Zika Virus</strong> — Causes birth defects. Mosquitoes breed in tiny amounts of water</li>
              <li><strong style={{ color: '#4ade80' }}>Prevention</strong> — Eliminate standing water within 48 hours after flooding. Mosquito eggs hatch in 7-10 days</li>
              <li><strong style={{ color: '#4ade80' }}>Key fact</strong> — Mosquitoes cannot breed in moving water. Agitate or drain ALL still water</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            <button style={styles.startBtn} onClick={resetGame}>🔄 Retry</button>
            <button style={{ ...styles.startBtn, background: '#6366f1' }} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              📋 Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  const clearedCount = ITEMS.filter(i => i.hasWater && cleared[i.id]).length

  return (
    <div style={styles.container}>
      {/* HUD */}
      <div style={styles.hud}>
        <span style={{ color: timeLeft <= 10 ? '#f87171' : '#f1f5f9', fontSize: 16, fontWeight: 'bold' }}>
          ⏱️ {timeLeft}s
        </span>
        <span style={{ color: '#4ade80', fontSize: 14 }}>
          🪣 {clearedCount}/{WATER_SOURCES_TOTAL} cleared
        </span>
        <span style={{ color: '#f87171', fontSize: 14 }}>
          🦟 {mosquitoCount} mosquitoes
        </span>
        <span style={{ color: '#fbbf24', fontSize: 14 }}>
          ❌ {falseClicks} false
        </span>
        <button style={styles.submitBtn} onClick={endGame}>✅ Finish</button>
      </div>

      <h2 style={{ color: '#f1f5f9', textAlign: 'center', margin: '6px 0', fontSize: 16 }}>
        Click items with standing water to remove them 🪣
      </h2>

      {/* Scene */}
      <div style={styles.scene}>
        {/* Ground */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%',
          background: 'linear-gradient(0deg, #3d2b1f, #5a4030, #4a3828)',
          borderRadius: '0 0 14px 14px',
        }} />

        {/* Sky/background */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
          background: 'linear-gradient(180deg, #4a6fa5, #8baacc, #c5d5e5)',
          opacity: 0.3,
          borderRadius: '14px 14px 0 0',
        }} />

        {/* Items */}
        {shuffledItems.map(item => (
          <div
            key={item.id}
            onClick={() => clickItem(item)}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
              width: 90,
              height: 80,
              background: cleared[item.id]
                ? 'rgba(74,222,128,0.15)'
                : item.hasWater
                  ? 'rgba(56,189,248,0.12)'
                  : 'rgba(100,116,139,0.12)',
              borderRadius: 12,
              border: cleared[item.id]
                ? '2px solid #4ade80'
                : '2px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: cleared[item.id] ? 'default' : 'pointer',
              transition: 'all 0.2s',
              opacity: cleared[item.id] ? 0.5 : 1,
              boxShadow: !cleared[item.id] ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <div style={{ fontSize: 32 }}>
              {cleared[item.id] ? '✅' : item.emoji}
            </div>
            <div style={{
              fontSize: 10, color: '#f1f5f9', textAlign: 'center',
              fontWeight: 'bold', marginTop: 2,
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}>
              {item.name}
            </div>
            {/* Water indicator for uncleaned water items */}
            {item.hasWater && !cleared[item.id] && (
              <div style={{
                position: 'absolute', bottom: 2, right: 4,
                fontSize: 12, opacity: 0.7,
              }}>💧</div>
            )}
          </div>
        ))}

        {/* Animated mosquitoes */}
        {mosquitoes.map(m => (
          <div key={m.id} style={{
            position: 'absolute',
            left: `${m.x}%`,
            top: `${m.y}%`,
            fontSize: 16,
            pointerEvents: 'none',
            transition: 'left 0.3s linear, top 0.3s linear',
            opacity: 0.8,
            zIndex: 20,
          }}>
            🦟
          </div>
        ))}

        {/* Mosquito density warning */}
        {mosquitoCount > 30 && (
          <div style={{
            position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.9)', padding: '4px 12px', borderRadius: 8,
            color: '#fff', fontWeight: 'bold', fontSize: 13, zIndex: 30,
          }}>
            ⚠️ MOSQUITO POPULATION EXPLODING!
          </div>
        )}
      </div>

      {/* Popup */}
      {popup && (
        <div style={{
          ...styles.popup,
          borderColor: popup.hasWater ? '#4ade80' : '#f87171',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{popup.emoji}</span>
            <strong style={{ color: popup.hasWater ? '#4ade80' : '#f87171', fontSize: 14 }}>
              {popup.hasWater ? '✅ WATER SOURCE ELIMINATED' : '❌ NO WATER HERE — Time wasted!'}
            </strong>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6, lineHeight: 1.4 }}>
            {popup.fact}
          </div>
        </div>
      )}

      {/* Mosquito fact ticker */}
      <div style={{
        width: '100%', maxWidth: 800, marginTop: 8,
        background: 'rgba(30,41,59,0.9)', border: '1px solid #475569',
        borderRadius: 8, padding: '8px 16px', textAlign: 'center',
        color: '#fbbf24', fontSize: 13, fontWeight: 'bold',
        transition: 'opacity 0.3s ease',
      }}>
        {MOSQUITO_FACTS[currentFact]}
      </div>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  submitBtn: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 'bold',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  scene: {
    position: 'relative',
    width: '100%',
    maxWidth: 800,
    height: 500,
    background: 'linear-gradient(180deg, #1a2a3a 0%, #2a3a4a 50%, #1a2a1a 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid #334155',
  },
  popup: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1e293b',
    border: '2px solid',
    borderRadius: 12,
    padding: 16,
    maxWidth: 420,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    zIndex: 100,
    color: '#f1f5f9',
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
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
    fontSize: 11,
    marginTop: 4,
  },
}
