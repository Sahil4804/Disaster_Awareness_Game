/**
 * Module 1 — The Go-Bag: Flood Evacuation Simulator
 * Aesthetic: Emergency alert · stormy dark · survival urgency
 */
import { useState, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_WEIGHT = 25
const TIMER_START = 60
const ESSENTIALS = ['w3', 'm2', 't2', 'n1'] // LifeStraw, IFAK, Leatherman, Map

// ─── Item Catalogue ───────────────────────────────────────────────────────────
const CATALOGUE = [
  // WATER
  { id:'w1', emoji:'🪣', name:'Water Jug (1-gal)',       cat:'WATER',   wt:8.34, util:22, trap:true,
    tip:'💀 8.34 lbs PER gallon. Three days water = your entire weight budget. A trap.' },
  { id:'w2', emoji:'🪣', name:'Water Jugs (2-gal)',       cat:'WATER',   wt:16.68,util:30, trap:true,
    tip:'☠️ 16.68 lbs — 67% of your weight budget gone. You cannot run. You will drown.' },
  { id:'w3', emoji:'💧', name:'LifeStraw Filter',         cat:'WATER',   wt:0.10, util:96, trap:false,
    tip:'✨ 0.1 lbs → filters 1,000 gallons of ANY water. Outweighs 10 water jugs in value.' },
  { id:'w4', emoji:'💊', name:'Aquatabs (50ct)',           cat:'WATER',   wt:0.05, util:88, trap:false,
    tip:'🧪 0.05 lbs → 50 treatments. Kills cholera and typhoid in floodwater. Pack it.' },
  { id:'w5', emoji:'🔩', name:'Sawyer Mini Filter',       cat:'WATER',   wt:0.25, util:92, trap:false,
    tip:'🌊 100,000 gal lifetime. 4oz. Attaches to any bottle. Essential water security.' },
  { id:'w6', emoji:'🫗', name:'Collapsible 2L Bladder',   cat:'WATER',   wt:0.09, util:42, trap:false,
    tip:'📦 3oz empty. Fill from any flood source, then filter. Perfect system.' },
  // FOOD
  { id:'f1', emoji:'🥫', name:'Canned Beans ×6',          cat:'FOOD',    wt:9.00, util:32, trap:true,
    tip:'⚠️ 9 lbs of cans. 266 cal/lb. Cans crack under debris. Poor density. Leave them.' },
  { id:'f2', emoji:'🐟', name:'Canned Tuna ×4',           cat:'FOOD',    wt:2.40, util:52, trap:true,
    tip:'🔸 Decent protein but liquid-heavy. Better high-density options exist.' },
  { id:'f3', emoji:'🍫', name:'Energy Bars 6-pack',        cat:'FOOD',    wt:0.75, util:74, trap:false,
    tip:'⚡ 2,000 cal/lb. No prep, no utensils. Engineered for high-exertion survival.' },
  { id:'f4', emoji:'🍱', name:'Freeze-Dried Meals ×3',    cat:'FOOD',    wt:0.90, util:85, trap:false,
    tip:'🎯 3-day supply. 2,000 cal/lb. Just add water. Complete macronutrient balance.' },
  { id:'f5', emoji:'🥜', name:'Trail Mix 2lb',             cat:'FOOD',    wt:2.00, util:66, trap:false,
    tip:'💪 1,600 cal/lb. High fat for sustained exertion. Zero preparation required.' },
  // MEDICAL
  { id:'m1', emoji:'🏥', name:'Full First Aid Kit (Lg)',   cat:'MEDICAL', wt:3.50, util:52, trap:true,
    tip:'⚠️ 3.5 lbs. Most contents irrelevant in acute flood evacuation. Over-engineered.' },
  { id:'m2', emoji:'🩹', name:'IFAK Trauma Kit',           cat:'MEDICAL', wt:0.75, util:90, trap:false,
    tip:'🩸 Tourniquet · chest seal · hemostatic gauze. Addresses top 3 survivable traumas.' },
  { id:'m3', emoji:'💊', name:'Personal Medications',      cat:'MEDICAL', wt:0.30, util:96, trap:false,
    tip:'🚨 Rx prescriptions cannot be sourced post-disaster. Irreplaceable. Pack FIRST.' },
  { id:'m4', emoji:'😷', name:'N95 Masks ×10',             cat:'MEDICAL', wt:0.20, util:72, trap:false,
    tip:'🦠 Post-flood: mold spores, sewage aerosol, ash. Respiratory protection critical.' },
  // TOOLS
  { id:'t1', emoji:'🔧', name:'Full Mechanic Toolkit',     cat:'TOOLS',   wt:15.0, util:12, trap:true,
    tip:'☠️ 15 lbs of car-camping gear. Cannot carry long distances. DO NOT PACK.' },
  { id:'t2', emoji:'🔪', name:'Leatherman Multi-Tool',     cat:'TOOLS',   wt:0.55, util:90, trap:false,
    tip:'🛠️ 25 functions. 0.55 lbs. Cuts rope, pries debris, opens cans. Essential.' },
  { id:'t3', emoji:'🪢', name:'Paracord 100ft',            cat:'TOOLS',   wt:0.40, util:76, trap:false,
    tip:'💯 550 lb test. Lashing, shelter, tourniquet, clothesline. 40+ field uses.' },
  { id:'t4', emoji:'🔥', name:'Waterproof Firestarter',    cat:'TOOLS',   wt:0.15, util:80, trap:false,
    tip:'🌧️ Windproof lighter + waterproof matches + tinder. Heat, signaling, boiling.' },
  { id:'t5', emoji:'🪟', name:'Glass Breaker + Seatbelt',  cat:'TOOLS',   wt:0.08, util:72, trap:false,
    tip:'🚗 47% of flood deaths involve trapped vehicles. This tool saves lives. 0.08 lbs.' },
  // SHELTER
  { id:'s1', emoji:'⛺', name:'6-Person Family Tent',      cat:'SHELTER', wt:18.0, util:18, trap:true,
    tip:'☠️ 18 lbs. Car camping gear. Impossible to carry under rapid evacuation. LEAVE IT.' },
  { id:'s2', emoji:'🌡️', name:'Emergency Bivvy Sack',      cat:'SHELTER', wt:0.50, util:84, trap:false,
    tip:'🔆 Reflects 80% body heat. Waterproof. 8oz. Single-person hypothermia prevention.' },
  { id:'s3', emoji:'🏕️', name:'Lightweight Tarp 8×10',     cat:'SHELTER', wt:1.00, util:80, trap:false,
    tip:'☔ 1 lb. 100+ rigging configs with paracord. Group shelter from rain and wind.' },
  // COMMS
  { id:'c1', emoji:'📻', name:'Hand-Crank NOAA Radio',     cat:'COMMS',   wt:0.85, util:84, trap:false,
    tip:'📡 Solar + hand-crank power. Receives emergency broadcasts when towers are down.' },
  { id:'c2', emoji:'🔋', name:'Power Bank 20,000mAh',      cat:'COMMS',   wt:1.10, util:74, trap:false,
    tip:'📱 6 full phone charges. Critical for SOS calls and navigation apps.' },
  { id:'c3', emoji:'🛰️', name:'Satellite Messenger',       cat:'COMMS',   wt:0.35, util:92, trap:false,
    tip:'🆘 2-way messaging + SOS via satellite. Works with ZERO cell infrastructure.' },
  // NAV
  { id:'n1', emoji:'🗺️', name:'Topo Map + Compass',        cat:'NAV',     wt:0.20, util:96, trap:false,
    tip:'🧭 No battery. No signal needed. Laminated waterproof map. Absolute baseline.' },
  { id:'n2', emoji:'📍', name:'Handheld GPS Unit',          cat:'NAV',     wt:0.45, util:72, trap:false,
    tip:'🔋 Battery-dependent. Accurate to 3m. Supplement to, never replace, paper nav.' },
  // DOCS
  { id:'d1', emoji:'📄', name:'Waterproof Doc Pouch',       cat:'DOCS',    wt:0.15, util:90, trap:false,
    tip:'🛡️ ID, passport, insurance, medical records. Takes weeks to replace. Protect them.' },
  // MISC
  { id:'p1', emoji:'📣', name:'Emergency Whistle',          cat:'MISC',    wt:0.03, util:74, trap:false,
    tip:'📢 Audible 1km. No battery. Distress signal + animal deterrent. 0.03 lbs — zero excuse not to pack.' },
  { id:'p2', emoji:'🧴', name:'Hand Sanitizer 8oz',         cat:'MISC',    wt:0.50, util:68, trap:false,
    tip:'🦠 Floodwater carries cholera, typhoid, hepatitis A. Hand hygiene = life saver.' },
  { id:'p3', emoji:'💡', name:'Headlamp + Extra Batteries', cat:'MISC',    wt:0.35, util:82, trap:false,
    tip:'🌑 Power outages are universal in floods. Hands-free light for 12+ hours.' },
]

const CATEGORIES = ['ALL', 'WATER', 'FOOD', 'MEDICAL', 'TOOLS', 'SHELTER', 'COMMS', 'NAV', 'DOCS', 'MISC']

const ESSENTIAL_IDS = ['w3', 'm2', 't2', 'n1']
const ESSENTIAL_LABELS = { w3: 'Water Filter', m2: 'Trauma Kit', t2: 'Multi-Tool', n1: 'Map+Compass' }

// ─── Scoring ──────────────────────────────────────────────────────────────────
function computeScore(bagIds) {
  const items = CATALOGUE.filter(i => bagIds.includes(i.id))
  const weight = items.reduce((s, i) => s + i.wt, 0)
  const hasCat = cat => items.some(i => i.cat === cat)
  const hasWaterFilter = items.some(i => ['w3','w4','w5'].includes(i.id))
  const hasWaterAny = hasCat('WATER')
  const hasEssentials = ESSENTIAL_IDS.every(id => bagIds.includes(id))

  if (weight > MAX_WEIGHT) {
    const score = Math.max(0, Math.round(40 - (weight - MAX_WEIGHT) * 3))
    return { passed: false, score, reason: 'overweight',
      headline: '💀 BAG TOO HEAVY — YOU COULDN\'T RUN',
      lesson: `Your bag weighed ${weight.toFixed(1)} lbs — over the ${MAX_WEIGHT} lb limit. In a flash flood you cannot outrun rising water carrying that load. The bag gets abandoned.` }
  }
  if (!hasWaterAny) return { passed: false, score: 15, reason: 'no-water',
    headline: '💀 NO WATER — DEHYDRATION KILLS',
    lesson: 'You packed zero water solutions. The human body survives 3 days without water in ideal conditions — far less under physical exertion in humid flood conditions.' }
  if (!hasCat('MEDICAL')) return { passed: false, score: 25, reason: 'no-medical',
    headline: '💀 NO MEDICAL SUPPLIES',
    lesson: 'Flood debris causes lacerations. Floodwater carries Vibrio, E. coli, and Hepatitis A. An untreated wound in contaminated water causes fatal sepsis within 48–72 hours.' }
  if (!hasCat('NAV')) return { passed: false, score: 30, reason: 'no-nav',
    headline: '💀 NO NAVIGATION — YOU GOT LOST',
    lesson: 'Cell networks fail during disasters. Without a paper map, you have no backup when GPS and phone data go dark.' }

  const avgUtil = items.length ? items.reduce((s, i) => s + i.util, 0) / items.length : 0
  const waterScore = hasWaterFilter ? 100 : 50
  const mobilityScore = Math.round(((MAX_WEIGHT - weight) / MAX_WEIGHT) * 100)
  const utilScore = Math.round(avgUtil)
  const essentialBonus = hasEssentials ? 10 : 0

  const total = Math.min(100, Math.max(40,
    Math.round(waterScore * 0.3 + mobilityScore * 0.25 + utilScore * 0.25 + essentialBonus * 2)
  ))
  const passed = total >= 55
  const trapItems = items.filter(i => i.trap)
  const smartItems = items.filter(i => !i.trap)

  return {
    passed, score: total, reason: passed ? 'pass' : 'suboptimal',
    headline: passed ? '🎒 BAG VALIDATED — DEPLOYMENT READY' : '⚠️ BAG SUBOPTIMAL — REVIEW LOADOUT',
    lesson: passed
      ? `Smart loadout. ${weight.toFixed(1)} lbs packed. ${hasWaterFilter ? 'Water filter secured.' : ''} ${hasEssentials ? 'All essentials covered.' : ''}`
      : `Your score was ${total}/100. ${trapItems.length > 0 ? `You packed ${trapItems.length} suboptimal item(s) that cost you weight.` : ''} ${!hasWaterFilter ? 'A LifeStraw (0.1 lbs) would have replaced your ${weight.toFixed(0)}lb water supply.' : ''}`,
    trapItems,
    smartItems,
    weight,
  }
}

// ─── Animations (injected via style tag) ─────────────────────────────────────
const KEYFRAMES = `
@keyframes rain {
  0% { transform: translateY(-100vh); opacity: 0.7; }
  100% { transform: translateY(100vh); opacity: 0.2; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  10%,30%,50%,70%,90% { transform: translateX(-4px); }
  20%,40%,60%,80% { transform: translateX(4px); }
}
@keyframes pulse-red {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,50,50,0.7); }
  50% { box-shadow: 0 0 0 8px rgba(255,50,50,0); }
}
@keyframes bounce-in {
  0% { transform: scale(0.7) translateY(-10px); opacity: 0; }
  60% { transform: scale(1.05) translateY(2px); opacity: 1; }
  100% { transform: scale(1) translateY(0); }
}
@keyframes flash-bg {
  0%,100% { background: rgba(255,30,30,0); }
  50% { background: rgba(255,30,30,0.08); }
}
@keyframes timer-pulse {
  0%,100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes float-bag {
  0%,100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}
@keyframes glow-green {
  0%,100% { box-shadow: 0 0 8px rgba(0,255,100,0.3); }
  50% { box-shadow: 0 0 20px rgba(0,255,100,0.6); }
}
`

// ─── Sub-components ───────────────────────────────────────────────────────────
function RainOverlay() {
  const drops = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${0.5 + Math.random() * 0.7}s`,
    opacity: 0.15 + Math.random() * 0.25,
  }))
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {drops.map((d, i) => (
        <div key={i} style={{
          position:'absolute', top:'-10%', left:d.left,
          width:1, height: `${40 + Math.random()*60}px`,
          background:'linear-gradient(transparent, rgba(100,160,255,0.6))',
          animation:`rain ${d.duration} ${d.delay} infinite linear`,
          opacity: d.opacity,
        }} />
      ))}
    </div>
  )
}

function WeightBar({ current, max }) {
  const pct = Math.min(100, (current / max) * 100)
  const color = pct < 50 ? '#22c55e' : pct < 80 ? '#f59e0b' : '#ef4444'
  const overweight = current > max
  return (
    <div style={{ animation: overweight ? 'shake 0.4s infinite' : 'none' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11, color:'#94a3b8' }}>
        <span>⚖️ WEIGHT</span>
        <span style={{ color, fontWeight:700 }}>{current.toFixed(1)} / {max} lbs</span>
      </div>
      <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:6, height:10, overflow:'hidden' }}>
        <div style={{
          width:`${pct}%`, height:'100%', borderRadius:6,
          background:`linear-gradient(90deg, ${color}, ${color}cc)`,
          transition:'width 0.3s, background 0.3s',
          boxShadow:`0 0 8px ${color}88`,
        }} />
      </div>
      {overweight && (
        <div style={{ color:'#ef4444', fontSize:11, marginTop:4, fontWeight:700, animation:'timer-pulse 0.5s infinite' }}>
          ⚠️ OVERWEIGHT — REMOVE ITEMS
        </div>
      )}
    </div>
  )
}

function ItemCard({ item, inBag, onToggle }) {
  const [hovered, setHovered] = useState(false)
  const dots = Math.round(item.util / 20)
  const isGood = !item.trap
  const borderColor = inBag
    ? (item.trap ? '#f59e0b' : '#22c55e')
    : hovered ? (isGood ? '#22c55e' : '#ef4444') : 'rgba(255,255,255,0.1)'
  const glowColor = inBag
    ? (item.trap ? 'rgba(245,158,11,0.35)' : 'rgba(34,197,94,0.35)')
    : hovered ? (isGood ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)') : 'none'

  return (
    <div style={{ position:'relative' }}>
      <div
        onClick={() => onToggle(item.id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          border:`2px solid ${borderColor}`,
          background: inBag ? (item.trap ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)') : 'rgba(15,12,41,0.85)',
          borderRadius:10, padding:'12px 10px', cursor:'pointer',
          transition:'all 0.2s',
          boxShadow: glowColor !== 'none' ? `0 0 18px ${glowColor}` : 'none',
          transform: hovered ? 'translateY(-3px) scale(1.02)' : inBag ? 'scale(1.01)' : 'scale(1)',
          animation: inBag && item.trap ? 'pulse-red 1.5s infinite' : 'none',
          textAlign:'center', position:'relative', userSelect:'none',
        }}
      >
        {inBag && (
          <div style={{
            position:'absolute', top:4, right:6, fontSize:14,
            animation:'bounce-in 0.3s ease-out',
          }}>✓</div>
        )}
        {item.trap && (
          <div style={{
            position:'absolute', top:4, left:6, fontSize:10,
            background:'rgba(239,68,68,0.9)', color:'#fff',
            padding:'1px 4px', borderRadius:3, fontWeight:700,
          }}>TRAP</div>
        )}

        <div style={{ fontSize:32, marginBottom:4, lineHeight:1 }}>{item.emoji}</div>
        <div style={{ fontSize:11, fontWeight:700, color:'#e2e8f0', marginBottom:4, lineHeight:1.3 }}>
          {item.name}
        </div>
        <div style={{ fontSize:10, color:'#94a3b8', marginBottom:5 }}>
          ⚖️ {item.wt} lbs
        </div>
        <div style={{ display:'flex', justifyContent:'center', gap:2, marginBottom:4 }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{ fontSize:8, color: i <= dots ? (isGood ? '#22c55e' : '#f59e0b') : '#334155' }}>●</span>
          ))}
        </div>
        {!item.trap && item.util >= 85 && (
          <div style={{ fontSize:9, background:'rgba(34,197,94,0.15)', color:'#22c55e', padding:'1px 5px', borderRadius:3, fontWeight:700 }}>
            ESSENTIAL
          </div>
        )}
        {item.trap && (
          <div style={{ fontSize:9, background:'rgba(239,68,68,0.15)', color:'#f87171', padding:'1px 5px', borderRadius:3, fontWeight:700 }}>
            ⚠️ HEAVY!
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
          background:'rgba(2,6,23,0.97)', border:`1px solid ${isGood ? '#22c55e' : '#ef4444'}`,
          borderRadius:8, padding:'10px 12px', zIndex:100, width:220,
          fontSize:12, color:'#e2e8f0', lineHeight:1.5,
          boxShadow:`0 4px 20px ${isGood ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          pointerEvents:'none',
        }}>
          {item.tip}
        </div>
      )}
    </div>
  )
}

function BagPanel({ bagIds, onFinish, timeLeft }) {
  const bagItems = CATALOGUE.filter(i => bagIds.includes(i.id))
  const weight = bagItems.reduce((s, i) => s + i.wt, 0)
  const overweight = weight > MAX_WEIGHT
  const fillPct = Math.min(100, (weight / MAX_WEIGHT) * 100)
  const bagScale = 1 + fillPct * 0.005

  return (
    <div style={{
      background:'rgba(2,6,23,0.9)', border:'1px solid rgba(255,255,255,0.12)',
      borderRadius:12, padding:16, position:'sticky', top:16,
      backdropFilter:'blur(10px)',
      animation: overweight ? 'shake 0.4s infinite' : 'none',
    }}>
      <div style={{ textAlign:'center', marginBottom:12 }}>
        <div style={{
          fontSize:48, transform:`scale(${bagScale})`,
          animation:'float-bag 2s ease-in-out infinite',
          display:'inline-block', transition:'transform 0.5s',
        }}>🎒</div>
        <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', marginTop:4 }}>MY BAG</div>
        <div style={{ fontSize:11, color:'#64748b' }}>{bagItems.length} item{bagItems.length !== 1 ? 's' : ''} packed</div>
      </div>

      <WeightBar current={weight} max={MAX_WEIGHT} />

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', margin:'12px 0', paddingTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', marginBottom:8 }}>ESSENTIALS</div>
        {ESSENTIAL_IDS.map(id => {
          const has = bagIds.includes(id)
          return (
            <div key={id} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, fontSize:11 }}>
              <span>{has ? '✅' : '⬜'}</span>
              <span style={{ color: has ? '#22c55e' : '#64748b' }}>{ESSENTIAL_LABELS[id]}</span>
            </div>
          )
        })}
      </div>

      {bagItems.length > 0 && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', margin:'8px 0', paddingTop:8, maxHeight:140, overflowY:'auto' }}>
          {bagItems.map(item => (
            <div key={item.id} style={{
              display:'flex', alignItems:'center', gap:6, marginBottom:4,
              fontSize:11, animation:'bounce-in 0.25s ease-out',
              color: item.trap ? '#f59e0b' : '#22c55e',
            }}>
              <span>{item.emoji}</span>
              <span style={{ flex:1 }}>{item.name}</span>
              <span style={{ color:'#64748b' }}>{item.wt}#</span>
            </div>
          ))}
        </div>
      )}

      {overweight && (
        <div style={{
          background:'rgba(239,68,68,0.15)', border:'1px solid #ef4444',
          borderRadius:6, padding:'8px 10px', marginBottom:10,
          fontSize:11, color:'#f87171', fontWeight:700,
          animation:'flash-bg 0.6s infinite',
        }}>
          🚨 OVERWEIGHT! Cannot evacuate!
        </div>
      )}

      <button
        onClick={onFinish}
        style={{
          width:'100%', padding:'12px 0', borderRadius:8, border:'none',
          background: overweight ? 'rgba(239,68,68,0.3)' : 'linear-gradient(135deg, #dc2626, #991b1b)',
          color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
          boxShadow: overweight ? 'none' : '0 0 20px rgba(220,38,38,0.4)',
          animation: !overweight && timeLeft <= 15 ? 'pulse-red 0.8s infinite' : 'none',
          letterSpacing:1,
        }}
      >
        🚁 FINISH PACKING
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Module1_GoBag() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro')      // intro | play | result
  const [bagIds, setBagIds] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIMER_START)
  const [category, setCategory] = useState('ALL')
  const [result, setResult] = useState(null)
  const timerRef = useRef(null)

  // Start timer when play begins
  useEffect(() => {
    if (phase !== 'play') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          handleValidate()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line

  function handleToggle(id) {
    setBagIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleValidate() {
    clearInterval(timerRef.current)
    const res = computeScore(bagIds)
    setResult(res)
    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-1', result: { score: res.score, passed: res.passed } } })
    setPhase('result')
  }

  function handleRetry() {
    setBagIds([])
    setTimeLeft(TIMER_START)
    setResult(null)
    setCategory('ALL')
    setPhase('intro')
  }

  const visibleItems = category === 'ALL' ? CATALOGUE : CATALOGUE.filter(i => i.cat === category)
  const totalWeight = CATALOGUE.filter(i => bagIds.includes(i.id)).reduce((s, i) => s + i.wt, 0)
  const timerColor = timeLeft <= 15 ? '#ef4444' : timeLeft <= 30 ? '#f59e0b' : '#22c55e'

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{
        minHeight:'100vh', background:'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden', padding:24,
      }}>
        <style>{KEYFRAMES}</style>
        <RainOverlay />
        <div style={{ position:'relative', zIndex:1, maxWidth:600, textAlign:'center' }}>
          <div style={{ fontSize:80, marginBottom:16, animation:'float-bag 2s ease-in-out infinite' }}>🌊</div>
          <div style={{
            display:'inline-block', background:'rgba(239,68,68,0.2)', border:'2px solid #ef4444',
            borderRadius:8, padding:'8px 20px', marginBottom:20,
            fontSize:13, fontWeight:700, color:'#f87171', letterSpacing:2,
            animation:'pulse-red 1s infinite',
          }}>
            🚨 FLASH FLOOD WARNING IN EFFECT
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', marginBottom:8, lineHeight:1.2 }}>
            The Go-Bag Challenge
          </h1>
          <p style={{ color:'#94a3b8', fontSize:15, lineHeight:1.6, marginBottom:20 }}>
            A flash flood is approaching. You have <strong style={{ color:'#f59e0b' }}>60 seconds</strong> to pack your go-bag.
            Maximum weight: <strong style={{ color:'#f59e0b' }}>{MAX_WEIGHT} lbs</strong>.
            Every second counts. Every pound matters.
          </p>
          <div style={{
            background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:10, padding:16, marginBottom:24, textAlign:'left',
          }}>
            <div style={{ color:'#94a3b8', fontSize:13, lineHeight:1.8 }}>
              <div>⚖️ Keep your bag under <strong style={{color:'#f59e0b'}}>{MAX_WEIGHT} lbs</strong> — you must be able to run</div>
              <div>💧 Secure water or water purification</div>
              <div>🩹 Pack medical supplies</div>
              <div>🗺️ Bring navigation tools</div>
              <div>⚠️ Watch for <strong style={{color:'#ef4444'}}>TRAP</strong> items — they look useful but waste weight</div>
            </div>
          </div>
          <button
            onClick={() => setPhase('play')}
            style={{
              padding:'16px 48px', borderRadius:10, border:'none',
              background:'linear-gradient(135deg, #dc2626, #b91c1c)',
              color:'#fff', fontWeight:900, fontSize:18, cursor:'pointer',
              boxShadow:'0 0 30px rgba(220,38,38,0.5)', letterSpacing:1,
              animation:'pulse-red 1.5s infinite',
            }}
          >
            🚁 START EVACUATION
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const bagItems = CATALOGUE.filter(i => bagIds.includes(i.id))
    const missedEssentials = ESSENTIAL_IDS.filter(id => !bagIds.includes(id))
    const smartChoices = bagItems.filter(i => !i.trap)
    const mistakes = bagItems.filter(i => i.trap)
    const circumference = 2 * Math.PI * 40
    const scorePct = result.score / 100

    return (
      <div style={{
        minHeight:'100vh', background:'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        padding:24, position:'relative', overflow:'hidden',
      }}>
        <style>{KEYFRAMES}</style>
        <RainOverlay />
        <div style={{ position:'relative', zIndex:1, maxWidth:800, margin:'0 auto' }}>

          {/* Outcome Banner */}
          <div style={{
            textAlign:'center', marginBottom:32,
            animation: result.passed ? 'glow-green 2s infinite' : 'flash-bg 1s infinite',
          }}>
            <div style={{ fontSize:64, marginBottom:8 }}>{result.passed ? '🎒' : '💀'}</div>
            <h1 style={{
              fontSize:22, fontWeight:900, letterSpacing:2,
              color: result.passed ? '#22c55e' : '#ef4444', marginBottom:8,
            }}>
              {result.headline}
            </h1>
          </div>

          {/* Score Gauge + Stats */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:40, marginBottom:32, flexWrap:'wrap' }}>
            <div style={{ textAlign:'center' }}>
              <svg width={100} height={100} style={{ transform:'rotate(-90deg)' }}>
                <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
                <circle
                  cx={50} cy={50} r={40} fill="none"
                  stroke={result.passed ? '#22c55e' : '#ef4444'}
                  strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - scorePct)}
                  style={{ transition:'stroke-dashoffset 1s ease', filter:`drop-shadow(0 0 6px ${result.passed ? '#22c55e' : '#ef4444'})` }}
                />
              </svg>
              <div style={{ marginTop:-60, fontSize:24, fontWeight:900, color:'#fff' }}>{result.score}</div>
              <div style={{ marginTop:36, fontSize:11, color:'#64748b' }}>SCORE / 100</div>
            </div>
            <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.9, maxWidth:300 }}>
              <div>⚖️ Total weight: <strong style={{color:'#e2e8f0'}}>{result.weight?.toFixed(1) ?? '—'} lbs</strong></div>
              <div>📦 Items packed: <strong style={{color:'#e2e8f0'}}>{bagItems.length}</strong></div>
              <div>✅ Smart picks: <strong style={{color:'#22c55e'}}>{smartChoices.length}</strong></div>
              <div>❌ Trap items: <strong style={{color:'#ef4444'}}>{mistakes.length}</strong></div>
              {missedEssentials.length > 0 && (
                <div>⚠️ Missing essentials: <strong style={{color:'#f59e0b'}}>{missedEssentials.map(id => ESSENTIAL_LABELS[id]).join(', ')}</strong></div>
              )}
            </div>
          </div>

          {/* Smart Choices vs Mistakes */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
            <div style={{ background:'rgba(34,197,94,0.07)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:10, padding:16 }}>
              <div style={{ fontWeight:700, color:'#22c55e', marginBottom:10, fontSize:13 }}>✅ SMART CHOICES</div>
              {smartChoices.length === 0
                ? <div style={{ color:'#64748b', fontSize:12 }}>None — review your picks next time.</div>
                : smartChoices.map(item => (
                  <div key={item.id} style={{ display:'flex', gap:8, marginBottom:8, fontSize:12, color:'#94a3b8', lineHeight:1.4 }}>
                    <span>{item.emoji}</span>
                    <div><strong style={{color:'#e2e8f0'}}>{item.name}</strong><br/><span style={{fontSize:10}}>{item.tip.slice(0,80)}…</span></div>
                  </div>
                ))
              }
            </div>
            <div style={{ background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:16 }}>
              <div style={{ fontWeight:700, color:'#ef4444', marginBottom:10, fontSize:13 }}>❌ MISTAKES</div>
              {mistakes.length === 0
                ? <div style={{ color:'#22c55e', fontSize:12 }}>None — excellent trap avoidance!</div>
                : mistakes.map(item => (
                  <div key={item.id} style={{ display:'flex', gap:8, marginBottom:8, fontSize:12, color:'#94a3b8', lineHeight:1.4 }}>
                    <span>{item.emoji}</span>
                    <div><strong style={{color:'#e2e8f0'}}>{item.name}</strong><br/><span style={{fontSize:10}}>{item.tip.slice(0,80)}…</span></div>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Key Lesson */}
          <div style={{
            background: result.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${result.passed ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            borderRadius:10, padding:16, marginBottom:24,
          }}>
            <div style={{ fontWeight:700, color: result.passed ? '#22c55e' : '#ef4444', marginBottom:6, fontSize:12, letterSpacing:1 }}>
              📚 KEY LESSON
            </div>
            <p style={{ color:'#cbd5e1', fontSize:13, lineHeight:1.6, margin:0 }}>{result.lesson}</p>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button
              onClick={handleRetry}
              style={{
                padding:'12px 32px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)',
                background:'transparent', color:'#94a3b8', fontWeight:700, fontSize:13, cursor:'pointer',
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })}
              style={{
                padding:'12px 32px', borderRadius:8, border:'none',
                background:'linear-gradient(135deg, #1e40af, #1d4ed8)',
                color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
                boxShadow:'0 0 20px rgba(29,78,216,0.4)',
              }}
            >
              ← Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:'100vh', background:'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      position:'relative', overflow:'hidden',
    }}>
      <style>{KEYFRAMES}</style>
      <RainOverlay />

      {/* Header */}
      <div style={{
        position:'sticky', top:0, zIndex:50,
        background:'rgba(2,6,23,0.95)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(239,68,68,0.4)',
        padding:'10px 20px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        animation: timeLeft <= 15 ? 'flash-bg 0.5s infinite' : 'none',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            background:'rgba(239,68,68,0.2)', border:'1px solid #ef4444',
            borderRadius:6, padding:'4px 10px', fontSize:11, fontWeight:700, color:'#f87171',
            letterSpacing:1, animation:'pulse-red 1s infinite',
          }}>
            🚨 FLASH FLOOD WARNING — EVACUATE NOW
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div style={{
            fontSize:20, fontWeight:900, color: timerColor, letterSpacing:1,
            animation: timeLeft <= 15 ? 'timer-pulse 0.5s infinite' : 'none',
            minWidth:60, textAlign:'center',
          }}>
            ⏱ {String(Math.floor(timeLeft / 60)).padStart(2,'0')}:{String(timeLeft % 60).padStart(2,'0')}
          </div>
          <div style={{ fontSize:13, color:'#94a3b8' }}>
            ⚖️ <span style={{ color: totalWeight > MAX_WEIGHT ? '#ef4444' : '#22c55e', fontWeight:700 }}>
              {totalWeight.toFixed(1)}
            </span> / {MAX_WEIGHT} lbs
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ position:'relative', zIndex:1, padding:16, display:'grid', gridTemplateColumns:'1fr 240px', gap:16, maxWidth:1200, margin:'0 auto' }}>

        {/* Left: Items */}
        <div>
          {/* Category Filter */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding:'5px 12px', borderRadius:6, border:'none',
                  background: category === cat ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.07)',
                  color: category === cat ? '#fff' : '#94a3b8',
                  fontSize:11, fontWeight:700, cursor:'pointer',
                  letterSpacing:0.5,
                  transition:'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Item Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10 }}>
            {visibleItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                inBag={bagIds.includes(item.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>

        {/* Right: Bag Panel */}
        <BagPanel bagIds={bagIds} onFinish={handleValidate} timeLeft={timeLeft} />
      </div>
    </div>
  )
}
