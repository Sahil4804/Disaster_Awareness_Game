import { useState, useCallback, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

const GRID_SIZE = 10
const TILE_TYPES = {
  SAFE: 'safe',
  MANHOLE: 'manhole',
  CURRENT: 'current',
  DEEP: 'deep',
  DEBRIS: 'debris',
  START: 'start',
  EXIT: 'exit',
}

const CURRENT_DIRS = ['up', 'down', 'left', 'right']

function generateGrid() {
  const grid = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      type: TILE_TYPES.SAFE,
      probed: false,
      currentDir: null,
    }))
  )
  // Start (bottom-left) and Exit (top-right)
  grid[GRID_SIZE - 1][0] = { type: TILE_TYPES.START, probed: true, currentDir: null }
  grid[0][GRID_SIZE - 1] = { type: TILE_TYPES.EXIT, probed: true, currentDir: null }

  // Place dangers — avoid start, exit, and a larger area around them since the grid is bigger
  const protected_ = new Set([
    `${GRID_SIZE - 1},0`, `${0},${GRID_SIZE - 1}`,
    `${GRID_SIZE - 2},0`, `${GRID_SIZE - 1},1`,
    `${GRID_SIZE - 2},1`, `${GRID_SIZE - 3},0`,
    `${GRID_SIZE - 1},2`,
    `${1},${GRID_SIZE - 1}`, `${0},${GRID_SIZE - 2}`,
    `${1},${GRID_SIZE - 2}`, `${0},${GRID_SIZE - 3}`,
    `${2},${GRID_SIZE - 1}`,
  ])

  const dangerCandidates = []
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!protected_.has(`${r},${c}`)) dangerCandidates.push([r, c])
    }
  }

  // Shuffle candidates
  for (let i = dangerCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[dangerCandidates[i], dangerCandidates[j]] = [dangerCandidates[j], dangerCandidates[i]]
  }

  // Place 6 manholes, 5 currents, 4 deep water, 3 debris
  const dangers = [
    ...Array(6).fill(TILE_TYPES.MANHOLE),
    ...Array(5).fill(TILE_TYPES.CURRENT),
    ...Array(4).fill(TILE_TYPES.DEEP),
    ...Array(3).fill(TILE_TYPES.DEBRIS),
  ]

  dangers.forEach((type, i) => {
    if (i < dangerCandidates.length) {
      const [r, c] = dangerCandidates[i]
      grid[r][c].type = type
      if (type === TILE_TYPES.CURRENT) {
        grid[r][c].currentDir = CURRENT_DIRS[Math.floor(Math.random() * CURRENT_DIRS.length)]
      }
    }
  })

  return grid
}

const ARROW_MAP = { up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192' }

export default function TreacherousTrek() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | play | result
  const [grid, setGrid] = useState(() => generateGrid())
  const [playerPos, setPlayerPos] = useState({ r: GRID_SIZE - 1, c: 0 })
  const [probeMode, setProbeMode] = useState(false)
  const [probeCount, setProbeCount] = useState(0)
  const [blindSteps, setBlindSteps] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [resultData, setResultData] = useState(null)
  const [message, setMessage] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [injuries, setInjuries] = useState(0)

  const restart = useCallback(() => {
    const newGrid = generateGrid()
    setGrid(newGrid)
    setPlayerPos({ r: GRID_SIZE - 1, c: 0 })
    setProbeMode(false)
    setProbeCount(0)
    setBlindSteps(0)
    setTotalSteps(0)
    setMessage('')
    setInjuries(0)
    setAttempts(a => a + 1)
    setPhase('play')
  }, [])

  const isAdjacent = useCallback((r, c) => {
    const dr = Math.abs(r - playerPos.r)
    const dc = Math.abs(c - playerPos.c)
    return (dr + dc === 1)
  }, [playerPos])

  const finishGame = useCallback((won) => {
    const safetyRatio = totalSteps > 0 ? (totalSteps - blindSteps) / Math.max(totalSteps, 1) : 1
    let score = 0
    if (won) {
      score = Math.round(40 + safetyRatio * 50 + Math.max(0, 10 - attempts * 3) - injuries * 5)
      score = Math.min(100, Math.max(0, score))
    } else {
      score = Math.round(Math.max(0, probeCount * 3 - blindSteps * 5))
    }
    const passed = won
    setResultData({ score, passed, won, safetyRatio, probeCount, blindSteps, totalSteps, injuries })
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-5', result: { score, passed } } })
    setPhase('result')
  }, [totalSteps, blindSteps, probeCount, attempts, injuries, dispatch])

  const handleTileClick = useCallback((r, c) => {
    if (phase !== 'play') return
    if (!isAdjacent(r, c)) return

    const tile = grid[r][c]

    if (probeMode) {
      // Probe the tile
      setGrid(prev => {
        const ng = prev.map(row => row.map(t => ({ ...t })))
        ng[r][c].probed = true
        return ng
      })
      setProbeCount(p => p + 1)
      setProbeMode(false)
      setMessage(
        tile.type === TILE_TYPES.SAFE || tile.type === TILE_TYPES.EXIT
          ? '✅ Tile is safe to step on!'
          : tile.type === TILE_TYPES.MANHOLE
            ? '🕳️ DANGER! Missing manhole cover — instant death below!'
            : tile.type === TILE_TYPES.CURRENT
              ? `🌊 Strong current flowing ${tile.currentDir}! You'd be swept away!`
              : tile.type === TILE_TYPES.DEBRIS
                ? '🪨 Underwater debris detected! Passable but you\'ll get injured.'
                : '💀 Deep water — over your head! Do NOT step here.'
      )
      return
    }

    // Move attempt
    if (!tile.probed) {
      setBlindSteps(b => b + 1)
    }
    setTotalSteps(t => t + 1)

    if (tile.type === TILE_TYPES.MANHOLE) {
      setGrid(prev => {
        const ng = prev.map(row => row.map(t => ({ ...t })))
        ng[r][c].probed = true
        return ng
      })
      setMessage('🕳️ You fell into an open manhole hidden under floodwater! Floodwaters hide deadly hazards beneath the surface.')
      setTimeout(() => finishGame(false), 1500)
      return
    }

    if (tile.type === TILE_TYPES.CURRENT) {
      setGrid(prev => {
        const ng = prev.map(row => row.map(t => ({ ...t })))
        ng[r][c].probed = true
        return ng
      })
      setMessage('🌊 A hidden current swept you away! Just 6 inches of fast-moving water can knock you down.')
      setTimeout(() => finishGame(false), 1500)
      return
    }

    if (tile.type === TILE_TYPES.DEEP) {
      setGrid(prev => {
        const ng = prev.map(row => row.map(t => ({ ...t })))
        ng[r][c].probed = true
        return ng
      })
      setMessage('💀 You stepped into water over your head! Never wade into water of unknown depth.')
      setTimeout(() => finishGame(false), 1500)
      return
    }

    if (tile.type === TILE_TYPES.DEBRIS) {
      setInjuries(inj => inj + 1)
      setGrid(prev => {
        const ng = prev.map(row => row.map(t => ({ ...t })))
        ng[r][c].probed = true
        return ng
      })
      setPlayerPos({ r, c })
      setMessage('🪨 Underwater debris cut your leg! You can continue but you\'re injured.')
      if (tile.type === TILE_TYPES.EXIT) {
        setTimeout(() => finishGame(true), 800)
      }
      return
    }

    // Safe move
    setPlayerPos({ r, c })
    setGrid(prev => {
      const ng = prev.map(row => row.map(t => ({ ...t })))
      ng[r][c].probed = true
      return ng
    })
    setMessage('')

    if (tile.type === TILE_TYPES.EXIT) {
      setMessage('🏁 You reached safety!')
      setTimeout(() => finishGame(true), 800)
    }
  }, [phase, grid, probeMode, isAdjacent, finishGame])

  const getTileStyle = useCallback((tile, r, c) => {
    const isPlayer = r === playerPos.r && c === playerPos.c
    const base = {
      width: 46, height: 46,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, cursor: 'pointer',
      border: isPlayer ? '3px solid #fbbf24' : '1px solid #334155',
      fontSize: 20, fontWeight: 'bold',
      transition: 'all 0.2s',
      position: 'relative',
      userSelect: 'none',
    }

    if (tile.type === TILE_TYPES.START) return { ...base, background: '#065f46', color: '#6ee7b7' }
    if (tile.type === TILE_TYPES.EXIT) return { ...base, background: '#7c3aed', color: '#e9d5ff', boxShadow: '0 0 12px #a78bfa' }

    if (!tile.probed) return { ...base, background: '#4a3728', color: '#78716c' } // murky water

    // Probed tiles
    if (tile.type === TILE_TYPES.SAFE) return { ...base, background: '#166534', color: '#bbf7d0' }
    if (tile.type === TILE_TYPES.MANHOLE) return { ...base, background: '#991b1b', color: '#fca5a5' }
    if (tile.type === TILE_TYPES.CURRENT) return { ...base, background: '#92400e', color: '#fde68a' }
    if (tile.type === TILE_TYPES.DEEP) return { ...base, background: '#7f1d1d', color: '#fecaca' }
    if (tile.type === TILE_TYPES.DEBRIS) return { ...base, background: '#78350f', color: '#fde68a' }

    return base
  }, [playerPos])

  const getTileContent = useCallback((tile, r, c) => {
    const isPlayer = r === playerPos.r && c === playerPos.c
    if (isPlayer) return '🧑'
    if (tile.type === TILE_TYPES.EXIT) return '🏁'
    if (tile.type === TILE_TYPES.START) return '🟢'

    if (!tile.probed) return '🌊'

    if (tile.type === TILE_TYPES.SAFE) return '✅'
    if (tile.type === TILE_TYPES.MANHOLE) return '🕳️'
    if (tile.type === TILE_TYPES.CURRENT) return ARROW_MAP[tile.currentDir] || '🌊'
    if (tile.type === TILE_TYPES.DEEP) return '💀'
    if (tile.type === TILE_TYPES.DEBRIS) return '🪨'
    return ''
  }, [playerPos])

  // ── INTRO SCREEN ──
  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 600, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🌊🚶‍♂️</div>
          <h1 style={{ fontSize: 32, color: '#38bdf8', marginBottom: 12 }}>Module 5: Treacherous Trek</h1>
          <p style={{ fontSize: 18, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 20 }}>
            Floodwaters have overtaken the streets. You must navigate from the <span style={{ color: '#6ee7b7', fontWeight: 'bold' }}>bottom-left</span> to the <span style={{ color: '#c4b5fd', fontWeight: 'bold' }}>top-right exit</span> on foot.
          </p>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ color: '#fbbf24', marginBottom: 12 }}>⚠️ Hidden Dangers Under The Water:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2.2 }}>
              <li>🕳️ <strong style={{ color: '#f87171' }}>Missing Manhole Covers</strong> — instant death trap</li>
              <li>🌊 <strong style={{ color: '#fbbf24' }}>Fast Currents</strong> — will sweep you away</li>
              <li>💀 <strong style={{ color: '#fb923c' }}>Deep Water</strong> — over your head</li>
              <li>🪨 <strong style={{ color: '#d97706' }}>Underwater Debris</strong> — causes injuries (not fatal but hurts your score)</li>
            </ul>
            <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '16px 0' }} />
            <p style={{ color: '#a5f3fc', fontSize: 15 }}>
              🪵 Use your <strong>Probe Stick</strong> to check tiles BEFORE stepping! Click "Probe" then click an adjacent tile to reveal it.
            </p>
            <p style={{ color: '#fda4af', fontSize: 14, marginTop: 8 }}>
              Stepping blindly onto a danger tile = game over.
            </p>
          </div>
          <p style={{ fontSize: 22, color: '#f87171', fontWeight: 'bold', marginBottom: 20 }}>
            "Turn Around, Don't Drown!" 🚫🌊
          </p>
          <button
            onClick={() => { setAttempts(0); restart() }}
            style={{ padding: '14px 48px', fontSize: 20, fontWeight: 'bold', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}
          >
            Begin Trek 🥾
          </button>
          <br />
          <button
            onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
            style={{ marginTop: 16, padding: '10px 24px', fontSize: 14, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }}
          >
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (phase === 'result' && resultData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 560, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{resultData.won ? '🎉' : '💀'}</div>
          <h1 style={{ fontSize: 28, color: resultData.won ? '#4ade80' : '#f87171', marginBottom: 8 }}>
            {resultData.won ? 'You Made It to Safety!' : 'Trek Failed'}
          </h1>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: resultData.passed ? '#4ade80' : '#f87171', margin: '16px 0' }}>
            {resultData.score}/100
          </div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 20 }}>
            <p style={{ color: '#cbd5e1', marginBottom: 8 }}>📊 <strong>Steps taken:</strong> {resultData.totalSteps}</p>
            <p style={{ color: '#cbd5e1', marginBottom: 8 }}>🪵 <strong>Tiles probed:</strong> {resultData.probeCount}</p>
            <p style={{ color: resultData.blindSteps > 0 ? '#fbbf24' : '#4ade80', marginBottom: 8 }}>
              ⚠️ <strong>Blind steps:</strong> {resultData.blindSteps}
            </p>
            <p style={{ color: resultData.injuries > 0 ? '#fb923c' : '#4ade80', marginBottom: 0 }}>
              🪨 <strong>Injuries from debris:</strong> {resultData.injuries}
            </p>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ color: '#38bdf8', marginBottom: 12 }}>📚 What You Should Know:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
              <li style={{ color: '#fda4af' }}>🚫 <strong>"Turn around, don't drown"</strong> — NEVER walk through floodwater if you can avoid it.</li>
              <li style={{ color: '#fde68a' }}>🕳️ Floodwater hides open manholes, downed power lines, sharp debris, and sinkholes.</li>
              <li style={{ color: '#a5f3fc' }}>🪵 If you MUST walk, use a stick to probe the ground ahead of each step.</li>
              <li style={{ color: '#fde68a' }}>🪨 Submerged debris (broken glass, metal, nails) can cause serious cuts that become infected by contaminated water.</li>
              <li style={{ color: '#bbf7d0' }}>📏 Just <strong>6 inches</strong> of moving water can knock you down. <strong>12 inches</strong> can carry away a car.</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setAttempts(0); restart() }}
              style={{ padding: '12px 32px', fontSize: 16, fontWeight: 'bold', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
              style={{ padding: '12px 32px', fontSize: 16, fontWeight: 'bold', background: '#475569', color: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              ← Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY SCREEN ──
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px' }}>
      <h2 style={{ color: '#38bdf8', marginBottom: 4, fontSize: 22 }}>🌊 Treacherous Trek</h2>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Navigate from 🟢 to 🏁 — Probe before you step!</p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => setProbeMode(p => !p)}
          style={{
            padding: '10px 28px', fontSize: 16, fontWeight: 'bold',
            background: probeMode ? '#f59e0b' : '#334155',
            color: probeMode ? '#000' : '#f1f5f9',
            border: probeMode ? '2px solid #fbbf24' : '2px solid #475569',
            borderRadius: 8, cursor: 'pointer',
            boxShadow: probeMode ? '0 0 16px #f59e0b88' : 'none',
          }}
        >
          🪵 {probeMode ? 'PROBING — Click a Tile' : 'Probe Stick'}
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          Probed: <strong style={{ color: '#4ade80' }}>{probeCount}</strong> | Blind steps: <strong style={{ color: blindSteps > 0 ? '#fbbf24' : '#4ade80' }}>{blindSteps}</strong>
        </span>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          background: '#1e293b', border: '1px solid #475569', borderRadius: 8,
          padding: '10px 20px', marginBottom: 12, maxWidth: 500, textAlign: 'center',
          color: '#fde68a', fontSize: 14, fontWeight: 500,
        }}>
          {message}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, background: '#1e293b', padding: 12, borderRadius: 12, border: '2px solid #334155' }}>
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex', gap: 3 }}>
            {row.map((tile, c) => (
              <div
                key={`${r}-${c}`}
                onClick={() => handleTileClick(r, c)}
                style={{
                  ...getTileStyle(tile, r, c),
                  opacity: isAdjacent(r, c) ? 1 : 0.7,
                  transform: isAdjacent(r, c) && phase === 'play' ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {getTileContent(tile, r, c)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', justifyContent: 'center', fontSize: 12, color: '#94a3b8' }}>
        <span>🌊 Unknown</span>
        <span style={{ color: '#4ade80' }}>✅ Safe</span>
        <span style={{ color: '#f87171' }}>🕳️ Manhole</span>
        <span style={{ color: '#fbbf24' }}>↑ Current</span>
        <span style={{ color: '#fb923c' }}>💀 Deep</span>
        <span style={{ color: '#d97706' }}>🪨 Debris</span>
      </div>

      <button
        onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
        style={{ marginTop: 20, padding: '8px 20px', fontSize: 13, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
      >
        ← Quit
      </button>
    </div>
  )
}
