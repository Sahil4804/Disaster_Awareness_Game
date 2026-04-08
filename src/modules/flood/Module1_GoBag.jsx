/**
 * Module 1 -- The Go-Bag: Knapsack Problem Simulator
 * Aesthetic: Gritty, minimalist tactical grid. Dark grays, high-contrast data text.
 * No cartoon icons; stark utilitarian silhouettes. ASCII category markers.
 */
import { useReducer, useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

/* ================================================================
   CONSTANTS
   ================================================================ */
const WEIGHT_LIMIT = 25   // lbs
const VOLUME_LIMIT = 40   // liters
const TIMER_SECONDS = 60

/* ================================================================
   ITEM CATALOGUE  (~30 items)
   Every item: { id, name, weight, volume, calorie, sterility, utility, trap, tip }
   Categories: WATER, FOOD, MEDICAL, TOOLS, SHELTER, COMMS, NAV
   ================================================================ */
const CATALOGUE = [
  // ── WATER ──────────────────────────────────────────────────────
  { id:'w1', name:'Water Jug (1 gal)',       cat:'WATER',   weight:8.34,  volume:3.8,  calorie:0,    sterility:0.3,  utility:22,  trap:true,
    tip:'8.34 lbs PER gallon. One jug eats a third of your weight budget. A classic trap.' },
  { id:'w2', name:'Water Jugs (2 gal)',      cat:'WATER',   weight:16.68, volume:7.6,  calorie:0,    sterility:0.3,  utility:30,  trap:true,
    tip:'16.68 lbs -- 67% of budget gone. You cannot run. You will drown.' },
  { id:'w3', name:'LifeStraw Filter',        cat:'WATER',   weight:0.10,  volume:0.3,  calorie:0,    sterility:0.92, utility:96,  trap:false,
    tip:'0.1 lbs, filters 1,000 gallons of ANY water. Outweighs 10 jugs in value.' },
  { id:'w4', name:'Aquatabs (50ct)',          cat:'WATER',   weight:0.05,  volume:0.1,  calorie:0,    sterility:0.88, utility:88,  trap:false,
    tip:'0.05 lbs, 50 treatments. Kills cholera and typhoid in floodwater.' },
  { id:'w5', name:'Sawyer Mini Filter',      cat:'WATER',   weight:0.25,  volume:0.4,  calorie:0,    sterility:0.90, utility:92,  trap:false,
    tip:'100,000 gal lifetime. 4oz. Attaches to any bottle. Essential water security.' },
  { id:'w6', name:'Collapsible 2L Bladder',  cat:'WATER',   weight:0.09,  volume:0.2,  calorie:0,    sterility:0.10, utility:42,  trap:false,
    tip:'3oz empty. Fill from any flood source, then filter. Perfect pairing.' },

  // ── FOOD ───────────────────────────────────────────────────────
  { id:'f1', name:'Canned Beans x6',         cat:'FOOD',    weight:9.00,  volume:5.0,  calorie:1500, sterility:0,    utility:32,  trap:true,
    tip:'9 lbs of cans. 166 cal/lb. Cans crack under debris. Poor density. Leave them.' },
  { id:'f2', name:'Canned Tuna x4',          cat:'FOOD',    weight:2.40,  volume:1.8,  calorie:800,  sterility:0,    utility:52,  trap:false,
    tip:'Decent protein but liquid-heavy. Better high-density options exist.' },
  { id:'f3', name:'Energy Bars 6-pack',      cat:'FOOD',    weight:0.75,  volume:0.8,  calorie:1500, sterility:0,    utility:74,  trap:false,
    tip:'2,000 cal/lb. No prep, no utensils. Engineered for high-exertion survival.' },
  { id:'f4', name:'Freeze-Dried Meals x3',   cat:'FOOD',    weight:0.90,  volume:1.2,  calorie:1800, sterility:0,    utility:85,  trap:false,
    tip:'3-day supply. 2,000 cal/lb. Just add water. Complete macronutrient balance.' },
  { id:'f5', name:'Trail Mix 2lb',           cat:'FOOD',    weight:2.00,  volume:1.5,  calorie:3200, sterility:0,    utility:66,  trap:false,
    tip:'1,600 cal/lb. High fat for sustained exertion. Zero preparation required.' },

  // ── MEDICAL ────────────────────────────────────────────────────
  { id:'m1', name:'Full First Aid Kit (Lg)', cat:'MEDICAL', weight:3.50,  volume:4.0,  calorie:0,    sterility:0.60, utility:52,  trap:true,
    tip:'3.5 lbs. Most contents irrelevant in acute flood evacuation. Over-engineered.' },
  { id:'m2', name:'IFAK Trauma Kit',         cat:'MEDICAL', weight:0.75,  volume:1.0,  calorie:0,    sterility:0.95, utility:90,  trap:false,
    tip:'Tourniquet, chest seal, hemostatic gauze. Addresses top 3 survivable traumas.' },
  { id:'m3', name:'Personal Medications',    cat:'MEDICAL', weight:0.30,  volume:0.3,  calorie:0,    sterility:0.50, utility:96,  trap:false,
    tip:'Rx prescriptions cannot be sourced post-disaster. Irreplaceable. Pack FIRST.' },
  { id:'m4', name:'N95 Masks x10',           cat:'MEDICAL', weight:0.20,  volume:0.4,  calorie:0,    sterility:0.40, utility:72,  trap:false,
    tip:'Post-flood: mold spores, sewage aerosol, ash. Respiratory protection critical.' },

  // ── TOOLS ──────────────────────────────────────────────────────
  { id:'t1', name:'Full Mechanic Toolkit',   cat:'TOOLS',   weight:15.0,  volume:12.0, calorie:0,    sterility:0,    utility:12,  trap:true,
    tip:'15 lbs of car-camping gear. Cannot carry long distances. DO NOT PACK.' },
  { id:'t2', name:'Leatherman Multi-Tool',   cat:'TOOLS',   weight:0.55,  volume:0.3,  calorie:0,    sterility:0,    utility:90,  trap:false,
    tip:'25 functions. 0.55 lbs. Cuts rope, pries debris, opens cans. Essential.' },
  { id:'t3', name:'Paracord 100ft',          cat:'TOOLS',   weight:0.40,  volume:0.5,  calorie:0,    sterility:0,    utility:76,  trap:false,
    tip:'550 lb test. Lashing, shelter, tourniquet, clothesline. 40+ field uses.' },
  { id:'t4', name:'Waterproof Firestarter',  cat:'TOOLS',   weight:0.15,  volume:0.2,  calorie:0,    sterility:0,    utility:80,  trap:false,
    tip:'Windproof lighter + waterproof matches + tinder. Heat, signaling, boiling.' },
  { id:'t5', name:'Glass Breaker + Seatbelt',cat:'TOOLS',   weight:0.08,  volume:0.1,  calorie:0,    sterility:0,    utility:72,  trap:false,
    tip:'47% of flood deaths involve trapped vehicles. This tool saves lives. 0.08 lbs.' },

  // ── SHELTER ────────────────────────────────────────────────────
  { id:'s1', name:'6-Person Family Tent',    cat:'SHELTER', weight:18.0,  volume:20.0, calorie:0,    sterility:0,    utility:18,  trap:true,
    tip:'18 lbs, 20L volume. Car camping gear. Impossible to carry during rapid evac.' },
  { id:'s2', name:'Emergency Bivvy Sack',    cat:'SHELTER', weight:0.50,  volume:0.6,  calorie:0,    sterility:0,    utility:84,  trap:false,
    tip:'Reflects 80% body heat. Waterproof. 8oz. Single-person hypothermia prevention.' },
  { id:'s3', name:'Lightweight Tarp 8x10',   cat:'SHELTER', weight:1.00,  volume:1.5,  calorie:0,    sterility:0,    utility:80,  trap:false,
    tip:'1 lb. 100+ rigging configs with paracord. Group shelter from rain and wind.' },

  // ── COMMS ──────────────────────────────────────────────────────
  { id:'c1', name:'Hand-Crank NOAA Radio',   cat:'COMMS',   weight:0.85,  volume:1.0,  calorie:0,    sterility:0,    utility:84,  trap:false,
    tip:'Solar + hand-crank power. Receives emergency broadcasts when towers are down.' },
  { id:'c2', name:'Power Bank 20,000mAh',    cat:'COMMS',   weight:1.10,  volume:0.8,  calorie:0,    sterility:0,    utility:74,  trap:false,
    tip:'6 full phone charges. Critical for SOS calls and navigation apps.' },
  { id:'c3', name:'Satellite Messenger',     cat:'COMMS',   weight:0.35,  volume:0.3,  calorie:0,    sterility:0,    utility:92,  trap:false,
    tip:'2-way messaging + SOS via satellite. Works with ZERO cell infrastructure.' },

  // ── NAV ────────────────────────────────────────────────────────
  { id:'n1', name:'Topo Map + Compass',      cat:'NAV',     weight:0.20,  volume:0.3,  calorie:0,    sterility:0,    utility:96,  trap:false,
    tip:'No battery. No signal needed. Laminated waterproof map. Absolute baseline.' },
  { id:'n2', name:'Handheld GPS Unit',       cat:'NAV',     weight:0.45,  volume:0.4,  calorie:0,    sterility:0,    utility:72,  trap:false,
    tip:'Battery-dependent. Accurate to 3m. Supplement to, never replace, paper nav.' },
]

const CATEGORIES = ['ALL','WATER','FOOD','MEDICAL','TOOLS','SHELTER','COMMS','NAV']

const CAT_TAG = {
  WATER:'[W]', FOOD:'[F]', MEDICAL:'[M]', TOOLS:'[T]',
  SHELTER:'[S]', COMMS:'[C]', NAV:'[N]',
}

/* ================================================================
   BAG REDUCER
   State: { bagItems, bagWeight, bagVolume, utilityScore, mobilityPenalty }
   Actions: ADD_ITEM, REMOVE_ITEM, CLEAR_BAG
   ================================================================ */
function recalc(items) {
  const bagWeight  = parseFloat(items.reduce((s, i) => s + i.weight, 0).toFixed(2))
  const bagVolume  = parseFloat(items.reduce((s, i) => s + i.volume, 0).toFixed(2))
  const utilityScore = items.length
    ? Math.round(items.reduce((s, i) => s + i.utility, 0) / items.length)
    : 0
  const mobilityPenalty = bagWeight > WEIGHT_LIMIT
  return { bagItems: items, bagWeight, bagVolume, utilityScore, mobilityPenalty }
}

const bagInitialState = {
  bagItems: [],
  bagWeight: 0,
  bagVolume: 0,
  utilityScore: 0,
  mobilityPenalty: false,
}

function bagReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      if (state.bagItems.find(i => i.id === action.payload.id)) return state
      return recalc([...state.bagItems, action.payload])
    }
    case 'REMOVE_ITEM': {
      return recalc(state.bagItems.filter(i => i.id !== action.payload))
    }
    case 'CLEAR_BAG': {
      return { ...bagInitialState }
    }
    default:
      return state
  }
}

/* ================================================================
   SCORING
   ================================================================ */
const ESSENTIAL_IDS = ['w3','m2','t2','n1']

function computeScore(bagState) {
  const { bagItems, bagWeight, mobilityPenalty } = bagState
  const ids = bagItems.map(i => i.id)

  const hasCat = cat => bagItems.some(i => i.cat === cat)
  const hasWaterFilter = bagItems.some(i => ['w3','w4','w5'].includes(i.id))
  const hasEssentials = ESSENTIAL_IDS.every(id => ids.includes(id))

  // Hard-fail conditions
  if (mobilityPenalty) {
    const raw = Math.max(0, Math.round(40 - (bagWeight - WEIGHT_LIMIT) * 3))
    return {
      score: raw, passed: false, mobilityPenalty: true,
      headline: 'BAG TOO HEAVY -- YOU COULD NOT RUN',
      lesson: `Your bag weighed ${bagWeight.toFixed(1)} lbs -- over the ${WEIGHT_LIMIT} lb limit. In a flash flood you cannot outrun rising water carrying that load.`,
    }
  }
  if (!hasCat('WATER')) return {
    score: 15, passed: false, mobilityPenalty: false,
    headline: 'NO WATER -- DEHYDRATION KILLS',
    lesson: 'You packed zero water solutions. The body survives 3 days without water in ideal conditions -- far less under exertion in humid flood conditions.',
  }
  if (!hasCat('MEDICAL')) return {
    score: 25, passed: false, mobilityPenalty: false,
    headline: 'NO MEDICAL SUPPLIES',
    lesson: 'Flood debris causes lacerations. Floodwater carries Vibrio, E. coli, and Hepatitis A. Untreated wounds in contaminated water cause fatal sepsis within 48-72 hours.',
  }
  if (!hasCat('NAV')) return {
    score: 30, passed: false, mobilityPenalty: false,
    headline: 'NO NAVIGATION -- YOU GOT LOST',
    lesson: 'Cell networks fail during disasters. Without a paper map you have no backup when GPS and phone data go dark.',
  }

  // Composite score
  const waterScore    = hasWaterFilter ? 100 : 50
  const mobilityScore = Math.round(((WEIGHT_LIMIT - bagWeight) / WEIGHT_LIMIT) * 100)
  const utilScore     = bagItems.length
    ? Math.round(bagItems.reduce((s, i) => s + i.utility, 0) / bagItems.length)
    : 0
  const essentialBonus = hasEssentials ? 10 : 0
  const total = Math.min(100, Math.max(40,
    Math.round(waterScore * 0.30 + mobilityScore * 0.25 + utilScore * 0.25 + essentialBonus * 2)
  ))
  const passed = total >= 55

  return {
    score: total,
    passed,
    mobilityPenalty: false,
    headline: passed ? 'BAG VALIDATED -- DEPLOYMENT READY' : 'BAG SUBOPTIMAL -- REVIEW LOADOUT',
    lesson: passed
      ? `Smart loadout. ${bagWeight.toFixed(1)} lbs packed.${hasWaterFilter ? ' Water filter secured.' : ''}${hasEssentials ? ' All essentials covered.' : ''}`
      : `Score ${total}/100.${bagItems.filter(i=>i.trap).length ? ` You packed ${bagItems.filter(i=>i.trap).length} trap item(s) that cost you weight.` : ''}${!hasWaterFilter ? ' A LifeStraw (0.1 lbs) would replace heavy water jugs.' : ''}`,
  }
}

/* ================================================================
   KEYFRAMES (minimal, no rain)
   ================================================================ */
const KEYFRAMES = `
@keyframes m1-blink {
  0%,100% { opacity:1; }
  50% { opacity:0.3; }
}
@keyframes m1-slidein {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}
`

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function Module1_GoBag() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro')          // intro | pack | result
  const [bagState, bagDispatch] = useReducer(bagReducer, bagInitialState)
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [activeCat, setActiveCat] = useState('ALL')
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)
  const hasFinalized = useRef(false)

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'pack') return
    hasFinalized.current = false
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          // defer finalize to avoid dispatching during render
          setTimeout(() => { if (!hasFinalized.current) finalize() }, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Finalize ─────────────────────────────────────────────────────────────
  const finalize = useCallback(() => {
    if (hasFinalized.current) return
    hasFinalized.current = true
    clearInterval(timerRef.current)
    const res = computeScore(bagState)
    setResult(res)
    gameDispatch({
      type: 'RECORD_SCORE',
      payload: {
        key: 'flood-1',
        result: { score: res.score, passed: res.passed, mobilityPenalty: res.mobilityPenalty },
      },
    })
    setPhase('result')
  }, [bagState, gameDispatch])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleToggle(item) {
    const inBag = bagState.bagItems.find(i => i.id === item.id)
    if (inBag) {
      bagDispatch({ type: 'REMOVE_ITEM', payload: item.id })
    } else {
      bagDispatch({ type: 'ADD_ITEM', payload: item })
    }
  }

  function handleRetry() {
    bagDispatch({ type: 'CLEAR_BAG' })
    setTimeLeft(TIMER_SECONDS)
    setResult(null)
    setActiveCat('ALL')
    hasFinalized.current = false
    setPhase('intro')
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const visibleItems = activeCat === 'ALL' ? CATALOGUE : CATALOGUE.filter(i => i.cat === activeCat)
  const bagIds = bagState.bagItems.map(i => i.id)
  const weightPct = Math.min(100, (bagState.bagWeight / WEIGHT_LIMIT) * 100)
  const volumePct = Math.min(100, (bagState.bagVolume / VOLUME_LIMIT) * 100)
  const timerColor = timeLeft <= 15 ? '#ef4444' : timeLeft <= 30 ? '#eab308' : '#22c55e'

  /* ──────────────────────────────────────────────────────────────────────────
     STYLES  (inline, dark tactical theme: #0f172a / #1e293b)
     ────────────────────────────────────────────────────────────────────────── */
  const S = {
    page: {
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: "'Courier New', Courier, monospace",
      position: 'relative',
    },
    header: {
      position: 'sticky', top: 0, zIndex: 50,
      background: '#0f172a',
      borderBottom: '1px solid #334155',
      padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 280px',
      gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto',
    },
    panel: {
      background: '#1e293b',
      border: '1px solid #334155',
      padding: 14,
      position: 'sticky', top: 56,
    },
    bar: (pct, color) => ({
      height: 8,
      background: '#0f172a',
      border: '1px solid #334155',
      marginBottom: 8,
      position: 'relative',
      overflow: 'hidden',
    }),
    barFill: (pct, color) => ({
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: `${pct}%`,
      background: color,
      transition: 'width 0.3s',
    }),
    catBtn: (active) => ({
      padding: '4px 10px',
      background: active ? '#475569' : '#1e293b',
      color: active ? '#f8fafc' : '#94a3b8',
      border: active ? '1px solid #64748b' : '1px solid #334155',
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 11, fontWeight: 700, cursor: 'pointer',
    }),
    tableHead: {
      display: 'grid',
      gridTemplateColumns: '40px 1fr 55px 50px 55px 50px 50px 60px',
      gap: 4, padding: '6px 8px',
      background: '#1e293b',
      borderBottom: '1px solid #475569',
      fontSize: 10, fontWeight: 700, color: '#94a3b8',
      letterSpacing: 0.5,
      position: 'sticky', top: 42, zIndex: 5,
    },
    tableRow: (inBag, trap) => ({
      display: 'grid',
      gridTemplateColumns: '40px 1fr 55px 50px 55px 50px 50px 60px',
      gap: 4, padding: '7px 8px',
      background: inBag ? (trap ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.06)') : 'transparent',
      borderBottom: '1px solid #1e293b',
      fontSize: 12, color: '#cbd5e1',
      cursor: 'pointer',
      transition: 'background 0.15s',
      alignItems: 'center',
    }),
    btn: (bg, color) => ({
      padding: '10px 28px', border: '1px solid #475569',
      background: bg, color: color,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 13, fontWeight: 700, cursor: 'pointer',
      letterSpacing: 1,
    }),
  }

  /* ====================================================================
     PHASE: INTRO
     ==================================================================== */
  if (phase === 'intro') {
    return (
      <div style={{
        ...S.page,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}>
        <style>{KEYFRAMES}</style>

        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          {/* Alert bar */}
          <div style={{
            display: 'inline-block',
            background: 'rgba(239,68,68,0.15)', border: '1px solid #dc2626',
            padding: '6px 18px', marginBottom: 24,
            fontSize: 12, fontWeight: 700, color: '#ef4444', letterSpacing: 2,
            animation: 'm1-blink 1.2s infinite',
          }}>
            FLASH FLOOD WARNING IN EFFECT
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#f8fafc', marginBottom: 8, letterSpacing: 1 }}>
            MODULE 1: THE GO-BAG
          </h1>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4, letterSpacing: 1 }}>
            KNAPSACK PROBLEM -- RESOURCE ALLOCATION SIMULATOR
          </p>

          <div style={{
            margin: '24px 0', padding: 20,
            background: '#1e293b', border: '1px solid #334155',
            textAlign: 'left', fontSize: 13, color: '#94a3b8', lineHeight: 2,
          }}>
            <div>{'>'} Flash flood approaching. You have <span style={{ color: '#eab308', fontWeight: 700 }}>60 seconds</span> to pack.</div>
            <div>{'>'} Weight limit: <span style={{ color: '#eab308', fontWeight: 700 }}>{WEIGHT_LIMIT} lbs</span>. Volume limit: <span style={{ color: '#eab308', fontWeight: 700 }}>{VOLUME_LIMIT}L</span>.</div>
            <div>{'>'} Exceeding weight triggers <span style={{ color: '#ef4444', fontWeight: 700 }}>MOBILITY PENALTY</span>.</div>
            <div>{'>'} Secure water, medical, and navigation.</div>
            <div>{'>'} Watch for <span style={{ color: '#ef4444' }}>TRAP</span> items -- heavy, low utility-per-lb.</div>
            <div>{'>'} Maximize utility score while staying mobile.</div>
          </div>

          <button
            onClick={() => setPhase('pack')}
            style={{
              ...S.btn('#dc2626', '#fff'),
              padding: '14px 48px', fontSize: 15,
              border: '1px solid #ef4444',
            }}
          >
            BEGIN EVACUATION
          </button>
        </div>
      </div>
    )
  }

  /* ====================================================================
     PHASE: RESULT
     ==================================================================== */
  if (phase === 'result' && result) {
    const traps  = bagState.bagItems.filter(i => i.trap)
    const smart  = bagState.bagItems.filter(i => !i.trap)
    const missedEssentials = ESSENTIAL_IDS.filter(id => !bagIds.includes(id))
    const passColor  = result.passed ? '#22c55e' : '#ef4444'

    return (
      <div style={{ ...S.page, padding: 32 }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth: 780, margin: '0 auto', animation: 'm1-slidein 0.4s ease-out' }}>

          {/* Headline */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-block', padding: '6px 20px',
              border: `1px solid ${passColor}`, color: passColor,
              fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 12,
            }}>
              {result.passed ? 'PASS' : 'FAIL'}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: passColor, letterSpacing: 1, marginBottom: 6 }}>
              {result.headline}
            </h1>
          </div>

          {/* Score + Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '120px 1fr', gap: 24,
            marginBottom: 28, alignItems: 'start',
          }}>
            {/* Score gauge */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                border: `3px solid ${passColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
                boxShadow: `0 0 16px ${passColor}44`,
              }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#f8fafc' }}>{result.score}</span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1 }}>SCORE / 100</div>
            </div>
            {/* Stats */}
            <div style={{
              background: '#1e293b', border: '1px solid #334155', padding: 14,
              fontSize: 12, color: '#94a3b8', lineHeight: 2.0,
            }}>
              <div>WEIGHT   : <span style={{ color: '#f8fafc', fontWeight: 700 }}>{bagState.bagWeight.toFixed(1)} / {WEIGHT_LIMIT} lbs</span></div>
              <div>VOLUME   : <span style={{ color: '#f8fafc', fontWeight: 700 }}>{bagState.bagVolume.toFixed(1)} / {VOLUME_LIMIT} L</span></div>
              <div>ITEMS    : <span style={{ color: '#f8fafc', fontWeight: 700 }}>{bagState.bagItems.length}</span></div>
              <div>UTILITY  : <span style={{ color: '#f8fafc', fontWeight: 700 }}>{bagState.utilityScore}</span></div>
              <div>MOBILITY : <span style={{ color: bagState.mobilityPenalty ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
                {bagState.mobilityPenalty ? 'PENALTY ACTIVE' : 'OK'}
              </span></div>
              <div>SMART    : <span style={{ color: '#22c55e', fontWeight: 700 }}>{smart.length}</span>  |  TRAPS : <span style={{ color: '#ef4444', fontWeight: 700 }}>{traps.length}</span></div>
              {missedEssentials.length > 0 && (
                <div>MISSING  : <span style={{ color: '#eab308' }}>{missedEssentials.map(id => {
                  const it = CATALOGUE.find(c => c.id === id)
                  return it ? it.name : id
                }).join(', ')}</span></div>
              )}
            </div>
          </div>

          {/* Smart vs Trap columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 10, letterSpacing: 1 }}>
                SMART PICKS
              </div>
              {smart.length === 0
                ? <div style={{ fontSize: 11, color: '#64748b' }}>None.</div>
                : smart.map(item => (
                  <div key={item.id} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{CAT_TAG[item.cat]}</span> {item.name}
                    <span style={{ color: '#475569' }}> -- {item.weight}lb, U:{item.utility}</span>
                  </div>
                ))
              }
            </div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 10, letterSpacing: 1 }}>
                TRAP ITEMS PACKED
              </div>
              {traps.length === 0
                ? <div style={{ fontSize: 11, color: '#22c55e' }}>None -- excellent trap avoidance.</div>
                : traps.map(item => (
                  <div key={item.id} style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, lineHeight: 1.5 }}>
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{CAT_TAG[item.cat]}</span> {item.name}
                    <span style={{ color: '#475569' }}> -- {item.weight}lb, U:{item.utility}</span>
                    <div style={{ fontSize: 10, color: '#64748b', paddingLeft: 20 }}>{item.tip}</div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Lesson */}
          <div style={{
            background: result.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${passColor}33`,
            padding: 14, marginBottom: 28, fontSize: 12, lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 700, color: passColor, marginBottom: 4, fontSize: 10, letterSpacing: 1 }}>
              KEY LESSON
            </div>
            <div style={{ color: '#cbd5e1' }}>{result.lesson}</div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleRetry} style={S.btn('transparent', '#94a3b8')}>
              RETRY
            </button>
            <button
              onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })}
              style={S.btn('#1e40af', '#f8fafc')}
            >
              BACK TO MODULES
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ====================================================================
     PHASE: PACK  (main gameplay)
     ==================================================================== */
  return (
    <div style={S.page}>
      <style>{KEYFRAMES}</style>

      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <div style={{
        ...S.header,
        borderBottomColor: timeLeft <= 15 ? '#dc2626' : '#334155',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: 1,
            padding: '3px 8px', border: '1px solid #dc2626',
            animation: 'm1-blink 1s infinite',
          }}>
            FLASH FLOOD -- EVACUATE NOW
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>MODULE 1: GO-BAG</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Timer */}
          <div style={{
            fontSize: 18, fontWeight: 900, color: timerColor, letterSpacing: 2,
            fontFamily: "'Courier New', Courier, monospace",
            animation: timeLeft <= 15 ? 'm1-blink 0.5s infinite' : 'none',
          }}>
            {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
          </div>
          {/* Weight summary */}
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'Courier New', Courier, monospace" }}>
            <span style={{ color: bagState.bagWeight > WEIGHT_LIMIT ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
              {bagState.bagWeight.toFixed(1)}
            </span>
            <span style={{ color: '#475569' }}> / {WEIGHT_LIMIT}lb</span>
          </div>
        </div>
      </div>

      {/* ── Main Grid: Items | Bag Panel ──────────────────────────────── */}
      <div style={S.grid}>
        {/* ── LEFT: Item Catalogue ─────────────────────────────────────── */}
        <div>
          {/* Category filter row */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                style={S.catBtn(activeCat === cat)}
              >
                {cat === 'ALL' ? 'ALL' : `${CAT_TAG[cat]} ${cat}`}
              </button>
            ))}
          </div>

          {/* Table header */}
          <div style={S.tableHead}>
            <span>CAT</span>
            <span>NAME</span>
            <span>WT(lb)</span>
            <span>VOL(L)</span>
            <span>CAL</span>
            <span>STER</span>
            <span>UTIL</span>
            <span>STATUS</span>
          </div>

          {/* Table rows */}
          <div style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>
            {visibleItems.map(item => {
              const inBag = bagIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item)}
                  style={S.tableRow(inBag, item.trap)}
                  title={item.tip}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = inBag
                      ? (item.trap ? 'rgba(234,179,8,0.14)' : 'rgba(34,197,94,0.12)')
                      : '#1e293b'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = inBag
                      ? (item.trap ? 'rgba(234,179,8,0.08)' : 'rgba(34,197,94,0.06)')
                      : 'transparent'
                  }}
                >
                  {/* Category tag */}
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: item.trap ? '#eab308' : '#64748b',
                  }}>
                    {CAT_TAG[item.cat]}
                  </span>

                  {/* Name */}
                  <span style={{
                    fontWeight: 600,
                    color: inBag ? '#f8fafc' : '#cbd5e1',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.trap && <span style={{ color: '#ef4444', fontSize: 9, fontWeight: 700, marginRight: 4 }}>TRAP</span>}
                    {item.name}
                  </span>

                  {/* Weight */}
                  <span style={{
                    color: item.weight >= 5 ? '#ef4444' : item.weight >= 2 ? '#eab308' : '#22c55e',
                    fontWeight: 700, fontSize: 11, textAlign: 'right',
                  }}>
                    {item.weight.toFixed(2)}
                  </span>

                  {/* Volume */}
                  <span style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right' }}>
                    {item.volume.toFixed(1)}
                  </span>

                  {/* Calories */}
                  <span style={{ color: item.calorie > 0 ? '#fbbf24' : '#334155', fontSize: 11, textAlign: 'right' }}>
                    {item.calorie || '--'}
                  </span>

                  {/* Sterility */}
                  <span style={{ color: item.sterility > 0.5 ? '#38bdf8' : '#334155', fontSize: 11, textAlign: 'right' }}>
                    {item.sterility > 0 ? item.sterility.toFixed(2) : '--'}
                  </span>

                  {/* Utility */}
                  <span style={{
                    color: item.utility >= 80 ? '#22c55e' : item.utility >= 50 ? '#eab308' : '#ef4444',
                    fontWeight: 700, fontSize: 11, textAlign: 'right',
                  }}>
                    {item.utility}
                  </span>

                  {/* Status */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, textAlign: 'center',
                    color: inBag ? '#22c55e' : '#475569',
                  }}>
                    {inBag ? '[PACKED]' : '[ ADD ]'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── RIGHT: Bag Panel ─────────────────────────────────────────── */}
        <div style={S.panel}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc', letterSpacing: 1, marginBottom: 12 }}>
            GO-BAG STATUS
          </div>

          {/* Weight bar */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
              <span>WEIGHT</span>
              <span style={{
                color: bagState.bagWeight > WEIGHT_LIMIT ? '#ef4444' : '#22c55e',
                fontWeight: 700,
              }}>
                {bagState.bagWeight.toFixed(1)} / {WEIGHT_LIMIT} lb
              </span>
            </div>
            <div style={S.bar(weightPct, '#22c55e')}>
              <div style={S.barFill(weightPct, weightPct > 100 ? '#ef4444' : weightPct > 80 ? '#eab308' : '#22c55e')} />
            </div>
          </div>

          {/* Volume bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>
              <span>VOLUME</span>
              <span style={{
                color: bagState.bagVolume > VOLUME_LIMIT ? '#ef4444' : '#38bdf8',
                fontWeight: 700,
              }}>
                {bagState.bagVolume.toFixed(1)} / {VOLUME_LIMIT} L
              </span>
            </div>
            <div style={S.bar(volumePct, '#38bdf8')}>
              <div style={S.barFill(volumePct, volumePct > 100 ? '#ef4444' : '#38bdf8')} />
            </div>
          </div>

          {/* Utility Score */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 10,
            color: '#94a3b8', marginBottom: 6, padding: '4px 0',
            borderTop: '1px solid #334155',
          }}>
            <span>UTILITY SCORE</span>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 14 }}>{bagState.utilityScore}</span>
          </div>

          {/* Mobility Penalty indicator */}
          <div style={{
            padding: '6px 8px', marginBottom: 12,
            background: bagState.mobilityPenalty ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${bagState.mobilityPenalty ? '#dc2626' : '#166534'}`,
            fontSize: 10, fontWeight: 700,
            color: bagState.mobilityPenalty ? '#ef4444' : '#22c55e',
            letterSpacing: 1, textAlign: 'center',
            animation: bagState.mobilityPenalty ? 'm1-blink 0.6s infinite' : 'none',
          }}>
            MOBILITY: {bagState.mobilityPenalty ? 'PENALTY ACTIVE' : 'OK'}
          </div>

          {/* Essentials checklist */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: 1 }}>
              ESSENTIALS
            </div>
            {ESSENTIAL_IDS.map(id => {
              const it = CATALOGUE.find(c => c.id === id)
              const has = bagIds.includes(id)
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: has ? '#22c55e' : '#475569', fontWeight: 700 }}>{has ? '[x]' : '[ ]'}</span>
                  <span style={{ color: has ? '#e2e8f0' : '#64748b' }}>{it ? it.name : id}</span>
                </div>
              )
            })}
          </div>

          {/* Packed items list */}
          {bagState.bagItems.length > 0 && (
            <div style={{
              borderTop: '1px solid #334155', paddingTop: 10, marginBottom: 10,
              maxHeight: 160, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: 1 }}>
                PACKED ({bagState.bagItems.length})
              </div>
              {bagState.bagItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 10, marginBottom: 3,
                  color: item.trap ? '#eab308' : '#cbd5e1',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {CAT_TAG[item.cat]} {item.name}
                  </span>
                  <span style={{ color: '#64748b', marginLeft: 6, flexShrink: 0 }}>{item.weight}lb</span>
                </div>
              ))}
            </div>
          )}

          {/* Clear bag */}
          <button
            onClick={() => bagDispatch({ type: 'CLEAR_BAG' })}
            style={{
              width: '100%', padding: '6px 0', marginBottom: 8,
              background: 'transparent', border: '1px solid #475569',
              color: '#94a3b8', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            CLEAR BAG
          </button>

          {/* Finalize */}
          <button
            onClick={finalize}
            style={{
              width: '100%', padding: '10px 0',
              background: bagState.mobilityPenalty ? '#7f1d1d' : '#dc2626',
              border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1,
              fontFamily: "'Courier New', Courier, monospace",
              animation: timeLeft <= 15 ? 'm1-blink 0.5s infinite' : 'none',
            }}
          >
            FINALIZE BAG
          </button>
        </div>
      </div>
    </div>
  )
}
