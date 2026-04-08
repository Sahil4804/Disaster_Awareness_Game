/**
 * Module 3 — Yard Triage: Spatial Logistics & Cascading Failure Simulator
 * Aesthetic : Tactical Command Center — #0a0a0a, cyan/amber, JetBrains Mono
 * Mechanics : useReducer · 120-minute time budget · physics cascade simulation
 * Reference : FEMA P-348, NOAA Storm Surge, EPA Hazmat in Flood Guidelines
 */
import { useReducer, useState } from 'react'
import { useGame } from '../../context/GameContext'

const MONO = "'JetBrains Mono','Courier New',Courier,monospace"

// ─── Item catalogue ───────────────────────────────────────────────────────────
const ITEMS_INIT = [
  {
    id:'propane', emoji:'🛢️', name:'500-Gal Propane Tank', zone:'yard', state:'unsecured',
    hazard:'Explosive / Buoyant', hc:'#ef4444',
    weight:2365, buoyancy:4212, contaminant:'HIGH', windDrag:'LOW',
    mapX:110, mapY:330,
    desc:'Full tank. 4,212 lbs upward buoyancy force at 3ft flood. Floats, snaps the gas line, then ruptures. BLAST RADIUS: 50 m. (Source: NFPA 58)',
  },
  {
    id:'furniture', emoji:'🪑', name:'Resin Patio Set', zone:'yard', state:'unsecured',
    hazard:'Wind Projectile', hc:'#f97316',
    weight:185, buoyancy:900, contaminant:'LOW', windDrag:'HIGH',
    mapX:230, mapY:300,
    desc:'185 lbs, very high wind drag surface area. At 80 mph becomes a 185-lb shrapnel mass. Can shatter windows and breach walls. (Source: FEMA P-361)',
  },
  {
    id:'fertilizer', emoji:'🧴', name:'Lawn Chemicals (12 gal)', zone:'yard', state:'unsecured',
    hazard:'Toxic Contamination', hc:'#eab308',
    weight:80, buoyancy:60, contaminant:'CRITICAL', windDrag:'LOW',
    mapX:160, mapY:390,
    desc:'Nitrogen fertilizer + herbicides. Dissolves into floodwater, creates toxic nitrate soup. Cannot be made safe by boiling. EPA Superfund risk. (Source: EPA 832-R-06-005)',
  },
  {
    id:'mower', emoji:'🚜', name:'Riding Mower', zone:'yard', state:'unsecured',
    hazard:'Mechanical / Oil', hc:'#f59e0b',
    weight:450, buoyancy:1625, contaminant:'MEDIUM', windDrag:'LOW',
    mapX:340, mapY:365,
    desc:'Engine oil + fuel contaminate floodwater. Electrical systems destroyed at 12 inches of submersion. Replacement cost: $2,000+. (Source: FEMA Individual Assistance)',
  },
  {
    id:'debris', emoji:'🍂', name:'Loose Mulch & Leaves', zone:'yard', state:'unsecured',
    hazard:'CASCADE — Drain Clog', hc:'#dc2626',
    weight:30, buoyancy:10, contaminant:'LOW', windDrag:'HIGH',
    mapX:290, mapY:425,
    desc:'⚠ CASCADING HAZARD: Clogs storm drains within minutes. Raises local flood depth 3.0 ft → 4.5 ft, OVERRIDING all 2ft block elevations. (Source: FEMA Stormwater Mgmt)',
  },
  {
    id:'hvac', emoji:'🌀', name:'HVAC Condenser Unit', zone:'yardpad', state:'grid_powered',
    hazard:'Electrical Short', hc:'#8b5cf6',
    weight:220, buoyancy:750, contaminant:'LOW', windDrag:'MEDIUM',
    mapX:425, mapY:305,
    desc:'220V live unit. When submerged, arcs through conductive floodwater. $5,000 repair. Creates electrocution hazard throughout the yard. (Source: OSHA 3186)',
  },
]

// ─── Zone item slots ──────────────────────────────────────────────────────────
const ZONE_SLOTS = {
  yard:        [[110,330],[230,300],[160,390],[340,365],[290,425],[425,305]],
  garage:      [[545,220],[600,220],[545,265],[600,265],[572,295]],
  high_shelf:  [[540,148],[588,148],[536,170],[584,170]],
  pool:        [[78,175],[122,160],[78,210],[122,210]],
}

// ─── Action definitions ───────────────────────────────────────────────────────
const ACTIONS = {
  relocate_garage: {
    label:'Relocate to Garage', timeCost:10, budgetCost:0, icon:'🏠',
    desc:'Move into garage. Required step before elevation or shelving.',
    canDo: i => (i.zone==='yard'||i.zone==='yardpad') && i.id!=='hvac' && i.id!=='debris',
  },
  elevate_blocks: {
    label:'Elevate on Blocks (+2 ft)', timeCost:15, budgetCost:0, icon:'⬆️',
    desc:'Raises item 2 ft off garage floor. Protects against standard 3 ft flood only.',
    canDo: i => i.zone==='garage' && i.state!=='elevated' && i.state!=='shelved',
  },
  high_shelves: {
    label:'Move to High Shelves', timeCost:8, budgetCost:0, icon:'📦',
    desc:'Chemicals only — moves above flood line. Prevents toxic runoff.',
    canDo: i => i.zone==='garage' && i.id==='fertilizer' && i.state!=='shelved',
  },
  throw_pool: {
    label:'Throw in Pool (5 min)', timeCost:5, budgetCost:0, icon:'🏊',
    desc:'Furniture only. Submerged in controlled water — no wind exposure. Resin is waterproof.',
    canDo: i => i.zone==='yard' && i.id==='furniture',
  },
  anchor_fill: {
    label:'Anchor & Fill w/Water ($100)', timeCost:30, budgetCost:100, icon:'⚓',
    desc:'Tank only. Ground anchor + water ballast counteracts 4,212 lbs buoyancy. FEMA P-348.',
    canDo: i => i.id==='propane' && i.state!=='anchored',
  },
  bag_debris: {
    label:'Bag & Secure Debris', timeCost:20, budgetCost:0, icon:'🗑️',
    desc:'Removes loose organic matter. CRITICAL — prevents storm drain clog cascade.',
    canDo: i => i.id==='debris' && i.state!=='secured',
  },
  kill_breaker: {
    label:'Kill Outdoor Breaker', timeCost:5, budgetCost:0, icon:'⚡',
    desc:'Isolates 220V HVAC from grid. Prevents electrocution hazard in floodwater.',
    canDo: i => i.id==='hvac' && i.state==='grid_powered',
  },
}

// ─── Cascading failure simulation ─────────────────────────────────────────────
function simulate(items) {
  let waterMult = 1.0
  const findings = []
  let totalLoss = 0

  // Step 1 — DEBRIS CHECK (must run first, cascades to everything)
  const debris = items.find(i=>i.id==='debris')
  const drainClogged = debris.state !== 'secured'
  if (drainClogged) {
    waterMult = 2.0
    findings.push({
      type:'CASCADE', id:'debris',
      title:'⚠ STORM DRAINS CLOGGED — CASCADE EVENT',
      msg:'Loose mulch & leaves blocked storm drains within 8 minutes of rainfall. Local flood depth elevated from 3.0 ft → 4.5 ft. All 2 ft elevation measures are now INSUFFICIENT.',
      loss:0,
    })
  }
  const maxDepth = drainClogged ? 4.5 : 3.0

  // Step 2 — PROPANE TANK
  const propane = items.find(i=>i.id==='propane')
  if (propane.state !== 'anchored') {
    findings.push({ type:'CRITICAL', id:'propane', title:'💥 PROPANE TANK RUPTURE',
      msg:`Archimedes principle: 4,212 lbs upward buoyancy force at ${maxDepth}ft flood. Anchor missing. Tank displaced, severed gas line, ignited. Blast radius 50 m. Entire property destroyed.`, loss:25000 })
    totalLoss += 25000
  } else {
    findings.push({ type:'PASS', id:'propane', title:'✓ PROPANE: ANCHORED & BALLASTED',
      msg:`Water ballast + ground anchor resisted 4,212 lbs buoyancy force. Gas line intact. No rupture.` })
  }

  // Step 3 — FURNITURE
  const furn = items.find(i=>i.id==='furniture')
  if (furn.zone==='yard') {
    findings.push({ type:'FAIL', id:'furniture', title:'🪟 WINDOWS SMASHED — PROJECTILE',
      msg:`185-lb resin set reached ~80 mph in wind. Struck east windows. Structural breach allowed flood ingress into living space.`, loss:3500 })
    totalLoss += 3500
  } else if (furn.zone==='pool') {
    findings.push({ type:'PASS', id:'furniture', title:'✓ FURNITURE: SUBMERGED IN POOL',
      msg:`Controlled submersion. No wind exposure. Resin construction resists water damage. Zero loss.` })
  } else {
    findings.push({ type:'PASS', id:'furniture', title:'✓ FURNITURE: SECURED IN GARAGE',
      msg:`Protected from 80 mph wind. No damage.` })
  }

  // Step 4 — CHEMICALS
  const chem = items.find(i=>i.id==='fertilizer')
  const chemSafe = chem.state === 'shelved'
  if (!chemSafe) {
    findings.push({ type:'FAIL', id:'fertilizer', title:'☠ TOXIC CONTAMINATION',
      msg:`Nitrogen fertilizer + herbicides dissolved into floodwater. Created toxic nitrate + herbicide soup. Cannot be boiled safe. Requires EPA-grade decontamination.`, loss:8000 })
    totalLoss += 8000
  } else {
    findings.push({ type:'PASS', id:'fertilizer', title:'✓ CHEMICALS: ON HIGH SHELVES',
      msg:`Secured at ${(maxDepth+1.8).toFixed(1)} ft elevation — above the ${maxDepth}ft flood line. No contamination.` })
  }

  // Step 5 — MOWER (with the cascade TRAP)
  const mower = items.find(i=>i.id==='mower')
  if (mower.zone==='yard') {
    findings.push({ type:'FAIL', id:'mower', title:'🚜 MOWER DESTROYED IN YARD',
      msg:`Submerged in ${maxDepth}ft of floodwater. Engine oil + fuel contaminated water. All electrical systems shorted. $2,000 replacement.`, loss:2000 })
    totalLoss += 2000
  } else if (mower.zone==='garage' && mower.state==='elevated') {
    if (!drainClogged) {
      findings.push({ type:'PASS', id:'mower', title:'✓ MOWER: ELEVATED — SAFE',
        msg:`2 ft blocks cleared 3 ft flood. No damage.` })
    } else {
      findings.push({ type:'FAIL', id:'mower', title:'🚜 MOWER DESTROYED — CASCADE TRAP!',
        msg:`⚠ You elevated on 2 ft blocks (correct instinct) but LEFT THE DEBRIS UNSECURED. Clogged drains raised flood to 4.5 ft — exceeding the 2 ft blocks by 2.5 ft. LESSON: Clear debris FIRST, then elevate.`, loss:2000 })
      totalLoss += 2000
    }
  } else if (mower.zone==='garage') {
    findings.push({ type:'FAIL', id:'mower', title:'🚜 MOWER FLOOR-LEVEL DAMAGE',
      msg:`In garage but not elevated. Flood water entered garage floor. Partial damage to electrics.`, loss:1200 })
    totalLoss += 1200
  }

  // Step 6 — HVAC
  const hvac = items.find(i=>i.id==='hvac')
  if (hvac.state === 'grid_powered' && maxDepth >= 1.5) {
    findings.push({ type:'CRITICAL', id:'hvac', title:'⚡ HVAC ELECTRICAL SHORT',
      msg:`220V discharge through conductive floodwater. Arc flash created electrocution hazard throughout the yard. $5,000 repair + electrical remediation.`, loss:5000 })
    totalLoss += 5000
  } else if (hvac.state === 'isolated') {
    findings.push({ type:'PASS', id:'hvac', title:'✓ HVAC: ISOLATED',
      msg:`Outdoor breaker killed. No voltage in floodwater. No hazard.` })
  }

  const criticals = findings.filter(f=>f.type==='CRITICAL').length
  const fails     = findings.filter(f=>f.type==='FAIL').length
  const passed    = criticals===0 && fails===0
  const score     = Math.max(0, Math.round(100 - totalLoss / 400))

  return { findings, totalLoss, score, passed, maxDepth, drainClogged, criticals, fails }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
const INIT = {
  timeRemaining: 120,
  budget: 200,
  items: ITEMS_INIT,
  selectedId: null,
  phase: 'setup',
  simResult: null,
}

function reducer(s, a) {
  switch (a.type) {
    case 'SELECT':
      return { ...s, selectedId: s.selectedId === a.id ? null : a.id }

    case 'ACTION': {
      const def = ACTIONS[a.action]
      if (!def || s.timeRemaining < def.timeCost || s.budget < def.budgetCost) return s
      const items = s.items.map(item => {
        if (item.id !== a.itemId) return item
        switch (a.action) {
          case 'relocate_garage': return { ...item, zone:'garage',     state:'in_garage'  }
          case 'elevate_blocks':  return { ...item, state:'elevated'                      }
          case 'high_shelves':    return { ...item, zone:'high_shelf', state:'shelved'    }
          case 'throw_pool':      return { ...item, zone:'pool',       state:'pooled'     }
          case 'anchor_fill':     return { ...item, state:'anchored'                      }
          case 'bag_debris':      return { ...item, state:'secured',   zone:'secured'     }
          case 'kill_breaker':    return { ...item, state:'isolated'                      }
          default:                return item
        }
      })
      return { ...s, items, timeRemaining: s.timeRemaining - def.timeCost, budget: s.budget - def.budgetCost }
    }

    case 'SIMULATE': {
      const result = simulate(s.items)
      return { ...s, phase:'result', simResult: result }
    }

    case 'RESET': return { ...INIT, items: ITEMS_INIT.map(i => ({ ...i })) }
    default:      return s
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stateLabel(item) {
  switch (item.state) {
    case 'in_garage':   return { text:'IN GARAGE',  color:'#fbbf24' }
    case 'elevated':    return { text:'ELEVATED +2ft', color:'#22c55e' }
    case 'shelved':     return { text:'HIGH SHELF', color:'#22c55e' }
    case 'pooled':      return { text:'IN POOL',    color:'#3b82f6' }
    case 'anchored':    return { text:'ANCHORED',   color:'#22c55e' }
    case 'secured':     return { text:'BAGGED',     color:'#22c55e' }
    case 'isolated':    return { text:'ISOLATED',   color:'#22c55e' }
    case 'grid_powered':return { text:'LIVE 220V',  color:'#ef4444' }
    default:            return { text:'UNSECURED',  color:'#ef4444' }
  }
}

function isSecured(item) {
  return !['unsecured','grid_powered'].includes(item.state)
}

// ─── Map: assign positions by zone ────────────────────────────────────────────
function getPositions(items) {
  const counts = {}
  return items.map(item => {
    const zone = item.state === 'secured' ? 'secured_off' : item.zone
    const slots = ZONE_SLOTS[zone] || ZONE_SLOTS.yard
    const idx = counts[zone] ?? 0
    counts[zone] = idx + 1
    return { item, x: slots[idx]?.[0] ?? 100 + idx * 40, y: slots[idx]?.[1] ?? 350 }
  })
}

// ─── SVG Yard Map ─────────────────────────────────────────────────────────────
function YardMap({ items, selectedId, onSelect, simResult }) {
  const positions = getPositions(items)
  const flooding  = !!simResult

  return (
    <svg viewBox="0 0 700 480" style={{ width:'100%', height:'100%' }}>
      <defs>
        <linearGradient id="floodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1d4ed8" stopOpacity={simResult?.drainClogged ? '0.72' : '0.52'}/>
          <stop offset="100%" stopColor="#1e40af" stopOpacity={simResult?.drainClogged ? '0.52' : '0.38'}/>
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={700} height={480} fill="#080808"/>

      {/* Ground texture */}
      <rect width={700} height={480} fill="url(#grassPat)" opacity="0.4"/>

      {/* ── Zone fills ── */}
      {/* Yard */}
      <rect x={10} y={235} width={475} height={195} rx={4}
            fill="rgba(20,40,10,0.75)" stroke="#22c55e" strokeWidth={1.5} strokeDasharray="8,5"/>
      {/* Pool */}
      <rect x={10} y={75} width={175} height={160} rx={10}
            fill="rgba(29,78,216,0.22)" stroke="#3b82f6" strokeWidth={1.5}/>
      {/* Garage */}
      <rect x={490} y={75} width={195} height={265} rx={4}
            fill="rgba(42,32,8,0.85)" stroke="#f59e0b" strokeWidth={1.5}/>
      {/* High Shelves (inside garage) */}
      <rect x={500} y={84} width={175} height={78} rx={3}
            fill="rgba(80,60,0,0.35)" stroke="#fbbf24" strokeWidth={1} strokeDasharray="4,3"/>
      {/* Storm drain strip */}
      <rect x={10} y={437} width={475} height={32} rx={2}
            fill="rgba(14,165,233,0.18)" stroke="#0ea5e9" strokeWidth={1.5}/>

      {/* ── Zone labels ── */}
      <text x={18} y={255}  fill="#22c55e55" fontSize={9}  fontFamily="monospace" letterSpacing={2}>YARD</text>
      <text x={18} y={92}   fill="#3b82f655" fontSize={9}  fontFamily="monospace" letterSpacing={2}>POOL</text>
      <text x={498} y={92}  fill="#f59e0b66" fontSize={9}  fontFamily="monospace" letterSpacing={2}>GARAGE</text>
      <text x={508} y={102} fill="#fbbf24"   fontSize={8}  fontFamily="monospace">↑ HIGH SHELVES</text>
      <text x={160} y={456} fill="#0ea5e9"   fontSize={8}  fontFamily="monospace" textAnchor="middle">⚠ STORM DRAIN / FLOOD INGRESS</text>

      {/* Structure perimeter */}
      <line x1={10} y1={235} x2={485} y2={235} stroke="#334155" strokeWidth={1} strokeDasharray="6,4"/>
      <text x={170} y={230} fill="#334155" fontSize={8} fontFamily="monospace">STRUCTURE PERIMETER</text>

      {/* Driveway */}
      <rect x={490} y={340} width={195} height={80} fill="rgba(30,30,30,0.5)" stroke="#334155" strokeWidth={1}/>
      <text x={568} y={386} fill="#334155" fontSize={8} fontFamily="monospace" textAnchor="middle">DRIVEWAY</text>

      {/* ── Flood animation overlay ── */}
      {flooding && (
        <>
          <rect x={10} y={235} width={475} height={195}
                fill="url(#floodGrad)"
                style={{ animation:'flood-rise 2s ease-in-out' }}/>
          {simResult.drainClogged && (
            <text x={240} y={330} fill="#fbbf24" fontSize={14} fontFamily="monospace"
                  textAnchor="middle" fontWeight="bold"
                  style={{ animation:'glow-pulse 0.6s ease-in-out infinite' }}>
              ⚠ DRAINS CLOGGED — 4.5ft FLOOD
            </text>
          )}
          {/* Wave line */}
          <line x1={10} y1={simResult.drainClogged ? 255 : 270}
                x2={485} y2={simResult.drainClogged ? 255 : 270}
                stroke="#60a5fa" strokeWidth={2}
                style={{ animation:'wave-line 1s ease-in-out infinite alternate' }}/>
        </>
      )}

      {/* ── Items ── */}
      {positions.map(({ item, x, y }) => {
        if (item.state === 'secured') return null  // bagged debris off-map
        const isSel  = item.id === selectedId
        const safe   = isSecured(item)
        const lbl    = stateLabel(item)
        return (
          <g key={item.id} onClick={() => onSelect(item.id)} style={{ cursor:'pointer' }}>
            {/* Selection ring */}
            <circle cx={x} cy={y} r={24}
                    fill={isSel ? 'rgba(251,191,36,0.12)' : 'rgba(0,0,0,0.25)'}
                    stroke={isSel ? '#fbbf24' : safe ? '#22c55e55' : item.hc + '55'}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    style={isSel ? {animation:'glow-pulse 1s ease-in-out infinite'} : {}}/>
            {/* Icon */}
            <text x={x} y={y+6} fontSize={20} textAnchor="middle">{item.emoji}</text>
            {/* Status badge */}
            <text x={x+16} y={y-13} fontSize={11}>
              {safe ? '✅' : '⚠️'}
            </text>
            {/* Label below */}
            <text x={x} y={y+30} fontSize={8} textAnchor="middle"
                  fill={lbl.color} fontFamily="monospace">{lbl.text}</text>
          </g>
        )
      })}

      {/* Wind compass */}
      <g transform="translate(655, 450)">
        <circle cx={0} cy={0} r={18} fill="rgba(0,0,0,0.6)" stroke="#334155" strokeWidth={1}/>
        <text x={-5} y={5} fontSize={14} fill="#60a5fa">↙</text>
        <text x={-16} y={-10} fontSize={7} fill="#334155" fontFamily="monospace">80MPH</text>
      </g>

      {/* Flood depth scale */}
      <g transform="translate(657, 100)">
        <rect x={-8} y={-80} width={16} height={80} fill="rgba(30,64,175,0.12)" stroke="#3b82f6" strokeWidth={1}/>
        <rect x={-7} y={-80+50} width={14} height={30} fill="rgba(59,130,246,0.45)"/>
        <line x1={-8} y1={-80+50} x2={8} y2={-80+50} stroke="#60a5fa" strokeWidth={1.5}/>
        <text x={0} y={8}   fontSize={7} fill="#3b82f6" textAnchor="middle" fontFamily="monospace">FLOOD</text>
        <text x={0} y={17}  fontSize={9} fill="#60a5fa" textAnchor="middle" fontFamily="monospace" fontWeight="700">3 FT</text>
      </g>
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Module3_YardLockdown() {
  const { dispatch: gd } = useGame()
  const [s, dispatch]    = useReducer(reducer, { ...INIT, items: ITEMS_INIT.map(i=>({...i})) })
  const [hovAction, setHovAction] = useState(null)

  const selected = s.items.find(i => i.id === s.selectedId) ?? null
  const timePct  = s.timeRemaining / 120
  const timeColor= timePct > 0.5 ? '#22c55e' : timePct > 0.25 ? '#f59e0b' : '#ef4444'
  const secured  = s.items.filter(isSecured).length
  const total    = s.items.length

  const availActions = selected
    ? Object.entries(ACTIONS).filter(([,def]) => def.canDo(selected))
    : []

  function doAction(actionKey) {
    dispatch({ type:'ACTION', itemId: selected.id, action: actionKey })
  }

  function handleSimulate() {
    const result = simulate(s.items)
    dispatch({ type:'SIMULATE' })
    gd({ type:'RECORD_SCORE', payload:{ key:'flood-3', result:{ score: Math.min(100,Math.max(0,result.score)), passed: result.passed } } })
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (s.phase === 'intro') return null   // skip to setup directly

  // ── RESULT SCREEN ──────────────────────────────────────────────────────────
  if (s.phase === 'result' && s.simResult) {
    const r = s.simResult
    return (
      <div style={{ position:'fixed', inset:0, background:'#070707', fontFamily:MONO, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <style>{`
          @keyframes flood-rise{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}
          @keyframes glow-pulse{0%,100%{opacity:1}50%{opacity:.25}}
          @keyframes slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
          @keyframes wave-line{from{transform:translateY(0)}to{transform:translateY(4px)}}
        `}</style>

        {/* Header */}
        <div style={{ height:50, background:'#080808', borderBottom:'1px solid #111', display:'flex', alignItems:'center', padding:'0 20px', gap:16, flexShrink:0 }}>
          <div style={{ color: r.passed ? '#22c55e' : '#ef4444', fontSize:13, fontWeight:700, letterSpacing:2 }}>
            AFTER ACTION REPORT — {r.passed ? 'PROPERTY DEFENDED' : `${r.criticals} CRITICAL · ${r.fails} FAIL`}
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:12 }}>
            <button onClick={() => dispatch({ type:'RESET' })} style={{ padding:'7px 20px', borderRadius:3, fontFamily:MONO, fontSize:12, fontWeight:700, letterSpacing:2, cursor:'pointer', border:'1px solid #ef4444', background:'rgba(239,68,68,0.08)', color:'#ef4444' }}>↺ RETRY</button>
            <button onClick={() => gd({ type:'BACK_TO_MODULES' })} style={{ padding:'7px 16px', borderRadius:3, fontFamily:MONO, fontSize:11, cursor:'pointer', border:'1px solid #1e2d3a', background:'transparent', color:'#334155' }}>← MODULES</button>
          </div>
        </div>

        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* Map with flood overlay */}
          <div style={{ flex:1, padding:12 }}>
            <YardMap items={s.items} selectedId={null} onSelect={()=>{}} simResult={r}/>
          </div>

          {/* Findings panel */}
          <div style={{ width:380, background:'#080808', borderLeft:'1px solid #111', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            {/* Score */}
            <div style={{ padding:'16px 18px', borderBottom:'1px solid #111', textAlign:'center' }}>
              <div style={{ fontSize:9, color:'#2a4055', letterSpacing:3, marginBottom:6 }}>SIMULATION SCORE</div>
              <div style={{ fontSize:48, fontWeight:900, color: r.passed ? '#22c55e' : r.score > 50 ? '#f59e0b' : '#ef4444' }}>
                {r.score}%
              </div>
              <div style={{ fontSize:11, color:'#334155', marginTop:4 }}>
                Financial loss: <span style={{ color:'#ef4444', fontWeight:700 }}>${r.totalLoss.toLocaleString()}</span>
              </div>
              <div style={{ fontSize:10, color:'#1e3050', marginTop:2 }}>
                Flood depth: <span style={{ color: r.drainClogged ? '#ef4444' : '#3b82f6', fontWeight:700 }}>{r.maxDepth}ft</span>
                {r.drainClogged && <span style={{ color:'#ef4444' }}> (drains clogged)</span>}
              </div>
            </div>

            {/* Findings list */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:8, color:'#1e3050', letterSpacing:3, marginBottom:4 }}>FINDINGS</div>
              {r.findings.map((f, i) => {
                const bc = f.type==='CRITICAL' ? '#ef4444' : f.type==='FAIL' ? '#f97316' : f.type==='CASCADE' ? '#fbbf24' : '#22c55e'
                return (
                  <div key={i} style={{ background:'#0d0d0d', border:`1px solid ${bc}33`, borderLeft:`3px solid ${bc}`, borderRadius:4, padding:'10px 12px',
                                        animation:`slide-up 0.3s ease-out ${i*0.06}s both` }}>
                    <div style={{ color:bc, fontSize:11, fontWeight:700, marginBottom:5 }}>{f.title}</div>
                    <div style={{ color:'#647a8e', fontSize:10, lineHeight:1.65 }}>{f.msg}</div>
                    {f.loss > 0 && (
                      <div style={{ color:'#ef4444', fontSize:10, marginTop:5, fontWeight:700 }}>
                        💸 LOSS: ${f.loss.toLocaleString()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Key lesson */}
            {r.simResult?.drainClogged && !r.passed && (
              <div style={{ padding:'12px 16px', borderTop:'1px solid #111', background:'rgba(220,38,38,0.06)' }}>
                <div style={{ color:'#fbbf24', fontSize:9, letterSpacing:2, marginBottom:5 }}>📋 KEY LESSON</div>
                <div style={{ color:'#7a9ab8', fontSize:10, lineHeight:1.7 }}>
                  <b style={{color:'#f87171'}}>FEMA Stormwater Mgmt:</b> "Remove all loose organic material from drainage paths before a flood event. Even small quantities of mulch and leaves can fully block residential storm drains within minutes, converting a manageable 3ft flood into an unmanageable 4.5ft event."
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── SETUP / PLAY ────────────────────────────────────────────────────────────
  return (
    <div style={{ position:'fixed', inset:0, background:'#070707', fontFamily:MONO, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes flood-rise{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}
        @keyframes glow-pulse{0%,100%{opacity:1}50%{opacity:.22}}
        @keyframes slide-up{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes wave-line{from{transform:translateY(0)}to{transform:translateY(4px)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ height:50, background:'#080808', borderBottom:'1px solid #111', display:'flex', alignItems:'center', padding:'0 16px', gap:16, flexShrink:0 }}>
        <button onClick={() => gd({ type:'BACK_TO_MODULES' })} style={{ background:'none', border:'none', color:'#1e3050', fontFamily:MONO, fontSize:11, cursor:'pointer' }}>← EXIT</button>
        <div style={{ color:'#00e5ff', fontSize:12, fontWeight:700, letterSpacing:2 }}>M3 · YARD TRIAGE</div>
        <div style={{ fontSize:9, color:'#1e3050', letterSpacing:1 }}>SPATIAL LOGISTICS SIMULATOR · 120-MIN PRE-FLOOD WINDOW</div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:20 }}>
          {/* Time */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'#334155', fontSize:9, letterSpacing:1 }}>⏰ TIME</span>
            <div style={{ width:100, height:7, background:'#0a0a0a', border:'1px solid #141414', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, width:`${timePct*100}%`, background:timeColor, transition:'width 0.3s,background 0.3s' }}/>
            </div>
            <span style={{ color:timeColor, fontFamily:MONO, fontSize:13, fontWeight:700, minWidth:42 }}>{s.timeRemaining}m</span>
          </div>
          {/* Budget */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#334155', fontSize:9, letterSpacing:1 }}>💰</span>
            <span style={{ color:'#22c55e', fontFamily:MONO, fontSize:13, fontWeight:700 }}>${s.budget}</span>
          </div>
          {/* Progress */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'#334155', fontSize:9 }}>SECURED:</span>
            <span style={{ color: secured===total ? '#22c55e' : '#f59e0b', fontFamily:MONO, fontSize:12, fontWeight:700 }}>{secured}/{total}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN: Map + Ledger ── */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>

        {/* MAP */}
        <div style={{ flex:1, padding:10, display:'flex', alignItems:'stretch', minWidth:0 }}>
          <YardMap items={s.items} selectedId={s.selectedId}
                   onSelect={id => dispatch({ type:'SELECT', id })} simResult={null}/>
        </div>

        {/* LEDGER */}
        <div style={{ width:310, background:'#080808', borderLeft:'1px solid #111', display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Selected item detail */}
          {selected ? (
            <div style={{ padding:'14px 14px', borderBottom:'1px solid #111', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <span style={{ fontSize:24 }}>{selected.emoji}</span>
                <div>
                  <div style={{ color:selected.hc, fontSize:12, fontWeight:700 }}>{selected.name}</div>
                  <div style={{ color:stateLabel(selected).color, fontSize:9, letterSpacing:1 }}>{stateLabel(selected).text}</div>
                </div>
              </div>
              {/* Properties grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:8 }}>
                {[
                  ['WEIGHT',      `${selected.weight.toLocaleString()} lbs`],
                  ['BUOYANCY',    `${selected.buoyancy.toLocaleString()} lbs`],
                  ['CONTAMINANT', selected.contaminant],
                  ['WIND DRAG',   selected.windDrag],
                ].map(([k,v])=>(
                  <div key={k} style={{ background:'#0d0d0d', border:'1px solid #141414', borderRadius:3, padding:'5px 8px' }}>
                    <div style={{ color:'#2a4055', fontSize:8, letterSpacing:1 }}>{k}</div>
                    <div style={{ color: v==='CRITICAL'?'#ef4444':v==='HIGH'?'#f97316':v==='MEDIUM'?'#f59e0b':'#22c55e',
                                  fontSize:11, fontWeight:700, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:9.5, color:'#3a5068', lineHeight:1.65, borderTop:'1px solid #111', paddingTop:8 }}>{selected.desc}</div>
              {/* Hazard badge */}
              <div style={{ marginTop:8, display:'inline-block', padding:'3px 10px', borderRadius:12,
                            background:`${selected.hc}1a`, border:`1px solid ${selected.hc}55`,
                            color:selected.hc, fontSize:9, fontWeight:700, letterSpacing:1 }}>
                ⚠ {selected.hazard}
              </div>
            </div>
          ) : (
            <div style={{ padding:'14px 14px', borderBottom:'1px solid #111', flexShrink:0 }}>
              <div style={{ color:'#1e3050', fontSize:10, textAlign:'center', marginTop:8 }}>
                Click an item on the map to see details and available actions
              </div>
            </div>
          )}

          {/* Item list */}
          <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:5 }}>
            <div style={{ fontSize:8, color:'#1e3050', letterSpacing:3, marginBottom:4 }}>ITEM LEDGER</div>
            {s.items.map(item => {
              const lbl  = stateLabel(item)
              const isSel= item.id === s.selectedId
              return (
                <div key={item.id} onClick={() => dispatch({ type:'SELECT', id:item.id })}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:4, cursor:'pointer',
                           background: isSel ? 'rgba(251,191,36,0.06)' : '#0d0d0d',
                           border:`1px solid ${isSel ? '#fbbf2455' : '#141414'}`,
                           transition:'all 0.15s' }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{item.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                    <div style={{ fontSize:8, color:'#1e3050', marginTop:2 }}>{item.hazard}</div>
                  </div>
                  <div style={{ padding:'2px 8px', borderRadius:10, background:`${lbl.color}18`,
                                border:`1px solid ${lbl.color}44`, color:lbl.color, fontSize:8, fontWeight:700, flexShrink:0 }}>
                    {lbl.text}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ACTION DECK ── */}
      <div style={{ background:'#080808', borderTop:'2px solid #1a2535', padding:'10px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'stretch', gap:10 }}>

          {/* Available actions */}
          <div style={{ flex:1, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {selected ? (
              availActions.length > 0 ? (
                availActions.map(([key, def]) => {
                  const canAfford = s.timeRemaining >= def.timeCost && s.budget >= def.budgetCost
                  const isHov = hovAction === key
                  return (
                    <div key={key} style={{ position:'relative' }}>
                      {/* Tooltip */}
                      {isHov && (
                        <div style={{ position:'absolute', bottom:'100%', left:0, marginBottom:6, width:220, background:'#0d0d0d',
                                      border:'1px solid #1a2535', borderRadius:4, padding:'8px 10px', zIndex:10,
                                      fontSize:9, color:'#647a8e', lineHeight:1.6 }}>
                          {def.desc}
                        </div>
                      )}
                      <button
                        onClick={() => canAfford && doAction(key)}
                        onMouseEnter={() => setHovAction(key)}
                        onMouseLeave={() => setHovAction(null)}
                        disabled={!canAfford}
                        style={{
                          padding:'8px 14px', borderRadius:4, fontFamily:MONO, fontSize:11, fontWeight:700,
                          letterSpacing:1, cursor: canAfford ? 'pointer' : 'not-allowed',
                          border:`1px solid ${canAfford ? '#00e5ff44' : '#1a2535'}`,
                          background: canAfford ? 'rgba(0,229,255,0.05)' : 'rgba(0,0,0,0.3)',
                          color: canAfford ? '#00e5ff' : '#2a4055',
                          opacity: canAfford ? 1 : 0.45,
                          transition:'all 0.15s',
                          display:'flex', alignItems:'center', gap:6,
                        }}>
                        <span>{def.icon}</span>
                        <span>{def.label}</span>
                        <span style={{ marginLeft:4, padding:'1px 6px', borderRadius:8, background:'rgba(251,191,36,0.1)',
                                       border:'1px solid rgba(251,191,36,0.25)', color:canAfford?'#fbbf24':'#2a4055', fontSize:9 }}>
                          ⏰{def.timeCost}m{def.budgetCost>0?` 💰$${def.budgetCost}`:''}
                        </span>
                      </button>
                    </div>
                  )
                })
              ) : (
                <div style={{ color:'#22c55e', fontSize:11, fontFamily:MONO, padding:'8px 14px',
                              border:'1px solid #22c55e33', borderRadius:4, background:'rgba(34,197,94,0.05)' }}>
                  ✓ {selected.name} — No further actions needed
                </div>
              )
            ) : (
              <div style={{ color:'#1e3050', fontSize:10, padding:'8px 14px' }}>
                ← Select an item on the map to see available actions
              </div>
            )}
          </div>

          {/* Simulate button */}
          <button onClick={handleSimulate}
            style={{ padding:'10px 24px', borderRadius:4, fontFamily:MONO, fontSize:13, fontWeight:700,
                     letterSpacing:2, cursor:'pointer', flexShrink:0, alignSelf:'center',
                     border:'2px solid #ef4444', background:'rgba(239,68,68,0.08)', color:'#ef4444',
                     boxShadow:'0 0 16px rgba(239,68,68,0.2)' }}>
            ▶ SIMULATE LANDFALL
          </button>
        </div>

        {/* Time used bar */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          <span style={{ fontSize:8, color:'#1e3050', letterSpacing:1 }}>TIME USED</span>
          <div style={{ flex:1, height:4, background:'#0a0a0a', border:'1px solid #141414', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:2, width:`${(1-timePct)*100}%`, background:timeColor, transition:'width 0.3s' }}/>
          </div>
          <span style={{ color:'#2a4055', fontSize:8 }}>{120-s.timeRemaining}m used</span>
          <span style={{ color:timeColor, fontSize:8, fontWeight:700 }}>{s.timeRemaining}m remaining</span>
        </div>
      </div>
    </div>
  )
}
