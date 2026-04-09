/**
 * Module 5 — Dynamic Trek: Grid Survival with Moving Hazards, Darkness & Fatigue
 * Aesthetic: Urban Flood Topography — dark mode, depth gradients, flowing CSS water
 * Mechanics: 20×20 grid, fire ant rafts, debris logs, probe-and-step,
 *            shrinking light radius, stamina/fatigue, ferry-angle physics
 */
import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

// ── Constants ────────────────────────────────────────────────────────────────
const BG = '#1e1e2e'
const CARD = '#2a2a3e'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#f1f2f6'
const DIM = '#a4b0be'
const GREEN = '#2ed573'
const RED = '#ff4757'
const YELLOW = '#ffa502'
const BLUE = '#0984e3'

const GRID = 20
const CELL = 28                     // px per cell
const START = { x: 0, y: 19 }      // bottom-left
const EXIT  = { x: 19, y: 0 }      // top-right
const LIGHT_DROP = 4                // per turn
const STAMINA_WITH = 5              // moving with current
const STAMINA_AGAINST = 20          // moving against current
const STAMINA_REST = 15             // regain per rest
const STAMINA_CRANK = 10            // cost to crank flashlight
const LIGHT_CRANK = 30              // light restored by crank
const PROBE_COST = 3                // stamina to probe

// ── Deterministic level generation ───────────────────────────────────────────
function seededRng(seed) {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function generateLevel(seed) {
  const rng = seededRng(seed)
  const cells = []
  for (let y = 0; y < GRID; y++) {
    const row = []
    for (let x = 0; x < GRID; x++) {
      // Current direction: generally flows from top-left to bottom-right with variation
      const baseFlowX = 0.4 + rng() * 0.4
      const baseFlowY = 0.3 + rng() * 0.3
      const depth = 4 + Math.floor(rng() * 18)          // 4-22 inches
      const velocity = 1 + rng() * 5                      // 1-6 fps
      let trap = null
      // Scatter manholes (8-10 hidden hazards, not on start/exit)
      if (rng() < 0.025 && !(x === START.x && y === START.y) && !(x === EXIT.x && y === EXIT.y)) {
        trap = 'MANHOLE'
      }
      if (!trap && rng() < 0.015 && !(x === START.x && y === START.y) && !(x === EXIT.x && y === EXIT.y)) {
        trap = 'FENCE'
      }
      row.push({
        x, y, depth, velocity,
        flowX: baseFlowX * (rng() > 0.3 ? 1 : -1),
        flowY: baseFlowY * (rng() > 0.3 ? 1 : -1),
        trap,
        probed: false,
        revealed: false,
      })
    }
    cells.push(row)
  }
  // Ensure start/exit are safe
  cells[START.y][START.x].trap = null
  cells[START.y][START.x].probed = true
  cells[START.y][START.x].revealed = true
  cells[EXIT.y][EXIT.x].trap = null
  return cells
}

function generateHazards(seed) {
  const rng = seededRng(seed + 999)
  const hazards = []
  for (let i = 0; i < 4; i++) {
    const x = 3 + Math.floor(rng() * 14)
    const y = 3 + Math.floor(rng() * 14)
    hazards.push({
      id: `ant-${i}`, type: 'ANTS', x, y,
      vx: rng() > 0.5 ? 1 : -1, vy: 0, emoji: '🐜',
    })
  }
  for (let i = 0; i < 3; i++) {
    const x = 2 + Math.floor(rng() * 16)
    const y = 2 + Math.floor(rng() * 16)
    hazards.push({
      id: `log-${i}`, type: 'DEBRIS', x, y,
      vx: 0, vy: rng() > 0.5 ? 1 : -1, emoji: '🪵',
    })
  }
  return hazards
}

// ── Movement helpers ─────────────────────────────────────────────────────────
function isMovingWithCurrent(cell, dx, dy) {
  // dot product of movement direction with current direction
  const dot = dx * cell.flowX + dy * cell.flowY
  return dot > 0
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ── Reducer ──────────────────────────────────────────────────────────────────
const SEED = 42

const initState = {
  phase: 'intro',       // intro | play | dead | win | result
  cells: generateLevel(SEED),
  hazards: generateHazards(SEED),
  player: { ...START },
  stamina: 100,
  lightLevel: 100,
  turn: 0,
  hasStick: true,        // wading stick (always have for probing)
  hasFlashlight: true,
  log: [],
  deathCause: null,
  probeTarget: null,     // { x, y } currently highlighted probe target
  score: 0,
  stepsWithCurrent: 0,
  stepsAgainst: 0,
  totalProbes: 0,
  hazardsAvoided: 0,
}

function moveHazards(hazards) {
  return hazards.map(h => {
    let nx = h.x + h.vx
    let ny = h.y + h.vy
    // Bounce off edges
    let nvx = h.vx, nvy = h.vy
    if (nx < 0 || nx >= GRID) { nvx = -nvx; nx = clamp(nx, 0, GRID - 1) }
    if (ny < 0 || ny >= GRID) { nvy = -nvy; ny = clamp(ny, 0, GRID - 1) }
    return { ...h, x: nx, y: ny, vx: nvx, vy: nvy }
  })
}

function checkHazardCollision(hazards, px, py) {
  return hazards.find(h => h.x === px && h.y === py)
}

function reducer(state, action) {
  switch (action.type) {
    case 'START': return { ...state, phase: 'play', log: ['📍 You enter the flooded streets. Reach the extraction point (top-right).'] }

    case 'MOVE': {
      if (state.phase !== 'play') return state
      const { dx, dy } = action.payload
      const nx = state.player.x + dx
      const ny = state.player.y + dy
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return state

      const cell = state.cells[ny][nx]
      const withCurrent = isMovingWithCurrent(cell, dx, dy)
      const cost = withCurrent ? STAMINA_WITH : STAMINA_AGAINST
      const newStamina = state.stamina - cost

      if (newStamina <= 0) {
        return {
          ...state, phase: 'dead', stamina: 0,
          deathCause: 'exhaustion',
          log: [...state.log, '💀 MUSCLE EXHAUSTION: You collapsed into the current. Never fight the water directly — angle your path (ferry) across it.'],
        }
      }

      // Check for unprobed trap
      if (cell.trap && !cell.probed) {
        const msg = cell.trap === 'MANHOLE'
          ? '💀 You stepped into a hidden open manhole! Storm pressure blew the cover off. ALWAYS probe before stepping.'
          : '💀 Submerged chain-link fence snagged your legs. You fell face-first into the current.'
        return { ...state, phase: 'dead', deathCause: cell.trap.toLowerCase(), player: { x: nx, y: ny }, log: [...state.log, msg] }
      }

      // Move hazards
      const newHazards = moveHazards(state.hazards)
      const newLight = Math.max(0, state.lightLevel - LIGHT_DROP)

      // Check hazard at new position
      const hit = checkHazardCollision(newHazards, nx, ny)
      if (hit) {
        const msg = hit.type === 'ANTS'
          ? '💀 You walked into a floating FIRE ANT RAFT! Thousands of stings caused anaphylaxis and panic. You lost your footing and drowned.'
          : '💀 A heavy debris log swept into you at 6 fps. The impact knocked you into the current.'
        return { ...state, phase: 'dead', deathCause: hit.type.toLowerCase(), player: { x: nx, y: ny }, hazards: newHazards, log: [...state.log, msg] }
      }

      // Reveal cell
      const newCells = state.cells.map(row => row.map(c => ({ ...c })))
      newCells[ny][nx].revealed = true

      // Check win
      if (nx === EXIT.x && ny === EXIT.y) {
        const bonus = Math.round(state.stamina * 0.3) + Math.round(newLight * 0.2) + state.totalProbes * 2
        const sc = Math.min(100, 40 + bonus)
        return {
          ...state, phase: 'win', player: { x: nx, y: ny }, stamina: newStamina, lightLevel: newLight,
          hazards: newHazards, cells: newCells, turn: state.turn + 1, score: sc,
          stepsWithCurrent: withCurrent ? state.stepsWithCurrent + 1 : state.stepsWithCurrent,
          stepsAgainst: !withCurrent ? state.stepsAgainst + 1 : state.stepsAgainst,
          log: [...state.log, '🎉 EXTRACTION REACHED! You survived the flood.'],
        }
      }

      return {
        ...state, player: { x: nx, y: ny }, stamina: newStamina, lightLevel: newLight,
        hazards: newHazards, cells: newCells, turn: state.turn + 1,
        stepsWithCurrent: withCurrent ? state.stepsWithCurrent + 1 : state.stepsWithCurrent,
        stepsAgainst: !withCurrent ? state.stepsAgainst + 1 : state.stepsAgainst,
        log: [...state.log, `Step to (${nx},${ny}) | ${withCurrent ? '-5' : '-20'} stamina | Light: ${newLight}%`],
      }
    }

    case 'PROBE': {
      if (state.phase !== 'play') return state
      const { dx, dy } = action.payload
      const tx = state.player.x + dx
      const ty = state.player.y + dy
      if (tx < 0 || tx >= GRID || ty < 0 || ty >= GRID) return state
      const newStamina = state.stamina - PROBE_COST
      if (newStamina <= 0) return { ...state, log: [...state.log, '⚠️ Too exhausted to probe. Rest first.'] }
      const newCells = state.cells.map(row => row.map(c => ({ ...c })))
      const cell = newCells[ty][tx]
      cell.probed = true
      cell.revealed = true
      let msg = `🔍 Probed (${tx},${ty}): Depth ${cell.depth}in, Flow ${cell.velocity.toFixed(1)}fps`
      if (cell.trap === 'MANHOLE') msg += ' — ⚠️ OPEN MANHOLE DETECTED!'
      else if (cell.trap === 'FENCE') msg += ' — ⚠️ SUBMERGED FENCE DETECTED!'
      else msg += ' — Clear.'
      return { ...state, cells: newCells, stamina: newStamina, totalProbes: state.totalProbes + 1, log: [...state.log, msg] }
    }

    case 'REST': {
      if (state.phase !== 'play') return state
      const newHazards = moveHazards(state.hazards)
      const newLight = Math.max(0, state.lightLevel - LIGHT_DROP)
      const hit = checkHazardCollision(newHazards, state.player.x, state.player.y)
      if (hit) {
        const msg = hit.type === 'ANTS'
          ? '💀 While resting, a fire ant raft floated into you!'
          : '💀 While resting, a debris log hit you!'
        return { ...state, phase: 'dead', deathCause: hit.type.toLowerCase(), hazards: newHazards, log: [...state.log, msg] }
      }
      const newStamina = Math.min(100, state.stamina + STAMINA_REST)
      return {
        ...state, stamina: newStamina, lightLevel: newLight, hazards: newHazards, turn: state.turn + 1,
        log: [...state.log, `⏸️ Rested. Stamina +${STAMINA_REST} → ${newStamina}%. Light: ${newLight}%`],
      }
    }

    case 'CRANK_FLASHLIGHT': {
      if (state.phase !== 'play') return state
      if (state.stamina <= STAMINA_CRANK) return { ...state, log: [...state.log, '⚠️ Too exhausted to crank. Rest first.'] }
      const newStamina = state.stamina - STAMINA_CRANK
      const newLight = Math.min(100, state.lightLevel + LIGHT_CRANK)
      return {
        ...state, stamina: newStamina, lightLevel: newLight,
        log: [...state.log, `🔦 Cranked flashlight. Stamina -${STAMINA_CRANK}, Light +${LIGHT_CRANK} → ${newLight}%`],
      }
    }

    case 'SET_PHASE': return { ...state, phase: action.payload }
    case 'RESTART': return { ...initState, cells: generateLevel(SEED + Date.now() % 1000), hazards: generateHazards(SEED + Date.now() % 1000) }
    default: return state
  }
}

// ── CSS Keyframes (injected once) ────────────────────────────────────────────
const KEYFRAMES = `
@keyframes m5flow { 0%{background-position:0 0} 100%{background-position:30px 20px} }
@keyframes m5pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
@keyframes m5heartbeat { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
@keyframes m5antFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
`

// ── Component ────────────────────────────────────────────────────────────────
export default function Module5_DynamicTrek() {
  const { dispatch: gDispatch } = useGame()
  const [state, dispatch] = useReducer(reducer, initState)
  const logRef = useRef(null)
  const styleRef = useRef(false)

  // Inject CSS once
  useEffect(() => {
    if (styleRef.current) return
    styleRef.current = true
    const el = document.createElement('style')
    el.textContent = KEYFRAMES
    document.head.appendChild(el)
    return () => { try { document.head.removeChild(el) } catch {} }
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [state.log])

  const goBack = useCallback(() => gDispatch({ type: 'BACK_TO_MODULES' }), [gDispatch])

  const finishGame = useCallback(() => {
    const passed = state.phase === 'win'
    const score = passed ? state.score : Math.max(0, Math.round(state.turn * 0.5 + state.totalProbes * 2))
    gDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-5', result: { score, passed } } })
    dispatch({ type: 'SET_PHASE', payload: 'result' })
  }, [state, gDispatch])

  // Light radius for fog-of-war
  const lightRadius = Math.max(1, Math.round((state.lightLevel / 100) * 10))
  const staminaLow = state.stamina <= 30

  // Hazard positions as set for quick lookup
  const hazardMap = useMemo(() => {
    const m = {}
    state.hazards.forEach(h => { m[`${h.x},${h.y}`] = h })
    return m
  }, [state.hazards])

  // ── Key handler ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'play') return
    const handler = (e) => {
      const map = { ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 }, ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 } }
      if (map[e.key]) {
        e.preventDefault()
        if (e.shiftKey) dispatch({ type: 'PROBE', payload: map[e.key] })
        else dispatch({ type: 'MOVE', payload: map[e.key] })
      }
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'REST' })
      if (e.key === 'f' || e.key === 'F') dispatch({ type: 'CRANK_FLASHLIGHT' })
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.phase])

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (state.phase === 'intro') {
    return (
      <div style={S.screen}>
        <div style={S.introCard}>
          <div style={{ fontSize: 56 }}>🌊</div>
          <h1 style={{ color: TEXT, fontSize: 26, margin: '8px 0' }}>Module 5: Dynamic Trek</h1>
          <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7, margin: '8px 0' }}>
            Navigate flooded streets from <strong style={{ color: BLUE }}>bottom-left</strong> to
            <strong style={{ color: GREEN }}> top-right extraction</strong>. The water hides deadly hazards, fire ant rafts float
            with the current, and <strong style={{ color: YELLOW }}>darkness is closing in</strong>.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, width: '100%', textAlign: 'left', border: `1px solid ${BORDER}` }}>
            <h3 style={{ color: YELLOW, margin: '0 0 8px', fontSize: 14 }}>Mechanics</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 2, color: DIM }}>
              <li>🏃 <strong style={{ color: TEXT }}>Move:</strong> Arrow keys (with current = -5 stamina, against = -20)</li>
              <li>🔍 <strong style={{ color: TEXT }}>Probe:</strong> Shift+Arrow to check the next tile for hidden traps</li>
              <li>⏸️ <strong style={{ color: TEXT }}>Rest:</strong> Press R to recover stamina (but hazards still move!)</li>
              <li>🔦 <strong style={{ color: TEXT }}>Flashlight:</strong> Press F to restore vision (-10 stamina)</li>
              <li>🐜 <strong style={{ color: RED }}>Fire Ant Rafts:</strong> Move every turn. Lethal on contact.</li>
              <li>🪵 <strong style={{ color: RED }}>Debris Logs:</strong> Move every turn. Lethal impact.</li>
              <li>🕳️ <strong style={{ color: RED }}>Manholes:</strong> Hidden. Must probe first or die.</li>
              <li>🌑 <strong style={{ color: TEXT }}>Darkness:</strong> Vision shrinks each turn. Crank flashlight to restore.</li>
            </ul>
          </div>
          <button style={S.primaryBtn} onClick={() => dispatch({ type: 'START' })}>
            Enter the Flood Zone
          </button>
          <button style={S.ghost} onClick={goBack}>← Back to Modules</button>
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (state.phase === 'result') {
    const passed = state.score >= 50
    return (
      <div style={S.screen}>
        <div style={{ ...S.introCard, maxWidth: 560 }}>
          <div style={{ fontSize: 56 }}>{passed ? '🎉' : '💀'}</div>
          <h1 style={{ color: passed ? GREEN : RED, fontSize: 24, margin: '8px 0' }}>
            {passed ? 'Extraction Successful!' : 'Mission Failed'}
          </h1>
          <div style={{ fontSize: 40, fontWeight: 800, color: passed ? GREEN : RED }}>{state.score}/100</div>
          {state.deathCause && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 10, padding: 14, width: '100%' }}>
              <p style={{ color: '#ff6b81', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {state.deathCause === 'exhaustion' && 'You fought the current head-on until your muscles gave out. In real floods, "ferry" at an angle across the current — never fight it directly.'}
                {state.deathCause === 'manhole' && 'You stepped on an open manhole without probing. Storm surges blow manhole covers off — ALWAYS probe before stepping into turbid water.'}
                {state.deathCause === 'fence' && 'A submerged fence trapped your legs. In floodwater, hidden obstacles are invisible. Probe every step.'}
                {state.deathCause === 'ants' && 'Fire ant colonies form floating rafts in floods. They cling to anything that contacts them. Track all moving objects, not just the ground.'}
                {state.deathCause === 'debris' && 'A fast-moving debris log hit you. Moving hazards in floodwater are as dangerous as the water itself.'}
              </p>
            </div>
          )}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, width: '100%', textAlign: 'left' }}>
            <h3 style={{ color: BLUE, margin: '0 0 8px', fontSize: 14 }}>Stats</h3>
            <div style={{ fontSize: 12, color: DIM, lineHeight: 2 }}>
              <div>Turns: {state.turn}</div>
              <div>Steps with current: {state.stepsWithCurrent} | Against: {state.stepsAgainst}</div>
              <div>Probes: {state.totalProbes}</div>
              <div>Final stamina: {state.stamina}% | Light: {state.lightLevel}%</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button style={S.primaryBtn} onClick={() => dispatch({ type: 'RESTART' })}>🔄 Try Again</button>
            <button style={{ ...S.actionBtn, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} onClick={goBack}>📋 Modules</button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY / DEAD / WIN ──────────────────────────────────────────────────────
  const isDead = state.phase === 'dead'
  const isWin = state.phase === 'win'
  const exhaustionFilter = staminaLow ? `blur(${Math.round((30 - state.stamina) / 10)}px)` : 'none'
  const darknessOpacity = 1 - (state.lightLevel / 100) * 0.85

  return (
    <div style={{ ...S.screen, flexDirection: 'column', padding: 12, gap: 10, position: 'relative' }}>
      {/* Exhaustion vignette */}
      {staminaLow && state.phase === 'play' && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,50,50,0.15) 100%)',
          animation: 'm5heartbeat 1s ease infinite',
        }} />
      )}

      {/* Top bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%', maxWidth: 800 }}>
        <button style={S.ghost} onClick={goBack}>← Quit</button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: DIM }}>
          <span>Turn: <strong style={{ color: TEXT }}>{state.turn}</strong></span>
          <span style={{ color: staminaLow ? RED : GREEN }}>
            Stamina: <strong>{state.stamina}%</strong>
            {staminaLow && ' ❤️'}
          </span>
          <span style={{ color: state.lightLevel < 30 ? RED : YELLOW }}>
            Light: <strong>{state.lightLevel}%</strong>
          </span>
        </div>
      </div>

      {/* Main layout: grid + side panel */}
      <div style={{ display: 'flex', gap: 12, flex: 1, maxWidth: 900, width: '100%' }}>
        {/* Grid */}
        <div style={{
          position: 'relative',
          width: GRID * CELL, height: GRID * CELL,
          background: '#0a0a1e',
          borderRadius: 8, overflow: 'hidden',
          border: `1px solid ${BORDER}`,
          flexShrink: 0,
          filter: exhaustionFilter,
        }}>
          {/* Water flow background */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `repeating-linear-gradient(135deg, rgba(9,132,227,0.04) 0px, transparent 4px, rgba(9,132,227,0.02) 8px)`,
            backgroundSize: '30px 20px',
            animation: 'm5flow 2s linear infinite',
          }} />

          {/* Cells */}
          {state.cells.map((row, y) => row.map((cell, x) => {
            const dist = Math.abs(x - state.player.x) + Math.abs(y - state.player.y)
            const visible = dist <= lightRadius || cell.revealed
            const isPlayer = x === state.player.x && y === state.player.y
            const isExit = x === EXIT.x && y === EXIT.y
            const hazard = hazardMap[`${x},${y}`]
            const depthColor = `rgba(9,132,227,${Math.min(0.5, cell.depth / 30)})`

            return (
              <div key={`${x}-${y}`} style={{
                position: 'absolute',
                left: x * CELL, top: y * CELL,
                width: CELL, height: CELL,
                background: visible ? depthColor : '#020210',
                borderRight: '1px solid rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'background 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: CELL * 0.55,
              }}>
                {/* Trap indicators (only if probed) */}
                {visible && cell.probed && cell.trap === 'MANHOLE' && !isPlayer && (
                  <span style={{ color: RED, fontSize: CELL * 0.5 }}>⚠</span>
                )}
                {visible && cell.probed && cell.trap === 'FENCE' && !isPlayer && (
                  <span style={{ color: YELLOW, fontSize: CELL * 0.45 }}>⚡</span>
                )}
                {/* Probed safe indicator */}
                {visible && cell.probed && !cell.trap && !isPlayer && !isExit && !hazard && (
                  <span style={{ color: 'rgba(46,213,115,0.3)', fontSize: CELL * 0.35 }}>·</span>
                )}
                {/* Exit */}
                {isExit && visible && <span style={{ fontSize: CELL * 0.6, animation: 'm5pulse 1.5s ease infinite' }}>🏁</span>}
                {/* Hazards */}
                {hazard && visible && !isPlayer && (
                  <span style={{ fontSize: CELL * 0.6, animation: hazard.type === 'ANTS' ? 'm5antFloat 0.8s ease infinite' : 'none' }}>
                    {hazard.emoji}
                  </span>
                )}
                {/* Player */}
                {isPlayer && <span style={{ fontSize: CELL * 0.65, zIndex: 2 }}>🧍</span>}
                {/* Flow arrow (subtle) */}
                {visible && !isPlayer && !isExit && !hazard && !cell.trap && cell.probed && (
                  <span style={{
                    position: 'absolute', fontSize: 8, color: 'rgba(116,185,255,0.25)',
                    transform: `rotate(${Math.atan2(cell.flowY, cell.flowX) * 180 / Math.PI}deg)`,
                  }}>→</span>
                )}
              </div>
            )
          }))}

          {/* Darkness overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(circle ${lightRadius * CELL * 1.2}px at ${state.player.x * CELL + CELL / 2}px ${state.player.y * CELL + CELL / 2}px, transparent 0%, rgba(0,0,0,${darknessOpacity}) 100%)`,
            transition: 'all 0.5s',
          }} />

          {/* Death / Win overlay */}
          {(isDead || isWin) && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDead ? 'rgba(255,20,20,0.3)' : 'rgba(46,213,115,0.2)',
              backdropFilter: 'blur(4px)', zIndex: 10, flexDirection: 'column', gap: 12,
            }}>
              <div style={{ fontSize: 48 }}>{isDead ? '💀' : '🎉'}</div>
              <div style={{ color: isDead ? RED : GREEN, fontSize: 18, fontWeight: 700 }}>
                {isDead ? 'YOU DIED' : 'EXTRACTED!'}
              </div>
              <button onClick={finishGame} style={{ ...S.primaryBtn, fontSize: 14 }}>
                See Results
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
          {/* Current cell info */}
          {state.phase === 'play' && (
            <div style={{ ...S.sideCard }}>
              <div style={{ color: DIM, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Current Position</div>
              <div style={{ color: TEXT, fontSize: 13, marginTop: 4 }}>
                Depth: <strong>{state.cells[state.player.y][state.player.x].depth}"</strong> |
                Current: <strong>{state.cells[state.player.y][state.player.x].velocity.toFixed(1)} fps</strong>
              </div>
            </div>
          )}

          {/* Stamina bar */}
          <div style={{ ...S.sideCard }}>
            <div style={{ color: DIM, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Stamina</div>
            <div style={{ height: 8, borderRadius: 4, background: '#1a1a2e', marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.3s',
                width: `${state.stamina}%`,
                background: state.stamina > 50 ? GREEN : state.stamina > 30 ? YELLOW : RED,
              }} />
            </div>
            <div style={{ color: staminaLow ? RED : TEXT, fontSize: 12, marginTop: 4, fontWeight: 700 }}>
              {state.stamina}% {staminaLow && '⚠️ EXHAUSTION WARNING'}
            </div>
          </div>

          {/* Light bar */}
          <div style={{ ...S.sideCard }}>
            <div style={{ color: DIM, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Ambient Light</div>
            <div style={{ height: 8, borderRadius: 4, background: '#1a1a2e', marginTop: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.3s',
                width: `${state.lightLevel}%`,
                background: `linear-gradient(90deg, #2d3436, ${YELLOW})`,
              }} />
            </div>
            <div style={{ color: DIM, fontSize: 11, marginTop: 4 }}>{state.lightLevel}%</div>
          </div>

          {/* Actions */}
          {state.phase === 'play' && (
            <div style={{ ...S.sideCard }}>
              <div style={{ color: DIM, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {/* Directional move */}
                {[
                  { label: '↑', dx: 0, dy: -1 },
                  { label: '↓', dx: 0, dy: 1 },
                  { label: '←', dx: -1, dy: 0 },
                  { label: '→', dx: 1, dy: 0 },
                ].map(d => (
                  <button key={d.label} onClick={() => dispatch({ type: 'MOVE', payload: { dx: d.dx, dy: d.dy } })}
                    style={{ ...S.smallBtn, background: 'rgba(9,132,227,0.15)', color: BLUE }}>
                    {d.label} Step
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                {[
                  { label: '↑🔍', dx: 0, dy: -1 },
                  { label: '↓🔍', dx: 0, dy: 1 },
                  { label: '←🔍', dx: -1, dy: 0 },
                  { label: '→🔍', dx: 1, dy: 0 },
                ].map(d => (
                  <button key={d.label} onClick={() => dispatch({ type: 'PROBE', payload: { dx: d.dx, dy: d.dy } })}
                    style={{ ...S.smallBtn, background: 'rgba(255,165,2,0.12)', color: YELLOW, fontSize: 11 }}>
                    {d.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={() => dispatch({ type: 'REST' })}
                  style={{ ...S.smallBtn, flex: 1, background: 'rgba(46,213,115,0.12)', color: GREEN }}>
                  ⏸ Rest
                </button>
                <button onClick={() => dispatch({ type: 'CRANK_FLASHLIGHT' })}
                  style={{ ...S.smallBtn, flex: 1, background: 'rgba(255,255,0,0.1)', color: YELLOW }}>
                  🔦 Crank
                </button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={{ ...S.sideCard, fontSize: 11, color: DIM, lineHeight: 1.8 }}>
            <div>🧍 You | 🏁 Exit</div>
            <div>🐜 Fire Ants | 🪵 Debris</div>
            <div>⚠ Manhole | ⚡ Fence</div>
            <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
              Keyboard: Arrows=Move, Shift+Arrow=Probe, R=Rest, F=Flashlight
            </div>
          </div>

          {/* Log */}
          <div ref={logRef} style={{
            ...S.sideCard, flex: 1, overflow: 'auto', maxHeight: 160,
            fontSize: 10, color: DIM, lineHeight: 1.6,
          }}>
            {state.log.slice(-15).map((l, i) => <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{l}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: BG, fontFamily: 'system-ui, -apple-system, sans-serif', padding: 12,
  },
  introCard: {
    maxWidth: 520, padding: '32px 28px', textAlign: 'center',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
    borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  card: { background: CARD, borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}` },
  sideCard: { background: CARD, borderRadius: 8, padding: '10px 12px', border: `1px solid ${BORDER}` },
  primaryBtn: {
    padding: '13px 36px', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg, #0984e3, #74b9ff)', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer',
  },
  actionBtn: {
    padding: '10px 20px', fontSize: 13, fontWeight: 600,
    background: 'rgba(255,255,255,0.06)', color: TEXT,
    border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer',
  },
  smallBtn: {
    padding: '6px 8px', fontSize: 12, fontWeight: 600,
    border: `1px solid ${BORDER}`, borderRadius: 6, cursor: 'pointer',
    background: 'rgba(255,255,255,0.04)', color: TEXT,
  },
  ghost: {
    background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 13, padding: 0,
  },
}
