/**
 * Module 2 — Build the Raft (NDMA Flood Survival)
 * Style: 2D Side-Scrolling + Progressive Assembly Crafting
 * After Go-Bag evacuation, player reaches a flooded garage.
 * Explore, collect materials, then progressively assemble a raft
 * with step-by-step visual building animation.
 * 120s soft timer (bonus), NDMA-aligned.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const TIMER_START = 120
const PLAYER_W = 24
const PLAYER_H = 40
const WALK_SPEED = 230
const JUMP_VEL = 480
const GRAVITY = 980
const PICKUP_RANGE = 65
const WORLD_W = 1500
const WORLD_H = 620
const CAM_LERP = 0.08

// ═══════════════════════════════════════════════════════════════
// GARAGE LAYOUT — realistic Indian shed/garage
// ═══════════════════════════════════════════════════════════════
const GARAGE_BG = { x: 10, y: 60, w: 1480, h: 460, wall: '#d6cec2', trim: '#a89888' }

const PLATFORMS = [
  { x: 10, y: 520, w: 1480, h: 20 },      // main floor
  { x: 40, y: 340, w: 220, h: 10 },        // left wall shelf top
  { x: 40, y: 410, w: 220, h: 10 },        // left wall shelf bottom
  { x: 380, y: 370, w: 180, h: 10 },       // mid hanging shelf
  { x: 750, y: 350, w: 280, h: 10 },       // tool rack shelf
  { x: 1150, y: 360, w: 200, h: 10 },      // right wall shelf
  { x: 1150, y: 430, w: 200, h: 10 },      // right wall shelf lower
]

// Furniture — shelves, workbench, cabinets, hooks
const FURNITURE = [
  // Workbench (left corner)
  { x: 20, y: 478, w: 220, h: 42, c: '#6B4226', b: '#3A2010', r: 3 },
  { x: 20, y: 470, w: 220, h: 10, c: '#8B5A2B', b: '#5C3A1A', r: 2 },
  // Left wall shelving unit (metal frame)
  { x: 40, y: 278, w: 220, h: 65, c: '#666', b: '#444', r: 2 },
  { x: 40, y: 270, w: 220, h: 10, c: '#777', b: '#555', r: 1 },
  { x: 40, y: 348, w: 220, h: 65, c: '#666', b: '#444', r: 2 },
  // Center pegboard / tool wall
  { x: 380, y: 120, w: 180, h: 250, c: '#c8b898', b: '#a89878', r: 3 },   // pegboard
  // Tool rack (center-right wall)
  { x: 750, y: 120, w: 280, h: 230, c: '#777', b: '#555', r: 3 },          // metal rack bg
  { x: 750, y: 288, w: 280, h: 65, c: '#888', b: '#666', r: 2 },
  { x: 750, y: 280, w: 280, h: 10, c: '#999', b: '#777', r: 1 },
  // Right metal cabinet
  { x: 1100, y: 250, w: 60, h: 270, c: '#8a8a8a', b: '#666', r: 3 },
  // Right wall shelving
  { x: 1150, y: 298, w: 200, h: 65, c: '#7a6a5a', b: '#5a4a3a', r: 3 },
  { x: 1150, y: 290, w: 200, h: 10, c: '#8a7a6a', b: '#6a5a4a', r: 1 },
  { x: 1150, y: 368, w: 200, h: 65, c: '#7a6a5a', b: '#5a4a3a', r: 3 },
  // Floor clutter
  { x: 600, y: 490, w: 100, h: 30, c: '#654321', b: '#3A2010', r: 3 },   // crate
  { x: 900, y: 485, w: 120, h: 36, c: '#777', b: '#555', r: 3 },          // toolbox
  { x: 1380, y: 495, w: 70, h: 26, c: '#333', b: '#111', r: 12 },         // tire
  // Wall hooks (visual — small rectangles)
  ...Array.from({ length: 8 }, (_, i) => ({
    x: 395 + i * 20, y: 130 + ((i % 3) * 10), w: 4, h: 16, c: '#8a7a6a', b: '#6a5a4a', r: 1
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    x: 765 + i * 26, y: 130 + ((i % 2) * 8), w: 4, h: 18, c: '#aaa', b: '#888', r: 1
  })),
]

// Decor — wall-mounted items, hanging tools, garage atmosphere
const DECOR = [
  // Hanging tools on pegboard
  { e: '🔨', x: 400, y: 170, s: 22 },
  { e: '🪛', x: 430, y: 180, s: 20 },
  { e: '🔧', x: 460, y: 165, s: 22 },
  { e: '✂️', x: 490, y: 175, s: 18 },
  { e: '📏', x: 520, y: 160, s: 20 },
  { e: '🪚', x: 415, y: 220, s: 24 },
  { e: '⚙️', x: 470, y: 230, s: 20 },
  { e: '🔩', x: 510, y: 225, s: 16 },
  // Tool rack items
  { e: '🧲', x: 780, y: 170, s: 20 },
  { e: '🗜️', x: 820, y: 160, s: 22 },
  { e: '⛏️', x: 870, y: 175, s: 22 },
  { e: '🪓', x: 920, y: 165, s: 24 },
  { e: '🔧', x: 960, y: 170, s: 18 },
  { e: '🔗', x: 800, y: 220, s: 18 },
  { e: '⛓️', x: 850, y: 215, s: 20 },
  // Lights
  { e: '💡', x: 250, y: 78, s: 28 },
  { e: '💡', x: 700, y: 78, s: 28 },
  { e: '💡', x: 1200, y: 78, s: 28 },
  // Floor clutter
  { e: '🚲', x: 1410, y: 490, s: 34 },
  { e: '🧹', x: 1080, y: 500, s: 22 },
  { e: '🪣', x: 635, y: 505, s: 18 },
  { e: '🧴', x: 1310, y: 510, s: 16 },
  // Wall decor
  { e: '📅', x: 330, y: 120, s: 22 },
  { e: '🔥', x: 1120, y: 120, s: 20 },  // fire extinguisher sign
]

// ═══════════════════════════════════════════════════════════════
// RAFT COMPONENT SLOTS — progressive build order
// ═══════════════════════════════════════════════════════════════
const BUILD_STEPS = [
  { id: 'hull', name: 'Step 1: Hull / Buoyancy', icon: '🛟', desc: 'Place the flotation base', color: '#3b82f6', instruction: 'Select what will keep your raft floating on water.' },
  { id: 'binding', name: 'Step 2: Binding / Lashing', icon: '🪢', desc: 'Tie the hull together', color: '#f59e0b', instruction: 'Choose material to bind and secure the hull units.' },
  { id: 'deck', name: 'Step 3: Deck / Platform', icon: '🪵', desc: 'Lay the riding surface', color: '#22c55e', instruction: 'Pick a flat surface to lay across the hulls as your deck.' },
  { id: 'propulsion', name: 'Step 4: Propulsion', icon: '🏏', desc: 'Add steering', color: '#a855f7', instruction: 'Select something to paddle and steer with.' },
]

// ═══════════════════════════════════════════════════════════════
// ITEM CATALOGUE — with realistic positions
// Items on walls, shelves, and floor for realism
// ═══════════════════════════════════════════════════════════════
const CATALOGUE = [
  // ── HULL OPTIONS — on floor / lower shelves ──
  { id: 'hull1', slot: 'hull', wx: 630, wy: 500, emoji: '🛢️', name: 'Sealed Plastic Drums ×4', sz: 50,
    correct: true, wt: 3.0,
    tip: 'Airtight HDPE drums — excellent buoyancy-to-weight ratio. NDMA recommends sealed containers for improvised flotation.',
    testMsg: 'Drums stay sealed — excellent buoyancy!' },
  { id: 'hull2', slot: 'hull', wx: 120, wy: 400, emoji: '📦', name: 'Wooden Crate', sz: 44,
    correct: false, wt: 5.0,
    tip: 'Untreated wood absorbs water rapidly. Within 30 min, it becomes waterlogged and loses buoyancy.',
    testMsg: 'Crate absorbs water… buoyancy dropping fast!' },
  { id: 'hull3', slot: 'hull', wx: 940, wy: 500, emoji: '🥁', name: 'Steel Drum (Rusted)', sz: 48,
    correct: false, wt: 12.0,
    tip: '12 kg of rusted steel. Even sealed, rust holes let water in. Way too heavy for a portable raft.',
    testMsg: 'Steel drum is leaking through rust holes!' },
  { id: 'hull4', slot: 'hull', wx: 70, wy: 505, emoji: '📦', name: 'Cardboard Boxes', sz: 40,
    correct: false, wt: 1.0,
    tip: 'Cardboard dissolves in minutes. Provides zero flotation in floodwater.',
    testMsg: 'Cardboard disintegrated on contact with water!' },

  // ── BINDING OPTIONS — on pegboard / tool wall ──
  { id: 'bind1', slot: 'binding', wx: 450, wy: 260, emoji: '🪢', name: 'Nylon Rope 30m', sz: 36,
    correct: true, wt: 0.5,
    tip: 'Synthetic nylon — rot-proof, maintains tensile strength when wet. Ideal for securing raft joints.',
    testMsg: 'Nylon rope holds firm — knots tightening under load!' },
  { id: 'bind2', slot: 'binding', wx: 170, wy: 330, emoji: '🧶', name: 'Old Jute Rope', sz: 34,
    correct: false, wt: 0.8,
    tip: 'Natural jute rots in water within hours. Tensile strength drops 40% when wet.',
    testMsg: 'Jute rope is fraying and stretching — joints loosening!' },
  { id: 'bind3', slot: 'binding', wx: 870, wy: 200, emoji: '⚡', name: 'Electrical Wire', sz: 30,
    correct: false, wt: 1.5,
    tip: 'Copper wire conducts electricity. In floodwater with downed power lines, this is lethal.',
    testMsg: '⚠️ Wire conducting current through floodwater!' },
  { id: 'bind4', slot: 'binding', wx: 410, wy: 360, emoji: '🩹', name: 'Duct Tape Roll', sz: 32,
    correct: false, wt: 0.3,
    tip: 'Duct tape adhesive fails when submerged. Cannot bear structural loads in water.',
    testMsg: 'Duct tape peeling off — bindings failing!' },

  // ── DECK OPTIONS — on shelves / leaning on wall ──
  { id: 'deck1', slot: 'deck', wx: 800, wy: 340, emoji: '🎋', name: 'Bamboo Poles ×6', sz: 46,
    correct: true, wt: 4.0,
    tip: 'Bamboo is naturally water-resistant, strong yet lightweight. Used for rafts across India for centuries.',
    testMsg: 'Bamboo deck is solid — water-resistant and strong!' },
  { id: 'deck2', slot: 'deck', wx: 1200, wy: 350, emoji: '🪵', name: 'Plywood Sheets', sz: 44,
    correct: false, wt: 6.0,
    tip: 'Standard plywood swells and delaminates in water. Marine-grade would work, but this is regular construction grade.',
    testMsg: 'Plywood delaminating — deck warping and cracking!' },
  { id: 'deck3', slot: 'deck', wx: 1180, wy: 305, emoji: '🔩', name: 'Iron Rods', sz: 38,
    correct: false, wt: 8.0,
    tip: '8 kg of iron provides no flat surface. Cannot function as a deck.',
    testMsg: 'No surface area — rider falling through gaps!' },
  { id: 'deck4', slot: 'deck', wx: 300, wy: 505, emoji: '🛏️', name: 'Old Mattress', sz: 46,
    correct: false, wt: 7.0,
    tip: 'Foam mattress absorbs water like a sponge. Adds 15+ kg and sinks the raft.',
    testMsg: 'Mattress soaked — weight tripled, raft sinking!' },

  // ── PROPULSION OPTIONS — on wall hooks / floor ──
  { id: 'prop1', slot: 'propulsion', wx: 540, wy: 180, emoji: '🏏', name: 'Wooden Paddle', sz: 40,
    correct: true, wt: 1.0,
    tip: 'Flat blade, sturdy handle — effective for steering in floodwater. The oar shape gives excellent thrust.',
    testMsg: 'Paddle provides good control and thrust!' },
  { id: 'prop2', slot: 'propulsion', wx: 100, wy: 290, emoji: '☂️', name: 'Old Umbrella', sz: 36,
    correct: false, wt: 0.5,
    tip: 'Umbrella shaft snaps under water pressure. The canopy creates drag, not thrust.',
    testMsg: 'Umbrella shaft snapped under pressure!' },
  { id: 'prop3', slot: 'propulsion', wx: 1260, wy: 420, emoji: '🔧', name: 'Steel Rod', sz: 34,
    correct: false, wt: 3.0,
    tip: '3 kg steel rod has no blade surface. Cannot displace water effectively for propulsion.',
    testMsg: 'Steel rod just pokes water — no displacement!' },
  { id: 'prop4', slot: 'propulsion', wx: 1300, wy: 510, emoji: '🪑', name: 'Plastic Chair Leg', sz: 36,
    correct: false, wt: 1.5,
    tip: 'Too short, wrong shape. Cannot reach water from raft height.',
    testMsg: 'Chair leg too short — can\'t reach the water!' },
]

const SLOT_COLORS = { hull: '#3b82f6', binding: '#f59e0b', deck: '#22c55e', propulsion: '#a855f7' }

// ═══════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════
function computeScore(assignments, timeLeft, readBlueprint) {
  let base = 0, correctCount = 0
  const results = []
  for (const step of BUILD_STEPS) {
    const itemId = assignments[step.id]
    const item = CATALOGUE.find(i => i.id === itemId)
    if (item?.correct) { base += 25; correctCount++; results.push({ slot: step.name, item: item.name, correct: true, msg: item.testMsg }) }
    else if (item) results.push({ slot: step.name, item: item.name, correct: false, msg: item.testMsg })
    else results.push({ slot: step.name, item: 'EMPTY', correct: false, msg: 'No material assigned!' })
  }
  const timeBonus = timeLeft > 30 ? 5 : 0
  const bpBonus = readBlueprint ? 5 : 0
  const total = Math.min(100, base + timeBonus + bpBonus)
  const passed = total >= 60
  const headline = correctCount === 4 ? '🛶 RAFT CERTIFIED — READY TO LAUNCH'
    : correctCount >= 3 ? '⚠️ RAFT UNSTABLE — ONE WEAK LINK'
    : correctCount >= 2 ? '⚠️ RAFT RISKY — MULTIPLE ISSUES' : '💀 RAFT FAILED — IT SANK'
  const lesson = correctCount === 4
    ? 'Perfect build! All 4 components are NDMA-approved. Your raft is seaworthy.'
    : `${4 - correctCount} component${4 - correctCount > 1 ? 's' : ''} failed. Wrong materials compromise safety in floodwater.`
  return { score: total, passed, headline, lesson, results, correctCount, timeBonus, bpBonus }
}

// ═══════════════════════════════════════════════════════════════
// KEYFRAMES
// ═══════════════════════════════════════════════════════════════
const KEYFRAMES = `
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes bob-sm{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}100%{box-shadow:0 0 0 14px rgba(239,68,68,0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop-in{from{transform:scale(0.7);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes rainAnim{from{background-position:0 0}to{background-position:0 120px}}
@keyframes slideDown{from{opacity:0;transform:translateY(-30px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes buildPulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,0.4)}100%{box-shadow:0 0 0 20px rgba(59,130,246,0)}}
@keyframes raftFloat{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-6px) rotate(1deg)}75%{transform:translateY(3px) rotate(-1deg)}}
@keyframes raftSinkAnim{0%{transform:translateY(0) rotate(0deg);opacity:1}30%{transform:translateY(8px) rotate(5deg)}60%{transform:translateY(30px) rotate(12deg);opacity:0.7}100%{transform:translateY(90px) rotate(22deg);opacity:0.15}}
@keyframes ropeWrap{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
@keyframes dropIn{from{transform:translateY(-60px) scale(0.5);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
@keyframes shimmer{0%{background-position:-200px 0}100%{background-position:200px 0}}
@keyframes riverScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes waveBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes debrisFly{0%{transform:translate(0,0) rotate(0deg);opacity:1}100%{transform:translate(80px,-60px) rotate(180deg);opacity:0}}
@keyframes splashUp{0%{transform:scaleY(0);opacity:0}40%{transform:scaleY(1);opacity:0.8}100%{transform:scaleY(0);opacity:0}}
@keyframes successGlow{0%,100%{filter:drop-shadow(0 0 8px rgba(34,197,94,0.3))}50%{filter:drop-shadow(0 0 20px rgba(34,197,94,0.6))}}
@keyframes tiltRock{0%,100%{transform:rotate(0deg)}25%{transform:rotate(4deg)}75%{transform:rotate(-4deg)}}
@keyframes crackSpread{from{width:0}to{width:100%}}
`

// ═══════════════════════════════════════════════════════════════
// MATERIAL VISUAL CONFIGS — what each item looks like on the raft
// ═══════════════════════════════════════════════════════════════
const HULL_VISUALS = {
  hull1: { // Sealed plastic drums — blue, rounded, solid
    logColor: '#3b82f6', logBorder: '#1d4ed8', logHighlight: '#93c5fd',
    logShape: 'rounded', count: 4, logH: 28, label: 'HDPE' },
  hull2: { // Wooden crate — brown, boxy, shows grain
    logColor: '#92400e', logBorder: '#78350f', logHighlight: '#d97706',
    logShape: 'box', count: 3, logH: 24, label: 'WOOD' },
  hull3: { // Steel drum — dark grey, heavy look
    logColor: '#4b5563', logBorder: '#1f2937', logHighlight: '#9ca3af',
    logShape: 'rounded', count: 2, logH: 32, label: 'STEEL' },
  hull4: { // Cardboard — light brown, flimsy, wavy edges
    logColor: '#d4a574', logBorder: '#a8845a', logHighlight: '#e8d5b7',
    logShape: 'cardboard', count: 5, logH: 18, label: 'CARD' },
}

const BIND_VISUALS = {
  bind1: { color: '#fbbf24', width: 3, dash: 'none', label: 'NYLON' },
  bind2: { color: '#92400e', width: 2, dash: '8,4', label: 'JUTE' },
  bind3: { color: '#ef4444', width: 2, dash: '3,3', label: 'WIRE ⚡' },
  bind4: { color: '#9ca3af', width: 4, dash: 'none', label: 'TAPE' },
}

const DECK_VISUALS = {
  deck1: { color: '#65a30d', border: '#4d7c0f', highlight: '#a3e635', count: 8, h: 6, label: 'BAMBOO' },
  deck2: { color: '#a8845a', border: '#78350f', highlight: '#d4a574', count: 3, h: 10, label: 'PLYWOOD' },
  deck3: { color: '#6b7280', border: '#4b5563', highlight: '#9ca3af', count: 6, h: 4, label: 'IRON' },
  deck4: { color: '#c4a882', border: '#a8845a', highlight: '#e8d5b7', count: 1, h: 30, label: 'MATTRESS' },
}

// ═══════════════════════════════════════════════════════════════
// DETAILED RAFT VISUALIZATION — looks like reference image
// Round logs at bottom, horizontal planks on deck, rope lashings
// ═══════════════════════════════════════════════════════════════
function RaftVisualization({ assignments, currentStep, animating, compact }) {
  const hasHull = assignments.hull !== null
  const hasBind = assignments.binding !== null
  const hasDeck = assignments.deck !== null
  const hasProp = assignments.propulsion !== null
  const allDone = hasHull && hasBind && hasDeck && hasProp

  const hv = HULL_VISUALS[assignments.hull] || null
  const bv = BIND_VISUALS[assignments.binding] || null
  const dv = DECK_VISUALS[assignments.deck] || null
  const propItem = CATALOGUE.find(i => i.id === assignments.propulsion)

  const W = compact ? 320 : 460
  const H = compact ? 170 : 260
  const raftW = compact ? 180 : 260
  const raftLeft = (W - raftW) / 2

  // Raft vertical layout (bottom-up): water → logs → rope → deck planks → fence → paddle
  const logH = hv ? hv.logH : 26
  const logsBottom = H * 0.68  // where bottom of logs sit
  const logsTop = logsBottom - logH
  const deckH = dv ? Math.min(dv.count, 8) * (dv.h + 1) : 0
  const deckTop = logsTop - deckH - 2

  return (
    <div style={{
      position: 'relative', width: W, height: H, margin: '0 auto',
      borderRadius: 20, overflow: 'hidden',
      background: 'linear-gradient(180deg,#111827 0%,#0f1d36 45%,#1e3a5a 100%)',
      border: '2px solid #1e3a5a',
    }}>
      {/* Animated water */}
      <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: H * 0.38, animation: 'riverScroll 6s linear infinite' }}>
        <defs>
          <linearGradient id="rvWater2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#1e40af" stopOpacity="0.55"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#rvWater2)"/>
        {Array.from({length:16}).map((_,i) => (
          <ellipse key={i} cx={i*60+20} cy={15+Math.sin(i*0.8)*8} rx={18} ry={3} fill="rgba(147,197,253,0.12)"/>
        ))}
      </svg>
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(96,165,250,0.5)' }}/>

      {/* Build area placeholder */}
      {!hasHull && (
        <div style={{ position:'absolute', top:'38%', left:'50%', transform:'translate(-50%,-50%)', color:'rgba(255,255,255,0.12)', fontSize:compact?12:14, fontWeight:800, letterSpacing:2, textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:compact?32:48, marginBottom:6, opacity:0.4 }}>⚓</div>
          ASSEMBLY DOCK
        </div>
      )}

      {/* ═══ HULL — round log pontoons at the bottom ═══ */}
      {hasHull && hv && (
        <div style={{ position:'absolute', left:raftLeft, top:logsTop, width:raftW, height:logH, display:'flex', gap:2 }}>
          {Array.from({length: hv.count}).map((_, i) => {
            const isCard = hv.logShape === 'cardboard'
            const isRound = hv.logShape === 'rounded'
            return (
              <div key={i} style={{
                flex:1, height: logH, position:'relative',
                borderRadius: isRound ? logH/2 : isCard ? 2 : 4,
                background: `linear-gradient(180deg, ${hv.logHighlight}, ${hv.logColor}, ${hv.logBorder})`,
                border: `2px solid ${hv.logBorder}`,
                boxShadow: `inset 0 ${isRound?-4:-2}px ${isRound?8:4}px ${hv.logBorder}88, 0 3px 8px rgba(0,0,0,0.35)`,
                animation: animating === 'hull' ? `dropIn 0.6s cubic-bezier(.34,1.56,.64,1) ${i * 0.12}s both` : 'none',
                overflow: 'hidden',
              }}>
                {/* Top highlight (gloss) */}
                <div style={{ position:'absolute', top:2, left:'12%', right:'12%', height:isRound?4:2, borderRadius:3, background:`${hv.logHighlight}88` }}/>
                {/* Bottom shadow */}
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:logH*0.3, background:`linear-gradient(transparent,${hv.logBorder}66)`, borderRadius:'inherit' }}/>
                {/* Crease / ridges */}
                {isCard && <>
                  <div style={{ position:'absolute', top:'35%', left:0, right:0, height:1, background:`${hv.logBorder}55` }}/>
                  <div style={{ position:'absolute', top:'60%', left:2, right:2, height:1, background:`${hv.logBorder}44`, transform:'rotate(1deg)' }}/>
                </>}
                {isRound && <>
                  <div style={{ position:'absolute', top:'30%', left:3, right:3, height:1, background:`${hv.logHighlight}55`, borderRadius:1 }}/>
                  <div style={{ position:'absolute', top:'60%', left:3, right:3, height:1, background:`${hv.logHighlight}44`, borderRadius:1 }}/>
                </>}
                {/* Wood grain for box */}
                {hv.logShape==='box' && <>
                  <div style={{ position:'absolute', top:'25%', left:4, right:4, height:1, background:`${hv.logHighlight}33` }}/>
                  <div style={{ position:'absolute', top:'50%', left:4, right:4, height:1, background:`${hv.logHighlight}33` }}/>
                  <div style={{ position:'absolute', top:'75%', left:4, right:4, height:1, background:`${hv.logHighlight}22` }}/>
                </>}
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ BINDING — rope / wire wrapping around hull ═══ */}
      {hasBind && hasHull && bv && (
        <svg style={{ position:'absolute', top:0, left:0, width:W, height:H, pointerEvents:'none' }}>
          {/* Horizontal lashings across the logs */}
          {[0,1,2].map(i => {
            const y = logsTop + 4 + i * (logH / 3)
            return (
              <line key={`h${i}`} x1={raftLeft-8} y1={y} x2={raftLeft+raftW+8} y2={y}
                stroke={bv.color} strokeWidth={bv.width} strokeDasharray={bv.dash}
                strokeLinecap="round" opacity={0.85}
                style={{ animation: animating === 'binding' ? `ropeWrap 0.7s ease-out ${i*0.15}s both` : 'none' }}
              />
            )
          })}
          {/* Diagonal X lashings */}
          {[0,1,2].map(i => {
            const sx = raftLeft + (raftW / 4) + i * (raftW / 4)
            return (
              <g key={`x${i}`}>
                <line x1={sx-16} y1={logsTop} x2={sx+16} y2={logsTop+logH}
                  stroke={bv.color} strokeWidth={bv.width-0.5} strokeDasharray={bv.dash}
                  strokeLinecap="round" opacity={0.55}
                  style={{ animation: animating === 'binding' ? `ropeWrap 0.5s ease-out ${0.5+i*0.1}s both` : 'none' }}/>
                <line x1={sx+16} y1={logsTop} x2={sx-16} y2={logsTop+logH}
                  stroke={bv.color} strokeWidth={bv.width-0.5} strokeDasharray={bv.dash}
                  strokeLinecap="round" opacity={0.55}
                  style={{ animation: animating === 'binding' ? `ropeWrap 0.5s ease-out ${0.55+i*0.1}s both` : 'none' }}/>
              </g>
            )
          })}
          {/* Edge lashing loops */}
          <ellipse cx={raftLeft-2} cy={logsTop+logH/2} rx={6} ry={logH/2-2} fill="none" stroke={bv.color} strokeWidth={bv.width-0.5} opacity={0.4}
            style={{ animation: animating === 'binding' ? 'ropeWrap 0.6s ease-out 0.8s both' : 'none' }}/>
          <ellipse cx={raftLeft+raftW+2} cy={logsTop+logH/2} rx={6} ry={logH/2-2} fill="none" stroke={bv.color} strokeWidth={bv.width-0.5} opacity={0.4}
            style={{ animation: animating === 'binding' ? 'ropeWrap 0.6s ease-out 0.9s both' : 'none' }}/>
        </svg>
      )}

      {/* ═══ DECK — horizontal planks/poles across the top ═══ */}
      {hasDeck && hasHull && dv && (
        <div style={{ position:'absolute', left:raftLeft-8, top:deckTop, width:raftW+16 }}>
          {Array.from({length: Math.min(dv.count, 8)}).map((_, i) => (
            <div key={i} style={{
              width:'100%', height:dv.h, marginBottom:1, position:'relative',
              borderRadius: dv.h > 8 ? 4 : 2,
              background: `linear-gradient(90deg, ${dv.border}, ${dv.color} 15%, ${dv.highlight} 40%, ${dv.color} 70%, ${dv.border})`,
              border: `1px solid ${dv.border}`,
              boxShadow: `inset 0 1px 2px ${dv.highlight}33, 0 1px 3px rgba(0,0,0,0.2)`,
              animation: animating === 'deck' ? `dropIn 0.45s cubic-bezier(.34,1.56,.64,1) ${i * 0.07}s both` : 'none',
              overflow:'hidden',
            }}>
              {/* Wood grain line */}
              {dv.h <= 8 && <div style={{ position:'absolute', top:'45%', left:6, right:6, height:1, background:`${dv.highlight}33`, borderRadius:1 }}/>}
              {/* Knot marks for bamboo */}
              {dv.h <= 8 && i%2===0 && <div style={{ position:'absolute', top:'20%', left:`${20+i*8}%`, width:3, height:3, borderRadius:'50%', background:`${dv.border}55` }}/>}
            </div>
          ))}
        </div>
      )}

      {/* ═══ FENCE RAILS — vertical planks like reference image ═══ */}
      {hasDeck && hasHull && dv && (
        <div style={{ position:'absolute', left:raftLeft-6, top:deckTop-20, width:raftW+12, height:20, display:'flex', gap:1 }}>
          {Array.from({length: compact?8:12}).map((_,i) => (
            <div key={i} style={{
              flex:1, height:'100%', borderRadius:'3px 3px 0 0',
              background: `linear-gradient(180deg, ${dv.color}dd, ${dv.border})`,
              border: `1px solid ${dv.border}88`,
              animation: animating === 'deck' ? `dropIn 0.3s cubic-bezier(.34,1.56,.64,1) ${0.5+i*0.03}s both` : 'none',
            }}/>
          ))}
        </div>
      )}

      {/* ═══ PROPULSION — oar/paddle with shaft + blade ═══ */}
      {hasProp && hasHull && propItem && (
        <div style={{
          position: 'absolute', right: compact?20:36, top: deckTop - 42,
          animation: animating === 'propulsion' ? 'dropIn 0.7s cubic-bezier(.34,1.56,.64,1)' : 'none',
        }}>
          <div style={{ position:'relative', width:compact?36:50, height:compact?65:90, transform:'rotate(-22deg)', transformOrigin:'bottom center' }}>
            {/* Shaft */}
            <div style={{ position:'absolute', left:'50%', top:0, transform:'translateX(-50%)', width:4, height:'65%',
              background: propItem.correct ? 'linear-gradient(180deg,#a16207,#78350f)' : '#6b7280',
              borderRadius:2, boxShadow:'1px 1px 3px rgba(0,0,0,0.3)' }}/>
            {/* Blade */}
            <div style={{ position:'absolute', left:'50%', bottom:0, transform:'translateX(-50%)',
              width: propItem.correct ? 20 : 12,
              height: propItem.correct ? 26 : 14,
              borderRadius: propItem.correct ? '4px 4px 14px 14px' : 4,
              background: propItem.correct ? 'linear-gradient(180deg,#b45309,#78350f)' : '#4b5563',
              border: `2px solid ${propItem.correct ? '#78350f' : '#374151'}`,
              boxShadow: `inset 0 -3px 6px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.3)` }}>
              {/* Blade grain */}
              {propItem.correct && <div style={{ position:'absolute', top:'30%', left:3, right:3, height:1, background:'#92400e44', borderRadius:1 }}/>}
            </div>
          </div>
        </div>
      )}

      {/* Water splash particles at raft edges */}
      {allDone && <>
        {[0,1,2].map(i => (
          <div key={`sp${i}`} style={{
            position:'absolute', left:raftLeft-12+i*4, top:logsBottom-6, width:4, height:10+i*3,
            background:'rgba(147,197,253,0.3)', borderRadius:'50%',
            animation:`splashUp ${1.2+i*0.3}s ease-in-out ${i*0.3}s infinite`
          }}/>
        ))}
        {[0,1,2].map(i => (
          <div key={`sr${i}`} style={{
            position:'absolute', right: W-raftLeft-raftW-12+i*4, top:logsBottom-6, width:4, height:10+i*3,
            background:'rgba(147,197,253,0.3)', borderRadius:'50%',
            animation:`splashUp ${1.2+i*0.3}s ease-in-out ${0.5+i*0.3}s infinite`
          }}/>
        ))}
      </>}

      {/* Glow on completion */}
      {allDone && <div style={{ position:'absolute', inset:0, borderRadius:20, animation:'buildPulse 1.5s ease-in-out infinite', pointerEvents:'none' }}/>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════════
function ItemTooltip({ item, x, y }) {
  const slotColor = SLOT_COLORS[item.slot]
  const slotLabel = BUILD_STEPS.find(s => s.id === item.slot)?.name || item.slot
  const left = Math.min(window.innerWidth - 290, x + 16)
  const top = Math.max(12, y - 140)
  return (
    <div style={{
      position: 'fixed', left, top, zIndex: 100, width: 260,
      background: '#0f172a', color: '#fff', border: `2px solid ${slotColor}`, borderRadius: 14, padding: '10px 14px',
      boxShadow: `0 10px 24px ${slotColor}44`, animation: 'fadeIn 0.15s ease-out', pointerEvents: 'none',
    }}>
      <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span>{item.emoji}</span><span>{item.name}</span>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ background: `${slotColor}22`, color: slotColor, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{slotLabel}</span>
        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 999, fontSize: 10 }}>⚖️ {item.wt} kg</span>
        {item.correct
          ? <span style={{ background: 'rgba(16,185,129,0.35)', color: '#d1fae5', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>✓ SMART</span>
          : <span style={{ background: 'rgba(239,68,68,0.35)', color: '#fecaca', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800 }}>⚠️ RISKY</span>}
      </div>
      <div style={{ color: '#cbd5e1', fontSize: 11, lineHeight: 1.5 }}>{item.tip}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function Module2_HomeDefense() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [collectedIds, setCollectedIds] = useState([])
  const [assignments, setAssignments] = useState({ hull: null, binding: null, deck: null, propulsion: null })
  const [timeLeft, setTimeLeft] = useState(TIMER_START)
  const [result, setResult] = useState(null)
  const [readBlueprint, setReadBlueprint] = useState(false)
  const [nearbyItem, setNearbyItem] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [stressStep, setStressStep] = useState(0)
  const [buildStep, setBuildStep] = useState(0)    // 0-3 = which slot we're assigning
  const [animating, setAnimating] = useState(null)  // which slot is animating

  const playerRef = useRef({ x: 100, y: 480, vx: 0, vy: 0, facing: 1, grounded: false })
  const keysRef = useRef({ left: false, right: false, up: false })
  const cameraRef = useRef({ x: 0, y: 0 })
  const worldElRef = useRef(null)
  const playerElRef = useRef(null)
  const timerRef = useRef(null)
  const frameRef = useRef(null)
  const nearItemRef = useRef(null)
  const collectedRef = useRef([])
  const pickupRef = useRef(null)

  useEffect(() => { collectedRef.current = collectedIds }, [collectedIds])

  // Timer
  useEffect(() => {
    if (phase !== 'garage') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPhase('assembly'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  // Pickup
  pickupRef.current = useCallback(() => {
    const item = nearItemRef.current
    if (!item || collectedRef.current.includes(item.id)) return
    setCollectedIds(prev => [...prev, item.id])
    nearItemRef.current = null; setNearbyItem(null)
  }, [])

  // Keyboard
  useEffect(() => {
    if (phase !== 'garage') return
    const k = keysRef.current
    const down = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { k.left = true; e.preventDefault() }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { k.right = true; e.preventDefault() }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { k.up = true; e.preventDefault() }
      if (e.key === ' ' || e.key === 'e' || e.key === 'E') { pickupRef.current(); e.preventDefault() }
    }
    const up = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false
    }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); k.left = k.right = k.up = false }
  }, [phase])

  // Game loop
  useEffect(() => {
    if (phase !== 'garage') return
    let prev = performance.now()
    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now
      const p = playerRef.current, k = keysRef.current, cam = cameraRef.current
      p.vx = (k.left ? -WALK_SPEED : 0) + (k.right ? WALK_SPEED : 0)
      if (k.up && p.grounded) { p.vy = -JUMP_VEL; p.grounded = false }
      if (!p.grounded) p.vy += GRAVITY * dt
      if (p.vx !== 0) p.facing = p.vx > 0 ? 1 : -1
      p.x += p.vx * dt; p.y += p.vy * dt
      p.x = Math.max(10, Math.min(WORLD_W - PLAYER_W - 10, p.x))
      p.grounded = false
      for (const pl of PLATFORMS) {
        if (p.x + PLAYER_W > pl.x && p.x < pl.x + pl.w) {
          const feet = p.y + PLAYER_H, prevFeet = feet - p.vy * dt
          if (prevFeet <= pl.y + 2 && feet >= pl.y && p.vy >= 0) { p.y = pl.y - PLAYER_H; p.vy = 0; p.grounded = true }
        }
      }
      const vw = window.innerWidth, vh = window.innerHeight
      const tx = p.x + PLAYER_W / 2 - vw / 2, ty = p.y + PLAYER_H / 2 - vh / 2
      cam.x += (tx - cam.x) * CAM_LERP; cam.y += (ty - cam.y) * CAM_LERP
      cam.x = Math.max(0, Math.min(Math.max(0, WORLD_W - vw), cam.x))
      cam.y = Math.max(0, Math.min(Math.max(0, WORLD_H - vh), cam.y))
      if (worldElRef.current) worldElRef.current.style.transform = `translate(${-cam.x}px,${-cam.y}px)`
      if (playerElRef.current) { playerElRef.current.style.left = `${p.x}px`; playerElRef.current.style.top = `${p.y}px`; playerElRef.current.style.transform = `scaleX(${p.facing})` }
      const px = p.x + PLAYER_W / 2, py = p.y + PLAYER_H / 2
      let closest = null, minD = PICKUP_RANGE
      for (const it of CATALOGUE) { if (collectedRef.current.includes(it.id)) continue; const d = Math.sqrt((px - it.wx) ** 2 + (py - it.wy) ** 2); if (d < minD) { minD = d; closest = it } }
      if (closest !== nearItemRef.current) { nearItemRef.current = closest; setNearbyItem(closest) }
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [phase])

  // Stress test
  useEffect(() => {
    if (phase !== 'stressTest') return
    let step = 0; setStressStep(0)
    const iv = setInterval(() => {
      step++; setStressStep(step)
      if (step >= 5) {
        clearInterval(iv)
        const res = computeScore(assignments, timeLeft, readBlueprint)
        setResult(res)
        gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-2', result: { score: res.score, passed: res.passed } } })
        setTimeout(() => setPhase('result'), 2000)
      }
    }, 1500)
    return () => clearInterval(iv)
  }, [phase]) // eslint-disable-line

  function handleAssemblyPick(itemId) {
    const step = BUILD_STEPS[buildStep]
    if (!step) return
    setAssignments(prev => ({ ...prev, [step.id]: itemId }))
    setAnimating(step.id)
    setTimeout(() => {
      setAnimating(null)
      if (buildStep < 3) setBuildStep(buildStep + 1)
    }, 800)
  }

  function retry() {
    setCollectedIds([]); setAssignments({ hull: null, binding: null, deck: null, propulsion: null })
    setTimeLeft(TIMER_START); setResult(null); setReadBlueprint(false); setNearbyItem(null)
    setStressStep(0); setBuildStep(0); setAnimating(null)
    playerRef.current = { x: 100, y: 480, vx: 0, vy: 0, facing: 1, grounded: false }
    cameraRef.current = { x: 0, y: 0 }; nearItemRef.current = null; setPhase('intro')
  }

  // ═══════════ INTRO ═══════════
  if (phase === 'intro') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>
      {['🏚️','🌊','🛶','🪵','🔧','🛢️','🪢','🏏','⚙️','🔩'].map((e,i)=>(
        <div key={i} style={{ position:'absolute', left:`${(i*11+4)%95}%`, top:`${(i*17+8)%80}%`, fontSize:40+(i%3)*8, opacity:0.15, animation:`bob ${3+i*0.3}s ease-in-out infinite` }}>{e}</div>
      ))}
      <div style={{ position:'relative', zIndex:1, maxWidth:640, width:'100%', background:'rgba(255,255,255,0.94)', borderRadius:28, padding:40, border:'4px solid #0f172a', boxShadow:'0 24px 60px rgba(0,0,0,0.35)', textAlign:'center' }}>
        <div style={{ fontSize:80, animation:'bob 2s ease-in-out infinite' }}>🛶</div>
        <div style={{ display:'inline-block', background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'#fff', padding:'6px 18px', borderRadius:999, fontWeight:800, fontSize:12, letterSpacing:2, animation:'pulse-ring 1.4s infinite', marginTop:4 }}>🌊 FLOOD WATER RISING</div>
        <h1 style={{ fontSize:34, fontWeight:900, margin:'14px 0 4px', color:'#0f172a' }}>Build the Raft</h1>
        <div style={{ color:'#475569', fontSize:14, fontWeight:600, marginBottom:20 }}>NDMA · Improvised Flotation Module</div>
        <p style={{ color:'#334155', fontSize:15, lineHeight:1.7, marginBottom:16 }}>
          You've escaped the house with your Go-Bag, but the streets are <strong>flooded</strong>.
          No rescue boats in sight. You find an <strong>old garage</strong> full of materials.
          Build a <strong>survival raft</strong> by exploring, collecting, and assembling — step by step.
        </p>
        <div style={{ background:'#f8fafc', border:'2px dashed #94a3b8', borderRadius:16, padding:16, textAlign:'left', marginBottom:22 }}>
          <div style={{ color:'#0f172a', fontSize:13, lineHeight:1.9, fontWeight:600 }}>
            <div>📋 Read the raft blueprint</div>
            <div>🔍 Explore the garage & collect materials</div>
            <div>🔧 Assemble step-by-step: Hull → Binding → Deck → Paddle</div>
            <div>🌊 Watch the stress test — does your raft float?</div>
          </div>
        </div>
        <button onClick={()=>setPhase('blueprint')} style={{ padding:'16px 40px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', fontWeight:900, fontSize:18, letterSpacing:1, cursor:'pointer', boxShadow:'0 10px 24px rgba(59,130,246,0.5)' }}>📋 VIEW BLUEPRINT</button>
        <div style={{ marginTop:12 }}><button onClick={()=>gameDispatch({type:'BACK_TO_MODULES'})} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>← Back to Modules</button></div>
      </div>
    </div>
  )

  // ═══════════ BLUEPRINT ═══════════
  if (phase === 'blueprint') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{KEYFRAMES}</style>
      <div style={{ maxWidth:720, width:'100%', background:'rgba(255,255,255,0.96)', borderRadius:28, padding:36, border:'4px solid #0f172a', boxShadow:'0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>📋</div>
          <h2 style={{ fontSize:26, fontWeight:900, color:'#0f172a', margin:0 }}>Raft Blueprint</h2>
          <p style={{ color:'#64748b', fontSize:13, marginTop:4 }}>Build in 4 steps — each component is critical for survival.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
          {BUILD_STEPS.map((s,i) => (
            <div key={s.id} style={{ padding:16, borderRadius:16, border:`2px solid ${s.color}33`, background:`${s.color}08`, animation:`slideUp 0.4s ease-out ${i*0.1}s both` }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:28 }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:s.color }}>{s.name}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{s.desc}</div>
                </div>
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', fontStyle:'italic', lineHeight:1.5 }}>
                {s.id==='hull' && '💡 Sealed airtight containers provide best buoyancy'}
                {s.id==='binding' && '💡 Synthetic materials stay strong when wet'}
                {s.id==='deck' && '💡 Natural bamboo is light, flat & water-resistant'}
                {s.id==='propulsion' && '💡 Flat blade shape displaces water effectively'}
              </div>
            </div>
          ))}
        </div>
        <div style={{ background:'#fef3c7', border:'2px solid #f59e0b', borderRadius:12, padding:'10px 16px', marginBottom:20 }}>
          <div style={{ fontWeight:800, fontSize:12, color:'#92400e' }}>💡 NDMA TIP</div>
          <div style={{ fontSize:12, color:'#78350f', lineHeight:1.6, marginTop:4 }}>
            NDRF teams use <strong>sealed drums + bamboo + nylon rope</strong> for emergency flotation.
            This combination has saved lives in Kerala 2018, Chennai 2023, and Uttarakhand floods.
          </div>
        </div>
        <div style={{ textAlign:'center' }}>
          <button onClick={()=>{setReadBlueprint(true);setPhase('garage')}} style={{ padding:'14px 36px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 8px 20px rgba(34,197,94,0.4)' }}>🔍 EXPLORE THE GARAGE</button>
        </div>
      </div>
    </div>
  )

  // ═══════════ GARAGE ═══════════
  if (phase === 'garage') {
    const waterH = 20 + ((TIMER_START - timeLeft) / TIMER_START) * 60
    return (
      <div style={{ position:'fixed', inset:0, overflow:'hidden', background:'linear-gradient(180deg,#1a1a2e,#2d2d44)', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <div style={{ position:'fixed', inset:0, background:'repeating-linear-gradient(0deg,transparent 0px,transparent 18px,rgba(174,194,224,0.06) 18px,rgba(174,194,224,0.06) 20px)', backgroundSize:'100% 120px', animation:'rainAnim 0.25s linear infinite', pointerEvents:'none', zIndex:50 }}/>

        <div ref={worldElRef} style={{ position:'absolute', width:WORLD_W, height:WORLD_H, willChange:'transform' }}>
          <div style={{ position:'absolute', left:0, top:0, width:WORLD_W, height:60, background:'#2d2d44' }}/>
          <div style={{ position:'absolute', left:8, top:45, width:1484, height:18, background:'#5c4a3a', borderTop:'3px solid #7a6855', borderBottom:'2px solid #3a2820', borderRadius:'2px 2px 0 0' }}/>
          <div style={{ position:'absolute', left:GARAGE_BG.x, top:GARAGE_BG.y, width:GARAGE_BG.w, height:GARAGE_BG.h, background:GARAGE_BG.wall, borderLeft:`3px solid ${GARAGE_BG.trim}`, borderRight:`3px solid ${GARAGE_BG.trim}` }}/>
          <div style={{ position:'absolute', left:WORLD_W/2, top:76, transform:'translateX(-50%)', background:'rgba(15,23,42,0.55)', color:'#fff', padding:'3px 12px', borderRadius:10, fontSize:10, fontWeight:700, letterSpacing:1, pointerEvents:'none', opacity:0.7 }}>GARAGE / SHED</div>

          {/* Walls */}
          <div style={{ position:'absolute', left:6, top:55, width:8, height:470, background:'#5c3d2e', border:'1px solid #3a2510' }}/>
          <div style={{ position:'absolute', left:1486, top:55, width:8, height:470, background:'#5c3d2e', border:'1px solid #3a2510' }}/>

          {PLATFORMS.map((p,i)=><div key={i} style={{ position:'absolute', left:p.x, top:p.y, width:p.w, height:p.h, background:p.h>10?'#5c3d2e':'#7a5c3d', borderTop:'3px solid #3a2510', borderRadius:p.h<=10?2:0 }}/>)}

          <div style={{ position:'absolute', left:0, top:540, width:WORLD_W, height:80, background:'linear-gradient(180deg,#38271a,#1a1005)' }}>
            <div style={{ position:'absolute', left:0, bottom:0, width:'100%', height:waterH, background:'linear-gradient(180deg,rgba(30,100,180,0.25),rgba(20,60,120,0.5))', transition:'height 1s ease-out', borderTop:'2px solid rgba(100,180,255,0.3)' }}/>
          </div>

          {FURNITURE.map((f,i)=><div key={i} style={{ position:'absolute', left:f.x, top:f.y, width:f.w, height:f.h, background:f.c, border:`2px solid ${f.b}`, borderRadius:f.r||0, opacity:0.85 }}/>)}
          {DECOR.map((d,i)=><div key={i} style={{ position:'absolute', left:d.x, top:d.y, fontSize:d.s, transform:'translate(-50%,-50%)', animation:'bob-sm 5s ease-in-out infinite', pointerEvents:'none', userSelect:'none', opacity:0.7 }}>{d.e}</div>)}

          {/* Items */}
          {CATALOGUE.filter(it=>!collectedIds.includes(it.id)).map(it=>{
            const sz=it.sz||40, sc=SLOT_COLORS[it.slot], isNear=nearbyItem?.id===it.id
            return (
              <div key={it.id}
                onMouseEnter={e=>{setHoveredItem(it);setHoverPos({x:e.clientX,y:e.clientY})}}
                onMouseMove={e=>setHoverPos({x:e.clientX,y:e.clientY})}
                onMouseLeave={()=>setHoveredItem(null)}
                onClick={()=>{if(nearItemRef.current?.id===it.id) pickupRef.current()}}
                style={{ position:'absolute', left:it.wx, top:it.wy, width:sz, height:sz, transform:'translate(-50%,-50%)', cursor:isNear?'pointer':'default', zIndex:10, animation:'bob-sm 3.5s ease-in-out infinite', filter:'drop-shadow(0 3px 6px rgba(0,0,0,0.3))' }}>
                <div style={{ width:sz, height:sz, borderRadius:'50%', background:`radial-gradient(circle at 35% 35%,white,${sc}88)`, border:`2px solid ${sc}`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:isNear?`0 0 18px ${sc},0 0 36px ${sc}44`:`0 2px 8px ${sc}44`, transition:'box-shadow 0.3s' }}>
                  <div style={{ fontSize:sz*0.55, lineHeight:1 }}>{it.emoji}</div>
                </div>
                {isNear && <div style={{ position:'absolute', top:-(sz/2+8), left:'50%', transform:'translateX(-50%)', background:'rgba(15,23,42,0.9)', color:'#fbbf24', padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:800, whiteSpace:'nowrap', border:'1px solid #fbbf24' }}>E / SPACE</div>}
              </div>
            )
          })}

          {/* Player */}
          <div ref={playerElRef} style={{ position:'absolute', width:PLAYER_W, height:PLAYER_H, zIndex:20, left:100, top:480 }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:'#fbbf24', border:'2px solid #78350f', position:'absolute', top:-2, left:3 }}/>
            <div style={{ width:22, height:18, background:'#ea580c', border:'2px solid #9a3412', borderRadius:'3px 3px 0 0', position:'absolute', top:14, left:1 }}/>
            <div style={{ width:7, height:11, background:'#1d4ed8', borderRadius:'0 0 2px 2px', position:'absolute', top:30, left:3 }}/>
            <div style={{ width:7, height:11, background:'#1d4ed8', borderRadius:'0 0 2px 2px', position:'absolute', top:30, left:14 }}/>
          </div>
        </div>

        {/* HUD */}
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:30, padding:'8px 14px', display:'flex', gap:10, alignItems:'center', justifyContent:'space-between', background:'rgba(15,23,42,0.92)', backdropFilter:'blur(12px)', borderBottom:'3px solid #3b82f6' }}>
          <div style={{ background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', color:'#fff', padding:'5px 12px', borderRadius:999, fontWeight:800, fontSize:11 }}>🛶 RAFT BUILDING</div>
          <div style={{ color:'#94a3b8', fontSize:12, fontWeight:700 }}>📦 {collectedIds.length} collected</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:20, fontWeight:900, color:timeLeft<=15?'#ef4444':timeLeft<=30?'#f59e0b':'#10b981', padding:'3px 10px', borderRadius:8, background:'rgba(0,0,0,0.4)', border:`2px solid ${timeLeft<=15?'#ef4444':timeLeft<=30?'#f59e0b':'#10b981'}` }}>⏱ {String(timeLeft).padStart(2,'0')}s</div>
            <button onClick={()=>{clearInterval(timerRef.current);setPhase('assembly')}} style={{ padding:'6px 14px', borderRadius:999, border:'none', background:collectedIds.length>=4?'linear-gradient(135deg,#22c55e,#16a34a)':'#475569', color:'#fff', fontWeight:800, fontSize:11, cursor:'pointer' }}>🔧 ASSEMBLE →</button>
          </div>
        </div>
        <div style={{ position:'fixed', bottom:10, left:'50%', transform:'translateX(-50%)', zIndex:30, display:'flex', gap:8, background:'rgba(15,23,42,0.85)', padding:'5px 14px', borderRadius:10, fontSize:10, color:'#94a3b8', fontWeight:600 }}>
          <span>← → Move</span><span>·</span><span>↑ Jump</span><span>·</span><span>E/Space Collect</span>
        </div>
        {hoveredItem && <ItemTooltip item={hoveredItem} x={hoverPos.x} y={hoverPos.y}/>}
      </div>
    )
  }

  // ═══════════ ASSEMBLY — step-by-step progressive build ═══════════
  if (phase === 'assembly') {
    const currentSlot = BUILD_STEPS[buildStep]
    const collectedItems = CATALOGUE.filter(i => collectedIds.includes(i.id))
    const assignedIds = Object.values(assignments).filter(Boolean)
    const availableForSlot = collectedItems.filter(i => i.slot === currentSlot?.id && !assignedIds.includes(i.id))
    const allOtherAvailable = collectedItems.filter(i => i.slot !== currentSlot?.id && !assignedIds.includes(i.id))
    const allDone = buildStep >= 3 && assignments.propulsion !== null

    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0c1322,#1a2544)', padding:'20px 24px', fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <h2 style={{ fontSize:24, fontWeight:900, color:'#f1f5f9', margin:'0 0 4px' }}>🔧 Raft Assembly</h2>
            <p style={{ color:'#64748b', fontSize:12 }}>Build your raft step-by-step. Each piece matters.</p>
          </div>

          {/* Progress steps */}
          <div style={{ display:'flex', gap:4, marginBottom:20, justifyContent:'center' }}>
            {BUILD_STEPS.map((s,i)=>{
              const done = assignments[s.id] !== null
              const active = i === buildStep && !allDone
              return (
                <div key={s.id} style={{
                  display:'flex', alignItems:'center', gap:4, padding:'6px 14px', borderRadius:999,
                  background: done ? `${s.color}22` : active ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${done ? s.color : active ? s.color+'66' : 'rgba(255,255,255,0.08)'}`,
                  transition:'all 0.3s',
                }}>
                  <span style={{ fontSize:16 }}>{done ? '✅' : s.icon}</span>
                  <span style={{ fontSize:10, fontWeight:700, color: done ? s.color : active ? '#e2e8f0' : '#475569' }}>{s.id.toUpperCase()}</span>
                </div>
              )
            })}
          </div>

          {/* Raft visualization */}
          <RaftVisualization assignments={assignments} currentStep={buildStep} animating={animating}/>

          {/* Current step instruction */}
          {currentSlot && !allDone && (
            <div style={{ textAlign:'center', marginTop:16, animation:'fadeIn 0.4s ease-out' }}>
              <div style={{ fontSize:18, fontWeight:900, color:currentSlot.color, marginBottom:4 }}>{currentSlot.name}</div>
              <div style={{ color:'#94a3b8', fontSize:13 }}>{currentSlot.instruction}</div>
            </div>
          )}

          {/* Material choices for current step */}
          {currentSlot && !allDone && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:12, marginTop:16 }}>
              {availableForSlot.map(item => (
                <div key={item.id} onClick={()=>handleAssemblyPick(item.id)}
                  onMouseEnter={e=>{setHoveredItem(item);setHoverPos({x:e.clientX,y:e.clientY})}}
                  onMouseLeave={()=>setHoveredItem(null)}
                  style={{
                    padding:16, borderRadius:16, cursor:'pointer', textAlign:'center',
                    background:'rgba(255,255,255,0.04)', border:`2px solid ${currentSlot.color}44`,
                    transition:'all 0.2s',
                  }}
                  onMouseOver={e=>e.currentTarget.style.borderColor=currentSlot.color}
                  onMouseOut={e=>e.currentTarget.style.borderColor=currentSlot.color+'44'}
                >
                  <div style={{ fontSize:40, marginBottom:6 }}>{item.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{item.name}</div>
                  <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>⚖️ {item.wt} kg</div>
                </div>
              ))}
              {/* Items from wrong category that were collected (show greyed out) */}
              {availableForSlot.length === 0 && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:20, color:'#ef4444', fontSize:13, fontWeight:700 }}>
                  ⚠️ No {currentSlot.id} materials collected! Go back to garage.
                </div>
              )}
            </div>
          )}

          {/* Undo last step */}
          {buildStep > 0 && !allDone && (
            <div style={{ textAlign:'center', marginTop:12 }}>
              <button onClick={()=>{
                const prevSlot = BUILD_STEPS[buildStep-1].id
                setAssignments(prev=>({...prev,[prevSlot]:null}))
                setBuildStep(buildStep-1)
              }} style={{ background:'none', border:'1px solid #475569', color:'#94a3b8', padding:'6px 16px', borderRadius:999, fontSize:11, cursor:'pointer' }}>↩ Undo last step</button>
            </div>
          )}

          {/* All done — launch button */}
          {allDone && (
            <div style={{ textAlign:'center', marginTop:24, animation:'fadeIn 0.5s ease-out' }}>
              <div style={{ fontSize:20, fontWeight:900, color:'#4ade80', marginBottom:12 }}>✅ Raft Assembly Complete!</div>
              <button onClick={()=>setPhase('stressTest')} style={{
                padding:'16px 40px', borderRadius:999, border:'none',
                background:'linear-gradient(135deg,#ef4444,#b91c1c)', color:'#fff', fontWeight:900, fontSize:18, cursor:'pointer',
                boxShadow:'0 10px 24px rgba(239,68,68,0.5)', animation:'pulse-ring 1.5s infinite',
              }}>🌊 LAUNCH STRESS TEST</button>
            </div>
          )}

          {/* Back to garage */}
          <div style={{ textAlign:'center', marginTop:16 }}>
            <button onClick={()=>setPhase('garage')} style={{ background:'none', border:'none', color:'#475569', fontSize:12, cursor:'pointer' }}>← Back to Garage</button>
          </div>
        </div>
        {hoveredItem && <ItemTooltip item={hoveredItem} x={hoverPos.x} y={hoverPos.y}/>}
      </div>
    )
  }

  // ═══════════ STRESS TEST — moving river scene ═══════════
  if (phase === 'stressTest') {
    const testResults = BUILD_STEPS.map(s => {
      const item = CATALOGUE.find(i => i.id === assignments[s.id])
      return { slot: s, item, correct: item?.correct || false, msg: item?.testMsg || 'Component missing!' }
    })
    const correctCount = testResults.filter(r => r.correct).length
    const raftOk = correctCount >= 3
    const failedSlots = testResults.filter(r => !r.correct).map(r => r.slot.id)
    // Phase labels for the river journey
    const journeyPhase = stressStep <= 1 ? 'LAUNCHING...' : stressStep <= 2 ? 'CALM WATERS' : stressStep <= 3 ? 'DEEP CURRENT' : stressStep <= 4 ? 'WAVE SURGE' : raftOk ? 'SAFE SHORE!' : 'CAPSIZED!'

    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#060d1a,#0a1628)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>
        <h2 style={{ fontSize:22, fontWeight:900, color:'#f1f5f9', marginBottom:2 }}>🌊 Flood Water Stress Test</h2>
        <p style={{ color:'#64748b', fontSize:12, marginBottom:16 }}>{journeyPhase}</p>

        {/* === RIVER SCENE === */}
        <div style={{ position:'relative', width:'100%', maxWidth:760, height:300, borderRadius:20, overflow:'hidden', background:'linear-gradient(180deg,#111827 0%,#1e293b 35%,#1e3a5a 100%)', border:'2px solid #1e3a5a', marginBottom:20 }}>

          {/* Sky */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:'35%', background:'linear-gradient(180deg,#0f172a,#1a2744)' }}>
            {/* Stars */}
            {Array.from({length:12}).map((_,i) => (
              <div key={i} style={{ position:'absolute', left:`${(i*8.3+3)%95}%`, top:`${(i*7+5)%30}%`, width:2, height:2, borderRadius:'50%', background:'rgba(255,255,255,0.3)', animation:`bob-sm ${2+i*0.3}s ease-in-out infinite` }}/>
            ))}
          </div>

          {/* Distant trees/buildings silhouette */}
          <div style={{ position:'absolute', top:'28%', left:0, right:0, height:30, display:'flex', alignItems:'flex-end', gap:0, pointerEvents:'none' }}>
            {Array.from({length:24}).map((_,i) => (
              <div key={i} style={{ flex:1, height: 8 + Math.sin(i*0.7)*12 + Math.random()*6, background:'#0f172a', borderRadius:'4px 4px 0 0', opacity:0.7 }}/>
            ))}
          </div>

          {/* River water — scrolling */}
          <div style={{ position:'absolute', bottom:0, left:0, width:'200%', height: stressStep >= 3 ? '65%' : '50%', transition:'height 2s ease-out' }}>
            <div style={{ width:'100%', height:'100%', background:'linear-gradient(180deg,rgba(30,64,175,0.4),rgba(14,40,100,0.7))', animation:'riverScroll 4s linear infinite' }}>
              {/* Wave lines */}
              {Array.from({length:20}).map((_,i) => (
                <div key={i} style={{ position:'absolute', left:`${i*5}%`, top: `${10 + Math.sin(i)*15}%`, width:40, height:2, borderRadius:2, background:'rgba(147,197,253,0.15)', animation:`waveBob ${1.5+i*0.1}s ease-in-out ${i*0.1}s infinite` }}/>
              ))}
            </div>
          </div>
          {/* Water surface line */}
          <div style={{ position:'absolute', bottom: stressStep >= 3 ? '63%' : '48%', left:0, right:0, height:3, transition:'bottom 2s ease-out', background:'linear-gradient(90deg,transparent,rgba(96,165,250,0.5),rgba(147,197,253,0.3),rgba(96,165,250,0.5),transparent)' }}/>

          {/* Rain during storm phase */}
          {stressStep >= 3 && Array.from({length:30}).map((_,i) => (
            <div key={`rain${i}`} style={{ position:'absolute', top:-10, left:`${(i*3.4)%100}%`, width:1, height:`${18+i%12}px`, background:'rgba(150,190,230,0.22)', animation:`rainAnim ${0.6+i*0.03}s linear ${i*0.04}s infinite`, pointerEvents:'none' }}/>
          ))}

          {/* === THE RAFT (center) === */}
          <div style={{
            position: 'absolute',
            left: '50%', transform: 'translateX(-50%)',
            bottom: stressStep >= 3 ? (raftOk ? '52%' : stressStep >= 5 ? '15%' : '40%') : '38%',
            transition: 'bottom 2s ease-out',
            animation: stressStep >= 2
              ? (stressStep >= 4 && !raftOk
                ? 'raftSinkAnim 4s ease-in forwards'
                : stressStep >= 5 && raftOk
                  ? 'raftFloat 1.8s ease-in-out infinite'
                  : 'tiltRock 2s ease-in-out infinite')
              : 'none',
          }}>
            {/* CSS Raft — detailed build */}
            <div style={{ position:'relative', width:180, height:80 }}>
              {/* Hull — logs/drums */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', gap:2, justifyContent:'center' }}>
                {Array.from({length: HULL_VISUALS[assignments.hull]?.count || 4}).map((_,i) => {
                  const hvr = HULL_VISUALS[assignments.hull]
                  const visible = !(stressStep >= 4 && !raftOk && failedSlots.includes('hull') && i > 1)
                  return hvr ? (
                    <div key={i} style={{
                      width: (170 / hvr.count), height: hvr.logH,
                      borderRadius: hvr.logShape === 'rounded' ? hvr.logH/2 : hvr.logShape === 'cardboard' ? 1 : 3,
                      background: `linear-gradient(180deg,${hvr.logHighlight},${hvr.logColor})`,
                      border: `2px solid ${hvr.logBorder}`,
                      boxShadow: `inset 0 -2px 4px ${hvr.logBorder}88, 0 2px 6px rgba(0,0,0,0.4)`,
                      opacity: visible ? 1 : 0,
                      transition: 'opacity 0.8s, transform 0.8s',
                      transform: visible ? 'none' : 'translateY(30px) rotate(20deg)',
                    }}>
                      <div style={{ position:'absolute', top:2, left:'15%', right:'15%', height:2, borderRadius:1, background:`${hvr.logHighlight}55` }}/>
                    </div>
                  ) : null
                })}
              </div>

              {/* Binding — rope lines */}
              {assignments.binding && (() => {
                const bvr = BIND_VISUALS[assignments.binding]
                const snapping = stressStep >= 4 && !raftOk && failedSlots.includes('binding')
                return bvr ? (
                  <svg style={{ position:'absolute', bottom:0, left:-5, width:190, height:40, pointerEvents:'none' }}>
                    {[0,1,2].map(i => (
                      <line key={i} x1={5} y1={5+i*12} x2={185} y2={5+i*12}
                        stroke={snapping ? '#ef4444' : bvr.color} strokeWidth={bvr.width}
                        strokeDasharray={snapping ? '4,8' : bvr.dash} strokeLinecap="round" opacity={snapping && i > 0 ? 0.3 : 0.8}/>
                    ))}
                  </svg>
                ) : null
              })()}

              {/* Deck — planks across top */}
              {assignments.deck && (() => {
                const dvr = DECK_VISUALS[assignments.deck]
                const cracking = stressStep >= 4 && !raftOk && failedSlots.includes('deck')
                return dvr ? (
                  <div style={{ position:'absolute', bottom: (HULL_VISUALS[assignments.hull]?.logH || 24) - 2, left:-8, right:-8 }}>
                    {Array.from({length: Math.min(dvr.count, 8)}).map((_,i) => (
                      <div key={i} style={{
                        width: '100%', height: dvr.h, marginBottom:1,
                        borderRadius: dvr.h > 8 ? 3 : 1,
                        background: cracking
                          ? `linear-gradient(90deg,${dvr.color},transparent 50%,${dvr.color})`
                          : `linear-gradient(90deg,${dvr.border},${dvr.color},${dvr.highlight},${dvr.color},${dvr.border})`,
                        border: `1px solid ${cracking ? '#ef4444' : dvr.border}`,
                        opacity: cracking && i%2===0 ? 0.4 : 0.9,
                        transition: 'opacity 0.5s',
                      }}/>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Paddle */}
              {assignments.propulsion && (() => {
                const pi = CATALOGUE.find(i => i.id === assignments.propulsion)
                const broken = stressStep >= 4 && !raftOk && failedSlots.includes('propulsion')
                return pi ? (
                  <div style={{ position:'absolute', right:-28, top: -30, transform: `rotate(${broken ? 45 : -30}deg)`, transition:'transform 0.8s', opacity: broken ? 0.4 : 1 }}>
                    <div style={{ width:3, height:45, background: pi.correct ? '#78350f' : '#6b7280', borderRadius:1, margin:'0 auto' }}/>
                    <div style={{ width: pi.correct ? 16 : 10, height: pi.correct ? 22 : 12, borderRadius: pi.correct ? '3px 3px 10px 10px' : 3, background: pi.correct ? '#92400e' : '#4b5563', border:`1px solid ${pi.correct ? '#78350f' : '#374151'}`, margin:'0 auto' }}/>
                  </div>
                ) : null
              })()}

              {/* Debris flying off on failure */}
              {stressStep >= 4 && !raftOk && [
                { x: 20, y: -10, delay: 0, emoji: '💥' },
                { x: 140, y: -5, delay: 0.3, emoji: '💦' },
                { x: 80, y: -20, delay: 0.6, emoji: '⚠️' },
              ].map((d,i) => (
                <div key={`debris${i}`} style={{
                  position:'absolute', left:d.x, top:d.y, fontSize:18,
                  animation: `debrisFly 1.5s ease-out ${d.delay}s both`, pointerEvents:'none'
                }}>{d.emoji}</div>
              ))}
            </div>

            {/* Person on raft */}
            <div style={{ position:'absolute', bottom: (HULL_VISUALS[assignments.hull]?.logH || 24) + (DECK_VISUALS[assignments.deck]?.count || 0) * ((DECK_VISUALS[assignments.deck]?.h || 6) + 1) - 4, left:'50%', transform:'translateX(-50%)', opacity: stressStep >= 5 && !raftOk ? 0.3 : 1, transition:'opacity 1s' }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background:'#fbbf24', border:'2px solid #78350f', margin:'0 auto' }}/>
              <div style={{ width:14, height:12, background:'#ea580c', border:'1px solid #9a3412', borderRadius:'2px 2px 0 0', margin:'0 auto' }}/>
            </div>
          </div>

          {/* Shore destination (right side) */}
          {stressStep >= 4 && raftOk && (
            <div style={{ position:'absolute', right:20, bottom:'35%', animation:'fadeIn 1s ease-out' }}>
              <div style={{ fontSize:28 }}>🏕️</div>
              <div style={{ fontSize:8, color:'#4ade80', fontWeight:800, textAlign:'center' }}>SAFE<br/>ZONE</div>
            </div>
          )}

          {/* Journey progress bar */}
          <div style={{ position:'absolute', top:12, left:16, right:16, height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:3, width:`${Math.min(100, stressStep * 20)}%`, background: raftOk || stressStep < 4 ? 'linear-gradient(90deg,#3b82f6,#22c55e)' : 'linear-gradient(90deg,#3b82f6,#ef4444)', transition:'width 1.5s ease-out' }}/>
          </div>
          <div style={{ position:'absolute', top:4, right:20, fontSize:9, color:'#64748b', fontWeight:700 }}>{Math.min(100, stressStep * 20)}%</div>
        </div>

        {/* Component test results */}
        <div style={{ width:'100%', maxWidth:600, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {testResults.map((r,i) => (
            <div key={r.slot.id} style={{
              opacity:stressStep>i?1:0.25, transform:stressStep>i?'translateY(0)':'translateY(8px)', transition:'all 0.5s ease-out',
              padding:'10px 14px', borderRadius:12,
              background:stressStep>i?(r.correct?'rgba(34,197,94,0.08)':'rgba(239,68,68,0.08)'):'rgba(255,255,255,0.02)',
              border:`1.5px solid ${stressStep>i?(r.correct?'#22c55e33':'#ef444433'):'rgba(255,255,255,0.05)'}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:16 }}>{r.slot.icon}</span>
                <span style={{ fontSize:11, fontWeight:800, color:r.slot.color, flex:1 }}>{r.slot.id.toUpperCase()}</span>
                {stressStep>i && <span style={{ fontSize:10, fontWeight:800, color:r.correct?'#4ade80':'#f87171', background:r.correct?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', padding:'2px 8px', borderRadius:999 }}>{r.correct?'✅ HOLD':'❌ FAIL'}</span>}
              </div>
              {stressStep>i && <div style={{ fontSize:10, color:r.correct?'#86efac':'#fca5a5', marginTop:3, marginLeft:22, lineHeight:1.4 }}>{r.msg}</div>}
            </div>
          ))}
        </div>

        {stressStep >= 5 && (
          <div style={{ marginTop:16, animation:'fadeIn 0.5s ease-out', textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:6 }}>{raftOk ? '🏕️' : '💀'}</div>
            <div style={{ fontSize:16, fontWeight:900, color:raftOk?'#4ade80':'#f87171' }}>
              {raftOk ? 'RAFT REACHED SAFE SHORE!' : 'RAFT BROKE APART — YOU SANK!'}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ═══════════ RESULT ═══════════
  if (phase === 'result' && result) {
    const sc = result.passed?'#10b981':result.score>=40?'#f59e0b':'#ef4444'
    return (
      <div style={{ minHeight:'100vh', background:result.passed?'linear-gradient(135deg,#bbf7d0,#86efac,#34d399)':'linear-gradient(135deg,#fecaca,#f87171,#dc2626)', padding:32 }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <div style={{ background:'rgba(255,255,255,0.96)', borderRadius:28, padding:32, border:'4px solid #0f172a', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', textAlign:'center', marginBottom:20 }}>
            <div style={{ fontSize:72, animation:'bob 2s ease-in-out infinite' }}>{result.passed?'🛶':'💀'}</div>
            <div style={{ fontSize:22, fontWeight:900, color:sc, letterSpacing:1, marginTop:6 }}>{result.headline}</div>
            <div style={{ marginTop:14, fontSize:64, fontWeight:900, color:sc }}>{result.score}<span style={{ fontSize:24, color:'#94a3b8' }}>/100</span></div>
            <p style={{ color:'#334155', fontSize:14, lineHeight:1.7, margin:'12px auto 0', maxWidth:580 }}>{result.lesson}</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:12 }}>
              <span style={{ background:'#f0fdf4', color:'#166534', padding:'4px 12px', borderRadius:999, fontSize:11, fontWeight:700 }}>🧩 {result.correctCount}/4</span>
              {result.timeBonus>0 && <span style={{ background:'#eff6ff', color:'#1e40af', padding:'4px 12px', borderRadius:999, fontSize:11, fontWeight:700 }}>⏱ +{result.timeBonus}</span>}
              {result.bpBonus>0 && <span style={{ background:'#fefce8', color:'#854d0e', padding:'4px 12px', borderRadius:999, fontSize:11, fontWeight:700 }}>📋 +{result.bpBonus}</span>}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            {result.results.map((r,i) => (
              <div key={i} style={{ background:r.correct?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', border:`2px solid ${r.correct?'#10b981':'#ef4444'}`, borderRadius:18, padding:14 }}>
                <div style={{ fontWeight:800, fontSize:13, color:r.correct?'#065f46':'#991b1b', marginBottom:4 }}>{r.correct?'✅':'❌'} {r.slot}</div>
                <div style={{ fontSize:12, color:'#374151', fontWeight:600 }}>{r.item}</div>
                <div style={{ fontSize:11, color:'#6b7280', marginTop:4, lineHeight:1.5 }}>{r.msg}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button onClick={retry} style={{ padding:'12px 28px', borderRadius:999, background:'#fff', color:'#0f172a', border:'2px solid #0f172a', fontWeight:800, fontSize:13, cursor:'pointer' }}>🔄 Try Again</button>
            <button onClick={()=>gameDispatch({type:'BACK_TO_MODULES'})} style={{ padding:'12px 28px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#1e40af,#1d4ed8)', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>← Back to Modules</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
