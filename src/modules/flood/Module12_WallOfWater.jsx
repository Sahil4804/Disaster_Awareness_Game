import { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ── Physics Constants ──
const BASE_SPEED = 5.0
const PENALTY_PER_LB = 0.2
const BAG_WEIGHT = 18         // lbs — typical overloaded Go-Bag from Module 1
const V_FLOOD = 3.0           // units per tick — constant water rise rate
const CANYON_HEIGHT = 100
const FLOOD_TICK_MS = 800

const V_LOADED = BASE_SPEED - (BAG_WEIGHT * PENALTY_PER_LB)  // 1.4
const V_LIGHT = BASE_SPEED                                     // 5.0

const EDU_MSGS = [
  { at: 10, text: 'Flash floods move at 9+ mph — faster than most people can sprint.' },
  { at: 25, text: '6 inches of moving water can knock an adult off their feet.' },
  { at: 40, text: 'Most flash flood deaths occur because people refuse to abandon possessions.' },
  { at: 55, text: 'A cubic yard of water weighs 1,700 lbs. You cannot fight physics.' },
  { at: 70, text: 'In slot canyons, water can rise 30+ feet in minutes with no warning.' },
  { at: 85, text: 'The #1 survival rule: move UP. Everything else is replaceable.' },
]

export default function Module12_FlashFlood() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [playerPos, setPlayerPos] = useState(0)
  const [waterPos, setWaterPos] = useState(0)
  const [bagWeight, setBagWeight] = useState(BAG_WEIGHT)
  const [hasBag, setHasBag] = useState(true)
  const [jettisoned, setJettisoned] = useState(false)
  const [jetMsg, setJetMsg] = useState('')
  const [result, setResult] = useState(null)
  const [climbCount, setClimbCount] = useState(0)
  const [eduMsg, setEduMsg] = useState('')
  const [pulse, setPulse] = useState(false)
  const doneRef = useRef(false)
  const floodRef = useRef(null)

  const vPlayer = BASE_SPEED - (bagWeight * PENALTY_PER_LB)
  const isGaining = vPlayer > V_FLOOD
  const gap = playerPos - waterPos
  const playerPct = (playerPos / CANYON_HEIGHT) * 100
  const waterPct = (waterPos / CANYON_HEIGHT) * 100

  // Pulse animation for jettison button when danger is close
  useEffect(() => {
    if (phase !== 'play' || !hasBag) return
    const id = setInterval(() => setPulse(p => !p), 600)
    return () => clearInterval(id)
  }, [phase, hasBag])

  // Flood rising
  useEffect(() => {
    if (phase !== 'play') return
    doneRef.current = false
    floodRef.current = setInterval(() => {
      if (doneRef.current) return
      setWaterPos(p => parseFloat(Math.min(p + V_FLOOD, CANYON_HEIGHT).toFixed(1)))
    }, FLOOD_TICK_MS)
    return () => clearInterval(floodRef.current)
  }, [phase])

  // Educational messages
  useEffect(() => {
    if (phase !== 'play') return
    const m = EDU_MSGS.find(e => playerPos >= e.at && playerPos < e.at + 8)
    if (m) setEduMsg(m.text)
  }, [playerPos, phase])

  // Win / lose
  useEffect(() => {
    if (phase !== 'play' || doneRef.current) return
    if (playerPos >= CANYON_HEIGHT) {
      doneRef.current = true
      clearInterval(floodRef.current)
      const score = jettisoned && climbCount <= 15 ? 100 : 60
      const r = { score, passed: true }
      setResult(r)
      setPhase('result')
      dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-12', result: r } })
    } else if (waterPos >= playerPos && waterPos > 0) {
      doneRef.current = true
      clearInterval(floodRef.current)
      const r = { score: 0, passed: false }
      setResult(r)
      setPhase('result')
      dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-12', result: r } })
    }
  }, [playerPos, waterPos, phase, jettisoned, climbCount, dispatch])

  const startGame = useCallback(() => {
    setPhase('play'); setPlayerPos(0); setWaterPos(0)
    setBagWeight(BAG_WEIGHT); setHasBag(true); setJettisoned(false)
    setJetMsg(''); setResult(null); setClimbCount(0); setEduMsg('')
    doneRef.current = false
  }, [])

  const handleClimb = useCallback(() => {
    if (phase !== 'play' || doneRef.current) return
    const v = BASE_SPEED - (bagWeight * PENALTY_PER_LB)
    setPlayerPos(p => parseFloat(Math.min(p + v, CANYON_HEIGHT).toFixed(1)))
    setClimbCount(c => c + 1)
  }, [phase, bagWeight])

  const handleJettison = useCallback(() => {
    if (!hasBag || phase !== 'play') return
    setBagWeight(0); setHasBag(false); setJettisoned(true)
    setJetMsg('You dropped everything you packed in Module 1.')
    setTimeout(() => setJetMsg(''), 3500)
  }, [hasBag, phase])

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={S.container}>
        <div style={S.card}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🌊🏔️</div>
          <h1 style={S.title}>Module 12: Wall of Water</h1>
          <h2 style={{ color: '#f87171', fontSize: 18, margin: '8px 0 16px' }}>
            Velocity vs. Encumbrance
          </h2>
          <p style={S.txt}>
            A flash flood is filling this slot canyon. Your only escape: climb straight up.
            But your heavy Go-Bag is slowing you down.
          </p>
          <div style={S.formulaBox}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>
              THE MATH PROBLEM
            </div>
            {[
              ['BASE_SPEED', `= ${BASE_SPEED.toFixed(1)} units/tick`, '#f1f5f9'],
              ['PENALTY_PER_LB', `= ${PENALTY_PER_LB}`, '#f1f5f9'],
              ['Bag Weight', `= ${BAG_WEIGHT} lbs`, '#f87171'],
            ].map(([l, r, c]) => (
              <div key={l} style={S.fRow}>
                <span style={{ color: '#94a3b8' }}>{l}</span>
                <span style={{ color: c }}>{r}</span>
              </div>
            ))}
            <div style={S.divider} />
            <div style={S.fRow}>
              <span style={{ color: '#f87171', fontWeight: 'bold' }}>V_player (with bag)</span>
              <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                = {BASE_SPEED.toFixed(1)} - ({BAG_WEIGHT} x {PENALTY_PER_LB}) = {V_LOADED.toFixed(1)}
              </span>
            </div>
            <div style={S.fRow}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>V_flood</span>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>= {V_FLOOD.toFixed(1)} units/tick</span>
            </div>
            <div style={S.divider} />
            <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: 15, marginTop: 6,
              padding: '8px 12px', background: 'rgba(248,113,113,0.15)', borderRadius: 6 }}>
              {V_LOADED.toFixed(1)} &lt; {V_FLOOD.toFixed(1)} — IMPOSSIBLE to outclimb with your bag.
            </div>
            <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 15, marginTop: 8,
              padding: '8px 12px', background: 'rgba(74,222,128,0.15)', borderRadius: 6 }}>
              Without bag: {V_LIGHT.toFixed(1)} &gt; {V_FLOOD.toFixed(1)} — SURVIVABLE.
            </div>
          </div>
          <p style={{ ...S.txt, color: '#f87171', fontWeight: 'bold', marginTop: 16 }}>
            There is no trick. The math is absolute. Can you make the hard choice?
          </p>
          <button style={S.greenBtn} onClick={startGame}>BEGIN ASCENT</button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    const won = result.passed
    return (
      <div style={S.container}>
        <div style={S.card}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{won ? '🏔️' : '🌊'}</div>
          <h1 style={{ ...S.title, color: won ? '#4ade80' : '#f87171' }}>
            {won ? 'YOU REACHED THE TOP' : 'DROWNED'}
          </h1>
          <div style={{ fontSize: 48, fontWeight: 'bold', margin: '12px 0',
            color: won ? '#4ade80' : '#f87171' }}>{result.score}%</div>
          {won ? (
            jettisoned ? (
              <p style={S.txt}>
                You made the right call. You jettisoned your bag and the math shifted in your
                favor: V_player ({V_LIGHT.toFixed(1)}) &gt; V_flood ({V_FLOOD.toFixed(1)}).
                Material goods are replaceable. You are not.
              </p>
            ) : (
              <p style={{ ...S.txt, color: '#fbbf24' }}>
                You survived, but got lucky. In a real flash flood, keeping that bag would
                have killed you. The math was not on your side.
              </p>
            )
          ) : (
            <div>
              <p style={{ ...S.txt, color: '#f87171' }}>
                The water caught you. With the bag, your climb speed was {V_LOADED.toFixed(1)} units/tick
                against a flood rising at {V_FLOOD.toFixed(1)} units/tick. The math was never going to work.
              </p>
              <p style={{ ...S.txt, color: '#fbbf24', fontWeight: 'bold' }}>
                You needed to jettison the bag. Every item you packed in Module 1 is
                mathematically incompatible with vertical survival.
              </p>
            </div>
          )}
          <div style={S.noteBox}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: 8 }}>PROFESSOR'S NOTE</div>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: 0, fontSize: 14 }}>
              In a flash flood, material goods are mathematically incompatible with vertical
              survival. There is no trick, no shortcut, no cheat code. The penalty from
              encumbrance makes outclimbing the water physically impossible. The only correct
              action is to jettison everything and move. This is the hardest lesson in disaster
              preparedness: knowing when to let go.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={S.greenBtn} onClick={startGame}>RETRY</button>
            <button style={{ ...S.greenBtn, background: '#6366f1' }}
              onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>Back to Modules</button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  const danger = gap < 15 && hasBag
  const pulsing = danger && pulse

  return (
    <div style={S.container}>
      {/* HUD */}
      <div style={S.hud}>
        <span style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: 16 }}>Module 12: Wall of Water</span>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>
          Climbs: {climbCount} | Height: {playerPos.toFixed(1)}/{CANYON_HEIGHT}
        </span>
      </div>

      {/* Main layout: stats + canyon */}
      <div style={S.playArea}>
        {/* Stats panel */}
        <div style={S.stats}>
          <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 15, marginBottom: 10 }}>LIVE PHYSICS</div>
          {[
            ['Bag Weight:', `${bagWeight} lbs ${hasBag ? '(LOADED)' : '(JETTISONED)'}`, hasBag ? '#f87171' : '#4ade80'],
            ['V_player:', `${vPlayer.toFixed(1)} u/tick`, isGaining ? '#4ade80' : '#f87171'],
            ['V_flood:', `${V_FLOOD.toFixed(1)} u/tick`, '#38bdf8'],
          ].map(([label, val, color]) => (
            <div key={label} style={S.sRow}>
              <span style={{ color: '#94a3b8' }}>{label}</span>
              <span style={{ color, fontWeight: 'bold', fontSize: label === 'Bag Weight:' ? 14 : 18 }}>{val}</span>
            </div>
          ))}
          <div style={{ ...S.divider, margin: '10px 0' }} />
          <div style={{
            padding: '8px 10px', borderRadius: 6, fontWeight: 'bold', fontSize: 14, textAlign: 'center',
            background: isGaining ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
            color: isGaining ? '#4ade80' : '#f87171',
            border: `1px solid ${isGaining ? '#4ade80' : '#f87171'}`,
          }}>
            {isGaining ? `GAINING: +${(vPlayer - V_FLOOD).toFixed(1)} u/tick` : `LOSING: ${(vPlayer - V_FLOOD).toFixed(1)} u/tick`}
          </div>
          <div style={{ marginTop: 10 }}>
            {[
              ['Player:', `${playerPos.toFixed(1)} / ${CANYON_HEIGHT}`, '#f1f5f9'],
              ['Water:', `${waterPos.toFixed(1)} / ${CANYON_HEIGHT}`, '#38bdf8'],
              ['Gap:', `${gap.toFixed(1)} units`, gap > 20 ? '#4ade80' : gap > 5 ? '#fbbf24' : '#f87171'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ ...S.sRow, fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>{l}</span>
                <span style={{ color: c, fontWeight: l === 'Gap:' ? 'bold' : 'normal' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 8, background: '#0f172a', borderRadius: 6,
            fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
            V = {BASE_SPEED.toFixed(1)} - (weight x {PENALTY_PER_LB})<br />
            With bag: {BASE_SPEED.toFixed(1)} - ({BAG_WEIGHT} x {PENALTY_PER_LB}) = {V_LOADED.toFixed(1)}<br />
            No bag: {BASE_SPEED.toFixed(1)} - (0 x {PENALTY_PER_LB}) = {V_LIGHT.toFixed(1)}
          </div>
          {eduMsg && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(56,189,248,0.1)',
              border: '1px solid #38bdf8', borderRadius: 6, color: '#38bdf8', fontSize: 12, lineHeight: 1.5 }}>
              {eduMsg}
            </div>
          )}
        </div>

        {/* Canyon visualization */}
        <div style={S.canyonWrap}>
          <div style={{ textAlign: 'center', color: '#4ade80', fontWeight: 'bold',
            fontSize: 13, marginBottom: 4, letterSpacing: 1 }}>
            HIGH-WATER MARK — {CANYON_HEIGHT} units — SAFETY
          </div>
          <div style={S.canyon}>
            {/* Canyon walls */}
            <div style={S.wallL} />
            <div style={S.wallR} />
            {/* Canyon interior */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 40, right: 40,
              background: 'linear-gradient(180deg, #1a1207, #2d1f0e 30%, #3d2914 60%, #4a3520)', zIndex: 0 }} />
            {/* Rock texture */}
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} style={{ position: 'absolute', top: `${8 + i * 8}%`,
                [i % 2 === 0 ? 'left' : 'right']: 6, width: 28, height: 2,
                background: 'rgba(120,80,40,0.4)', borderRadius: 1, zIndex: 2 }} />
            ))}
            {/* Water */}
            <div style={{ position: 'absolute', bottom: 0, left: 40, right: 40,
              height: `${Math.min(waterPct, 100)}%`,
              background: 'linear-gradient(0deg, #1e3a5f, #2563eb 40%, #3b82f6 70%, rgba(59,130,246,0.7))',
              transition: 'height 0.4s linear', zIndex: 3 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: 'linear-gradient(90deg, transparent, rgba(147,197,253,0.6), transparent, rgba(147,197,253,0.4), transparent)' }} />
              {waterPct > 5 && <div style={{ position: 'absolute', top: -6, left: '50%',
                transform: 'translateX(-50%)', fontSize: 16, opacity: 0.8 }}>🌊</div>}
            </div>
            {/* Player */}
            <div style={{ position: 'absolute', bottom: `${Math.min(playerPct, 98)}%`, left: '50%',
              transform: 'translateX(-50%)', zIndex: 5, textAlign: 'center',
              transition: 'bottom 0.25s ease-out' }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>🧗</div>
              {hasBag && <div style={{ fontSize: 14, position: 'absolute', top: -2, right: -14 }}>🎒</div>}
            </div>
            {/* Height markers */}
            {[25, 50, 75, 100].map(h => (
              <div key={h} style={{ position: 'absolute', bottom: `${h}%`, left: 42, right: 42,
                borderTop: '1px dashed rgba(241,245,249,0.15)', zIndex: 1 }}>
                <span style={{ position: 'absolute', right: 2, top: -12,
                  fontSize: 9, color: 'rgba(241,245,249,0.3)' }}>{h}</span>
              </div>
            ))}
            {/* Safety line at top */}
            <div style={{ position: 'absolute', top: 0, left: 40, right: 40, height: 3,
              background: '#4ade80', zIndex: 6 }} />
          </div>
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 4 }}>
            Canyon Floor — 0 units
          </div>
        </div>
      </div>

      {/* Jettison overlay */}
      {jetMsg && (
        <div style={{ position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(15,23,42,0.95)', border: '3px solid #f87171', borderRadius: 12,
          padding: '24px 32px', zIndex: 100, textAlign: 'center',
          boxShadow: '0 0 40px rgba(248,113,113,0.5)', maxWidth: 400 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎒💨</div>
          <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>BAG JETTISONED</div>
          <div style={{ color: '#f1f5f9', fontSize: 15, lineHeight: 1.6 }}>{jetMsg}</div>
          <div style={{ color: '#4ade80', fontWeight: 'bold', fontSize: 14, marginTop: 10 }}>
            V_player: {V_LOADED.toFixed(1)} → {V_LIGHT.toFixed(1)} u/tick
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center',
        flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={handleClimb} style={S.climbBtn}>
          CLIMB (+{vPlayer.toFixed(1)} units)
        </button>
        {hasBag && (
          <button onClick={handleJettison} style={{
            padding: '14px 28px', fontSize: 18, fontWeight: 'bold', color: '#fff',
            border: '3px solid #fbbf24', borderRadius: 12, cursor: 'pointer', letterSpacing: 1,
            transition: 'all 0.3s ease',
            boxShadow: pulsing ? '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.4)' : '0 0 15px rgba(239,68,68,0.4)',
            transform: pulsing ? 'scale(1.05)' : 'scale(1)',
            background: pulsing ? 'linear-gradient(135deg, #ff2020, #dc2626)' : 'linear-gradient(135deg, #ef4444, #b91c1c)',
          }}>
            JETTISON BAG (-{BAG_WEIGHT} lbs)
          </button>
        )}
      </div>

      {/* Danger warning */}
      {danger && (
        <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: 14, textAlign: 'center',
          padding: '6px 16px', background: 'rgba(248,113,113,0.15)', borderRadius: 6,
          border: '1px solid #f87171', marginTop: 6, maxWidth: 500 }}>
          WATER IS {gap.toFixed(1)} UNITS BELOW YOU — DROP THE BAG OR DROWN
        </div>
      )}
    </div>
  )
}

// ── Styles ──
const S = {
  container: {
    minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: 16, fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f1f5f9',
  },
  card: {
    maxWidth: 620, background: '#1e293b', borderRadius: 16, padding: '32px 28px',
    textAlign: 'center', marginTop: 32, border: '1px solid #334155',
  },
  title: { color: '#f1f5f9', fontSize: 28, margin: '12px 0 4px', fontWeight: 'bold' },
  txt: { color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, margin: '10px 0' },
  formulaBox: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
    padding: '16px 20px', marginTop: 16, textAlign: 'left',
  },
  fRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 14 },
  divider: { height: 1, background: '#334155', margin: '8px 0' },
  greenBtn: {
    padding: '14px 40px', fontSize: 18, fontWeight: 'bold', background: '#22c55e',
    color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', marginTop: 18, letterSpacing: 1,
  },
  noteBox: {
    background: '#0f172a', border: '1px solid #334155', borderRadius: 10,
    padding: '16px 20px', marginTop: 16, textAlign: 'left',
  },
  hud: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
    maxWidth: 800, padding: '10px 16px', background: '#1e293b', borderRadius: 10,
    marginBottom: 10, border: '1px solid #334155',
  },
  playArea: {
    display: 'flex', gap: 16, width: '100%', maxWidth: 800,
    alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center',
  },
  stats: {
    width: 240, background: '#1e293b', borderRadius: 10, padding: '14px 16px',
    border: '1px solid #334155', flexShrink: 0,
  },
  sRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 14 },
  canyonWrap: { flex: 1, minWidth: 200, maxWidth: 320 },
  canyon: {
    position: 'relative', width: '100%', height: 460, borderRadius: 8,
    overflow: 'hidden', border: '2px solid #334155', background: '#0a0a0a',
  },
  wallL: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: 40, zIndex: 4,
    background: 'linear-gradient(180deg, #3d2914, #5c3d1f 30%, #7a5230 60%, #5c3d1f 80%, #3d2914)',
    borderRight: '2px solid #2d1f0e',
  },
  wallR: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: 40, zIndex: 4,
    background: 'linear-gradient(180deg, #3d2914, #5c3d1f 30%, #7a5230 60%, #5c3d1f 80%, #3d2914)',
    borderLeft: '2px solid #2d1f0e',
  },
  climbBtn: {
    padding: '14px 32px', fontSize: 18, fontWeight: 'bold', color: '#fff', border: 'none',
    borderRadius: 10, cursor: 'pointer', letterSpacing: 1,
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    boxShadow: '0 0 15px rgba(34,197,94,0.4)',
  },
}
