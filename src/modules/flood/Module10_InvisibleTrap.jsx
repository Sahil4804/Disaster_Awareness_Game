import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'

/* ================================================================
   Module 10 — Invisible Trap: Electrical Step Potential
   ================================================================
   12x8 top-down grid. A downed power line sits in conductive floodwater.
   Concentric voltage rings radiate outward. The player must cross from
   left to right. In Normal Stride mode (2-tile jumps), feet land in
   different voltage zones creating a lethal potential difference.
   Toggling to Shuffle mode (1-tile steps) keeps both feet in the same
   zone, allowing safe passage.
   ================================================================ */

const COLS = 12
const ROWS = 8
const TILE_PX = 52

// Downed power line occupies these tiles (col 6, rows 3-4)
const WIRE_TILES = [
  { r: 3, c: 6 },
  { r: 4, c: 6 },
]

// Voltage ring definitions (distance in Chebyshev / ring index)
// Ring 0 = wire itself, Ring 1..5 = concentric bands outward
const VOLTAGE_MAP = [1000, 600, 300, 100, 30, 0]
// Colors per ring
const RING_COLORS = [
  'rgba(255, 50, 50, 0.55)',   // Ring 0 — bright red (wire)
  'rgba(255, 140, 30, 0.40)',  // Ring 1 — orange
  'rgba(255, 230, 50, 0.35)',  // Ring 2 — yellow
  'rgba(255, 255, 160, 0.25)', // Ring 3 — light yellow
  'rgba(255, 255, 200, 0.12)', // Ring 4 — faint
]

// ── Helpers ──

/** Chebyshev distance from a tile to the nearest wire tile */
function wireDistance(r, c) {
  let min = Infinity
  for (const w of WIRE_TILES) {
    const d = Math.max(Math.abs(r - w.r), Math.abs(c - w.c))
    if (d < min) min = d
  }
  return min
}

/** Voltage at a given tile */
function voltageAt(r, c) {
  const d = wireDistance(r, c)
  if (d >= VOLTAGE_MAP.length) return 0
  return VOLTAGE_MAP[d]
}

/** Ring index for a tile (0 = wire, 1-4 = rings, 5+ = safe) */
function ringIndex(r, c) {
  return wireDistance(r, c)
}

/** Is the tile a wire tile? */
function isWire(r, c) {
  return WIRE_TILES.some(w => w.r === r && w.c === c)
}

// Player start (left edge, middle row) and goal (right edge)
const START = { r: 4, c: 0 }
const GOAL_COL = COLS - 1

// ── CSS keyframes injected once ──
const KEYFRAME_ID = '__m10_pulse_keyframes'
function ensureKeyframes() {
  if (document.getElementById(KEYFRAME_ID)) return
  const style = document.createElement('style')
  style.id = KEYFRAME_ID
  style.textContent = `
    @keyframes m10pulse {
      0%   { opacity: 0.3; }
      50%  { opacity: 0.6; }
      100% { opacity: 0.3; }
    }
    @keyframes m10flash {
      0%   { opacity: 1; }
      100% { opacity: 0; }
    }
  `
  document.head.appendChild(style)
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function Module10_StepPotential() {
  const { dispatch } = useGame()

  // Inject CSS keyframes on mount
  useEffect(() => { ensureKeyframes() }, [])

  // ── State ──
  const [phase, setPhase] = useState('intro') // intro | play | electrocuted | result
  const [playerPos, setPlayerPos] = useState(START)
  const [prevPos, setPrevPos] = useState(START)
  const [shuffleMode, setShuffleMode] = useState(false)
  const [strideLength, setStrideLength] = useState(2)
  const [moveHistory, setMoveHistory] = useState([START])
  const [damageTaken, setDamageTaken] = useState(0)  // count of "close calls"
  const [electrocuted, setElectrocuted] = useState(false)
  const [deathVolts, setDeathVolts] = useState(0)
  const [flashWhite, setFlashWhite] = useState(false)
  const [score, setScore] = useState(0)
  const [shuffledThroughDanger, setShuffledThroughDanger] = useState(false)
  const [everUsedShuffle, setEverUsedShuffle] = useState(false)

  // Live readouts
  const frontVoltage = voltageAt(playerPos.r, playerPos.c)
  const backVoltage = voltageAt(prevPos.r, prevPos.c)
  const potentialDifference = Math.abs(frontVoltage - backVoltage)
  const isSafe = potentialDifference < 100

  // Toggle shuffle
  const toggleShuffle = useCallback(() => {
    setShuffleMode(prev => {
      const next = !prev
      setStrideLength(next ? 1 : 2)
      if (next) setEverUsedShuffle(true)
      return next
    })
  }, [])

  // Precompute grid voltage data
  const gridData = useMemo(() => {
    const data = []
    for (let r = 0; r < ROWS; r++) {
      const row = []
      for (let c = 0; c < COLS; c++) {
        row.push({
          voltage: voltageAt(r, c),
          ring: ringIndex(r, c),
          wire: isWire(r, c),
        })
      }
      data.push(row)
    }
    return data
  }, [])

  // Movement — click on a tile in the valid column range
  const handleTileClick = useCallback((r, c) => {
    if (phase !== 'play' || electrocuted) return

    const stride = shuffleMode ? 1 : 2

    // Validate: must be in same row or adjacent row, and exactly `stride` columns to the right
    const dr = Math.abs(r - playerPos.r)
    const dc = c - playerPos.c
    if (dc !== stride) return  // must move exactly stride columns right
    if (dr > 1) return         // can go up/down 1 row or stay same row

    // Record old position as "back foot"
    const oldPos = { ...playerPos }
    const newPos = { r, c }

    setPrevPos(oldPos)
    setPlayerPos(newPos)
    setMoveHistory(prev => [...prev, newPos])

    // Calculate potential difference for this step
    // Front foot at new tile, back foot at old tile (stride tiles apart)
    const fV = voltageAt(r, c)
    const bV = voltageAt(oldPos.r, oldPos.c)
    const pd = Math.abs(fV - bV)

    if (pd >= 100) {
      // LETHAL — electrocution
      setElectrocuted(true)
      setDeathVolts(pd)
      setFlashWhite(true)
      setTimeout(() => setFlashWhite(false), 300)
      setTimeout(() => setPhase('electrocuted'), 600)
      return
    }

    // Track if player passes through a danger zone in shuffle mode
    if (shuffleMode && voltageAt(r, c) > 0) {
      setShuffledThroughDanger(true)
    }

    // Non-lethal but nonzero difference counts as "damage" / close call
    if (pd > 0 && pd < 100) {
      setDamageTaken(prev => prev + 1)
    }

    // Check win — reached right edge
    if (c >= GOAL_COL) {
      // Calculate score
      let finalScore = 0
      if (shuffledThroughDanger || (shuffleMode && voltageAt(r, c) > 0)) {
        finalScore = 100 // perfect: shuffled through safely
      } else if (damageTaken > 0) {
        finalScore = 50  // survived but took damage
      } else {
        // Walked around entirely (never entered voltage field) — decent but missed the lesson
        finalScore = everUsedShuffle ? 100 : 70
      }
      setScore(finalScore)
      setPhase('result')
    }
  }, [phase, electrocuted, shuffleMode, playerPos, damageTaken, shuffledThroughDanger, everUsedShuffle])

  // Valid target tiles (highlighted)
  const validTargets = useMemo(() => {
    if (phase !== 'play' || electrocuted) return new Set()
    const stride = shuffleMode ? 1 : 2
    const targets = new Set()
    for (let dr = -1; dr <= 1; dr++) {
      const nr = playerPos.r + dr
      const nc = playerPos.c + stride
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        targets.add(`${nr},${nc}`)
      }
    }
    return targets
  }, [phase, electrocuted, shuffleMode, playerPos])

  // Finish / record score
  const finishModule = useCallback((finalScore) => {
    const s = finalScore !== undefined ? finalScore : score
    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-10', result: { score: s, passed: s >= 50 } },
    })
    dispatch({ type: 'BACK_TO_MODULES' })
  }, [dispatch, score])

  // Reset game
  const resetGame = useCallback(() => {
    setPlayerPos(START)
    setPrevPos(START)
    setShuffleMode(false)
    setStrideLength(2)
    setMoveHistory([START])
    setDamageTaken(0)
    setElectrocuted(false)
    setDeathVolts(0)
    setFlashWhite(false)
    setScore(0)
    setShuffledThroughDanger(false)
    setEverUsedShuffle(false)
    setPhase('play')
  }, [])

  // ─────────────────────────────────────────────
  // RENDER: Intro Phase
  // ─────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 56, marginBottom: 4 }}>&#9889;</div>
          <h1 style={styles.title}>Module 10: Step Potential</h1>
          <h2 style={{ color: '#f97316', fontSize: 17, margin: '0 0 8px', fontWeight: 700, textAlign: 'center' }}>
            The Invisible Trap in Electrified Floodwater
          </h2>

          <div style={{ ...styles.infoBox, borderColor: '#ef4444', background: 'rgba(239,68,68,0.08)' }}>
            <p style={{ ...styles.text, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
              What is Step Potential?
            </p>
            <p style={styles.text}>
              When a high-voltage power line falls into conductive water, voltage
              radiates outward in concentric rings, decreasing with distance.
            </p>
            <p style={styles.text}>
              <strong>Step potential</strong> is the voltage difference between your two feet.
              If your stride spans two different voltage rings, current flows up one leg
              and down the other — potentially lethal!
            </p>
          </div>

          <div style={{ ...styles.infoBox, borderColor: '#38bdf8', background: 'rgba(56,189,248,0.08)' }}>
            <p style={{ ...styles.text, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>
              How to Survive
            </p>
            <p style={styles.text}>
              <strong>Normal stride</strong> (2 tiles) places your feet in DIFFERENT voltage zones
              = large potential difference = DEATH.
            </p>
            <p style={styles.text}>
              <strong>Shuffle step</strong> (1 tile) keeps both feet in the SAME voltage zone
              = tiny potential difference = SAFE passage.
            </p>
            <p style={{ ...styles.text, color: '#fbbf24', fontWeight: 600, marginTop: 6 }}>
              Toggle the SHUFFLE button before entering the voltage field!
            </p>
          </div>

          <div style={{ ...styles.infoBox, borderColor: '#475569', background: 'rgba(255,255,255,0.03)' }}>
            <p style={styles.text}>
              Cross the 12x8 grid from left to right. A downed power line sits near
              the center. Concentric colored rings show the voltage gradient. You must
              pass through it — switch to shuffle mode to survive!
            </p>
          </div>

          <button style={styles.btnPrimary} onClick={() => setPhase('play')}>
            Begin Simulation
          </button>
          <button style={styles.btnBack} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Electrocuted Phase
  // ─────────────────────────────────────────────
  if (phase === 'electrocuted') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 56 }}>&#x1F480;</div>
          <h1 style={{ ...styles.title, color: '#ef4444' }}>ELECTROCUTION</h1>
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444',
            borderRadius: 14, padding: '18px 22px', width: '100%', textAlign: 'center',
          }}>
            <p style={{ color: '#fca5a5', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {deathVolts}V potential difference between feet
            </p>
            <p style={{ color: '#f1f5f9', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              Your {shuffleMode ? '1-tile shuffle' : '2-tile normal stride'} placed your front foot
              at {frontVoltage}V and back foot at {backVoltage}V. The {deathVolts}V difference
              drove lethal current up one leg and down the other.
            </p>
          </div>

          <div style={{ ...styles.infoBox, borderColor: '#f97316', background: 'rgba(249,115,22,0.08)' }}>
            <p style={{ ...styles.text, color: '#f97316', fontWeight: 700 }}>
              What went wrong?
            </p>
            <p style={styles.text}>
              {!shuffleMode
                ? 'You were in NORMAL STRIDE mode (2-tile steps). Your feet spanned different voltage rings, creating a lethal circuit through your body. You needed to SHUFFLE (1-tile steps) to keep both feet in the same voltage zone.'
                : 'Even in shuffle mode, you stepped across a steep voltage gradient. You needed to approach the wire more carefully — the voltage drops are steepest closest to the source.'}
            </p>
          </div>

          {/* Mini grid showing where death occurred */}
          <div style={{ marginTop: 4 }}>
            {renderMiniGrid()}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={styles.btnPrimary} onClick={resetGame}>
              Try Again
            </button>
            <button style={styles.btnBack} onClick={() => finishModule(0)}>
              Finish (0 pts)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Result Phase (survived)
  // ─────────────────────────────────────────────
  if (phase === 'result') {
    const scoreColor = score >= 100 ? '#22c55e' : score >= 50 ? '#fbbf24' : '#ef4444'
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 56 }}>{score >= 100 ? '\u2705' : '\u26A0\uFE0F'}</div>
          <h1 style={styles.title}>
            {score >= 100 ? 'Perfect! You Shuffled to Safety!' : 'You Survived!'}
          </h1>

          <div style={{
            border: `2px solid ${scoreColor}`, borderRadius: 16,
            padding: '16px 36px', display: 'flex', alignItems: 'baseline', gap: 10,
          }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: scoreColor }}>{score}</span>
            <span style={{ color: '#f1f5f9', fontSize: 16 }}>/ 100</span>
          </div>

          <p style={{ ...styles.text, textAlign: 'center' }}>
            Crossed in {moveHistory.length - 1} moves.
            {score >= 100
              ? ' You correctly used shuffle mode through the voltage gradient.'
              : damageTaken > 0
                ? ` You took ${damageTaken} close call(s) with nonzero potential difference.`
                : ' You avoided the voltage field entirely.'}
          </p>

          <div style={{ marginTop: 4 }}>
            {renderMiniGrid()}
          </div>

          <div style={{ ...styles.infoBox, borderColor: '#fbbf24', background: 'rgba(251,191,36,0.06)' }}>
            <p style={styles.text}>
              <strong>Key lesson:</strong> Near a downed power line in water, NEVER take normal
              strides. Shuffle with tiny steps (or better, don't enter the water at all).
              The voltage gradient means even a small stride can bridge a lethal potential
              difference. Always assume downed lines are energized.
            </p>
          </div>

          <button style={styles.btnPrimary} onClick={() => finishModule()}>
            Complete Module
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Mini grid (for result / death screens)
  // ─────────────────────────────────────────────
  function renderMiniGrid() {
    const sz = 28
    return (
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${COLS}, ${sz}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${sz}px)`,
        gap: 1, borderRadius: 8, padding: 3,
        background: '#0f172a', border: '1px solid #334155',
      }}>
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const r = Math.floor(idx / COLS)
          const c = idx % COLS
          const td = gridData[r][c]
          const inPath = moveHistory.some(p => p.r === r && p.c === c)
          const isPlayerHere = playerPos.r === r && playerPos.c === c

          let bg = '#1a2744'
          if (td.wire) bg = 'rgba(255,50,50,0.7)'
          else if (td.ring <= 4) bg = RING_COLORS[td.ring] || '#1a2744'
          if (inPath) bg = 'rgba(56,189,248,0.35)'
          if (isPlayerHere) bg = electrocuted ? 'rgba(255,50,50,0.8)' : 'rgba(56,189,248,0.6)'

          return (
            <div key={idx} style={{
              width: sz, height: sz, borderRadius: 3, background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, border: '1px solid rgba(51,65,85,0.3)',
            }}>
              {td.wire && !isPlayerHere ? '\u26A1' : ''}
              {isPlayerHere ? (electrocuted ? '\u2620\uFE0F' : '\u{1F9CD}') : ''}
              {c === 0 && r === START.r && !isPlayerHere ? '\u25B6' : ''}
              {c === GOAL_COL && !isPlayerHere && !td.wire ? '\u{1F3C1}' : ''}
            </div>
          )
        })}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER: Play Phase (main grid + HUD)
  // ─────────────────────────────────────────────
  const dangerLevel = potentialDifference >= 100 ? 'LETHAL' : potentialDifference > 0 ? 'DANGER' : 'SAFE'
  const dangerColor = potentialDifference >= 100 ? '#ef4444' : potentialDifference > 0 ? '#f97316' : '#22c55e'

  return (
    <div style={styles.container}>
      {/* White flash overlay for electrocution */}
      {flashWhite && (
        <div style={{
          position: 'fixed', inset: 0, background: '#fff', zIndex: 9999,
          animation: 'm10flash 0.3s ease-out forwards', pointerEvents: 'none',
        }} />
      )}

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: COLS * (TILE_PX + 2) + 12, marginBottom: 8,
      }}>
        <button style={{
          background: 'rgba(255,255,255,0.07)', border: '1px solid #475569',
          color: '#f1f5f9', borderRadius: 8, padding: '6px 14px',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
          &#8592; Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          Module 10 -- Step Potential
        </span>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Moves: {moveHistory.length - 1}
        </span>
      </div>

      {/* ── Shuffle Toggle Button ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8,
        width: '100%', maxWidth: COLS * (TILE_PX + 2) + 12,
      }}>
        <button
          onClick={toggleShuffle}
          style={{
            background: shuffleMode
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 22px', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', transition: 'background 0.2s',
            boxShadow: shuffleMode ? '0 0 16px rgba(34,197,94,0.4)' : '0 0 12px rgba(239,68,68,0.3)',
            minWidth: 180, textAlign: 'center',
          }}
        >
          {shuffleMode ? 'SHUFFLE MODE (1 tile)' : 'NORMAL STRIDE (2 tiles)'}
        </button>
        <div style={{ flex: 1, color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>
          {shuffleMode
            ? 'Both feet stay in the same voltage zone. Safe near wires.'
            : 'Feet land 2 tiles apart. LETHAL near voltage gradients!'}
        </div>
      </div>

      {/* ── Live Readout Panel ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
        width: '100%', maxWidth: COLS * (TILE_PX + 2) + 12,
        marginBottom: 10, background: '#1e293b', borderRadius: 12,
        padding: '10px 12px', border: `1px solid ${dangerColor}44`,
      }}>
        <ReadoutCell label="Stride" value={`${strideLength} tile${strideLength > 1 ? 's' : ''}`} color="#38bdf8" />
        <ReadoutCell label="Front Foot" value={`${frontVoltage}V`} color={frontVoltage > 100 ? '#ef4444' : frontVoltage > 0 ? '#fbbf24' : '#22c55e'} />
        <ReadoutCell label="Back Foot" value={`${backVoltage}V`} color={backVoltage > 100 ? '#ef4444' : backVoltage > 0 ? '#fbbf24' : '#22c55e'} />
        <ReadoutCell label="Difference" value={`${potentialDifference}V`} color={dangerColor} />
        <ReadoutCell label="Status" value={dangerLevel} color={dangerColor} bold />
      </div>

      {/* ── Grid ── */}
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${COLS}, ${TILE_PX}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${TILE_PX}px)`,
        gap: 2, borderRadius: 10, padding: 5,
        background: '#0b1222', border: '2px solid #1e293b',
        position: 'relative',
      }}>
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const r = Math.floor(idx / COLS)
          const c = idx % COLS
          const td = gridData[r][c]
          const isPlayerHere = playerPos.r === r && playerPos.c === c
          const isStartTile = r === START.r && c === 0
          const isGoalTile = c === GOAL_COL
          const inPath = moveHistory.some(p => p.r === r && p.c === c)
          const isValid = validTargets.has(`${r},${c}`)

          // Base tile color: dark water
          let bg = '#162032'
          let borderCol = 'rgba(30,41,59,0.5)'

          // Show voltage rings with pulsing animation
          if (td.wire) {
            bg = 'rgba(255, 40, 40, 0.5)'
            borderCol = 'rgba(255,80,80,0.6)'
          } else if (td.ring <= 4) {
            bg = RING_COLORS[td.ring]
          }

          // Start / goal highlights
          if (isStartTile && !isPlayerHere) {
            bg = 'rgba(34,197,94,0.25)'
            borderCol = 'rgba(34,197,94,0.5)'
          }
          if (isGoalTile && !td.wire) {
            bg = isPlayerHere ? bg : 'rgba(56,189,248,0.18)'
            if (!isPlayerHere) borderCol = 'rgba(56,189,248,0.4)'
          }

          // Path trail
          if (inPath && !isPlayerHere) {
            bg = 'rgba(96,165,250,0.2)'
          }

          // Player
          if (isPlayerHere) {
            bg = 'rgba(56,189,248,0.5)'
            borderCol = '#38bdf8'
          }

          // Valid target highlight
          if (isValid) {
            borderCol = 'rgba(250,204,21,0.7)'
          }

          // Pulse animation for voltage rings
          const shouldPulse = td.ring >= 1 && td.ring <= 4 && !isPlayerHere && !inPath

          return (
            <div
              key={idx}
              onClick={() => handleTileClick(r, c)}
              style={{
                width: TILE_PX, height: TILE_PX, borderRadius: 4,
                background: bg,
                border: isValid ? `2px solid rgba(250,204,21,0.7)` : isPlayerHere ? '2px solid #38bdf8' : `1px solid ${borderCol}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isValid ? 'pointer' : 'default',
                fontSize: 20, position: 'relative',
                transition: 'border-color 0.2s',
                animation: shouldPulse ? 'm10pulse 2s ease-in-out infinite' : 'none',
                animationDelay: shouldPulse ? `${(r * COLS + c) % 7 * 0.15}s` : undefined,
                boxShadow: isPlayerHere
                  ? '0 0 14px rgba(56,189,248,0.5)'
                  : isValid
                    ? '0 0 8px rgba(250,204,21,0.3)'
                    : 'none',
              }}
            >
              {/* Wire icon */}
              {td.wire && !isPlayerHere && (
                <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 4px #ff4444)' }}>&#9889;</span>
              )}
              {/* Player icon */}
              {isPlayerHere && (
                <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 6px #38bdf8)', zIndex: 2 }}>
                  &#x1F9CD;
                </span>
              )}
              {/* Start marker */}
              {isStartTile && !isPlayerHere && (
                <span style={{ fontSize: 14, color: '#22c55e', fontWeight: 800 }}>S</span>
              )}
              {/* Goal marker */}
              {isGoalTile && !isPlayerHere && !td.wire && (
                <span style={{ fontSize: 14 }}>&#x1F3C1;</span>
              )}
              {/* Path dot */}
              {inPath && !isPlayerHere && !isStartTile && !(isGoalTile && !td.wire) && !td.wire && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#60a5fa', opacity: 0.5,
                }} />
              )}
              {/* Voltage label on ring tiles (subtle) */}
              {!isPlayerHere && !td.wire && td.ring <= 4 && !inPath && !isStartTile && !(isGoalTile && !td.wire) && (
                <span style={{
                  position: 'absolute', bottom: 2, right: 3,
                  fontSize: 8, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                }}>
                  {td.voltage}V
                </span>
              )}
              {/* Valid target indicator */}
              {isValid && !isPlayerHere && !td.wire && !inPath && !(isGoalTile) && !isStartTile && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 3,
                  background: 'rgba(250,204,21,0.08)', pointerEvents: 'none',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div style={{
        display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center',
        background: '#1e293b', padding: '8px 14px', borderRadius: 10,
        maxWidth: COLS * (TILE_PX + 2) + 12, width: '100%',
      }}>
        <LegendDot color="rgba(255,50,50,0.55)" label="1000V (wire)" />
        <LegendDot color="rgba(255,140,30,0.5)" label="600V" />
        <LegendDot color="rgba(255,230,50,0.45)" label="300V" />
        <LegendDot color="rgba(255,255,160,0.4)" label="100V" />
        <LegendDot color="rgba(255,255,200,0.2)" label="30V" />
        <span style={{ color: '#64748b', fontSize: 11 }}>|</span>
        <LegendDot color="rgba(56,189,248,0.5)" label="Player" />
        <LegendDot color="rgba(250,204,21,0.5)" label="Valid move" />
      </div>

      {/* ── Hint text ── */}
      <div style={{
        marginTop: 8, color: '#64748b', fontSize: 12, textAlign: 'center',
        maxWidth: COLS * (TILE_PX + 2) + 12,
      }}>
        Click a highlighted tile to move {shuffleMode ? '1 tile' : '2 tiles'} to the right.
        You can shift up or down 1 row per step. Toggle SHUFFLE before entering the voltage field!
      </div>

      {/* Professor's hook warning */}
      {!shuffleMode && frontVoltage === 0 && (
        (() => {
          // Check if any valid target is in a voltage zone
          const stride = 2
          let dangerAhead = false
          for (let dr = -1; dr <= 1; dr++) {
            const nr = playerPos.r + dr
            const nc = playerPos.c + stride
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              if (voltageAt(nr, nc) > 0) dangerAhead = true
            }
          }
          if (!dangerAhead) {
            // Check 2 steps ahead
            for (let dr = -1; dr <= 1; dr++) {
              const nr = playerPos.r + dr
              const nc = playerPos.c + stride * 2
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                if (voltageAt(nr, nc) > 0) dangerAhead = true
              }
            }
          }
          if (dangerAhead) {
            return (
              <div style={{
                marginTop: 8, padding: '10px 16px', borderRadius: 10,
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.4)',
                color: '#fb923c', fontSize: 13, fontWeight: 600, textAlign: 'center',
                maxWidth: COLS * (TILE_PX + 2) + 12, width: '100%',
              }}>
                WARNING: Voltage field ahead! Switch to SHUFFLE MODE before entering
                or the 2-tile stride will create a lethal potential difference.
              </div>
            )
          }
          return null
        })()
      )}
    </div>
  )
}

// ── Small sub-components ──

function ReadoutCell({ label, value, color, bold }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{
        fontSize: 15, color: color || '#f1f5f9',
        fontWeight: bold ? 800 : 700, fontFamily: 'monospace',
      }}>
        {value}
      </div>
    </div>
  )
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 10, height: 10, borderRadius: 3, background: color,
        border: '1px solid rgba(255,255,255,0.1)',
      }} />
      <span style={{ color: '#94a3b8', fontSize: 11 }}>{label}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: 'relative',
  },
  card: {
    background: '#1e293b',
    borderRadius: 20,
    padding: '28px 24px',
    maxWidth: 580,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    margin: 0,
    fontSize: 26,
    textAlign: 'center',
  },
  text: {
    color: '#cbd5e1',
    margin: '4px 0',
    fontSize: 14,
    lineHeight: 1.6,
  },
  infoBox: {
    border: '1px solid',
    borderRadius: 12,
    padding: '14px 16px',
    width: '100%',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 32px',
    fontSize: 17,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
    transition: 'transform 0.15s',
  },
  btnBack: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: 10,
    padding: '10px 24px',
    fontSize: 14,
    cursor: 'pointer',
  },
}
