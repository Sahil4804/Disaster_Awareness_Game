import { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

const TOTAL_LEVELS = 15
const WATER_RISE_INTERVAL = 3200  // ms per level — slower so players can read & react
const CLIMB_SPEED_LOADED = 1      // levels per click with bag
const CLIMB_SPEED_LIGHT = 2       // levels per click without bag
const DROP_BAG_APPEAR_DELAY = 3000 // ms before drop bag button appears

const PLATFORMS = Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
  level: i + 1,
  leftOffset: 10 + ((i % 3) * 25) + (i % 2 === 0 ? 5 : 15),
  width: 80 + (i % 3) * 20,
  emoji: i === TOTAL_LEVELS - 1 ? '🏔️' : ['🪨', '🌿', '🪵', '🧱', '⛰️', '🏗️', '🌲', '🪜', '🧗', '🏔️'][i % 10],
}))

const DECISION_POINTS = {
  5: {
    prompt: "Two paths ahead! \u{1FAA8} Rocky ledge (fast but might crumble) or \u{1F33F} Muddy slope (slower but stable)",
    options: [
      { label: '\u{1FAA8} Rocky Ledge (fast, risky)', risky: true, slipBackLevels: 2, slipChance: 0.5 },
      { label: '\u{1F33F} Muddy Slope (slow, safe)', risky: false },
    ],
  },
  10: {
    prompt: "Fallen tree! \u{1F332} Climb over (fast) or \u{1F504} Go around (slow)",
    options: [
      { label: '\u{1F332} Climb Over (fast)', risky: false },
      { label: '\u{1F504} Go Around (slow)', risky: false },
    ],
  },
}

const EDUCATIONAL_MESSAGES = {
  3: "\u{1F4A1} Flash floods move at 9+ mph. You cannot outrun one.",
  7: "\u{1F4A1} Most flash flood deaths happen in vehicles or to pedestrians. ALWAYS head for high ground.",
  12: "\u{1F4A1} A flash flood can roll boulders, tear out trees, and destroy bridges in seconds.",
}

export default function Module12_WallOfWater() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [playerLevel, setPlayerLevel] = useState(0) // 0 = bottom
  const [waterLevel, setWaterLevel] = useState(0)
  const [hasBag, setHasBag] = useState(true)
  const [showDropBtn, setShowDropBtn] = useState(false)
  const [result, setResult] = useState(null)
  const [shakeFrame, setShakeFrame] = useState(0)
  const [message, setMessage] = useState('')
  const [educationalMsg, setEducationalMsg] = useState('')
  const [decisionPrompt, setDecisionPrompt] = useState(null)
  const [graceOver, setGraceOver] = useState(false)
  const gameActiveRef = useRef(false)
  const decisionPromptRef = useRef(null)

  // Start game
  const startGame = useCallback(() => {
    setPhase('play')
    setPlayerLevel(0)
    setWaterLevel(0)
    setHasBag(true)
    setShowDropBtn(false)
    setResult(null)
    setMessage('')
    setEducationalMsg('')
    setDecisionPrompt(null)
    setGraceOver(false)
    decisionPromptRef.current = null
    gameActiveRef.current = true
  }, [])

  // Keep decisionPromptRef in sync with state
  useEffect(() => {
    decisionPromptRef.current = decisionPrompt
  }, [decisionPrompt])

  // Grace period: 4 seconds before water starts rising (give player time to orient)
  useEffect(() => {
    if (phase !== 'play') return
    const id = setTimeout(() => setGraceOver(true), 4000)
    return () => clearTimeout(id)
  }, [phase])

  // Water rising (paused during grace period and decision points)
  useEffect(() => {
    if (phase !== 'play' || !graceOver) return
    const id = setInterval(() => {
      if (decisionPromptRef.current) return // pause water during decisions
      setWaterLevel(prev => {
        const next = prev + 1
        return next
      })
    }, WATER_RISE_INTERVAL)
    return () => clearInterval(id)
  }, [phase, graceOver])

  // Show drop bag button after delay
  useEffect(() => {
    if (phase !== 'play') return
    const id = setTimeout(() => setShowDropBtn(true), DROP_BAG_APPEAR_DELAY)
    return () => clearTimeout(id)
  }, [phase])

  // Shake animation for urgency
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => setShakeFrame(f => f + 1), 150)
    return () => clearInterval(id)
  }, [phase])

  // Check win/lose conditions
  useEffect(() => {
    if (phase !== 'play') return
    if (playerLevel >= TOTAL_LEVELS) {
      // WIN
      gameActiveRef.current = false
      const score = hasBag ? 60 : 100
      const r = { score, passed: true }
      setResult(r)
      setPhase('result')
      dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-12', result: r } })
    } else if (waterLevel >= playerLevel + 4 && waterLevel > 4) {
      // CAUGHT BY WATER
      gameActiveRef.current = false
      const r = { score: 10, passed: false }
      setResult(r)
      setPhase('result')
      dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-12', result: r } })
    }
  }, [playerLevel, waterLevel, phase, hasBag, dispatch])

  // Speed message
  useEffect(() => {
    if (phase !== 'play') return
    if (hasBag) {
      setMessage('⚠️ OVERLOADED — TOO SLOW! Your Go-Bag is dragging you down!')
    } else {
      setMessage('💨 LIGHTWEIGHT — Moving fast! Good call dropping the bag!')
    }
  }, [hasBag, phase])

  const climbTo = useCallback((level) => {
    if (phase !== 'play' || !gameActiveRef.current || decisionPrompt) return
    const maxReach = playerLevel + (hasBag ? CLIMB_SPEED_LOADED : CLIMB_SPEED_LIGHT)
    if (level > maxReach || level <= playerLevel) return
    setPlayerLevel(level)

    // Show educational message if applicable
    if (EDUCATIONAL_MESSAGES[level]) {
      setEducationalMsg(EDUCATIONAL_MESSAGES[level])
      setTimeout(() => setEducationalMsg(''), 3500)
    }

    // Trigger decision point if applicable
    if (DECISION_POINTS[level]) {
      setDecisionPrompt(DECISION_POINTS[level])
    }
  }, [phase, playerLevel, hasBag, decisionPrompt])

  const handleDecision = useCallback((option) => {
    if (option.risky && option.slipChance && Math.random() < option.slipChance) {
      const newLevel = Math.max(0, playerLevel - (option.slipBackLevels || 2))
      setPlayerLevel(newLevel)
      setMessage('\u{1FAA8} The rocky ledge crumbled! You slipped back!')
      setTimeout(() => setMessage(hasBag ? '\u26A0\uFE0F OVERLOADED \u2014 TOO SLOW! Your Go-Bag is dragging you down!' : '\u{1F4A8} LIGHTWEIGHT \u2014 Moving fast! Good call dropping the bag!'), 2000)
    }
    setDecisionPrompt(null)
  }, [playerLevel, hasBag])

  const dropBag = useCallback(() => {
    setHasBag(false)
  }, [])

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>🌊⛰️</div>
          <h1 style={styles.title}>Module 12: Wall of Water</h1>
          <p style={styles.text}>
            A flash flood sends a WALL OF WATER roaring toward you. Your only chance: climb to high ground.
          </p>
          <p style={{ ...styles.text, color: '#fbbf24', fontWeight: 'bold' }}>
            PROBLEM: Your heavy Go-Bag is slowing you down. You can only reach 1 platform at a time.
          </p>
          <p style={{ ...styles.text, color: '#38bdf8' }}>
            Click platforms above you to climb. The water is rising fast. You may need to make a hard choice...
          </p>
          <p style={{ ...styles.text, color: '#f87171', fontWeight: 'bold' }}>
            KEY LESSON: When a wall of water approaches, abandon ALL material goods. Your life is the priority.
          </p>
          <button style={styles.startBtn} onClick={startGame}>
            ⛰️ Start Climbing
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
          <div style={{ fontSize: 64 }}>{result.passed ? '🏔️✅' : '🌊💀'}</div>
          <h1 style={{ ...styles.title, color: result.passed ? '#4ade80' : '#f87171' }}>
            {result.passed ? 'YOU REACHED HIGH GROUND!' : 'SWEPT AWAY'}
          </h1>
          <div style={{ fontSize: 48, color: '#38bdf8', margin: '12px 0' }}>{result.score}%</div>
          {result.passed ? (
            <p style={styles.text}>
              {!hasBag
                ? '✅ You made the right call dropping your bag. Material possessions can be replaced — your life cannot.'
                : '⚠️ You survived but kept your bag. In real life, that extra weight could be fatal. Always prioritize speed over stuff.'}
            </p>
          ) : (
            <p style={{ ...styles.text, color: '#f87171' }}>
              The water caught you. You were too slow because of your heavy bag.
              In a real flash flood, you have SECONDS to act. Drop everything and RUN for high ground.
            </p>
          )}
          <div style={{ ...styles.text, background: '#1e293b', padding: 16, borderRadius: 8, marginTop: 12 }}>
            <strong style={{ color: '#fbbf24' }}>FLASH FLOOD FACTS:</strong>
            <ul style={{ textAlign: 'left', color: '#cbd5e1', lineHeight: 1.8 }}>
              <li>Flash floods can produce walls of water 10-20 feet high</li>
              <li>They move at speeds up to 9 mph — faster than most people can run</li>
              <li>6 inches of moving water can knock you down</li>
              <li>NEVER go back for possessions during a flash flood</li>
              <li>Move to high ground IMMEDIATELY — seconds matter</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            <button style={styles.startBtn} onClick={startGame}>🔄 Retry</button>
            <button style={{ ...styles.startBtn, background: '#6366f1' }} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              📋 Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  const waterHeight = (waterLevel / TOTAL_LEVELS) * 100
  const shakeX = phase === 'play' && waterLevel > 3 ? Math.sin(shakeFrame) * 2 : 0

  return (
    <div style={{ ...styles.container, transform: `translateX(${shakeX}px)` }}>
      {/* HUD */}
      <div style={styles.hud}>
        <div style={{ color: hasBag ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: 16 }}>
          {hasBag ? '🎒 CARRYING BAG — SPEED: SLOW' : '💨 BAG DROPPED — SPEED: FAST'}
        </div>
        <div style={{ color: '#38bdf8', fontSize: 16 }}>
          Level: {playerLevel}/{TOTAL_LEVELS}
        </div>
      </div>

      {/* Speed indicator */}
      <div style={{
        background: hasBag ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)',
        border: `2px solid ${hasBag ? '#f87171' : '#4ade80'}`,
        borderRadius: 8, padding: '6px 16px', margin: '4px 0',
        color: hasBag ? '#f87171' : '#4ade80', fontWeight: 'bold', fontSize: 14,
        textAlign: 'center',
      }}>
        {message}
      </div>

      {/* Educational message */}
      {educationalMsg && (
        <div style={{
          background: 'rgba(56,189,248,0.15)',
          border: '2px solid #38bdf8',
          borderRadius: 8, padding: '8px 16px', margin: '4px 0',
          color: '#38bdf8', fontWeight: 'bold', fontSize: 13,
          textAlign: 'center', maxWidth: 700, width: '100%',
        }}>
          {educationalMsg}
        </div>
      )}

      {/* Decision prompt overlay */}
      {decisionPrompt && (
        <div style={{
          background: 'rgba(15,23,42,0.95)',
          border: '3px solid #fbbf24',
          borderRadius: 12, padding: 20, margin: '8px 0',
          maxWidth: 500, width: '100%', textAlign: 'center',
          boxShadow: '0 0 24px rgba(251,191,36,0.4)',
        }}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
            {'\u26A0\uFE0F'} {decisionPrompt.prompt}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {decisionPrompt.options.map((opt, i) => (
              <button key={i} onClick={() => handleDecision(opt)} style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 'bold',
                background: opt.risky ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop Bag Button */}
      {hasBag && showDropBtn && (
        <button onClick={dropBag} style={styles.dropBagBtn}>
          🎒 DROP BAG — Save yourself!
        </button>
      )}

      {/* Cliff Scene */}
      <div style={styles.cliffScene}>
        {/* Water rising */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${Math.min(waterHeight, 100)}%`,
          background: 'linear-gradient(0deg, #1e40af, #3b82f6, rgba(59,130,246,0.6))',
          transition: 'height 0.5s ease',
          zIndex: 2,
          borderTop: '3px solid #60a5fa',
        }}>
          <div style={{
            position: 'absolute', top: -2, left: 0, right: 0, height: 8,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'none',
          }} />
          <div style={{ position: 'absolute', top: 8, left: '20%', fontSize: 24, opacity: 0.6 }}>🌊</div>
          <div style={{ position: 'absolute', top: 8, left: '60%', fontSize: 24, opacity: 0.6 }}>🌊</div>
        </div>

        {/* Platforms */}
        {PLATFORMS.map(p => {
          const bottom = (p.level / TOTAL_LEVELS) * 85 + 5
          const isReachable = p.level > playerLevel && p.level <= playerLevel + (hasBag ? CLIMB_SPEED_LOADED : CLIMB_SPEED_LIGHT)
          const isPlayer = p.level === playerLevel
          const isAboveWater = p.level > waterLevel
          return (
            <div
              key={p.level}
              onClick={() => climbTo(p.level)}
              style={{
                position: 'absolute',
                bottom: `${bottom}%`,
                left: `${p.leftOffset}%`,
                width: p.width,
                height: 36,
                background: isReachable
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : isPlayer
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : 'linear-gradient(135deg, #64748b, #475569)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isReachable ? 'pointer' : 'default',
                zIndex: 5,
                border: isReachable ? '2px solid #4ade80' : '1px solid #334155',
                boxShadow: isReachable ? '0 0 12px rgba(74,222,128,0.5)' : 'none',
                opacity: isAboveWater ? 1 : 0.3,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              {isReachable && <span style={{ fontSize: 11, color: '#fff', marginLeft: 4, fontWeight: 'bold' }}>CLIMB</span>}
            </div>
          )
        })}

        {/* Player */}
        <div style={{
          position: 'absolute',
          bottom: `${(playerLevel / TOTAL_LEVELS) * 85 + 8}%`,
          left: `${playerLevel === 0 ? 45 : PLATFORMS[playerLevel - 1].leftOffset + 2}%`,
          fontSize: 36,
          zIndex: 10,
          transition: 'all 0.3s ease',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))',
        }}>
          🧑
          {hasBag && <span style={{ fontSize: 20, position: 'absolute', top: -4, right: -16 }}>🎒</span>}
        </div>

        {/* Top label */}
        <div style={{
          position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          color: '#4ade80', fontWeight: 'bold', fontSize: 14, zIndex: 10,
          background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 8,
        }}>
          🏔️ HIGH GROUND — SAFETY
        </div>
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
    transition: 'transform 0.1s',
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
    maxWidth: 700,
    padding: '8px 16px',
    background: '#1e293b',
    borderRadius: 10,
    marginBottom: 8,
  },
  dropBagBtn: {
    padding: '12px 28px',
    fontSize: 18,
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    border: '3px solid #fbbf24',
    borderRadius: 12,
    cursor: 'pointer',
    animation: 'none',
    boxShadow: '0 0 20px rgba(239,68,68,0.6)',
    margin: '6px 0',
  },
  cliffScene: {
    position: 'relative',
    width: '100%',
    maxWidth: 700,
    height: 520,
    background: 'linear-gradient(180deg, #1e293b 0%, #334155 60%, #475569 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid #334155',
  },
}
