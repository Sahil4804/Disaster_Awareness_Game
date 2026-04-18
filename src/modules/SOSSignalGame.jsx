import { useState, useRef, useEffect, useCallback } from 'react'
import { useGame } from '../context/GameContext'

/* ═══════════════════════ CORE ═══════════════════════ */
const C = { bg: '#070b14', panel: '#0f1729', card: '#141e30', text: '#e2e8f0', muted: '#64748b', red: '#ef4444', green: '#22c55e', amber: '#f59e0b', blue: '#3b82f6', cyan: '#06b6d4', orange: '#f97316', pink: '#ec4899', purple: '#a855f7' }
const PX = (id, w = 900) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=500&fit=crop`
const DIFF = { easy: { tMul: 1.5, sMul: 0.6, xMul: 0.5, label: 'EASY' }, medium: { tMul: 1, sMul: 1, xMul: 1, label: 'MEDIUM' }, hard: { tMul: 0.6, sMul: 1.5, xMul: 2, label: 'HARD' } }

/* ═══════════════════════ SOUND ═══════════════════════ */
let _ac = null
function ac() { if (!_ac) try { _ac = new (window.AudioContext || window.webkitAudioContext)() } catch { return null } return _ac }
function tn(f, d, t = 'sine', v = 0.1) { const c = ac(); if (!c) return; try { const o = c.createOscillator(), g = c.createGain(); o.type = t; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(c.destination); o.start(c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.stop(c.currentTime + d) } catch {} }
function ns(d, v = 0.05) { const c = ac(); if (!c) return; try { const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate); const a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * v; const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(); s.stop(c.currentTime + d) } catch {} }
const S = { click: () => tn(800, .05), ok: () => { tn(523, .1); setTimeout(() => tn(659, .1), 80); setTimeout(() => tn(784, .15, 'sine', .12), 160) }, bad: () => { tn(200, .3, 'square', .07); setTimeout(() => tn(150, .35, 'square', .05), 150) }, boom: () => { ns(.3, .1); tn(80, .4, 'sawtooth', .07) }, whoosh: () => { const c = ac(); if (!c) return; try { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(300, c.currentTime); o.frequency.exponentialRampToValueAtTime(1200, c.currentTime + .15); g.gain.value = .05; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .2) } catch {} }, whistle: () => { tn(2200, .12, 'sine', .07) }, flare: () => { S.whoosh(); setTimeout(() => tn(400, .4, 'sawtooth', .05), 200) }, fire: () => ns(.03, .02), wind: () => ns(.35, .04), beep: (f = 800) => tn(f, .1), heli: () => tn(60, .07, 'sine', .04), stt: () => ns(.08, .02), cdB: (n) => tn(n <= 1 ? 1200 : 800, n <= 1 ? .3 : .1) }

/* ═══════════════════════ EFFECTS ═══════════════════════ */
function useShake() { const [s, ss] = useState(false); return [s ? { animation: 'sx .4s ease-in-out' } : {}, useCallback(() => { ss(true); setTimeout(() => ss(false), 400) }, [])] }

/* ═══════════════════════ CSS ═══════════════════════ */
function injectCSS() {
  if (document.getElementById('ss3')) return; const s = document.createElement('style'); s.id = 'ss3'
  s.textContent = `
@keyframes sf{0%{opacity:1;transform:translateY(0) scale(1)}50%{transform:translateY(-40px) scale(1.2)}100%{opacity:0;transform:translateY(-80px) scale(.8)}}
@keyframes sx{0%,100%{transform:translate(0)}10%{transform:translate(-5px,3px)}30%{transform:translate(-3px,-2px)}50%{transform:translate(-2px,2px)}70%{transform:translate(-1px,1px)}}
@keyframes sp{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes sg{0%,100%{box-shadow:0 0 8px rgba(6,182,212,.3)}50%{box-shadow:0 0 24px rgba(6,182,212,.7)}}
@keyframes sh{0%,100%{transform:scale(1)}15%{transform:scale(1.15)}30%{transform:scale(1)}}
@keyframes scg{0%{text-shadow:0 0 5px currentColor}50%{text-shadow:0 0 20px currentColor,0 0 40px currentColor}}
@keyframes sup{0%,100%{box-shadow:0 0 10px rgba(239,68,68,.3)}50%{box-shadow:0 0 30px rgba(239,68,68,.7)}}
@keyframes sfl{0%,100%{opacity:.8}10%{opacity:.3}50%{opacity:1}70%{opacity:.4}}
@keyframes sr{0%{transform:translateY(-100vh);opacity:.5}100%{transform:translateY(100vh);opacity:0}}
@keyframes sv{0%{left:-12%}100%{left:112%}}
@keyframes sfd{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
@keyframes sfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes sst{0%{background-position:0 0}100%{background-position:200px 200px}}
  `; document.head.appendChild(s)
}

function Rain() { return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>{Array.from({ length: 40 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${(i / 40) * 100}%`, top: 0, width: 1.5, height: 18, background: `rgba(150,180,220,${.08 + Math.random() * .15})`, animation: `sr ${.5 + Math.random() * .5}s ${Math.random() * 2}s linear infinite` }} />)}</div> }

/* ═══════════════════════ SIGNAL DATA ═══════════════════════ */
const SIGNALS = [
  { id: 'mirror', name: 'Signal Mirror', icon: '🪞', color: C.amber, img: PX(1252869), desc: 'Reflects sunlight 50+ miles. #1 daytime signal.', when: 'Daytime + sunlight.', how: 'Flash toward target, sweep.', diy: 'Phone, CD, belt buckle.', src: 'USAF Survival Manual' },
  { id: 'flare', name: 'Signal Flare', icon: '🔴', color: C.red, img: PX(8956453), desc: 'Visible 25+ miles at night.', when: 'Night, dusk, overcast.', how: 'Aim UP, fire when craft visible.', diy: 'Soaked rag on stick (DANGER).', src: 'USCG' },
  { id: 'whistle', name: 'Whistle', icon: '📯', color: C.blue, img: PX(1089930), desc: '3 blasts = distress. 1 mile range.', when: 'Fog, forest, night.', how: '3 short blasts, pause, repeat.', diy: 'Yell in 3s, bang rocks.', src: 'Alpine Rescue' },
  { id: 'fire', name: 'Signal Fire', icon: '🔥', color: C.orange, img: PX(266526), desc: '3 fires in triangle. Smoke for miles.', when: 'Extended survival.', how: 'Tinder→kindling→fuel. Green for smoke.', diy: 'Heat + Fuel + Oxygen.', src: 'FEMA' },
  { id: 'radio', name: 'Radio 121.5MHz', icon: '📻', color: C.green, img: PX(16114057), desc: 'Aviation emergency freq.', when: 'Any radio available.', how: '"MAYDAY" 3x → WHO/WHERE/WHAT.', diy: 'Strip wire antenna, hang HIGH.', src: 'ICAO' },
  { id: 'morse', name: 'Morse SOS', icon: '💡', color: C.cyan, img: PX(1089930), desc: '... --- ... Any medium.', when: 'ANY situation.', how: 'DIT(.) DAH(-) → ••• ─── •••', diy: 'Flashlight, tapping, blinking.', src: 'ITU' },
  { id: 'ground', name: 'Ground Symbols', icon: '❌', color: C.pink, img: PX(14823609), desc: 'V=assist, X=medical.', when: 'Open terrain + aircraft.', how: 'Rocks/branches, 10ft+ symbols.', diy: 'Rocks, trenches, clothing.', src: 'ICAO' },
  { id: 'flag', name: 'Signal Flag', icon: '🚩', color: C.purple, img: PX(5765827), desc: 'Orange = distress.', when: 'Daytime open areas.', how: 'Wave figure-8 when aircraft near.', diy: 'Emergency blanket, bright cloth.', src: 'ICAO' },
]

/* ═══════════════════════ SCENARIO QUIZ DATA (12 scenarios) ═══════════════════════ */
const QUIZ = [
  { title: 'Rooftop — Sunny', bg: PX(8568719), correct: 'mirror', hint: 'Sunlight + aircraft = mirror. 50+ mile range.', vehicle: 'heli' },
  { title: 'Open Sea — Night', bg: PX(8956453), correct: 'flare', hint: 'No sun = flare. Visible 25+ miles at night.', vehicle: 'boat' },
  { title: 'Dense Fog', bg: PX(1089930), correct: 'whistle', hint: 'Zero visibility = sound only. 3 blasts = distress.', vehicle: 'ground' },
  { title: 'Under Rubble', bg: PX(15533288), correct: 'morse', hint: 'Trapped? TAP SOS on hard surface. Rescuers listen.', vehicle: 'ground' },
  { title: 'Island — Day 2', bg: PX(14823609), correct: 'fire', hint: '3 fires in triangle = distress. Green branches = smoke.', vehicle: 'heli' },
  { title: 'Dusk — Rain', bg: PX(6471927), correct: 'flare', hint: 'No sun, rain kills sound. Flare creates own light.', vehicle: 'boat' },
  { title: 'Mountain Clearing', bg: PX(16689670), correct: 'ground', hint: 'V = assist, X = medical. 10ft+. Contrast matters.', vehicle: 'heli' },
  { title: 'Radio Available', bg: PX(16114057), correct: 'radio', hint: '121.5 MHz aviation emergency. Always try radio FIRST.', vehicle: 'heli' },
  { title: 'Desert — Noon', bg: PX(1252869), correct: 'mirror', hint: 'Open terrain + blazing sun = mirror is unbeatable.', vehicle: 'heli' },
  { title: 'River Flood — Day', bg: PX(8568719), correct: 'flag', hint: 'Rain kills mirror/sound. High-contrast flag is visible.', vehicle: 'boat' },
  { title: 'Forest — Night', bg: PX(8956453), correct: 'fire', hint: 'Night in forest = fire. Flames visible through canopy.', vehicle: 'ground' },
  { title: 'Ship Sinking', bg: PX(2328714), correct: 'radio', hint: 'Ch.16 / 156.8 MHz = maritime emergency. MAYDAY call.', vehicle: 'boat' },
]

/* ═══════════════════════ BADGES ═══════════════════════ */
const BADGES = [
  { id: 'first', name: 'First Steps', icon: '🏅', desc: 'Complete any game', check: (s) => Object.values(s).some(v => v?.last != null) },
  { id: 'mirror90', name: 'Mirror Expert', icon: '🪞', desc: '90%+ on Mirror', check: (s) => (s.mirror?.best || 0) >= 90 },
  { id: 'all6', name: 'All Clear', icon: '⭐', desc: 'Play all 6 games', check: (s) => ['mirror', 'flare', 'whistle', 'fire', 'morse', 'radio'].every(k => s[k]?.last != null) },
  { id: 'perfect', name: 'Perfectionist', icon: '💎', desc: '100% on any game', check: (s) => Object.values(s).some(v => (v?.best || 0) >= 100) },
  { id: 'campaign', name: 'Campaign Hero', icon: '🏆', desc: '80%+ on Campaign', check: (s) => (s.campaign?.best || 0) >= 80 },
  { id: 'xp500', name: 'Veteran', icon: '🎖️', desc: 'Earn 500 XP total', check: (_, xp) => xp >= 500 },
]

/* ═══════════════════════ PERSISTENCE ═══════════════════════ */
function loadScores() { try { return JSON.parse(localStorage.getItem('sos-scores') || '{}') } catch { return {} } }
function saveScores(s) { localStorage.setItem('sos-scores', JSON.stringify(s)) }
function loadXP() { return parseInt(localStorage.getItem('sos-xp') || '0') }
function saveXP(x) { localStorage.setItem('sos-xp', String(x)) }

/* ═══════════════════════════════════════════════════════════
   MIRROR GAME — FIXED: useRef for mouse, stable intervals
   ═══════════════════════════════════════════════════════════ */
function MirrorGame({ onDone, diff = DIFF.medium }) {
  const dur = Math.round(20 * diff.tMul)
  const hSpeed = 0.35 * diff.sMul
  const mxR = useRef(50), myR = useRef(50) // mouse position in REFS
  const hxR = useRef(30) // helicopter position in REF (NOT state for hit detection)
  const [cursor, setCursor] = useState({ x: 50, y: 50 }) // visual only
  const [hx, setHx] = useState(30); const dirR = useRef(1) // hx state only for rendering
  const [hit, setHit] = useState(0); const [timer, setTimer] = useState(dur)
  const [done, setDone] = useState(false); const [onTgt, setOnTgt] = useState(false)
  const ref = useRef(null); const hitR = useRef(0)

  // Helicopter movement — updates BOTH state (for rendering) and ref (for hit detection)
  useEffect(() => { if (done) return; const iv = setInterval(() => setHx(p => { let n = p + dirR.current * hSpeed; if (n > 82) { dirR.current = -1; n = 82 } if (n < 15) { dirR.current = 1; n = 15 } hxR.current = n; return n }), 50); return () => clearInterval(iv) }, [done, hSpeed])
  // Timer
  useEffect(() => { if (done) return; const iv = setInterval(() => setTimer(t => { if (t <= 4 && t > 1) S.cdB(t); if (t <= 1) { setDone(true); return 0 } return t - 1 }), 1e3); return () => clearInterval(iv) }, [done])
  // Hit detection — reads ALL positions from REFS, NO state in deps (stable interval!)
  useEffect(() => { if (done) return; const iv = setInterval(() => {
    const mx = mxR.current, my = myR.current, currentHx = hxR.current
    setCursor({ x: mx, y: my })
    const dx = mx - currentHx, dy = my - 14; const d = Math.sqrt(dx * dx + dy * dy); const h = d < 15
    setOnTgt(h); if (h) { hitR.current += 50; setHit(hitR.current) }
  }, 50); return () => clearInterval(iv) }, [done]) // <-- NO hx in deps, interval stays stable
  // Heli sound
  useEffect(() => { if (done) return; const iv = setInterval(() => S.heli(), 700); return () => clearInterval(iv) }, [done])
  // Mouse handler writes to REF only (no state, no re-render)
  const handleMouse = useCallback((e) => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); mxR.current = ((e.clientX - r.left) / r.width) * 100; myR.current = ((e.clientY - r.top) / r.height) * 100 }, [])

  const score = Math.min(100, Math.round((hit / (dur * 1e3)) * 140))
  if (done) return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: score >= 50 ? C.green : C.red }}>{score >= 80 ? 'EXPERT!' : score >= 50 ? 'RESCUED!' : 'MISSED'}</h2><div style={{ fontSize: '3.5rem', fontWeight: 900, color: score >= 50 ? C.green : C.red }}>{score}%</div><div style={{ color: C.muted, margin: '8px auto 20px', maxWidth: 400, fontSize: '.85rem', lineHeight: 1.5 }}>Mirror = 50+ mile range. Sweep beam, don't hold steady.</div><button onClick={() => onDone(score)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE</button></div>
  return (
    <div ref={ref} onMouseMove={handleMouse} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 450, cursor: 'none', userSelect: 'none', overflow: 'hidden', borderRadius: 8, backgroundImage: `url(${PX(1252869, 1200)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(26,122,204,.2),rgba(135,206,235,.05))' }} />
      <div style={{ position: 'absolute', bottom: '28%', left: '10%', width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle,#fff 0%,#ffe066 30%,rgba(255,200,0,.15) 60%,transparent 100%)', boxShadow: '0 0 80px rgba(255,200,0,.4)' }} />
      <div style={{ position: 'absolute', left: `${hx}%`, top: '11%', transform: 'translateX(-50%)', fontSize: '3rem', filter: onTgt ? 'drop-shadow(0 0 25px #ff0) drop-shadow(0 0 60px rgba(255,255,0,.5))' : 'none', transition: 'filter .1s' }}>🚁</div>
      <div style={{ position: 'absolute', left: `${hx}%`, top: '11%', transform: 'translate(-50%,-15%)', width: 100, height: 100, borderRadius: '50%', border: `2px dashed ${onTgt ? C.green : 'rgba(255,255,255,.2)'}`, pointerEvents: 'none' }} />
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {onTgt && <line x1="50" y1="94" x2={cursor.x} y2={cursor.y} stroke="rgba(255,255,0,.12)" strokeWidth="3" />}
        <line x1="50" y1="94" x2={cursor.x} y2={cursor.y} stroke={onTgt ? '#ffff00' : 'rgba(255,255,200,.3)'} strokeWidth={onTgt ? '.6' : '.2'} />
      </svg>
      <div style={{ position: 'absolute', bottom: '3%', left: '50%', transform: 'translateX(-50%)', fontSize: '2.2rem' }}>🪞</div>
      <div style={{ position: 'absolute', left: `${cursor.x}%`, top: `${cursor.y}%`, transform: 'translate(-50%,-50%)', width: 28, height: 28, borderRadius: '50%', background: onTgt ? 'radial-gradient(circle,rgba(255,255,0,.9),transparent 70%)' : 'radial-gradient(circle,rgba(255,255,200,.4),transparent 60%)', boxShadow: onTgt ? '0 0 40px rgba(255,255,0,.5)' : 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 10, right: 14, background: 'rgba(0,0,0,.65)', padding: '6px 14px', borderRadius: 6, fontSize: '1.6rem', fontWeight: 900, fontFamily: 'monospace', color: timer < 5 ? C.red : '#fff', animation: timer < 5 ? 'sh 1s ease-in-out infinite' : 'none' }}>{timer}s</div>
      <div style={{ position: 'absolute', top: 10, left: 14, background: 'rgba(0,0,0,.65)', padding: '6px 14px', borderRadius: 6, fontFamily: 'monospace' }}><div style={{ fontSize: '.7rem', color: C.muted }}>ON TARGET</div><div style={{ fontSize: '1.2rem', fontWeight: 900, color: onTgt ? C.green : C.muted }}>{(hit / 1e3).toFixed(1)}s</div></div>
      {onTgt && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 60px rgba(255,255,0,.12)' }} />}
      {timer < 5 && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${C.red}`, animation: 'sup .5s ease-in-out infinite', pointerEvents: 'none' }} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   FLARE GAME — Mouse-controlled angle + power, real projectile
   trajectory arc preview, WIND resistance
   y = x·tan(θ) - g·x² / (2·v²·cos²(θ))
   ═══════════════════════════════════════════════════════════ */
function FlareGame({ onDone, diff = DIFF.medium }) {
  const G = 0.13 // gravity per frame
  const hSpeed = 0.3 * diff.sMul
  const [hx, setHx] = useState(25); const dirR = useRef(1); const hxR = useRef(25)
  const [angle, setAngle] = useState(80) // degrees from horizontal, controlled by mouse Y
  const [power, setPower] = useState(50) // 0-100, controlled by holding mouse
  const [charging, setCharging] = useState(false)
  const [wind, setWind] = useState(0) // -3 to +3, changes periodically
  const [flaresLeft, setFlaresLeft] = useState(3); const flaresR = useRef(3)
  const [flare, setFlare] = useState(null)
  const [hitResult, setHitResult] = useState(null)
  const [done, setDone] = useState(false)
  const [bestDist, setBestDist] = useState(999)
  const containerR = useRef(null)

  // Helicopter
  useEffect(() => { if (done) return; const iv = setInterval(() => setHx(p => { let n = p + dirR.current * hSpeed; if (n > 85) { dirR.current = -1; n = 85 } if (n < 12) { dirR.current = 1; n = 12 } hxR.current = n; return n }), 50); return () => clearInterval(iv) }, [done, hSpeed])
  useEffect(() => { if (done) return; const iv = setInterval(() => S.heli(), 800); return () => clearInterval(iv) }, [done])

  // Wind changes every 5-8 seconds
  useEffect(() => { if (done) return; const iv = setInterval(() => { setWind(Math.round((Math.random() - 0.5) * 6 * diff.sMul)); S.wind() }, 5000 + Math.random() * 3000); return () => clearInterval(iv) }, [done, diff.sMul])

  // Mouse controls angle (Y position)
  const handleMouseMove = useCallback((e) => {
    if (!containerR.current || flare || done) return
    const r = containerR.current.getBoundingClientRect()
    const yPct = 1 - ((e.clientY - r.top) / r.height) // 0=bottom, 1=top
    setAngle(Math.max(20, Math.min(88, 20 + yPct * 68)))
  }, [flare, done])

  // Power charges while SPACEBAR is held
  useEffect(() => {
    if (!charging) return
    const iv = setInterval(() => setPower(p => { const n = p + 2; return n > 100 ? 0 : n }), 30)
    return () => clearInterval(iv)
  }, [charging])

  // Keyboard: SPACE to charge+fire
  useEffect(() => {
    if (done) return
    const onDown = (e) => { if (e.code === 'Space' && !charging && !flare) { e.preventDefault(); setCharging(true); S.tick() } }
    const onUp = (e) => { if (e.code === 'Space' && charging) { e.preventDefault(); setCharging(false); launch() } }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [done, charging, flare, angle, power])

  // Flare physics with wind
  useEffect(() => {
    if (!flare) return
    const iv = setInterval(() => {
      setFlare(f => {
        if (!f) return null
        const windForce = wind * 0.02
        const nx = f.x + f.vx + windForce, ny = f.y + f.vy, nvy = f.vy + G
        const trail = [...f.trail.slice(-18), { x: f.x, y: f.y }]
        const dx = nx - hxR.current, dy = ny - 8
        if (Math.sqrt(dx * dx + dy * dy) < 12) {
          clearInterval(iv); S.boom(); setTimeout(() => S.ok(), 200)
          setBestDist(0); setHitResult('hit'); setFlare(null)
          setTimeout(() => setDone(true), 1200); return null
        }
        if (ny > 98 || ny < -5 || nx < -10 || nx > 110) {
          clearInterval(iv); S.bad()
          setBestDist(d => Math.min(d, Math.sqrt((f.peakX - hxR.current) ** 2 + ((f.peakY || 50) - 8) ** 2)))
          setHitResult('miss'); setFlare(null)
          if (flaresR.current <= 0) setTimeout(() => setDone(true), 800)
          else setTimeout(() => setHitResult(null), 1000)
          return null
        }
        return { ...f, x: nx, y: ny, vx: f.vx, vy: nvy, peakX: ny < (f.peakY ?? 99) ? nx : (f.peakX ?? nx), peakY: Math.min(f.peakY ?? 99, ny), trail }
      })
    }, 25)
    return () => clearInterval(iv)
  }, [flare, wind])

  const launch = () => {
    if (flaresLeft <= 0 || flare || done) return
    S.flare(); setCharging(false)
    const rad = (angle / 180) * Math.PI
    const v = 3 + (power / 100) * 3.5 // velocity 3-6.5
    setFlare({ x: 50, y: 92, vx: Math.cos(rad) * v * 0.4, vy: -Math.sin(rad) * v, peakY: 92, peakX: 50, trail: [] })
    const rem = flaresLeft - 1; setFlaresLeft(rem); flaresR.current = rem; setPower(50)
  }

  // Trajectory arc preview using projectile equation
  const rad = (angle / 180) * Math.PI
  const v0 = 3 + (power / 100) * 3.5
  const v0x = v0 * Math.cos(rad) * 0.4, v0y = v0 * Math.sin(rad)
  const arcPts = []
  if (!flare && !done) {
    for (let t = 1; t <= 40; t++) {
      const px = 50 + v0x * t
      const py = 92 - v0y * t + 0.5 * G * t * t + wind * 0.02 * t
      if (py < -2 || py > 95 || px < -5 || px > 105) break
      arcPts.push({ x: px, y: py })
    }
  }

  const score = bestDist < 5 ? 100 : bestDist < 12 ? 85 : bestDist < 25 ? 60 : bestDist < 40 ? 35 : 10

  if (done) return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: score >= 60 ? C.green : C.red }}>{score >= 80 ? 'DIRECT HIT!' : score >= 60 ? 'CLOSE!' : 'MISSED'}</h2><div style={{ fontSize: '3.5rem', fontWeight: 900, color: score >= 60 ? C.green : C.red }}>{score}%</div><div style={{ color: C.muted, margin: '8px auto 20px', maxWidth: 400, fontSize: '.85rem', lineHeight: 1.5 }}>Flares reach 200m height, burn 6-10 sec. Visible 25+ miles at night. Wind affects trajectory — always compensate.</div><button onClick={() => onDone(score)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE</button></div>

  return (
    <div ref={containerR} onMouseMove={handleMouseMove} style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, overflow: 'hidden', borderRadius: 8, background: 'linear-gradient(180deg,#050510 0%,#0a1025 40%,#101835 70%,#080e1a 100%)', userSelect: 'none', cursor: flare ? 'default' : 'crosshair' }}>
      {/* Stars */}
      {Array.from({ length: 40 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: .15 + Math.random() * .45 }} />)}
      {/* Helicopter */}
      <div style={{ position: 'absolute', left: `${hx}%`, top: '6%', transform: 'translateX(-50%)', fontSize: '2.8rem' }}>🚁</div>
      {/* Water */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10%', background: 'linear-gradient(0deg,rgba(15,30,60,.7),transparent)' }} />
      {/* Person */}
      <div style={{ position: 'absolute', bottom: '4%', left: '48%', fontSize: '1.5rem' }}>🧍</div>

      {/* TRAJECTORY ARC PREVIEW — real projectile equation */}
      {!flare && !done && arcPts.length > 1 && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Aim line */}
          <line x1="50" y1="92" x2={50 + Math.cos(rad) * 12} y2={92 - Math.sin(rad) * 12} stroke={C.amber} strokeWidth="0.3" />
          {/* Trajectory curve */}
          <polyline points={arcPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(255,150,50,0.4)" strokeWidth="0.3" strokeDasharray="0.8,0.5" />
          {/* Dots along arc */}
          {arcPts.filter((_, i) => i % 3 === 0).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="0.4" fill="rgba(255,150,50,0.5)" />)}
        </svg>
      )}

      {/* Flying flare */}
      {flare && <>
        {flare.trail.map((p, i) => <div key={i} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: 3 + i * .3, height: 3 + i * .3, borderRadius: '50%', background: `rgba(255,${80 + i * 12},0,${.06 + i * .04})`, pointerEvents: 'none' }} />)}
        <div style={{ position: 'absolute', left: `${flare.x}%`, top: `${flare.y}%`, width: 14, height: 14, borderRadius: '50%', background: 'radial-gradient(circle,#fff 0%,#ff6600 40%,rgba(255,100,0,.3) 70%,transparent 100%)', boxShadow: '0 0 30px rgba(255,100,0,.6),0 0 60px rgba(255,50,0,.3)', transform: 'translate(-50%,-50%)' }} />
      </>}

      {/* Hit/miss */}
      {hitResult === 'hit' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}><div style={{ fontSize: '2.5rem', fontWeight: 900, color: C.green, animation: 'sf 1s ease-out forwards', textShadow: `0 0 30px ${C.green}` }}>DIRECT HIT!</div></div>}
      {hitResult === 'miss' && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}><div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.red, animation: 'sf .8s ease-out forwards' }}>MISS</div></div>}

      {/* HUD */}
      <div style={{ position: 'absolute', top: 10, right: 14, background: 'rgba(0,0,0,.7)', padding: '8px 14px', borderRadius: 6, fontFamily: 'monospace' }}>
        <div style={{ fontSize: '.65rem', color: C.muted }}>FLARES</div>
        <div style={{ fontSize: '1.2rem' }}>{'🔴'.repeat(flaresLeft)}{'⚫'.repeat(3 - flaresLeft)}</div>
      </div>
      {/* Wind indicator */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.7)', padding: '6px 16px', borderRadius: 6, fontFamily: 'monospace', textAlign: 'center' }}>
        <div style={{ fontSize: '.6rem', color: C.muted }}>WIND</div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: Math.abs(wind) > 2 ? C.red : C.cyan }}>
          {wind < 0 ? '←' : wind > 0 ? '→' : '·'} {Math.abs(wind)} {wind < 0 ? 'W' : wind > 0 ? 'E' : ''}
        </div>
      </div>
      <div style={{ position: 'absolute', top: 10, left: 14, background: 'rgba(0,0,0,.7)', padding: '6px 14px', borderRadius: 6, fontFamily: 'monospace' }}>
        <div style={{ fontSize: '.6rem', color: C.muted }}>ANGLE</div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: C.amber }}>{Math.round(angle)}°</div>
      </div>

      {/* Power bar + launch */}
      {!flare && !done && flaresLeft > 0 && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 10 }}>
          {/* Power meter */}
          <div style={{ width: 200, height: 12, background: 'rgba(0,0,0,.6)', borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.muted}44` }}>
            <div style={{ height: '100%', width: `${power}%`, background: power > 75 ? C.red : power > 40 ? C.amber : C.green, transition: charging ? 'none' : 'width .1s', borderRadius: 6 }} />
          </div>
          <div style={{ fontSize: '.7rem', color: C.muted }}>POWER: {power}%</div>
          <button
            onMouseDown={() => { S.tick(); setCharging(true) }}
            onMouseUp={() => { setCharging(false); launch() }}
            onMouseLeave={() => { if (charging) { setCharging(false); launch() } }}
            style={{ background: charging ? C.amber : C.red, border: 'none', color: '#fff', padding: '14px 40px', borderRadius: 10, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', boxShadow: `0 0 20px ${charging ? C.amber : C.red}44`, transition: 'background .15s' }}>
            {charging ? `CHARGING... ${power}%` : 'HOLD SPACE to charge → RELEASE to fire'}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', color: C.muted, fontSize: '.72rem', pointerEvents: 'none', textAlign: 'center', maxWidth: 350 }}>
        {!flare && !done ? '🖱️ Move mouse to aim • ⎵ HOLD SPACEBAR to charge • RELEASE to fire • Watch the wind!' : ''}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   WHISTLE GAME — Magic Tiles / falling notes. SOS pattern:
   3 short (tap), 3 long (hold), 3 short (tap).
   Notes fall TOP→BOTTOM. Hit zone at bottom. Breath meter.
   ═══════════════════════════════════════════════════════════ */
function WhistleGame({ onDone, diff = DIFF.medium }) {
  const SPEED = 0.006 * diff.sMul // SLOWER fall speed — easier to react
  // Notes: type='dot' (SPACE tap) or 'dash' (SHIFT hold). SOS = 3 dot, 3 dash, 3 dot × 2 rounds
  const [notes] = useState(() => {
    const n = []
    for (let round = 0; round < 2; round++) {
      const base = round * 9
      // S: 3 dots — more spacing between notes
      for (let i = 0; i < 3; i++) n.push({ id: base + i, type: 'dot', startY: -(15 + (base + i) * 18), hit: null })
      // O: 3 dashes
      for (let i = 0; i < 3; i++) n.push({ id: base + 3 + i, type: 'dash', startY: -(15 + (base + 3 + i) * 18 + 12), hit: null })
      // S: 3 dots
      for (let i = 0; i < 3; i++) n.push({ id: base + 6 + i, type: 'dot', startY: -(15 + (base + 6 + i) * 18 + 24), hit: null })
    }
    return n
  })
  const [phase, setPhase] = useState('play')
  const [score, setScore] = useState(0)
  const [breath, setBreath] = useState(100) // breath meter
  const [holding, setHolding] = useState(false)
  const [hitFx, setHitFx] = useState(null)
  const [shakeS, shake] = useShake()
  const [offset, setOffset] = useState(0) // STATE not ref — forces re-render every frame
  const holdStartR = useRef(null)
  const holdingR = useRef(false) // ref mirror for keyboard handler
  const HIT_ZONE = 82

  // Keyboard: SPACE=tap, SHIFT=hold (use refs to avoid stale closures)
  const tapR = useRef(null)
  useEffect(() => {
    if (phase !== 'play') return
    const onDown = (e) => {
      if (e.code === 'Space') { e.preventDefault(); if (tapR.current) tapR.current() }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); setHolding(true); holdingR.current = true }
    }
    const onUp = (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { setHolding(false); holdingR.current = false }
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [phase])

  // Main game loop — requestAnimationFrame for smooth 60fps note movement
  useEffect(() => {
    if (phase !== 'play') return
    let raf
    let lastT = performance.now()
    const loop = (now) => {
      const dt = (now - lastT) / 1000 // seconds since last frame
      lastT = now
      setOffset(o => {
        const next = o + SPEED * dt * 60 // normalize to 60fps
        // Check end condition
        const allDone = notes.every(n => n.hit || (n.startY + next * 100) > HIT_ZONE + 15)
        if (allDone) { setPhase('result'); return next }
        return next
      })
      // Breath
      setBreath(b => {
        if (holdingR.current) return Math.max(0, b - 0.8)
        return Math.min(100, b + 0.15)
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, SPEED])

  // Tap (for dots) — uses a ref so keyboard handler always gets latest version
  const tapFn = useCallback(() => {
    if (phase !== 'play' || breath <= 0) return
    S.whistle()
    let bestNote = null, bestDist = 999
    for (const n of notes) {
      if (n.hit || n.type !== 'dot') continue
      const noteY = n.startY + offset * 100
      const d = Math.abs(noteY - HIT_ZONE)
      if (d < bestDist && d < 15) { bestNote = n; bestDist = d }
    }
    if (!bestNote) { shake(); S.bad(); setHitFx('miss'); setBreath(b => Math.max(0, b - 10)); setTimeout(() => setHitFx(null), 300); return }
    const q = bestDist < 5 ? 'perfect' : bestDist < 10 ? 'good' : 'ok'
    bestNote.hit = q
    setScore(s => s + (q === 'perfect' ? 30 : q === 'good' ? 20 : 10))
    setHitFx(q); S.ok()
    setTimeout(() => setHitFx(null), 300)
  }, [phase, breath, offset, notes])
  // Keep ref updated for keyboard handler
  useEffect(() => { tapR.current = tapFn }, [tapFn])
  const tap = tapFn

  // Hold (for dashes) — check each frame when holding
  useEffect(() => {
    if (!holding || phase !== 'play') return
    const iv = setInterval(() => {
      if (breath <= 0) { setHolding(false); holdingR.current = false; return }
      for (const n of notes) {
        if (n.hit || n.type !== 'dash') continue
        const noteY = n.startY + offset * 100
        if (Math.abs(noteY - HIT_ZONE) < 10) {
          n.hit = 'perfect'
          setScore(s => s + 25)
          S.beep(1800)
        }
      }
    }, 60)
    return () => clearInterval(iv)
  }, [holding, phase, breath, offset])

  const pct = Math.min(100, Math.round((score / (18 * 25)) * 100))

  if (phase === 'result') return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: pct >= 60 ? C.green : C.red }}>{pct >= 80 ? 'PERFECT SIGNAL!' : pct >= 60 ? 'RESCUERS HEARD YOU' : 'SIGNAL TOO WEAK'}</h2><div style={{ fontSize: '3.5rem', fontWeight: 900, color: pct >= 60 ? C.green : C.red }}>{pct}%</div><div style={{ color: C.muted, margin: '8px auto 20px', maxWidth: 400, fontSize: '.85rem', lineHeight: 1.5 }}>SOS whistle: 3 short blasts, 3 long blasts, 3 short blasts. Pause 60 sec, repeat. Sound cuts through fog where light cannot.</div><button onClick={() => onDone(pct)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE</button></div>

  return (
    <div style={{ ...shakeS, position: 'relative', width: '100%', height: '100%', minHeight: 500, overflow: 'hidden', borderRadius: 8, backgroundImage: `url(${PX(1089930, 1200)})`, backgroundSize: 'cover', userSelect: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />

      {/* Note track — center column */}
      <div style={{ position: 'absolute', left: '35%', width: '30%', top: 0, bottom: 0, background: 'rgba(0,0,0,.3)', borderLeft: `1px solid ${C.blue}22`, borderRight: `1px solid ${C.blue}22` }}>
        {/* Hit zone bar */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: `${HIT_ZONE}%`, height: 4, background: C.blue, boxShadow: `0 0 15px ${C.blue}`, zIndex: 5 }} />
        <div style={{ position: 'absolute', left: -30, top: `${HIT_ZONE - 1}%`, fontSize: '.65rem', color: C.blue, fontWeight: 'bold' }}>HIT ▸</div>

        {/* Falling notes */}
        {notes.map(n => {
          const y = n.startY + offset * 100
          if (y < -15 || y > 100) return null
          const isDash = n.type === 'dash'
          const isHit = n.hit
          return (
            <div key={n.id} style={{
              position: 'absolute', left: '50%', top: `${y}%`, transform: 'translate(-50%,-50%)',
              width: isDash ? '70%' : '40%',
              height: isDash ? 28 : 18,
              borderRadius: isDash ? 6 : '50%',
              background: isHit ? (isHit === 'perfect' ? C.green : C.amber) : (isDash ? 'rgba(239,68,68,.8)' : 'rgba(255,255,255,.85)'),
              boxShadow: isHit ? 'none' : `0 0 10px ${isDash ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.3)'}`,
              opacity: isHit ? 0.3 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.6rem', fontWeight: 'bold', color: isDash ? '#fff' : '#333',
            }}>
              {!isHit && (isDash ? '━ HOLD ━' : '•')}
            </div>
          )
        })}
      </div>

      {/* Breath meter — left side */}
      <div style={{ position: 'absolute', left: 14, top: '15%', bottom: '15%', width: 20, background: 'rgba(0,0,0,.5)', borderRadius: 10, overflow: 'hidden', border: `1px solid ${breath < 20 ? C.red : C.blue}44` }}>
        <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${breath}%`, background: breath < 20 ? C.red : breath < 50 ? C.amber : C.blue, transition: 'height .1s', borderRadius: 10 }} />
      </div>
      <div style={{ position: 'absolute', left: 8, top: '10%', fontSize: '.6rem', color: C.muted, fontWeight: 'bold', writingMode: 'vertical-rl', textOrientation: 'mixed' }}>BREATH</div>

      {/* Hit feedback */}
      {hitFx && <div style={{ position: 'absolute', top: `${HIT_ZONE - 8}%`, left: '50%', transform: 'translateX(-50%)', fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: hitFx === 'perfect' ? C.green : hitFx === 'good' ? C.amber : hitFx === 'ok' ? '#fff' : C.red, animation: 'sf .5s ease-out forwards', textShadow: '0 0 15px currentColor', zIndex: 10 }}>{hitFx === 'miss' ? 'MISS!' : hitFx === 'perfect' ? 'PERFECT!' : hitFx === 'good' ? 'GOOD' : 'OK'}</div>}

      {/* SOS pattern indicator */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.7)', padding: '4px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: '.8rem', color: C.muted }}>
        <span style={{ color: '#fff' }}>•••</span> <span style={{ color: C.red }}>━━━</span> <span style={{ color: '#fff' }}>•••</span> SOS
      </div>

      {/* Controls — keyboard: SPACE=tap, SHIFT=hold */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 12, zIndex: 10 }}>
        <button onClick={tap} disabled={breath <= 0} style={{ background: 'rgba(255,255,255,.15)', border: `3px solid #fff`, color: '#fff', padding: '18px 32px', borderRadius: 12, fontSize: '1.1rem', fontWeight: 'bold', cursor: breath > 0 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', opacity: breath > 0 ? 1 : .3 }}>
          • TAP <span style={{ fontSize: '.65rem', opacity: .5 }}>[SPACE]</span>
        </button>
        <button
          onMouseDown={() => { setHolding(true); holdStartR.current = Date.now() }}
          onMouseUp={() => setHolding(false)}
          onMouseLeave={() => setHolding(false)}
          onTouchStart={() => { setHolding(true); holdStartR.current = Date.now() }}
          onTouchEnd={() => setHolding(false)}
          disabled={breath <= 0}
          style={{ background: holding ? 'rgba(239,68,68,.4)' : 'rgba(239,68,68,.15)', border: `3px solid ${C.red}`, color: '#fff', padding: '18px 32px', borderRadius: 12, fontSize: '1.1rem', fontWeight: 'bold', cursor: breath > 0 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', opacity: breath > 0 ? 1 : .3, transition: 'background .1s' }}>
          ━ HOLD <span style={{ fontSize: '.65rem', opacity: .5 }}>[SHIFT]</span>
        </button>
      </div>

      {/* Score */}
      <div style={{ position: 'absolute', top: 10, right: 14, background: 'rgba(0,0,0,.7)', padding: '6px 14px', borderRadius: 6, fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900, color: C.amber }}>{score}</div>

      {/* Breath warning */}
      {breath < 20 && <div style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', color: C.red, fontSize: '.85rem', fontWeight: 'bold', fontFamily: 'monospace', animation: 'sp .5s ease-in-out infinite' }}>LOW BREATH!</div>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   FIRE GAME — Real-time plate-spinning survival:
   3 meters (HEAT/FUEL/OXYGEN) must stay in green zone.
   Drag materials to add fuel. Click fan for oxygen.
   Rain events kill heat. Too much fuel smothers oxygen.
   Survive 60 seconds to signal. Active balancing act.
   ═══════════════════════════════════════════════════════════ */
function FireGame({ onDone, diff = DIFF.medium }) {
  const [level, setLevel] = useState(1) // 1=basic, 2=+oxygen, 3=+rain+wind, 4=limited resources
  const SURVIVE = Math.round((level === 1 ? 20 : level === 2 ? 30 : level === 3 ? 40 : 50) * diff.tMul)
  const [heat, setHeat] = useState(50)
  const [fuel, setFuel] = useState(40)
  const [oxygen, setOxygen] = useState(80)
  const [timer, setTimer] = useState(SURVIVE)
  const [done, setDone] = useState(false)
  const [raining, setRaining] = useState(false)
  const [warning, setWarning] = useState('')
  const [survived, setSurvived] = useState(false)
  const [shakeS, shake] = useShake()
  const [embers, setEmbers] = useState([]) // visual particles
  const hR = useRef(50), fR = useRef(40), oR = useRef(80)

  // Resources — limited on higher levels
  const [tinder, setTinder] = useState(level >= 4 ? 3 : 8)
  const [twigs, setTwigs] = useState(level >= 4 ? 2 : 6)
  const [logs, setLogs] = useState(level >= 4 ? 1 : 4)

  // Keyboard shortcuts: 1=tinder, 2=twigs, 3=log, F=fan
  useEffect(() => {
    if (done) return
    const onKey = (e) => {
      if (e.code === 'Digit1' || e.code === 'Numpad1') addTinder()
      if (e.code === 'Digit2' || e.code === 'Numpad2') addTwigs()
      if (e.code === 'Digit3' || e.code === 'Numpad3') addLogs()
      if (e.code === 'KeyF') fan()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, tinder, twigs, logs])

  // Ember particles — spawn when fire is strong
  useEffect(() => {
    if (done || heat < 30) return
    const iv = setInterval(() => {
      setEmbers(prev => [...prev.slice(-12), { id: Date.now() + Math.random(), x: 45 + Math.random() * 10, life: 1 }])
    }, 200)
    return () => clearInterval(iv)
  }, [done, heat > 30])
  // Animate embers
  useEffect(() => {
    if (embers.length === 0) return
    const iv = setInterval(() => {
      setEmbers(prev => prev.map(e => ({ ...e, life: e.life - 0.04, x: e.x + (Math.random() - 0.5) * 2 })).filter(e => e.life > 0))
    }, 50)
    return () => clearInterval(iv)
  }, [embers.length > 0])

  // Core game loop — all three meters decay and interact
  useEffect(() => {
    if (done) return
    const iv = setInterval(() => {
      // Heat decays naturally, faster in rain
      hR.current = Math.max(0, hR.current - (raining ? 2.5 : 0.8) * diff.sMul)
      // Fuel burns away if there's heat
      if (hR.current > 20) fR.current = Math.max(0, fR.current - 0.5)
      // Oxygen — only matters on level 2+
      if (level >= 2) {
        if (fR.current > 80) oR.current = Math.max(0, oR.current - 1.2)
        else oR.current = Math.min(100, oR.current + 0.15)
      }

      // Fire strength = min of all three (weakest link)
      const fireStrength = Math.min(hR.current, fR.current, oR.current)

      // Heat rises from fuel burning (if oxygen present)
      if (fR.current > 10 && oR.current > 20) hR.current = Math.min(100, hR.current + 0.3)

      // Death: heat or fuel at 0 kills fire. Oxygen only matters level 2+
      if (hR.current <= 0 || fR.current <= 0 || (level >= 2 && oR.current <= 0)) {
        setDone(true); S.bad(); shake()
      }

      setHeat(hR.current); setFuel(fR.current); setOxygen(oR.current)

      // Warnings
      if (fR.current > 80) setWarning('⚠️ TOO MUCH FUEL — SMOTHERING OXYGEN!')
      else if (oR.current < 25) setWarning('⚠️ LOW OXYGEN — FAN THE FLAMES!')
      else if (hR.current < 20) setWarning('⚠️ HEAT DYING — ADD FUEL!')
      else if (raining) setWarning('🌧️ RAIN — HEAT DROPPING FAST!')
      else setWarning('')
    }, 100)
    return () => clearInterval(iv)
  }, [done, raining, diff.sMul])

  // Timer
  useEffect(() => {
    if (done) return
    const iv = setInterval(() => {
      setTimer(t => {
        if (t <= 1) { setSurvived(true); setDone(true); S.ok(); return 0 }
        if (t <= 5) S.cdB(t)
        return t - 1
      })
    }, 1e3)
    return () => clearInterval(iv)
  }, [done])

  // Rain events — only on level 3+
  useEffect(() => {
    if (done || level < 3) return
    const iv = setInterval(() => {
      if (Math.random() < 0.3 * diff.sMul) {
        setRaining(true); S.wind(); shake()
        setTimeout(() => setRaining(false), 3000 + Math.random() * 2000)
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [done, diff.sMul, level])

  // Fire crackling
  useEffect(() => { if (done || heat < 20) return; const iv = setInterval(() => S.fire(), 500); return () => clearInterval(iv) }, [done, heat > 20])

  // Actions
  const addTinder = () => { if (tinder <= 0 || done) return; S.click(); setTinder(t => t - 1); fR.current = Math.min(100, fR.current + 8); hR.current = Math.min(100, hR.current + 5) }
  const addTwigs = () => { if (twigs <= 0 || done) return; S.click(); setTwigs(t => t - 1); fR.current = Math.min(100, fR.current + 15) }
  const addLogs = () => { if (logs <= 0 || done) return; S.click(); setLogs(t => t - 1); fR.current = Math.min(100, fR.current + 25); oR.current = Math.max(0, oR.current - 15) } // logs drop oxygen!
  const fan = () => { if (done) return; S.whoosh(); oR.current = Math.min(100, oR.current + 12); hR.current = Math.min(100, hR.current + 3) }

  const fireStrength = Math.min(heat, fuel, oxygen)
  const score = survived ? Math.min(100, 60 + Math.round(fireStrength * 0.4)) : Math.round(Math.max(0, (SURVIVE - timer) / SURVIVE) * 40)

  if (done) return <div style={{ padding: 28, textAlign: 'center' }}>
    <div style={{ fontSize: '.75rem', color: C.amber, letterSpacing: '.15em', marginBottom: 4 }}>LEVEL {level} / 4</div>
    <h2 style={{ fontSize: '2rem', color: survived ? C.green : C.red }}>{survived ? `LEVEL ${level} COMPLETE!` : 'FIRE DIED OUT'}</h2>
    <div style={{ fontSize: '3rem', fontWeight: 900, color: survived ? C.green : C.red }}>{score}%</div>
    <div style={{ color: C.muted, margin: '8px auto 16px', maxWidth: 450, fontSize: '.8rem', lineHeight: 1.5 }}>
      {level === 1 && 'Level 1: Keep HEAT and FUEL alive. Tinder catches fast, twigs build steadily.'}
      {level === 2 && 'Level 2: OXYGEN matters now! Logs smother fire — use FAN to recover oxygen.'}
      {level === 3 && 'Level 3: RAIN events drop your heat fast. Balance all three meters.'}
      {level === 4 && 'Level 4: LIMITED resources. Every piece of fuel is precious. Survive 50 seconds.'}
    </div>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {survived && level < 4 && (
        <button onClick={() => { setLevel(l => l + 1); setHeat(50); setFuel(40); setOxygen(80); hR.current = 50; fR.current = 40; oR.current = 80; setTimer(Math.round((level === 1 ? 30 : level === 2 ? 40 : 50) * diff.tMul)); setDone(false); setSurvived(false); setRaining(false); setTinder(level >= 3 ? 3 : 6); setTwigs(level >= 3 ? 2 : 4); setLogs(level >= 3 ? 1 : 3); S.whoosh() }} style={{ background: `linear-gradient(135deg, ${C.green}, #16a34a)`, color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', animation: 'sp 1.5s ease-in-out infinite' }}>
          NEXT LEVEL →
        </button>
      )}
      <button onClick={() => onDone(score)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 36px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {survived && level >= 4 ? 'COMPLETE!' : 'EXIT'}
      </button>
    </div>
  </div>

  // Helper for meter color
  const mColor = (v) => v > 70 ? C.green : v > 40 ? C.amber : v > 20 ? C.orange : C.red
  const inGreen = (v) => v > 30 && v < 85

  return (
    <div style={{ ...shakeS, position: 'relative', width: '100%', height: '100%', minHeight: 480, overflow: 'hidden', borderRadius: 8, background: 'linear-gradient(180deg,#0a0f18 0%,#151510 100%)', userSelect: 'none' }}>
      {/* Stars */}
      {Array.from({ length: 20 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 40}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: .15 + Math.random() * .3 }} />)}

      {/* Rain overlay — level 3+ */}
      {raining && <Rain />}
      {raining && <div style={{ position: 'absolute', inset: 0, background: 'rgba(50,80,120,.1)', pointerEvents: 'none' }} />}

      {/* Ember particles floating up */}
      {embers.map(e => <div key={e.id} style={{ position: 'absolute', left: `${e.x}%`, bottom: `${18 + (1 - e.life) * 45}%`, width: 4 + e.life * 4, height: 4 + e.life * 4, borderRadius: '50%', background: `rgba(255,${120 + e.life * 100},0,${e.life * 0.7})`, boxShadow: `0 0 ${e.life * 6}px rgba(255,150,0,${e.life * 0.4})`, pointerEvents: 'none', transition: 'left .1s' }} />)}

      {/* Full-screen orange glow when fire strong */}
      {fireStrength > 50 && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 85%, rgba(255,${60 + fireStrength},0,${fireStrength / 600}), transparent 60%)`, pointerEvents: 'none' }} />}

      {/* Level badge */}
      <div style={{ position: 'absolute', top: 12, left: 14, background: 'rgba(0,0,0,.7)', padding: '4px 12px', borderRadius: 6, fontFamily: 'monospace' }}>
        <div style={{ fontSize: '.6rem', color: C.muted }}>LEVEL</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: C.amber }}>{level}/4</div>
      </div>

      {/* FIRE visual — size based on weakest meter */}
      <div style={{ position: 'absolute', bottom: '18%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <div style={{ fontSize: `${0.4 + fireStrength / 20}rem`, animation: fireStrength > 10 ? 'sfl .25s ease-in-out infinite' : 'none', filter: `brightness(${.2 + fireStrength / 100})`, minHeight: 50, transition: 'font-size .3s' }}>
          {fireStrength > 70 ? '🔥🔥🔥' : fireStrength > 40 ? '🔥🔥' : fireStrength > 15 ? '🔥' : fireStrength > 3 ? '🕯️' : '💀'}
        </div>
        {/* Glow */}
        {fireStrength > 15 && <div style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', width: fireStrength * 2, height: fireStrength, borderRadius: '50%', background: `radial-gradient(ellipse,rgba(255,${60 + fireStrength},0,${fireStrength / 350}),transparent 70%)`, pointerEvents: 'none' }} />}
      </div>

      {/* Ground */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '15%', background: 'linear-gradient(0deg,#2a2510,#1a1a10)' }} />

      {/* METERS — heat + fuel always, oxygen on level 2+ */}
      <div style={{ position: 'absolute', top: 50, left: 14, right: 14, display: 'flex', justifyContent: 'center', gap: 20 }}>
        {[
          { label: '🔥 HEAT', value: heat, color: mColor(heat) },
          { label: '🪵 FUEL', value: fuel, color: mColor(fuel) },
          ...(level >= 2 ? [{ label: '💨 O₂', value: oxygen, color: mColor(oxygen) }] : []),
        ].map((m, i) => (
          <div key={i} style={{ textAlign: 'center', width: 80 }}>
            <div style={{ fontSize: '.65rem', color: C.muted, fontWeight: 'bold', marginBottom: 3 }}>{m.label}</div>
            <div style={{ height: 100, background: 'rgba(0,0,0,.5)', borderRadius: 6, overflow: 'hidden', border: `1px solid ${inGreen(m.value) ? C.green + '44' : m.color + '44'}`, position: 'relative' }}>
              {/* Green zone indicator */}
              <div style={{ position: 'absolute', top: '15%', bottom: '15%', left: 0, right: 0, borderTop: `1px dashed ${C.green}33`, borderBottom: `1px dashed ${C.green}33` }} />
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${m.value}%`, background: m.color, transition: 'height .15s', borderRadius: 6 }} />
            </div>
            <div style={{ fontSize: '.75rem', fontWeight: 'bold', color: m.color, marginTop: 2 }}>{Math.round(m.value)}%</div>
          </div>
        ))}
      </div>

      {/* Warning */}
      {warning && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.8)', padding: '5px 14px', borderRadius: 6, fontSize: '.78rem', color: C.red, fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap', zIndex: 5, animation: 'sp .5s ease-in-out infinite' }}>{warning}</div>}

      {/* Timer */}
      <div style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(0,0,0,.7)', padding: '6px 12px', borderRadius: 6, fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 900, color: timer < 10 ? C.red : '#fff', animation: timer < 10 ? 'sh 1s ease-in-out infinite' : 'none' }}>
        {timer}s
      </div>

      {/* Action buttons with keyboard shortcuts */}
      <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
        <button onClick={addTinder} disabled={tinder <= 0} style={{ background: tinder > 0 ? '#3a2a10' : '#1a1a1a', border: `2px solid ${C.amber}`, color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: '.8rem', fontWeight: 'bold', cursor: tinder > 0 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', opacity: tinder > 0 ? 1 : .3 }}>
          🍂 Tinder ({tinder}) <span style={{ fontSize: '.6rem', opacity: .5 }}>[1]</span>
        </button>
        <button onClick={addTwigs} disabled={twigs <= 0} style={{ background: twigs > 0 ? '#2a2010' : '#1a1a1a', border: `2px solid ${C.orange}`, color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: '.8rem', fontWeight: 'bold', cursor: twigs > 0 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', opacity: twigs > 0 ? 1 : .3 }}>
          🪵 Twigs ({twigs}) <span style={{ fontSize: '.6rem', opacity: .5 }}>[2]</span>
        </button>
        {level >= 2 && <button onClick={addLogs} disabled={logs <= 0} style={{ background: logs > 0 ? '#1a1508' : '#1a1a1a', border: `2px solid ${C.red}`, color: '#fff', padding: '10px 12px', borderRadius: 8, fontSize: '.8rem', fontWeight: 'bold', cursor: logs > 0 ? 'pointer' : 'not-allowed', fontFamily: 'monospace', opacity: logs > 0 ? 1 : .3 }}>
          🌲 Log ({logs}) <span style={{ fontSize: '.6rem', color: C.red }}>-O₂</span> <span style={{ fontSize: '.6rem', opacity: .5 }}>[3]</span>
        </button>}
        {level >= 2 && <button onClick={fan} style={{ background: 'rgba(59,130,246,.15)', border: `2px solid ${C.blue}`, color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: '.8rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace' }}>
          💨 FAN <span style={{ fontSize: '.6rem', opacity: .5 }}>[F]</span>
        </button>}
      </div>

      {/* Level-specific hint */}
      <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', color: C.muted, fontSize: '.62rem', fontFamily: 'monospace', textAlign: 'center', pointerEvents: 'none' }}>
        {level === 1 && 'Level 1: Keep heat and fuel alive. Use tinder [1] for quick heat, twigs [2] for steady fuel.'}
        {level === 2 && 'Level 2: Oxygen matters! Logs [3] add big fuel but DROP oxygen. Fan [F] to recover.'}
        {level === 3 && 'Level 3: Rain incoming! Heat drops fast in rain. Balance all three meters.'}
        {level === 4 && 'Level 4: LIMITED resources. Make every piece count. Survive 50 seconds.'}
      </div>
    </div>
  )
}

/* ═══════════════════════ MORSE ═══════════════════════ */
function MorseGame({ onDone }) {
  const [ph, setPh] = useState('learn'); const [log, setLog] = useState([]); const [cur, setCur] = useState(0); const [press, setPress] = useState(null); const [score, setScore] = useState(0); const [fb, setFb] = useState(''); const [on, setOn] = useState(false); const [ss, shake] = useShake()
  const tgt = [1,1,1, 3,3,3, 1,1,1]
  const dn = () => { setPress(Date.now()); setOn(true); S.beep(800) }
  const up = () => { if (!press) return; const dur = Date.now() - press; setPress(null); setOn(false); const dah = dur > 350; const exp = tgt[cur]; if (exp === undefined) return; const ok = (exp === 1 && !dah) || (exp === 3 && dah); setLog(p => [...p, { t: dah ? 'd' : '.', ok }]); if (ok) { setScore(s => s + 1); setFb(dah ? 'DAH ━' : 'DIT •'); S.ok() } else { setFb(`Need ${exp === 1 ? 'DIT •' : 'DAH ━'}`); S.bad(); shake() }; setCur(c => c + 1); if (cur + 1 >= tgt.length) setTimeout(() => setPh('result'), 500) }
  const pct = Math.round((score / tgt.length) * 100)
  if (ph === 'learn') return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: C.cyan }}>MORSE: SOS</h2><div style={{ fontSize: '4.5rem', letterSpacing: 16, fontFamily: 'monospace', marginBottom: 16 }}><span style={{ color: C.green }}>•••</span> <span style={{ color: C.red }}>━━━</span> <span style={{ color: C.green }}>•••</span></div><div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginBottom: 24 }}><div style={{ background: C.card, borderRadius: 8, padding: '14px 24px', border: `1px solid ${C.green}33` }}><div style={{ fontSize: '1.3rem', color: C.green, fontWeight: 'bold' }}>• DIT</div><div style={{ color: C.muted, fontSize: '.8rem', marginTop: 4 }}>Short (&lt;0.35s)</div></div><div style={{ background: C.card, borderRadius: 8, padding: '14px 24px', border: `1px solid ${C.red}33` }}><div style={{ fontSize: '1.3rem', color: C.red, fontWeight: 'bold' }}>━ DAH</div><div style={{ color: C.muted, fontSize: '.8rem', marginTop: 4 }}>Long (&gt;0.35s)</div></div></div><button onClick={() => { S.click(); setPh('tap') }} style={{ background: `linear-gradient(135deg,${C.cyan},#0891b2)`, color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }}>START</button></div>
  if (ph === 'result') return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: pct >= 70 ? C.green : C.red }}>{pct >= 90 ? 'PERFECT!' : pct >= 70 ? 'SOS SENT' : 'GARBLED'}</h2><div style={{ fontSize: '3.5rem', fontWeight: 900, color: pct >= 70 ? C.green : C.red }}>{pct}%</div><div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '16px 0' }}>{log.map((t, i) => <div key={i} style={{ width: t.t === '.' ? 14 : 36, height: 10, borderRadius: 3, background: t.ok ? C.green : C.red }} />)}</div><button onClick={() => onDone(pct)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE</button></div>
  return <div style={{ ...ss, padding: 24, textAlign: 'center', userSelect: 'none' }}>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 14 }}>{tgt.map((v, i) => <div key={i} style={{ width: v === 1 ? 18 : 48, height: 14, borderRadius: 4, background: i < cur ? (log[i]?.ok ? C.green : C.red) : i === cur ? C.amber : C.muted + '22', boxShadow: i === cur ? `0 0 10px ${C.amber}66` : 'none' }} />)}</div>
    <div style={{ fontSize: '1.8rem', fontFamily: 'monospace', marginBottom: 8, letterSpacing: 8 }}><span style={{ color: cur < 3 ? C.amber : C.muted + '44' }}>•••</span> <span style={{ color: cur >= 3 && cur < 6 ? C.amber : C.muted + '44' }}>━━━</span> <span style={{ color: cur >= 6 ? C.amber : C.muted + '44' }}>•••</span></div>
    <div style={{ width: 130, height: 130, borderRadius: '50%', margin: '16px auto', background: on ? 'radial-gradient(circle,#fff 0%,#ffffaa 25%,rgba(255,255,100,.3) 55%,transparent 75%)' : 'radial-gradient(circle,#1a1a22,#0a0a12)', border: `3px solid ${on ? C.amber : C.muted + '44'}`, boxShadow: on ? '0 0 60px rgba(255,255,100,.5)' : 'none', transition: 'all .04s' }} />
    <button onMouseDown={dn} onMouseUp={up} onTouchStart={dn} onTouchEnd={up} style={{ background: on ? C.amber : C.card, border: `2px solid ${on ? C.amber : C.muted + '44'}`, color: on ? '#000' : C.text, padding: '18px 56px', borderRadius: 12, fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', userSelect: 'none' }}>{on ? '■ SIGNALING' : '● HOLD TO SIGNAL'}</button>
    <div style={{ marginTop: 10, fontSize: '.95rem', color: fb.includes('Need') ? C.red : C.green, minHeight: 24 }}>{fb}</div>
  </div>
}

/* ═══════════════════════ RADIO ═══════════════════════ */
function RadioGame({ onDone }) {
  const [freq, setFreq] = useState(118.0); const [ph, setPh] = useState('tune'); const [step, setStep] = useState(0); const [score, setScore] = useState(0)
  const dialR = useRef(null); const drag = useRef(false); const EM = 121.5
  const locked = Math.abs(freq - EM) < .15; const near = Math.abs(freq - EM) < .5
  useEffect(() => { if (ph !== 'tune') return; const iv = setInterval(() => { if (!locked) S.stt() }, 300); return () => clearInterval(iv) }, [ph, locked])
  useEffect(() => { if (locked && ph === 'tune') { S.ok(); S.beep(1200) } }, [locked])
  const onDrag = (e) => { if (!drag.current || !dialR.current) return; const r = dialR.current.getBoundingClientRect(); setFreq(+(118 + ((e.clientX - r.left) / r.width) * 19).toFixed(1)) }
  const mayday = ['MAYDAY, MAYDAY, MAYDAY', 'Survivor at flood zone sector 7', 'Rooftop, north side of river', 'One person, water rising, request heli', 'OVER']
  const tx = (i) => { if (i !== step) return; S.click(); setScore(s => s + 20); setStep(step + 1); if (step + 1 >= mayday.length) setTimeout(() => { S.ok(); setPh('result') }, 500) }
  const stations = [119.1, EM, 123.4, 127.8, 132]; const sig = Math.max(0, 1 - Math.min(...stations.map(s => Math.abs(freq - s))) / 1.5)

  if (ph === 'result') return <div style={{ padding: 32, textAlign: 'center' }}><h2 style={{ fontSize: '2rem', color: score >= 80 ? C.green : C.amber }}>{score >= 80 ? 'MAYDAY RECEIVED!' : 'PARTIAL'}</h2><div style={{ fontSize: '3.5rem', fontWeight: 900, color: score >= 80 ? C.green : C.amber }}>{score}%</div><div style={{ color: C.cyan, fontSize: '.85rem', margin: '8px auto 20px', maxWidth: 400, lineHeight: 1.5 }}>121.5 MHz = aviation. Ch.16 = maritime. "MAYDAY" 3x → WHO/WHERE/WHAT → "OVER"</div><button onClick={() => onDone(score)} style={{ background: C.blue, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>CONTINUE</button></div>
  if (ph === 'transmit') return <div style={{ padding: 24 }}><div style={{ fontSize: '1rem', color: C.green, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, letterSpacing: '.12em' }}>LOCKED 121.5 MHz</div><div style={{ background: C.panel, borderRadius: 8, padding: 14, marginBottom: 16, border: `1px solid ${C.green}33` }}>{mayday.slice(0, step).map((p, i) => <div key={i} style={{ fontSize: '.9rem', color: C.text, padding: '4px 0' }}><span style={{ color: C.green }}>✓</span> "{p}"</div>)}{step < mayday.length && <div style={{ color: C.amber, animation: 'sp 1.5s ease-in-out infinite', fontSize: '.9rem' }}>▸ Next line...</div>}</div><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{mayday.map((p, i) => <button key={i} onClick={() => tx(i)} disabled={i < step} style={{ background: i < step ? 'rgba(34,197,94,.1)' : C.card, border: `1px solid ${i === step ? C.amber + '66' : C.muted + '22'}`, borderRadius: 6, padding: '12px 14px', cursor: i >= step ? 'pointer' : 'default', color: i < step ? C.green : C.text, fontSize: '.9rem', textAlign: 'left', fontFamily: 'monospace', opacity: i < step ? .5 : 1 }}>"{p}"</button>)}</div></div>
  return <div style={{ padding: 24, textAlign: 'center', userSelect: 'none' }}>
    <div style={{ fontSize: '1rem', color: C.amber, fontWeight: 'bold', letterSpacing: '.12em', marginBottom: 12 }}>EMERGENCY RADIO</div>
    <div style={{ background: '#0a0f14', border: `2px solid ${locked ? C.green : near ? C.amber : C.muted}44`, borderRadius: 12, padding: '20px 24px', maxWidth: 500, margin: '0 auto 16px', position: 'relative', overflow: 'hidden', boxShadow: locked ? `0 0 30px rgba(34,197,94,.2)` : 'none' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: .03 + (1 - sig) * .06, background: 'repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(255,255,255,.03) 1px,rgba(255,255,255,.03) 2px)', animation: 'sst .1s linear infinite', pointerEvents: 'none' }} />
      <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace', color: locked ? C.green : near ? C.amber : C.cyan }}>{freq.toFixed(1)} <span style={{ fontSize: '1.2rem', color: C.muted }}>MHz</span></div>
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', margin: '8px 0' }}>{Array.from({ length: 10 }, (_, i) => <div key={i} style={{ width: 8, height: 6 + i * 3, borderRadius: 2, background: i / 10 < sig ? (locked ? C.green : C.cyan) : C.muted + '33' }} />)}</div>
      <div style={{ fontSize: '.85rem', color: locked ? C.green : near ? C.amber : C.muted, fontFamily: 'monospace' }}>{locked ? '■ EMERGENCY LOCKED ■' : near ? 'Signal...' : sig > .3 ? 'Faint...' : '~ Static ~'}</div>
    </div>
    <div ref={dialR} onMouseDown={() => drag.current = true} onMouseMove={onDrag} onMouseUp={() => drag.current = false} onMouseLeave={() => drag.current = false} style={{ position: 'relative', height: 50, background: C.panel, borderRadius: 8, maxWidth: 500, margin: '0 auto 16px', cursor: 'ew-resize', border: `1px solid ${C.muted}22`, overflow: 'hidden' }}>
      {Array.from({ length: 20 }, (_, i) => <div key={i} style={{ position: 'absolute', left: `${(i / 19) * 100}%`, top: 0, bottom: 0, width: 1, background: C.muted + '22' }}><div style={{ position: 'absolute', bottom: 2, left: -10, width: 20, textAlign: 'center', fontSize: '.55rem', color: C.muted }}>{118 + i}</div></div>)}
      <div style={{ position: 'absolute', left: `${((EM - 118) / 19) * 100}%`, top: 0, bottom: 0, width: 2, background: C.red + '44' }} />
      <div style={{ position: 'absolute', left: `${((freq - 118) / 19) * 100}%`, top: 2, bottom: 2, width: 4, borderRadius: 2, background: locked ? C.green : C.cyan, boxShadow: `0 0 10px ${locked ? C.green : C.cyan}66` }} />
    </div>
    {locked && <button onClick={() => { S.click(); setPh('transmit') }} style={{ background: `linear-gradient(135deg,${C.green},#16a34a)`, color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', animation: 'sg 2s ease-in-out infinite' }}>TRANSMIT MAYDAY</button>}
  </div>
}

/* ═══════════════════════ SCENARIO QUIZ ═══════════════════════ */
function ScenarioQuiz({ onDone, diff = DIFF.medium }) {
  const maxTime = Math.round(12 * diff.tMul)
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [lives, setLives] = useState(3); const [combo, setCombo] = useState(0); const [timer, setTimer] = useState(maxTime); const [fb, setFb] = useState(null); const [answered, setAnswered] = useState(false); const [shakeS, shake] = useShake()
  const timerR = useRef(null); const sc = QUIZ[round]
  useEffect(() => { if (answered || !sc) return; setTimer(maxTime); timerR.current = setInterval(() => setTimer(t => { if (t <= 4 && t > 1) S.cdB(t); if (t <= 1) { clearInterval(timerR.current); answer(null); return 0 } return t - 1 }), 1e3); return () => clearInterval(timerR.current) }, [round, answered])
  useEffect(() => { if (answered || !sc) return; const iv = setInterval(() => sc.vehicle === 'heli' ? S.heli() : null, 800); return () => clearInterval(iv) }, [round, answered])
  const answer = (id) => { if (answered) return; clearInterval(timerR.current); setAnswered(true); const ok = id === sc?.correct; if (ok) { const pts = Math.round((100 + timer * 8) * (1 + combo * .25)); setScore(s => s + pts); setCombo(c => c + 1); S.ok() } else { setLives(l => Math.max(0, l - 1)); setCombo(0); S.bad(); shake() }; setFb({ ok }) }
  const next = () => { if (lives <= 0 || round + 1 >= QUIZ.length) onDone(Math.min(100, Math.round(score / (QUIZ.length * 200) * 100))); else { setRound(r => r + 1); setAnswered(false); setFb(null); S.whoosh() } }
  if (!sc) return null
  const correctSig = SIGNALS.find(s => s.id === sc.correct)
  return (
    <div style={{ ...shakeS, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500 }}>
      <HUD lives={lives} combo={combo} score={score} timer={timer} maxT={maxTime} />
      <div style={{ position: 'relative', height: 200, backgroundImage: `url(${sc.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(0,0,0,.85),rgba(0,0,0,.1) 40%,rgba(0,0,0,.4))' }} />
        {sc.vehicle === 'heli' && <div style={{ position: 'absolute', top: '10%', animation: 'sv 6s linear infinite', fontSize: '2.2rem' }}>🚁</div>}
        {sc.vehicle === 'boat' && <div style={{ position: 'absolute', bottom: '18%', animation: 'sv 8s linear infinite', fontSize: '1.8rem' }}>🚤</div>}
        <Rain />
        {timer < 4 && <div style={{ position: 'absolute', inset: 0, border: `3px solid ${C.red}`, animation: 'sup .5s ease-in-out infinite', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, zIndex: 2 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,.9)', letterSpacing: '.06em' }}>{sc.title}</div>
        </div>
        <div style={{ position: 'absolute', top: 8, left: 14, background: 'rgba(0,0,0,.6)', padding: '4px 10px', borderRadius: 20, color: C.muted, fontSize: '.8rem' }}>{round + 1}/{QUIZ.length}</div>
      </div>
      <div style={{ flex: 1, padding: 12, background: C.panel }}>
        {!fb ? <>
          <div style={{ fontSize: '.85rem', color: C.amber, fontWeight: 'bold', marginBottom: 8, letterSpacing: '.08em' }}>CHOOSE SIGNAL:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {SIGNALS.map(sig => <button key={sig.id} onClick={() => { S.click(); answer(sig.id) }} style={{ background: C.card, border: `1px solid ${sig.color}33`, borderRadius: 6, padding: '10px 4px', cursor: 'pointer', textAlign: 'center', transition: 'all .12s' }} onMouseEnter={e => { e.currentTarget.style.borderColor = sig.color; e.currentTarget.style.transform = 'scale(1.06)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = sig.color + '33'; e.currentTarget.style.transform = 'scale(1)' }}><div style={{ fontSize: '1.4rem' }}>{sig.icon}</div><div style={{ fontSize: '.65rem', color: C.text, marginTop: 2 }}>{sig.name}</div></button>)}
          </div>
        </> : <div style={{ textAlign: 'center', padding: '8px 0', animation: 'sfd .3s ease' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: fb.ok ? C.green : C.red, marginBottom: 4 }}>{fb.ok ? (combo > 2 ? `${combo}x COMBO!` : 'CORRECT!') : 'WRONG'}</div>
          <div style={{ marginBottom: 4 }}><span style={{ color: C.muted, fontSize: '.85rem' }}>Best: </span><span style={{ color: correctSig?.color, fontWeight: 'bold' }}>{correctSig?.icon} {correctSig?.name}</span></div>
          <div style={{ color: C.cyan, fontSize: '.8rem', lineHeight: 1.4, maxWidth: 450, margin: '0 auto 10px', background: 'rgba(6,182,212,.06)', padding: '6px 10px', borderRadius: 6 }}>{sc.hint}</div>
          <button onClick={() => { S.click(); next() }} style={{ background: C.blue, color: '#fff', border: 'none', padding: '10px 32px', borderRadius: 8, fontSize: '.9rem', fontWeight: 'bold', cursor: 'pointer' }}>{lives <= 0 || round + 1 >= QUIZ.length ? 'RESULTS' : 'NEXT →'}</button>
        </div>}
      </div>
    </div>
  )
}

function HUD({ lives, combo, score, timer, maxT }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(0,0,0,.75)', borderBottom: `2px solid ${timer < maxT * .25 ? C.red + '66' : C.muted + '22'}`, zIndex: 20 }}>
    <div style={{ display: 'flex', gap: 3, fontSize: '1.1rem' }}>{Array.from({ length: 3 }, (_, i) => <span key={i} style={{ opacity: i < lives ? 1 : .2 }}>❤️</span>)}</div>
    {combo > 1 && <div style={{ fontSize: '1rem', fontWeight: 900, color: combo >= 5 ? C.amber : combo >= 3 ? C.cyan : C.green, animation: 'scg 1s ease-in-out infinite', fontFamily: 'monospace' }}>{combo}x</div>}
    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: C.amber, fontFamily: 'monospace' }}>{score}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: timer < maxT * .25 ? C.red : timer < maxT * .5 ? C.amber : C.green, animation: timer < maxT * .25 ? 'sh 1s ease-in-out infinite' : 'none' }}>{timer}s</div>
  </div>
}

/* ═══════════════════════ CAMPAIGN ═══════════════════════ */
const MISSIONS = [
  { title: 'CHAPTER 1: THE FLOOD', bg: PX(8568719), game: 'mirror',
    story: 'You wake up on a rooftop. The flash flood hit at 3 AM. Water is still rising — it\'s up to the second floor now.\n\nYou\'ve been here for 6 hours. The sun is blazing. Then you hear it — the distant thud of helicopter rotors. This is your chance.',
    teach: 'SIGNAL MIRROR\n\n1. Hold mirror near your eye, look through the sighting hole\n2. Extend your other hand toward the helicopter\n3. Catch the sun\'s reflection on your extended hand\n4. Slowly tilt the mirror until the light beam crosses your hand toward the aircraft\n5. SWEEP back and forth — don\'t hold steady\n\nRange: 50+ miles in direct sunlight. Pilots report seeing flashes at 160km under ideal conditions.',
    teachIcon: '🪞' },
  { title: 'CHAPTER 2: NIGHTFALL', bg: PX(8956453), game: 'flare',
    story: 'Night falls. The helicopter didn\'t see you — or maybe it did and is coming back. You\'re shivering. The water hasn\'t risen more, but it hasn\'t dropped either.\n\nThen you hear it: an engine. A patrol boat. It\'s somewhere out there in the darkness. You have 3 signal flares from a boat emergency kit you found floating by.',
    teach: 'SIGNAL FLARE\n\n1. WAIT until you can hear the rescue craft clearly\n2. Aim STRAIGHT UP — 90 degrees vertical\n3. Fire ONE flare\n4. Watch for reaction. If not seen, wait until craft is closer\n5. NEVER fire all flares at once — each one is precious\n\nStar flares reach 200m height, burn 6-10 seconds. Visible 25+ miles at night. Red = international distress.',
    teachIcon: '🔴' },
  { title: 'CHAPTER 3: THE FOG', bg: PX(1089930), game: 'whistle',
    story: 'Dawn. A thick fog has rolled in — you can barely see 3 meters ahead. The water has receded slightly but you\'re still trapped.\n\nYou hear voices. A search team is nearby, calling out names. They\'re close but the fog makes them invisible. Your voice is hoarse from yelling all night. But you have a whistle.',
    teach: 'DISTRESS WHISTLE PATTERN\n\n1. Blow 3 SHORT SHARP blasts (each ~1 second)\n2. Pause 60 seconds\n3. Blow 3 more blasts\n4. REPEAT until rescuers respond\n\nThe pattern of THREE is internationally recognized as a distress signal in any medium — whistle, gunshot, horn. Sound travels through fog where light cannot. Whistle audible up to 1.6 km.',
    teachIcon: '📯' },
  { title: 'CHAPTER 4: TRAPPED', bg: PX(15533288), game: 'morse',
    story: 'An aftershock. Part of the building collapses around you. You\'re in a small pocket of air, surrounded by concrete and rebar. You can\'t move much.\n\nBut you hear drilling — rescuers are above you, working through the rubble. They can\'t hear your voice through the concrete. But sound travels through solid material. You have a piece of metal pipe.',
    teach: 'MORSE CODE SOS (... --- ...)\n\n• DIT = short tap (under 0.4 seconds)\n━ DAH = long tap (over 0.4 seconds)\n\nPattern: DIT DIT DIT   DAH DAH DAH   DIT DIT DIT\n(3 short — 3 long — 3 short)\n\nRepeat continuously. Rescue teams use sensitive microphones and are trained to detect rhythmic patterns in rubble. This signal works with ANY medium: tapping, light, sound, even blinking.',
    teachIcon: '💡' },
  { title: 'CHAPTER 5: ISLAND', bg: PX(14823609), game: 'fire',
    story: 'You\'ve been evacuated to higher ground — a small hill that\'s now an island surrounded by floodwater. Day 2. You\'ve seen a search plane fly over twice.\n\nYou have matches, dry branches, and green leaves. You need a signal visible for MILES that lasts for HOURS. Not a brief flash — a sustained signal.',
    teach: 'SIGNAL FIRE\n\n1. Gather tinder (dry leaves, bark, paper)\n2. Build kindling teepee (small sticks)\n3. Add fuel wood (thick branches)\n4. FIRE TRIANGLE: Heat + Fuel + Oxygen\n5. Three fires in a TRIANGLE (100ft apart) = international distress\n6. Day: add GREEN branches for thick WHITE smoke\n7. Night: keep flames HIGH and bright\n\n⚠️ Too much fuel SMOTHERS the fire. Add gradually. Wind can kill or spread — shelter accordingly.',
    teachIcon: '🔥' },
  { title: 'CHAPTER 6: THE RADIO', bg: PX(16114057), game: 'radio',
    story: 'In the wreckage of a car, you find a handheld VHF radio. The battery indicator shows 40% — enough for a few transmissions. But you need to find the right frequency.\n\nEvery aircraft and coast guard vessel monitors the emergency channel. If you can reach it, they can pinpoint your location.',
    teach: 'EMERGENCY RADIO FREQUENCIES\n\n• 121.5 MHz — International AVIATION emergency (monitored by ALL aircraft)\n• 156.8 MHz (Ch.16) — International MARITIME emergency\n\nMAYDAY CALL FORMAT:\n1. "MAYDAY, MAYDAY, MAYDAY"\n2. "This is [your name/description]"\n3. "My position is [location]"\n4. "I have [number] persons, [condition]"\n5. "I require [what you need]"\n6. "OVER" — then LISTEN\n\nKeep antenna VERTICAL and as HIGH as possible. Radio is line-of-sight.',
    teachIcon: '📻' },
]

function Campaign({ onDone, onComplete, diff }) {
  const [mi, setMi] = useState(0)
  const [ph, setPh] = useState('intro') // intro | teach | play | trans
  const [scores, setScores] = useState([])
  const [total, setTotal] = useState(0)
  const [lives, setLives] = useState(3)
  const m = MISSIONS[mi]

  const gameDone = (s) => { setScores(p => [...p, s]); setTotal(t => t + s); if (s < 40) setLives(l => Math.max(0, l - 1)); setPh('trans') }
  const next = () => { if (lives <= 0 || mi + 1 >= MISSIONS.length) { const fn = onDone || onComplete; fn(Math.min(100, Math.round(total / MISSIONS.length))) } else { setMi(i => i + 1); setPh('intro') } }
  if (!m) return null

  // STORY INTRO — dramatic scene
  if (ph === 'intro') return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${m.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(.3)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.8) 0%, rgba(0,0,0,.3) 40%, rgba(0,0,0,.6) 100%)' }} />
      <Rain />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, textAlign: 'center', padding: '20px 30px' }}>
        <div style={{ fontSize: '.75rem', color: C.amber, letterSpacing: '.25em', marginBottom: 8 }}>MISSION {mi + 1} OF {MISSIONS.length}</div>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '.06em', textShadow: '0 2px 20px rgba(0,0,0,.8)', marginBottom: 16, animation: 'sfd .5s ease' }}>{m.title}</div>
        <div style={{ fontSize: '.95rem', color: '#ccc', maxWidth: 500, lineHeight: 1.8, textShadow: '0 1px 6px rgba(0,0,0,.9)', textAlign: 'left', whiteSpace: 'pre-line', animation: 'sfd .6s ease .2s forwards', opacity: 0 }}>{m.story}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>{Array.from({ length: 3 }, (_, i) => <span key={i} style={{ fontSize: '1.2rem', opacity: i < lives ? 1 : .2 }}>❤️</span>)}</div>
        <button onClick={() => { S.click(); setPh('teach') }} style={{ marginTop: 16, background: `linear-gradient(135deg, ${C.blue}, #2563eb)`, color: '#fff', border: 'none', padding: '14px 40px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.08em' }}>
          HOW TO SIGNAL →
        </button>
      </div>
    </div>
  )

  // TEACHING SCREEN — how to use this signal
  if (ph === 'teach') return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 500, overflow: 'auto', borderRadius: 8, background: C.panel }}>
      <div style={{ padding: '24px 28px', maxWidth: 550, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{m.teachIcon}</div>
          <div style={{ fontSize: '.8rem', color: C.amber, letterSpacing: '.15em', marginBottom: 4 }}>HOW TO SIGNAL</div>
        </div>
        <div style={{ background: C.card, borderRadius: 8, padding: '18px 20px', border: `1px solid ${C.amber}22`, marginBottom: 16, whiteSpace: 'pre-line', fontSize: '.9rem', color: C.text, lineHeight: 1.7, fontFamily: '"Courier New", monospace' }}>
          {m.teach}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => { S.click(); setPh('play') }} style={{ background: `linear-gradient(135deg, ${C.green}, #16a34a)`, color: '#fff', border: 'none', padding: '16px 48px', borderRadius: 8, fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '.1em', animation: 'sp 1.5s ease-in-out infinite' }}>
            START MISSION
          </button>
        </div>
      </div>
    </div>
  )

  // TRANSITION
  if (ph === 'trans') {
    const last = scores[scores.length - 1] || 0
    return <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '.9rem', color: C.muted, letterSpacing: '.12em', marginBottom: 6 }}>MISSION {mi + 1} COMPLETE</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 900, color: last >= 60 ? C.green : last >= 40 ? C.amber : C.red }}>{last}%</div>
      {last < 40 && <div style={{ color: C.red, fontSize: '.9rem', marginTop: 4 }}>-1 ❤️</div>}
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center', margin: '10px 0' }}>{Array.from({ length: 3 }, (_, i) => <span key={i} style={{ fontSize: '1.2rem', opacity: i < lives ? 1 : .2 }}>❤️</span>)}</div>
      <div style={{ color: C.muted, fontSize: '.85rem', marginBottom: 16 }}>Total: {total} | {MISSIONS.length - mi - 1} chapters remaining</div>
      <button onClick={() => { S.click(); next() }} style={{ background: C.blue, color: '#fff', border: 'none', padding: '12px 36px', borderRadius: 8, fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
        {lives <= 0 || mi + 1 >= MISSIONS.length ? 'FINAL REPORT' : 'NEXT CHAPTER →'}
      </button>
    </div>
  }

  // PLAY — the actual mini-game
  const GM = { mirror: MirrorGame, flare: FlareGame, whistle: WhistleGame, morse: MorseGame, fire: FireGame, radio: RadioGame }
  const G = GM[m.game]; return <G onDone={gameDone} diff={diff || DIFF.medium} />
}

/* ═══════════════════════ MAIN ═══════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   STORY MODE — the real game. You ARE in the flood. One continuous
   interactive experience with inventory, choices, and embedded games.
   ═══════════════════════════════════════════════════════════════ */
const SCENES = [
  { id: 'wake', bg: PX(8568719),
    text: 'You jolt awake to the sound of rushing water. It\'s 3 AM. Your bedroom floor is already covered. The flood is here.\n\nYou have seconds to grab ONE thing before climbing to the roof.',
    choices: [
      { label: '📱 Grab your phone', item: 'phone', result: 'You snatch your phone. 60% battery. The screen could work as a mirror in daylight.' },
      { label: '🔦 Grab the flashlight', item: 'flashlight', result: 'A heavy-duty flashlight with fresh batteries. It can signal SOS at night.' },
      { label: '📯 Grab the emergency whistle', item: 'whistle', result: 'The orange emergency whistle from your go-bag. Sound carries through anything.' },
    ]},
  { id: 'roof', bg: PX(8568719),
    text: 'You\'re on the roof. Water is up to the second floor and still rising. Dawn is breaking. You can see other rooftops — some with people waving.\n\nYou spot a floating box caught against a railing. Inside: a signal mirror, 2 flares, and a small first aid kit.',
    choices: [
      { label: '📦 Take everything', item: 'kit', result: 'You grab the mirror, flares, and kit. Your inventory is growing.' },
    ]},
  { id: 'helicopter', bg: PX(1252869),
    text: 'Hours pass. The sun is high and blazing. Then — a sound. The unmistakable thud of helicopter rotors.\n\nA rescue helicopter is approaching from the east, about 2 miles out. The sun is behind you — perfect for a mirror signal.\n\n🪞 HOW TO USE A SIGNAL MIRROR:\n• Hold it near your eye\n• Extend other hand toward the helicopter\n• Catch the sun\'s reflection on your palm\n• Tilt until the beam crosses your hand toward the aircraft\n• SWEEP back and forth — pilots look for flashing, not steady light\n\nRange: 50+ miles. This is your best shot.',
    game: 'mirror', gameLabel: 'AIM YOUR MIRROR AT THE HELICOPTER' },
  { id: 'missed', bg: PX(8568719),
    text: 'The helicopter banks and flies north. Did they see you? You\'re not sure. The waiting is the worst part.\n\nYou notice other survivors on nearby rooftops. One is waving a bright orange tarp. Another has spelled "HELP" in large letters using roof tiles.\n\n📝 GROUND-TO-AIR SIGNALS:\n• V = Need Assistance\n• X = Need Medical Help\n• I = Need Supplies\n• → = Traveling This Direction\n• Make symbols at LEAST 10 feet tall\n• Use anything that CONTRASTS with the surface\n\nYou gather loose shingles and debris.',
    choices: [
      { label: '❌ Spell out a large X (need help)', item: 'ground_x', result: 'You arrange debris into a massive X on the rooftop. Visible from any aircraft.' },
      { label: '📐 Spell out SOS', item: 'ground_sos', result: 'You spell SOS in 6-foot letters. The universal distress signal.' },
    ]},
  { id: 'night', bg: PX(8956453),
    text: 'Night falls. The temperature drops. You hear an engine in the darkness — a rescue boat somewhere on the flooded streets.\n\nThis is when your flares matter. You have 2.\n\n🔴 HOW TO USE A SIGNAL FLARE:\n• Wait until you HEAR the rescue craft clearly\n• Aim STRAIGHT UP — 90 degrees\n• Fire ONE flare only\n• Watch for the boat to change direction\n• Save your second flare for when they\'re closer\n\nStar flares reach 200 meters, burn 6-10 seconds. Visible 25+ miles at night.',
    game: 'flare', gameLabel: 'LAUNCH YOUR FLARE WHEN THE BOAT IS NEAR' },
  { id: 'fog', bg: PX(1089930),
    text: 'Dawn. A thick, cold fog blankets everything. Visibility: almost zero.\n\nBut you hear voices — a search team calling out names. They\'re close, maybe 200 meters away. They can\'t see you through the fog.\n\nYour voice is hoarse from shouting all night. But sound travels where light cannot.\n\n📯 DISTRESS WHISTLE PATTERN:\n• 3 SHORT SHARP blasts\n• Pause 60 seconds\n• 3 more blasts\n• REPEAT\n\nThe pattern of THREE = universal distress in ANY medium.\nA whistle carries up to 1.6 km — 10x further than your voice.',
    game: 'whistle', gameLabel: 'BLOW YOUR WHISTLE IN THE DISTRESS PATTERN' },
  { id: 'radio', bg: PX(16114057),
    text: 'Mid-morning. The fog lifts. You spot something floating — a waterproof case. Inside: a handheld VHF radio! Battery shows 40%.\n\nRadio is the MOST effective signal. Direct voice contact with rescuers. But you need the right frequency.\n\n📻 EMERGENCY FREQUENCIES:\n• 121.5 MHz — Aviation emergency (ALL aircraft monitor this)\n• 156.8 MHz (Channel 16) — Maritime emergency\n\nMAYDAY FORMAT:\n1. "MAYDAY, MAYDAY, MAYDAY"\n2. Your name and description\n3. Your position\n4. Number of people and condition\n5. What you need\n6. "OVER" — then LISTEN',
    game: 'radio', gameLabel: 'TUNE TO 121.5 MHz AND TRANSMIT YOUR MAYDAY' },
  { id: 'day2', bg: PX(14823609),
    text: 'Day 2. The water has receded slightly but you\'re still stranded. You\'ve moved to higher ground — a hilltop that\'s now an island.\n\nYou\'ve seen search aircraft twice today. You need something visible for MILES that lasts for HOURS.\n\n🔥 SIGNAL FIRE:\n• The FIRE TRIANGLE: Heat + Fuel + Oxygen\n• Start with TINDER (dry leaves, bark)\n• Add KINDLING (small sticks)\n• Then FUEL (thick branches)\n• 3 fires in a TRIANGLE = international distress\n• Day: add GREEN branches for white smoke\n• Night: keep flames HIGH\n\n⚠️ Too much fuel SMOTHERS the fire. Manage carefully.',
    game: 'fire', gameLabel: 'BUILD AND MAINTAIN YOUR SIGNAL FIRE' },
  { id: 'morse', bg: PX(15533288),
    text: 'An aftershock. The ground beneath you shifts. Part of the hillside collapses and you\'re partially buried.\n\nYou can hear rescue workers above, drilling through debris. They can\'t hear your voice. But sound travels through solid material.\n\nYou find a metal pipe.\n\n💡 MORSE CODE SOS:\n• DIT (•) = short tap\n• DAH (━) = long tap\n• SOS = ••• ━━━ •••\n• 3 short, 3 long, 3 short\n• REPEAT continuously\n\nThis pattern works with ANYTHING:\nFlashlight, mirror, whistle, tapping, car horn, even blinking your eyes.',
    game: 'morse', gameLabel: 'TAP SOS ON THE PIPE' },
  { id: 'rescue', bg: PX(15533273),
    text: 'A voice from above: "WE HEAR YOU! KEEP TAPPING!"\n\nHours of digging. Then light. Hands reaching down.\n\nYou\'re pulled out into the open air. A helicopter hovers overhead. Rescue workers in orange vests surround you.\n\nYou survived because you knew HOW to signal.\n\nEvery method you used today — mirror, flare, whistle, radio, fire, morse code, ground signals — saved your life. Not just one. ALL of them, used at the RIGHT TIME in the RIGHT CONDITIONS.',
    choices: [
      { label: '🏠 Complete — See Your Score', item: 'end', result: '' },
    ]},
]

function StoryMode({ onDone, onSkip }) {
  const [scene, setScene] = useState(0)
  const [phase, setPhase] = useState('narrative') // narrative | choice | game | result | next
  const [inventory, setInventory] = useState([])
  const [choiceResult, setChoiceResult] = useState(null)
  const [textRevealed, setTextRevealed] = useState(0)
  const [gameScore, setGameScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [gamesDone, setGamesDone] = useState(0)
  const textTimerR = useRef(null)

  const sc = SCENES[scene]

  // Typewriter text reveal
  useEffect(() => {
    if (phase !== 'narrative') return
    setTextRevealed(0)
    const full = sc.text.length
    let i = 0
    textTimerR.current = setInterval(() => {
      i += 2
      setTextRevealed(i)
      if (i >= full) clearInterval(textTimerR.current)
    }, 15)
    return () => clearInterval(textTimerR.current)
  }, [scene, phase])

  const skipText = () => { clearInterval(textTimerR.current); setTextRevealed(sc.text.length) }

  const makeChoice = (choice) => {
    S.click()
    if (choice.item) setInventory(prev => [...prev, choice.item])
    setChoiceResult(choice.result)
    setPhase('result')
  }

  const advanceScene = () => {
    S.whoosh()
    setChoiceResult(null)
    if (scene + 1 >= SCENES.length) {
      onDone(gamesDone > 0 ? Math.round(totalScore / gamesDone) : 50)
      return
    }
    setScene(s => s + 1)
    setPhase('narrative')
  }

  const startGame = () => { S.click(); setPhase('game') }

  const handleGameDone = (score) => {
    setGameScore(score)
    setTotalScore(t => t + score)
    setGamesDone(g => g + 1)
    setPhase('result')
    if (score >= 60) S.ok(); else S.bad()
  }

  const GM = { mirror: MirrorGame, flare: FlareGame, whistle: WhistleGame, morse: MorseGame, fire: FireGame, radio: RadioGame }

  if (!sc) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', fontFamily: '"Courier New",monospace', color: C.text, overflow: 'hidden' }}>
      {/* Background photo */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${sc.bg})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.3)', transition: 'background-image 1s' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.3) 30%, rgba(0,0,0,.5) 100%)' }} />
      <Rain />

      {/* Inventory bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'rgba(0,0,0,.7)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: '.7rem', color: C.muted, letterSpacing: '.1em' }}>INVENTORY:</div>
          {inventory.length === 0 && <div style={{ fontSize: '.75rem', color: C.muted, fontStyle: 'italic' }}>empty</div>}
          {inventory.map((item, i) => <div key={i} style={{ background: C.card, border: `1px solid ${C.cyan}33`, borderRadius: 4, padding: '2px 8px', fontSize: '.7rem', color: C.cyan }}>{item}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: '.7rem', color: C.muted }}>SCENE {scene + 1}/{SCENES.length}</div>
          <button onClick={onSkip} style={{ background: 'rgba(255,255,255,.05)', border: `1px solid ${C.muted}44`, color: C.muted, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '.65rem', fontFamily: 'monospace' }}>SKIP TO MENU</button>
        </div>
      </div>

      {/* Game mode — mini-game takes over the center */}
      {phase === 'game' && sc.game && (
        <div style={{ position: 'absolute', inset: '50px 0 0 0', zIndex: 15 }}>
          {(() => { const G = GM[sc.game]; return G ? <G onDone={handleGameDone} diff={DIFF.medium} duration={15} /> : null })()}
        </div>
      )}

      {/* Narrative / choices / results */}
      {phase !== 'game' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 10, padding: '0 0 0 0' }}>
          {/* Text panel at bottom */}
          <div onClick={skipText} style={{ background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', padding: '20px 28px', maxHeight: '55%', overflowY: 'auto', cursor: textRevealed < (sc.text?.length || 0) ? 'pointer' : 'default', borderTop: `1px solid ${C.muted}22` }}>
            {/* Scene title */}
            {phase === 'narrative' && (
              <div style={{ fontSize: '.7rem', color: C.amber, letterSpacing: '.15em', marginBottom: 8, fontWeight: 'bold' }}>
                {sc.id === 'wake' ? 'PROLOGUE' : sc.id === 'rescue' ? 'EPILOGUE' : `DAY ${scene <= 4 ? 1 : 2}`}
              </div>
            )}

            {/* Narrative text with typewriter effect */}
            {phase === 'narrative' && (
              <div style={{ fontSize: '.95rem', lineHeight: 1.8, color: '#ddd', whiteSpace: 'pre-line' }}>
                {sc.text.slice(0, textRevealed)}
                {textRevealed < sc.text.length && <span style={{ opacity: 0.5 }}>|</span>}
              </div>
            )}

            {/* Choice result */}
            {phase === 'result' && (
              <div style={{ animation: 'sfd .4s ease' }}>
                {choiceResult && <div style={{ fontSize: '.95rem', color: C.green, lineHeight: 1.7, marginBottom: 12 }}>{choiceResult}</div>}
                {gameScore > 0 && <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: gameScore >= 60 ? C.green : C.red, marginBottom: 8 }}>Signal Score: {gameScore}%</div>}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Show choices */}
              {phase === 'narrative' && textRevealed >= (sc.text?.length || 0) && sc.choices && sc.choices.map((ch, i) => (
                <button key={i} onClick={() => makeChoice(ch)} style={{
                  background: 'rgba(255,255,255,.04)', border: `1px solid ${C.cyan}44`, borderRadius: 8,
                  padding: '14px 18px', cursor: 'pointer', textAlign: 'left', color: C.text,
                  fontSize: '.9rem', fontFamily: '"Courier New",monospace', transition: 'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = `rgba(6,182,212,.1)`; e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.transform = 'translateX(4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = C.cyan + '44'; e.currentTarget.style.transform = 'translateX(0)' }}
                >
                  {ch.label}
                </button>
              ))}

              {/* Show game start button */}
              {phase === 'narrative' && textRevealed >= (sc.text?.length || 0) && sc.game && (
                <button onClick={startGame} style={{
                  background: `linear-gradient(135deg, ${C.red}, #b91c1c)`, border: 'none', borderRadius: 8,
                  padding: '16px 24px', cursor: 'pointer', color: '#fff',
                  fontSize: '1rem', fontWeight: 'bold', fontFamily: '"Courier New",monospace',
                  letterSpacing: '.08em', boxShadow: `0 0 20px ${C.red}44`,
                  animation: 'sp 1.5s ease-in-out infinite',
                }}>
                  {sc.gameLabel || 'START'}
                </button>
              )}

              {/* Continue button after choice/game result */}
              {phase === 'result' && (
                <button onClick={advanceScene} style={{
                  background: `linear-gradient(135deg, ${C.blue}, #2563eb)`, border: 'none', borderRadius: 8,
                  padding: '14px 24px', cursor: 'pointer', color: '#fff',
                  fontSize: '1rem', fontWeight: 'bold', fontFamily: '"Courier New",monospace',
                }}>
                  {scene + 1 >= SCENES.length ? 'SEE FINAL SCORE' : 'CONTINUE →'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SOSSignalGame() {
  const { dispatch } = useGame()
  const [tab, setTab] = useState('menu') // menu first — user chooses what to play
  const [scores, setScores] = useState(loadScores)
  const [xp, setXp] = useState(loadXP)
  const [diff, setDiff] = useState('medium')
  useEffect(() => { injectCSS() }, [])

  const recordScore = (key, s) => {
    const prev = scores[key] || {}; const best = Math.max(prev.best || 0, s)
    const updated = { ...scores, [key]: { last: s, best } }; setScores(updated); saveScores(updated)
    const earned = Math.round(s * DIFF[diff].xMul); setXp(x => { const n = x + earned; saveXP(n); return n })
  }
  const avg = (() => { const v = Object.values(scores).filter(x => x?.last != null); return v.length ? Math.round(v.reduce((a, b) => a + (b.best || 0), 0) / v.length) : null })()
  const level = Math.floor(xp / 200)
  const unlockedBadges = BADGES.filter(b => b.check(scores, xp))

  // STORY MODE — the main game experience
  if (tab === 'story') return <StoryMode onDone={(s) => { recordScore('story', s); setTab('menu') }} onSkip={() => setTab('menu')} />

  if (tab === 'menu') return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, fontFamily: '"Courier New",monospace', overflow: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${PX(8956453, 1920)})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .1 }} /><Rain />
      <div style={{ position: 'relative', zIndex: 5, maxWidth: 820, margin: '0 auto', padding: '30px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '.8rem', color: C.cyan, letterSpacing: '.25em', marginBottom: 4 }}>DISASTER TRAINING</div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '.1em', textShadow: `0 0 25px rgba(6,182,212,.3)` }}>SIGNAL FOR SURVIVAL</h1>
        <div style={{ width: 80, height: 3, background: `linear-gradient(90deg,transparent,${C.cyan},transparent)`, margin: '0 auto 12px' }} />

        {/* XP + Level */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12, fontSize: '.8rem' }}>
          <div style={{ background: C.card, padding: '4px 14px', borderRadius: 20, color: C.cyan, border: `1px solid ${C.cyan}33` }}>LVL {level}</div>
          <div style={{ background: C.card, padding: '4px 14px', borderRadius: 20, color: C.amber, border: `1px solid ${C.amber}33` }}>{xp} XP</div>
          {avg !== null && <div style={{ background: C.card, padding: '4px 14px', borderRadius: 20, color: C.green, border: `1px solid ${C.green}33` }}>AVG {avg}%</div>}
        </div>

        {/* Difficulty selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {Object.entries(DIFF).map(([k, v]) => <button key={k} onClick={() => { S.click(); setDiff(k) }} style={{ background: diff === k ? C.card : 'transparent', border: `1px solid ${diff === k ? C.cyan : C.muted + '44'}`, color: diff === k ? C.cyan : C.muted, padding: '5px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '.75rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '.08em' }}>{v.label}{k === 'hard' ? ' (2x XP)' : ''}</button>)}
        </div>

        {/* PLAY STORY — main attraction */}
        <button onClick={() => { S.click(); setTab('story') }} style={{ display: 'block', width: '100%', padding: '18px 0', marginBottom: 14, background: `linear-gradient(135deg, rgba(6,182,212,.2), rgba(59,130,246,.15))`, border: `2px solid ${C.cyan}`, borderRadius: 10, cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', fontFamily: '"Courier New",monospace', letterSpacing: '.1em', boxShadow: `0 0 30px rgba(6,182,212,.15)`, transition: 'all .2s' }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 40px rgba(6,182,212,.3)`; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 30px rgba(6,182,212,.15)`; e.currentTarget.style.transform = 'none' }}
        >
          🌊 PLAY: STRANDED — A Survival Story
          <div style={{ fontSize: '.7rem', color: C.cyan, marginTop: 4, fontWeight: 'normal', letterSpacing: '.05em' }}>Interactive story • 10 scenes • Learn every signal method</div>
        </button>

        {/* Practice games grid */}
        <div style={{ fontSize: '.7rem', color: C.muted, letterSpacing: '.1em', marginBottom: 6, textAlign: 'left' }}>PRACTICE INDIVIDUAL SKILLS:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { id: 'campaign', icon: '⚔️', name: 'Campaign', desc: '6 missions', color: C.red },
            { id: 'scenarios', icon: '🧠', name: 'Quiz', desc: '12 scenarios', color: C.pink },
            { id: 'school', icon: '📖', name: 'Academy', desc: 'Learn all 8', color: C.blue },
            { id: 'mirror', icon: '🪞', name: 'Mirror', desc: 'Aim beam', color: C.amber },
            { id: 'flare', icon: '🔴', name: 'Flare', desc: 'Launch shot', color: C.red },
            { id: 'whistle', icon: '📯', name: 'Whistle', desc: 'Rhythm game', color: C.blue },
            { id: 'fire', icon: '🔥', name: 'Fire', desc: 'Keep alive', color: C.orange },
            { id: 'morse', icon: '💡', name: 'Morse', desc: 'Tap SOS', color: C.cyan },
            { id: 'radio', icon: '📻', name: 'Radio', desc: 'Find 121.5', color: C.green },
          ].map(g => <button key={g.id} onClick={() => { S.click(); setTab(g.id) }} style={{ background: C.card, border: `1px solid ${g.color}22`, borderRadius: 8, padding: '14px 6px', cursor: 'pointer', textAlign: 'center', transition: 'all .2s', position: 'relative' }} onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; e.currentTarget.style.transform = 'translateY(-3px)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = g.color + '22'; e.currentTarget.style.transform = 'none' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 3 }}>{g.icon}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 'bold', color: '#fff' }}>{g.name}</div>
            <div style={{ fontSize: '.6rem', color: C.muted, marginTop: 1 }}>{g.desc}</div>
            {scores[g.id]?.best != null && <div style={{ position: 'absolute', top: 3, right: 3, fontSize: '.6rem', color: scores[g.id].best >= 70 ? C.green : C.amber, fontWeight: 'bold', background: 'rgba(0,0,0,.5)', padding: '1px 5px', borderRadius: 8 }}>{scores[g.id].best}%</div>}
          </button>)}
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {BADGES.map(b => { const unlocked = unlockedBadges.includes(b); return <div key={b.id} title={unlocked ? b.desc : '???'} style={{ fontSize: '1.3rem', opacity: unlocked ? 1 : .2, filter: unlocked ? 'none' : 'grayscale(1)', cursor: 'help' }}>{b.icon}</div> })}
        </div>

        <button onClick={() => dispatch({ type: 'NAVIGATE', payload: 'mainMenu' })} style={{ background: 'none', border: `1px solid ${C.muted}44`, color: C.muted, padding: '8px 24px', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem' }}>&lt; Main Menu</button>
      </div>
    </div>
  )

  // Academy
  if (tab === 'school') return <div style={{ position: 'fixed', inset: 0, background: C.bg, fontFamily: '"Courier New",monospace', color: C.text, overflow: 'auto' }}>
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '16px 16px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'sticky', top: 0, background: C.bg, padding: '10px 0', zIndex: 10 }}>
        <button onClick={() => setTab('menu')} style={{ background: C.card, border: `1px solid ${C.muted}33`, color: C.text, padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '.8rem' }}>&lt; Back</button>
        <h2 style={{ fontSize: '1.2rem', color: C.blue }}>SIGNAL ACADEMY</h2><div />
      </div>
      {SIGNALS.map((sig, i) => <div key={sig.id} style={{ display: 'flex', background: C.card, border: `1px solid ${C.muted}15`, borderRadius: 8, overflow: 'hidden', marginBottom: 10, borderLeft: `4px solid ${sig.color}`, animation: 'sfd .4s ease forwards', animationDelay: `${i * .04}s`, opacity: 0 }}>
        <div style={{ width: 130, minHeight: 160, backgroundImage: `url(${sig.img})`, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0, position: 'relative' }}><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 40%,rgba(20,30,48,1) 100%)' }} /><div style={{ position: 'absolute', top: 8, left: 8, fontSize: '1.6rem' }}>{sig.icon}</div></div>
        <div style={{ padding: '10px 12px 10px 0', flex: 1 }}>
          <div style={{ fontSize: '.95rem', fontWeight: 'bold', color: sig.color, marginBottom: 2 }}>{sig.name}</div>
          <div style={{ fontSize: '.78rem', color: C.text, lineHeight: 1.5, marginBottom: 6 }}>{sig.desc}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <div><div style={{ fontSize: '.6rem', color: C.amber, fontWeight: 'bold' }}>WHEN</div><div style={{ fontSize: '.72rem', color: C.muted, lineHeight: 1.4 }}>{sig.when}</div></div>
            <div><div style={{ fontSize: '.6rem', color: C.green, fontWeight: 'bold' }}>HOW</div><div style={{ fontSize: '.72rem', color: C.muted, lineHeight: 1.4 }}>{sig.how}</div></div>
          </div>
          <div style={{ background: 'rgba(245,158,11,.05)', borderRadius: 4, padding: '3px 6px', marginBottom: 3 }}><div style={{ fontSize: '.6rem', color: C.amber, fontWeight: 'bold' }}>DIY</div><div style={{ fontSize: '.68rem', color: C.muted }}>{sig.diy}</div></div>
          <div style={{ fontSize: '.6rem', color: C.blue }}>{sig.src}</div>
        </div>
      </div>)}
    </div>
  </div>

  // Games
  const d = DIFF[diff]
  const games = { campaign: { t: 'CAMPAIGN', c: C.red, G: Campaign }, scenarios: { t: 'SCENARIO QUIZ', c: C.pink, G: ScenarioQuiz }, mirror: { t: 'MIRROR', c: C.amber, G: MirrorGame }, flare: { t: 'FLARE', c: C.red, G: FlareGame }, whistle: { t: 'WHISTLE', c: C.blue, G: WhistleGame }, fire: { t: 'FIRE', c: C.orange, G: FireGame }, morse: { t: 'MORSE', c: C.cyan, G: MorseGame }, radio: { t: 'RADIO', c: C.green, G: RadioGame } }
  const g = games[tab]
  if (g) return <div style={{ position: 'fixed', inset: 0, background: C.bg, fontFamily: '"Courier New",monospace', color: C.text, display: 'flex', flexDirection: 'column' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: 'rgba(0,0,0,.5)', borderBottom: `1px solid ${C.muted}22`, zIndex: 10, flexShrink: 0 }}>
      <button onClick={() => { S.click(); setTab('menu') }} style={{ background: C.card, border: `1px solid ${C.muted}33`, color: C.text, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontSize: '.8rem' }}>&lt;</button>
      <div style={{ fontSize: '.9rem', color: g.c, fontWeight: 'bold', letterSpacing: '.1em' }}>{g.t} <span style={{ fontSize: '.7rem', color: C.muted }}>[{d.label}]</span></div>
      <div style={{ width: 30 }} />
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 700, height: '100%' }}>
        <g.G onDone={(s) => { recordScore(tab, s); setTab('menu') }} onComplete={(s) => { recordScore(tab, s); setTab('menu') }} diff={d} />
      </div>
    </div>
  </div>
  return null
}
