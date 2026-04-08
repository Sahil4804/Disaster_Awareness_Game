/**
 * Module 4 — Sinking Car: Hydrostatic QTE Simulator
 * Aesthetic  : Tactical Command Center — #0a0a0a, cyan/amber/crimson, JetBrains Mono
 * Physics    : 100ms game loop · vehicle pitch · hydrostatic equalization · O₂ depletion
 * References : FMVSS-205 (windshield), FMVSS-226 (side windows), NFPA 1670, Red Cross
 */
import { useReducer, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'

const MONO = "'JetBrains Mono','Courier New',Courier,monospace"

// ─── Physics constants ────────────────────────────────────────────────────────
const TICK_MS         = 100
const PITCH_RATE      = 0.038    // deg/tick → 45° at ~1184 ticks (118 s)
const EXT_RATE        = 0.005    // ft/tick  → 6 ft at 1200 ticks
const LEAK_COEFF      = 0.008    // fraction/tick (int chases ext)
const O2_BASE         = 0.025    // %/tick normal breathing
const O2_FLOOD_EXTRA  = 0.07     // %/tick extra when front ceiling submerged
const O2_PANIC_COEFF  = 0.0008   // extra O2/tick per BPM above 80
const PANIC_RISE      = 0.04     // BPM/tick passive
const PANIC_BUCKLE_FAIL = 15     // BPM spike
const PANIC_GLASS_FAIL  = 22     // BPM spike on laminated bounce
const PANIC_BREATHE   = -10      // BPM delta on Breathe & Brace
const FRONT_CEIL_FT   = 4.0
const REAR_CEIL_FT    = 4.8
const TENSIONER_DEG   = 20       // pitch at which seatbelt tensioner locks
const MAX_TIME_S      = 175      // hard fail if not escaped

// ─── Reducer ──────────────────────────────────────────────────────────────────
const INIT = {
  phase:          'briefing',  // briefing|running|escaped|failed
  tick:           0,
  timeS:          0,
  pitchAngle:     0,
  extDepth:       0,
  intWater:       0,
  playerLoc:      'FRONT',     // FRONT|REAR
  isBuckled:      true,
  o2:             100,
  bpm:            80,
  tool:           null,        // null|'punch'|'cutter'
  rearSmashed:    false,
  doorForce:      0,
  flash:          null,        // null|{target,timer}
  shake:          false,
  shakeTimer:     0,
  log:            [],
  finalScore:     null,
  failReason:     null,
}

function reducer(s, a) {
  switch (a.type) {

    // ── 100ms game tick ────────────────────────────────────────────────────
    case 'TICK': {
      if (s.phase !== 'running') return s
      const tick = s.tick + 1
      const timeS = +(tick * 0.1).toFixed(1)
      let { pitchAngle, extDepth, intWater, o2, bpm, flash, shake, shakeTimer } = s

      pitchAngle = Math.min(46, pitchAngle + PITCH_RATE)
      extDepth   = Math.min(8, extDepth + EXT_RATE)
      intWater   = Math.min(extDepth, intWater + (extDepth - intWater) * LEAK_COEFF)

      const pitchRad    = pitchAngle * Math.PI / 180
      const frontWL     = intWater * (1 + 0.48 * Math.sin(pitchRad))
      const frontFlooded= frontWL >= FRONT_CEIL_FT && s.playerLoc === 'FRONT'

      let o2Drain = O2_BASE + Math.max(0, bpm - 80) * O2_PANIC_COEFF
      if (frontFlooded) o2Drain += O2_FLOOD_EXTRA
      o2  = Math.max(0, o2 - o2Drain)
      bpm = Math.min(200, bpm + PANIC_RISE + (frontFlooded ? 0.15 : 0))

      const doorForce = Math.max(0, (extDepth - intWater) * 620)

      if (flash && --flash.timer <= 0) flash = null
      if (shakeTimer > 0 && --shakeTimer <= 0) shake = false

      if (o2 <= 0)
        return { ...s, tick, timeS, pitchAngle, extDepth, intWater, o2: 0, bpm, doorForce,
                 phase: 'failed', failReason: 'HYPOXIC BLACKOUT — O₂ DEPLETED' }
      if (timeS >= MAX_TIME_S)
        return { ...s, tick, timeS, pitchAngle, extDepth, intWater, o2, bpm, doorForce,
                 phase: 'failed', failReason: 'VEHICLE FULLY SUBMERGED' }

      return { ...s, tick, timeS, pitchAngle, extDepth, intWater, o2, bpm, doorForce, flash, shake, shakeTimer }
    }

    case 'START':  return { ...INIT, phase: 'running' }
    case 'RESET':  return { ...INIT }

    case 'SELECT_TOOL':
      return { ...s, tool: s.tool === a.t ? null : a.t }

    // ── Player actions ─────────────────────────────────────────────────────
    case 'UNBUCKLE': {
      if (!s.isBuckled) return s
      if (s.pitchAngle > TENSIONER_DEG) {
        const log = [`⚠ [${s.timeS}s] SEATBELT LOCKED — tensioner engaged at ${s.pitchAngle.toFixed(1)}°. Equip Hook Cutter.`, ...s.log.slice(0, 5)]
        return { ...s, bpm: Math.min(200, s.bpm + PANIC_BUCKLE_FAIL), log }
      }
      return { ...s, isBuckled: false, log: [`✓ [${s.timeS}s] Seatbelt released manually.`, ...s.log.slice(0, 5)] }
    }

    case 'USE_CUTTER': {
      if (s.tool !== 'cutter' || !s.isBuckled) return s
      return {
        ...s, isBuckled: false, tool: null,
        o2: Math.max(0, s.o2 - 1.5),
        log: [`✓ [${s.timeS}s] Hook Cutter deployed — belt severed.`, ...s.log.slice(0, 5)],
      }
    }

    case 'MOVE_REAR': {
      if (s.isBuckled || s.playerLoc === 'REAR') return s
      const frontWL = s.intWater * (1 + 0.48 * Math.sin(s.pitchAngle * Math.PI / 180))
      if (frontWL >= FRONT_CEIL_FT) {
        return {
          ...s, bpm: Math.min(200, s.bpm + 12),
          log: [`✗ [${s.timeS}s] BLOCKED — front cabin fully submerged.`, ...s.log.slice(0, 5)],
        }
      }
      return { ...s, playerLoc: 'REAR', log: [`✓ [${s.timeS}s] Relocated to REAR seat.`, ...s.log.slice(0, 5)] }
    }

    case 'STRIKE': {
      const { target } = a
      if (s.tool !== 'punch') {
        return { ...s, log: [`✗ [${s.timeS}s] No tool selected. Equip Center Punch.`, ...s.log.slice(0, 5)] }
      }
      if (target === 'REAR') {
        return {
          ...s, rearSmashed: true, tool: null, flash: { target: 'REAR', timer: 10 },
          log: [`✓ [${s.timeS}s] TEMPERED GLASS SHATTERED — escape route open!`, ...s.log.slice(0, 5)],
        }
      }
      const msg = target === 'WINDSHIELD'
        ? `✗ [${s.timeS}s] WINDSHIELD LAMINATED (FMVSS-205) — punch deflected. Tool bounced back.`
        : `✗ [${s.timeS}s] SIDE WINDOW LAMINATED (FMVSS-226) — shatterproof. Target rear window.`
      return {
        ...s,
        bpm: Math.min(200, s.bpm + PANIC_GLASS_FAIL),
        o2:  Math.max(0, s.o2 - 1.0),
        flash: { target, timer: 10 },
        shake: true, shakeTimer: 8,
        log: [msg, ...s.log.slice(0, 5)],
      }
    }

    case 'BREATHE': {
      return {
        ...s, bpm: Math.max(70, s.bpm + PANIC_BREATHE),
        log: [`○ [${s.timeS}s] Breathe & Brace — controlled breathing activated.`, ...s.log.slice(0, 5)],
      }
    }

    case 'ESCAPE': {
      if (s.isBuckled || s.playerLoc !== 'REAR') return s
      if (!s.rearSmashed && s.doorForce >= 80) return s
      const score = Math.min(100, Math.max(0, Math.round(s.o2 * 0.55 + (1 - s.timeS / MAX_TIME_S) * 45)))
      return { ...s, phase: 'escaped', finalScore: score }
    }

    default: return s
  }
}

// ─── Car SVG component ────────────────────────────────────────────────────────
function CarSchematic({ s }) {
  const pitchRad   = s.pitchAngle * Math.PI / 180
  const frontWL    = s.intWater * (1 + 0.48 * Math.sin(pitchRad))
  const rearWL     = s.intWater * (1 - 0.30 * Math.sin(pitchRad))

  // SVG interior dimensions
  const FL  = 205  // floor Y
  const CL  = 72   // ceiling Y
  const IH  = FL - CL  // interior height pixels (133)
  const FX  = 128  // front wall X (A-pillar)
  const BX  = 355  // B-pillar X
  const RX  = 562  // rear wall X (C-pillar)

  // Water pixel heights (from floor upward)
  const frontWPx = Math.min(IH, (frontWL / FRONT_CEIL_FT) * IH)
  const rearWPx  = Math.min(IH, (rearWL  / REAR_CEIL_FT)  * IH)

  // Internal water polygon (slanted, pools forward)
  const intWaterPoly = [
    `${FX},${FL}`, `${RX},${FL}`,
    `${RX},${FL - rearWPx}`, `${FX},${FL - frontWPx}`,
  ].join(' ')

  const flashColor = s.flash?.target === 'REAR' ? '#00ff88' : '#ffffff'

  return (
    <svg viewBox="0 0 720 280" style={{ width: '100%', height: '100%' }}>
      {/* Flash overlay on glass hit */}
      {s.flash && (
        <circle
          cx={s.flash.target === 'WINDSHIELD' ? 240 : s.flash.target === 'SIDE' ? 340 : 460}
          cy={140}
          r={s.flash.timer * 14}
          fill={flashColor}
          opacity={s.flash.timer * 0.09}
        />
      )}

      {/* ── Background earth/water ── */}
      <rect width={720} height={280} fill="#060606"/>
      {/* External flood water */}
      {s.extDepth > 0 && (
        <rect x={0} y={Math.max(0, 280 - s.extDepth * 38)} width={720}
              height={s.extDepth * 38}
              fill="rgba(29,78,216,0.38)"/>
      )}
      {/* Water surface wave line */}
      {s.extDepth > 0.2 && (
        <line x1={0} y1={280 - s.extDepth * 38} x2={720} y2={280 - s.extDepth * 38}
              stroke="#60a5fa" strokeWidth={2}
              style={{ animation: 'wave-h 2s ease-in-out infinite alternate' }}/>
      )}

      {/* ── Rotating car group (nose-down tilt) ── */}
      <g style={{
        transform: `rotate(${s.pitchAngle}deg)`,
        transformOrigin: '128px 205px',
        transition: 'transform 0.08s linear',
      }}>

        {/* Car body fill */}
        <path d="M 50,190 L 50,155 Q 70,120 128,78 L 562,78 Q 610,115 640,155 L 650,190 L 650,210 L 50,210 Z"
              fill="rgba(8,20,12,0.92)"/>

        {/* Body outline */}
        <path d="M 50,190 L 50,155 Q 70,120 128,78 L 562,78 Q 610,115 640,155 L 650,190 L 650,210 L 50,210 Z"
              fill="none" stroke="#00e5ff" strokeWidth="1.8"/>

        {/* ── Internal structure ── */}
        {/* Floor */}
        <line x1={FX} y1={FL} x2={RX} y2={FL} stroke="#00e5ff" strokeWidth="1.2" strokeDasharray="8,4"/>
        {/* Ceiling */}
        <line x1={FX} y1={CL} x2={RX} y2={CL} stroke="#00e5ff" strokeWidth="1.2" strokeDasharray="8,4"/>

        {/* B-pillar */}
        <line x1={BX} y1={CL} x2={BX} y2={FL} stroke="#00e5ff" strokeWidth="2"/>

        {/* A-pillar (windshield frame) */}
        <line x1={FX} y1={CL} x2={FX} y2={FL} stroke="#00e5ff" strokeWidth="1.5"/>

        {/* C-pillar */}
        <line x1={RX} y1={CL} x2={RX} y2={FL} stroke="#00e5ff" strokeWidth="1.5"/>

        {/* ── Window fills ── */}
        {/* Windshield zone (between nose and cabin) */}
        <path d="M 80,170 L 128,78 L 128,78 L 50,155"
              fill="rgba(0,229,255,0.04)" stroke="#00e5ff" strokeWidth="1" opacity="0.6"/>

        {/* Front side window */}
        <rect x={FX+2} y={CL+2} width={BX-FX-4} height={FL-CL-4}
              fill={s.flash?.target==='WINDSHIELD'||s.flash?.target==='SIDE' ? 'rgba(255,255,255,0.06)' : 'rgba(0,229,255,0.03)'}
              stroke={s.flash?.target==='SIDE' ? '#ef4444' : '#00e5ff'} strokeWidth="1" opacity="0.6"/>
        {/* LAMINATED label on front window */}
        <text x={(FX+BX)/2} y={CL+30} fill="#ef444466" fontSize="9" fontFamily="monospace"
              textAnchor="middle" letterSpacing="1">LAMINATED</text>
        <text x={(FX+BX)/2} y={CL+42} fill="#ef444455" fontSize="7" fontFamily="monospace"
              textAnchor="middle">FMVSS-226</text>

        {/* Rear side window */}
        <rect x={BX+2} y={CL+2} width={RX-BX-4} height={FL-CL-4}
              fill={s.rearSmashed ? 'rgba(34,197,94,0.08)' : 'rgba(0,229,255,0.03)'}
              stroke={s.rearSmashed ? '#22c55e' : s.flash?.target==='REAR' ? '#22c55e' : '#00e5ff'}
              strokeWidth="1" opacity="0.7"/>
        {s.rearSmashed ? (
          <>
            <text x={(BX+RX)/2} y={CL+30} fill="#22c55e" fontSize="10" fontFamily="monospace"
                  textAnchor="middle" letterSpacing="1">SHATTERED</text>
            <text x={(BX+RX)/2} y={CL+44} fill="#22c55e88" fontSize="8" fontFamily="monospace"
                  textAnchor="middle">ESCAPE OPEN</text>
            {/* Shatter lines */}
            {[[BX+40,CL+20,RX-20,FL-20],[BX+80,CL+5,BX+20,FL-10],[BX+150,CL+10,RX-10,CL+80]].map(([x1,y1,x2,y2],i)=>(
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22c55e" strokeWidth="1" opacity="0.5"/>
            ))}
          </>
        ) : (
          <>
            <text x={(BX+RX)/2} y={CL+30} fill="#22c55e66" fontSize="9" fontFamily="monospace"
                  textAnchor="middle" letterSpacing="1">TEMPERED</text>
            <text x={(BX+RX)/2} y={CL+42} fill="#22c55e55" fontSize="7" fontFamily="monospace"
                  textAnchor="middle">BREAKABLE</text>
          </>
        )}

        {/* Rear window (back of car) */}
        <path d="M 562,78 Q 610,115 640,155 L 650,190 L 562,190"
              fill="rgba(0,229,255,0.03)" stroke={s.rearSmashed ? '#22c55e' : '#00e5ff'} strokeWidth="1.2"/>

        {/* ── Internal water ── */}
        {s.intWater > 0.05 && (
          <polygon points={intWaterPoly} fill="rgba(37,99,235,0.55)"
                   style={{ animation: 'water-slosh 3s ease-in-out infinite' }}/>
        )}
        {s.intWater > 0.1 && (
          <line x1={FX} y1={FL - frontWPx} x2={RX} y2={FL - rearWPx}
                stroke="#93c5fd" strokeWidth="1.5"
                style={{ animation: 'wave-h 1.5s ease-in-out infinite alternate' }}/>
        )}

        {/* ── Seats ── */}
        {/* Front seat */}
        <g opacity={s.playerLoc === 'FRONT' ? 1 : 0.4}>
          <rect x={190} y={FL-50} width={80} height={48} rx="4"
                fill="rgba(0,100,60,0.3)" stroke="#22c55e" strokeWidth={s.playerLoc==='FRONT'?2:1}/>
          <rect x={185} y={FL-90} width={12} height={42}
                fill="rgba(0,100,60,0.3)" stroke="#22c55e" strokeWidth="1"/>
          {/* Seatbelt indicator */}
          {s.isBuckled && s.playerLoc === 'FRONT' && (
            <path d="M 230,FL-48 Q 200,FL-30 192,FL-10" stroke="#fbbf24" strokeWidth="2"
                  fill="none" style={{ animation: 'glow-amber 1s ease-in-out infinite' }}
                  transform={`translate(0,${-(FL)}) translate(0,${FL})`}/>
          )}
        </g>

        {/* Rear seat */}
        <g opacity={s.playerLoc === 'REAR' ? 1 : 0.4}>
          <rect x={400} y={FL-50} width={120} height={48} rx="4"
                fill="rgba(0,80,100,0.3)" stroke={s.playerLoc==='REAR'?'#00e5ff':'#1e3a5f'}
                strokeWidth={s.playerLoc==='REAR'?2:1}/>
          <rect x={396} y={FL-90} width={12} height={42}
                fill="rgba(0,80,100,0.3)" stroke={s.playerLoc==='REAR'?'#00e5ff':'#1e3a5f'} strokeWidth="1"/>
        </g>

        {/* ── Player silhouette ── */}
        {s.playerLoc === 'FRONT' ? (
          <g transform="translate(240, 142)">
            <circle cx={0} cy={-22} r={11} fill="#00e5ff44" stroke="#00e5ff" strokeWidth="1.5"/>
            <rect x={-10} y={-11} width={20} height={28} rx="4" fill="#00e5ff44" stroke="#00e5ff" strokeWidth="1.5"/>
            {/* Seatbelt strap across body */}
            {s.isBuckled && (
              <line x1={-10} y1={-8} x2={10} y2={17} stroke="#fbbf24" strokeWidth="2"
                    style={{ animation: 'glow-amber 0.8s ease-in-out infinite alternate' }}/>
            )}
          </g>
        ) : (
          <g transform="translate(455, 142)">
            <circle cx={0} cy={-22} r={11} fill="#00e5ff44" stroke="#00e5ff" strokeWidth="1.5"/>
            <rect x={-10} y={-11} width={20} height={28} rx="4" fill="#00e5ff44" stroke="#00e5ff" strokeWidth="1.5"/>
          </g>
        )}

        {/* Steering wheel */}
        <circle cx={215} cy={163} r={22} fill="none" stroke="#fbbf2488" strokeWidth="2"/>
        <line x1={215} y1={141} x2={215} y2={185} stroke="#fbbf2444" strokeWidth="1"/>
        <line x1={193} y1={163} x2={237} y2={163} stroke="#fbbf2444" strokeWidth="1"/>

        {/* Dashboard line */}
        <line x1={FX} y1={145} x2={BX-20} y2={148} stroke="#00e5ff44" strokeWidth="2"/>

        {/* Zone labels */}
        <text x={(FX+BX)/2} y={FL-55} fill="#00e5ff44" fontSize="9" fontFamily="monospace"
              textAnchor="middle">FRONT SEAT</text>
        <text x={(BX+RX)/2} y={FL-55} fill="#00e5ff44" fontSize="9" fontFamily="monospace"
              textAnchor="middle">REAR SEAT</text>

        {/* Front ceiling flood warning */}
        {frontWPx >= IH * 0.9 && s.playerLoc === 'FRONT' && (
          <rect x={FX} y={CL} width={BX-FX} height={FL-CL} fill="rgba(239,68,68,0.15)"
                style={{ animation: 'glow-pulse 0.3s ease-in-out infinite' }}/>
        )}

        {/* Pitch label */}
        <text x={680} y={FL-15} fill="#fbbf24" fontSize="9" fontFamily="monospace"
              textAnchor="end">PITCH: {s.pitchAngle.toFixed(1)}°</text>

      </g>{/* end rotating car group */}
    </svg>
  )
}

// ─── Vertical gauge ────────────────────────────────────────────────────────────
function Gauge({ label, value, max, colorFn, unit = '', invert = false, h = 150 }) {
  const pct   = Math.min(1, Math.max(0, (invert ? max - value : value) / max))
  const color = colorFn(invert ? 1 - pct : pct)
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ color:'#334155', fontFamily:MONO, fontSize:8, letterSpacing:1, textAlign:'center', maxWidth:56, lineHeight:1.3 }}>{label}</div>
      <div style={{ position:'relative', width:28, height:h, background:'#0a0a0a', border:'1px solid #1a2535', borderRadius:3, overflow:'hidden' }}>
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          height:`${pct*100}%`,
          background:`linear-gradient(0deg,${color}dd,${color}66)`,
          transition:'height 0.08s, background 0.3s',
          boxShadow:`0 0 10px ${color}44`,
        }}/>
        {[0.25,0.5,0.75].map(t=><div key={t} style={{position:'absolute',bottom:`${t*100}%`,left:0,right:0,height:1,background:'rgba(255,255,255,0.05)'}}/>)}
      </div>
      <div style={{ color, fontFamily:MONO, fontSize:11, fontWeight:700 }}>{value.toFixed(value>9?0:1)}{unit}</div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Module4_SinkingCar() {
  const { dispatch: gd } = useGame()
  const [s, dispatch]   = useReducer(reducer, INIT)
  const tickRef         = useRef(null)

  // 100 ms game loop
  useEffect(() => {
    if (s.phase !== 'running') { clearInterval(tickRef.current); return }
    tickRef.current = setInterval(() => dispatch({ type: 'TICK' }), TICK_MS)
    return () => clearInterval(tickRef.current)
  }, [s.phase])

  // Record score on end
  useEffect(() => {
    if (s.phase !== 'escaped' && s.phase !== 'failed') return
    const score = Math.min(100, Math.max(0, s.finalScore ?? Math.round(s.o2 * 0.5)))
    gd({ type:'RECORD_SCORE', payload:{ key:'flood-4', result:{ score, passed: s.phase==='escaped' } } })
  }, [s.phase]) // eslint-disable-line

  // Derived values
  const pitchRad    = s.pitchAngle * Math.PI / 180
  const frontWL     = s.intWater * (1 + 0.48 * Math.sin(pitchRad))
  const rearWL      = s.intWater * (1 - 0.30 * Math.sin(pitchRad))
  const frontFull   = frontWL >= FRONT_CEIL_FT
  const tensionLock = s.pitchAngle > TENSIONER_DEG
  const canEscape   = !s.isBuckled && s.playerLoc === 'REAR' && (s.rearSmashed || s.doorForce < 80)
  const timePct     = s.timeS / MAX_TIME_S
  const tunnelVision= s.o2 < 30
  const tunnelAlpha = tunnelVision ? Math.min(0.85, (30 - s.o2) / 30 * 0.85) : 0

  // ── BRIEFING ──────────────────────────────────────────────────────────────
  if (s.phase === 'briefing') return (
    <div style={{ position:'fixed', inset:0, background:'#080808', fontFamily:MONO, display:'flex', alignItems:'center', justifyContent:'center', padding:24, overflowY:'auto' }}>
      <style>{`
        @keyframes shake{0%,100%{transform:translate(0,0)}15%{transform:translate(-4px,2px)}30%{transform:translate(4px,-3px)}45%{transform:translate(-3px,3px)}60%{transform:translate(3px,-2px)}75%{transform:translate(-2px,2px)}90%{transform:translate(2px,-1px)}}
        @keyframes wave-h{from{transform:translateY(0)}to{transform:translateY(3px)}}
        @keyframes water-slosh{0%,100%{opacity:0.55}50%{opacity:0.72}}
        @keyframes glow-amber{0%,100%{opacity:1}50%{opacity:0.35}}
        @keyframes glow-pulse{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes tunnel{to{box-shadow: inset 0 0 120px 80px rgba(0,0,0,0.92)}}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink-fast{0%,100%{opacity:1}50%{opacity:0.2}}
      `}</style>

      <div style={{ maxWidth:700, width:'100%' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ color:'#ef4444', fontSize:11, letterSpacing:4, marginBottom:10, animation:'blink-fast 1.2s ease-in-out infinite' }}>
            ⚠ PRIORITY 1 — VEHICLE IN WATER
          </div>
          <div style={{ color:'#00e5ff', fontSize:24, fontWeight:700, letterSpacing:3 }}>MODULE 4: SINKING CAR</div>
          <div style={{ color:'#1e3050', fontSize:11, letterSpacing:2, marginTop:5 }}>
            HYDROSTATIC QTE SIMULATOR · VEHICLE ANATOMY PHYSICS ENGINE
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
          <div style={{ background:'#0d0d0d', border:'1px solid #1a2535', borderRadius:6, padding:16 }}>
            <div style={{ color:'#fbbf24', fontSize:9, letterSpacing:2, marginBottom:10 }}>SCENARIO</div>
            <p style={{ color:'#647a8e', fontSize:12, lineHeight:1.8, margin:'0 0 12px' }}>
              Your vehicle has entered floodwater and is sinking. The car is pitching nose-down.
              You have approximately <span style={{color:'#00e5ff'}}>120 seconds</span> before the cabin is fully submerged.
            </p>
            <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:4, padding:'10px 14px' }}>
              <div style={{ color:'#ef4444', fontSize:9, letterSpacing:1, marginBottom:8 }}>FAIL CONDITIONS</div>
              {[
                ['O₂ DEPLETION', 'Panic + submersion drain your oxygen to zero'],
                ['VEHICLE SUBMERGED', 'Time limit exceeded — cabin sealed by water'],
              ].map(([t,d]) => (
                <div key={t} style={{ marginBottom:5 }}>
                  <span style={{ color:'#f87171', fontSize:10, fontWeight:700 }}>▪ {t}</span>
                  <div style={{ color:'#2a4055', fontSize:10, marginLeft:10 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:'#0d0d0d', border:'1px solid #1a2535', borderRadius:6, padding:16 }}>
            <div style={{ color:'#00e5ff', fontSize:9, letterSpacing:2, marginBottom:10 }}>VEHICLE SPECS</div>
            {[
              ['WINDSHIELD',    'LAMINATED (FMVSS-205)',   '#ef4444', 'Cannot be shattered — punch deflects'],
              ['SIDE WINDOWS',  'LAMINATED (FMVSS-226)',   '#ef4444', 'Shatterproof safety glass — do NOT waste energy'],
              ['REAR WINDOW',   'TEMPERED GLASS',          '#22c55e', 'CAN be shattered with center punch'],
              ['SEATBELT',      'TENSIONER LOCKS AT 20°',  '#fbbf24', 'Pitch > 20° locks buckle — requires Hook Cutter'],
            ].map(([part, spec, c, note]) => (
              <div key={part} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#647a8e', fontSize:10 }}>{part}</span>
                  <span style={{ color:c, fontSize:10, fontWeight:700 }}>{spec}</span>
                </div>
                <div style={{ color:'#2a4055', fontSize:9, marginTop:2 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:'#0d0d0d', border:'1px solid rgba(251,191,36,0.2)', borderRadius:6, padding:'12px 16px', marginBottom:18 }}>
          <div style={{ color:'#fbbf24', fontSize:9, letterSpacing:2, marginBottom:8 }}>ESCAPE SEQUENCE</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              ['1', 'UNBUCKLE', 'Before pitch > 20° OR use Hook Cutter'],
              ['2', 'MOVE REAR', 'Front ceiling floods first — get to rear'],
              ['3', 'STRIKE REAR', 'Center Punch on rear window (TEMPERED)'],
              ['4', 'ESCAPE', 'Through shattered glass or equalized door'],
            ].map(([n, t, d]) => (
              <div key={n} style={{ flex:'1 1 160px', background:'rgba(0,229,255,0.04)', border:'1px solid #1a2535', borderRadius:4, padding:'8px 10px' }}>
                <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:14, fontWeight:900, color:'#00e5ff' }}>{n}</span>
                  <span style={{ color:'#00e5ff', fontSize:11, fontWeight:700 }}>{t}</span>
                </div>
                <div style={{ color:'#334155', fontSize:9, lineHeight:1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign:'center' }}>
          <button onClick={() => dispatch({ type:'START' })} style={{
            padding:'14px 60px', borderRadius:4, fontFamily:MONO, fontSize:16, fontWeight:700,
            letterSpacing:3, cursor:'pointer', border:'2px solid #ef4444',
            background:'rgba(239,68,68,0.08)', color:'#ef4444',
            boxShadow:'0 0 20px rgba(239,68,68,0.2)',
          }}>▶ ENTER VEHICLE</button>
          <div style={{ marginTop:10 }}>
            <button onClick={() => gd({ type:'BACK_TO_MODULES' })}
              style={{ background:'none', border:'none', color:'#1e3050', fontFamily:MONO, fontSize:11, cursor:'pointer' }}>
              ← BACK TO MODULES
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── RESULT SCREENS ────────────────────────────────────────────────────────
  if (s.phase === 'escaped' || s.phase === 'failed') return (
    <div style={{ position:'fixed', inset:0, background:'#070707', fontFamily:MONO, display:'flex', flexDirection:'column' }}>
      <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}@keyframes blink-fast{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
      <div style={{ height:48, background:'#080808', borderBottom:'1px solid #111', display:'flex', alignItems:'center', padding:'0 16px', gap:16 }}>
        <div style={{ color: s.phase==='escaped'?'#22c55e':'#ef4444', fontSize:13, fontWeight:700, letterSpacing:2 }}>
          {s.phase==='escaped' ? 'ESCAPE CONFIRMED — SURVIVOR' : `FATAL — ${s.failReason}`}
        </div>
      </div>
      <div style={{ flex:1, display:'flex' }}>
        <div style={{ flex:1, padding:12 }}><CarSchematic s={s}/></div>
        <div style={{ width:360, background:'#080808', borderLeft:'1px solid #111', padding:'20px 18px', display:'flex', flexDirection:'column', gap:16 }}>
          {s.phase==='escaped' ? (
            <>
              <div style={{ fontSize:52, textAlign:'center' }}>🏊</div>
              <div style={{ color:'#22c55e', fontFamily:MONO, fontSize:44, fontWeight:900, textAlign:'center' }}>
                {s.finalScore}%
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['O₂ REMAINING', `${s.o2.toFixed(0)}%`, '#22c55e'],
                  ['TIME ELAPSED', `${s.timeS.toFixed(1)}s`, '#00e5ff'],
                  ['PITCH AT EXIT', `${s.pitchAngle.toFixed(1)}°`, '#fbbf24'],
                  ['DOOR FORCE', `${s.doorForce.toFixed(0)} lbs`, '#60a5fa'],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ background:'#0d0d0d', border:'1px solid #141414', borderRadius:3, padding:'8px 10px' }}>
                    <div style={{ color:'#2a4055', fontSize:8, letterSpacing:1 }}>{l}</div>
                    <div style={{ color:c, fontFamily:MONO, fontSize:15, fontWeight:700, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:52, textAlign:'center' }}>💀</div>
              <div style={{ color:'#ef4444', fontFamily:MONO, fontSize:15, fontWeight:700, letterSpacing:2, textAlign:'center' }}>
                {s.failReason}
              </div>
              <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid #1a2535', borderRadius:4, padding:'12px 14px' }}>
                <div style={{ color:'#fbbf24', fontSize:9, letterSpacing:2, marginBottom:8 }}>📋 FEMA / RED CROSS</div>
                <div style={{ color:'#647a8e', fontSize:10, lineHeight:1.8 }}>
                  {s.failReason?.includes('O₂') ? (
                    <><b style={{color:'#f87171'}}>Red Cross:</b> Panic hyperventilation consumes O₂ rapidly. "Stay calm. Take slow, controlled breaths. You have more time than you think." A submerging car takes 1–2 minutes to fill — controlled breathing is your primary survival asset.</>
                  ) : (
                    <><b style={{color:'#f87171'}}>FEMA / NFPA 1670:</b> "Turn around, don't drown. Never drive through flooded roadways." Six inches of moving water can knock a person off their feet; 12 inches can carry away a vehicle. If trapped, act immediately — do not wait.</>
                  )}
                </div>
              </div>
            </>
          )}
          <div style={{ marginTop:'auto', display:'flex', gap:10 }}>
            <button onClick={() => dispatch({ type:'RESET' })} style={{ flex:1, padding:'10px', borderRadius:3, fontFamily:MONO, fontSize:12, fontWeight:700, letterSpacing:2, cursor:'pointer', border:'1px solid #ef4444', background:'rgba(239,68,68,0.07)', color:'#ef4444' }}>↺ RETRY</button>
            <button onClick={() => { dispatch({ type:'RESET' }); gd({ type:'BACK_TO_MODULES' }) }} style={{ padding:'10px 14px', borderRadius:3, fontFamily:MONO, fontSize:11, cursor:'pointer', border:'1px solid #1e2d3a', background:'transparent', color:'#334155' }}>← MODULES</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── SIMULATION SCREEN ─────────────────────────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, background:'#070707', fontFamily:MONO, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes shake{0%,100%{transform:translate(0,0)}15%{transform:translate(-5px,3px)}30%{transform:translate(5px,-4px)}45%{transform:translate(-4px,4px)}60%{transform:translate(4px,-3px)}75%{transform:translate(-2px,2px)}90%{transform:translate(2px,-1px)}}
        @keyframes wave-h{from{transform:translateY(0)}to{transform:translateY(3px)}}
        @keyframes water-slosh{0%,100%{opacity:0.55}50%{opacity:0.72}}
        @keyframes glow-amber{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes glow-pulse{0%,100%{opacity:1}50%{opacity:0.15}}
        @keyframes blink-fast{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
      `}</style>

      {/* Tunnel vision overlay */}
      {tunnelAlpha > 0 && (
        <div style={{
          position:'absolute', inset:0, zIndex:30, pointerEvents:'none',
          background:`radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(0,0,0,${tunnelAlpha}) 100%)`,
          transition:'background 0.5s',
        }}/>
      )}
      {/* O2 critical flash */}
      {s.o2 < 10 && (
        <div style={{ position:'absolute', inset:0, zIndex:31, pointerEvents:'none',
                      background:'rgba(239,68,68,0.06)', animation:'glow-pulse 0.4s ease-in-out infinite' }}/>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ height:48, background:'#080808', borderBottom:'1px solid #111', display:'flex', alignItems:'center', padding:'0 14px', gap:14, flexShrink:0 }}>
        <button onClick={() => { dispatch({ type:'RESET' }); gd({ type:'BACK_TO_MODULES' }) }}
          style={{ background:'none', border:'none', color:'#1e3050', fontFamily:MONO, fontSize:11, cursor:'pointer' }}>← EXIT</button>
        <div style={{ color:'#ef4444', fontSize:11, fontWeight:700, letterSpacing:2, animation:'blink-fast 1s ease-in-out infinite' }}>
          ⚠ M4 · SINKING CAR
        </div>
        {/* Time bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, maxWidth:280 }}>
          <span style={{ color:'#1e3050', fontSize:8, letterSpacing:1, flexShrink:0 }}>TIME</span>
          <div style={{ flex:1, height:6, background:'#0a0a0a', border:'1px solid #141414', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:3, width:`${(1-timePct)*100}%`,
                          background:`linear-gradient(90deg,#22c55e,${timePct>0.6?'#ef4444':'#f59e0b'})`,
                          transition:'width 0.08s' }}/>
          </div>
          <span style={{ color:timePct>0.7?'#ef4444':'#f59e0b', fontFamily:MONO, fontSize:12, fontWeight:700, minWidth:40 }}>
            {Math.max(0, MAX_TIME_S - s.timeS).toFixed(0)}s
          </span>
        </div>
        {/* Status indicators */}
        <div style={{ display:'flex', gap:12 }}>
          <span style={{ color: s.isBuckled ? '#ef4444' : '#22c55e', fontSize:10, fontWeight:700 }}>
            {s.isBuckled ? '🔒 BUCKLED' : '✓ FREE'}
          </span>
          <span style={{ color: s.playerLoc === 'FRONT' ? '#fbbf24' : '#00e5ff', fontSize:10, fontWeight:700 }}>
            📍 {s.playerLoc}
          </span>
          {canEscape && (
            <span style={{ color:'#22c55e', fontSize:10, fontWeight:700, animation:'blink-fast 0.7s ease-in-out infinite' }}>
              🟢 ESCAPE READY
            </span>
          )}
        </div>
      </div>

      {/* ── MAIN: telemetry + car + inventory ── */}
      <div style={{ flex:1, display:'flex', minHeight:0, animation: s.shake ? 'shake 0.15s ease-in-out' : 'none' }}>

        {/* LEFT: telemetry gauges */}
        <div style={{ width:120, background:'#080808', borderRight:'1px solid #111', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'12px 8px', gap:14 }}>
          <div style={{ fontSize:8, color:'#1a2d40', letterSpacing:3 }}>TELEMETRY</div>
          <Gauge label="PITCH°" value={s.pitchAngle} max={45}
                 colorFn={p=>p<0.44?'#22c55e':p<0.77?'#f59e0b':'#ef4444'} unit="°" h={120}/>
          <Gauge label="DOOR FORCE lbs" value={s.doorForce} max={3000}
                 colorFn={p=>p<0.33?'#22c55e':p<0.66?'#fbbf24':'#ef4444'} unit="" h={120}/>
          <Gauge label="O₂ SAT %" value={s.o2} max={100}
                 colorFn={p=>p>0.6?'#22c55e':p>0.3?'#f59e0b':'#ef4444'} unit="%" h={120}/>
          <Gauge label="PANIC BPM" value={s.bpm} max={200}
                 colorFn={p=>p<0.5?'#22c55e':p<0.75?'#fbbf24':'#ef4444'} unit="" invert={false} h={120}/>
        </div>

        {/* CENTER: car schematic */}
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:8, minWidth:0 }}>
          <CarSchematic s={s}/>
        </div>

        {/* RIGHT: inventory + event log */}
        <div style={{ width:200, background:'#080808', borderLeft:'1px solid #111', display:'flex', flexDirection:'column', padding:'12px 10px', gap:12 }}>
          <div style={{ fontSize:8, color:'#1a2d40', letterSpacing:3 }}>INVENTORY</div>

          {/* Center Punch */}
          <div onClick={() => dispatch({ type:'SELECT_TOOL', t:'punch' })}
            style={{
              padding:'10px 12px', borderRadius:4, cursor:'pointer', transition:'all 0.15s',
              border:`1px solid ${s.tool==='punch'?'#fbbf24':'#1a2535'}`,
              background:s.tool==='punch'?'rgba(251,191,36,0.08)':'#0d0d0d',
            }}>
            <div style={{ color: s.tool==='punch'?'#fbbf24':'#94a3b8', fontSize:11, fontWeight:700, marginBottom:4 }}>
              🔨 Center Punch
            </div>
            <div style={{ color:'#2a4055', fontSize:9, lineHeight:1.5 }}>
              Use on REAR WINDOW only. Tempered glass shatters with focused strike.
            </div>
            {s.tool==='punch' && <div style={{ color:'#fbbf24', fontSize:9, marginTop:4 }}>▶ SELECTED — click a strike action</div>}
          </div>

          {/* Hook Cutter */}
          <div onClick={() => dispatch({ type:'SELECT_TOOL', t:'cutter' })}
            style={{
              padding:'10px 12px', borderRadius:4, cursor:'pointer', transition:'all 0.15s',
              border:`1px solid ${s.tool==='cutter'?'#00e5ff':'#1a2535'}`,
              background:s.tool==='cutter'?'rgba(0,229,255,0.06)':'#0d0d0d',
            }}>
            <div style={{ color:s.tool==='cutter'?'#00e5ff':'#94a3b8', fontSize:11, fontWeight:700, marginBottom:4 }}>
              ✂️ Hook Cutter
            </div>
            <div style={{ color:'#2a4055', fontSize:9, lineHeight:1.5 }}>
              Cuts locked seatbelt when tensioner is engaged. Required if pitch &gt; 20°.
            </div>
            {s.tool==='cutter' && <div style={{ color:'#00e5ff', fontSize:9, marginTop:4 }}>▶ SELECTED — click "Use Cutter"</div>}
          </div>

          {/* Pitch warning */}
          {tensionLock && (
            <div style={{ padding:'8px 10px', borderRadius:4, background:'rgba(239,68,68,0.08)',
                          border:'1px solid rgba(239,68,68,0.3)', animation:'blink-fast 1s ease-in-out infinite' }}>
              <div style={{ color:'#ef4444', fontSize:9, fontWeight:700 }}>⚠ TENSIONER LOCKED</div>
              <div style={{ color:'#7f2a2a', fontSize:9, marginTop:3 }}>Pitch {s.pitchAngle.toFixed(1)}° &gt; 20° — manual unbuckle FAILS. Use Hook Cutter.</div>
            </div>
          )}

          {/* Front flood warning */}
          {frontWL >= FRONT_CEIL_FT * 0.8 && s.playerLoc === 'FRONT' && (
            <div style={{ padding:'8px 10px', borderRadius:4, background:'rgba(239,68,68,0.1)',
                          border:'1px solid rgba(239,68,68,0.4)', animation:'glow-pulse 0.5s ease-in-out infinite' }}>
              <div style={{ color:'#ef4444', fontSize:9, fontWeight:700 }}>⚠ FRONT CEILING FLOODING</div>
              <div style={{ color:'#7f2a2a', fontSize:9, marginTop:3 }}>Move to rear immediately or be trapped!</div>
            </div>
          )}

          {/* Door equalization status */}
          <div style={{ marginTop:'auto', padding:'8px 10px', background:'#0d0d0d', border:'1px solid #141414', borderRadius:4 }}>
            <div style={{ fontSize:8, color:'#1e3050', letterSpacing:1, marginBottom:4 }}>EQUALIZATION</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:9 }}>
              <span style={{ color:'#334155' }}>EXT: {s.extDepth.toFixed(2)}ft</span>
              <span style={{ color:'#334155' }}>INT: {s.intWater.toFixed(2)}ft</span>
            </div>
            <div style={{ height:4, background:'#0a0a0a', border:'1px solid #141414', borderRadius:2, overflow:'hidden', marginTop:5 }}>
              <div style={{ height:'100%', borderRadius:2, transition:'width 0.1s',
                            width:`${Math.min(100, (s.intWater / Math.max(0.01, s.extDepth)) * 100)}%`,
                            background: s.doorForce < 80 ? '#22c55e' : '#3b82f6' }}/>
            </div>
            <div style={{ color: s.doorForce < 80 ? '#22c55e' : '#2a4055', fontSize:9, marginTop:3, fontWeight: s.doorForce < 80 ? 700 : 400 }}>
              {s.doorForce < 80 ? '✓ DOOR OPENABLE' : `Force: ${s.doorForce.toFixed(0)} lbs`}
            </div>
          </div>

          {/* Event log */}
          <div style={{ borderTop:'1px solid #111', paddingTop:8 }}>
            <div style={{ fontSize:8, color:'#1a2d40', letterSpacing:2, marginBottom:5 }}>LOG</div>
            {s.log.slice(0,4).map((e,i) => (
              <div key={i} style={{ fontSize:8.5, color: e.startsWith('✓')?'#22c55e':e.startsWith('⚠')||e.startsWith('✗')?'#ef4444':'#334155',
                                    lineHeight:1.5, marginBottom:4,
                                    opacity: 1 - i * 0.18,
                                    animation: i===0?'fade-in 0.2s ease-out':'none' }}>
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ACTION DECK ── */}
      <div style={{ background:'#080808', borderTop:'2px solid #1a2535', padding:'10px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>

          {/* Actions based on state */}
          {s.isBuckled && (
            <>
              <ActionBtn
                label="ATTEMPT UNBUCKLE"
                icon="🔓"
                color="#fbbf24"
                warn={tensionLock}
                warnText={tensionLock ? 'TENSIONER LOCKED' : ''}
                onClick={() => dispatch({ type:'UNBUCKLE' })}
              />
              {s.tool === 'cutter' && (
                <ActionBtn label="USE CUTTER — CUT BELT" icon="✂️" color="#00e5ff"
                           onClick={() => dispatch({ type:'USE_CUTTER' })}/>
              )}
            </>
          )}

          {!s.isBuckled && s.playerLoc === 'FRONT' && (
            <ActionBtn label="RELOCATE TO REAR SEAT" icon="➡️" color="#00e5ff"
                       warn={frontWL >= FRONT_CEIL_FT * 0.8}
                       warnText={frontWL >= FRONT_CEIL_FT * 0.8 ? 'FLOODING — ACT NOW' : ''}
                       onClick={() => dispatch({ type:'MOVE_REAR' })}/>
          )}

          {s.playerLoc === 'REAR' && (
            <>
              {['WINDSHIELD','SIDE','REAR'].map(w => (
                <ActionBtn key={w}
                  label={`STRIKE ${w} WINDOW`}
                  icon="🔨"
                  color={w==='REAR'?'#22c55e':'#ef4444'}
                  subText={w==='REAR'?'TEMPERED — BREAKABLE':'LAMINATED — WILL FAIL'}
                  onClick={() => dispatch({ type:'STRIKE', target:w })}
                />
              ))}
              <ActionBtn label="BREATHE & BRACE" icon="🫁" color="#3b82f6"
                         subText="-10 BPM — wait for equalization"
                         onClick={() => dispatch({ type:'BREATHE' })}/>
            </>
          )}

          {canEscape && (
            <ActionBtn
              label={s.rearSmashed ? 'ESCAPE THROUGH REAR WINDOW' : 'OPEN DOOR — EQUALIZED'}
              icon="🏊"
              color="#22c55e"
              urgent
              onClick={() => dispatch({ type:'ESCAPE' })}
            />
          )}

          <div style={{ marginLeft:'auto', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <div style={{ display:'flex', gap:10, fontSize:10, color:'#334155' }}>
              <span>EXT: <b style={{color:'#3b82f6'}}>{s.extDepth.toFixed(1)}ft</b></span>
              <span>F.WL: <b style={{color: frontFull?'#ef4444':'#60a5fa'}}>{frontWL.toFixed(1)}ft</b></span>
              <span>R.WL: <b style={{color:'#60a5fa'}}>{rearWL.toFixed(1)}ft</b></span>
            </div>
            <div style={{ fontSize:9, color:'#2a4055' }}>
              FRONT CEIL: {FRONT_CEIL_FT}ft · REAR CEIL: {REAR_CEIL_FT}ft
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Action button helper ──────────────────────────────────────────────────────
function ActionBtn({ label, icon, color, onClick, warn, warnText, subText, urgent }) {
  const MONO = "'JetBrains Mono','Courier New',Courier,monospace"
  return (
    <button onClick={onClick} style={{
      padding:'9px 14px', borderRadius:4, fontFamily:MONO, fontSize:11, fontWeight:700,
      letterSpacing:1, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:2,
      border:`${urgent?2:1}px solid ${warn?'#ef4444':color}${urgent?'':'66'}`,
      background: urgent ? `${color}18` : warn ? 'rgba(239,68,68,0.08)' : `${color}0d`,
      color: warn ? '#ef4444' : color,
      boxShadow: urgent ? `0 0 16px ${color}44` : 'none',
      animation: urgent ? 'blink-fast 0.8s ease-in-out infinite' : warn ? 'glow-pulse 0.8s ease-in-out infinite' : 'none',
      transition:'all 0.15s',
    }}>
      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
        <span>{icon}</span><span>{label}</span>
      </span>
      {(warnText || subText) && (
        <span style={{ fontSize:8.5, color: warnText?'#ef4444':'#334155', fontWeight:400, letterSpacing:0 }}>
          {warnText || subText}
        </span>
      )}
    </button>
  )
}
