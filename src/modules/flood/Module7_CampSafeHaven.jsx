/**
 * Module 7 — Advanced Shelter: 4-Phase Survival Build
 * Phase 1: Site Selection & "The Widowmaker"
 * Phase 2: Packing the Bag
 * Phase 3: Aerodynamics (Tent Orientation)
 * Phase 4: The Build & The Storm
 */
import { useReducer, useCallback, useRef, useEffect } from 'react'
import { useGame } from '../../context/GameContext'

// ─── Constants ───────────────────────────────────────────────────────────────
const BG = '#1e1e2e'
const CARD = '#2a2a3e'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#f1f2f6'
const DIM = '#a4b0be'
const GREEN = '#2ed573'
const RED = '#ff4757'
const YELLOW = '#ffa502'
const BLUE = '#3742fa'

// ─── Locations ───────────────────────────────────────────────────────────────
const LOCATIONS = [
  {
    id: 'VALLEY',
    name: 'Sheltered Valley',
    emoji: '🏔️',
    desc: 'A cozy low point between two hills. Wind is blocked by terrain. Feels safe and protected.',
    trap: true,
    feedback: '❌ Cold air sinks! Valleys are "cold pools" — temperatures can be 10-20°F colder than slopes. Flooding funnels here. Fog and frost settle first in valleys.',
    color: '#4834d4',
  },
  {
    id: 'RIDGE',
    name: 'Exposed Ridgetop',
    emoji: '⛰️',
    desc: 'High ground with a panoramic view. Great line of sight. Clear and open terrain.',
    trap: true,
    feedback: '❌ Ridgetops have maximum wind exposure! Sustained 40mph gusts will shred your shelter. Lightning strikes ridges first. You\'ll lose body heat to convection 3× faster.',
    color: '#eb4d4b',
  },
  {
    id: 'MID_SLOPE',
    name: 'Mid-Slope Terrace',
    emoji: '🌿',
    desc: 'A flat terrace partway up the hill. Moderate cover, good drainage above the flood line.',
    trap: false,
    feedback: '✅ Mid-slope is the gold standard! Above cold-air pooling, below lightning exposure, natural drainage, moderate wind. But look UP — always check for overhead hazards...',
    color: GREEN,
  },
]

// ─── Packing Items ───────────────────────────────────────────────────────────
const PACK_ITEMS = [
  {
    id: 'foam_pad', name: 'Foam Ground Pad', icon: '🟦', correct: true,
    desc: 'Closed-cell foam. R-value 2.6. Blocks conductive heat loss from the ground.',
    feedback: '✅ Ground conduction steals heat 25× faster than cold air. A foam pad is non-negotiable.',
  },
  {
    id: 'tarp', name: 'Waterproof Tarp', icon: '🟫', correct: true,
    desc: 'Ripstop nylon. 8×10 ft. Waterproof barrier and ground cloth.',
    feedback: '✅ Serves as vapor barrier below and rain shield above. Versatile and essential.',
  },
  {
    id: 'synth_bag', name: 'Synthetic Sleeping Bag', icon: '🟢', correct: true,
    desc: 'Synthetic fill. Retains 80% warmth when wet. Rated to 20°F.',
    feedback: '✅ Synthetic insulation works when wet — critical in flood conditions where moisture is unavoidable.',
  },
  {
    id: 'cotton_bag', name: 'Cotton Sleeping Bag', icon: '🟤', correct: false,
    desc: 'Soft cotton fill. Comfortable. Affordable.',
    feedback: '❌ LETHAL CHOICE! "Cotton kills" is a survival axiom. Wet cotton loses ALL insulating value and conducts body heat 25× faster. Cotton sleeping bags have killed more people than hypothermia alone.',
  },
  {
    id: 'air_mattress', name: 'Inflatable Air Mattress', icon: '🎈', correct: false,
    desc: 'Comfortable inflatable mattress. Queen size.',
    feedback: '❌ Air mattresses have ZERO insulation (R-value ≈ 0). The air inside conducts cold. Also, they puncture on debris. A foam pad is superior in every survival metric.',
  },
  {
    id: 'cotton_blanket', name: 'Heavy Cotton Blanket', icon: '🧣', correct: false,
    desc: 'Thick woven cotton. 5 lbs. Feels warm and cozy.',
    feedback: '❌ Cotton absorbs 27× its weight in water. In a flood environment, this blanket becomes a cold, heavy heat-sink that accelerates hypothermia instead of preventing it.',
  },
]

// ─── Wind directions for tent orientation ────────────────────────────────────
const ROTATIONS = [0, 90, 180, 270]
const ROTATION_LABELS = {
  0: { label: 'Door faces North (into wind)', safe: false, desc: 'Broad opening catches wind like a sail' },
  90: { label: 'Door faces East (crosswind)', safe: false, desc: 'Side profile catches partial wind' },
  180: { label: 'Spine into wind (door South)', safe: true, desc: 'Aerodynamic back cuts into wind' },
  270: { label: 'Door faces West (crosswind)', safe: false, desc: 'Side profile catches partial wind' },
}

// ─── Build Order ─────────────────────────────────────────────────────────────
const BUILD_ITEMS = [
  { id: 'tarp_ground', name: 'Lay Tarp (Ground)', icon: '🟫', order: 1, desc: 'Moisture barrier under everything' },
  { id: 'pad_layer', name: 'Place Foam Pad', icon: '🟦', order: 2, desc: 'Insulation from ground conduction' },
  { id: 'bag_layer', name: 'Lay Sleeping Bag', icon: '🟢', order: 3, desc: 'Your primary insulation cocoon' },
]

// ─── Reducer ─────────────────────────────────────────────────────────────────
const init = {
  phase: 'intro',
  // Phase 1
  selectedLocation: null,
  locationConfirmed: false,
  hazardCleared: false,
  showWidowmaker: false,
  locationFeedback: null,
  // Phase 2
  packedItems: [],
  packFeedback: null,
  packLocked: false,
  // Phase 3
  tentRotation: 0,
  tentConfirmed: false,
  tentFeedback: null,
  tentBlownAway: false,
  // Phase 4
  buildOrder: [],
  buildFeedback: null,
  buildLocked: false,
  guyLinesSet: false,
  trenchDug: false,
  stormStarted: false,
  stormResult: null,
  // Scoring
  score: 0,
  errors: 0,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_PHASE': return { ...state, phase: action.payload }

    // Phase 1
    case 'SELECT_LOCATION': return { ...state, selectedLocation: action.payload, locationFeedback: null, hazardCleared: false, showWidowmaker: false, locationConfirmed: false }
    case 'CONFIRM_LOCATION': {
      const loc = LOCATIONS.find(l => l.id === state.selectedLocation)
      if (!loc) return state
      if (loc.trap) {
        return { ...state, locationFeedback: loc.feedback, errors: state.errors + 1 }
      }
      // Mid-slope — check widowmaker
      if (!state.hazardCleared) {
        return { ...state, showWidowmaker: true, locationFeedback: '💀 FATAL ERROR: You pitched under a "Widowmaker" — a dead, hanging branch. A storm gust snapped it onto your shelter. ALWAYS LOOK UP before confirming a campsite.' }
      }
      return { ...state, locationConfirmed: true, locationFeedback: '✅ Site secured! Hazard cleared, mid-slope selected. Moving to packing phase...', score: state.score + 25 }
    }
    case 'CLEAR_HAZARD': return { ...state, hazardCleared: true, showWidowmaker: false, locationFeedback: '✅ Dead branch cleared! Now it\'s safe to confirm this site.' }

    // Phase 2
    case 'TOGGLE_PACK': {
      const id = action.payload
      const has = state.packedItems.includes(id)
      const item = PACK_ITEMS.find(i => i.id === id)
      if (state.packLocked) return state
      if (has) return { ...state, packedItems: state.packedItems.filter(i => i !== id), packFeedback: null }
      return { ...state, packedItems: [...state.packedItems, id], packFeedback: item.feedback }
    }
    case 'LOCK_PACK': {
      const correct = PACK_ITEMS.filter(i => i.correct).map(i => i.id)
      const hasAll = correct.every(c => state.packedItems.includes(c))
      const hasBad = state.packedItems.some(id => !PACK_ITEMS.find(i => i.id === id)?.correct)
      let fb = ''
      let pts = 0
      if (hasAll && !hasBad) { fb = '✅ Perfect gear selection! Synthetic insulation + foam pad + tarp = survival.'; pts = 25 }
      else if (hasAll && hasBad) { fb = '⚠️ You packed the essentials, but also carried dangerous items. Extra weight and risk.'; pts = 15 }
      else { fb = '❌ Missing critical gear! You need: Foam Pad (insulation), Tarp (moisture barrier), and Synthetic Bag (wet-rated warmth).'; pts = 5 }
      return { ...state, packLocked: true, packFeedback: fb, score: state.score + pts }
    }

    // Phase 3
    case 'SET_ROTATION': return { ...state, tentRotation: action.payload, tentFeedback: null, tentBlownAway: false, tentConfirmed: false }
    case 'CONFIRM_TENT': {
      const info = ROTATION_LABELS[state.tentRotation]
      if (!info.safe) {
        return { ...state, tentBlownAway: true, tentFeedback: `❌ ${info.desc}. The wind caught the ${state.tentRotation === 0 ? 'open door' : 'broad side'} and snapped the poles! Your tent is destroyed.`, errors: state.errors + 1 }
      }
      return { ...state, tentConfirmed: true, tentFeedback: '✅ Correct! The lowest aerodynamic profile (spine/back) faces into the wind. Drag is minimized, poles hold.', score: state.score + 25 }
    }

    // Phase 4
    case 'ADD_BUILD': {
      if (state.buildLocked) return state
      const id = action.payload
      if (state.buildOrder.includes(id)) return state
      return { ...state, buildOrder: [...state.buildOrder, id], buildFeedback: null }
    }
    case 'REMOVE_BUILD': {
      if (state.buildLocked) return state
      return { ...state, buildOrder: state.buildOrder.filter(i => i !== action.payload), buildFeedback: null }
    }
    case 'LOCK_BUILD': {
      const correct = BUILD_ITEMS.map(b => b.id)
      const isCorrect = state.buildOrder.length === correct.length && state.buildOrder.every((id, i) => id === correct[i])
      if (!isCorrect) {
        return { ...state, buildFeedback: '❌ Wrong order! Correct: Tarp (moisture barrier) → Foam Pad (insulation) → Sleeping Bag (on top). Conduction kills from below — block it first!', buildOrder: [], errors: state.errors + 1 }
      }
      return { ...state, buildLocked: true, buildFeedback: '✅ Layering correct! Tarp blocks moisture, pad blocks conduction, bag insulates on top.' }
    }
    case 'SET_GUYLINES': return { ...state, guyLinesSet: true }
    case 'DIG_TRENCH': return { ...state, trenchDug: true }
    case 'START_STORM': {
      if (!state.guyLinesSet && !state.trenchDug) {
        return { ...state, stormResult: 'collapsed_flooded', stormStarted: true, stormFeedback: '💀 DOUBLE FAILURE: Without guy-line tension, the roof sagged and water pooled until it collapsed. Without a trench, groundwater flooded your sleeping area. You are soaked and hypothermic.' }
      }
      if (!state.guyLinesSet) {
        return { ...state, stormResult: 'collapsed', stormStarted: true, stormFeedback: '❌ Without taut-line guy-lines, the roof sagged under rain. Water pooled on the fabric until the structure collapsed. Tension is critical!' }
      }
      if (!state.trenchDug) {
        return { ...state, stormResult: 'flooded', stormStarted: true, stormFeedback: '❌ Without a perimeter trench, ground-level runoff flooded under your tent. Your sleeping bag is soaked — hypothermia risk is extreme.' }
      }
      return { ...state, stormResult: 'survived', stormStarted: true, score: state.score + 25 }
    }

    default: return state
  }
}

// ─── Shake Animation (injected once) ─────────────────────────────────────────
const SHAKE_CSS = `
@keyframes m7shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(4px)} }
@keyframes m7wind { 0%{transform:translateX(0)} 50%{transform:translateX(30px)} 100%{transform:translateX(60px); opacity:0} }
@keyframes m7rain { 0%{transform:translateY(-20px); opacity:0.7} 100%{transform:translateY(100vh); opacity:0.3} }
@keyframes m7glow { 0%,100%{box-shadow:0 0 8px rgba(46,213,115,0.3)} 50%{box-shadow:0 0 20px rgba(46,213,115,0.7)} }
@keyframes m7tent_fly { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(25deg) scale(1.1) translateY(-30px)} 100%{transform:rotate(60deg) scale(0.3) translateX(200px) translateY(-100px); opacity:0} }
`

// ─── Component ───────────────────────────────────────────────────────────────
export default function Module7_AdvancedShelter() {
  const { dispatch: gDispatch } = useGame()
  const [state, dispatch] = useReducer(reducer, init)
  const styleRef = useRef(false)

  // Inject keyframes once
  useEffect(() => {
    if (styleRef.current) return
    styleRef.current = true
    const el = document.createElement('style')
    el.textContent = SHAKE_CSS
    document.head.appendChild(el)
    return () => { try { document.head.removeChild(el) } catch {} }
  }, [])

  const goBack = useCallback(() => gDispatch({ type: 'BACK_TO_MODULES' }), [gDispatch])

  const finishGame = useCallback(() => {
    let finalScore = state.score
    if (state.stormResult !== 'survived') finalScore = Math.max(0, finalScore - 15)
    finalScore = Math.min(100, Math.max(0, finalScore))
    const passed = finalScore >= 50 && state.stormResult === 'survived'
    gDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-7', result: { score: finalScore, passed } } })
    dispatch({ type: 'SET_PHASE', payload: 'result' })
  }, [state.score, state.stormResult, gDispatch])

  // ─── INTRO ──────────────────────────────────────────────────────────────────
  if (state.phase === 'intro') {
    return (
      <div style={S.screen}>
        <div style={S.introCard}>
          <div style={{ fontSize: 56 }}>⛺</div>
          <h1 style={{ color: TEXT, fontSize: 26, margin: '8px 0' }}>Module 7: Advanced Shelter</h1>
          <p style={{ color: DIM, fontSize: 15, lineHeight: 1.7 }}>
            A flash flood has displaced you. Night is falling, a storm is coming, and you must build a shelter
            that will keep you alive until morning. This module tests <strong style={{ color: YELLOW }}>4 critical survival skills</strong>:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', margin: '12px 0' }}>
            {[
              ['🗺️', 'Phase 1', 'Site Selection & Hazards', 'Where you build matters more than what you build'],
              ['🎒', 'Phase 2', 'Packing the Bag', 'One wrong material = death by hypothermia'],
              ['🌬️', 'Phase 3', 'Aerodynamics', 'Wind destroys shelters pitched wrong'],
              ['🏗️', 'Phase 4', 'The Build & Storm', 'Layering + tension + drainage = survival'],
            ].map(([emoji, title, sub, tip], i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 24 }}>{emoji}</div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{title}: {sub}</div>
                <div style={{ color: DIM, fontSize: 11, marginTop: 4 }}>{tip}</div>
              </div>
            ))}
          </div>
          <button style={S.primaryBtn} onClick={() => dispatch({ type: 'SET_PHASE', payload: 'phase1' })}>
            Begin Survival Build
          </button>
          <button style={S.ghost} onClick={goBack}>← Back to Modules</button>
        </div>
      </div>
    )
  }

  // ─── PHASE 1: Site Selection & Widowmaker ───────────────────────────────────
  if (state.phase === 'phase1') {
    return (
      <div style={S.screen}>
        <div style={{ maxWidth: 700, width: '100%', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: TEXT, fontSize: 20, margin: 0 }}>Phase 1: Site Selection</h2>
            <button style={S.ghost} onClick={goBack}>← Quit</button>
          </div>
          <p style={{ color: DIM, fontSize: 14, margin: '0 0 16px', lineHeight: 1.6 }}>
            Choose your campsite. Consider: cold air pooling, wind exposure, drainage, and <strong style={{ color: YELLOW }}>overhead hazards</strong>.
          </p>

          {/* Terrain visualization */}
          <div style={{ position: 'relative', height: 200, background: 'linear-gradient(180deg, #1a1a3e 0%, #2d3436 100%)', borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: `1px solid ${BORDER}` }}>
            {/* Mountains / terrain */}
            <svg width="100%" height="200" viewBox="0 0 700 200" style={{ position: 'absolute', top: 0, left: 0 }}>
              <polygon points="0,200 50,100 120,140 200,60 300,130 350,40 450,120 530,70 600,110 700,200" fill="#2d3436" stroke="#636e72" strokeWidth="1" />
              <polygon points="0,200 80,160 170,130 240,170 350,100 430,150 520,120 650,155 700,200" fill="#3d3d5c" stroke="none" />
              {/* Valley label */}
              <text x="170" y="185" fill={DIM} fontSize="11" textAnchor="middle">Valley</text>
              {/* Ridge label */}
              <text x="350" y="50" fill={DIM} fontSize="11" textAnchor="middle">Ridge</text>
              {/* Mid-slope label */}
              <text x="520" y="130" fill={DIM} fontSize="11" textAnchor="middle">Mid-slope</text>
              {/* Cold air arrows in valley */}
              <text x="170" y="170" fill="#74b9ff" fontSize="10" textAnchor="middle">↓ cold air sinks ↓</text>
              {/* Wind arrows on ridge */}
              <text x="350" y="65" fill="#ff7675" fontSize="10" textAnchor="middle">← 40mph wind →</text>
            </svg>
          </div>

          {/* Location cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => dispatch({ type: 'SELECT_LOCATION', payload: loc.id })}
                style={{
                  ...S.card,
                  cursor: 'pointer',
                  border: state.selectedLocation === loc.id ? `2px solid ${loc.color}` : `1px solid ${BORDER}`,
                  boxShadow: state.selectedLocation === loc.id ? `0 0 12px ${loc.color}44` : 'none',
                }}
              >
                <div style={{ fontSize: 32 }}>{loc.emoji}</div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, marginTop: 6 }}>{loc.name}</div>
                <div style={{ color: DIM, fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>{loc.desc}</div>
              </button>
            ))}
          </div>

          {/* Widowmaker hazard */}
          {state.showWidowmaker && !state.hazardCleared && (
            <div style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: 14, marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>🌲💀</div>
              <p style={{ color: '#ff6b81', fontSize: 13, margin: '8px 0', fontWeight: 700 }}>
                OVERHEAD HAZARD DETECTED: Dead hanging branch directly above your campsite!
              </p>
              <button
                onClick={() => dispatch({ type: 'CLEAR_HAZARD' })}
                style={{ ...S.actionBtn, background: YELLOW, color: '#000' }}
              >
                🪓 Clear Dead Branch
              </button>
            </div>
          )}

          {/* Confirm button */}
          {state.selectedLocation && !state.locationConfirmed && (
            <button
              onClick={() => dispatch({ type: 'CONFIRM_LOCATION' })}
              style={{ ...S.primaryBtn, width: '100%' }}
            >
              Confirm Site: {LOCATIONS.find(l => l.id === state.selectedLocation)?.name}
            </button>
          )}

          {/* Feedback */}
          {state.locationFeedback && (
            <div style={{
              marginTop: 12, padding: 14, borderRadius: 10,
              background: state.locationConfirmed ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)',
              border: `1px solid ${state.locationConfirmed ? 'rgba(46,213,115,0.3)' : 'rgba(255,71,87,0.3)'}`,
              animation: state.locationConfirmed ? 'none' : 'm7shake 0.4s ease',
            }}>
              <p style={{ color: state.locationConfirmed ? GREEN : '#ff6b81', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {state.locationFeedback}
              </p>
            </div>
          )}

          {/* Advance */}
          {state.locationConfirmed && (
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'phase2' })}
              style={{ ...S.primaryBtn, width: '100%', marginTop: 12, background: GREEN }}
            >
              → Phase 2: Pack Your Bag
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── PHASE 2: Packing the Bag ──────────────────────────────────────────────
  if (state.phase === 'phase2') {
    return (
      <div style={S.screen}>
        <div style={{ maxWidth: 660, width: '100%', padding: 24 }}>
          <h2 style={{ color: TEXT, fontSize: 20, margin: '0 0 8px' }}>Phase 2: Pack Your Shelter Gear</h2>
          <p style={{ color: DIM, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
            Select the <strong style={{ color: GREEN }}>3 correct items</strong> for flood-condition overnight survival. Choose wrong and you die of hypothermia.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 16 }}>
            {PACK_ITEMS.map(item => {
              const selected = state.packedItems.includes(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => dispatch({ type: 'TOGGLE_PACK', payload: item.id })}
                  disabled={state.packLocked}
                  style={{
                    ...S.card, cursor: state.packLocked ? 'default' : 'pointer', textAlign: 'left',
                    border: selected ? `2px solid ${item.correct ? GREEN : RED}` : `1px solid ${BORDER}`,
                    opacity: state.packLocked ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 28 }}>{item.icon}</span>
                    <div>
                      <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                      <div style={{ color: DIM, fontSize: 11, marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                  {selected && <div style={{ color: item.correct ? GREEN : RED, fontSize: 11, marginTop: 6, fontWeight: 700 }}>
                    {state.packLocked ? item.feedback : '✓ Selected'}
                  </div>}
                </button>
              )
            })}
          </div>

          {!state.packLocked && (
            <button
              onClick={() => dispatch({ type: 'LOCK_PACK' })}
              disabled={state.packedItems.length === 0}
              style={{ ...S.primaryBtn, width: '100%', opacity: state.packedItems.length === 0 ? 0.4 : 1 }}
            >
              Lock In Gear ({state.packedItems.length} selected)
            </button>
          )}

          {state.packFeedback && state.packLocked && (
            <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: 'rgba(46,213,115,0.08)', border: `1px solid rgba(46,213,115,0.2)` }}>
              <p style={{ color: GREEN, fontSize: 13, margin: 0 }}>{state.packFeedback}</p>
            </div>
          )}

          {state.packLocked && (
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'phase3' })}
              style={{ ...S.primaryBtn, width: '100%', marginTop: 12, background: GREEN }}
            >
              → Phase 3: Orient Your Tent
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── PHASE 3: Aerodynamics (Tent Orientation) ──────────────────────────────
  if (state.phase === 'phase3') {
    const tentW = 120
    const tentH = 80
    return (
      <div style={S.screen}>
        <div style={{ maxWidth: 660, width: '100%', padding: 24 }}>
          <h2 style={{ color: TEXT, fontSize: 20, margin: '0 0 8px' }}>Phase 3: Tent Orientation</h2>
          <p style={{ color: DIM, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
            Heavy wind blows from the <strong style={{ color: '#74b9ff' }}>NORTH ↓</strong>. Rotate your tent so the most aerodynamic profile faces the wind.
          </p>

          {/* Wind + tent visualization */}
          <div style={{ position: 'relative', height: 300, background: '#1a1a2e', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
            {/* Wind arrows */}
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} style={{
                position: 'absolute', top: 10, left: 40 + i * 75,
                color: '#74b9ff', fontSize: 18, opacity: 0.6,
                animation: 'm7wind 1.5s linear infinite',
                animationDelay: `${i * 0.2}s`,
              }}>↓</div>
            ))}
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', color: '#74b9ff', fontSize: 12, fontWeight: 700 }}>
              WIND FROM NORTH — 35 mph
            </div>

            {/* Tent */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: `translate(-50%, -50%) rotate(${state.tentRotation}deg)`,
              width: tentW, height: tentH,
              transition: state.tentBlownAway ? 'none' : 'transform 0.4s ease',
              animation: state.tentBlownAway ? 'm7tent_fly 1s forwards' : 'none',
            }}>
              {/* Tent shape */}
              <svg width={tentW} height={tentH} viewBox="0 0 120 80">
                <polygon points="60,5 115,75 5,75" fill="#ff6348" stroke="#fff" strokeWidth="2" opacity="0.85" />
                {/* Door indicator at bottom */}
                <rect x="45" y="60" width="30" height="15" fill="#2ed573" opacity="0.7" rx="3" />
                <text x="60" y="72" fill="#fff" fontSize="8" textAnchor="middle" fontWeight="bold">DOOR</text>
                {/* Back spine at top */}
                <text x="60" y="18" fill="#fff" fontSize="7" textAnchor="middle">SPINE</text>
              </svg>
            </div>

            {/* Compass */}
            <div style={{ position: 'absolute', bottom: 12, right: 16, color: DIM, fontSize: 11, textAlign: 'center' }}>
              <div>N</div>
              <div>W ✦ E</div>
              <div>S</div>
            </div>
          </div>

          {/* Rotation control */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: DIM, fontSize: 12, display: 'block', marginBottom: 8 }}>
              Tent Rotation: <strong style={{ color: TEXT }}>{state.tentRotation}°</strong> — {ROTATION_LABELS[state.tentRotation].label}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROTATIONS.map(r => (
                <button
                  key={r}
                  onClick={() => dispatch({ type: 'SET_ROTATION', payload: r })}
                  disabled={state.tentConfirmed}
                  style={{
                    ...S.actionBtn, flex: 1, fontSize: 12,
                    background: state.tentRotation === r ? BLUE : 'rgba(255,255,255,0.06)',
                    color: state.tentRotation === r ? '#fff' : DIM,
                  }}
                >
                  {r}°
                </button>
              ))}
            </div>
          </div>

          {!state.tentConfirmed && (
            <button
              onClick={() => dispatch({ type: 'CONFIRM_TENT' })}
              style={{ ...S.primaryBtn, width: '100%' }}
            >
              Set Pitch
            </button>
          )}

          {state.tentFeedback && (
            <div style={{
              marginTop: 12, padding: 14, borderRadius: 10,
              background: state.tentConfirmed ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)',
              border: `1px solid ${state.tentConfirmed ? 'rgba(46,213,115,0.3)' : 'rgba(255,71,87,0.3)'}`,
              animation: state.tentConfirmed ? 'none' : 'm7shake 0.4s ease',
            }}>
              <p style={{ color: state.tentConfirmed ? GREEN : '#ff6b81', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {state.tentFeedback}
              </p>
            </div>
          )}

          {state.tentConfirmed && (
            <button
              onClick={() => dispatch({ type: 'SET_PHASE', payload: 'phase4' })}
              style={{ ...S.primaryBtn, width: '100%', marginTop: 12, background: GREEN }}
            >
              → Phase 4: The Build
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── PHASE 4: The Build & The Storm ─────────────────────────────────────────
  if (state.phase === 'phase4') {
    return (
      <div style={S.screen}>
        <div style={{ maxWidth: 660, width: '100%', padding: 24 }}>
          <h2 style={{ color: TEXT, fontSize: 20, margin: '0 0 8px' }}>Phase 4: The Build & The Storm</h2>
          <p style={{ color: DIM, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>
            Stack your layers <strong style={{ color: YELLOW }}>bottom to top</strong> (ground up), then prepare for rain.
          </p>

          {/* Build slots visualization */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            {/* Left: Build slots */}
            <div style={{ flex: 1 }}>
              <div style={{ color: DIM, fontSize: 12, marginBottom: 8, fontWeight: 700 }}>BUILD SLOTS (Bottom → Top)</div>
              {[2, 1, 0].map(slot => {
                const itemId = state.buildOrder[slot]
                const item = BUILD_ITEMS.find(b => b.id === itemId)
                return (
                  <div key={slot} style={{
                    height: 56, borderRadius: 8, marginBottom: 6,
                    border: `2px dashed ${item ? GREEN : 'rgba(255,255,255,0.15)'}`,
                    background: item ? 'rgba(46,213,115,0.08)' : 'rgba(255,255,255,0.02)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {item ? (
                      <>
                        <span style={{ fontSize: 22 }}>{item.icon}</span>
                        <span style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                        {!state.buildLocked && (
                          <button onClick={() => dispatch({ type: 'REMOVE_BUILD', payload: itemId })}
                            style={{ background: 'none', border: 'none', color: RED, cursor: 'pointer', fontSize: 14 }}>✕</button>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Slot {slot + 1} — {slot === 0 ? 'Bottom' : slot === 1 ? 'Middle' : 'Top'}</span>
                    )}
                  </div>
                )
              })}
              <div style={{ color: DIM, fontSize: 10, marginTop: 4, textAlign: 'center' }}>
                ═══════ GROUND ═══════
              </div>
            </div>

            {/* Right: Available items */}
            <div style={{ flex: 1 }}>
              <div style={{ color: DIM, fontSize: 12, marginBottom: 8, fontWeight: 700 }}>ITEMS</div>
              {BUILD_ITEMS.map(item => {
                const used = state.buildOrder.includes(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => dispatch({ type: 'ADD_BUILD', payload: item.id })}
                    disabled={used || state.buildLocked}
                    style={{
                      ...S.card, width: '100%', marginBottom: 6, textAlign: 'left',
                      cursor: used || state.buildLocked ? 'default' : 'pointer',
                      opacity: used ? 0.35 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 22 }}>{item.icon}</span>
                      <div>
                        <div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                        <div style={{ color: DIM, fontSize: 11 }}>{item.desc}</div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lock build */}
          {!state.buildLocked && (
            <button
              onClick={() => dispatch({ type: 'LOCK_BUILD' })}
              disabled={state.buildOrder.length !== 3}
              style={{ ...S.primaryBtn, width: '100%', opacity: state.buildOrder.length !== 3 ? 0.4 : 1 }}
            >
              Lock In Layer Order
            </button>
          )}

          {state.buildFeedback && (
            <div style={{
              marginTop: 12, padding: 14, borderRadius: 10,
              background: state.buildLocked ? 'rgba(46,213,115,0.08)' : 'rgba(255,71,87,0.1)',
              border: `1px solid ${state.buildLocked ? 'rgba(46,213,115,0.2)' : 'rgba(255,71,87,0.3)'}`,
              animation: state.buildLocked ? 'none' : 'm7shake 0.4s ease',
            }}>
              <p style={{ color: state.buildLocked ? GREEN : '#ff6b81', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {state.buildFeedback}
              </p>
            </div>
          )}

          {/* Action buttons (post-build) */}
          {state.buildLocked && !state.stormStarted && (
            <div style={{ marginTop: 16 }}>
              <div style={{ color: DIM, fontSize: 12, marginBottom: 10, fontWeight: 700 }}>STORM PREP ACTIONS</div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => dispatch({ type: 'SET_GUYLINES' })}
                  disabled={state.guyLinesSet}
                  style={{
                    ...S.actionBtn, flex: 1,
                    background: state.guyLinesSet ? 'rgba(46,213,115,0.15)' : 'rgba(255,255,255,0.06)',
                    color: state.guyLinesSet ? GREEN : TEXT,
                    border: state.guyLinesSet ? `1px solid ${GREEN}` : `1px solid ${BORDER}`,
                  }}
                >
                  {state.guyLinesSet ? '✅ ' : '🪢 '}Tie Taut-Line Guy-Lines
                </button>
                <button
                  onClick={() => dispatch({ type: 'DIG_TRENCH' })}
                  disabled={state.trenchDug}
                  style={{
                    ...S.actionBtn, flex: 1,
                    background: state.trenchDug ? 'rgba(46,213,115,0.15)' : 'rgba(255,255,255,0.06)',
                    color: state.trenchDug ? GREEN : TEXT,
                    border: state.trenchDug ? `1px solid ${GREEN}` : `1px solid ${BORDER}`,
                  }}
                >
                  {state.trenchDug ? '✅ ' : '⛏️ '}Dig Perimeter Trench
                </button>
              </div>
              <button
                onClick={() => dispatch({ type: 'START_STORM' })}
                style={{ ...S.primaryBtn, width: '100%', background: '#6c5ce7' }}
              >
                ⛈️ Start Rain Storm
              </button>
            </div>
          )}

          {/* Storm result */}
          {state.stormStarted && (
            <div style={{
              marginTop: 16, padding: 20, borderRadius: 12, textAlign: 'center',
              background: state.stormResult === 'survived' ? 'rgba(46,213,115,0.1)' : 'rgba(255,71,87,0.1)',
              border: `1px solid ${state.stormResult === 'survived' ? 'rgba(46,213,115,0.3)' : 'rgba(255,71,87,0.3)'}`,
            }}>
              <div style={{ fontSize: 48 }}>
                {state.stormResult === 'survived' ? '🎉' : '💀'}
              </div>
              <p style={{ color: state.stormResult === 'survived' ? GREEN : '#ff6b81', fontSize: 14, margin: '8px 0', lineHeight: 1.7 }}>
                {state.stormResult === 'survived'
                  ? '✅ STORM SURVIVED! Guy-lines kept the roof taut and shedding water. The perimeter trench diverted ground runoff away from your shelter. You stayed warm and dry all night.'
                  : state.stormResult === 'collapsed_flooded'
                    ? '💀 DOUBLE FAILURE: Without guy-line tension, rain pooled on the sagging roof until it collapsed. Without a trench, groundwater flooded your sleeping area.'
                    : state.stormResult === 'collapsed'
                      ? '❌ ROOF COLLAPSE: Without taut guy-lines, the roof sagged. Rain pooled on the fabric until the structure buckled inward.'
                      : '❌ FLOODED: Without a perimeter trench, surface runoff flooded under the tent. Your sleeping bag is soaked.'}
              </p>
              <button
                onClick={finishGame}
                style={{ ...S.primaryBtn, marginTop: 12 }}
              >
                See Results
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── RESULT ─────────────────────────────────────────────────────────────────
  if (state.phase === 'result') {
    const total = Math.min(100, Math.max(0, state.score - (state.stormResult !== 'survived' ? 15 : 0)))
    const passed = total >= 50 && state.stormResult === 'survived'
    return (
      <div style={S.screen}>
        <div style={{ ...S.introCard, maxWidth: 600 }}>
          <div style={{ fontSize: 56 }}>{passed ? '⛺✅' : '⛺❌'}</div>
          <h1 style={{ color: passed ? GREEN : RED, fontSize: 24, margin: '8px 0' }}>
            {passed ? 'Survival Mastered!' : 'Shelter Failed'}
          </h1>
          <div style={{ fontSize: 40, fontWeight: 800, color: passed ? GREEN : RED }}>
            {total}/100
          </div>

          {passed && (
            <p style={{ color: '#a4b0be', fontSize: 14, lineHeight: 1.7, textAlign: 'center', margin: '12px 0' }}>
              You avoided Widowmakers, deflected storm winds, blocked thermal conduction, and diverted floodwaters. Full marks!
            </p>
          )}

          <div style={{ background: 'rgba(55,66,250,0.08)', border: '1px solid rgba(55,66,250,0.2)', borderRadius: 10, padding: 16, width: '100%', textAlign: 'left', marginTop: 8 }}>
            <h3 style={{ color: '#74b9ff', margin: '0 0 10px', fontSize: 14 }}>Phase Breakdown</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 2.2 }}>
              <li style={{ color: state.locationConfirmed ? GREEN : RED }}>
                {state.locationConfirmed ? '✅' : '❌'} Phase 1: Site Selection {state.hazardCleared ? '+ Widowmaker cleared' : ''}
              </li>
              <li style={{ color: state.packLocked ? GREEN : RED }}>
                {state.packLocked ? '✅' : '❌'} Phase 2: Gear Selection
              </li>
              <li style={{ color: state.tentConfirmed ? GREEN : RED }}>
                {state.tentConfirmed ? '✅' : '❌'} Phase 3: Tent Orientation (180° spine into wind)
              </li>
              <li style={{ color: state.stormResult === 'survived' ? GREEN : RED }}>
                {state.stormResult === 'survived' ? '✅' : '❌'} Phase 4: Build + Storm
                {state.guyLinesSet ? ' [Guy-lines ✓]' : ' [Guy-lines ✗]'}
                {state.trenchDug ? ' [Trench ✓]' : ' [Trench ✗]'}
              </li>
            </ul>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: '100%', textAlign: 'left', marginTop: 12 }}>
            <h3 style={{ color: YELLOW, margin: '0 0 10px', fontSize: 14 }}>Key Lessons</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 2, color: DIM }}>
              <li>🏔️ Mid-slope avoids cold-air pooling (valley) and wind exposure (ridge)</li>
              <li>🌲 Always look UP for "Widowmakers" — dead branches that storms break loose</li>
              <li>❌ Cotton kills — it loses ALL insulation value when wet</li>
              <li>🟦 Foam pads block ground conduction (R-value), air mattresses don't</li>
              <li>🌬️ Pitch the tent spine into the wind to minimize aerodynamic drag</li>
              <li>🪢 Taut guy-lines prevent roof sagging and water pooling</li>
              <li>⛏️ Perimeter trenches divert surface runoff away from your shelter</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={S.primaryBtn} onClick={() => {
              dispatch({ type: 'SET_PHASE', payload: 'intro' })
              // Reset state by dispatching a fresh reducer — just reload
              window.location.reload()
            }}>
              🔄 Try Again
            </button>
            <button style={{ ...S.actionBtn, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} onClick={goBack}>
              📋 Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: BG, fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16,
  },
  introCard: {
    maxWidth: 560, padding: '32px 28px', textAlign: 'center',
    background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`,
    borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  card: {
    background: CARD, borderRadius: 10, padding: '12px 14px',
    border: `1px solid ${BORDER}`, textAlign: 'center',
  },
  primaryBtn: {
    padding: '13px 36px', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer',
  },
  actionBtn: {
    padding: '10px 20px', fontSize: 13, fontWeight: 600,
    background: 'rgba(255,255,255,0.06)', color: TEXT,
    border: `1px solid ${BORDER}`, borderRadius: 8, cursor: 'pointer',
  },
  ghost: {
    background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 13, padding: 0,
  },
}
