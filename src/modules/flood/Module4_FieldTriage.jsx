/**
 * Module 4 — Field Triage: Emergency Medical Response
 * Multi-phase: Triage → Supply Run (raft navigation) → Treatment
 * NDMA-aligned medical first response training
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'
import Narrator from '../../components/Narrator'

// ═══════════════════════════════════════════════════════════════
// VICTIMS & MEDICAL DATA
// ═══════════════════════════════════════════════════════════════
const VICTIMS = [
  {
    id: 'v1', name: 'Meera & child', age: 32, emoji: '👩‍👧',
    injury: 'Severe Dehydration', severity: 'CRITICAL', priority: 1,
    vitals: { pulse: 'Weak & rapid (120 bpm)', bp: '80/50 mmHg', temp: '38.2°C', resp: 'Shallow', consciousness: 'Drowsy, confused' },
    symptoms: ['Sunken eyes', 'Dry cracked lips', 'No tears when crying (child)', 'Dark urine', 'Lethargy'],
    treatment: ['ors', 'clean_water', 'electrolyte'],
    triageNote: 'CRITICAL — Dehydration in child is life-threatening. Treat within 30 minutes.',
    ndmaTip: 'NDMA: Oral Rehydration Solution (ORS) is the #1 treatment for dehydration. Mix 1L clean water + 6 tsp sugar + ½ tsp salt if ORS packets unavailable.',
  },
  {
    id: 'v2', name: 'Lakshmi', age: 67, emoji: '👵',
    injury: 'Diabetic Emergency', severity: 'HIGH', priority: 2,
    vitals: { pulse: 'Rapid (110 bpm)', bp: '100/70 mmHg', temp: '36.8°C', resp: 'Normal', consciousness: 'Confused, trembling' },
    symptoms: ['Excessive sweating', 'Trembling hands', 'Slurred speech', 'Confusion', 'Cold clammy skin'],
    treatment: ['glucose', 'clean_water', 'blanket'],
    triageNote: 'HIGH — Hypoglycemia can cause seizures/coma if untreated.',
    ndmaTip: 'NDMA: For diabetic emergencies, give glucose tablets or sugar water immediately. If unconscious, do NOT give anything by mouth.',
  },
  {
    id: 'v3', name: 'Priya', age: 28, emoji: '👩',
    injury: 'Hypothermia', severity: 'HIGH', priority: 3,
    vitals: { pulse: 'Slow (52 bpm)', bp: '90/60 mmHg', temp: '34.5°C', resp: 'Shallow', consciousness: 'Drowsy' },
    symptoms: ['Shivering', 'Blue lips/fingers', 'Slurred speech', 'Stiff muscles', 'Drowsiness'],
    treatment: ['blanket', 'warm_drink', 'dry_clothes'],
    triageNote: 'HIGH — Body temp below 35°C is dangerous.',
    ndmaTip: 'NDMA: Remove wet clothes, wrap in blankets/tarps, give warm (not hot) drinks. Never rub extremities or apply direct heat.',
  },
  {
    id: 'v4', name: 'Rajan', age: 55, emoji: '👨',
    injury: 'Leg Fracture (Closed)', severity: 'MEDIUM', priority: 4,
    vitals: { pulse: 'Elevated (95 bpm)', bp: '130/85 mmHg', temp: '37.0°C', resp: 'Normal', consciousness: 'Alert, in pain' },
    symptoms: ['Swelling at shin', 'Unable to bear weight', 'Visible deformity', 'Severe pain', 'Bruising'],
    treatment: ['splint', 'bandage', 'paracetamol'],
    triageNote: 'MEDIUM — Immobilize before moving.',
    ndmaTip: 'NDMA: Splint the fracture with any rigid material. Pad generously. Check pulse below injury every 15 min.',
  },
  {
    id: 'v5', name: 'Ahmed', age: 42, emoji: '👨‍🦱',
    injury: 'Minor Lacerations & Cuts', severity: 'LOW', priority: 5,
    vitals: { pulse: 'Normal (78 bpm)', bp: '120/80 mmHg', temp: '36.9°C', resp: 'Normal', consciousness: 'Alert' },
    symptoms: ['Multiple small cuts', 'Minor bleeding', 'Glass fragments visible', 'Slight swelling'],
    treatment: ['antiseptic', 'bandage', 'tweezers'],
    triageNote: 'LOW — Clean and dress wounds. Watch for infection.',
    ndmaTip: 'NDMA: Floodwater carries bacteria, sewage, and chemicals. Even minor cuts must be cleaned to prevent tetanus.',
  },
]

const ALL_ITEMS = [
  { id: 'ors', name: 'ORS Packets', emoji: '💊', shop: null, desc: 'Oral Rehydration Solution' },
  { id: 'clean_water', name: 'Clean Water', emoji: '💧', shop: null, desc: 'Purified drinking water' },
  { id: 'electrolyte', name: 'Electrolyte Powder', emoji: '⚡', shop: 'pharmacy', desc: 'Restores electrolyte balance' },
  { id: 'glucose', name: 'Glucose Tablets', emoji: '🍬', shop: 'pharmacy', desc: 'Rapid sugar for diabetic emergency' },
  { id: 'blanket', name: 'Thermal Blanket', emoji: '🧣', shop: null, desc: 'Emergency foil/wool blanket' },
  { id: 'warm_drink', name: 'Warm Beverage', emoji: '☕', shop: null, desc: 'Warm drink for hypothermia' },
  { id: 'dry_clothes', name: 'Dry Clothes', emoji: '👕', shop: 'general', desc: 'Clean, dry clothing' },
  { id: 'splint', name: 'Splint Materials', emoji: '🦴', shop: 'medical', desc: 'Rigid splint + padding' },
  { id: 'bandage', name: 'Bandages & Gauze', emoji: '🩹', shop: 'medical', desc: 'Sterile bandages for wounds' },
  { id: 'paracetamol', name: 'Paracetamol', emoji: '💊', shop: 'pharmacy', desc: 'Pain & fever relief' },
  { id: 'antiseptic', name: 'Antiseptic Solution', emoji: '🧴', shop: 'medical', desc: 'Wound cleaning solution' },
  { id: 'tweezers', name: 'Tweezers', emoji: '🪡', shop: 'medical', desc: 'For removing debris from wounds' },
]

// Shops on the raft map — govt resource locations (multiple per type for player choice)
const SHOPS = [
  // Medical stores (2 options)
  { id: 'med1', name: 'City Medical', emoji: '🏥', mapX: 450, mapY: 320, w: 110, h: 70, items: ['splint', 'bandage', 'antiseptic', 'tweezers'], color: '#1e40af', roof: '#1e3a5f', sector: 'A-3', status: 'OPEN', safety: 'safe', stock: 'Full stock' },
  { id: 'med2', name: 'Relief Med Point', emoji: '🏥', mapX: 1500, mapY: 200, w: 100, h: 65, items: ['bandage', 'antiseptic'], color: '#1d4ed8', roof: '#1e3a5f', sector: 'D-1', status: 'LIMITED', safety: 'caution', stock: 'Partial — splint & tweezers unavailable' },

  // Pharmacies (2 options)
  { id: 'pharm1', name: 'MedPlus Pharmacy', emoji: '💊', mapX: 1300, mapY: 550, w: 100, h: 65, items: ['glucose', 'electrolyte', 'paracetamol'], color: '#7e22ce', roof: '#581c87', sector: 'B-7', status: 'OPEN', safety: 'safe', stock: 'Full stock' },
  { id: 'pharm2', name: 'Emergency Pharmacy', emoji: '💊', mapX: 350, mapY: 750, w: 95, h: 60, items: ['glucose', 'paracetamol'], color: '#6d28d9', roof: '#4c1d95', sector: 'C-5', status: 'LIMITED', safety: 'unsafe', stock: 'Low — near live wire zone ⚡' },

  // General stores (2 options)
  { id: 'gen1', name: 'Patel General Store', emoji: '🏪', mapX: 850, mapY: 900, w: 100, h: 70, items: ['dry_clothes'], color: '#b45309', roof: '#78350f', sector: 'C-2', status: 'OPEN', safety: 'safe', stock: 'Full stock' },
  { id: 'gen2', name: 'Army Relief Camp', emoji: '🏕️', mapX: 1600, mapY: 850, w: 110, h: 70, items: ['dry_clothes'], color: '#166534', roof: '#14532d', sector: 'E-4', status: 'OPEN', safety: 'caution', stock: 'Available — long distance' },
]
const SHELTER_POS = { x: 50, y: 50, w: 140, h: 100 }
const SHELTER_ITEMS = ['ors', 'clean_water', 'blanket', 'warm_drink']
const SEVERITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#22c55e' }
const SAFETY_COLORS = { safe: '#22c55e', caution: '#f59e0b', unsafe: '#ef4444' }
const SAFETY_LABELS = { safe: '✅ SAFE', caution: '⚠️ CAUTION', unsafe: '🚫 UNSAFE' }

// Raft navigation config
const SUPPLY_MAP_W = 2000
const SUPPLY_MAP_H = 1200
const RAFT_W = 28
const RAFT_H = 44
const RAFT_SPEED = 1200
const RAFT_DRAG = 0.92
const CAM_LERP = 0.12
const TORCH_RADIUS = 500
const SHELTER_INTERACT_RANGE = 130
const INTERACT_RANGE = 70
const INTERACT_TIME = 1200

// Some buildings/obstacles on the supply map
const SUPPLY_BUILDINGS = [
  { x: 200, y: 500, w: 80, h: 60, color: '#1a1a2e', roof: '#2d1b4e' },
  { x: 700, y: 180, w: 100, h: 70, color: '#1a1a2e', roof: '#2d1b4e' },
  { x: 1100, y: 350, w: 90, h: 65, color: '#1a1a2e', roof: '#2d1b4e' },
  { x: 250, y: 900, w: 110, h: 75, color: '#1a1a2e', roof: '#2d1b4e' },
  { x: 1050, y: 700, w: 95, h: 60, color: '#1a1a2e', roof: '#2d1b4e' },
  { x: 1700, y: 400, w: 80, h: 55, color: '#1a1a2e', roof: '#2d1b4e' },
]

// Hazard zones (near unsafe shops)
const HAZARD_ZONES = [
  { x: 300, y: 720, r: 80, type: 'wire' },  // near pharm2
  { x: 1650, y: 820, r: 60, type: 'debris' }, // near gen2
]

// ═══════════════════════════════════════════════════════════════
// KEYFRAMES
// ═══════════════════════════════════════════════════════════════
const KEYFRAMES = `
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
@keyframes glow{0%,100%{box-shadow:0 0 8px rgba(34,197,94,0.3)}50%{box-shadow:0 0 20px rgba(34,197,94,0.5)}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes sos-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.6}}
@keyframes shout-ring{0%{transform:scale(0.5);opacity:0.8}100%{transform:scale(2.5);opacity:0}}
@keyframes wake{0%{opacity:0.4;transform:scaleX(1)}100%{opacity:0;transform:scaleX(2.5) translateY(8px)}}
@keyframes compassPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes scanLine{0%{top:0}100%{top:100%}}
@keyframes heartbeat{0%,40%,100%{transform:scale(1)}10%{transform:scale(1.15)}20%{transform:scale(1)}30%{transform:scale(1.1)}}
@keyframes injecting{0%{transform:translateY(0)}30%{transform:translateY(8px)}60%{transform:translateY(4px)}100%{transform:translateY(0)}}
@keyframes healGlow{0%{box-shadow:0 0 5px rgba(34,197,94,0.2)}50%{box-shadow:0 0 30px rgba(34,197,94,0.5)}100%{box-shadow:0 0 5px rgba(34,197,94,0.2)}}
@keyframes xraySweep{0%{opacity:0;transform:translateX(-100%)}50%{opacity:1}100%{opacity:0;transform:translateX(100%)}}
@keyframes drip{0%{transform:translateY(0);opacity:1}100%{transform:translateY(20px);opacity:0}}
@keyframes bpPump{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.15)}}
@keyframes lightningFlash{0%,92%,100%{opacity:0}93%,95%{opacity:0.85}94%{opacity:0.3}}
@keyframes rainFall{from{background-position:0 0}to{background-position:0 200px}}
@keyframes cardEnter{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes scoreCount{from{transform:scale(0.4) rotate(-10deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
@keyframes ripple{0%{transform:scale(0.8);opacity:0.6}100%{transform:scale(2.2);opacity:0}}
`

// ═══════════════════════════════════════════════════════════════
// IMAGE ASSET LAYER — graceful fallback to emoji if PNG missing
// Drop downloaded PNGs into /public/assets/triage/ + /assets/rescue/
// ═══════════════════════════════════════════════════════════════
const TIMG = '/assets/triage/'
const RIMG = '/assets/rescue/'
const SHARED_IMG = '/assets/shared/'

const TRIAGE_IMG = {
  tent: TIMG + 'triage_tent_bg.jpg',
  ambulance: TIMG + 'ambulance_interior.jpg',
  pharmacy: TIMG + 'pharmacy_top_down.png',
  clinic: TIMG + 'clinic_top_down.png',
  stormSky: SHARED_IMG + 'stormy_sky.jpg',
  floodTile: SHARED_IMG + 'floodwater_tile.png',
  raft: RIMG + 'raft_top_down.png',
  shelterCamp: RIMG + 'shelter_camp.png',
}

const VICTIM_PORTRAITS = {
  v1: TIMG + 'portrait_pregnant_woman.png',
  v2: TIMG + 'portrait_elderly_woman.png',
  v3: TIMG + 'portrait_pregnant_woman.png',
  v4: TIMG + 'portrait_man_leg_injury.png',
  v5: TIMG + 'portrait_unconscious_man.png',
}

const ITEM_IMG = {
  ors: TIMG + 'med_ors.png',
  clean_water: TIMG + 'med_water.png',
  electrolyte: TIMG + 'med_electrolyte.png',
  glucose: TIMG + 'med_glucose.png',
  blanket: TIMG + 'med_blanket.png',
  warm_drink: TIMG + 'med_warm_drink.png',
  dry_clothes: TIMG + 'med_dry_clothes.png',
  splint: TIMG + 'med_splint.png',
  bandage: TIMG + 'med_bandage.png',
  paracetamol: TIMG + 'med_paracetamol.png',
  antiseptic: TIMG + 'med_antiseptic.png',
  tweezers: TIMG + 'med_tweezers.png',
}

const SHOP_IMG = {
  med1: TIMG + 'clinic_top_down.png',
  med2: TIMG + 'clinic_top_down.png',
  pharm1: TIMG + 'pharmacy_top_down.png',
  pharm2: TIMG + 'pharmacy_top_down.png',
  gen1: RIMG + 'shelter_camp.png',
  gen2: RIMG + 'shelter_camp.png',
}

// Module-level cache for image-load status
const _imgStatus = new Map()
function useImageLoaded(src) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!src || _imgStatus.has(src)) return
    const im = new Image()
    im.onload = () => { _imgStatus.set(src, 'loaded'); force(t => t+1) }
    im.onerror = () => { _imgStatus.set(src, 'errored'); force(t => t+1) }
    im.src = src
  }, [src])
  return _imgStatus.get(src) === 'loaded'
}

// Sprite — emoji while loading/errored, image when loaded.
function Sprite({ src, fallback, size = 24, style = {}, animation, dropShadow = true }) {
  const loaded = useImageLoaded(src)
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      lineHeight: 1, userSelect: 'none', ...style,
    }}>
      {!loaded && <span style={{ fontSize: size * 0.85, lineHeight: 1, animation, filter: dropShadow ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'none' }}>{fallback}</span>}
      {loaded && (
        <img src={src} alt="" style={{
          width: '100%', height: '100%', objectFit: 'contain',
          filter: dropShadow ? 'drop-shadow(0 3px 5px rgba(0,0,0,0.55))' : 'none',
          animation, pointerEvents: 'none',
        }}/>
      )}
    </div>
  )
}

// Background image; only renders when loaded.
function ImgBg({ src, style, size = 'cover', repeat = 'no-repeat' }) {
  const loaded = useImageLoaded(src)
  if (!loaded) return null
  return <div style={{
    position: 'absolute', inset: 0,
    backgroundImage: `url(${src})`, backgroundSize: size, backgroundRepeat: repeat,
    backgroundPosition: 'center', pointerEvents: 'none', ...style,
  }}/>
}

function dist(x1, y1, x2, y2) { return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) }
function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by }

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Module4_SinkingCar() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro') // intro, triage, govtAlert, supply, chapterBreak, treat, result
  const [triageOrder, setTriageOrder] = useState([])
  const [dragIdx, setDragIdx] = useState(null)
  const [inventory, setInventory] = useState([...SHELTER_ITEMS])
  const [neededItems, setNeededItems] = useState([])
  const [treatedVictims, setTreatedVictims] = useState({})
  const [currentTreatVictim, setCurrentTreatVictim] = useState(0)
  const [selectedItems, setSelectedItems] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [triageScore, setTriageScore] = useState(0)
  const [result, setResult] = useState(null)
  const [collectFlash, setCollectFlash] = useState(null)
  const [interacting, setInteracting] = useState(null)
  const [interactProg, setInteractProg] = useState(0)
  const [collectedShops, setCollectedShops] = useState([])
  const [showPhone, setShowPhone] = useState(true)
  const [selectedShopId, setSelectedShopId] = useState(null)
  const [treatStep, setTreatStep] = useState('examine')
  const [treatAnim, setTreatAnim] = useState(null)
  const [examUsed, setExamUsed] = useState({})
  const [examResult, setExamResult] = useState(null)
  const [bodyView, setBodyView] = useState('normal')
  
  // Raft refs for supply run
  const raftRef = useRef({ x: 300, y: 250, vx: 0, vy: 0, angle: 0 })
  const keysRef = useRef({})
  const cameraRef = useRef({ x: 0, y: 0 })
  const worldRef = useRef(null)
  const raftElRef = useRef(null)
  const torchElRef = useRef(null)
  const frameRef = useRef(null)
  const interactRef = useRef(null)
  const inventoryRef = useRef(inventory)
  const neededItemsRef = useRef(neededItems)

  useEffect(() => { interactRef.current = interacting }, [interacting])
  useEffect(() => { inventoryRef.current = inventory }, [inventory])
  useEffect(() => { neededItemsRef.current = neededItems }, [neededItems])

  // ═══════════ TRIAGE LOGIC ═══════════
  useEffect(() => {
    if (phase === 'triage' && triageOrder.length === 0) {
      const shuffled = [...VICTIMS].sort(() => Math.random() - 0.5)
      setTriageOrder(shuffled.map(v => v.id))
    }
  }, [phase])

  // Hoisted image-load check (must be unconditional)
  const raftImgLoaded = useImageLoaded(TRIAGE_IMG.raft)

  function handleDragStart(idx) { setDragIdx(idx) }
  function handleDragOver(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newOrder = [...triageOrder]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, moved)
    setTriageOrder(newOrder)
    setDragIdx(idx)
  }
  function handleDragEnd() { setDragIdx(null) }

  function submitTriage() {
    let score = 0
    const correctOrder = [...VICTIMS].sort((a, b) => a.priority - b.priority).map(v => v.id)
    triageOrder.forEach((vid, idx) => {
      const correctIdx = correctOrder.indexOf(vid)
      if (idx === correctIdx) score += 4
      else if (Math.abs(idx - correctIdx) === 1) score += 2
    })
    setTriageScore(score)

    const allNeeded = new Set()
    VICTIMS.forEach(v => v.treatment.forEach(t => {
      if (!SHELTER_ITEMS.includes(t)) allNeeded.add(t)
    }))
    setNeededItems([...allNeeded])
    setFeedback({ type: 'success', msg: `Triage score: ${score}/20. ${score >= 16 ? 'Excellent!' : score >= 10 ? 'Good effort.' : 'Needs work.'}` })
    setTimeout(() => setFeedback(null), 3000)

    if (allNeeded.size === 0) {
      setPhase('chapterBreak')
    } else {
      setPhase('govtAlert')
    }
  }

  // ═══════════ SUPPLY RUN — RAFT ENGINE ═══════════
  useEffect(() => {
    if (phase !== 'supply') return
    const k = keysRef.current
    const down = (e) => {
      const key = e.key.toLowerCase()
      if (['arrowleft', 'a'].includes(key) || e.key === 'ArrowLeft') { k.left = true; e.preventDefault() }
      if (['arrowright', 'd'].includes(key) || e.key === 'ArrowRight') { k.right = true; e.preventDefault() }
      if (['arrowup', 'w'].includes(key) || e.key === 'ArrowUp') { k.up = true; e.preventDefault() }
      if (['arrowdown', 's'].includes(key) || e.key === 'ArrowDown') { k.down = true; e.preventDefault() }
      if (key === 'e' || key === ' ') { k.interact = true; e.preventDefault() }
    }
    const up = (e) => {
      const key = e.key.toLowerCase()
      if (['arrowleft', 'a'].includes(key) || e.key === 'ArrowLeft') k.left = false
      if (['arrowright', 'd'].includes(key) || e.key === 'ArrowRight') k.right = false
      if (['arrowup', 'w'].includes(key) || e.key === 'ArrowUp') k.up = false
      if (['arrowdown', 's'].includes(key) || e.key === 'ArrowDown') k.down = false
      if (key === 'e' || key === ' ') k.interact = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [phase])

  // Game loop for supply run
  useEffect(() => {
    if (phase !== 'supply') return
    let lastTime = performance.now()

    function loop(now) {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      const r = raftRef.current
      const cam = cameraRef.current
      const k = keysRef.current

      let ax = 0, ay = 0
      if (k.left) ax -= RAFT_SPEED
      if (k.right) ax += RAFT_SPEED
      if (k.up) ay -= RAFT_SPEED
      if (k.down) ay += RAFT_SPEED
      if (ax !== 0 && ay !== 0) { ax *= 0.707; ay *= 0.707 }

      r.vx += ax * dt; r.vy += ay * dt
      r.vx *= RAFT_DRAG; r.vy *= RAFT_DRAG

      if (Math.abs(r.vx) > 5 || Math.abs(r.vy) > 5) {
        const targetAngle = Math.atan2(r.vy, r.vx) * (180 / Math.PI) + 90
        let diff = targetAngle - r.angle
        while (diff > 180) diff -= 360
        while (diff < -180) diff += 360
        r.angle += diff * 0.1
      }

      let nx = r.x + r.vx * dt, ny = r.y + r.vy * dt
      nx = Math.max(5, Math.min(SUPPLY_MAP_W - RAFT_W - 5, nx))
      ny = Math.max(5, Math.min(SUPPLY_MAP_H - RAFT_H - 5, ny))

      // Building collision
      for (const b of SUPPLY_BUILDINGS) {
        if (rectCollide(nx, ny, RAFT_W, RAFT_H, b.x, b.y, b.w, b.h)) {
          nx = r.x; ny = r.y; r.vx *= -0.3; r.vy *= -0.3; break
        }
      }
      // Shop collision
      for (const s of SHOPS) {
        if (rectCollide(nx, ny, RAFT_W, RAFT_H, s.mapX, s.mapY, s.w, s.h)) {
          nx = r.x; ny = r.y; r.vx *= -0.2; r.vy *= -0.2; break
        }
      }
      // No shelter collision — raft can approach freely for drop-off

      r.x = nx; r.y = ny
      const rcx = r.x + RAFT_W / 2, rcy = r.y + RAFT_H / 2

      // Interact with E — check shop proximity
      if (k.interact) {
        const ci = interactRef.current
        for (const shop of SHOPS) {
          const scx = shop.mapX + shop.w / 2, scy = shop.mapY + shop.h / 2
          if (dist(rcx, rcy, scx, scy) < INTERACT_RANGE) {
            if (!ci || ci.id !== shop.id) {
              setInteracting({ type: 'collect', id: shop.id, start: now })
            } else if (now - ci.start >= INTERACT_TIME) {
              // Collect items from this shop
              const newItems = shop.items.filter(i => neededItemsRef.current.includes(i) && !inventoryRef.current.includes(i))
              if (newItems.length > 0) {
                setInventory(prev => [...prev, ...newItems])
                setCollectedShops(prev => [...prev, shop.id])
                setCollectFlash(shop.id)
                setTimeout(() => setCollectFlash(null), 1500)
                setFeedback({ type: 'success', msg: `✅ Collected ${newItems.length} item(s) from ${shop.name}!` })
                setTimeout(() => setFeedback(null), 2500)
              } else {
                setFeedback({ type: 'info', msg: 'No needed items here!' })
                setTimeout(() => setFeedback(null), 1500)
              }
              setInteracting(null); setInteractProg(0)
              k.interact = false
            } else {
              setInteractProg((now - ci.start) / INTERACT_TIME)
            }
            break
          }
        }
        // Check shelter — return to treat
        const shelCx = SHELTER_POS.x + SHELTER_POS.w / 2, shelCy = SHELTER_POS.y + SHELTER_POS.h / 2
        if (dist(rcx, rcy, shelCx, shelCy) < SHELTER_INTERACT_RANGE) {
          const allCollected = neededItemsRef.current.every(i => inventoryRef.current.includes(i))
          if (allCollected) {
            if (!ci || ci.id !== 'shelter-return') {
              setInteracting({ type: 'return', id: 'shelter-return', start: now })
            } else if (now - ci.start >= INTERACT_TIME) {
              setPhase('chapterBreak')
              setInteracting(null)
              k.interact = false
            } else {
              setInteractProg((now - ci.start) / INTERACT_TIME)
            }
          }
        }
      } else {
        if (interactRef.current) { setInteracting(null); setInteractProg(0) }
      }

      // Camera
      const vw = window.innerWidth, vh = window.innerHeight
      const tx = rcx - vw / 2, ty = rcy - vh / 2
      cam.x += (tx - cam.x) * CAM_LERP; cam.y += (ty - cam.y) * CAM_LERP
      cam.x = Math.max(0, Math.min(SUPPLY_MAP_W - vw, cam.x))
      cam.y = Math.max(0, Math.min(SUPPLY_MAP_H - vh, cam.y))

      if (worldRef.current) worldRef.current.style.transform = `translate(${-cam.x}px,${-cam.y}px)`
      if (raftElRef.current) {
        raftElRef.current.style.left = `${r.x}px`
        raftElRef.current.style.top = `${r.y}px`
        raftElRef.current.style.transform = `rotate(${r.angle}deg)`
      }
      if (torchElRef.current) {
        torchElRef.current.style.left = `${rcx - cam.x}px`
        torchElRef.current.style.top = `${rcy - cam.y}px`
      }

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [phase]) // eslint-disable-line

  // ═══════════ TREATMENT LOGIC ═══════════
  // Equipment examination data per victim
  const EXAM_DATA = {
    v1: {
      stethoscope: { finding: 'Rapid heart rate (120 bpm), weak pulse', concern: 'HIGH', icon: '💓' },
      thermometer: { finding: 'Temp: 38.2°C — Mild fever from dehydration', concern: 'MEDIUM', icon: '🌡️' },
      bp: { finding: 'BP: 80/50 mmHg — Dangerously low (hypovolemic)', concern: 'CRITICAL', icon: '📉' },
      xray: { finding: 'No fractures. Abdominal distension noted — fluid loss', concern: 'LOW', icon: '🩻' },
    },
    v2: {
      stethoscope: { finding: 'Heart rate 110 bpm — tachycardia from hypoglycemia', concern: 'HIGH', icon: '💓' },
      thermometer: { finding: 'Temp: 36.8°C — Normal', concern: 'NORMAL', icon: '🌡️' },
      bp: { finding: 'BP: 100/70 mmHg — Slightly low', concern: 'MEDIUM', icon: '📉' },
      xray: { finding: 'No skeletal abnormalities detected', concern: 'NORMAL', icon: '🩻' },
    },
    v3: {
      stethoscope: { finding: 'Heart rate 52 bpm — bradycardia from hypothermia', concern: 'HIGH', icon: '💓' },
      thermometer: { finding: 'Temp: 34.5°C — HYPOTHERMIA (below 35°C is dangerous)', concern: 'CRITICAL', icon: '🌡️' },
      bp: { finding: 'BP: 90/60 mmHg — Low due to vasoconstriction', concern: 'HIGH', icon: '📉' },
      xray: { finding: 'Clear lungs. No pulmonary edema', concern: 'NORMAL', icon: '🩻' },
    },
    v4: {
      stethoscope: { finding: 'Heart rate 95 bpm — elevated from pain', concern: 'MEDIUM', icon: '💓' },
      thermometer: { finding: 'Temp: 37.0°C — Normal', concern: 'NORMAL', icon: '🌡️' },
      bp: { finding: 'BP: 130/85 mmHg — Elevated from pain response', concern: 'MEDIUM', icon: '📉' },
      xray: { finding: 'FRACTURE DETECTED: Left tibia — closed transverse fracture at mid-shaft', concern: 'CRITICAL', icon: '🩻' },
    },
    v5: {
      stethoscope: { finding: 'Heart rate 78 bpm — Normal', concern: 'NORMAL', icon: '💓' },
      thermometer: { finding: 'Temp: 36.9°C — Normal', concern: 'NORMAL', icon: '🌡️' },
      bp: { finding: 'BP: 120/80 mmHg — Normal', concern: 'NORMAL', icon: '📉' },
      xray: { finding: 'No fractures. Glass fragments visible in subcutaneous tissue', concern: 'MEDIUM', icon: '🩻' },
    },
  }

  const CONCERN_COLORS = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#22c55e', NORMAL: '#22c55e' }

  function useEquipment(toolId) {
    const sortedVictims = [...VICTIMS].sort((a, b) => a.priority - b.priority)
    const victim = sortedVictims[currentTreatVictim]
    if (!victim) return
    const data = EXAM_DATA[victim.id]?.[toolId]
    if (!data) return
    setExamUsed(prev => ({ ...prev, [toolId]: true }))
    setExamResult({ tool: toolId, ...data })
    if (toolId === 'xray') setBodyView('xray')
    setTreatAnim(toolId)
    setTimeout(() => setTreatAnim(null), 1500)
  }

  // Reset exam state when switching patients
  useEffect(() => {
    if (phase === 'treat') {
      setTreatStep('examine')
      setExamUsed({})
      setExamResult(null)
      setBodyView('normal')
      setTreatAnim(null)
      setSelectedItems([])
    }
  }, [phase, currentTreatVictim]) // eslint-disable-line

  function proceedToSelect() {
    setTreatStep('select')
    setBodyView('normal')
    setExamResult(null)
  }

  function applyTreatment() {
    const sortedVictims = [...VICTIMS].sort((a, b) => a.priority - b.priority)
    const victim = sortedVictims[currentTreatVictim]
    if (!victim) return

    setTreatStep('apply')
    setTreatAnim('applying')

    const correctItems = victim.treatment
    const allCorrect = correctItems.every(i => selectedItems.includes(i)) && selectedItems.length === correctItems.length
    const partialCorrect = correctItems.some(i => selectedItems.includes(i))

    setTimeout(() => {
      setTreatAnim(allCorrect ? 'healed' : 'partial')
      setTreatedVictims(prev => ({ ...prev, [victim.id]: { items: selectedItems, correct: allCorrect, partial: partialCorrect } }))
      if (allCorrect) setFeedback({ type: 'success', msg: `✅ Perfect treatment for ${victim.name}!` })
      else if (partialCorrect) setFeedback({ type: 'warning', msg: `⚠️ Partially correct — review NDMA protocols` })
      else setFeedback({ type: 'error', msg: `❌ Incorrect — patient condition may worsen` })
    }, 2000)

    setTimeout(() => {
      setFeedback(null); setTreatAnim(null); setSelectedItems([])
      if (currentTreatVictim < 4) setCurrentTreatVictim(prev => prev + 1)
      else finishGame()
    }, 4000)
  }

  function finishGame() {
    const sortedVictims = [...VICTIMS].sort((a, b) => a.priority - b.priority)
    let treatScore = 0
    sortedVictims.forEach(v => {
      const t = treatedVictims[v.id]
      if (t?.correct) treatScore += 6
      else if (t?.partial) treatScore += 3
    })
    const allItemsFound = neededItems.every(i => inventory.includes(i))
    const itemScore = allItemsFound ? 30 : Math.round((inventory.filter(i => neededItems.includes(i)).length / Math.max(1, neededItems.length)) * 30)
    const noWrongTreatment = Object.values(treatedVictims).every(t => t.correct) ? 10 : 0
    const total = Math.min(100, triageScore + itemScore + treatScore + noWrongTreatment + 10)
    const res = { score: total, passed: total >= 60, triageScore, itemScore, treatScore, noWrongTreatment, treatedVictims }
    setResult(res)
    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-4', result: { score: total, passed: total >= 60 } } })
    setPhase('result')
  }

  function retry() {
    setPhase('intro'); setTriageOrder([]); setDragIdx(null); setInventory([...SHELTER_ITEMS])
    setNeededItems([]); setTreatedVictims({}); setCurrentTreatVictim(0); setSelectedItems([])
    setFeedback(null); setTriageScore(0); setResult(null); setCollectedShops([])
    raftRef.current = { x: 300, y: 250, vx: 0, vy: 0, angle: 0 }
    cameraRef.current = { x: 0, y: 0 }; keysRef.current = {}
  }

  // ═══════════ INTRO ═══════════
  if (phase === 'intro') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0a0a1a,#1a1a2e,#16213e)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{KEYFRAMES}</style>
      {/* Triage tent backdrop */}
      <ImgBg src={TRIAGE_IMG.tent} style={{ opacity: 0.4, filter: 'brightness(0.5) saturate(1.1) blur(2px)' }}/>
      <ImgBg src={TRIAGE_IMG.stormSky} style={{ opacity: 0.25, filter: 'brightness(0.5)', mixBlendMode: 'multiply' }}/>
      {/* Subtle rain */}
      <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(8deg, transparent 0 22px, rgba(180,210,255,0.06) 22px 24px)', backgroundSize:'100% 140px', animation:'rainFall 0.5s linear infinite', pointerEvents:'none', mixBlendMode:'screen' }}/>
      {['🩹','💊','🏥','🩺','💉','🧴','🩼','🧣','💧','🪡'].map((e,i) => (
        <div key={i} style={{ position:'absolute', left:`${(i*11+5)%95}%`, top:`${(i*17+8)%80}%`, fontSize:32+(i%3)*8, opacity:0.08, animation:`bob ${3+i*0.3}s ease-in-out infinite`, filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>{e}</div>
      ))}
      <div style={{ position:'relative', zIndex:1, maxWidth:660, width:'100%', background:'rgba(255,255,255,0.96)', borderRadius:28, padding:36, border:'3px solid #0f172a', boxShadow:'0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.4) inset', textAlign:'center', backdropFilter:'blur(6px)' }}>
        <div style={{ fontSize:56, marginBottom:8, animation:'bob 2s ease-in-out infinite' }}>🩺</div>
        <div style={{ fontSize:24, fontWeight:900, color:'#0f172a' }}>Field Triage</div>
        <div style={{ fontSize:13, color:'#64748b', fontWeight:600, marginBottom:20 }}>Emergency Medical Response — NDMA Protocol</div>
        <p style={{ color:'#475569', fontSize:13, lineHeight:1.8, marginBottom:20 }}>
          Five rescued flood victims need medical attention at the safety shelter.
          <strong> Examine, prioritize by severity</strong>, navigate your raft to government resource locations
          for missing supplies, and <strong>apply correct treatment</strong>.
        </p>
        <div style={{ background:'#f8fafc', border:'2px dashed #94a3b8', borderRadius:16, padding:16, textAlign:'left', marginBottom:22 }}>
          <div style={{ color:'#0f172a', fontSize:13, lineHeight:1.9, fontWeight:600 }}>
            <div>🔍 <strong>Phase 1:</strong> Examine victims & sort by triage priority</div>
            <div>🚣 <strong>Phase 2:</strong> Navigate raft to govt resource locations for supplies</div>
            <div>💊 <strong>Phase 3:</strong> Apply correct treatments to each victim</div>
          </div>
        </div>
        <div style={{ background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:12, marginBottom:20, textAlign:'left' }}>
          <div style={{ color:'#ef4444', fontSize:11, fontWeight:800, letterSpacing:1, marginBottom:6 }}>🏥 NDMA TRIAGE — START METHOD</div>
          <div style={{ color:'#64748b', fontSize:11, lineHeight:1.7 }}>
            <strong>S</strong>imple <strong>T</strong>riage <strong>A</strong>nd <strong>R</strong>apid <strong>T</strong>reatment:
            CRITICAL → HIGH → MEDIUM → LOW
          </div>
        </div>
        <button onClick={() => setPhase('triage')} style={{ padding:'14px 40px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#1e40af,#1d4ed8)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer' }}>🩺 Begin Triage</button>
        <div style={{ marginTop:12 }}><button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>← Back to Modules</button></div>
      </div>
      <Narrator 
        characterKey="doctor" 
        visible={phase === 'intro'} 
        text="Great job getting everyone to the shelter. I'm the head doctor here. We need your help to triage these 5 victims. Examine them, sort them from most to least critical, and then we'll need you to run the raft to the government cache for supplies to treat them." 
      />
    </div>
  )

  // ═══════════ TRIAGE ═══════════
  if (phase === 'triage') {
    const orderedVictims = triageOrder.map(id => VICTIMS.find(v => v.id === id)).filter(Boolean)
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0a0a1a,#1a1a2e)', padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif", position:'relative' }}>
        <style>{KEYFRAMES}</style>
        <ImgBg src={TRIAGE_IMG.tent} style={{ opacity: 0.18, filter: 'brightness(0.6) blur(3px)' }}/>
        <div style={{ maxWidth:900, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ color:'#ef4444', fontSize:11, fontWeight:800, letterSpacing:2 }}>PHASE 1</div>
              <div style={{ color:'#f1f5f9', fontSize:20, fontWeight:900 }}>🔍 Triage: Sort by Priority</div>
              <div style={{ color:'#64748b', fontSize:11, marginTop:4 }}>Drag: Most critical (top) → Least critical (bottom)</div>
            </div>
            <button onClick={submitTriage} style={{ padding:'10px 28px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>✓ Submit Triage</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {orderedVictims.map((v, idx) => (
                <div key={v.id} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
                  style={{ padding:14, borderRadius:14, cursor:'grab', background: dragIdx === idx ? 'rgba(37,99,235,0.18)' : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))', border:`2px solid ${dragIdx === idx ? '#3b82f6' : SEVERITY_COLORS[v.severity]+'55'}`, userSelect:'none', transition:'all 0.2s', boxShadow: dragIdx === idx ? `0 8px 24px ${SEVERITY_COLORS[v.severity]}55` : '0 4px 10px rgba(0,0,0,0.3)', animation:`cardEnter 0.4s ease-out ${idx*0.07}s both` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ fontSize:11, fontWeight:900, color:'#fff', background:SEVERITY_COLORS[v.severity], width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 10px ${SEVERITY_COLORS[v.severity]}88` }}>{idx+1}</div>
                    {/* Portrait thumbnail with severity ring */}
                    <div style={{ width:48, height:48, borderRadius:12, background:`radial-gradient(circle at 30% 30%, ${SEVERITY_COLORS[v.severity]}33, ${SEVERITY_COLORS[v.severity]}08)`, border:`2px solid ${SEVERITY_COLORS[v.severity]}66`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 10px ${SEVERITY_COLORS[v.severity]}33`, overflow:'hidden' }}>
                      <Sprite src={VICTIM_PORTRAITS[v.id]} fallback={v.emoji} size={42}/>
                    </div>
                    <div><div style={{ color:'#f1f5f9', fontWeight:800, fontSize:13 }}>{v.name}, {v.age}</div>
                    <div style={{ color:SEVERITY_COLORS[v.severity], fontSize:10, fontWeight:700 }}>{v.severity} — {v.injury}</div></div>
                    <div style={{ marginLeft:'auto', color:'#475569', fontSize:16 }}>⠿</div>
                  </div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:4 }}>
                    {Object.entries(v.vitals).map(([k, val]) => (
                      <span key={k} style={{ background:'rgba(255,255,255,0.04)', padding:'1px 6px', borderRadius:4, fontSize:8, color:'#94a3b8' }}><span style={{ color:'#64748b', textTransform:'uppercase' }}>{k}:</span> {val}</span>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                    {v.symptoms.map((s,i) => (<span key={i} style={{ background:'rgba(239,68,68,0.07)', color:'#f87171', padding:'1px 5px', borderRadius:3, fontSize:8 }}>{s}</span>))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:14, padding:14, border:'1px solid rgba(255,255,255,0.06)', position:'sticky', top:20, height:'fit-content' }}>
              <div style={{ color:'#f59e0b', fontSize:11, fontWeight:800, marginBottom:10 }}>📋 Triage Guide</div>
              {[{ level:'CRITICAL', color:'#ef4444', tag:'RED', d:'Life-threatening. Immediate care.' },{ level:'HIGH', color:'#f59e0b', tag:'ORANGE', d:'Urgent. Delayed = deterioration.' },{ level:'MEDIUM', color:'#3b82f6', tag:'YELLOW', d:'Serious but stable. Can wait.' },{ level:'LOW', color:'#22c55e', tag:'GREEN', d:'Minor injuries. Walking wounded.' }].map((l,i) => (
                <div key={i} style={{ marginBottom:8, padding:6, borderRadius:6, background:'rgba(0,0,0,0.2)', borderLeft:`3px solid ${l.color}` }}>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}><span style={{ background:l.color, color:'#fff', padding:'0 5px', borderRadius:3, fontSize:8, fontWeight:800 }}>{l.tag}</span><span style={{ color:l.color, fontSize:10, fontWeight:700 }}>{l.level}</span></div>
                  <div style={{ color:'#94a3b8', fontSize:9, marginTop:2 }}>{l.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {feedback && <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:50, padding:'10px 22px', borderRadius:12, background:'rgba(34,197,94,0.95)', color:'#fff', fontWeight:700, fontSize:12, animation:'fadeIn 0.3s' }}>{feedback.msg}</div>}
      </div>
    )
  }

  // ═══════════ GOVT ALERT — Resource Locations ═══════════
  if (phase === 'govtAlert') {
    const itemData = (id) => ALL_ITEMS.find(i => i.id === id)
    const groups = [
      { type: 'Medical Stores', emoji: '🏥', shops: SHOPS.filter(s => s.id.startsWith('med')), needed: neededItems.filter(i => ['splint','bandage','antiseptic','tweezers'].includes(i)) },
      { type: 'Pharmacies', emoji: '💊', shops: SHOPS.filter(s => s.id.startsWith('pharm')), needed: neededItems.filter(i => ['glucose','electrolyte','paracetamol'].includes(i)) },
      { type: 'General Stores', emoji: '🏪', shops: SHOPS.filter(s => s.id.startsWith('gen')), needed: neededItems.filter(i => ['dry_clothes'].includes(i)) },
    ].filter(g => g.needed.length > 0)
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0a0a1a,#0d1b2a)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth:800, width:'100%', animation:'fadeIn 0.5s ease-out' }}>
          {/* Laptop bezel */}
          <div style={{ background:'#1a1a1a', borderRadius:'14px 14px 0 0', padding:'6px 14px', display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ display:'flex', gap:5 }}><div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', border:'1px solid #dc2626' }}/><div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b', border:'1px solid #d97706' }}/><div style={{ width:10, height:10, borderRadius:'50%', background:'#22c55e', border:'1px solid #16a34a' }}/></div>
            <div style={{ flex:1, background:'#2a2a2e', borderRadius:6, padding:'4px 12px', display:'flex', alignItems:'center', gap:6, marginLeft:10 }}>
              <span style={{ color:'#22c55e', fontSize:10 }}>🔒</span>
              <span style={{ color:'#a1a1aa', fontSize:9, fontFamily:'monospace' }}>https://ndma.gov.in/emergency/resource-locator</span>
            </div>
          </div>
          <div style={{ background:'#fff', border:'3px solid #1a1a1a', borderTop:'2px solid #333', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(90deg,#1e3a5f,#1e40af,#1d4ed8)', padding:'10px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:6, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>🇮🇳</div>
              <div style={{ flex:1 }}><div style={{ color:'#fff', fontWeight:900, fontSize:13 }}>NDMA Disaster Resource Locator</div><div style={{ color:'#93c5fd', fontSize:8, fontWeight:600 }}>National Disaster Management Authority • Ministry of Home Affairs</div></div>
              <div style={{ background:'#ef4444', color:'#fff', padding:'3px 10px', borderRadius:999, fontSize:8, fontWeight:800, animation:'pulse 1.5s infinite', flexShrink:0 }}>🔴 LIVE</div>
            </div>
            <div style={{ background:'#fef2f2', borderBottom:'2px solid #fca5a5', padding:'8px 16px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:14 }}>⚠️</span>
              <span style={{ color:'#991b1b', fontSize:10, fontWeight:800 }}>EMERGENCY — {groups.reduce((a,g) => a + g.shops.length, 0)} Resource Points Active</span>
            </div>
            <div style={{ padding:'12px 16px', maxHeight:400, overflowY:'auto' }}>
              <div style={{ background:'#f0f9ff', border:'1px solid #bae6fd', borderRadius:8, padding:10, marginBottom:12, fontSize:10, color:'#0c4a6e', lineHeight:1.6 }}>
                📢 <strong>Multiple resource points available</strong> per category. Compare <strong>distance</strong>, <strong>stock</strong>, and <strong>safety</strong> before selecting your route.
              </div>
              {groups.map(group => (
                <div key={group.type} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, borderBottom:'1px solid #e5e7eb', paddingBottom:4 }}>
                    <span style={{ fontSize:14 }}>{group.emoji}</span>
                    <span style={{ color:'#0f172a', fontSize:12, fontWeight:900 }}>{group.type}</span>
                    <span style={{ color:'#64748b', fontSize:8 }}>Need: {group.needed.map(i => itemData(i)?.name).join(', ')}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${group.shops.length}, 1fr)`, gap:8 }}>
                    {group.shops.map(shop => {
                      const d = Math.round(dist(300, 250, shop.mapX + shop.w/2, shop.mapY + shop.h/2))
                      const matched = shop.items.filter(i => group.needed.includes(i))
                      const missing = group.needed.filter(i => !shop.items.includes(i))
                      return (
                        <div key={shop.id} style={{ padding:10, borderRadius:8, background:'#fafafa', border:`2px solid ${SAFETY_COLORS[shop.safety]}30`, position:'relative' }}>
                          <div style={{ position:'absolute', top:4, right:4, background:SAFETY_COLORS[shop.safety]+'20', color:SAFETY_COLORS[shop.safety], padding:'1px 5px', borderRadius:4, fontSize:7, fontWeight:800, border:`1px solid ${SAFETY_COLORS[shop.safety]}40` }}>{SAFETY_LABELS[shop.safety]}</div>
                          <div style={{ fontWeight:800, fontSize:11, color:'#0f172a', marginBottom:1 }}>{shop.emoji} {shop.name}</div>
                          <div style={{ fontSize:8, color:'#64748b', marginBottom:4 }}>📍 Sector {shop.sector} • ~{d}m</div>
                          <div style={{ display:'inline-block', background: shop.status === 'OPEN' ? '#dcfce7' : '#fef9c3', color: shop.status === 'OPEN' ? '#166534' : '#854d0e', padding:'1px 5px', borderRadius:3, fontSize:7, fontWeight:700, marginBottom:4 }}>{shop.status === 'OPEN' ? '🟢 OPEN' : '🟡 LIMITED'}</div>
                          <div style={{ fontSize:8, color:'#374151', fontWeight:700, marginBottom:2 }}>Has {matched.length}/{group.needed.length}:</div>
                          <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginBottom:2 }}>
                            {matched.map(id => <span key={id} style={{ background:'#eff6ff', color:'#1e40af', padding:'1px 4px', borderRadius:2, fontSize:7 }}>{itemData(id)?.emoji}{itemData(id)?.name}</span>)}
                          </div>
                          {missing.length > 0 && <div style={{ fontSize:7, color:'#dc2626' }}>❌ {missing.map(i => itemData(i)?.name).join(', ')}</div>}
                          <div style={{ fontSize:7, color:'#64748b', marginTop:2, fontStyle:'italic' }}>{shop.stock}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:6, padding:8, marginBottom:10 }}>
                <div style={{ color:'#92400e', fontSize:9, fontWeight:800 }}>⚠ NDMA ADVISORY</div>
                <div style={{ color:'#78350f', fontSize:8, lineHeight:1.5 }}>• Choose wisely — some locations have incomplete stock • 🚫 UNSAFE zones have active hazards • All points marked on your phone</div>
              </div>
              <div style={{ textAlign:'center' }}><button onClick={() => setPhase('supply')} style={{ padding:'10px 32px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#1e40af,#3b82f6)', color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer' }}>🚣 Begin Supply Run</button></div>
            </div>
          </div>
          <div style={{ width:'50%', height:10, margin:'0 auto', background:'linear-gradient(180deg,#2a2a2a,#1a1a1a)', borderRadius:'0 0 6px 6px' }}/>
        </div>
      </div>
    )
  }

  // ═══════════ SUPPLY RUN — RAFT NAVIGATION ═══════════
  if (phase === 'supply') {
    const r = raftRef.current
    const rcx = r.x + RAFT_W / 2, rcy = r.y + RAFT_H / 2
    const itemData = (id) => ALL_ITEMS.find(i => i.id === id)
    const collectedNeeded = neededItems.filter(i => inventory.includes(i))
    const remaining = neededItems.filter(i => !inventory.includes(i))
    const allCollected = remaining.length === 0

    // Find nearest unvisited shop
    const nearestShop = SHOPS.filter(s => !collectedShops.includes(s.id) && s.items.some(i => neededItems.includes(i) && !inventory.includes(i)))
      .map(s => ({ ...s, d: dist(rcx, rcy, s.mapX + s.w/2, s.mapY + s.h/2) }))
      .sort((a,b) => a.d - b.d)[0]

    // If all collected, point to shelter
    const shelCx = SHELTER_POS.x + SHELTER_POS.w / 2, shelCy = SHELTER_POS.y + SHELTER_POS.h / 2
    // If a shop is selected in the phone, point compass to it
    const selectedShop = selectedShopId ? SHOPS.find(s => s.id === selectedShopId) : null
    const compassTarget = selectedShop
      ? { x: selectedShop.mapX + selectedShop.w/2, y: selectedShop.mapY + selectedShop.h/2, label: `📍 ${selectedShop.emoji} ${selectedShop.name}`, d: dist(rcx, rcy, selectedShop.mapX + selectedShop.w/2, selectedShop.mapY + selectedShop.h/2), color: '#3b82f6' }
      : allCollected
        ? { x: shelCx, y: shelCy, label: '🏥 SHELTER', d: dist(rcx, rcy, shelCx, shelCy), color: '#22c55e' }
        : nearestShop ? { x: nearestShop.mapX + nearestShop.w/2, y: nearestShop.mapY + nearestShop.h/2, label: `${nearestShop.emoji} ${nearestShop.name}`, d: nearestShop.d, color: '#fbbf24' } : null

    return (
      <div style={{ position:'fixed', inset:0, overflow:'hidden', background:'#030810', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>

        {/* World */}
        <div ref={worldRef} style={{ position:'absolute', width:SUPPLY_MAP_W, height:SUPPLY_MAP_H, willChange:'transform' }}>
          {/* Water */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,#050b18,#081020,#0a1428)' }}>
            {/* Tileable flood texture */}
            <ImgBg src={TRIAGE_IMG.floodTile} size="512px" repeat="repeat" style={{ opacity: 0.4, mixBlendMode: 'overlay' }}/>
            {Array.from({ length: 40 }).map((_,i) => (
              <div key={i} style={{ position:'absolute', left:(i*131)%SUPPLY_MAP_W, top:(i*97+50)%SUPPLY_MAP_H, width:30+(i%4)*10, height:3, borderRadius:2, background:'rgba(37,99,235,0.08)', transform:`rotate(${(i*17)%30-15}deg)` }}/>
            ))}
            {/* Drifting ripples */}
            {Array.from({ length: 22 }).map((_,i) => (
              <div key={`r${i}`} style={{ position:'absolute', left:(i*191)%SUPPLY_MAP_W, top:(i*157+40)%SUPPLY_MAP_H, width:12, height:12, borderRadius:'50%', border:'1px solid rgba(147,197,253,0.18)', animation:`ripple ${2+(i%4)*0.5}s ease-out ${(i%5)*0.4}s infinite` }}/>
            ))}
          </div>

          {/* Obstacle buildings */}
          {SUPPLY_BUILDINGS.map((b,i) => (
            <div key={i} style={{ position:'absolute', left:b.x, top:b.y, width:b.w, height:b.h }}>
              <div style={{ position:'absolute', inset:0, background:b.color, border:'2px solid #252540', borderRadius:3, overflow:'hidden', boxShadow:'inset 0 -10px 20px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.5)' }}>
                <ImgBg src={`/assets/rescue/building_submerged_${(i%3)+1}.png`} style={{ opacity: 0.85 }}/>
                <div style={{ position:'absolute', top:-6, left:-3, right:-3, height:10, background:b.roof, borderRadius:'3px 3px 0 0', zIndex:1 }}/>
              </div>
            </div>
          ))}

          {/* Shelter */}
          <div style={{ position:'absolute', left:SHELTER_POS.x, top:SHELTER_POS.y, width:SHELTER_POS.w, height:SHELTER_POS.h, zIndex:15 }}>
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#065f46,#047857)', border:'3px solid #22c55e', borderRadius:8, boxShadow:'0 0 30px rgba(34,197,94,0.4), 0 8px 20px rgba(0,0,0,0.6)', overflow:'hidden' }}>
              <ImgBg src={TRIAGE_IMG.shelterCamp} style={{ opacity: 0.85 }}/>
              <div style={{ position:'absolute', top:-20, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', color:'#22c55e', fontSize:9, fontWeight:800, letterSpacing:1, textShadow:'0 0 6px rgba(34,197,94,0.5)' }}>🏥 SAFETY SHELTER</div>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:28, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}>🏥</div>
            </div>
            {allCollected && <div style={{ position:'absolute', inset:-8, borderRadius:12, border:'2px solid rgba(34,197,94,0.4)', animation:'shout-ring 2s ease-out infinite', pointerEvents:'none' }}/>}
          </div>

          {/* Shop buildings */}
          {SHOPS.map(shop => {
            const visited = collectedShops.includes(shop.id)
            const hasNeeded = shop.items.some(i => neededItems.includes(i) && !inventory.includes(i))
            return (
              <div key={shop.id} style={{ position:'absolute', left:shop.mapX, top:shop.mapY, width:shop.w, height:shop.h, zIndex:15 }}>
                {/* Selection beacon */}
                {selectedShopId === shop.id && (
                  <>
                    <div style={{ position:'absolute', inset:-20, borderRadius:'50%', border:'3px solid #3b82f6', animation:'shout-ring 1.5s ease-out infinite', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', inset:-12, borderRadius:'50%', border:'2px solid rgba(59,130,246,0.5)', animation:'pulse 1s infinite', pointerEvents:'none' }}/>
                    <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50)', whiteSpace:'nowrap', background:'rgba(59,130,246,0.95)', color:'#fff', padding:'2px 8px', borderRadius:6, fontSize:8, fontWeight:800, zIndex:25, animation:'bob 1s ease-in-out infinite' }}>📍 SELECTED</div>
                  </>
                )}
                <div style={{ position:'absolute', inset:0, background: visited ? '#1a2e1a' : shop.color, border:`3px solid ${visited ? '#22c55e' : hasNeeded ? '#fbbf24' : '#475569'}`, borderRadius:6, boxShadow: hasNeeded ? '0 0 24px rgba(251,191,36,0.45), 0 6px 14px rgba(0,0,0,0.55)' : '0 4px 12px rgba(0,0,0,0.5)', transition:'all 0.3s', overflow:'hidden' }}>
                  <ImgBg src={SHOP_IMG[shop.id]} style={{ opacity: visited ? 0.45 : 0.8, filter: visited ? 'grayscale(0.5)' : 'none' }}/>
                  <div style={{ position:'absolute', top:-6, left:-3, right:-3, height:10, background:shop.roof, borderRadius:'3px 3px 0 0', zIndex:1 }}/>
                  <div style={{ position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', color: visited ? '#22c55e' : '#fbbf24', fontSize:9, fontWeight:800, letterSpacing:1, animation: hasNeeded ? 'pulse 1.5s infinite' : 'none', textShadow:'0 1px 4px rgba(0,0,0,0.8)' }}>
                    {shop.emoji} {shop.name} {visited ? '✓' : ''}
                  </div>
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:24, filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.7))' }}>{shop.emoji}</div>
                  {/* Item icons */}
                  <div style={{ position:'absolute', bottom:-18, left:0, right:0, display:'flex', justifyContent:'center', gap:2 }}>
                    {shop.items.filter(i => neededItems.includes(i)).map(itemId => {
                      const got = inventory.includes(itemId)
                      return <span key={itemId} style={{ fontSize:10, opacity: got ? 0.3 : 1 }}>{itemData(itemId)?.emoji}</span>
                    })}
                  </div>
                </div>
                {/* Govt resource label */}
                {hasNeeded && !visited && (
                  <div style={{ position:'absolute', bottom:-32, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:6, padding:'2px 8px', color:'#fbbf24', fontSize:8, fontWeight:700 }}>
                    📡 GOVT RESOURCE POINT
                  </div>
                )}
              </div>
            )
          })}

          {/* Hazard zones */}
          {HAZARD_ZONES.map((h, i) => (
            <div key={`hazard${i}`} style={{ position:'absolute', left:h.x - h.r, top:h.y - h.r, width:h.r * 2, height:h.r * 2, borderRadius:'50%', zIndex:12, pointerEvents:'none' }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'rgba(239,68,68,0.08)', border:'2px dashed rgba(239,68,68,0.3)', animation:'pulse 2s infinite' }}/>
              <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:14, animation:'bob 1.5s ease-in-out infinite' }}>{h.type === 'wire' ? '⚡' : '🪨'}</div>
              <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', color:'#ef4444', fontSize:7, fontWeight:800, letterSpacing:1 }}>⚠ {h.type === 'wire' ? 'LIVE WIRES' : 'DEBRIS'}</div>
            </div>
          ))}

          {/* Raft */}
          <div ref={raftElRef} style={{ position:'absolute', width:RAFT_W, height:RAFT_H, zIndex:20, left:300, top:250, transformOrigin:'center center', filter:'drop-shadow(0 6px 8px rgba(0,0,0,0.7))' }}>
            <div style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', width:16, height:8, borderRadius:'50%', background:'rgba(147,197,253,0.18)', animation:'wake 1s ease-out infinite' }}/>
            <div style={{ position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', width:24, height:10, borderRadius:'50%', background:'rgba(147,197,253,0.1)', animation:'wake 1.4s ease-out 0.3s infinite' }}/>
            {raftImgLoaded ? (
              <img src={TRIAGE_IMG.raft} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain', pointerEvents:'none' }}/>
            ) : (<>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', gap:1 }}>
                {[0,1,2,3,4].map(i => (<div key={i} style={{ flex:1, background:'linear-gradient(90deg,#5c3d1e,#8B5A2B,#5c3d1e)', borderRadius:2, border:'1px solid #3a2010' }}/>))}
              </div>
              <div style={{ position:'absolute', left:-8, top:'35%', width:RAFT_W+16, height:3, background:'#78350f', borderRadius:2 }}/>
              <div style={{ position:'absolute', top:6, left:'50%', transform:'translateX(-50%)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#fbbf24', border:'1px solid #78350f', margin:'0 auto' }}/>
                <div style={{ width:10, height:8, background:'#ea580c', borderRadius:'2px 2px 0 0', margin:'0 auto' }}/>
              </div>
            </>)}
          </div>
        </div>

        {/* Torch/Darkness */}
        <div ref={torchElRef} style={{ position:'fixed', width:0, height:0, zIndex:30, pointerEvents:'none' }}>
          <div style={{ position:'absolute', left:-SUPPLY_MAP_W, top:-SUPPLY_MAP_H, width:SUPPLY_MAP_W*2, height:SUPPLY_MAP_H*2,
            background:`radial-gradient(circle ${TORCH_RADIUS}px at center, transparent 0%, rgba(0,0,0,0.12) 30%, rgba(0,0,0,0.6) 60%, rgba(2,4,10,0.88) 80%, rgba(2,4,10,0.95) 100%)` }}/>
        </div>

        {/* Heavier rain overlay */}
        <div style={{ position:'fixed', inset:0, zIndex:31, pointerEvents:'none', background:'repeating-linear-gradient(8deg, transparent 0 18px, rgba(174,194,224,0.06) 18px 20px)', backgroundSize:'100% 130px', animation:'rainFall 0.35s linear infinite', mixBlendMode:'screen' }}/>
        {/* Lightning flash */}
        <div style={{ position:'fixed', inset:0, zIndex:32, pointerEvents:'none', background:'rgba(180,200,255,0.4)', animation:'lightningFlash 12s linear infinite' }}/>
        {/* Edge vignette */}
        <div style={{ position:'fixed', inset:0, zIndex:33, pointerEvents:'none', boxShadow:'inset 0 0 220px 50px rgba(0,0,0,0.6)' }}/>

        {/* Collect flash */}
        {collectFlash && <div style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(34,197,94,0.15)', pointerEvents:'none', animation:'fadeIn 0.2s' }}/>}

        {/* HUD */}
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:40, padding:'8px 14px', display:'flex', gap:10, alignItems:'center', justifyContent:'space-between', background:'rgba(5,10,20,0.88)', backdropFilter:'blur(8px)', borderBottom:'2px solid rgba(59,130,246,0.4)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ background:'linear-gradient(135deg,#1e40af,#3b82f6)', color:'#fff', padding:'4px 12px', borderRadius:999, fontWeight:800, fontSize:11, letterSpacing:1 }}>🏪 SUPPLY RUN</div>
            <div style={{ color:'#f1f5f9', fontSize:12, fontWeight:700 }}>📦 {collectedNeeded.length}/{neededItems.length}</div>
          </div>

          {compassTarget && (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:`${compassTarget.color}15`, padding:'4px 10px', borderRadius:999, border:`1px solid ${compassTarget.color}40` }}>
              <span style={{ fontSize:14, animation:'compassPulse 2s infinite', transform:`rotate(${Math.atan2(compassTarget.y - rcy, compassTarget.x - rcx) * 180 / Math.PI - 90}deg)`, display:'inline-block' }}>🧭</span>
              <span style={{ color:compassTarget.color, fontSize:10, fontWeight:700 }}>{compassTarget.label}</span>
            </div>
          )}

          <div style={{ color:'#64748b', fontSize:10, fontWeight:600 }}>
            {allCollected ? '✅ All supplies! Return to shelter' : `${remaining.length} item(s) remaining`}
          </div>
        </div>

        {/* Interaction bar */}
        {interacting && interactProg > 0 && (
          <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:40, width:160, background:'rgba(5,10,20,0.9)', borderRadius:10, padding:8, border:'1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginBottom:4, textAlign:'center' }}>{interacting.type === 'collect' ? '📦 COLLECTING...' : '🏥 RETURNING...'}</div>
            <div style={{ width:'100%', height:6, background:'rgba(255,255,255,0.1)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, width:`${interactProg*100}%`, background:interacting.type === 'collect' ? '#3b82f6' : '#22c55e', transition:'width 0.1s' }}/>
            </div>
          </div>
        )}

        {/* Phone/Device Overlay — Realistic Smartphone */}
        {showPhone && (
          <div style={{ position:'fixed', top:46, right:8, zIndex:42, width:230, background:'#000', borderRadius:26, border:'3px solid #2a2a2a', boxShadow:'0 10px 40px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.05)', overflow:'hidden' }}>
            {/* Dynamic Island */}
            <div style={{ display:'flex', justifyContent:'center', padding:'4px 0 0' }}>
              <div style={{ width:60, height:14, background:'#1a1a1a', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:'#1e293b' }}/>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#0c1425', border:'1px solid #1e293b' }}/>
              </div>
            </div>
            {/* Status bar */}
            <div style={{ padding:'2px 12px 3px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:'#fff', fontSize:8, fontWeight:700 }}>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
              <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                <span style={{ color:'#fff', fontSize:7 }}>📶</span>
                <div style={{ width:16, height:8, borderRadius:2, border:'1px solid #fff', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:1, borderRadius:1, background:'#22c55e', width:'70%' }}/>
                </div>
              </div>
            </div>
            {/* App header */}
            <div style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)', padding:'6px 10px', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:12 }}>📡</span>
              <div style={{ flex:1 }}>
                <div style={{ color:'#fff', fontSize:9, fontWeight:800, letterSpacing:0.5 }}>NDMA Emergency</div>
                <div style={{ color:'#fca5a5', fontSize:6, fontWeight:600 }}>Resource Locator</div>
              </div>
              <div style={{ display:'flex', gap:2, alignItems:'center' }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#22c55e', animation:'pulse 1.5s infinite' }}/>
                <span style={{ color:'#fca5a5', fontSize:6, fontWeight:700 }}>LIVE</span>
              </div>
            </div>

            {/* Minimap — GTA style with hazard zones */}
            <div style={{ position:'relative', width:'100%', height:110, background:'#050b18', borderBottom:'1px solid #1e293b' }}>
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#060d1a,#081020)' }}/>
              {[0.25,0.5,0.75].map(p => <div key={`h${p}`} style={{ position:'absolute', left:0, right:0, top:`${p*100}%`, height:1, background:'rgba(59,130,246,0.05)' }}/>)}
              {[0.25,0.5,0.75].map(p => <div key={`v${p}`} style={{ position:'absolute', top:0, bottom:0, left:`${p*100}%`, width:1, background:'rgba(59,130,246,0.05)' }}/>)}
              <div style={{ position:'absolute', left:`${(SHELTER_POS.x/SUPPLY_MAP_W)*100}%`, top:`${(SHELTER_POS.y/SUPPLY_MAP_H)*100}%`, width:`${(SHELTER_POS.w/SUPPLY_MAP_W)*100}%`, height:`${(SHELTER_POS.h/SUPPLY_MAP_H)*100}%`, background:'rgba(34,197,94,0.3)', borderRadius:2, border:'1px solid rgba(34,197,94,0.5)' }}/>
              {HAZARD_ZONES.map((h,i) => (
                <div key={`hz${i}`} style={{ position:'absolute', left:`${((h.x-h.r)/SUPPLY_MAP_W)*100}%`, top:`${((h.y-h.r)/SUPPLY_MAP_H)*100}%`, width:`${(h.r*2/SUPPLY_MAP_W)*100}%`, height:`${(h.r*2/SUPPLY_MAP_H)*100}%`, borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'1px dashed rgba(239,68,68,0.3)' }}/>
              ))}
              {SHOPS.map(s => {
                const visited = collectedShops.includes(s.id)
                const hasNeeded = s.items.some(i => neededItems.includes(i) && !inventory.includes(i))
                const isSelected = selectedShopId === s.id
                return (
                  <div key={s.id} style={{ position:'absolute', left:`${(s.mapX/SUPPLY_MAP_W)*100}%`, top:`${(s.mapY/SUPPLY_MAP_H)*100}%` }}>
                    {isSelected && <div style={{ position:'absolute', left:-6, top:-6, width:20, height:20, borderRadius:'50%', border:'2px solid #3b82f6', animation:'shout-ring 1.5s ease-out infinite' }}/>}
                    {isSelected && <div style={{ position:'absolute', left:-3, top:-3, width:14, height:14, borderRadius:'50%', border:'1.5px solid rgba(59,130,246,0.6)', animation:'pulse 1s infinite' }}/>}
                    <div style={{ width:8, height:8, borderRadius:visited ? 2 : '50%', background: isSelected ? '#3b82f6' : visited ? '#22c55e' : hasNeeded ? '#fbbf24' : '#475569', border:`1px solid ${isSelected ? '#3b82f6' : visited ? '#22c55e' : hasNeeded ? '#fbbf24' : '#475569'}`, animation: isSelected ? 'pulse 0.8s infinite' : hasNeeded ? 'pulse 1.5s infinite' : 'none', boxShadow: isSelected ? '0 0 8px rgba(59,130,246,0.6)' : 'none' }}/>
                  </div>
                )
              })}
              <div style={{ position:'absolute', left:`${(r.x/SUPPLY_MAP_W)*100}%`, top:`${(r.y/SUPPLY_MAP_H)*100}%`, width:7, height:7, borderRadius:'50%', background:'#3b82f6', border:'2px solid #fff', zIndex:2, boxShadow:'0 0 6px rgba(59,130,246,0.5)' }}/>
              <div style={{ position:'absolute', bottom:2, left:4, right:4, display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:5, color:'#475569' }}>🟢Shelter 🟡Store 🔵You</span>
                <span style={{ fontSize:5, color:'#475569' }}>🔴Hazard</span>
              </div>
            </div>

            {/* Resource list */}
            <div style={{ padding:'6px 8px', maxHeight:200, overflowY:'auto', background:'#0a0a0f' }}>
              <div style={{ color:'#ef4444', fontSize:7, fontWeight:800, letterSpacing:1, marginBottom:4, display:'flex', alignItems:'center', gap:3 }}><span style={{ fontSize:8 }}>📍</span> RESOURCE POINTS</div>
              {SHOPS.map(shop => {
                const visited = collectedShops.includes(shop.id)
                const shopNeeded = shop.items.filter(i => neededItems.includes(i))
                const d = Math.round(dist(rcx, rcy, shop.mapX + shop.w/2, shop.mapY + shop.h/2))
                return (
                  <div key={shop.id} onClick={() => setSelectedShopId(selectedShopId === shop.id ? null : shop.id)} style={{ marginBottom:4, padding:'4px 6px', borderRadius:6, cursor:'pointer', background: selectedShopId === shop.id ? 'rgba(59,130,246,0.15)' : visited ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)', border:`1px solid ${selectedShopId === shop.id ? '#3b82f6' : visited ? '#22c55e20' : SAFETY_COLORS[shop.safety]+'20'}`, transition:'all 0.2s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:9, fontWeight:700, color: visited ? '#22c55e' : '#e2e8f0' }}>{shop.emoji} {shop.name}</span>
                      <div style={{ display:'flex', gap:3, alignItems:'center' }}>
                        <span style={{ fontSize:6, padding:'0 3px', borderRadius:2, background:SAFETY_COLORS[shop.safety]+'20', color:SAFETY_COLORS[shop.safety], fontWeight:800 }}>{shop.safety === 'safe' ? '✓' : shop.safety === 'caution' ? '!' : '✗'}</span>
                        <span style={{ fontSize:7, color:'#64748b' }}>{d}m</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginTop:2 }}>
                      {shopNeeded.map(itemId => {
                        const got = inventory.includes(itemId)
                        const item = itemData(itemId)
                        return <span key={itemId} style={{ fontSize:6, padding:'0 3px', borderRadius:2, background: got ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)', color: got ? '#22c55e' : '#f87171', textDecoration: got ? 'line-through' : 'none' }}>{item?.emoji}{item?.name}</span>
                      })}
                    </div>
                  </div>
                )
              })}
              <div style={{ borderTop:'1px solid #1e293b', paddingTop:4, marginTop:3 }}>
                <div style={{ color:'#f59e0b', fontSize:7, fontWeight:800, marginBottom:3 }}>📝 CHECKLIST</div>
                {neededItems.map(itemId => {
                  const item = itemData(itemId)
                  const collected = inventory.includes(itemId)
                  return (
                    <div key={itemId} style={{ display:'flex', alignItems:'center', gap:3, padding:'1px 0' }}>
                      <div style={{ width:9, height:9, borderRadius:2, border:`1.5px solid ${collected ? '#22c55e' : '#475569'}`, background:collected ? '#22c55e' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:5, color:'#fff', flexShrink:0 }}>{collected && '✓'}</div>
                      <span style={{ fontSize:8, color:collected ? '#22c55e' : '#e2e8f0', fontWeight:600, textDecoration:collected ? 'line-through' : 'none' }}>{item?.emoji} {item?.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Home indicator */}
            <div style={{ display:'flex', justifyContent:'center', padding:'4px 0 6px', background:'#0a0a0f' }}>
              <div style={{ width:40, height:4, borderRadius:2, background:'#333' }}/>
            </div>
          </div>
        )}

        {/* Phone toggle button */}
        <button onClick={() => setShowPhone(p => !p)} style={{ position:'fixed', top:46, right: showPhone ? 244 : 8, zIndex:43, background:'rgba(5,10,20,0.9)', border:'1px solid #334155', borderRadius:8, padding:'4px 8px', color:'#94a3b8', fontSize:10, cursor:'pointer', fontWeight:700, transition:'right 0.3s' }}>
          {showPhone ? '📱 ✕' : '📱'}
        </button>

        {/* Controls */}
        <div style={{ position:'fixed', bottom:10, left:'50%', transform:'translateX(-50%)', zIndex:40, display:'flex', gap:8, background:'rgba(5,10,20,0.85)', padding:'5px 14px', borderRadius:10, fontSize:10, color:'#64748b', fontWeight:600 }}>
          <span>↑←↓→ Move</span><span>·</span><span>E/Space Collect</span><span>·</span><span>📱 Device</span>
        </div>

        {feedback && <div style={{ position:'fixed', bottom:40, left:'50%', transform:'translateX(-50%)', zIndex:50, padding:'10px 22px', borderRadius:12, background: feedback.type === 'success' ? 'rgba(34,197,94,0.95)' : 'rgba(59,130,246,0.95)', color:'#fff', fontWeight:700, fontSize:12, animation:'fadeIn 0.3s' }}>{feedback.msg}</div>}
      </div>
    )
  }

  // ═══════════ CHAPTER BREAK — Supply → Treatment ═══════════
  if (phase === 'chapterBreak') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#050a15,#0a1628,#050a15)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <div style={{ textAlign:'center', maxWidth:600, padding:40, animation:'fadeIn 1s ease-out' }}>
          <div style={{ fontSize:14, color:'#22c55e', fontWeight:800, letterSpacing:4, marginBottom:6, animation:'pulse 2s infinite' }}>✅ CHAPTER COMPLETE</div>
          <div style={{ fontSize:32, color:'#f1f5f9', fontWeight:900, marginBottom:8 }}>Supply Run Successful</div>
          <div style={{ color:'#64748b', fontSize:13, marginBottom:24 }}>All medical supplies have been delivered to the emergency shelter</div>

          <div style={{ background:'rgba(255,255,255,0.03)', borderRadius:16, padding:20, border:'1px solid rgba(255,255,255,0.06)', marginBottom:24 }}>
            <div style={{ color:'#94a3b8', fontSize:10, fontWeight:800, letterSpacing:1, marginBottom:10 }}>📦 SUPPLIES SECURED</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
              {inventory.map(id => { const item = ALL_ITEMS.find(i => i.id === id); return item ? <span key={id} style={{ background:'rgba(34,197,94,0.1)', color:'#22c55e', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, border:'1px solid rgba(34,197,94,0.2)' }}>{item.emoji} {item.name}</span> : null })}
            </div>
          </div>

          <div style={{ width:'100%', height:1, background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)', marginBottom:24 }}/>

          <div style={{ fontSize:14, color:'#f59e0b', fontWeight:800, letterSpacing:2, marginBottom:6 }}>NEXT CHAPTER</div>
          <div style={{ fontSize:26, color:'#f1f5f9', fontWeight:900, marginBottom:6 }}>🏥 Field Hospital — Emergency Triage</div>
          <div style={{ color:'#94a3b8', fontSize:12, lineHeight:1.7, marginBottom:24 }}>
            5 rescued victims await treatment. Use medical equipment to examine each patient,<br/>
            diagnose their condition, and apply the correct treatment following NDMA protocols.
          </div>

          <div style={{ background:'rgba(37,99,235,0.08)', borderRadius:10, padding:14, border:'1px solid rgba(37,99,235,0.15)', marginBottom:24, textAlign:'left' }}>
            <div style={{ color:'#93c5fd', fontSize:10, fontWeight:800, marginBottom:6 }}>📋 HOW IT WORKS</div>
            <div style={{ color:'#94a3b8', fontSize:11, lineHeight:1.8 }}>
              1️⃣ <strong style={{ color:'#e2e8f0' }}>Examine</strong> — Use 🩺 Stethoscope, 🌡️ Thermometer, 💉 BP Cuff, and 🩻 X-Ray to gather findings<br/>
              2️⃣ <strong style={{ color:'#e2e8f0' }}>Diagnose</strong> — Review results and understand the patient's condition<br/>
              3️⃣ <strong style={{ color:'#e2e8f0' }}>Treat</strong> — Select the correct items from your supplies and apply treatment
            </div>
          </div>

          <button onClick={() => setPhase('treat')} style={{ padding:'14px 48px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#1e40af,#3b82f6)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 8px 24px rgba(30,64,175,0.4)' }}>
            🏥 Enter Field Hospital
          </button>
        </div>
      </div>
    )
  }

  // ═══════════ TREATMENT ═══════════
  if (phase === 'treat') {
    const sortedVictims = [...VICTIMS].sort((a, b) => a.priority - b.priority)
    const victim = sortedVictims[currentTreatVictim]
    const injuryPos = { v1: { x: 48, y: 38, label: 'Abdomen' }, v2: { x: 50, y: 18, label: 'Head' }, v3: { x: 50, y: 45, label: 'Core' }, v4: { x: 35, y: 72, label: 'Left Leg' }, v5: { x: 60, y: 42, label: 'Arms' } }
    const inj = victim ? injuryPos[victim.id] : { x: 50, y: 50, label: '' }
    const equipUsedCount = Object.keys(examUsed).length
    const allExamDone = equipUsedCount >= 4
    const EQUIP = [
      { id: 'stethoscope', emoji: '🩺', label: 'Stethoscope', desc: 'Listen to heart & lungs' },
      { id: 'thermometer', emoji: '🌡️', label: 'Thermometer', desc: 'Check body temperature' },
      { id: 'bp', emoji: '💉', label: 'BP Monitor', desc: 'Measure blood pressure' },
      { id: 'xray', emoji: '🩻', label: 'X-Ray', desc: 'Scan for fractures' },
    ]

    return (
      <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>

        {/* Hospital background image */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src="/assets/medical/hospital_bg.png" alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.3, filter:'blur(2px)' }}/>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,rgba(5,10,25,0.85),rgba(10,22,40,0.95))' }}/>
        </div>

        {/* Header */}
        <div style={{ position:'relative', zIndex:1, padding:'10px 20px', background:'rgba(5,10,25,0.95)', borderBottom:'2px solid rgba(34,197,94,0.2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ color:'#22c55e', fontSize:9, fontWeight:800, letterSpacing:2 }}>CHAPTER 2 • FIELD HOSPITAL</div>
            <div style={{ color:'#f1f5f9', fontSize:16, fontWeight:900 }}>🏥 Emergency Triage — Patient {currentTreatVictim+1}/5</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ background:`${SEVERITY_COLORS[victim?.severity]}15`, padding:'3px 10px', borderRadius:6, border:`1px solid ${SEVERITY_COLORS[victim?.severity]}30` }}>
              <span style={{ color:SEVERITY_COLORS[victim?.severity], fontSize:9, fontWeight:800 }}>{victim?.severity}</span>
            </div>
            <div style={{ background:'rgba(239,68,68,0.1)', padding:'3px 8px', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center', gap:3 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#ef4444', animation:'pulse 1s infinite' }}/>
              <span style={{ color:'#ef4444', fontSize:8, fontWeight:800 }}>CRITICAL CARE</span>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div style={{ position:'relative', zIndex:1, padding:'6px 20px', display:'flex', gap:3 }}>
          {sortedVictims.map((v,i) => (
            <div key={v.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <div style={{ width:'100%', height:5, borderRadius:3, background: i < currentTreatVictim ? '#22c55e' : i === currentTreatVictim ? '#3b82f6' : 'rgba(255,255,255,0.06)', boxShadow: i === currentTreatVictim ? '0 0 8px rgba(59,130,246,0.4)' : 'none' }}/>
              <span style={{ fontSize:7, color: i === currentTreatVictim ? '#93c5fd' : '#475569' }}>{v.emoji} {v.name}</span>
            </div>
          ))}
        </div>

        {/* Main 3-column layout */}
        {victim && (
          <div style={{ position:'relative', zIndex:1, padding:'6px 16px', display:'grid', gridTemplateColumns:'260px 1fr 280px', gap:12, height:'calc(100vh - 90px)' }}>

            {/* LEFT COLUMN — Patient + Vitals + NDMA */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
              {/* Patient card */}
              <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:12, padding:12, border:`2px solid ${SEVERITY_COLORS[victim.severity]}55`, boxShadow:`0 0 24px ${SEVERITY_COLORS[victim.severity]}22` }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  {/* Portrait */}
                  <div style={{ width:54, height:54, borderRadius:12, background:`radial-gradient(circle at 30% 30%, ${SEVERITY_COLORS[victim.severity]}33, ${SEVERITY_COLORS[victim.severity]}10)`, border:`2px solid ${SEVERITY_COLORS[victim.severity]}77`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, boxShadow:`inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 10px ${SEVERITY_COLORS[victim.severity]}33` }}>
                    <Sprite src={VICTIM_PORTRAITS[victim.id]} fallback={victim.emoji} size={48}/>
                  </div>
                  <div>
                    <div style={{ color:'#f1f5f9', fontWeight:800, fontSize:14 }}>{victim.name}, {victim.age}</div>
                    <div style={{ color:SEVERITY_COLORS[victim.severity], fontWeight:700, fontSize:10 }}>{victim.severity} — {victim.injury}</div>
                  </div>
                </div>
                {/* Vitals */}
                <div style={{ background:'#030a15', borderRadius:8, padding:8, border:'1px solid #1e293b', marginBottom:6 }}>
                  <div style={{ color:'#22c55e', fontSize:7, fontWeight:800, letterSpacing:1, marginBottom:4 }}>❤️ VITAL SIGNS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3 }}>
                    {Object.entries(victim.vitals).map(([k,val]) => (
                      <div key={k} style={{ padding:'3px 5px', background:'rgba(34,197,94,0.04)', borderRadius:4, border:'1px solid rgba(34,197,94,0.08)' }}>
                        <div style={{ color:'#22c55e', fontSize:6, fontWeight:800, textTransform:'uppercase' }}>{k}</div>
                        <div style={{ color:'#e2e8f0', fontSize:8, fontWeight:600 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Symptoms */}
                <div style={{ color:'#94a3b8', fontSize:8, fontWeight:700, marginBottom:3 }}>😷 PRESENTING SYMPTOMS</div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                  {victim.symptoms.map((s,i) => <span key={i} style={{ background:'rgba(239,68,68,0.06)', color:'#fca5a5', padding:'2px 5px', borderRadius:3, fontSize:7, border:'1px solid rgba(239,68,68,0.1)' }}>{s}</span>)}
                </div>
              </div>

              {/* NDMA Protocol Tip */}
              <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:10, padding:10, borderLeft:`3px solid ${SEVERITY_COLORS[victim.severity]}`, border:'1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color:'#f59e0b', fontSize:8, fontWeight:800, marginBottom:3 }}>📋 NDMA PROTOCOL</div>
                <div style={{ color:'#93c5fd', fontSize:9, lineHeight:1.6 }}>💡 {victim.ndmaTip}</div>
              </div>

              {/* Triage Note */}
              <div style={{ background:'rgba(239,68,68,0.05)', borderRadius:8, padding:8, border:'1px solid rgba(239,68,68,0.1)' }}>
                <div style={{ color:'#ef4444', fontSize:8, fontWeight:800, marginBottom:2 }}>⚠️ TRIAGE NOTE</div>
                <div style={{ color:'#fca5a5', fontSize:9, lineHeight:1.5 }}>{victim.triageNote}</div>
              </div>

              {/* Previously treated */}
              {Object.keys(treatedVictims).length > 0 && (
                <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:8, padding:8, border:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ color:'#475569', fontSize:7, fontWeight:700, marginBottom:3 }}>TREATED PATIENTS:</div>
                  {Object.entries(treatedVictims).map(([vid,t]) => { const v = VICTIMS.find(v => v.id === vid); return <div key={vid} style={{ fontSize:8, color: t.correct ? '#22c55e' : '#f59e0b', marginBottom:1 }}>{t.correct ? '✅' : '⚠️'} {v?.name} — {v?.injury}</div> })}
                </div>
              )}
            </div>

            {/* CENTER COLUMN — Body Image + Equipment */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
              {/* Status banner */}
              <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:8, padding:'5px 16px', marginBottom:6, border:`1px solid ${treatStep === 'examine' ? '#3b82f630' : treatStep === 'select' ? '#f59e0b30' : '#22c55e30'}` }}>
                <span style={{ color: treatStep === 'examine' ? '#93c5fd' : treatStep === 'select' ? '#fbbf24' : '#22c55e', fontSize:10, fontWeight:800 }}>
                  {treatStep === 'examine' ? `🔍 EXAMINATION — Click equipment below (${equipUsedCount}/4 used)` :
                   treatStep === 'select' ? '💊 SELECT TREATMENT — Choose items from your supplies' :
                   treatAnim === 'applying' ? '🩺 Applying treatment...' : treatAnim === 'healed' ? '✅ Treatment Successful!' : '⚠️ Treatment Needs Review'}
                </span>
              </div>

              {/* Body image container */}
              <div style={{ position:'relative', width:280, height:360, borderRadius:12, overflow:'hidden', border:'2px solid rgba(147,197,253,0.15)', background:'#050a15' }}>
                {/* Normal body view */}
                <img
                  src={bodyView === 'xray' ? '/assets/medical/xray_body.png' : '/assets/medical/body_front.png'}
                  alt="Patient body"
                  style={{ width:'100%', height:'100%', objectFit:'contain', transition:'opacity 0.5s', filter: treatAnim === 'healed' ? 'hue-rotate(80deg) brightness(1.3)' : 'none' }}
                />

                {/* Injury marker */}
                <div style={{ position:'absolute', left:`${inj.x}%`, top:`${inj.y}%`, transform:'translate(-50%,-50%)', zIndex:5 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: treatAnim === 'healed' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)', border:`2px solid ${treatAnim === 'healed' ? '#22c55e' : '#ef4444'}`, display:'flex', alignItems:'center', justifyContent:'center', animation:'pulse 1.2s infinite' }}>
                    <span style={{ fontSize:12 }}>{treatAnim === 'healed' ? '✅' : '❌'}</span>
                  </div>
                  <div style={{ position:'absolute', top:32, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', background: treatAnim === 'healed' ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)', color:'#fff', padding:'2px 8px', borderRadius:4, fontSize:8, fontWeight:700 }}>{inj.label}: {victim.injury}</div>
                </div>

                {/* Scan animation when using equipment */}
                {treatAnim === 'stethoscope' && <div style={{ position:'absolute', left:'40%', top:'30%', fontSize:40, animation:'bob 0.5s ease-in-out infinite', filter:'drop-shadow(0 0 10px rgba(59,130,246,0.5))' }}>🩺</div>}
                {treatAnim === 'thermometer' && <div style={{ position:'absolute', left:'55%', top:'15%', fontSize:36, animation:'bob 0.5s ease-in-out infinite', filter:'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }}>🌡️</div>}
                {treatAnim === 'bp' && <div style={{ position:'absolute', left:'20%', top:'35%', fontSize:36, animation:'bpPump 0.8s ease-in-out infinite', filter:'drop-shadow(0 0 10px rgba(239,68,68,0.5))' }}>💉</div>}
                {treatAnim === 'xray' && <div style={{ position:'absolute', inset:0, background:'rgba(59,130,246,0.1)', animation:'fadeIn 0.3s' }}><div style={{ position:'absolute', left:0, right:0, height:3, background:'linear-gradient(90deg,transparent,#3b82f6,transparent)', animation:'scanLine 1.5s linear infinite' }}/></div>}

                {/* Treatment application animation */}
                {treatAnim === 'applying' && (
                  <div style={{ position:'absolute', left:`${inj.x}%`, top:`${inj.y - 20}%`, transform:'translateX(-50%)', zIndex:10, animation:'injecting 1.5s ease-in-out infinite' }}>
                    {selectedItems.map(itemId => { const item = ALL_ITEMS.find(it => it.id === itemId); return <span key={itemId} style={{ fontSize:22, display:'block', filter:'drop-shadow(0 0 8px rgba(34,197,94,0.6))' }}>{item?.emoji}</span> })}
                  </div>
                )}

                {/* View label */}
                <div style={{ position:'absolute', top:6, left:6, background:'rgba(0,0,0,0.7)', padding:'2px 8px', borderRadius:4, fontSize:8, color:'#93c5fd', fontWeight:700 }}>
                  {bodyView === 'xray' ? '🩻 X-RAY VIEW' : '🔬 ANATOMICAL VIEW'}
                </div>
              </div>

              {/* Equipment tray — INTERACTIVE */}
              <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap', justifyContent:'center' }}>
                {EQUIP.map(eq => {
                  const used = examUsed[eq.id]
                  const active = treatAnim === eq.id
                  return (
                    <div key={eq.id}
                      onClick={() => treatStep === 'examine' && !active && useEquipment(eq.id)}
                      style={{ padding:'6px 10px', background: active ? 'rgba(59,130,246,0.2)' : used ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)', borderRadius:8, border:`2px solid ${active ? '#3b82f6' : used ? '#22c55e40' : '#ffffff08'}`, textAlign:'center', cursor: treatStep === 'examine' ? 'pointer' : 'default', transition:'all 0.3s', minWidth:60 }}>
                      <div style={{ fontSize:20, animation: active ? 'bob 0.5s ease-in-out infinite' : 'none' }}>{eq.emoji}</div>
                      <div style={{ fontSize:7, color: active ? '#93c5fd' : used ? '#22c55e' : '#94a3b8', fontWeight:700 }}>{eq.label}</div>
                      <div style={{ fontSize:6, color:'#475569' }}>{eq.desc}</div>
                      {used && <div style={{ fontSize:7, color:'#22c55e', marginTop:1 }}>✓ Done</div>}
                    </div>
                  )
                })}
              </div>

              {/* Proceed button */}
              {treatStep === 'examine' && allExamDone && (
                <button onClick={proceedToSelect} style={{ marginTop:8, padding:'8px 28px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontWeight:800, fontSize:12, cursor:'pointer', animation:'pulse 2s infinite' }}>
                  📋 Examination Complete — Proceed to Treatment
                </button>
              )}
            </div>

            {/* RIGHT COLUMN — Exam Results + Treatment */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>

              {/* Examination findings */}
              <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:12, padding:12, border:'1px solid rgba(255,255,255,0.06)', minHeight:120 }}>
                <div style={{ color:'#93c5fd', fontSize:9, fontWeight:800, letterSpacing:1, marginBottom:6 }}>🔬 EXAMINATION FINDINGS</div>
                {equipUsedCount === 0 ? (
                  <div style={{ color:'#475569', fontSize:10, fontStyle:'italic', padding:16, textAlign:'center' }}>
                    Click equipment below to examine the patient.<br/>
                    <span style={{ fontSize:8 }}>Each tool reveals different diagnostic information.</span>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {Object.entries(examUsed).map(([toolId]) => {
                      const data = EXAM_DATA[victim.id]?.[toolId]
                      if (!data) return null
                      const eq = EQUIP.find(e => e.id === toolId)
                      return (
                        <div key={toolId} style={{ padding:6, borderRadius:6, background:'rgba(0,0,0,0.3)', border:`1px solid ${CONCERN_COLORS[data.concern]}20` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                            <span style={{ fontSize:9, color:'#e2e8f0', fontWeight:700 }}>{eq?.emoji} {eq?.label}</span>
                            <span style={{ fontSize:7, padding:'1px 5px', borderRadius:3, background:`${CONCERN_COLORS[data.concern]}15`, color:CONCERN_COLORS[data.concern], fontWeight:800 }}>{data.concern}</span>
                          </div>
                          <div style={{ fontSize:9, color:'#94a3b8', lineHeight:1.4 }}>{data.finding}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Current result highlight */}
                {examResult && (
                  <div style={{ marginTop:6, padding:8, borderRadius:8, background:`${CONCERN_COLORS[examResult.concern]}10`, border:`1px solid ${CONCERN_COLORS[examResult.concern]}30`, animation:'fadeIn 0.3s' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:CONCERN_COLORS[examResult.concern], marginBottom:2 }}>{examResult.icon} Latest: {examResult.tool.toUpperCase()}</div>
                    <div style={{ fontSize:10, color:'#e2e8f0', lineHeight:1.5 }}>{examResult.finding}</div>
                  </div>
                )}
              </div>

              {/* Treatment selection — only visible after examination */}
              {treatStep === 'select' && (
                <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:12, padding:12, border:'1px solid rgba(245,158,11,0.15)', animation:'fadeIn 0.3s' }}>
                  <div style={{ color:'#f59e0b', fontSize:10, fontWeight:800, marginBottom:2 }}>💊 Select Treatment</div>
                  <div style={{ color:'#64748b', fontSize:8, marginBottom:6 }}>Choose {victim.treatment.length} correct items for {victim.injury}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {ALL_ITEMS.filter(item => inventory.includes(item.id)).map(item => {
                      const sel = selectedItems.includes(item.id)
                      return (
                        <div key={item.id} onClick={() => setSelectedItems(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : prev.length < 4 ? [...prev, item.id] : prev)}
                          style={{ padding:'6px 8px', borderRadius:8, cursor:'pointer', background: sel ? 'linear-gradient(180deg, rgba(34,197,94,0.18), rgba(34,197,94,0.05))' : 'rgba(255,255,255,0.03)', border:`2px solid ${sel ? '#22c55e' : 'rgba(255,255,255,0.06)'}`, transition:'all 0.2s', display:'flex', alignItems:'center', gap:8, boxShadow: sel ? '0 4px 12px rgba(34,197,94,0.25)' : 'none' }}>
                          <div style={{ width:30, height:30, borderRadius:8, background: sel ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border:`1px solid ${sel ? '#22c55e55' : 'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Sprite src={ITEM_IMG[item.id]} fallback={item.emoji} size={24}/>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:10, color: sel ? '#22c55e' : '#e2e8f0', fontWeight:700 }}>{item.name}</div>
                            <div style={{ fontSize:7, color:'#64748b' }}>{item.desc}</div>
                          </div>
                          {sel && <div style={{ width:16, height:16, borderRadius:4, background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', boxShadow:'0 2px 6px rgba(34,197,94,0.5)' }}>✓</div>}
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={applyTreatment} disabled={selectedItems.length === 0}
                    style={{ marginTop:8, width:'100%', padding:'8px', borderRadius:999, border:'none', background: selectedItems.length > 0 ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#1e293b', color: selectedItems.length > 0 ? '#fff' : '#475569', fontWeight:800, fontSize:12, cursor: selectedItems.length > 0 ? 'pointer' : 'default' }}>
                    🩺 Apply Treatment ({selectedItems.length}/{victim.treatment.length})
                  </button>
                </div>
              )}

              {/* Application status */}
              {treatStep === 'apply' && (
                <div style={{ background:'rgba(5,15,30,0.95)', borderRadius:12, padding:16, border:'1px solid rgba(34,197,94,0.15)', textAlign:'center', animation:'fadeIn 0.3s' }}>
                  <div style={{ fontSize:32, marginBottom:6, animation: treatAnim === 'applying' ? 'bob 1s ease-in-out infinite' : 'none' }}>{treatAnim === 'healed' ? '✅' : treatAnim === 'partial' ? '⚠️' : '💊'}</div>
                  <div style={{ color:'#e2e8f0', fontSize:13, fontWeight:800 }}>
                    {treatAnim === 'applying' ? 'Administering treatment...' : treatAnim === 'healed' ? 'Treatment Successful!' : 'Treatment incomplete — review protocols'}
                  </div>
                  <div style={{ color:'#64748b', fontSize:9, marginTop:4 }}>
                    {treatAnim === 'applying' ? 'Applying selected medications and procedures' : treatAnim === 'healed' ? 'Patient stabilized. Moving to next patient...' : 'Some items were incorrect. Study NDMA guidelines.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {feedback && <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:50, padding:'10px 22px', borderRadius:12, background: feedback.type === 'success' ? 'rgba(34,197,94,0.95)' : feedback.type === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(239,68,68,0.95)', color:'#fff', fontWeight:700, fontSize:12, animation:'fadeIn 0.3s' }}>{feedback.msg}</div>}
      </div>
    )
  }

  // ═══════════ RESULT ═══════════
  if (phase === 'result' && result) {
    const sc = result.passed ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444'
    const sortedVictims = [...VICTIMS].sort((a, b) => a.priority - b.priority)
    return (
      <div style={{ position:'fixed', inset:0, zIndex:100, background: result.passed ? 'linear-gradient(135deg,#064e3b,#065f46)' : 'linear-gradient(135deg,#450a0a,#7f1d1d)', overflowY:'auto', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <ImgBg src={TRIAGE_IMG.stormSky} style={{ opacity: result.passed ? 0.18 : 0.32, filter: result.passed ? 'brightness(1.1) hue-rotate(80deg)' : 'brightness(0.5)' }}/>
        <div style={{ maxWidth:680, width:'100%', margin:'0 auto', padding:'24px 16px 40px', position:'relative', zIndex:1 }}>
          <div style={{ background:'rgba(255,255,255,0.96)', borderRadius:24, padding:'28px 24px', border:'3px solid #0f172a', textAlign:'center', marginBottom:16, boxShadow:'0 20px 50px rgba(0,0,0,0.55)' }}>
            <div style={{ fontSize:60, animation: result.passed ? 'bob 2s infinite' : 'pulse 1.4s infinite', filter:'drop-shadow(0 6px 10px rgba(0,0,0,0.4))' }}>{result.passed ? '🏆' : '💀'}</div>
            <div style={{ fontSize:20, fontWeight:900, color:sc, marginTop:4 }}>{result.passed ? 'FIELD TRIAGE COMPLETE!' : 'TREATMENT INCOMPLETE'}</div>
            <div style={{ fontSize:60, fontWeight:900, color:sc, marginTop:8, animation:'scoreCount 0.8s cubic-bezier(.34,1.56,.64,1) 0.3s both', textShadow:`0 4px 12px ${sc}55` }}>{result.score}<span style={{ fontSize:22, color:'#94a3b8' }}>/100</span></div>
            <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:10, flexWrap:'wrap' }}>
              <span style={{ background:'#eff6ff', color:'#1e40af', padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:700 }}>🔍 Triage: {result.triageScore}/20</span>
              <span style={{ background:'#f0fdf4', color:'#166534', padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:700 }}>🏪 Supplies: {result.itemScore}/30</span>
              <span style={{ background:'#fef2f2', color:'#991b1b', padding:'3px 10px', borderRadius:999, fontSize:10, fontWeight:700 }}>💊 Treatment: {result.treatScore}/30</span>
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.95)', borderRadius:24, padding:20, border:'3px solid #0f172a', marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:10, textAlign:'center' }}>📋 Treatment Report</div>
            {sortedVictims.map((v,i) => {
              const t = result.treatedVictims[v.id]
              return (
                <div key={v.id} style={{ padding:10, borderRadius:12, marginBottom:8, background: t?.correct ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border:`1.5px solid ${t?.correct ? '#22c55e' : '#ef4444'}`, animation:`cardEnter 0.5s ease-out ${i*0.1}s both`, display:'flex', gap:10, alignItems:'flex-start' }}>
                  {/* Portrait thumbnail */}
                  <div style={{ flexShrink:0, width:44, height:44, borderRadius:10, background:`radial-gradient(circle at 30% 30%, ${SEVERITY_COLORS[v.severity]}33, ${SEVERITY_COLORS[v.severity]}10)`, border:`1.5px solid ${SEVERITY_COLORS[v.severity]}`, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                    <Sprite src={VICTIM_PORTRAITS[v.id]} fallback={v.emoji} size={38}/>
                    <div style={{ position:'absolute', bottom:-2, right:-2, fontSize:11, background:'#fff', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${t?.correct ? '#22c55e' : '#ef4444'}` }}>{t?.correct ? '✓' : '!'}</div>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:10, fontWeight:900, background:SEVERITY_COLORS[v.severity], color:'#fff', padding:'1px 6px', borderRadius:4 }}>#{i+1} {v.severity}</span>
                    </div>
                    <div style={{ fontWeight:800, fontSize:12, color: t?.correct ? '#065f46' : '#991b1b' }}>{t?.correct ? '✅' : '⚠️'} {v.name}</div>
                    <div style={{ fontSize:9, color:'#6b7280' }}>{v.injury}</div>
                    <div style={{ fontSize:9, color:'#64748b', padding:'3px 6px', background:'rgba(0,0,0,0.04)', borderRadius:5, marginTop:4, lineHeight:1.5 }}>💡 {v.ndmaTip}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ background:'rgba(255,255,255,0.95)', borderRadius:24, padding:20, border:'3px solid #0f172a', marginBottom:16 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#0f172a', marginBottom:10, textAlign:'center' }}>🏥 NDMA First Aid</div>
            {[{ t:'START Triage', d:'Assess breathing, circulation, mental status. Sort: Immediate → Delayed → Minor.' },{ t:'ABC of First Aid', d:'Airway, Breathing, Circulation. Always follow ABC before treating.' },{ t:'Golden Hour', d:'First 60 minutes are critical. Proper first aid dramatically improves survival.' },{ t:'Flood Hygiene', d:'Clean ALL wounds with antiseptic. Floodwater carries bacteria, sewage, chemicals.' }].map((f,i) => (
              <div key={i} style={{ padding:'5px 8px', marginBottom:4, background:'rgba(37,99,235,0.04)', borderRadius:6, borderLeft:'3px solid #3b82f6' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#1e40af' }}>{f.t}</div>
                <div style={{ fontSize:9, color:'#475569', lineHeight:1.5 }}>{f.d}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center', paddingBottom:20 }}>
            <button onClick={retry} style={{ padding:'12px 28px', borderRadius:999, background:'#fff', color:'#0f172a', border:'2px solid #0f172a', fontWeight:800, fontSize:13, cursor:'pointer' }}>🔄 Try Again</button>
            {result.passed ? (
              <button onClick={() => gameDispatch({ type:'SELECT_MODULE', payload:5 })} style={{ padding:'12px 28px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:900, fontSize:13, cursor:'pointer', boxShadow:'0 8px 20px rgba(34,197,94,0.4)' }}>🚗 Next: Escort Medical Expert</button>
            ) : (
              <button onClick={() => gameDispatch({ type:'BACK_TO_MODULES' })} style={{ padding:'12px 28px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#1e40af,#1d4ed8)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>← Back to Modules</button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
