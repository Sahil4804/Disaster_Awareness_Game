import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useGame } from '../../context/GameContext'

// ── Audio: Electrical Hum Engine ──
function useElectricalHum() {
  const audioCtxRef = useRef(null)
  const osc1Ref = useRef(null)
  const osc2Ref = useRef(null)
  const gainRef = useRef(null)
  const distortionRef = useRef(null)
  const mutedRef = useRef(false)
  const [muted, setMuted] = useState(false)
  const startedRef = useRef(false)

  // Lazily create AudioContext (must happen after user gesture)
  const ensureAudioCtx = useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    // Gain node for volume control
    const gain = ctx.createGain()
    gain.gain.value = 0
    gainRef.current = gain

    // Waveshaper distortion node
    const distortion = ctx.createWaveShaper()
    distortion.curve = makeDistortionCurve(0)
    distortion.oversample = '4x'
    distortionRef.current = distortion

    // Primary oscillator: base AC hum
    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.value = 60
    osc1Ref.current = osc1

    // Second oscillator: beat frequency for realism
    const osc2 = ctx.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.value = 62
    osc2Ref.current = osc2

    osc1.connect(distortion)
    osc2.connect(distortion)
    distortion.connect(gain)
    gain.connect(ctx.destination)

    osc1.start()
    osc2.start()
    startedRef.current = true

    return ctx
  }, [])

  // Generate a waveshaper distortion curve
  function makeDistortionCurve(amount) {
    const k = amount
    const samples = 44100
    const curve = new Float32Array(samples)
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = k > 0 ? ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)) : x
    }
    return curve
  }

  // Update hum based on playerVoltage (0-1)
  const updateHum = useCallback((voltage) => {
    if (!startedRef.current) return
    const ctx = audioCtxRef.current
    if (!ctx || ctx.state === 'closed') return
    const now = ctx.currentTime

    // Volume: silence at 0, max at 1
    const vol = mutedRef.current ? 0 : Math.pow(voltage, 1.5) * 0.35
    gainRef.current.gain.linearRampToValueAtTime(vol, now + 0.1)

    // Pitch: 60Hz at low voltage, 180Hz at max
    const freq1 = 60 + voltage * 120
    const freq2 = freq1 + 2 + voltage * 6 // slight detune for beat
    osc1Ref.current.frequency.linearRampToValueAtTime(freq1, now + 0.1)
    osc2Ref.current.frequency.linearRampToValueAtTime(freq2, now + 0.1)

    // Distortion: none at low voltage, heavy at high
    const distAmount = voltage > 0.7 ? (voltage - 0.7) / 0.3 * 400 : 0
    distortionRef.current.curve = makeDistortionCurve(distAmount)
  }, [])

  // Zap sound: short burst of white noise + high frequency
  const playZap = useCallback(() => {
    const ctx = ensureAudioCtx()
    if (!ctx || mutedRef.current) return

    const now = ctx.currentTime
    const duration = 0.25

    // White noise buffer
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    // High frequency oscillator burst
    const zapOsc = ctx.createOscillator()
    zapOsc.type = 'square'
    zapOsc.frequency.value = 800
    zapOsc.frequency.linearRampToValueAtTime(200, now + duration)

    const zapGain = ctx.createGain()
    zapGain.gain.setValueAtTime(0.5, now)
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + duration)

    noise.connect(zapGain)
    zapOsc.connect(zapGain)
    zapGain.connect(ctx.destination)

    noise.start(now)
    noise.stop(now + duration)
    zapOsc.start(now)
    zapOsc.stop(now + duration)
  }, [ensureAudioCtx])

  // Footstep splash: low thump + brief noise burst
  const playSplash = useCallback(() => {
    const ctx = ensureAudioCtx()
    if (!ctx || mutedRef.current) return
    const now = ctx.currentTime

    // Low thump
    const thump = ctx.createOscillator()
    thump.type = 'sine'
    thump.frequency.setValueAtTime(120, now)
    thump.frequency.exponentialRampToValueAtTime(40, now + 0.15)
    const thumpGain = ctx.createGain()
    thumpGain.gain.setValueAtTime(0.3, now)
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    thump.connect(thumpGain)
    thumpGain.connect(ctx.destination)
    thump.start(now)
    thump.stop(now + 0.18)

    // Short noise splat
    const bufLen = Math.floor(ctx.sampleRate * 0.06)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen) * 0.4
    const splat = ctx.createBufferSource()
    splat.buffer = buf
    const splatGain = ctx.createGain()
    splatGain.gain.setValueAtTime(0.25, now)
    splat.connect(splatGain)
    splatGain.connect(ctx.destination)
    splat.start(now)
  }, [ensureAudioCtx])

  // Ambient water gurgle — looping noise shaped with LFO
  const startAmbientRef = useRef(null)
  const ambientGainRef = useRef(null)
  const startAmbient = useCallback(() => {
    const ctx = ensureAudioCtx()
    if (!ctx || startAmbientRef.current) return

    const bufLen = ctx.sampleRate * 2
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1

    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true

    // Bandpass filter to make it sound like water
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 600
    filter.Q.value = 0.8

    // LFO for gurgling rhythm
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 1.4
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 180
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)

    const aGain = ctx.createGain()
    aGain.gain.value = mutedRef.current ? 0 : 0.06
    ambientGainRef.current = aGain

    src.connect(filter)
    filter.connect(aGain)
    aGain.connect(ctx.destination)

    src.start()
    lfo.start()
    startAmbientRef.current = true
  }, [ensureAudioCtx])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev
      mutedRef.current = next
      const ctx = audioCtxRef.current
      if (ctx && ctx.state !== 'closed') {
        const now = ctx.currentTime
        if (gainRef.current)
          gainRef.current.gain.linearRampToValueAtTime(next ? 0 : 0.1, now + 0.05)
        if (ambientGainRef.current)
          ambientGainRef.current.gain.linearRampToValueAtTime(next ? 0 : 0.06, now + 0.05)
      }
      return next
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (osc1Ref.current) { try { osc1Ref.current.stop() } catch(e) {/* noop */} }
      if (osc2Ref.current) { try { osc2Ref.current.stop() } catch(e) {/* noop */} }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close()
      }
    }
  }, [])

  return { ensureAudioCtx, updateHum, playZap, playSplash, startAmbient, toggleMute, muted }
}

const ROWS = 10
const COLS = 8
const ELECTRIC_RADIUS = 2
const START = { r: 9, c: 0 }
const END = { r: 0, c: 7 }

// Power line positions (fixed for consistent gameplay)
const POWER_LINES = [
  { r: 5, c: 6 },
  { r: 3, c: 0 },
  { r: 1, c: 4 },
  { r: 9, c: 3 },
  { r: 8, c: 6 },
]

const PROXIMITY_MESSAGES = [
  { maxDist: ELECTRIC_RADIUS, message: '\u26a1\u26a1 DANGER: Hair standing on end \u2014 electricity very close!' },
  { maxDist: ELECTRIC_RADIUS + 1, message: '\u26a1 Caution: Electrical hum getting louder...' },
  { maxDist: ELECTRIC_RADIUS + 2, message: '\u26a1 Warning: You feel a slight tingling in your feet...' },
]

function dist(r1, c1, r2, c2) {
  return Math.sqrt((r1 - r2) ** 2 + (c1 - c2) ** 2)
}

function getMinPowerLineDist(r, c) {
  let minD = Infinity
  for (const pl of POWER_LINES) {
    const d = dist(r, c, pl.r, pl.c)
    if (d < minD) minD = d
  }
  return minD
}

function isElectric(r, c) {
  return getMinPowerLineDist(r, c) <= ELECTRIC_RADIUS
}

function isAdjacent(r1, c1, r2, c2) {
  const dr = Math.abs(r1 - r2)
  const dc = Math.abs(c1 - c2)
  return (dr <= 1 && dc <= 1) && (dr + dc > 0)
}

// Check if a safe path exists (BFS)
function safePath() {
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
  const queue = [START]
  visited[START.r][START.c] = true
  while (queue.length > 0) {
    const { r, c } = queue.shift()
    if (r === END.r && c === END.c) return true
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        const nr = r + dr, nc = c + dc
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue
        if (visited[nr][nc]) continue
        if (isElectric(nr, nc)) continue
        visited[nr][nc] = true
        queue.push({ r: nr, c: nc })
      }
    }
  }
  return false
}

const TILE_SIZE = 48
const BASE_SCORE = 200
const EFFICIENCY_BONUS = 100

export default function InvisibleTrapModule() {
  const { dispatch } = useGame()
  const { ensureAudioCtx, updateHum, playZap, playSplash, startAmbient, toggleMute, muted } = useElectricalHum()

  const [phase, setPhase] = useState('intro') // intro | play | dead | result
  const [path, setPath] = useState([START])
  const [revealed, setRevealed] = useState([]) // tiles revealed as dangerous after death
  const [totalScore, setTotalScore] = useState(0)
  const [deathMsg, setDeathMsg] = useState('')

  const playerPos = path[path.length - 1]

  // Compute voltage for each tile (for shimmer)
  const tileData = useMemo(() => {
    const data = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const d = getMinPowerLineDist(r, c)
        const electric = d <= ELECTRIC_RADIUS
        const voltage = electric ? Math.max(0, 1 - d / ELECTRIC_RADIUS) : 0
        // Subtle visual cue: faint shimmer for tiles near power lines
        const shimmerOpacity = electric ? 0.08 + voltage * 0.12 : 0
        data.push({ r, c, electric, voltage, shimmerOpacity })
      }
    }
    return data
  }, [])

  // Voltage indicator based on player proximity
  const playerVoltage = useMemo(() => {
    const d = getMinPowerLineDist(playerPos.r, playerPos.c)
    if (d > ELECTRIC_RADIUS + 2) return 0
    return Math.max(0, Math.min(1, 1 - (d - 1) / (ELECTRIC_RADIUS + 2)))
  }, [playerPos])

  // Update electrical hum volume/pitch based on proximity
  useEffect(() => {
    if (phase === 'play') {
      updateHum(playerVoltage)
    } else {
      updateHum(0)
    }
  }, [playerVoltage, phase, updateHum])

  const handleTileClick = useCallback((r, c) => {
    if (phase !== 'play') return
    if (!isAdjacent(playerPos.r, playerPos.c, r, c)) return
    // Check if already in path (no backtracking)
    if (path.some(p => p.r === r && p.c === c)) return

    if (isElectric(r, c)) {
      // DEAD — play zap sound (overrides splash)
      playZap()
      setPath(prev => [...prev, { r, c }])
      setRevealed(POWER_LINES.map(pl => ({ ...pl })))
      setDeathMsg(
        `⚡ ELECTROCUTED! You stepped into water electrified by a submerged power line! ` +
        `Water conducts electricity — even standing 20 feet from a downed line in floodwater can be fatal. ` +
        `The voltage spreads through water in ALL directions!`
      )
      setPhase('dead')
      return
    }

    // Safe step — play water splash
    playSplash()
    const newPath = [...path, { r, c }]
    setPath(newPath)

    // Check if reached end
    if (r === END.r && c === END.c) {
      // Calculate score
      // Optimal path would be roughly ROWS + COLS steps
      const optimalSteps = ROWS + COLS - 2
      const efficiency = Math.max(0, 1 - (newPath.length - optimalSteps) / (optimalSteps * 2))
      const efficiencyPts = Math.round(EFFICIENCY_BONUS * efficiency)
      const rawTotal = BASE_SCORE + efficiencyPts
      // Normalize to 0-100 (max raw is BASE_SCORE + EFFICIENCY_BONUS = 300)
      const total = Math.round((rawTotal / (BASE_SCORE + EFFICIENCY_BONUS)) * 100)
      setTotalScore(total)
      setRevealed(POWER_LINES.map(pl => ({ ...pl })))
      setPhase('result')
    }
  }, [phase, playerPos, path])

  const resetGame = () => {
    ensureAudioCtx()
    startAmbient()
    setPath([START])
    setRevealed([])
    setDeathMsg('')
    setPhase('play')
  }

  const finishModule = () => {
    const passed = phase === 'result' && totalScore > 0
    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-10', result: { score: totalScore, passed } }
    })
    dispatch({ type: 'BACK_TO_MODULES' })
  }

  const voltageColor = playerVoltage > 0.6 ? '#ef4444' : playerVoltage > 0.3 ? '#f97316' : playerVoltage > 0 ? '#fbbf24' : '#22c55e'
  const voltageLabel = playerVoltage > 0.6 ? 'DANGER!' : playerVoltage > 0.3 ? 'Warning' : playerVoltage > 0 ? 'Caution' : 'Safe'

  // Proximity warning message
  const proximityMsg = useMemo(() => {
    const d = getMinPowerLineDist(playerPos.r, playerPos.c)
    for (const pm of PROXIMITY_MESSAGES) {
      if (d <= pm.maxDist) return pm.message
    }
    return null
  }, [playerPos])

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>⚡</div>
          <h1 style={styles.title}>Module 10: Invisible Trap</h1>
          <p style={styles.text}>
            Floodwater has submerged downed power lines. The water looks calm,
            but invisible electricity spreads through it in every direction.
          </p>
          <div style={{ ...styles.infoBox, background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' }}>
            <p style={{ ...styles.text, fontWeight: 'bold', color: '#ef4444' }}>☠️ Water + Electricity = Instant Death</p>
            <p style={styles.text}>
              Even at 20+ feet away, a submerged power line can deliver a lethal shock through water.
              You CANNOT see where the electricity is — only faint clues hint at danger.
            </p>
          </div>
          <div style={{ ...styles.infoBox, background: 'rgba(56,189,248,0.1)', borderColor: '#38bdf8' }}>
            <p style={styles.text}>🎯 Navigate from 🟢 START to 🏁 SAFE GROUND</p>
            <p style={styles.text}>⚡ Watch the voltage meter — it rises near danger</p>
            <p style={styles.text}>✨ Look for faint shimmer on suspicious tiles</p>
            <p style={styles.text}>🔀 Click adjacent tiles to move (including diagonal)</p>
          </div>
          <button style={styles.btnPrimary} onClick={() => { ensureAudioCtx(); startAmbient(); setPhase('play') }}>
            Enter the Floodwater ⚡
          </button>
          <button style={styles.btnBack} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── DEAD ──
  if (phase === 'dead') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>💀</div>
          <h1 style={{ ...styles.title, color: '#ef4444' }}>ELECTROCUTED!</h1>
          <p style={{ ...styles.text, fontSize: 16, lineHeight: 1.7, textAlign: 'center' }}>
            {deathMsg}
          </p>
          {/* Mini grid showing danger zones */}
          <p style={{ ...styles.text, fontSize: 14, color: '#f97316', fontWeight: 'bold', textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
            ⚡ DANGER ZONES REVEALED ⚡
          </p>
          <div style={{ marginTop: 0 }}>
            {renderGrid(true)}
          </div>
          <p style={{ ...styles.text, fontSize: 13, color: '#f97316', textAlign: 'center' }}>
            ⚡ Red zones show the electricity radius around each power line.
            The danger extends FAR from the source!
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={styles.btnPrimary} onClick={resetGame}>
              Try Again 🔄
            </button>
            <button style={styles.btnBack} onClick={finishModule}>
              Finish (0 pts)
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT (survived) ──
  if (phase === 'result') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>🎉</div>
          <h1 style={styles.title}>You Survived!</h1>
          <div style={{ ...styles.scoreBox, borderColor: '#22c55e' }}>
            <span style={{ fontSize: 36, fontWeight: 'bold', color: '#22c55e' }}>
              {totalScore}%
            </span>
            <span style={styles.text}> efficiency score</span>
          </div>
          <p style={{ ...styles.text, textAlign: 'center' }}>
            You navigated {path.length} steps to reach safe ground.
          </p>
          {/* Mini grid showing path + danger zones */}
          <p style={{ ...styles.text, fontSize: 14, color: '#f97316', fontWeight: 'bold', textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
            ⚡ DANGER ZONES REVEALED ⚡
          </p>
          <div style={{ marginTop: 0 }}>
            {renderGrid(true)}
          </div>
          <div style={{ ...styles.infoBox, background: 'rgba(251,191,36,0.1)', borderColor: '#fbbf24', marginTop: 12 }}>
            <p style={styles.text}>
              💡 <strong>Remember:</strong> After a flood, NEVER walk through standing water near downed
              power lines. Water conducts electricity and the danger zone extends far beyond what you can see.
              Always assume downed lines are LIVE. Call 911 and wait for utility crews.
            </p>
          </div>
          <button style={styles.btnPrimary} onClick={finishModule}>
            Complete Module ✅
          </button>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  function renderGrid(mini = false) {
    const size = mini ? 36 : TILE_SIZE
    const showDanger = mini || phase === 'dead' || phase === 'result'
    return (
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${COLS}, ${size}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${size}px)`,
        gap: 2,
        borderRadius: 8,
        padding: 4,
        background: '#0f172a',
        border: '2px solid #334155',
      }}>
        {Array.from({ length: ROWS * COLS }, (_, idx) => {
          const r = Math.floor(idx / COLS)
          const c = idx % COLS
          const td = tileData[idx]
          const isStart = r === START.r && c === START.c
          const isEnd = r === END.r && c === END.c
          const isPlayer = r === playerPos.r && c === playerPos.c && !mini
          const inPath = path.some(p => p.r === r && p.c === c)
          const isPowerLine = POWER_LINES.some(pl => pl.r === r && pl.c === c)
          const adj = !mini && isAdjacent(playerPos.r, playerPos.c, r, c) && !inPath && phase === 'play'

          let bg = '#1e3a5f'
          if (showDanger && td.electric) bg = `rgba(239,68,68,${0.15 + td.voltage * 0.35})`
          else if (inPath) bg = 'rgba(56,189,248,0.25)'
          if (isStart) bg = 'rgba(34,197,94,0.3)'
          if (isEnd) bg = 'rgba(251,191,36,0.3)'
          if (showDanger && isPowerLine) bg = 'rgba(239,68,68,0.7)'

          // Shimmer effect with increasing intensity near power lines
          let shimmer = null
          if (!showDanger && td.shimmerOpacity > 0 && !inPath) {
            const intensity = td.voltage
            const r_col = Math.round(251 + (239 - 251) * intensity)
            const g_col = Math.round(191 - 191 * intensity * 0.5)
            const b_col = Math.round(36 - 36 * intensity)
            shimmer = {
              position: 'absolute', inset: 0, borderRadius: 4,
              background: `radial-gradient(circle, rgba(${r_col},${g_col},${b_col},${td.shimmerOpacity * 1.5}) 0%, transparent 70%)`,
              pointerEvents: 'none',
            }
          }

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => !mini && handleTileClick(r, c)}
              style={{
                width: size, height: size, borderRadius: 4,
                background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: adj ? 'pointer' : 'default',
                border: adj ? '2px solid rgba(96,165,250,0.5)' : isPlayer ? '2px solid #38bdf8' : '1px solid rgba(51,65,85,0.5)',
                position: 'relative',
                fontSize: mini ? 14 : 20,
                transition: 'background 0.2s, border 0.2s',
                boxShadow: isPlayer ? '0 0 12px rgba(56,189,248,0.5)' : 'none',
              }}
            >
              {shimmer && <div style={shimmer} />}
              {isPlayer && '🧍'}
              {!isPlayer && isStart && (mini ? '' : '🟢')}
              {isEnd && '🏁'}
              {showDanger && isPowerLine && !isPlayer && '⚡'}
              {inPath && !isPlayer && !isStart && !isEnd && !(showDanger && isPowerLine) && (
                <div style={{
                  width: mini ? 6 : 8, height: mini ? 6 : 8, borderRadius: '50%',
                  background: '#38bdf8', opacity: 0.6,
                }} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={styles.container}>

      {/* ── Top bar: back + title ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', maxWidth: COLS * (TILE_SIZE + 2) + 8,
        marginBottom: 10,
      }}>
        <button
          style={{
            background: 'rgba(255,255,255,0.07)', border: '1px solid #475569',
            color: '#f1f5f9', borderRadius: 8, padding: '7px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
          onClick={() => { dispatch({ type: 'BACK_TO_MODULES' }) }}
        >
          ← Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
          ⚡ Module 10 — Invisible Trap
        </span>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          Steps: {path.length - 1}
        </span>
      </div>

      {/* Voltage meter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
        background: '#1e293b', padding: '10px 20px', borderRadius: 12,
        border: `1px solid ${voltageColor}44`,
        width: '100%', maxWidth: COLS * (TILE_SIZE + 2) + 8,
        justifyContent: 'space-between',
      }}>
        <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 'bold' }}>⚡ Voltage:</span>
        <div style={{ flex: 1, height: 16, background: '#0f172a', borderRadius: 8, overflow: 'hidden', margin: '0 8px' }}>
          <div style={{
            height: '100%', borderRadius: 8,
            background: `linear-gradient(90deg, #22c55e, #fbbf24, #ef4444)`,
            width: `${Math.max(5, playerVoltage * 100)}%`,
            transition: 'width 0.3s',
            boxShadow: playerVoltage > 0.5 ? `0 0 10px ${voltageColor}` : 'none',
          }} />
        </div>
        <span style={{ color: voltageColor, fontWeight: 'bold', fontSize: 13, minWidth: 60, textAlign: 'right' }}>
          {voltageLabel}
        </span>
        <button
          onClick={toggleMute}
          title={muted ? 'Unmute sound' : 'Mute sound'}
          style={{
            background: 'transparent',
            border: '1px solid #475569',
            borderRadius: 8,
            color: '#f1f5f9',
            fontSize: 18,
            cursor: 'pointer',
            padding: '2px 8px',
            lineHeight: 1,
          }}
        >
          {muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'}
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {renderGrid(false)}
      </div>

      {/* Legend + info */}
      <div style={{
        display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center',
        background: '#1e293b', padding: '10px 16px', borderRadius: 10,
        maxWidth: COLS * (TILE_SIZE + 2) + 8, width: '100%',
      }}>
        <span style={{ color: '#f1f5f9', fontSize: 12 }}>🟢 Start</span>
        <span style={{ color: '#f1f5f9', fontSize: 12 }}>🏁 Safe Ground</span>
        <span style={{ color: '#f1f5f9', fontSize: 12 }}>🧍 You</span>
        <span style={{ color: '#fbbf24', fontSize: 12 }}>✨ = suspicious shimmer</span>
      </div>

      {/* Proximity warning */}
      {proximityMsg && (
        <div style={{
          marginTop: 8, padding: '8px 16px', borderRadius: 8,
          background: voltageColor === '#ef4444' ? 'rgba(239,68,68,0.2)' : voltageColor === '#f97316' ? 'rgba(249,115,22,0.15)' : 'rgba(251,191,36,0.1)',
          border: `1px solid ${voltageColor}66`,
          color: voltageColor, fontSize: 14, fontWeight: 'bold', textAlign: 'center',
          maxWidth: COLS * (TILE_SIZE + 2) + 8, width: '100%',
        }}>
          {proximityMsg}
        </div>
      )}

      {/* Hint */}
      <div style={{ marginTop: 8, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
        Click any highlighted adjacent tile to move · Diagonal moves allowed
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
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#1e293b',
    borderRadius: 20,
    padding: '28px 24px',
    maxWidth: 520,
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
    color: '#f1f5f9',
    margin: '4px 0',
    fontSize: 15,
    lineHeight: 1.5,
  },
  infoBox: {
    border: '1px solid',
    borderRadius: 12,
    padding: '12px 16px',
    width: '100%',
  },
  scoreBox: {
    border: '2px solid',
    borderRadius: 16,
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
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
