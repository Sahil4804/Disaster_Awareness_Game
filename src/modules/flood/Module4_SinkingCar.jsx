/**
 * Module 4 — The Sinking Car: Pressure Differential QTE
 * First-person dashboard. Center Punch (fast) or PSI Equalization (patient).
 * Rapid door-handle clicking wastes O2 — the core tension mechanic.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

/* ───────────────────── physics constants ─────────────────────── */
const TICK_MS       = 200
const EXT_PSI_RATE  = 0.3     // external PSI gain per tick
const INT_PSI_RATE  = 0.15    // internal PSI gain per tick (water seepage)
const O2_BASE_DRAIN = 0.1     // O2 % lost per tick (baseline breathing)
const O2_CLICK_COST = 2       // O2 % lost per door-handle click
const LOCK_THRESH   = 0.5     // door locked when ext - int > this
const MAX_PSI       = 30      // pressure cap

/* ───────────────────── helpers ───────────────────────────────── */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function computeScore(method, o2Remaining) {
  if (method === 'centerPunch') return 100
  if (method === 'door') {
    if (o2Remaining > 50) return 70
    if (o2Remaining > 10) return 30
    return 30
  }
  return 0
}

/* ───────────────────── keyframe injection ────────────────────── */
let kfInjected = false
function injectKeyframes() {
  if (kfInjected) return
  kfInjected = true
  const el = document.createElement('style')
  el.textContent = `
    @keyframes pulseBorder {
      0%, 100% { box-shadow: 0 0 8px rgba(68,170,255,0.3); }
      50%      { box-shadow: 0 0 20px rgba(68,170,255,0.6); }
    }
    @keyframes o2Pulse {
      0%, 100% { opacity: 0; }
      50%      { opacity: 1; }
    }
    @keyframes bubbleUp {
      0%   { transform: translateY(0) scale(1); opacity: 0.6; }
      100% { transform: translateY(-520px) scale(0.4); opacity: 0; }
    }
  `
  document.head.appendChild(el)
}

/* ── reusable inline-style fragments ── */
const detailLine = { fontSize: '.9rem', color: '#99aabb', marginBottom: 6, lineHeight: 1.6 }
const makeBtn = (p) => ({
  padding: '12px 36px', borderRadius: 8, fontSize: '.9rem', fontWeight: 700,
  cursor: 'pointer', letterSpacing: 2,
  background: p ? 'linear-gradient(180deg,#2266aa,#114488)' : 'transparent',
  border: `2px solid ${p ? '#4488cc' : '#555'}`, color: p ? '#fff' : '#aaa',
})
const overlayBase = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 30,
  textAlign: 'center', fontFamily: "'Courier New', monospace", color: '#e0e0e0',
}

/* ═══════════════════════════════════════════════════════════════════
   GAUGE SUB-COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
function Gauge({ label, color, value, pct }) {
  return (
    <div style={{
      flex: '1 1 220px', maxWidth: 280, background: '#0d0d14',
      border: `1px solid ${color}44`, borderRadius: 8,
      padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{
        fontSize: '.65rem', fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color,
      }}>{label}</div>
      <div style={{
        width: '100%', height: 14, background: '#1a1a24',
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          width: `${clamp(pct, 0, 100)}%`, height: '100%',
          background: `linear-gradient(90deg,${color}88,${color})`,
          borderRadius: 4, transition: 'width .2s linear',
        }} />
      </div>
      <div style={{
        fontSize: '1.1rem', fontWeight: 800, color,
        textAlign: 'right', textShadow: `0 0 8px ${color}66`,
      }}>{value}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function Module4_SinkingCar() {
  const { dispatch: gameDispatch } = useGame()
  useEffect(() => { injectKeyframes() }, [])

  /* ── core state (EXACT names per spec) ── */
  const [phase, setPhase]             = useState('intro')   // intro | sim | result
  const [externalPSI, setExternalPSI] = useState(0)
  const [internalPSI, setInternalPSI] = useState(0)
  const [o2Level, setO2Level]         = useState(100)
  const [doorLocked, setDoorLocked]   = useState(true)

  /* ── auxiliary state ── */
  const [ticks, setTicks]                   = useState(0)
  const [gloveBoxOpen, setGloveBoxOpen]     = useState(false)
  const [hasCenterPunch, setHasCenterPunch] = useState(false)
  const [punchEquipped, setPunchEquipped]   = useState(false)
  const [windowBroken, setWindowBroken]     = useState(false)
  const [escapeMethod, setEscapeMethod]     = useState(null)  // 'centerPunch' | 'door' | null
  const [toast, setToast]                   = useState(null)
  const [toastOk, setToastOk]               = useState(false)
  const [log, setLog]                       = useState([])
  const [dead, setDead]                     = useState(false)
  const [finalScore, setFinalScore]         = useState(0)
  const [doorClicks, setDoorClicks]         = useState(0)

  /* refs for interval reads */
  const ivRef  = useRef(null)
  const ttRef  = useRef(null)
  const phRef  = useRef(phase)
  phRef.current = phase

  /* ── toast helper ── */
  const showToast = useCallback((msg, ok = false, ms = 1600) => {
    setToast(msg)
    setToastOk(ok)
    clearTimeout(ttRef.current)
    ttRef.current = setTimeout(() => setToast(null), ms)
  }, [])

  /* ── log helper ── */
  const addLog = useCallback((msg) => {
    setLog(prev => [msg, ...prev.slice(0, 7)])
  }, [])

  /* ── timestamp string ── */
  const ts = useCallback(() => {
    return `${(ticks * TICK_MS / 1000).toFixed(1)}s`
  }, [ticks])

  /* ── start / reset simulation ── */
  const startSim = useCallback(() => {
    setPhase('sim')
    setExternalPSI(0)
    setInternalPSI(0)
    setO2Level(100)
    setDoorLocked(true)
    setTicks(0)
    setGloveBoxOpen(false)
    setHasCenterPunch(false)
    setPunchEquipped(false)
    setWindowBroken(false)
    setEscapeMethod(null)
    setDead(false)
    setFinalScore(0)
    setLog([])
    setDoorClicks(0)
    setToast(null)
  }, [])

  /* ── main simulation interval ── */
  useEffect(() => {
    if (phase !== 'sim') {
      clearInterval(ivRef.current)
      return
    }
    ivRef.current = setInterval(() => {
      if (phRef.current !== 'sim') return
      setTicks(t => t + 1)
      setExternalPSI(prev => Math.min(MAX_PSI, prev + EXT_PSI_RATE))
      setInternalPSI(prev => Math.min(MAX_PSI, prev + INT_PSI_RATE))
      setO2Level(prev => Math.max(0, prev - O2_BASE_DRAIN))
    }, TICK_MS)
    return () => clearInterval(ivRef.current)
  }, [phase])

  /* ── sync doorLocked from pressure values ── */
  useEffect(() => {
    setDoorLocked((externalPSI - internalPSI) > LOCK_THRESH)
  }, [externalPSI, internalPSI])

  /* ── death detection ── */
  useEffect(() => {
    if (phase !== 'sim' || dead || o2Level > 0) return
    setDead(true)
    addLog('ASPHYXIATION \u2014 O2 depleted. You blacked out.')
    setFinalScore(0)
    setEscapeMethod(null)
    gameDispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-4', result: { score: 0, passed: false } },
    })
    setTimeout(() => setPhase('result'), 1200)
  }, [o2Level, phase, dead, addLog, gameDispatch])

  /* ── derived values ── */
  const escaped  = escapeMethod !== null
  const diff     = (externalPSI - internalPSI).toFixed(2)
  const waterPct = clamp((externalPSI / MAX_PSI) * 100, 0, 100)
  const timeSec  = (ticks * TICK_MS / 1000).toFixed(1)

  /* ── action handlers ── */
  const handleDoorClick = useCallback(() => {
    if (phase !== 'sim' || dead || escaped) return
    setDoorClicks(prev => prev + 1)
    // every click costs O2 regardless
    setO2Level(prev => Math.max(0, prev - O2_CLICK_COST))
    if (doorLocked) {
      showToast('LOCKED \u2014 pressure differential too high!')
      addLog(`[${ts()}] Door handle yanked \u2014 LOCKED. Wasted O2.`)
      return
    }
    // door is unlocked — escape via equalization path
    addLog(`[${ts()}] Door opened! Escaping vehicle!`)
    showToast('DOOR OPEN \u2014 ESCAPING!', true, 2000)
    const sc = computeScore('door', o2Level)
    setFinalScore(sc)
    setEscapeMethod('door')
    gameDispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-4', result: { score: sc, passed: true } },
    })
    setTimeout(() => setPhase('result'), 1500)
  }, [phase, dead, escaped, doorLocked, o2Level, ts, showToast, addLog, gameDispatch])

  const handleGloveBox = useCallback(() => {
    if (phase !== 'sim' || dead) return
    if (!gloveBoxOpen) {
      setGloveBoxOpen(true)
      addLog(`[${ts()}] Glove box opened.`)
    }
  }, [phase, dead, gloveBoxOpen, ts, addLog])

  const handlePickUpPunch = useCallback(() => {
    if (phase !== 'sim' || dead) return
    setHasCenterPunch(true)
    setPunchEquipped(true)
    addLog(`[${ts()}] Center punch acquired and equipped!`)
    showToast('CENTER PUNCH EQUIPPED \u2014 strike the window!', true, 2200)
  }, [phase, dead, ts, addLog, showToast])

  const handleBreakWindow = useCallback(() => {
    if (phase !== 'sim' || dead || !punchEquipped) return
    setWindowBroken(true)
    setPunchEquipped(false)
    addLog(`[${ts()}] WINDOW SHATTERED with center punch! Escaping!`)
    showToast('WINDOW SHATTERED \u2014 ESCAPING!', true, 2000)
    const sc = computeScore('centerPunch', o2Level)
    setFinalScore(sc)
    setEscapeMethod('centerPunch')
    gameDispatch({
      type: 'RECORD_SCORE',
      payload: { key: 'flood-4', result: { score: sc, passed: true } },
    })
    setTimeout(() => setPhase('result'), 1500)
  }, [phase, dead, punchEquipped, o2Level, ts, addLog, showToast, gameDispatch])

  /* ═══════════════════════ RENDER: INTRO ═══════════════════════ */
  if (phase === 'intro') {
    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.94)' }}>
        <div style={{
          fontSize: '2.2rem', fontWeight: 800, color: '#ff4444',
          letterSpacing: 4, marginBottom: 16, textTransform: 'uppercase',
          textShadow: '0 0 30px rgba(255,50,50,0.4)',
        }}>The Sinking Car</div>
        <div style={{ fontSize: '1rem', color: '#88aacc', maxWidth: 600, lineHeight: 1.7, marginBottom: 24 }}>
          Your vehicle has plunged into water. The cabin is filling.
          External pressure locks the doors. Escape before oxygen runs out.
        </div>
        <div style={{
          background: 'rgba(20,40,60,0.7)', border: '1px solid #2a4a6a',
          borderRadius: 10, padding: '18px 24px', maxWidth: 560,
          marginBottom: 30, textAlign: 'left',
        }}>
          <div style={{
            fontSize: '.65rem', color: '#ff8844', fontWeight: 800,
            letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase',
          }}>Professor&apos;s Briefing</div>
          <div style={{ fontSize: '.85rem', color: '#bbccdd', lineHeight: 1.7 }}>
            &quot;Two paths to survival.<br /><br />
            <strong>Path A (Center Punch):</strong> Open the glove box, grab the
            spring-loaded center punch, and shatter the side window instantly.
            This is the fastest escape.<br /><br />
            <strong>Path B (Equalization):</strong> Wait. As water fills the cabin,
            internal pressure rises to match external pressure. Once equalized,
            the door unlocks and you can push it open.<br /><br />
            <strong>Warning:</strong> Do NOT thrash at the door handle while it is
            locked. Every yank costs precious oxygen. Stay calm or you will
            black out.&quot;
          </div>
        </div>

        <button onClick={startSim} style={{
          padding: '14px 48px',
          background: 'linear-gradient(180deg, #cc2222, #881111)',
          border: '2px solid #ff4444', borderRadius: 8, color: '#fff',
          fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer',
          letterSpacing: 3, textTransform: 'uppercase',
        }}>BEGIN SIMULATION</button>

        <button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{
          marginTop: 16, background: 'none', border: '1px solid #555',
          color: '#aaa', padding: '6px 16px', cursor: 'pointer',
          fontSize: '.85rem', borderRadius: 4,
        }}>Back to Modules</button>
      </div>
    )
  }

  /* ═══════════════════════ RENDER: RESULT ═══════════════════════ */
  if (phase === 'result') {
    const passed = escapeMethod !== null
    const col    = passed ? '#44ff44' : '#ff4444'
    const methodLabel = escapeMethod === 'centerPunch'
      ? 'Center Punch (optimal)'
      : escapeMethod === 'door'
        ? 'PSI Equalization (patient)'
        : 'Asphyxiation'

    return (
      <div style={{ ...overlayBase, background: 'rgba(0,0,0,0.92)' }}>
        <div style={{
          fontSize: '2rem', fontWeight: 800, letterSpacing: 4,
          textTransform: 'uppercase', marginBottom: 14, color: col,
        }}>{passed ? 'ESCAPED' : 'GAME OVER'}</div>
        <div style={{ fontSize: '4rem', fontWeight: 900, marginBottom: 10, color: col }}>
          {finalScore}</div>
        <div style={detailLine}>Method: <strong>{methodLabel}</strong></div>
        <div style={detailLine}>Time survived: <strong>{timeSec}s</strong></div>
        <div style={detailLine}>O2 remaining: <strong>{o2Level.toFixed(1)}%</strong></div>
        <div style={detailLine}>
          Door handle attempts: <strong>{doorClicks}</strong>
          {doorClicks > 5 && !passed && (
            <span style={{ color: '#ff6644', marginLeft: 8 }}>(excessive thrashing!)</span>
          )}
        </div>
        <div style={detailLine}>Pressure differential: <strong>{diff} PSI</strong></div>
        {escapeMethod === 'centerPunch' && (
          <div style={{ ...detailLine, color: '#88ccff', marginTop: 8 }}>
            &quot;Excellent. The spring-loaded center punch is the gold standard
            for underwater vehicle escape. You minimized O2 waste.&quot;
          </div>
        )}
        {escapeMethod === 'door' && (
          <div style={{ ...detailLine, color: '#88ccff', marginTop: 8 }}>
            &quot;You waited for pressure equalization. A valid strategy that
            required patience and discipline to avoid panic.&quot;
          </div>
        )}
        {!passed && (
          <div style={{ ...detailLine, color: '#ff8888', marginTop: 8 }}>
            &quot;Thrashing at a pressure-locked door is a death sentence underwater.
            Stay calm. Use tools. Think before you act.&quot;
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
          <button onClick={startSim} style={makeBtn(true)}>RETRY</button>
          <button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })}
            style={makeBtn(false)}>BACK TO MODULES</button>
        </div>
      </div>
    )
  }

  /* ═══════════════════════ RENDER: SIM ═══════════════════════ */
  return (
    <div style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: '#0a0a0f', color: '#e0e0e0',
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
    }}>
      {/* ── top bar ── */}
      <div style={{
        width: '100%', padding: '10px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid #333',
        boxSizing: 'border-box', zIndex: 20,
      }}>
        <div style={{
          fontSize: '1.1rem', fontWeight: 700, letterSpacing: 2,
          color: '#ff4444', textTransform: 'uppercase',
        }}>Sinking Car &mdash; Pressure QTE</div>
        <button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{
          background: 'none', border: '1px solid #555', color: '#aaa',
          padding: '6px 16px', cursor: 'pointer', fontSize: '.85rem', borderRadius: 4,
        }}>Abort</button>
      </div>

      {/* ── three gauges ── */}
      <div style={{
        width: '100%', maxWidth: 900, display: 'flex',
        justifyContent: 'center', gap: 20, padding: '14px 0 6px', flexWrap: 'wrap',
      }}>
        <Gauge label="External PSI" color="#4488ff"
          value={externalPSI.toFixed(1)} pct={(externalPSI / MAX_PSI) * 100} />
        <Gauge label="Internal PSI" color="#44cc66"
          value={internalPSI.toFixed(1)} pct={(internalPSI / MAX_PSI) * 100} />
        <Gauge label="O2 Level" color={o2Level > 30 ? '#ff4444' : '#ff0000'}
          value={`${o2Level.toFixed(1)}%`} pct={o2Level} />
      </div>
      {/* ── DoorLocked indicator ── */}
      <div style={{
        width: '100%', maxWidth: 900, display: 'flex',
        justifyContent: 'center', alignItems: 'center', gap: 12,
        padding: '6px 0', fontSize: '1.1rem', fontWeight: 800, letterSpacing: 2,
        color: doorLocked ? '#ff4444' : '#44ff44',
        textShadow: doorLocked ? '0 0 16px #ff000066' : '0 0 16px #00ff0066',
      }}>
        <span style={{ fontSize: '1.8rem' }}>
          {doorLocked ? '\u{1F512}' : '\u{1F513}'}
        </span>
        <span>
          {doorLocked
            ? `DOOR LOCKED  (diff: ${diff} PSI)`
            : 'DOOR UNLOCKED \u2014 pressure equalized!'}
        </span>
      </div>
      {/* ── first-person dashboard ── */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 900, height: 520,
        margin: '10px auto 0',
        background: 'linear-gradient(180deg, #0d1117, #101820)',
        border: '2px solid #1a2a3a', borderRadius: 12, overflow: 'hidden',
      }}>
        {/* windshield background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #0b1929, #0f2640 40%, #132d4a)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {/* rising water line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: `${clamp(waterPct, 0, 100)}%`,
            background: 'linear-gradient(180deg, rgba(20,100,180,.35), rgba(10,60,120,.7) 50%, rgba(5,30,80,.9))',
            transition: 'height .2s linear',
            borderTop: '2px solid rgba(80,180,255,.4)', zIndex: 1,
          }} />
          {/* water surface ripple */}
          {waterPct > 5 && (
            <div style={{
              position: 'absolute', bottom: `${clamp(waterPct - 1, 0, 99)}%`,
              left: 0, right: 0, height: 6,
              background: 'linear-gradient(90deg, transparent, rgba(100,200,255,.5), transparent, rgba(100,200,255,.3), transparent)',
              zIndex: 2,
            }} />
          )}
          {/* bubbles when water rises */}
          {waterPct > 10 && [15, 35, 55, 72, 88].map((left, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: 0, left: `${left}%`,
              width: 6 + i * 2, height: 6 + i * 2, borderRadius: '50%',
              background: 'rgba(100,180,255,.15)',
              border: '1px solid rgba(100,180,255,.25)',
              animation: `bubbleUp ${3 + i * 0.5}s linear infinite`,
              animationDelay: `${i * 0.4}s`, zIndex: 2, pointerEvents: 'none',
            }} />
          ))}
          {/* low-O2 red vignette */}
          {o2Level < 40 && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at center, rgba(255,0,0,.12), transparent 70%)',
              animation: 'o2Pulse 1s infinite',
            }} />
          )}
          {/* crack overlay when window broken */}
          {windowBroken && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,.15), transparent 60%)',
            }} />
          )}
        </div>
        {/* HUD overlays */}
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 15,
          display: 'flex', flexDirection: 'column', gap: 2,
          fontSize: '.6rem', color: '#88aacc', fontWeight: 600, letterSpacing: 1,
        }}>
          <span>DEPTH: {(externalPSI * 0.23).toFixed(1)} ft</span>
          <span>CABIN FILL: {(waterPct * 0.85).toFixed(0)}%</span>
          <span>DIFF: {diff} PSI</span>
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 15,
          fontSize: '.85rem', color: '#aaa', fontWeight: 700, letterSpacing: 1,
        }}>T+ {timeSec}s</div>
        {/* steering wheel silhouette */}
        <div style={{
          position: 'absolute', bottom: 30, left: '50%',
          transform: 'translateX(-50%)', width: 200, height: 200,
          border: '8px solid rgba(60,60,60,.6)', borderRadius: '50%',
          zIndex: 3, pointerEvents: 'none',
        }}>
          {[0, 120, 240].map(r => (
            <div key={r} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 80, height: 4, background: 'rgba(70,70,70,.7)',
              transformOrigin: '0 50%', transform: `rotate(${r}deg)`,
            }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)', width: 12, height: 60,
          background: 'rgba(60,60,60,.5)', borderRadius: 4,
          zIndex: 3, pointerEvents: 'none',
        }} />
        {/* ── door handle (left side) ── */}
        <div style={{
          position: 'absolute', left: 15, top: '50%',
          transform: 'translateY(-50%)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10,
        }}>
          <button onClick={handleDoorClick} disabled={escaped || dead} style={{
            width: 70, height: 110,
            background: doorLocked
              ? 'linear-gradient(180deg,#3a1010,#5a1515)'
              : 'linear-gradient(180deg,#103a10,#155a15)',
            border: `2px solid ${doorLocked ? '#ff3333' : '#33ff33'}`,
            borderRadius: 8, cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            color: doorLocked ? '#ff6666' : '#66ff66',
            fontSize: '.65rem', fontWeight: 700, textAlign: 'center',
            fontFamily: "'Courier New', monospace", transition: 'all .15s',
          }}>
            <span style={{
              fontSize: '2rem',
              textShadow: doorLocked ? '0 0 12px #f00' : '0 0 12px #0f0',
            }}>
              {doorLocked ? '\u{1F512}' : '\u{1F513}'}
            </span>
            <span>DOOR<br />HANDLE</span>
          </button>
          <span style={{
            fontSize: '.5rem',
            color: doorLocked ? '#ff6666' : '#66ff66',
            textAlign: 'center', maxWidth: 80,
          }}>
            {doorLocked ? 'PRESSURE LOCKED' : 'PULL TO OPEN'}
          </span>
        </div>

        {/* ── glove box (right side) ── */}
        <div style={{
          position: 'absolute', right: 15, top: '50%',
          transform: 'translateY(-50%)', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10,
        }}>
          {!gloveBoxOpen && (
            <button onClick={handleGloveBox} style={{
              width: 80, height: 70,
              background: 'linear-gradient(180deg, #1a1a2a, #2a2a3a)',
              border: '2px solid #555', borderRadius: 6, cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
              color: '#888', fontSize: '.6rem', fontWeight: 700,
              fontFamily: "'Courier New', monospace",
            }}>
              <span style={{ fontSize: '1.4rem' }}>{'\u{1F4E6}'}</span>
              <span>GLOVE<br />BOX</span>
            </button>
          )}
          {gloveBoxOpen && (
            <>
              <div style={{
                width: 80, height: 36,
                background: 'linear-gradient(180deg, #2a2a10, #3a3a15)',
                border: '2px solid #ffaa33', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffcc66', fontSize: '.55rem', fontWeight: 700,
              }}>{'\u{1F4E6}'} OPEN</div>

              {!hasCenterPunch && (
                <button onClick={handlePickUpPunch} style={{
                  width: 80, height: 46,
                  background: 'linear-gradient(180deg, #2a1a00, #4a3000)',
                  border: '2px solid #ff8800', borderRadius: 6,
                  cursor: 'pointer', color: '#ffaa33',
                  fontSize: '.6rem', fontWeight: 700,
                  fontFamily: "'Courier New', monospace",
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 4, textAlign: 'center',
                }}>
                  <span style={{ fontSize: '1rem' }}>{'\u{1F528}'}</span>
                  <span>CENTER<br />PUNCH</span>
                </button>
              )}

              {hasCenterPunch && punchEquipped && (
                <div style={{
                  padding: '3px 8px', background: '#ff8800', color: '#000',
                  fontSize: '.55rem', fontWeight: 800, borderRadius: 4, letterSpacing: 1,
                }}>PUNCH READY</div>
              )}
            </>
          )}
        </div>

        {/* ── window strike button (center, visible when punch equipped) ── */}
        {punchEquipped && !windowBroken && !escaped && !dead && (
          <button onClick={handleBreakWindow} style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -80%)',
            width: 160, height: 60,
            background: 'linear-gradient(180deg, rgba(0,80,160,.6), rgba(0,50,100,.8))',
            border: '2px dashed #44aaff', borderRadius: 8, cursor: 'pointer',
            color: '#88ccff', fontSize: '.75rem', fontWeight: 700,
            fontFamily: "'Courier New', monospace",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', zIndex: 10, animation: 'pulseBorder 1.5s infinite',
          }}>
            {'\u{1F528}'} STRIKE WINDOW
          </button>
        )}

        {/* ── toast notifications ── */}
        {toast && (
          <div style={{
            position: 'absolute', top: 20, left: '50%',
            transform: 'translateX(-50%)',
            background: toastOk ? 'rgba(20,120,40,.9)' : 'rgba(180,30,30,.9)',
            color: '#fff', padding: '10px 24px', borderRadius: 6,
            fontSize: '.8rem', fontWeight: 700, letterSpacing: 1, zIndex: 30,
            border: `1px solid ${toastOk ? '#44ff44' : '#ff4444'}`,
            textAlign: 'center', maxWidth: '80%', pointerEvents: 'none',
          }}>{toast}</div>
        )}
      </div>

      {/* ── action log ── */}
      <div style={{ width: '100%', maxWidth: 900, padding: '8px 14px', boxSizing: 'border-box' }}>
        {log.map((entry, i) => (
          <div key={i} style={{
            fontSize: '.65rem', color: '#778899', lineHeight: 1.5,
            borderLeft: '2px solid #334', paddingLeft: 8, marginBottom: 2,
          }}>{entry}</div>
        ))}
      </div>
    </div>
  )
}
