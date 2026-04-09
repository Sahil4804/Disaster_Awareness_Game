/**
 * Module 9 — Hazmat Cleanup: 4-Phase Remediation Simulator
 * Phase 1: Utilities & Power (gas arc spark + CO prevention)
 * Phase 2: Demolition & Mold (PPE + capillary action cut height)
 * Phase 3: Chemical Sanitation (chloramine gas trap + correct sequence)
 * Phase 4: FEMA Curbside Debris Sorting (6 zones)
 */
import { useReducer, useCallback, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ── Theme ────────────────────────────────────────────────────────────────────
const BG = '#1e1e2e'
const CARD = '#2a2a3e'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#f1f2f6'
const DIM = '#a4b0be'
const GREEN = '#2ed573'
const RED = '#ff4757'
const YELLOW = '#ffa502'
const ORANGE = '#e17055'

// ── Phase 4: FEMA zones & debris ─────────────────────────────────────────────
const FEMA_ZONES = [
  { id: 'normal', name: 'Normal Debris', color: '#636e72', icon: '🗑️' },
  { id: 'appliances', name: 'Appliances (White Goods)', color: '#0984e3', icon: '🧊' },
  { id: 'electronics', name: 'Electronics (E-Waste)', color: '#6c5ce7', icon: '📺' },
  { id: 'hazardous', name: 'Hazardous Waste (HHW)', color: RED, icon: '☠️' },
  { id: 'construction', name: 'Construction & Demo', color: ORANGE, icon: '🧱' },
  { id: 'vegetative', name: 'Vegetative Debris', color: GREEN, icon: '🌿' },
]

const DEBRIS_ITEMS = [
  { id: 'mattress', name: 'Soaked Mattress', icon: '🛏️', zone: 'normal', tip: 'Household items like mattresses, furniture, and clothing go in Normal Debris.' },
  { id: 'fridge', name: 'Flood-Damaged Fridge', icon: '🧊', zone: 'appliances', tip: '"White goods" = large appliances (fridge, washer, HVAC). They contain refrigerants and oils that require special processing.' },
  { id: 'tv', name: 'Waterlogged TV', icon: '📺', zone: 'electronics', tip: 'Electronics contain lead, mercury, and cadmium. Federal law prohibits dumping e-waste in landfills.' },
  { id: 'paint', name: 'Flood-Damaged Paint Cans', icon: '🎨', zone: 'hazardous', tip: 'Paint, solvents, pesticides, and propane tanks are Household Hazardous Waste. They contaminate groundwater if landfilled.' },
  { id: 'drywall', name: 'Demolished Drywall', icon: '🧱', zone: 'construction', tip: 'Drywall, lumber, roofing, and concrete go in Construction & Demolition debris for specialized recycling.' },
  { id: 'branch', name: 'Fallen Tree Branch', icon: '🌳', zone: 'vegetative', tip: 'Trees, branches, stumps, and leaves are Vegetative debris — mulched or composted separately.' },
]

// ── Reducer ──────────────────────────────────────────────────────────────────
const init = {
  phase: 'intro',
  gasStatus: 'ON', powerStatus: 'ON', generatorLocation: null,
  gasShutOff: false, breakerOff: false,
  ppeEquipped: false, cutHeight: null, wallCut: false,
  mudShoveled: false, bleachApplied: false, ammoniaApplied: false, fanPlaced: false,
  sortedDebris: {},
  feedback: null,
  objectiveText: '',
  score: 0, errors: 0, criticalFails: 0,
}

function reducer(state, action) {
  const fb = (text, type = 'error') => ({ text, type })
  switch (action.type) {
    case 'SET_PHASE': {
      const objs = { p1: 'Secure utilities and set up safe power. Gas OFF → Breaker OFF → Generator to yard.', p2: 'Demolish contaminated materials. PPE first → cut drywall above waterline.', p3: 'Sanitize exposed studs. Shovel → Bleach → Ventilate.', p4: 'Sort debris into 6 FEMA curb zones.' }
      return { ...state, phase: action.payload, feedback: null, objectiveText: objs[action.payload] || '' }
    }
    case 'FLIP_BREAKER': {
      if (state.gasStatus === 'ON') return { ...state, feedback: fb('💥 EXPLOSION! Flipping a breaker creates an arc spark. With gas flowing, the spark ignited a gas cloud. ALWAYS shut off the exterior gas main FIRST.', 'critical'), criticalFails: state.criticalFails + 1, errors: state.errors + 1 }
      return { ...state, breakerOff: true, powerStatus: 'OFF', feedback: fb('✅ Main breaker OFF. Power safely disconnected — no arc-spark risk with gas already off.', 'success'), score: state.score + 10 }
    }
    case 'SHUTOFF_GAS': return { ...state, gasShutOff: true, gasStatus: 'OFF', feedback: fb('✅ Exterior gas meter shut off. Quarter-turn perpendicular to pipe = closed.', 'success'), score: state.score + 10 }
    case 'PLACE_GENERATOR': {
      const loc = action.payload
      if (loc === 'INDOORS' || loc === 'GARAGE') return { ...state, generatorLocation: loc, feedback: fb(`💀 CARBON MONOXIDE POISONING! CO is invisible, odorless, lethal at 400+ PPM. A generator in the ${loc === 'GARAGE' ? 'garage (even with door open!)' : 'house'} fills the space in minutes. Must be OUTSIDE, 20+ feet from ANY opening.`, 'critical'), criticalFails: state.criticalFails + 1, errors: state.errors + 1 }
      if (!state.gasShutOff || !state.breakerOff) return { ...state, feedback: fb('⚠️ Secure the house first! Gas OFF and breaker OFF before setting up power.', 'error'), errors: state.errors + 1 }
      return { ...state, generatorLocation: 'YARD', feedback: fb('✅ Generator placed 20+ feet from house, downwind. Safe power established!', 'success'), score: state.score + 15 }
    }
    case 'CUT_WALL_NO_PPE': return { ...state, feedback: fb('☣️ BIOHAZARD! Floodwater contains sewage, mold, chemicals. Wear N95 + Tyvek BEFORE disturbing debris.', 'error'), errors: state.errors + 1 }
    case 'EQUIP_PPE': return { ...state, ppeEquipped: true, feedback: fb('✅ N95 + Tyvek + rubber gloves equipped. Protected from mold spores and sewage.', 'success') }
    case 'CUT_WALL': {
      if (!state.ppeEquipped) return { ...state, feedback: fb('☣️ Equip PPE first!', 'error'), errors: state.errors + 1 }
      if (action.payload === 'waterline') return { ...state, cutHeight: 'waterline', feedback: fb('❌ MOLD TRAP! Water wicks 2+ feet above the visible waterline via capillary action. Cutting at the waterline leaves hidden moisture = black mold in 48 hours.', 'error'), errors: state.errors + 1 }
      return { ...state, cutHeight: 'above2ft', wallCut: true, feedback: fb('✅ Drywall cut 2ft above waterline. Capillary wicking zone removed. Studs exposed for treatment.', 'success'), score: state.score + 15 }
    }
    case 'APPLY_BLEACH_DIRTY': {
      if (!state.mudShoveled) return { ...state, feedback: fb('❌ Organic mud neutralizes bleach on contact! Shovel bulk mud FIRST, then bleach clean surfaces.', 'error'), errors: state.errors + 1 }
      if (state.ammoniaApplied) return { ...state, feedback: fb('☠️ CHLORAMINE GAS! Bleach + ammonia = deadly chloramine. #1 cause of accidental chemical poisoning during flood cleanup. NEVER mix.', 'critical'), criticalFails: state.criticalFails + 1, errors: state.errors + 1 }
      return { ...state, bleachApplied: true, feedback: fb('✅ Bleach solution applied to studs. 10 minutes contact time kills biofilm.', 'success'), score: state.score + 10 }
    }
    case 'APPLY_AMMONIA': {
      if (state.bleachApplied) return { ...state, feedback: fb('☠️ CHLORAMINE GAS! Ammonia + bleach = lethal. NEVER mix these chemicals.', 'critical'), criticalFails: state.criticalFails + 1, errors: state.errors + 1 }
      return { ...state, ammoniaApplied: true, feedback: fb('⚠️ Ammonia applied. Works as cleaner, but bleach is more effective. Warning: adding bleach now = deadly gas.', 'error') }
    }
    case 'SHOVEL_MUD': return { ...state, mudShoveled: true, feedback: fb('✅ Mud shoveled out. Surfaces ready for chemical treatment.', 'success'), score: state.score + 5 }
    case 'PLACE_FAN': {
      if (!state.bleachApplied && !state.ammoniaApplied) return { ...state, feedback: fb('⚠️ Sanitize first, then ventilate!', 'error') }
      return { ...state, fanPlaced: true, feedback: fb('✅ Box fan pointing outward. Negative pressure pulls contaminated air out.', 'success'), score: state.score + 5 }
    }
    case 'SORT_DEBRIS': {
      const { debrisId, zoneId } = action.payload
      const item = DEBRIS_ITEMS.find(d => d.id === debrisId)
      if (item.zone !== zoneId) return { ...state, feedback: fb(`❌ Wrong zone! "${item.name}" → ${FEMA_ZONES.find(z => z.id === zoneId)?.name} is WRONG. Mixed piles get REJECTED by FEMA. ${item.tip}`, 'error'), errors: state.errors + 1 }
      const s2 = { ...state.sortedDebris, [debrisId]: zoneId }
      return { ...state, sortedDebris: s2, feedback: fb(`✅ ${item.tip}`, 'success'), score: state.score + (Object.keys(s2).length === DEBRIS_ITEMS.length ? 15 : 5) }
    }
    default: return state
  }
}

// ── Keyframes ────────────────────────────────────────────────────────────────
const KF = `@keyframes m9shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}@keyframes m9glow{0%,100%{box-shadow:0 0 6px rgba(46,213,115,0.3)}50%{box-shadow:0 0 18px rgba(46,213,115,0.6)}}`

// ── Component ────────────────────────────────────────────────────────────────
export default function Module9_HazmatCleanup() {
  const { dispatch: gDispatch } = useGame()
  const [state, dispatch] = useReducer(reducer, init)
  const styleRef = useRef(false)

  useEffect(() => {
    if (styleRef.current) return; styleRef.current = true
    const el = document.createElement('style'); el.textContent = KF; document.head.appendChild(el)
    return () => { try { document.head.removeChild(el) } catch {} }
  }, [])

  const goBack = useCallback(() => gDispatch({ type: 'BACK_TO_MODULES' }), [gDispatch])
  const finishGame = useCallback(() => {
    const total = Math.min(100, Math.max(0, state.score - state.criticalFails * 15 - state.errors * 3))
    gDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-9', result: { score: total, passed: total >= 50 && state.criticalFails === 0 } } })
    dispatch({ type: 'SET_PHASE', payload: 'result' })
  }, [state, gDispatch])

  const Fb = () => {
    if (!state.feedback) return null
    const { text, type } = state.feedback
    const c = { success: GREEN, error: YELLOW, critical: RED }
    return (<div style={{ padding: 14, borderRadius: 10, marginTop: 12, background: `${c[type]}11`, border: `1px solid ${c[type]}33`, animation: type !== 'success' ? 'm9shake 0.4s ease' : 'm9glow 2s ease infinite' }}><p style={{ color: c[type], fontSize: 13, margin: 0, lineHeight: 1.7 }}>{text}</p></div>)
  }

  // ── INTRO ──
  if (state.phase === 'intro') {
    return (
      <div style={S.scr}><div style={S.iCard}>
        <div style={{ fontSize: 56 }}>☣️</div>
        <h1 style={{ color: TEXT, fontSize: 26, margin: '8px 0' }}>Module 9: Hazmat Cleanup</h1>
        <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7 }}>The flood has receded. Your home is a biohazard. Remediate safely or risk explosion, poisoning, or toxic exposure.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', margin: '12px 0' }}>
          {[['⚡','Phase 1','Utilities & Power','Gas arcs, CO'],['🪓','Phase 2','Demolition','PPE + mold trap'],['🧪','Phase 3','Sanitation','Chloramine gas trap'],['🗑️','Phase 4','FEMA Sort','6 debris zones']].map(([e,t,s,d],i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 24 }}>{e}</div><div style={{ color: TEXT, fontSize: 13, fontWeight: 700, marginTop: 4 }}>{t}: {s}</div><div style={{ color: DIM, fontSize: 11, marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>
        <button style={S.pBtn} onClick={() => dispatch({ type: 'SET_PHASE', payload: 'p1' })}>Begin Remediation</button>
        <button style={S.ghost} onClick={goBack}>← Back to Modules</button>
      </div></div>
    )
  }

  // ── P1: Utilities ──
  if (state.phase === 'p1') {
    const done = state.gasShutOff && state.breakerOff && state.generatorLocation === 'YARD'
    return (
      <div style={S.scr}><div style={{ maxWidth: 680, width: '100%', padding: 24 }}>
        <PH title="Phase 1: Utilities & Power" obj={state.objectiveText} quit={goBack} />
        <div style={{ position: 'relative', height: 180, background: '#12121f', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <svg width="100%" height="180" viewBox="0 0 680 180">
            <rect x="150" y="30" width="280" height="130" fill="#2a2a3e" stroke="#636e72" />
            <polygon points="150,30 290,5 430,30" fill="#3d3d5c" stroke="#636e72" />
            <text x="290" y="90" fill={DIM} fontSize="11" textAnchor="middle">INTERIOR</text>
            <rect x="430" y="50" width="100" height="110" fill="#222233" stroke="#636e72" />
            <text x="480" y="115" fill={DIM} fontSize="10" textAnchor="middle">GARAGE</text>
            <circle cx="120" cy="110" r="18" fill={state.gasShutOff ? '#2d3436' : '#e17055'} stroke="#636e72" />
            <text x="120" y="114" fill="#fff" fontSize="9" textAnchor="middle">GAS</text>
            <text x="120" y="142" fill={state.gasShutOff ? GREEN : RED} fontSize="9" textAnchor="middle">{state.gasShutOff ? 'OFF ✓' : 'ON ⚠'}</text>
            <rect x="170" y="60" width="40" height="45" fill={state.breakerOff ? '#2d3436' : '#e17055'} stroke="#636e72" rx="4" />
            <text x="190" y="87" fill="#fff" fontSize="8" textAnchor="middle">BKR</text>
            <rect x="560" y="50" width="110" height="110" fill="rgba(46,213,115,0.08)" stroke={GREEN} strokeDasharray="4" rx="4" />
            <text x="615" y="110" fill={GREEN} fontSize="9" textAnchor="middle">YARD 20ft+</text>
            {state.generatorLocation === 'YARD' && <text x="615" y="130" fontSize="18" textAnchor="middle">⚡</text>}
            {state.gasStatus === 'ON' && <text x="290" y="75" fill="rgba(255,165,2,0.4)" fontSize="10" textAnchor="middle">~ gas shimmer ~</text>}
          </svg>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <ABtn icon="🔧" label="Gas Wrench → Meter" done={state.gasShutOff} onClick={() => dispatch({ type: 'SHUTOFF_GAS' })} d="Shut exterior gas" />
          <ABtn icon="⚡" label="Flip Breaker OFF" done={state.breakerOff} onClick={() => dispatch({ type: 'FLIP_BREAKER' })} d="Disconnect power" />
        </div>
        <div style={{ color: DIM, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Place Generator:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[{l:'INDOORS',n:'🏠 Inside',c:RED},{l:'GARAGE',n:'🏗️ Garage',c:ORANGE},{l:'YARD',n:'🌿 Yard 20ft+',c:GREEN}].map(g => (
            <button key={g.l} onClick={() => dispatch({ type: 'PLACE_GENERATOR', payload: g.l })} disabled={state.generatorLocation==='YARD'} style={{ ...S.aBtn, border: `1px solid ${state.generatorLocation===g.l?g.c:BORDER}`, opacity: state.generatorLocation==='YARD'?0.5:1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{g.n}</div>
            </button>
          ))}
        </div>
        <Fb />
        {done && <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'p2' })} style={{ ...S.pBtn, width: '100%', marginTop: 12, background: GREEN }}>→ Phase 2: Demolition</button>}
      </div></div>
    )
  }

  // ── P2: Demolition ──
  if (state.phase === 'p2') {
    const done = state.ppeEquipped && state.wallCut
    return (
      <div style={S.scr}><div style={{ maxWidth: 680, width: '100%', padding: 24 }}>
        <PH title="Phase 2: Demolition & Mold Trap" obj={state.objectiveText} quit={goBack} />
        <div style={{ position: 'relative', height: 180, background: '#12121f', borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <svg width="100%" height="180" viewBox="0 0 680 180">
            {[100,200,300,400,500].map(x => <rect key={x} x={x} y="15" width="8" height="150" fill="#5a3e2b" stroke="#4a3020" />)}
            <rect x="70" y="15" width="550" height="150" fill="rgba(180,170,150,0.15)" stroke="#636e72" />
            <line x1="70" y1="110" x2="620" y2="110" stroke="#0984e3" strokeWidth="2" strokeDasharray="6" />
            <text x="635" y="114" fill="#0984e3" fontSize="10">WATERLINE</text>
            <rect x="70" y="70" width="550" height="40" fill="rgba(255,165,2,0.1)" />
            <text x="350" y="90" fill={YELLOW} fontSize="10" textAnchor="middle">↑ CAPILLARY WICKING ↑</text>
            <line x1="70" y1="70" x2="620" y2="70" stroke={GREEN} strokeWidth="1" strokeDasharray="4" />
            <text x="635" y="74" fill={GREEN} fontSize="9">2ft ABOVE</text>
          </svg>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <ABtn icon="😷" label="Equip N95 + Tyvek" done={state.ppeEquipped} onClick={() => dispatch({ type: 'EQUIP_PPE' })} d="PPE first" />
          <ABtn icon="🔪" label="Cut Wall (no PPE)" done={false} onClick={() => dispatch({ type: 'CUT_WALL_NO_PPE' })} d="Skip PPE" danger />
        </div>
        {state.ppeEquipped && !state.wallCut && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => dispatch({ type: 'CUT_WALL', payload: 'waterline' })} style={{ ...S.aBtn }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>📏 Cut at Waterline</div>
            </button>
            <button onClick={() => dispatch({ type: 'CUT_WALL', payload: 'above2ft' })} style={{ ...S.aBtn }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>📏 Cut 2ft Above</div>
            </button>
          </div>
        )}
        <Fb />
        {done && <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'p3' })} style={{ ...S.pBtn, width: '100%', marginTop: 12, background: GREEN }}>→ Phase 3: Sanitation</button>}
      </div></div>
    )
  }

  // ── P3: Sanitation ──
  if (state.phase === 'p3') {
    const done = state.mudShoveled && (state.bleachApplied || state.ammoniaApplied) && state.fanPlaced
    return (
      <div style={S.scr}><div style={{ maxWidth: 680, width: '100%', padding: 24 }}>
        <PH title="Phase 3: Chemical Sanitation" obj={state.objectiveText} quit={goBack} />
        <p style={{ color: DIM, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>Correct sequence: <strong style={{ color: GREEN }}>Shovel → Bleach → Ventilate</strong>. One wrong combo = lethal.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <ABtn icon="🪣" label="Shovel Out Mud" done={state.mudShoveled} onClick={() => dispatch({ type: 'SHOVEL_MUD' })} d="Remove organic matter" />
          <ABtn icon="🧴" label="Apply Bleach" done={state.bleachApplied} onClick={() => dispatch({ type: 'APPLY_BLEACH_DIRTY' })} d="Kill biofilm" />
          <ABtn icon="⚗️" label="Apply Ammonia" done={state.ammoniaApplied} onClick={() => dispatch({ type: 'APPLY_AMMONIA' })} d="Alt cleaner" danger />
          <ABtn icon="🌀" label="Place Box Fan" done={state.fanPlaced} onClick={() => dispatch({ type: 'PLACE_FAN' })} d="Ventilate outward" />
        </div>
        <Fb />
        {done && <button onClick={() => dispatch({ type: 'SET_PHASE', payload: 'p4' })} style={{ ...S.pBtn, width: '100%', marginTop: 12, background: GREEN }}>→ Phase 4: FEMA Sort</button>}
      </div></div>
    )
  }

  // ── P4: FEMA Sort ──
  if (state.phase === 'p4') {
    const unsorted = DEBRIS_ITEMS.filter(d => !state.sortedDebris[d.id])
    const allDone = unsorted.length === 0
    return (
      <div style={S.scr}><div style={{ maxWidth: 720, width: '100%', padding: 24 }}>
        <PH title="Phase 4: FEMA Curbside Sort" obj={state.objectiveText} quit={goBack} />
        <p style={{ color: DIM, fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>FEMA requires <strong style={{ color: YELLOW }}>6 separate piles</strong>. Click a debris item's emoji in the correct zone.</p>
        <div style={{ color: DIM, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>DEBRIS ({unsorted.length} left)</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {DEBRIS_ITEMS.map(d => {
            const ok = !!state.sortedDebris[d.id]
            return (<div key={d.id} style={{ background: ok ? 'rgba(46,213,115,0.1)' : CARD, border: `1px solid ${ok ? GREEN : BORDER}`, borderRadius: 8, padding: '8px 12px', opacity: ok ? 0.5 : 1, textAlign: 'center', minWidth: 85 }}>
              <div style={{ fontSize: 24 }}>{d.icon}</div><div style={{ color: TEXT, fontSize: 11, fontWeight: 600, marginTop: 4 }}>{d.name}</div>{ok && <div style={{ color: GREEN, fontSize: 10 }}>✓</div>}
            </div>)
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {FEMA_ZONES.map(zone => (
            <div key={zone.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${zone.color}44`, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22 }}>{zone.icon}</div><div style={{ color: zone.color, fontSize: 11, fontWeight: 700, marginTop: 4 }}>{zone.name}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, justifyContent: 'center' }}>
                {unsorted.map(d => (<button key={d.id} onClick={() => dispatch({ type: 'SORT_DEBRIS', payload: { debrisId: d.id, zoneId: zone.id } })} style={{ fontSize: 16, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }} title={d.name}>{d.icon}</button>))}
              </div>
            </div>
          ))}
        </div>
        <Fb />
        {allDone && <button onClick={finishGame} style={{ ...S.pBtn, width: '100%', marginTop: 12, background: GREEN }}>🎉 Complete Remediation</button>}
      </div></div>
    )
  }

  // ── RESULT ──
  if (state.phase === 'result') {
    const total = Math.min(100, Math.max(0, state.score - state.criticalFails * 15 - state.errors * 3))
    const passed = total >= 50 && state.criticalFails === 0
    return (
      <div style={S.scr}><div style={{ ...S.iCard, maxWidth: 600 }}>
        <div style={{ fontSize: 56 }}>{passed ? '☣️✅' : '☣️❌'}</div>
        <h1 style={{ color: passed ? GREEN : RED, fontSize: 24, margin: '8px 0' }}>{passed ? 'Master Remediation!' : 'Remediation Failed'}</h1>
        <div style={{ fontSize: 40, fontWeight: 800, color: passed ? GREEN : RED }}>{total}/100</div>
        {passed && <p style={{ color: DIM, fontSize: 14, lineHeight: 1.7, textAlign: 'center' }}>You prevented a gas explosion, avoided CO poisoning, sanitized biohazards, and sorted debris for FEMA extraction.</p>}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: '100%', textAlign: 'left' }}>
          <h3 style={{ color: YELLOW, margin: '0 0 8px', fontSize: 14 }}>Stats</h3>
          <div style={{ fontSize: 12, color: DIM, lineHeight: 2 }}>
            <div>Errors: {state.errors} | Critical: {state.criticalFails}</div>
            <div>Gas: {state.gasShutOff?'✅':'❌'} | Breaker: {state.breakerOff?'✅':'❌'} | Gen: {state.generatorLocation==='YARD'?'✅':'❌'}</div>
            <div>PPE: {state.ppeEquipped?'✅':'❌'} | Cut: {state.cutHeight==='above2ft'?'✅ 2ft':'❌'} | Mud: {state.mudShoveled?'✅':'❌'} | Bleach: {state.bleachApplied?'✅':'❌'}</div>
            <div>Debris sorted: {Object.keys(state.sortedDebris).length}/6</div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: '100%', textAlign: 'left', marginTop: 8 }}>
          <h3 style={{ color: '#74b9ff', margin: '0 0 8px', fontSize: 14 }}>Key Lessons</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 2, color: DIM }}>
            <li>⚡ Gas OFF first — breaker sparks ignite gas</li><li>💀 Generators: OUTSIDE 20ft+ (CO kills silently)</li>
            <li>😷 Always PPE before disturbing flood debris</li><li>📏 Cut drywall 2ft ABOVE waterline (capillary wicking)</li>
            <li>🪣 Shovel mud first — organics neutralize bleach</li><li>☠️ NEVER mix bleach + ammonia</li>
            <li>🗑️ 6 sorted FEMA piles — mixed = rejected</li>
          </ul>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button style={S.pBtn} onClick={() => window.location.reload()}>🔄 Retry</button>
          <button style={{ ...S.aBtn, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }} onClick={goBack}>📋 Modules</button>
        </div>
      </div></div>
    )
  }
  return null
}

// ── Sub-components ───────────────────────────────────────────────────────────
function PH({ title, obj, quit }) {
  return (<><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><h2 style={{ color: TEXT, fontSize: 20, margin: 0 }}>{title}</h2><button style={S.ghost} onClick={quit}>← Quit</button></div>{obj && <p style={{ color: DIM, fontSize: 13, margin: '0 0 16px', lineHeight: 1.6 }}>{obj}</p>}</>)
}
function ABtn({ icon, label, done, onClick, d, danger }) {
  return (<button onClick={done ? undefined : onClick} disabled={done} style={{ ...S.aBtn, textAlign: 'left', opacity: done ? 0.5 : 1, border: `1px solid ${done ? GREEN : danger ? `${RED}44` : BORDER}`, cursor: done ? 'default' : 'pointer' }}>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontSize: 20 }}>{done ? '✅' : icon}</span><div><div style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{label}</div><div style={{ color: DIM, fontSize: 11 }}>{d}</div></div></div>
  </button>)
}

const S = {
  scr: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: 'system-ui,-apple-system,sans-serif', padding: 16 },
  iCard: { maxWidth: 560, padding: '32px 28px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  pBtn: { padding: '13px 36px', fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#e17055,#d63031)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' },
  aBtn: { padding: '12px 14px', fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.04)', color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 10, cursor: 'pointer' },
  ghost: { background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 13, padding: 0 },
}
