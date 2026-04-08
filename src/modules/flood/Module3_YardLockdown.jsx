/**
 * Module 3 — Yard Lockdown: Buoyancy & Tensile Strength Simulator
 * Aesthetic : Drone-blueprint overhead view — dark theme, cyan/amber/red
 * Mechanics : useState phases · water-depth slider · dynamic buoyancy calc
 * Physics   : Archimedes' principle, displaced volume, net lift vs strap rating
 * Reference : FEMA P-348, NFPA 58, Archimedes buoyancy principle
 */
import { useState, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

/* ─── Constants ──────────────────────────────────────────────────────────── */
const MONO = "'JetBrains Mono','Courier New',Courier,monospace"
const WATER_DENSITY = 62.4 // lb per ft³

/* ─── Yard Objects ───────────────────────────────────────────────────────── */
const YARD_OBJECTS = [
  {
    id: 'propane-full',
    name: 'Propane Tank (FULL)',
    emoji: '🛢️',
    mass: 1800,
    volume: 67,
    height: 4.5,
    color: '#ef4444',
    desc: '500-gallon tank filled with propane. Heavy at 1800 lbs, but still generates buoyancy when submerged. Gas line connection is the failure point.',
    hint: 'Full tank is heavy — buoyancy may not exceed weight until deeply submerged.',
  },
  {
    id: 'propane-empty',
    name: 'Propane Tank (EMPTY)',
    emoji: '🛢️',
    mass: 200,
    volume: 67,
    height: 4.5,
    color: '#dc2626',
    desc: 'EMPTY 500-gallon tank. Same displacement volume as full tank but only 200 lbs. Enormous net upward lift in flood conditions.',
    hint: 'THE TRAP: Empty tank + water = 4000+ lbs of lift. This is a floating bomb that will rupture your gas main.',
  },
  {
    id: 'patio-table',
    name: 'Patio Table',
    emoji: '🪑',
    mass: 80,
    volume: 8,
    height: 2.5,
    color: '#f97316',
    desc: 'Heavy resin patio table. Relatively low volume means modest buoyancy, but still enough to lift 80 lbs off the ground.',
    hint: 'Low mass + low volume = moderate risk. A mid-range strap should hold.',
  },
  {
    id: 'bbq-grill',
    name: 'BBQ Grill',
    emoji: '🔥',
    mass: 120,
    volume: 12,
    height: 3.0,
    color: '#f59e0b',
    desc: 'Stainless steel propane grill with side burner. Moderate mass and volume. Contains residual propane in attached tank.',
    hint: 'Connected propane line makes this a secondary gas hazard if it floats away.',
  },
  {
    id: 'trash-cans',
    name: 'Trash Cans (Empty)',
    emoji: '🗑️',
    mass: 15,
    volume: 32,
    height: 3.5,
    color: '#8b5cf6',
    desc: 'Two large 96-gallon wheeled bins. Extremely light at 15 lbs but massive air volume creates huge buoyancy.',
    hint: 'Huge volume, almost no weight. These WILL float and become battering rams.',
  },
  {
    id: 'kayak',
    name: 'Kayak',
    emoji: '🛶',
    mass: 50,
    volume: 20,
    height: 1.5,
    color: '#3b82f6',
    desc: 'Recreational sit-on-top kayak. Designed to float — low mass and substantial displacement volume.',
    hint: 'Literally designed to float. Without anchoring, it will be carried by any flood current.',
  },
]

/* ─── Strap Options ──────────────────────────────────────────────────────── */
const STRAP_OPTIONS = [
  { id: 'bungee',   name: 'Bungee Cord',           rating: 50,    color: '#94a3b8', icon: '🪢' },
  { id: 'nylon',    name: 'Nylon Strap',            rating: 500,   color: '#f59e0b', icon: '🔗' },
  { id: 'steel',    name: 'Steel Chain',             rating: 5000,  color: '#60a5fa', icon: '⛓️' },
  { id: 'anchor',   name: 'Ground Anchor + Chain',   rating: 10000, color: '#22c55e', icon: '⚓' },
]

/* ─── Physics Calculations ───────────────────────────────────────────────── */
function calcBuoyancy(obj, waterDepth) {
  if (waterDepth <= 0) return { submergedVolume: 0, buoyancyForce: 0, netLiftForce: 0 }
  const submergedFraction = Math.min(1, waterDepth / obj.height)
  const submergedVolume = obj.volume * submergedFraction
  const buoyancyForce = submergedVolume * WATER_DENSITY
  const netLiftForce = buoyancyForce - obj.mass
  return {
    submergedVolume: Math.round(submergedVolume * 100) / 100,
    buoyancyForce: Math.round(buoyancyForce * 10) / 10,
    netLiftForce: Math.round(netLiftForce * 10) / 10,
  }
}

/* ─── Blueprint grid background ──────────────────────────────────────────── */
function BlueprintGrid() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none' }}>
      <defs>
        <pattern id="grid-sm" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00e5ff" strokeWidth="0.5" />
        </pattern>
        <pattern id="grid-lg" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#grid-sm)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00e5ff" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-lg)" />
    </svg>
  )
}

/* ─── Overhead Yard Map (drone-view blueprint) ───────────────────────────── */
function YardMapSVG({ objects, strapSelections, waterDepth, phase, simResults }) {
  const positions = [
    { x: 120, y: 100 }, // propane-full
    { x: 320, y: 100 }, // propane-empty
    { x: 520, y: 100 }, // patio-table
    { x: 120, y: 280 }, // bbq-grill
    { x: 320, y: 280 }, // trash-cans
    { x: 520, y: 280 }, // kayak
  ]

  const waterFillHeight = (waterDepth / 6) * 380
  const showFlood = phase === 'simulate' || phase === 'result'

  return (
    <svg viewBox="0 0 660 400" style={{ width: '100%', maxHeight: '100%' }}>
      {/* Background */}
      <rect width="660" height="400" fill="#0a0f14" rx="6" />

      {/* Blueprint grid */}
      <defs>
        <pattern id="bp-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0ea5e9" strokeWidth="0.3" opacity="0.3" />
        </pattern>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="660" height="400" fill="url(#bp-grid)" />

      {/* Property boundary */}
      <rect x="20" y="20" width="620" height="360" rx="4" fill="none"
        stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="10,5" opacity="0.4" />
      <text x="35" y="15" fill="#0ea5e9" fontSize="9" fontFamily="monospace" opacity="0.6"
        letterSpacing="3">YARD — OVERHEAD DRONE VIEW</text>

      {/* House silhouette */}
      <rect x="230" y="160" width="200" height="80" rx="3" fill="rgba(15,25,35,0.8)"
        stroke="#334155" strokeWidth="1" />
      <text x="330" y="205" fill="#334155" fontSize="10" fontFamily="monospace"
        textAnchor="middle" letterSpacing="2">HOUSE</text>

      {/* Gas main line */}
      <line x1="20" y1="130" x2="120" y2="130" stroke="#ef444466" strokeWidth="2" strokeDasharray="6,3" />
      <text x="22" y="125" fill="#ef4444" fontSize="7" fontFamily="monospace" opacity="0.7">GAS MAIN</text>

      {/* Flood water overlay */}
      {showFlood && waterDepth > 0 && (
        <rect x="20" y={380 - waterFillHeight} width="620" height={waterFillHeight}
          fill="url(#waterGrad)" rx="0"
          style={{ transition: 'height 1.5s ease-in-out, y 1.5s ease-in-out' }} />
      )}

      {/* Water depth indicator */}
      {showFlood && waterDepth > 0 && (
        <>
          <line x1="20" y1={380 - waterFillHeight} x2="640" y2={380 - waterFillHeight}
            stroke="#60a5fa" strokeWidth="1.5" opacity="0.7"
            strokeDasharray="8,4" />
          <text x="645" y={380 - waterFillHeight + 4} fill="#60a5fa" fontSize="9"
            fontFamily="monospace" textAnchor="end">{waterDepth.toFixed(1)}ft</text>
        </>
      )}

      {/* Objects */}
      {objects.map((obj, i) => {
        const pos = positions[i]
        const strap = strapSelections[obj.id]
        const strapDef = STRAP_OPTIONS.find(s => s.id === strap)
        const result = simResults?.[obj.id]
        const ringColor = result
          ? (result.snapped ? '#ef4444' : '#22c55e')
          : (strapDef ? strapDef.color : '#334155')

        return (
          <g key={obj.id}>
            {/* Connection to anchor point */}
            {strapDef && (
              <line x1={pos.x} y1={pos.y + 30} x2={pos.x} y2={pos.y + 50}
                stroke={result?.snapped ? '#ef4444' : strapDef.color}
                strokeWidth={strapDef.id === 'anchor' ? 3 : strapDef.id === 'steel' ? 2.5 : 1.5}
                strokeDasharray={result?.snapped ? '4,4' : 'none'}
                opacity={result?.snapped ? 0.5 : 0.8} />
            )}

            {/* Object circle */}
            <circle cx={pos.x} cy={pos.y} r="32" fill="rgba(0,0,0,0.5)"
              stroke={ringColor} strokeWidth={result ? 3 : 1.5}
              opacity={result?.snapped ? 0.6 : 1} />

            {/* Emoji */}
            <text x={pos.x} y={pos.y + 7} fontSize="26" textAnchor="middle">{obj.emoji}</text>

            {/* Name */}
            <text x={pos.x} y={pos.y + 52} fontSize="8" textAnchor="middle"
              fill="#94a3b8" fontFamily="monospace">{obj.name}</text>

            {/* Mass label */}
            <text x={pos.x} y={pos.y + 63} fontSize="7" textAnchor="middle"
              fill="#647a8e" fontFamily="monospace">{obj.mass} lb</text>

            {/* Strap label */}
            {strapDef && (
              <text x={pos.x} y={pos.y - 38} fontSize="7" textAnchor="middle"
                fill={strapDef.color} fontFamily="monospace" fontWeight="700">
                {strapDef.icon} {strapDef.rating.toLocaleString()} lb
              </text>
            )}

            {/* Result indicator */}
            {result && (
              <>
                <circle cx={pos.x + 28} cy={pos.y - 24} r="10"
                  fill={result.snapped ? '#ef4444' : '#22c55e'} opacity="0.9" />
                <text x={pos.x + 28} y={pos.y - 20} fontSize="12" textAnchor="middle"
                  fill="#fff" fontWeight="700">
                  {result.snapped ? '!' : '\u2713'}
                </text>
              </>
            )}

            {/* Floating away animation indicator */}
            {result?.snapped && (
              <text x={pos.x} y={pos.y - 45} fontSize="9" textAnchor="middle"
                fill="#ef4444" fontFamily="monospace" fontWeight="700"
                style={{ animation: 'blink 0.6s ease-in-out infinite' }}>
                BROKE FREE
              </text>
            )}
          </g>
        )
      })}

      {/* Scale bar */}
      <line x1="540" y1="385" x2="620" y2="385" stroke="#334155" strokeWidth="1" />
      <text x="580" y="395" fill="#334155" fontSize="7" fontFamily="monospace"
        textAnchor="middle">~20 ft</text>
    </svg>
  )
}

/* ─── Water Depth Slider ─────────────────────────────────────────────────── */
function WaterDepthControl({ waterDepth, onChange, disabled }) {
  const pct = (waterDepth / 6) * 100
  const barColor = waterDepth <= 2 ? '#3b82f6' : waterDepth <= 4 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ padding: '16px 20px', background: '#0c1018', border: '1px solid #1a2535',
      borderRadius: 6, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ color: '#0ea5e9', fontSize: 10, fontWeight: 700, letterSpacing: 2, fontFamily: MONO }}>
          FLOOD WATER DEPTH
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: barColor, fontFamily: MONO }}>
          {waterDepth.toFixed(1)} <span style={{ fontSize: 12, color: '#647a8e' }}>ft</span>
        </div>
      </div>

      <input
        type="range" min="0" max="6" step="0.5" value={waterDepth}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ width: '100%', height: 8, cursor: disabled ? 'not-allowed' : 'pointer',
          accentColor: barColor, opacity: disabled ? 0.5 : 1 }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {[0, 1, 2, 3, 4, 5, 6].map(v => (
          <span key={v} style={{ fontSize: 8, color: waterDepth >= v ? barColor : '#334155',
            fontFamily: MONO, fontWeight: waterDepth === v ? 700 : 400 }}>
            {v}ft
          </span>
        ))}
      </div>

      <div style={{ marginTop: 8, height: 6, background: '#0a0a0a', borderRadius: 3,
        border: '1px solid #141414', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3,
          transition: 'width 0.3s, background 0.3s' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Module3_YardLockdown() {
  const { dispatch: gd } = useGame()

  const [phase, setPhase] = useState('intro') // intro → configure → simulate → result
  const [waterDepth, setWaterDepth] = useState(3.0)
  const [strapSelections, setStrapSelections] = useState({})
  const [selectedObjectId, setSelectedObjectId] = useState(null)
  const [simResults, setSimResults] = useState(null)
  const [simScore, setSimScore] = useState(null)

  /* ── Strap selection handler ─────────────────────────────────────────── */
  function selectStrap(objectId, strapId) {
    setStrapSelections(prev => ({ ...prev, [objectId]: strapId }))
  }

  /* ── Run simulation ──────────────────────────────────────────────────── */
  function runSimulation() {
    setPhase('simulate')

    const results = {}
    let correctCount = 0

    for (const obj of YARD_OBJECTS) {
      const calc = calcBuoyancy(obj, waterDepth)
      const strapId = strapSelections[obj.id]
      const strapDef = STRAP_OPTIONS.find(s => s.id === strapId)
      const strapStrength = strapDef ? strapDef.rating : 0

      const needsHolding = calc.netLiftForce > 0
      const snapped = needsHolding && calc.netLiftForce > strapStrength
      const held = !snapped
      const noStrap = !strapId

      if (held && !noStrap) correctCount++
      if (!needsHolding) correctCount++ // object stays on ground anyway, but strap choice doesn't matter

      results[obj.id] = {
        ...calc,
        strapId,
        strapName: strapDef?.name || 'None',
        strapStrength,
        snapped,
        held,
        noStrap,
        needsHolding,
      }
    }

    setSimResults(results)

    // Delay transition to result phase for dramatic effect
    setTimeout(() => {
      setPhase('result')
      const totalObjects = YARD_OBJECTS.length
      // Score: how many objects were properly secured
      const snappedCount = Object.values(results).filter(r => r.snapped).length
      const noStrapFloaters = Object.values(results).filter(r => r.noStrap && r.needsHolding).length
      const failures = snappedCount + noStrapFloaters
      const rawScore = Math.round(((totalObjects - failures) / totalObjects) * 100)
      const passed = failures === 0
      const score = Math.max(0, Math.min(100, rawScore))

      setSimScore({ score, passed, failures, snappedCount, noStrapFloaters })
      gd({ type: 'RECORD_SCORE', payload: { key: 'flood-3', result: { score, passed } } })
    }, 2000)
  }

  /* ── Reset ───────────────────────────────────────────────────────────── */
  function resetModule() {
    setPhase('intro')
    setWaterDepth(3.0)
    setStrapSelections({})
    setSelectedObjectId(null)
    setSimResults(null)
    setSimScore(null)
  }

  /* ── Live calculations for display ─────────────────────────────────── */
  const liveCalcs = useMemo(() => {
    const out = {}
    for (const obj of YARD_OBJECTS) {
      out[obj.id] = calcBuoyancy(obj, waterDepth)
    }
    return out
  }, [waterDepth])

  const allStrapped = YARD_OBJECTS.every(obj => strapSelections[obj.id])
  const selectedObj = YARD_OBJECTS.find(o => o.id === selectedObjectId)

  /* ═══════════════════════════════════════════════════════════════════════
     INTRO PHASE
     ═══════════════════════════════════════════════════════════════════════ */
  if (phase === 'intro') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#070a0f', fontFamily: MONO,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`
          @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(239,68,68,0.2)}50%{box-shadow:0 0 40px rgba(239,68,68,0.5)}}
        `}</style>

        <BlueprintGrid />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, padding: '0 24px',
          animation: 'fadeIn 0.8s ease-out' }}>

          <div style={{ color: '#0ea5e9', fontSize: 10, letterSpacing: 4, marginBottom: 12,
            textAlign: 'center' }}>
            MODULE 3 — FLOOD PHYSICS
          </div>

          <h1 style={{ color: '#f0f4f8', fontSize: 32, fontWeight: 900, textAlign: 'center',
            margin: '0 0 8px', lineHeight: 1.2, letterSpacing: 1 }}>
            Yard Lockdown
          </h1>
          <div style={{ color: '#60a5fa', fontSize: 14, textAlign: 'center', marginBottom: 28,
            letterSpacing: 1 }}>
            Buoyancy & Tensile Strength
          </div>

          {/* Professor's Hook */}
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)',
            borderLeft: '4px solid #ef4444', borderRadius: 6, padding: '18px 20px',
            marginBottom: 24 }}>
            <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: 2,
              marginBottom: 10 }}>
              PROFESSOR'S HOOK
            </div>
            <div style={{ color: '#c8d6e5', fontSize: 13, lineHeight: 1.8 }}>
              A full 500-gallon propane tank weighs <b style={{ color: '#f59e0b' }}>1,800 lbs</b>.
              Sounds safe, right? But an <b style={{ color: '#ef4444' }}>EMPTY</b> one weighs only
              200 lbs while displacing the same 67 ft{'\u00B3'} of water —
              creating <b style={{ color: '#ef4444' }}>4,000+ lbs of upward lift</b>.
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7, marginTop: 10 }}>
              If your tie-down strap can only handle 500 lbs, it <b style={{ color: '#ef4444' }}>
              snaps</b>. The tank becomes a <b style={{ color: '#ef4444' }}>floating bomb</b> that
              ruptures your gas main.
            </div>
          </div>

          {/* Key physics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {[
              ['Buoyancy Force', 'submergedVolume x 62.4 lb/ft\u00B3', '#3b82f6'],
              ['Net Lift', 'buoyancy - objectWeight', '#f59e0b'],
              ['Strap Test', 'if netLift > strapRating = SNAP', '#ef4444'],
              ['Your Job', 'Match straps to forces', '#22c55e'],
            ].map(([title, desc, clr]) => (
              <div key={title} style={{ background: '#0c1018', border: `1px solid ${clr}33`,
                borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ color: clr, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{title}</div>
                <div style={{ color: '#647a8e', fontSize: 10, fontFamily: MONO }}>{desc}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setPhase('configure')}
              style={{ padding: '14px 48px', borderRadius: 6, fontFamily: MONO, fontSize: 14,
                fontWeight: 700, letterSpacing: 3, cursor: 'pointer',
                border: '2px solid #0ea5e9', background: 'rgba(14,165,233,0.1)',
                color: '#0ea5e9', transition: 'all 0.2s',
                animation: 'pulse-glow 2s ease-in-out infinite' }}>
              BEGIN LOCKDOWN
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════════════════════════════════
     CONFIGURE / SIMULATE / RESULT PHASES
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#070a0f', fontFamily: MONO,
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slide-up{from{transform:translateY(15px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 20px rgba(239,68,68,0.2)}50%{box-shadow:0 0 40px rgba(239,68,68,0.5)}}
        @keyframes snap-flash{0%{background:rgba(239,68,68,0.3)}100%{background:transparent}}
        input[type=range]{-webkit-appearance:none;appearance:none;background:transparent}
        input[type=range]::-webkit-slider-runnable-track{height:8px;background:#141a24;border-radius:4px;border:1px solid #1a2535}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;height:20px;width:20px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;margin-top:-7px;cursor:pointer}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ height: 50, background: '#080c12', borderBottom: '1px solid #141a24',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, flexShrink: 0 }}>
        <button onClick={() => gd({ type: 'BACK_TO_MODULES' })}
          style={{ background: 'none', border: 'none', color: '#334155', fontFamily: MONO,
            fontSize: 11, cursor: 'pointer', padding: '4px 8px' }}>
          \u2190 EXIT
        </button>
        <div style={{ color: '#0ea5e9', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>
          M3 \u00B7 YARD LOCKDOWN
        </div>
        <div style={{ fontSize: 9, color: '#334155', letterSpacing: 1 }}>
          BUOYANCY & TENSILE STRENGTH SIMULATOR
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#334155', fontSize: 9, letterSpacing: 1 }}>PHASE:</span>
            <span style={{ color: phase === 'result' ? '#22c55e' : phase === 'simulate' ? '#f59e0b' : '#0ea5e9',
              fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>
              {phase.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#334155', fontSize: 9 }}>STRAPPED:</span>
            <span style={{ color: allStrapped ? '#22c55e' : '#f59e0b', fontSize: 12, fontWeight: 700 }}>
              {Object.keys(strapSelections).length}/{YARD_OBJECTS.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT: Drone Map + Water Depth */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 12, minWidth: 0 }}>
          {/* Map */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>
            <YardMapSVG
              objects={YARD_OBJECTS}
              strapSelections={strapSelections}
              waterDepth={waterDepth}
              phase={phase}
              simResults={simResults}
            />
          </div>

          {/* Water Depth Control */}
          <WaterDepthControl
            waterDepth={waterDepth}
            onChange={setWaterDepth}
            disabled={phase === 'simulate' || phase === 'result'}
          />
        </div>

        {/* RIGHT: Object Panel */}
        <div style={{ width: 380, background: '#080c12', borderLeft: '1px solid #141a24',
          display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ── RESULT SUMMARY (if in result phase) ── */}
          {phase === 'result' && simScore && (
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #141a24',
              background: simScore.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)',
              flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, color: '#334155', letterSpacing: 3, marginBottom: 4 }}>
                    SIMULATION RESULT
                  </div>
                  <div style={{ fontSize: 36, fontWeight: 900,
                    color: simScore.passed ? '#22c55e' : simScore.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {simScore.score}%
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: simScore.passed ? '#22c55e' : '#ef4444', fontSize: 12,
                    fontWeight: 700, letterSpacing: 2 }}>
                    {simScore.passed ? 'ALL SECURED' : `${simScore.failures} BROKE FREE`}
                  </div>
                  <div style={{ color: '#647a8e', fontSize: 10, marginTop: 4 }}>
                    Water depth: {waterDepth.toFixed(1)} ft
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={resetModule}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 4, fontFamily: MONO,
                    fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                    border: '1px solid #ef4444', background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444' }}>
                  \u21BA RETRY
                </button>
                <button onClick={() => gd({ type: 'BACK_TO_MODULES' })}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 4, fontFamily: MONO,
                    fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                    border: '1px solid #334155', background: 'transparent', color: '#647a8e' }}>
                  \u2190 MODULES
                </button>
              </div>
            </div>
          )}

          {/* ── SELECTED OBJECT DETAIL ── */}
          {selectedObj && phase === 'configure' && (
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #141a24', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{selectedObj.emoji}</span>
                <div>
                  <div style={{ color: selectedObj.color, fontSize: 13, fontWeight: 700 }}>
                    {selectedObj.name}
                  </div>
                  <div style={{ color: '#647a8e', fontSize: 9 }}>Click to select strap below</div>
                </div>
              </div>

              {/* Properties */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6,
                marginBottom: 10 }}>
                {[
                  ['MASS', `${selectedObj.mass} lb`, '#94a3b8'],
                  ['VOLUME', `${selectedObj.volume} ft\u00B3`, '#60a5fa'],
                  ['HEIGHT', `${selectedObj.height} ft`, '#f59e0b'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ background: '#0a0f14', border: '1px solid #141a24',
                    borderRadius: 4, padding: '6px 8px', textAlign: 'center' }}>
                    <div style={{ color: '#334155', fontSize: 7, letterSpacing: 1 }}>{k}</div>
                    <div style={{ color: c, fontSize: 12, fontWeight: 700, marginTop: 2 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Live physics */}
              {(() => {
                const calc = liveCalcs[selectedObj.id]
                const strapId = strapSelections[selectedObj.id]
                const strapDef = STRAP_OPTIONS.find(s => s.id === strapId)
                const danger = calc.netLiftForce > 0 && strapDef && calc.netLiftForce > strapDef.rating

                return (
                  <div style={{ background: '#0a0f14', border: `1px solid ${danger ? '#ef444455' : '#141a24'}`,
                    borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ color: '#0ea5e9', fontSize: 8, letterSpacing: 2, marginBottom: 8 }}>
                      LIVE PHYSICS @ {waterDepth.toFixed(1)}ft DEPTH
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#647a8e', fontSize: 10 }}>Submerged Vol:</span>
                        <span style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700 }}>
                          {calc.submergedVolume} ft{'\u00B3'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#647a8e', fontSize: 10 }}>Buoyancy Force:</span>
                        <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>
                          {calc.buoyancyForce.toLocaleString()} lb
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#647a8e', fontSize: 10 }}>Object Weight:</span>
                        <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                          -{selectedObj.mass} lb
                        </span>
                      </div>
                      <div style={{ height: 1, background: '#1a2535', margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: calc.netLiftForce > 0 ? '#ef4444' : '#22c55e',
                          fontSize: 10, fontWeight: 700 }}>Net Lift Force:</span>
                        <span style={{ color: calc.netLiftForce > 0 ? '#ef4444' : '#22c55e',
                          fontSize: 13, fontWeight: 900 }}>
                          {calc.netLiftForce > 0 ? '+' : ''}{calc.netLiftForce.toLocaleString()} lb
                        </span>
                      </div>
                      {strapDef && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                            <span style={{ color: '#647a8e', fontSize: 10 }}>Strap Rating:</span>
                            <span style={{ color: strapDef.color, fontSize: 11, fontWeight: 700 }}>
                              {strapDef.rating.toLocaleString()} lb
                            </span>
                          </div>
                          {calc.netLiftForce > 0 && (
                            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 4,
                              background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)',
                              border: `1px solid ${danger ? '#ef444444' : '#22c55e44'}`,
                              textAlign: 'center' }}>
                              <span style={{ color: danger ? '#ef4444' : '#22c55e', fontSize: 11,
                                fontWeight: 700 }}>
                                {danger
                                  ? `SNAP! ${calc.netLiftForce.toLocaleString()} lb > ${strapDef.rating.toLocaleString()} lb`
                                  : `HOLDS: ${calc.netLiftForce.toLocaleString()} lb < ${strapDef.rating.toLocaleString()} lb`}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Strap selection for this object */}
              <div style={{ color: '#334155', fontSize: 8, letterSpacing: 2, marginBottom: 6 }}>
                SELECT TIE-DOWN METHOD
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {STRAP_OPTIONS.map(strap => {
                  const isSelected = strapSelections[selectedObj.id] === strap.id
                  return (
                    <button key={strap.id} onClick={() => selectStrap(selectedObj.id, strap.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
                        fontFamily: MONO, fontSize: 11, textAlign: 'left',
                        background: isSelected ? `${strap.color}15` : '#0a0f14',
                        border: `1px solid ${isSelected ? strap.color : '#1a2535'}`,
                        color: isSelected ? strap.color : '#647a8e',
                        transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 16 }}>{strap.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700 }}>{strap.name}</div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: 12, color: isSelected ? strap.color : '#334155' }}>
                        {strap.rating.toLocaleString()} lb
                      </div>
                    </button>
                  )
                })}
              </div>

              <div style={{ marginTop: 8, color: '#3a5068', fontSize: 9, lineHeight: 1.6,
                fontStyle: 'italic' }}>
                {selectedObj.hint}
              </div>
            </div>
          )}

          {/* ── OBJECT LIST ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            <div style={{ fontSize: 8, color: '#334155', letterSpacing: 3, marginBottom: 8 }}>
              {phase === 'result' ? 'SIMULATION RESULTS' : 'YARD OBJECTS — CLICK TO INSPECT'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {YARD_OBJECTS.map((obj, idx) => {
                const calc = liveCalcs[obj.id]
                const strapId = strapSelections[obj.id]
                const strapDef = STRAP_OPTIONS.find(s => s.id === strapId)
                const isSel = selectedObjectId === obj.id
                const result = simResults?.[obj.id]

                /* ── Result-phase card ── */
                if (phase === 'result' && result) {
                  const borderColor = result.snapped || (result.noStrap && result.needsHolding)
                    ? '#ef4444' : '#22c55e'
                  return (
                    <div key={obj.id}
                      style={{ background: '#0a0f14',
                        border: `1px solid ${borderColor}44`,
                        borderLeft: `3px solid ${borderColor}`,
                        borderRadius: 5, padding: '10px 12px',
                        animation: `slide-up 0.3s ease-out ${idx * 0.08}s both` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{obj.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: obj.color, fontSize: 11, fontWeight: 700 }}>{obj.name}</div>
                          <div style={{ color: '#647a8e', fontSize: 9 }}>
                            {result.strapName} ({result.strapStrength.toLocaleString()} lb rating)
                          </div>
                        </div>
                        <div style={{ padding: '3px 10px', borderRadius: 12,
                          background: `${borderColor}18`, border: `1px solid ${borderColor}55`,
                          color: borderColor, fontSize: 9, fontWeight: 700 }}>
                          {result.snapped ? 'SNAPPED' : result.noStrap && result.needsHolding ? 'NO STRAP' : result.needsHolding ? 'HELD' : 'GROUNDED'}
                        </div>
                      </div>

                      {/* Math breakdown */}
                      <div style={{ background: '#070a0f', borderRadius: 4, padding: '8px 10px',
                        fontSize: 9, fontFamily: MONO, lineHeight: 1.9 }}>
                        <div style={{ color: '#647a8e' }}>
                          submergedVol = min({obj.volume}, {obj.volume} x ({waterDepth.toFixed(1)} / {obj.height}))
                          = <span style={{ color: '#60a5fa', fontWeight: 700 }}>{result.submergedVolume} ft{'\u00B3'}</span>
                        </div>
                        <div style={{ color: '#647a8e' }}>
                          buoyancy = {result.submergedVolume} x 62.4
                          = <span style={{ color: '#f59e0b', fontWeight: 700 }}>{result.buoyancyForce.toLocaleString()} lb</span>
                        </div>
                        <div style={{ color: '#647a8e' }}>
                          netLift = {result.buoyancyForce.toLocaleString()} - {obj.mass}
                          = <span style={{ color: result.netLiftForce > 0 ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                            {result.netLiftForce > 0 ? '+' : ''}{result.netLiftForce.toLocaleString()} lb
                          </span>
                        </div>
                        {result.needsHolding && (
                          <div style={{ color: result.snapped ? '#ef4444' : '#22c55e', marginTop: 4 }}>
                            {result.netLiftForce.toLocaleString()} lb lift
                            {result.snapped
                              ? ` > ${result.strapStrength.toLocaleString()} lb strap = SNAP!`
                              : ` \u2264 ${result.strapStrength.toLocaleString()} lb strap = HELD`}
                          </div>
                        )}
                        {!result.needsHolding && (
                          <div style={{ color: '#22c55e', marginTop: 4 }}>
                            Negative net lift — object stays on ground.
                          </div>
                        )}
                      </div>

                      {/* Danger narrative for empty propane */}
                      {result.snapped && obj.id === 'propane-empty' && (
                        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 4,
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                          <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                            FLOATING BOMB
                          </div>
                          <div style={{ color: '#c8d6e5', fontSize: 9, lineHeight: 1.7 }}>
                            The empty propane tank broke free with{' '}
                            {result.netLiftForce.toLocaleString()} lbs of upward force.
                            It floated into the gas main line, ruptured the connection, and created
                            an uncontrolled gas leak. One spark and the entire property explodes.
                            Steel chain (5,000 lb) or ground anchor (10,000 lb) was required.
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                /* ── Configure-phase card ── */
                return (
                  <div key={obj.id}
                    onClick={() => setSelectedObjectId(isSel ? null : obj.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 5, cursor: 'pointer',
                      background: isSel ? `${obj.color}08` : '#0a0f14',
                      border: `1px solid ${isSel ? obj.color + '55' : '#141a24'}`,
                      transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{obj.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700,
                        color: isSel ? obj.color : '#94a3b8',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {obj.name}
                      </div>
                      <div style={{ fontSize: 8, color: '#334155', marginTop: 2 }}>
                        {obj.mass} lb | {obj.volume} ft{'\u00B3'}
                        {calc.netLiftForce > 0
                          ? ` | Lift: +${calc.netLiftForce.toLocaleString()} lb`
                          : ` | Sinks`}
                      </div>
                    </div>
                    {strapDef ? (
                      <div style={{ padding: '2px 8px', borderRadius: 10,
                        background: `${strapDef.color}18`, border: `1px solid ${strapDef.color}44`,
                        color: strapDef.color, fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
                        {strapDef.icon} {strapDef.rating.toLocaleString()} lb
                      </div>
                    ) : (
                      <div style={{ padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#ef4444', fontSize: 8, fontWeight: 700, flexShrink: 0,
                        animation: 'blink 1.5s ease-in-out infinite' }}>
                        NO STRAP
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Professor's lesson (result phase) */}
            {phase === 'result' && simResults && (
              <div style={{ marginTop: 16, background: 'rgba(14,165,233,0.04)',
                border: '1px solid rgba(14,165,233,0.2)', borderRadius: 6, padding: '14px 16px' }}>
                <div style={{ color: '#0ea5e9', fontSize: 9, letterSpacing: 2, marginBottom: 8,
                  fontWeight: 700 }}>
                  KEY LESSON
                </div>
                <div style={{ color: '#94a3b8', fontSize: 10, lineHeight: 1.8 }}>
                  <b style={{ color: '#f59e0b' }}>Archimedes' Principle:</b> Any object submerged
                  in fluid experiences an upward buoyant force equal to the weight of the fluid
                  displaced. An empty propane tank displaces 67 ft{'\u00B3'} of water =
                  <b style={{ color: '#ef4444' }}> {Math.round(67 * 62.4).toLocaleString()} lbs</b> of
                  buoyancy. At only 200 lbs empty weight, the net upward force exceeds
                  <b style={{ color: '#ef4444' }}> 4,000 lbs</b>.
                </div>
                <div style={{ color: '#647a8e', fontSize: 10, lineHeight: 1.7, marginTop: 8 }}>
                  A 500 lb nylon strap is woefully insufficient. You need minimum steel chain
                  (5,000 lb) or ground anchor + chain (10,000 lb) to secure objects with high
                  volume-to-mass ratios in flood conditions.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div style={{ background: '#080c12', borderTop: '2px solid #141a24', padding: '10px 16px',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Quick physics readout */}
          {phase === 'configure' && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {YARD_OBJECTS.map(obj => {
                const calc = liveCalcs[obj.id]
                const strapId = strapSelections[obj.id]
                const strapDef = STRAP_OPTIONS.find(s => s.id === strapId)
                const danger = calc.netLiftForce > 0 && (!strapDef || calc.netLiftForce > strapDef.rating)
                return (
                  <div key={obj.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                      borderRadius: 4, background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.05)',
                      border: `1px solid ${danger ? '#ef444433' : '#22c55e22'}` }}>
                    <span style={{ fontSize: 12 }}>{obj.emoji}</span>
                    <span style={{ fontSize: 9, color: danger ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                      {calc.netLiftForce > 0
                        ? `+${calc.netLiftForce.toLocaleString()}`
                        : calc.netLiftForce.toLocaleString()} lb
                    </span>
                    {strapDef && (
                      <span style={{ fontSize: 8, color: danger ? '#ef4444' : strapDef.color }}>
                        {danger ? '\u2716' : '\u2714'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {phase === 'simulate' && (
            <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700, letterSpacing: 2,
              animation: 'blink 0.8s ease-in-out infinite' }}>
              SIMULATING FLOOD @ {waterDepth.toFixed(1)} ft ...
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {phase === 'configure' && (
            <button onClick={runSimulation}
              disabled={!allStrapped}
              style={{ padding: '10px 28px', borderRadius: 5, fontFamily: MONO, fontSize: 13,
                fontWeight: 700, letterSpacing: 2, cursor: allStrapped ? 'pointer' : 'not-allowed',
                border: `2px solid ${allStrapped ? '#ef4444' : '#334155'}`,
                background: allStrapped ? 'rgba(239,68,68,0.08)' : 'transparent',
                color: allStrapped ? '#ef4444' : '#334155',
                opacity: allStrapped ? 1 : 0.5,
                animation: allStrapped ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                transition: 'all 0.3s' }}>
              \u25B6 TEST FLOOD
            </button>
          )}

          {phase === 'result' && (
            <>
              <button onClick={resetModule}
                style={{ padding: '10px 20px', borderRadius: 5, fontFamily: MONO, fontSize: 12,
                  fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                  border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.08)',
                  color: '#f59e0b' }}>
                \u21BA TRY AGAIN
              </button>
              <button onClick={() => gd({ type: 'BACK_TO_MODULES' })}
                style={{ padding: '10px 20px', borderRadius: 5, fontFamily: MONO, fontSize: 12,
                  fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                  border: '1px solid #334155', background: 'transparent', color: '#647a8e' }}>
                \u2190 MODULES
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
