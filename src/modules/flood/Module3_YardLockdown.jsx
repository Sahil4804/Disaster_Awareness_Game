/**
 * Module 3 — Flood Rescue: Night Navigation
 * Top-down 2D raft navigation through dark flooded neighborhood.
 * Find and rescue 5 trapped victims using torch/flashlight.
 * Avoid electrical hazards, clear debris obstacles.
 * 180s timer, NDMA-aligned.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const TIMER_START = 180
const MAP_W = 2400
const MAP_H = 2400
const RAFT_W = 28
const RAFT_H = 44
const RAFT_SPEED = 1600
const RAFT_DRAG = 0.92
const CAM_LERP = 0.1
const TORCH_RADIUS = 700
const RESCUE_RANGE = 55
const INTERACT_TIME = 1500  // ms to hold E for rescue/clear
const DEBRIS_CLEAR_TIME = 2000
const BOAT_CAPACITY = 2
const SHELTER = { x: 2200, y: 180, w: 140, h: 100 }
const SHELTER_RANGE = 80
const SHOCK_PENALTY = 10
const SHOCK_COOLDOWN = 3000

// ═══════════════════════════════════════════════════════════════
// MAP DATA — flooded neighborhood
// ═══════════════════════════════════════════════════════════════

// Buildings (impassable, partially submerged)
const BUILDINGS = [
  // Row 1 — top
  { x: 120, y: 80, w: 180, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 420, y: 60, w: 200, h: 160, color: '#1a1a2e', roof: '#2a2040', label: 'Apartment' },
  { x: 780, y: 100, w: 160, h: 120, color: '#1a1a2e', roof: '#2d2040', label: 'Shop' },
  { x: 1100, y: 80, w: 220, h: 150, color: '#1a1a2e', roof: '#302040', label: 'School' },
  { x: 1480, y: 60, w: 180, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'Clinic' },
  { x: 1800, y: 100, w: 200, h: 130, color: '#1a1a2e', roof: '#2a2040', label: 'Office' },
  // Row 2
  { x: 80, y: 400, w: 200, h: 180, color: '#1a1a2e', roof: '#2d2040', label: 'Temple' },
  { x: 450, y: 380, w: 160, h: 160, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 780, y: 420, w: 240, h: 140, color: '#1a1a2e', roof: '#302040', label: 'Market' },
  { x: 1200, y: 380, w: 180, h: 180, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 1550, y: 400, w: 200, h: 150, color: '#1a1a2e', roof: '#2a2040', label: 'Pharmacy' },
  { x: 1900, y: 380, w: 160, h: 170, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  // Row 3
  { x: 150, y: 760, w: 160, h: 140, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 500, y: 740, w: 200, h: 160, color: '#1a1a2e', roof: '#302040', label: 'Warehouse' },
  { x: 880, y: 780, w: 180, h: 130, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 1250, y: 740, w: 220, h: 160, color: '#1a1a2e', roof: '#2a2040', label: 'Hospital' },
  { x: 1600, y: 760, w: 160, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 1950, y: 750, w: 180, h: 150, color: '#1a1a2e', roof: '#302040', label: 'Store' },
  // Row 4
  { x: 100, y: 1100, w: 180, h: 160, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 420, y: 1080, w: 200, h: 140, color: '#1a1a2e', roof: '#2a2040', label: 'Garage' },
  { x: 800, y: 1120, w: 160, h: 130, color: '#1a1a2e', roof: '#302040', label: 'House' },
  { x: 1150, y: 1080, w: 240, h: 180, color: '#1a1a2e', roof: '#2d2040', label: 'Community Hall' },
  { x: 1520, y: 1100, w: 180, h: 150, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 1880, y: 1110, w: 200, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  // Row 5
  { x: 200, y: 1440, w: 200, h: 160, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 560, y: 1420, w: 180, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 900, y: 1460, w: 160, h: 130, color: '#1a1a2e', roof: '#302040', label: 'Shop' },
  { x: 1280, y: 1420, w: 220, h: 170, color: '#1a1a2e', roof: '#2d2040', label: 'Panchayat' },
  { x: 1620, y: 1440, w: 180, h: 150, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 1960, y: 1450, w: 160, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  // Row 6
  { x: 120, y: 1780, w: 180, h: 150, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 480, y: 1800, w: 200, h: 130, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 850, y: 1760, w: 160, h: 160, color: '#1a1a2e', roof: '#302040', label: 'Masjid' },
  { x: 1200, y: 1780, w: 220, h: 140, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  { x: 1560, y: 1800, w: 180, h: 130, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 1920, y: 1770, w: 200, h: 160, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
  // Row 7 - bottom
  { x: 200, y: 2120, w: 160, h: 140, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 560, y: 2100, w: 200, h: 160, color: '#1a1a2e', roof: '#2d2040', label: 'School' },
  { x: 920, y: 2140, w: 180, h: 120, color: '#1a1a2e', roof: '#302040', label: 'House' },
  { x: 1300, y: 2100, w: 220, h: 160, color: '#1a1a2e', roof: '#2d2040', label: 'Station' },
  { x: 1680, y: 2120, w: 160, h: 140, color: '#1a1a2e', roof: '#2a2040', label: 'House' },
  { x: 2020, y: 2130, w: 180, h: 130, color: '#1a1a2e', roof: '#2d2040', label: 'House' },
]

// Obstacles (clearable debris and impassable cars)
const OBSTACLES_INIT = [
  { id: 'deb1', type: 'debris', x: 370, y: 300, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb2', type: 'debris', x: 700, y: 350, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb3', type: 'debris', x: 1050, y: 650, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb4', type: 'debris', x: 1400, y: 300, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb5', type: 'debris', x: 600, y: 1000, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb6', type: 'debris', x: 1700, y: 950, w: 50, h: 30, emoji: '🪵', cleared: false },
  { id: 'deb7', type: 'tree', x: 350, y: 680, w: 60, h: 60, emoji: '🌳', cleared: false },
  { id: 'deb8', type: 'tree', x: 1100, y: 350, w: 60, h: 60, emoji: '🌳', cleared: false },
  { id: 'deb9', type: 'tree', x: 750, y: 1350, w: 60, h: 60, emoji: '🌳', cleared: false },
  { id: 'deb10', type: 'tree', x: 1800, y: 650, w: 60, h: 60, emoji: '🌳', cleared: false },
  { id: 'car1', type: 'car', x: 680, y: 580, w: 60, h: 35, emoji: '🚗', cleared: false },
  { id: 'car2', type: 'car', x: 1350, y: 1000, w: 60, h: 35, emoji: '🚗', cleared: false },
  { id: 'car3', type: 'car', x: 400, y: 1350, w: 60, h: 35, emoji: '🚗', cleared: false },
  { id: 'car4', type: 'car', x: 1750, y: 1400, w: 60, h: 35, emoji: '🚗', cleared: false },
]

// Electrical hazard zones (downed power lines)
const HAZARDS = [
  { id: 'hz1', x: 650, y: 250, radius: 70, wireX1: 620, wireY1: 200, wireX2: 680, wireY2: 300 },
  { id: 'hz2', x: 1050, y: 550, radius: 65, wireX1: 1020, wireY1: 500, wireX2: 1080, wireY2: 600 },
  { id: 'hz3', x: 1500, y: 700, radius: 75, wireX1: 1470, wireY1: 650, wireX2: 1530, wireY2: 750 },
  { id: 'hz4', x: 350, y: 1200, radius: 60, wireX1: 320, wireY1: 1150, wireX2: 380, wireY2: 1250 },
  { id: 'hz5', x: 1800, y: 1200, radius: 70, wireX1: 1770, wireY1: 1150, wireX2: 1830, wireY2: 1250 },
]

// Victims to rescue — signalRange varies by signal effectiveness
// Fire > Flag > Flashlight > SOS > Phone > Shout (shouting is short range)
const VICTIMS_INIT = [
  { id: 'v1', x: 310, y: 160, rescued: false, name: 'Priya', age: 28, injury: 'Hypothermia',
    signal: 'fire', signalRange: 2000, signalDesc: 'Fire signal visible from far away',
    soundFreq: 440, buildingIdx: 0, tip: 'Fire is the most visible signal at night — visible from kilometres away.' },
  { id: 'v2', x: 990, y: 480, rescued: false, name: 'Rajan', age: 55, injury: 'Leg fracture',
    signal: 'flag', signalRange: 1200, signalDesc: 'Bright cloth flag waving from terrace',
    soundFreq: 520, buildingIdx: 8, tip: 'Bright-colored cloth on rooftops is visible to helicopters and boats.' },
  { id: 'v3', x: 1380, y: 520, rescued: false, name: 'Meera & child', age: 32, injury: 'Dehydration',
    signal: 'flashlight', signalRange: 900, signalDesc: 'Flashlight flickering from window',
    soundFreq: 600, buildingIdx: 11, tip: 'Flashlights are effective at night but drain battery — use SOS pattern.' },
  { id: 'v4', x: 680, y: 860, rescued: false, name: 'Ahmed', age: 42, injury: 'Minor cuts',
    signal: 'shout', signalRange: 500, signalDesc: 'Shouting for help — short range only',
    soundFreq: 350, buildingIdx: 14, tip: 'Shouting works in close range only. Whistle carries 3x farther.' },
  { id: 'v5', x: 1450, y: 840, rescued: false, name: 'Lakshmi', age: 67, injury: 'Diabetic emergency',
    signal: 'sos', signalRange: 800, signalDesc: 'SOS mirror flash from rooftop',
    soundFreq: 700, buildingIdx: 16, tip: 'Mirror SOS flashes can be seen from 10km in daylight. At night, use torch.' },
]

// Submerged poles/trees (visual only, small collision)
const POLES = [
  { x: 340, y: 330 }, { x: 760, y: 270 }, { x: 1160, y: 330 },
  { x: 500, y: 650 }, { x: 980, y: 680 }, { x: 1420, y: 650 },
  { x: 220, y: 980 }, { x: 740, y: 1050 }, { x: 1330, y: 980 },
  { x: 1680, y: 330 }, { x: 2050, y: 500 }, { x: 1880, y: 900 },
]

// ═══════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════
function computeScore(delivered, shockCount, timeLeft) {
  const rescuePoints = delivered * 18            // 18 × 5 = 90 max
  const noShockBonus = shockCount === 0 ? 5 : 0
  const allRescuedBonus = delivered >= 5 && timeLeft > 0 ? 5 : 0
  const total = Math.min(100, rescuePoints + noShockBonus + allRescuedBonus)
  const passed = total >= 60
  const headline = delivered >= 5 ? '🏆 ALL SURVIVORS DELIVERED TO SAFETY!'
    : delivered >= 3 ? '⚠️ PARTIAL RESCUE — Some still stranded'
    : delivered >= 1 ? '🆘 CRITICAL — Most victims not delivered' : '💀 MISSION FAILED — No one reached safety'
  return { score: total, passed, headline, rescued: delivered, shockCount, timeLeft, noShockBonus, allRescuedBonus }
}

// ═══════════════════════════════════════════════════════════════
// KEYFRAMES
// ═══════════════════════════════════════════════════════════════
const KEYFRAMES = `
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}100%{box-shadow:0 0 0 14px rgba(239,68,68,0)}}
@keyframes flashlight-flicker{0%,90%,100%{opacity:1}92%,97%{opacity:0.2}}
@keyframes sos-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:0.5}}
@keyframes flag-wave{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
@keyframes shout-ring{0%{transform:scale(0.5);opacity:0.8}100%{transform:scale(2.5);opacity:0}}
@keyframes phone-glow{0%,100%{box-shadow:0 0 8px #fff}50%{box-shadow:0 0 20px #fff,0 0 40px rgba(255,255,255,0.3)}}
@keyframes spark{0%{opacity:1;transform:translate(0,0) scale(1)}50%{opacity:0.8}100%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(0)}}
@keyframes wire-glow{0%,100%{filter:drop-shadow(0 0 4px #fbbf24)}50%{filter:drop-shadow(0 0 12px #fbbf24) drop-shadow(0 0 20px rgba(251,191,36,0.5))}}
@keyframes rescue-flash{0%{background:rgba(34,197,94,0.3)}100%{background:transparent}}
@keyframes wake{0%{opacity:0.4;transform:scaleX(1)}100%{opacity:0;transform:scaleX(2.5) translateY(8px)}}
@keyframes compassPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes interactFill{from{width:0%}to{width:100%}}
`

// ═══════════════════════════════════════════════════════════════
// COLLISION HELPERS
// ═══════════════════════════════════════════════════════════════
function rectCollide(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
}

// ═══════════════════════════════════════════════════════════════
// SPARK PARTICLE COMPONENT
// ═══════════════════════════════════════════════════════════════
function SparkParticles({ x, y, radius }) {
  // Generate random spark positions around the hazard
  const sparks = useRef(Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * Math.PI * 2 + Math.random() * 0.5,
    dist: 10 + Math.random() * (radius * 0.6),
    delay: Math.random() * 2,
    dur: 0.4 + Math.random() * 0.6,
    sx: (Math.random() - 0.5) * 30,
    sy: -10 - Math.random() * 20,
    size: 2 + Math.random() * 3,
  }))).current

  return (
    <>
      {sparks.map((s, i) => {
        const px = x + Math.cos(s.angle) * s.dist
        const py = y + Math.sin(s.angle) * s.dist
        return (
          <div key={i} style={{
            position: 'absolute', left: px, top: py, width: s.size, height: s.size,
            borderRadius: '50%', background: i % 3 === 0 ? '#fff' : '#fbbf24',
            boxShadow: `0 0 ${s.size * 2}px ${i % 3 === 0 ? '#fff' : '#fbbf24'}`,
            '--sx': `${s.sx}px`, '--sy': `${s.sy}px`,
            animation: `spark ${s.dur}s ease-out ${s.delay}s infinite`,
            pointerEvents: 'none',
          }} />
        )
      })}
      {/* Wire glow zone */}
      <div style={{
        position: 'absolute', left: x - radius, top: y - radius,
        width: radius * 2, height: radius * 2, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)',
        border: '1px dashed rgba(251,191,36,0.2)',
        animation: 'wire-glow 1.5s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// PROXIMITY SOUND ENGINE — Web Audio API
// ═══════════════════════════════════════════════════════════════
let audioCtx = null
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playBeep(freq, volume, duration = 0.08) {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = Math.min(0.3, volume * 0.3)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration + 0.01)
  } catch(e) { /* audio not available */ }
}

function playShockBuzz() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 120
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.stop(ctx.currentTime + 0.35)
  } catch(e) {}
}

function playRescueChime() {
  try {
    const ctx = getAudioCtx()
    const notes = [523, 659, 784] // C5, E5, G5
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      gain.gain.value = 0.15
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25)
      osc.stop(ctx.currentTime + i * 0.12 + 0.3)
    })
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════════
// VICTIM SIGNAL COMPONENT — visibility based on signal range
// ═══════════════════════════════════════════════════════════════
function VictimSignal({ victim, torchDist }) {
  const range = victim.signalRange || 800
  const visible = torchDist < range
  const signalOpacity = visible ? Math.min(1, 1.2 - torchDist / range) : 0

  if (victim.rescued) return null

  const sx = victim.x, sy = victim.y - 30

  switch (victim.signal) {
    case 'fire':
      return (<>
        {/* Fire glow — visible from very far */}
        <div style={{ position: 'absolute', left: sx - 20, top: sy - 20, width: 40, height: 40, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,146,60,0.5) 0%, rgba(239,68,68,0.2) 40%, transparent 70%)',
          animation: 'sos-pulse 1.5s ease-in-out infinite', opacity: signalOpacity,
          boxShadow: '0 0 30px rgba(251,146,60,0.4), 0 0 60px rgba(239,68,68,0.2)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: sx - 6, top: sy - 8, fontSize: 18,
          animation: 'flag-wave 0.6s ease-in-out infinite', opacity: signalOpacity,
          filter: 'drop-shadow(0 0 8px #f97316)', pointerEvents: 'none' }}>🔥</div>
      </>)
    case 'flashlight':
      return (
        <div style={{ position: 'absolute', left: sx - 8, top: sy - 8, width: 16, height: 16, borderRadius: '50%',
          background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0.6) 40%, transparent 70%)',
          animation: 'flashlight-flicker 2s ease-in-out infinite', opacity: signalOpacity,
          boxShadow: '0 0 16px #fff, 0 0 32px rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
      )
    case 'sos':
      return (<>
        <div style={{ position: 'absolute', left: sx - 14, top: sy - 20, background: 'rgba(239,68,68,0.9)',
          color: '#fff', padding: '3px 8px', borderRadius: 8, fontSize: 10, fontWeight: 900,
          animation: 'sos-pulse 1.2s ease-in-out infinite', opacity: signalOpacity,
          letterSpacing: 2, pointerEvents: 'none' }}>SOS</div>
        <div style={{ position: 'absolute', left: sx - 6, top: sy + 4, fontSize: 16,
          animation: 'sos-pulse 1.2s ease-in-out infinite', opacity: signalOpacity,
          pointerEvents: 'none' }}>🆘</div>
      </>)
    case 'flag':
      return (
        <div style={{ position: 'absolute', left: sx - 6, top: sy - 20, opacity: signalOpacity, pointerEvents: 'none' }}>
          <div style={{ width: 2, height: 22, background: '#78350f', margin: '0 auto' }} />
          <div style={{ width: 18, height: 10, background: '#ef4444', position: 'absolute', top: 0, left: 4,
            transformOrigin: 'left center', animation: 'flag-wave 1s ease-in-out infinite', borderRadius: '0 3px 3px 0' }} />
        </div>
      )
    case 'shout':
      return (<>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', left: sx - 20, top: sy - 20, width: 40, height: 40,
            borderRadius: '50%', border: '2px solid rgba(251,191,36,0.4)',
            animation: `shout-ring 2s ease-out ${i * 0.6}s infinite`, opacity: signalOpacity,
            pointerEvents: 'none'
          }} />
        ))}
        <div style={{ position: 'absolute', left: sx - 8, top: sy - 8, fontSize: 14, opacity: signalOpacity,
          pointerEvents: 'none' }}>📢</div>
      </>)
    case 'phone':
      return (
        <div style={{ position: 'absolute', left: sx - 5, top: sy - 5, width: 10, height: 10, borderRadius: '50%',
          background: '#fff', animation: 'phone-glow 2s ease-in-out infinite', opacity: signalOpacity,
          pointerEvents: 'none' }} />
      )
    default: return null
  }
}


// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function Module3_YardLockdown() {
  const { dispatch: gameDispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [victims, setVictims] = useState(VICTIMS_INIT.map(v => ({ ...v })))
  const [obstacles, setObstacles] = useState(OBSTACLES_INIT.map(o => ({ ...o })))
  const [timeLeft, setTimeLeft] = useState(TIMER_START)
  const [shockCount, setShockCount] = useState(0)
  const [result, setResult] = useState(null)
  const [interacting, setInteracting] = useState(null) // { type, id, start }
  const [interactProg, setInteractProg] = useState(0)
  const [rescueFlash, setRescueFlash] = useState(false)
  const [shockFlash, setShockFlash] = useState(false)
  const [rescueTip, setRescueTip] = useState(null)
  const [shockTip, setShockTip] = useState(false)
  const [onBoard, setOnBoard] = useState([])       // victim ids currently on raft
  const [delivered, setDelivered] = useState([])    // victim ids safely at shelter
  const [shelterFlash, setShelterFlash] = useState(false)
  const [raftFullMsg, setRaftFullMsg] = useState(false)

  const raftRef = useRef({ x: 60, y: 320, vx: 0, vy: 0, angle: 0 })
  const keysRef = useRef({})
  const cameraRef = useRef({ x: 0, y: 0 })
  const worldRef = useRef(null)
  const raftElRef = useRef(null)
  const torchElRef = useRef(null)
  const frameRef = useRef(null)
  const timerRef = useRef(null)
  const lastShockRef = useRef(0)
  const lastBeepRef = useRef(0)
  const victimsRef = useRef(victims)
  const obstaclesRef = useRef(obstacles)
  const interactRef = useRef(null)
  const onBoardRef = useRef(onBoard)
  const deliveredRef = useRef(delivered)

  useEffect(() => { victimsRef.current = victims }, [victims])
  useEffect(() => { obstaclesRef.current = obstacles }, [obstacles])
  useEffect(() => { interactRef.current = interacting }, [interacting])
  useEffect(() => { onBoardRef.current = onBoard }, [onBoard])
  useEffect(() => { deliveredRef.current = delivered }, [delivered])

  // Timer
  useEffect(() => {
    if (phase !== 'play') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          endGame(deliveredRef.current.length)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase]) // eslint-disable-line

  function endGame(deliveredCount) {
    const dc = deliveredCount !== undefined ? deliveredCount : deliveredRef.current.length
    const sc = shockCount
    const res = computeScore(dc, sc, timeLeft)
    setResult(res)
    gameDispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-3', result: { score: res.score, passed: res.passed } } })
    setPhase('result')
  }

  // Keyboard
  useEffect(() => {
    if (phase !== 'play') return
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
      if (key === 'e' || key === ' ') { k.interact = false; setInteracting(null); setInteractProg(0) }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); keysRef.current = {} }
  }, [phase])

  // Game loop
  useEffect(() => {
    if (phase !== 'play') return
    let prev = performance.now()

    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000); prev = now
      const r = raftRef.current, k = keysRef.current, cam = cameraRef.current

      // Input → acceleration
      let ax = 0, ay = 0
      if (k.left) ax -= RAFT_SPEED
      if (k.right) ax += RAFT_SPEED
      if (k.up) ay -= RAFT_SPEED
      if (k.down) ay += RAFT_SPEED

      // Normalize diagonal
      if (ax !== 0 && ay !== 0) { ax *= 0.707; ay *= 0.707 }

      r.vx += ax * dt; r.vy += ay * dt
      r.vx *= RAFT_DRAG; r.vy *= RAFT_DRAG

      // Angle toward velocity
      if (Math.abs(r.vx) > 5 || Math.abs(r.vy) > 5) {
        const targetAngle = Math.atan2(r.vy, r.vx) * (180 / Math.PI) + 90
        let diff = targetAngle - r.angle
        while (diff > 180) diff -= 360
        while (diff < -180) diff += 360
        r.angle += diff * 0.1
      }

      // Tentative position
      let nx = r.x + r.vx * dt, ny = r.y + r.vy * dt
      nx = Math.max(5, Math.min(MAP_W - RAFT_W - 5, nx))
      ny = Math.max(5, Math.min(MAP_H - RAFT_H - 5, ny))

      // Building collision
      for (const b of BUILDINGS) {
        if (rectCollide(nx, ny, RAFT_W, RAFT_H, b.x, b.y, b.w, b.h)) {
          nx = r.x; ny = r.y; r.vx *= -0.3; r.vy *= -0.3; break
        }
      }

      // Obstacle collision
      for (const o of obstaclesRef.current) {
        if (o.cleared) continue
        if (rectCollide(nx, ny, RAFT_W, RAFT_H, o.x, o.y, o.w, o.h)) {
          nx = r.x; ny = r.y; r.vx *= -0.2; r.vy *= -0.2; break
        }
      }

      // Pole collision
      for (const p of POLES) {
        if (dist(nx + RAFT_W / 2, ny + RAFT_H / 2, p.x, p.y) < 18) {
          nx = r.x; ny = r.y; r.vx *= -0.3; r.vy *= -0.3; break
        }
      }

      r.x = nx; r.y = ny

      // Hazard zone check
      const rcx = r.x + RAFT_W / 2, rcy = r.y + RAFT_H / 2
      for (const h of HAZARDS) {
        if (dist(rcx, rcy, h.x, h.y) < h.radius && now - lastShockRef.current > SHOCK_COOLDOWN) {
          lastShockRef.current = now
          setShockCount(c => c + 1)
          setShockFlash(true)
          setShockTip(true)
          playShockBuzz()
          setTimeout(() => setShockFlash(false), 500)
          setTimeout(() => setShockTip(false), 3000)
        }
      }

      // Proximity sound — beep gets faster/louder near victims
      const closestUnrescued = victimsRef.current.filter(v => !v.rescued)
        .map(v => ({ ...v, d: dist(rcx, rcy, v.x, v.y) }))
        .sort((a, b) => a.d - b.d)[0]
      if (closestUnrescued) {
        const maxRange = closestUnrescued.signalRange || 800
        if (closestUnrescued.d < maxRange) {
          const proximity = 1 - (closestUnrescued.d / maxRange) // 0 = far, 1 = on top
          const beepInterval = 800 - proximity * 650 // 800ms far → 150ms close
          if (now - lastBeepRef.current > beepInterval) {
            lastBeepRef.current = now
            playBeep(closestUnrescued.soundFreq || 500, proximity)
          }
        }
      }

      // Interact with E
      if (k.interact) {
        const ci = interactRef.current
        const curOnBoard = onBoardRef.current
        const curDelivered = deliveredRef.current

        // Check if near SHELTER to drop off passengers
        const shelterCx = SHELTER.x + SHELTER.w / 2, shelterCy = SHELTER.y + SHELTER.h / 2
        if (curOnBoard.length > 0 && dist(rcx, rcy, shelterCx, shelterCy) < SHELTER_RANGE) {
          if (!ci || ci.id !== 'shelter') {
            setInteracting({ type: 'dropoff', id: 'shelter', start: now })
          } else if (now - ci.start >= INTERACT_TIME) {
            // Drop off all onboard victims
            const newDelivered = [...curDelivered, ...curOnBoard]
            setDelivered(newDelivered)
            setOnBoard([])
            setInteracting(null); setInteractProg(0)
            setShelterFlash(true); setTimeout(() => setShelterFlash(false), 800)
            playRescueChime()
            setRescueTip({ name: `${curOnBoard.length} victim(s) delivered!`, tip: 'Always prioritize getting victims to safety shelters. NDMA recommends pre-identified safe zones in every neighborhood.', signal: 'shelter', injury: 'Safe delivery' })
            setTimeout(() => setRescueTip(null), 4000)
            k.interact = false
            if (newDelivered.length >= 5) { setTimeout(() => endGame(5), 800) }
          } else {
            setInteractProg((now - ci.start) / INTERACT_TIME)
          }
        }
        // Check nearby victim to board onto raft
        else {
          for (const v of victimsRef.current) {
            if (v.rescued) continue
            if (dist(rcx, rcy, v.x, v.y) < RESCUE_RANGE) {
              // Check boat capacity
              if (curOnBoard.length >= BOAT_CAPACITY) {
                setRaftFullMsg(true); setTimeout(() => setRaftFullMsg(false), 2000)
                k.interact = false; break
              }
              if (!ci || ci.id !== v.id) {
                setInteracting({ type: 'rescue', id: v.id, start: now })
              } else if (now - ci.start >= INTERACT_TIME) {
                // Victim boards raft
                setVictims(prev => prev.map(pv => pv.id === v.id ? { ...pv, rescued: true } : pv))
                setOnBoard(prev => [...prev, v.id])
                setInteracting(null); setInteractProg(0)
                setRescueFlash(true); setTimeout(() => setRescueFlash(false), 600)
                playRescueChime()
                const victimData = VICTIMS_INIT.find(vi => vi.id === v.id)
                if (victimData) {
                  setRescueTip({ name: victimData.name, tip: victimData.tip, signal: victimData.signal, injury: victimData.injury })
                  setTimeout(() => setRescueTip(null), 4500)
                }
                k.interact = false
              } else {
                setInteractProg((now - ci.start) / INTERACT_TIME)
              }
              break
            }
          }
        // Check nearby debris
        for (const o of obstaclesRef.current) {
          if (o.cleared || o.type === 'car') continue
          if (dist(rcx, rcy, o.x + o.w / 2, o.y + o.h / 2) < 60) {
            if (!ci || ci.id !== o.id) {
              setInteracting({ type: 'clear', id: o.id, start: now })
            } else if (now - ci.start >= DEBRIS_CLEAR_TIME) {
              setObstacles(prev => prev.map(po => po.id === o.id ? { ...po, cleared: true } : po))
              setInteracting(null); setInteractProg(0)
              k.interact = false
            } else {
              setInteractProg((now - ci.start) / DEBRIS_CLEAR_TIME)
            }
            break
          }
        }
        } // close else block
      }

      // Camera
      const vw = window.innerWidth, vh = window.innerHeight
      const tx = rcx - vw / 2, ty = rcy - vh / 2
      cam.x += (tx - cam.x) * CAM_LERP; cam.y += (ty - cam.y) * CAM_LERP
      cam.x = Math.max(0, Math.min(MAP_W - vw, cam.x))
      cam.y = Math.max(0, Math.min(MAP_H - vh, cam.y))

      if (worldRef.current) worldRef.current.style.transform = `translate(${-cam.x}px,${-cam.y}px)`
      if (raftElRef.current) {
        raftElRef.current.style.left = `${r.x}px`
        raftElRef.current.style.top = `${r.y}px`
        raftElRef.current.style.transform = `rotate(${r.angle}deg)`
      }
      // Torch follows raft in screen space
      if (torchElRef.current) {
        torchElRef.current.style.left = `${rcx - cam.x}px`
        torchElRef.current.style.top = `${rcy - cam.y}px`
      }

      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameRef.current)
  }, [phase]) // eslint-disable-line

  function retry() {
    setVictims(VICTIMS_INIT.map(v => ({ ...v })))
    setObstacles(OBSTACLES_INIT.map(o => ({ ...o })))
    setTimeLeft(TIMER_START); setShockCount(0); setResult(null)
    setInteracting(null); setInteractProg(0)
    setOnBoard([]); setDelivered([])
    raftRef.current = { x: 60, y: 320, vx: 0, vy: 0, angle: 0 }
    cameraRef.current = { x: 0, y: 0 }; keysRef.current = {}
    setPhase('intro')
  }

  const rescued = victims.filter(v => v.rescued).length

  // Find nearest target: if boat has passengers → shelter, else → nearest unrescued victim
  const shelterCx = SHELTER.x + SHELTER.w / 2, shelterCy = SHELTER.y + SHELTER.h / 2
  const shelterDist = dist(raftRef.current.x + RAFT_W / 2, raftRef.current.y + RAFT_H / 2, shelterCx, shelterCy)
  const nearestVictim = onBoard.length > 0
    ? { v: { x: shelterCx, y: shelterCy, rescued: false }, d: shelterDist, isShelter: true }
    : victims.filter(v => !v.rescued).reduce((best, v) => {
        const d = dist(raftRef.current.x + RAFT_W / 2, raftRef.current.y + RAFT_H / 2, v.x, v.y)
        return !best || d < best.d ? { v, d, isShelter: false } : best
      }, null)

  // ═══════════ INTRO ═══════════
  if (phase === 'intro') return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0a0a1a,#0d1b2a,#1b2838)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <style>{KEYFRAMES}</style>
      {/* Floating icons */}
      {['🔦','🌊','🚣','🏚️','⚡','🆘','📢','🪵','🚗','🌳'].map((e,i) => (
        <div key={i} style={{ position:'absolute', left:`${(i*11+4)%95}%`, top:`${(i*17+8)%80}%`, fontSize:36+(i%3)*8, opacity:0.08, animation:`bob ${3+i*0.3}s ease-in-out infinite` }}>{e}</div>
      ))}
      <div style={{ position:'relative', zIndex:1, maxWidth:640, width:'100%', background:'rgba(255,255,255,0.94)', borderRadius:28, padding:40, border:'4px solid #0f172a', boxShadow:'0 24px 60px rgba(0,0,0,0.5)', textAlign:'center' }}>
        <div style={{ fontSize:80, animation:'bob 2s ease-in-out infinite' }}>🔦</div>
        <div style={{ display:'inline-block', background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'#fff', padding:'6px 18px', borderRadius:999, fontWeight:800, fontSize:12, letterSpacing:2, animation:'pulse-ring 1.4s infinite', marginTop:4 }}>🌊 NIGHT RESCUE OPERATION</div>
        <h1 style={{ fontSize:32, fontWeight:900, margin:'14px 0 4px', color:'#0f172a' }}>Flood Rescue</h1>
        <div style={{ color:'#475569', fontSize:14, fontWeight:600, marginBottom:20 }}>NDMA · Search & Rescue Navigation</div>
        <p style={{ color:'#334155', fontSize:15, lineHeight:1.7, marginBottom:16 }}>
          Your raft is ready. The <strong>neighborhood is flooded</strong> and it's <strong>dark</strong>.
          Survivors are trapped in buildings, signaling for help.
          Navigate using your <strong>torch</strong>, avoid <strong>downed power lines</strong>, clear <strong>debris</strong>, and rescue <strong>5 victims</strong>.
        </p>
        <div style={{ background:'#f8fafc', border:'2px dashed #94a3b8', borderRadius:16, padding:16, textAlign:'left', marginBottom:22 }}>
          <div style={{ color:'#0f172a', fontSize:13, lineHeight:1.9, fontWeight:600 }}>
            <div>🔦 Use your torch to see in the dark</div>
            <div>🚣 Arrow keys / WASD to steer the raft</div>
            <div>🆘 Look for victim signals (lights, SOS, flags, shouting)</div>
            <div>⚡ Avoid sparking wire zones — they shock!</div>
            <div>🪵 Hold E near debris to clear the path</div>
            <div>👥 Hold E near a victim to board them (max 2)</div>
            <div>🏥 Bring victims to the SAFETY SHELTER (green building)</div>
            <div>🔄 Raft holds 2 — make multiple trips!</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={() => setPhase('play')} style={{ padding:'16px 40px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'#fff', fontWeight:900, fontSize:18, letterSpacing:1, cursor:'pointer', boxShadow:'0 10px 24px rgba(220,38,38,0.5)' }}>🚣 BEGIN RESCUE</button>
        </div>
        <div style={{ marginTop:12 }}><button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, cursor:'pointer' }}>← Back to Modules</button></div>
      </div>
    </div>
  )

  // ═══════════ GAMEPLAY ═══════════
  if (phase === 'play') {
    const r = raftRef.current
    const rcx = r.x + RAFT_W / 2, rcy = r.y + RAFT_H / 2

    return (
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#030810', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
        <style>{KEYFRAMES}</style>

        {/* World container */}
        <div ref={worldRef} style={{ position: 'absolute', width: MAP_W, height: MAP_H, willChange: 'transform' }}>
          {/* Water base */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#050b18,#081020,#0a1428)' }}>
            {/* Wave pattern */}
            {Array.from({ length: 80 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: (i * 131) % MAP_W, top: (i * 97 + 50) % MAP_H,
                width: 30 + (i % 4) * 10, height: 3, borderRadius: 2, background: 'rgba(37,99,235,0.06)',
                transform: `rotate(${(i * 17) % 30 - 15}deg)`,
              }} />
            ))}
          </div>

          {/* Buildings */}
          {BUILDINGS.map((b, i) => (
            <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h }}>
              {/* Base */}
              <div style={{ position: 'absolute', inset: 0, background: b.color, border: '2px solid #252540', borderRadius: 3, boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.4)' }}>
                {/* Roof */}
                <div style={{ position: 'absolute', top: -6, left: -3, right: -3, height: 10, background: b.roof, borderRadius: '3px 3px 0 0', border: '1px solid #3a3060' }} />
                {/* Windows */}
                {Array.from({ length: Math.floor(b.w / 35) }).map((_, wi) => (
                  <div key={wi} style={{ position: 'absolute', left: 12 + wi * 34, top: 18, width: 14, height: 14, background: 'rgba(10,10,20,0.8)', border: '1px solid #2a2a40', borderRadius: 1 }} />
                ))}
                {/* Flood line */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(transparent, rgba(30,64,175,0.15))', borderRadius: '0 0 3px 3px' }} />
              </div>
            </div>
          ))}

          {/* Poles */}
          {POLES.map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: p.x - 3, top: p.y - 20, width: 6, height: 24, background: 'linear-gradient(180deg,#3a3020,#1a1510)', borderRadius: 2, border: '1px solid #2a2010' }} />
          ))}

          {/* Obstacles */}
          {obstacles.filter(o => !o.cleared).map(o => (
            <div key={o.id} style={{ position: 'absolute', left: o.x, top: o.y, width: o.w, height: o.h, display: 'flex', alignItems: 'center', justifyContent: 'center', background: o.type === 'car' ? 'rgba(100,100,120,0.3)' : 'rgba(80,60,30,0.3)', border: `2px solid ${o.type === 'car' ? '#4b5563' : '#78350f'}`, borderRadius: o.type === 'tree' ? '50%' : 4, fontSize: o.type === 'tree' ? 28 : 22 }}>
              {o.emoji}
            </div>
          ))}

          {/* Electrical hazard zones */}
          {HAZARDS.map(h => (
            <SparkParticles key={h.id} x={h.x} y={h.y} radius={h.radius} />
          ))}
          {/* Hazard wires */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: MAP_W, height: MAP_H, pointerEvents: 'none' }}>
            {HAZARDS.map(h => (
              <g key={`w${h.id}`}>
                <line x1={h.wireX1} y1={h.wireY1} x2={h.wireX2} y2={h.wireY2}
                  stroke="#fbbf24" strokeWidth={2} strokeDasharray="8,6" opacity={0.6}
                  style={{ animation: 'wire-glow 1.5s ease-in-out infinite' }} />
                {/* Ground contact point */}
                <circle cx={h.x} cy={h.y} r={4} fill="#fbbf24" opacity={0.8}>
                  <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.5s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}
          </svg>

          {/* Victim signals */}
          {victims.map(v => (
            <VictimSignal key={v.id} victim={v} torchDist={dist(rcx, rcy, v.x, v.y)} />
          ))}

          {/* Victim markers (bodies near buildings) */}
          {victims.filter(v => !v.rescued).map(v => (
            <div key={`vm${v.id}`} style={{ position: 'absolute', left: v.x - 8, top: v.y - 8, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              👤
            </div>
          ))}

          {/* Safety Shelter */}
          <div style={{ position: 'absolute', left: SHELTER.x, top: SHELTER.y, width: SHELTER.w, height: SHELTER.h, zIndex: 15 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#065f46,#047857)', border: `3px solid ${shelterFlash ? '#fff' : '#22c55e'}`, borderRadius: 8, boxShadow: `0 0 30px rgba(34,197,94,0.3), 0 0 60px rgba(34,197,94,0.1)${shelterFlash ? ', 0 0 80px rgba(255,255,255,0.5)' : ''}` }}>
              <div style={{ position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)', whiteSpace:'nowrap', color:'#22c55e', fontSize:10, fontWeight:800, letterSpacing:1, textShadow:'0 0 8px rgba(34,197,94,0.5)', animation: onBoard.length > 0 ? 'sos-pulse 1.5s infinite' : 'none' }}>🏥 SAFETY SHELTER</div>
              <div style={{ position:'absolute', top:8, left:'50%', transform:'translateX(-50%)', fontSize:28 }}>🏥</div>
              <div style={{ position:'absolute', bottom:8, left:'50%', transform:'translateX(-50)', color:'#d1fae5', fontSize:10, fontWeight:700 }}>{delivered.length}/5</div>
              {/* Delivered victim icons */}
              <div style={{ position:'absolute', bottom:-18, left:0, display:'flex', gap:2 }}>
                {delivered.map((vid,i) => <span key={i} style={{ fontSize:10 }}>✅</span>)}
              </div>
            </div>
            {/* Pulsing ring when onBoard > 0 */}
            {onBoard.length > 0 && (
              <div style={{ position:'absolute', inset:-10, borderRadius:12, border:'2px solid rgba(34,197,94,0.4)', animation:'shout-ring 2s ease-out infinite', pointerEvents:'none' }}/>
            )}
          </div>

          {/* Raft */}
          <div ref={raftElRef} style={{ position: 'absolute', width: RAFT_W, height: RAFT_H, zIndex: 20, left: 60, top: 320, transformOrigin: 'center center' }}>
            {/* Wake trail */}
            <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 16, height: 8, borderRadius: '50%', background: 'rgba(147,197,253,0.15)', animation: 'wake 1s ease-out infinite' }} />
            {/* Raft body */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{ flex: 1, background: `linear-gradient(90deg,#5c3d1e,#8B5A2B,#5c3d1e)`, borderRadius: 2, border: '1px solid #3a2010' }} />
              ))}
            </div>
            {/* Paddle */}
            <div style={{ position: 'absolute', left: -8, top: '35%', width: RAFT_W + 16, height: 3, background: '#78350f', borderRadius: 2, transform: 'rotate(0deg)' }} />
            {/* Person */}
            <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', border: '1px solid #78350f', margin: '0 auto' }} />
              <div style={{ width: 10, height: 8, background: '#ea580c', borderRadius: '2px 2px 0 0', margin: '0 auto' }} />
            </div>
            {/* Passengers on raft */}
            {onBoard.length > 0 && (
              <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', display:'flex', gap:1 }}>
                {onBoard.map((_,i) => (
                  <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#86efac', border:'1px solid #166534' }}/>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TORCH / DARKNESS MASK — fixed overlay */}
        <div ref={torchElRef} style={{
          position: 'fixed', width: 0, height: 0, zIndex: 30, pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', left: -MAP_W, top: -MAP_H, width: MAP_W * 2, height: MAP_H * 2,
            background: `radial-gradient(circle ${TORCH_RADIUS}px at center, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.7) 60%, rgba(2,4,10,0.92) 80%, rgba(2,4,10,0.97) 100%)`,
          }} />
        </div>

        {/* Rescue flash */}
        {rescueFlash && <div style={{ position: 'fixed', inset: 0, zIndex: 35, animation: 'rescue-flash 0.6s ease-out forwards', pointerEvents: 'none' }} />}
        {/* Shock flash */}
        {shockFlash && <div style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(251,191,36,0.25)', pointerEvents: 'none' }} />}

        {/* HUD */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, padding: '8px 14px', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(8px)', borderBottom: '2px solid rgba(220,38,38,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>🔦 RESCUE</div>
            <div style={{ color: '#86efac', fontSize: 11, fontWeight: 700, background:'rgba(34,197,94,0.1)', padding:'3px 8px', borderRadius:999, border:'1px solid rgba(34,197,94,0.3)' }}>🚣 {onBoard.length}/{BOAT_CAPACITY}</div>
            <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 900 }}>🏥 {delivered.length}<span style={{ color: '#64748b', fontWeight: 400 }}>/5</span></div>
          </div>

          {/* Compass to nearest victim / shelter */}
          {nearestVictim && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: nearestVictim.isShelter ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.1)', padding: '4px 10px', borderRadius: 999, border: `1px solid ${nearestVictim.isShelter ? 'rgba(34,197,94,0.4)' : 'rgba(251,191,36,0.3)'}` }}>
              <span style={{ fontSize: 14, animation: 'compassPulse 2s ease-in-out infinite',
                transform: `rotate(${Math.atan2(nearestVictim.v.y - rcy, nearestVictim.v.x - rcx) * 180 / Math.PI - 90}deg)`,
                display: 'inline-block' }}>🧭</span>
              <span style={{ color: nearestVictim.isShelter ? '#22c55e' : '#fbbf24', fontSize: 10, fontWeight: 700 }}>
                {nearestVictim.isShelter ? '🏥 SHELTER' : `👤 ${Math.round(nearestVictim.d)}m`}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {shockCount > 0 && <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700 }}>⚡ {shockCount}</div>}
            <div style={{ fontSize: 18, fontWeight: 900, color: timeLeft <= 30 ? '#ef4444' : timeLeft <= 60 ? '#f59e0b' : '#10b981', padding: '2px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: `2px solid ${timeLeft <= 30 ? '#ef4444' : timeLeft <= 60 ? '#f59e0b' : '#10b981'}` }}>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
          </div>
        </div>

        {/* Raft full warning */}
        {raftFullMsg && (
          <div style={{ position:'fixed', top:56, left:'50%', transform:'translateX(-50%)', zIndex:45, background:'rgba(120,53,15,0.95)', border:'2px solid #fbbf24', borderRadius:14, padding:'10px 18px', color:'#fef3c7', fontWeight:700, fontSize:12, animation:'fadeIn 0.2s ease-out' }}>
            ⚠️ RAFT FULL ({BOAT_CAPACITY}/{BOAT_CAPACITY}) — Head to 🏥 Safety Shelter to drop off!
          </div>
        )}

        {/* Interaction progress bar */}
        {interacting && interactProg > 0 && (
          <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 40, width: 160, background: 'rgba(5,10,20,0.9)', borderRadius: 10, padding: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>{interacting.type === 'rescue' ? '🆘 BOARDING...' : interacting.type === 'dropoff' ? '🏥 DELIVERING...' : '🪵 CLEARING...'}</div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, width: `${interactProg * 100}%`, background: interacting.type === 'rescue' ? '#22c55e' : '#f59e0b', transition: 'width 0.1s' }} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 40, display: 'flex', gap: 8, background: 'rgba(5,10,20,0.85)', padding: '5px 14px', borderRadius: 10, fontSize: 10, color: '#64748b', fontWeight: 600 }}>
          <span>↑←↓→ Move</span><span>·</span><span>E/Space Interact</span>
        </div>

        {/* Rescue Tip Popup */}
        {rescueTip && (
          <div style={{ position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 45, width: 340, background: 'rgba(5,46,22,0.95)', border: '2px solid #22c55e', borderRadius: 16, padding: '14px 18px', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>✅</span>
              <div>
                <div style={{ color: '#22c55e', fontWeight: 800, fontSize: 13 }}>RESCUED: {rescueTip.name}</div>
                <div style={{ color: '#86efac', fontSize: 10 }}>{rescueTip.injury} · Signal: {rescueTip.signal.toUpperCase()}</div>
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: 8, padding: '8px 10px', borderLeft: '3px solid #22c55e' }}>
              <div style={{ color: '#bbf7d0', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>💡 NDMA TIP</div>
              <div style={{ color: '#d1fae5', fontSize: 11, lineHeight: 1.5 }}>{rescueTip.tip}</div>
            </div>
          </div>
        )}

        {/* Shock Warning Popup */}
        {shockTip && (
          <div style={{ position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: 45, width: 320, background: 'rgba(69,10,10,0.95)', border: '2px solid #fbbf24', borderRadius: 16, padding: '12px 16px', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>⚡</span>
              <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: 13 }}>ELECTROCUTION HAZARD!</div>
            </div>
            <div style={{ background: 'rgba(251,191,36,0.08)', borderRadius: 8, padding: '8px 10px', borderLeft: '3px solid #fbbf24' }}>
              <div style={{ color: '#fef3c7', fontSize: 11, lineHeight: 1.5 }}>
                ⚠ <strong>NDMA Warning:</strong> Downed power lines energize floodwater up to 200m away. Never approach sparking wires. Report to authorities immediately.
              </div>
            </div>
          </div>
        )}

        {/* Minimap */}
        <div style={{ position: 'fixed', bottom: 50, right: 10, zIndex: 40, width: 120, height: 120, background: 'rgba(5,10,20,0.85)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', padding: 4 }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Buildings on minimap */}
            {BUILDINGS.map((b, i) => (
              <div key={i} style={{ position: 'absolute', left: `${(b.x / MAP_W) * 100}%`, top: `${(b.y / MAP_H) * 100}%`, width: `${(b.w / MAP_W) * 100}%`, height: `${(b.h / MAP_H) * 100}%`, background: '#1a1a2e', borderRadius: 1 }} />
            ))}
            {/* Hazards */}
            {HAZARDS.map(h => (
              <div key={h.id} style={{ position: 'absolute', left: `${(h.x / MAP_W) * 100}%`, top: `${(h.y / MAP_H) * 100}%`, width: 3, height: 3, borderRadius: '50%', background: '#fbbf24' }} />
            ))}
            {/* Unrescued victims */}
            {victims.filter(v => !v.rescued).map(v => (
              <div key={v.id} style={{ position: 'absolute', left: `${(v.x / MAP_W) * 100}%`, top: `${(v.y / MAP_H) * 100}%`, width: 4, height: 4, borderRadius: '50%', background: '#ef4444', animation: 'sos-pulse 2s infinite' }} />
            ))}
            {/* Shelter on minimap */}
            <div style={{ position: 'absolute', left: `${(SHELTER.x / MAP_W) * 100}%`, top: `${(SHELTER.y / MAP_H) * 100}%`, width: `${(SHELTER.w / MAP_W) * 100}%`, height: `${(SHELTER.h / MAP_H) * 100}%`, background: '#22c55e', borderRadius: 1, opacity: 0.6 }} />
            {/* Raft position */}
            <div style={{ position: 'absolute', left: `${(r.x / MAP_W) * 100}%`, top: `${(r.y / MAP_H) * 100}%`, width: 5, height: 5, borderRadius: '50%', background: '#22c55e', border: '1px solid #fff', zIndex: 1 }} />
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ RESULT ═══════════
  if (phase === 'result' && result) {
    const sc = result.passed ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ position:'fixed', inset:0, zIndex:100, background: result.passed ? 'linear-gradient(135deg,#064e3b,#065f46,#047857)' : 'linear-gradient(135deg,#450a0a,#7f1d1d,#991b1b)', overflowY:'auto', width:'100%' }}>
        <style>{KEYFRAMES}</style>
        <div style={{ maxWidth: 680, width:'100%', margin: '0 auto', padding:'24px 16px 40px' }}>

          {/* Score Card */}
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding:'28px 24px', border: '3px solid #0f172a', boxShadow: '0 20px 50px rgba(0,0,0,0.4)', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 60, animation: 'bob 2s ease-in-out infinite' }}>{result.passed ? '🏆' : '💀'}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: sc, letterSpacing: 1, marginTop: 4 }}>{result.headline}</div>
            <div style={{ marginTop: 10, fontSize: 56, fontWeight: 900, color: sc }}>{result.score}<span style={{ fontSize: 22, color: '#94a3b8' }}>/100</span></div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <span style={{ background: '#f0fdf4', color: '#166534', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>👥 {result.rescued}/5 rescued</span>
              <span style={{ background: result.shockCount === 0 ? '#f0fdf4' : '#fef2f2', color: result.shockCount === 0 ? '#166534' : '#991b1b', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>⚡ {result.shockCount} shocks</span>
              {result.noShockBonus > 0 && <span style={{ background: '#eff6ff', color: '#1e40af', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>🛡️ +{result.noShockBonus}</span>}
              {result.allRescuedBonus > 0 && <span style={{ background: '#fefce8', color: '#854d0e', padding: '3px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>🏆 +{result.allRescuedBonus}</span>}
            </div>
          </div>

          {/* Rescue Report */}
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding:'20px 20px', border: '3px solid #0f172a', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10, textAlign:'center' }}>📋 Rescue Report</div>
            <div style={{ display: 'flex', flexDirection:'column', gap: 8 }}>
              {VICTIMS_INIT.map(v => {
                const wasRescued = victims.find(vv => vv.id === v.id)?.rescued
                return (
                  <div key={v.id} style={{ padding: 12, borderRadius: 12, background: wasRescued ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1.5px solid ${wasRescued ? '#22c55e' : '#ef4444'}`, display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ fontSize:20, flexShrink:0, marginTop:2 }}>{wasRescued ? '✅' : '❌'}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: wasRescued ? '#065f46' : '#991b1b' }}>{v.name}, {v.age}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{v.injury} · Signal: {v.signal.toUpperCase()}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, fontStyle: 'italic', lineHeight:1.5, background:'rgba(0,0,0,0.03)', padding:'4px 8px', borderRadius:6 }}>💡 {v.tip}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ═══ NDMA DISASTER LEARNING ═══ */}

          {/* Signal Effectiveness Chart */}
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding:'20px 20px', border: '3px solid #0f172a', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 6, textAlign:'center' }}>📡 Signal Effectiveness — NDMA Guide</div>
            <div style={{ fontSize:11, color:'#64748b', textAlign:'center', marginBottom:12 }}>How far each distress signal can be detected during floods</div>
            {[
              { signal:'🔥 Fire / Bonfire', range:2000, rangeTxt:'Visible up to 5+ km at night', eff:100, color:'#f97316', note:'Most effective night signal. Use dry materials if available. Keep it burning.' },
              { signal:'🚩 Bright Flag', range:1200, rangeTxt:'Visible up to 2 km (air + boat)', eff:75, color:'#ef4444', note:'Use bright colors (red, orange). Tie to highest point. Effective for helicopters.' },
              { signal:'🔦 Flashlight / Torch', range:900, rangeTxt:'Visible up to 1 km at night', eff:60, color:'#fbbf24', note:'Flash in SOS pattern (3 short, 3 long, 3 short). Conserve battery.' },
              { signal:'🆘 Mirror / SOS', range:800, rangeTxt:'Up to 10 km in daylight', eff:55, color:'#3b82f6', note:'Mirror reflects sunlight. Best in daytime. At night, use torch in SOS pattern.' },
              { signal:'📢 Shouting / Whistle', range:500, rangeTxt:'Only 200-500m range', eff:30, color:'#8b5cf6', note:'Save energy — shouting exhausts quickly. Whistle carries 3x farther than voice.' },
            ].map((s,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, padding:'8px 10px', background:'rgba(0,0,0,0.02)', borderRadius:10 }}>
                <div style={{ width:110, flexShrink:0, fontWeight:700, fontSize:12, color:'#1e293b' }}>{s.signal}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <div style={{ flex:1, height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${s.eff}%`, background:s.color, borderRadius:4 }}/>
                    </div>
                    <span style={{ fontSize:10, color: s.color, fontWeight:700, minWidth:30 }}>{s.eff}%</span>
                  </div>
                  <div style={{ fontSize:9, color:'#64748b' }}>{s.rangeTxt}</div>
                  <div style={{ fontSize:9, color:'#94a3b8', marginTop:1, fontStyle:'italic' }}>{s.note}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Flood Rescue Dos & Don'ts */}
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding:'20px 20px', border: '3px solid #0f172a', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 12, textAlign:'center' }}>⚠️ Flood Rescue — NDMA Safety Guidelines</div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:11, color:'#166534', marginBottom:6, letterSpacing:1 }}>✅ DO's</div>
                {[
                  'Stay away from downed power lines — water conducts electricity',
                  'Move to higher ground when rescue isn\'t immediate',
                  'Use bright signals (fire, flags) to attract rescuers',
                  'Wear a life jacket or improvised flotation device',
                  'Keep emergency whistle ready — carries farther than voice',
                  'Prioritize elderly, children, and injured victims',
                  'Mark rescued buildings to avoid re-checking',
                  'Navigate slowly to avoid hidden submerged hazards',
                ].map((d,i) => (
                  <div key={i} style={{ fontSize:10, color:'#334155', marginBottom:5, paddingLeft:12, position:'relative', lineHeight:1.5 }}>
                    <span style={{ position:'absolute', left:0, color:'#22c55e', fontWeight:700 }}>✓</span>{d}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:11, color:'#991b1b', marginBottom:6, letterSpacing:1 }}>❌ DON'Ts</div>
                {[
                  'Never drive or walk through flowing floodwater',
                  'Don\'t touch metal objects in flooded areas (shock risk)',
                  'Don\'t enter buildings with water above knee level',
                  'Avoid areas with visible sparking or downed wires',
                  'Don\'t overload the rescue raft beyond capacity',
                  'Don\'t consume floodwater — it\'s contaminated',
                  'Don\'t ignore small signals — victims may be weak',
                  'Don\'t attempt rescue in fast-moving current alone',
                ].map((d,i) => (
                  <div key={i} style={{ fontSize:10, color:'#334155', marginBottom:5, paddingLeft:12, position:'relative', lineHeight:1.5 }}>
                    <span style={{ position:'absolute', left:0, color:'#ef4444', fontWeight:700 }}>✗</span>{d}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Facts */}
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: 24, padding:'20px 20px', border: '3px solid #0f172a', marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', marginBottom: 10, textAlign:'center' }}>📊 Did You Know? — Flood Rescue Facts</div>
            {[
              { fact: '6 inches of moving water can knock an adult off their feet. 2 feet can float a car.', source: 'NDMA India' },
              { fact: 'Electrocution is the #2 cause of flood deaths after drowning. Downed power lines energize water up to 200 meters away.', source: 'WHO / NDMA' },
              { fact: 'The "Golden Hour" in flood rescue: victims\' survival rate drops 50% after the first 6 hours of being stranded.', source: 'NDRF India' },
              { fact: 'India experiences an average of 8 major flood events per year, affecting over 75 million people annually.', source: 'NDMA India Report' },
              { fact: 'A whistle can be heard up to 1.6 km away. Shouting carries only 200-300m. Always keep a whistle in your go-bag.', source: 'NDMA Preparedness Guide' },
            ].map((f,i) => (
              <div key={i} style={{ padding:'8px 12px', marginBottom:6, background:'rgba(37,99,235,0.04)', borderRadius:10, borderLeft:'3px solid #3b82f6' }}>
                <div style={{ fontSize:11, color:'#1e293b', lineHeight:1.6 }}>{f.fact}</div>
                <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>— {f.source}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom:20 }}>
            <button onClick={retry} style={{ padding: '12px 28px', borderRadius: 999, background: '#fff', color: '#0f172a', border: '2px solid #0f172a', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>🔄 Try Again</button>
            <button onClick={() => gameDispatch({ type: 'BACK_TO_MODULES' })} style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: 'linear-gradient(135deg,#1e40af,#1d4ed8)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>← Back to Modules</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
