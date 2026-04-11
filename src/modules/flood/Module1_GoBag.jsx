/**
 * Module 1 — The Go-Bag: Multi-Room 3D House Game
 * 4 rooms (Kitchen, Bathroom, Bedroom, Garage) with detailed human character.
 * Items organized by room. Character walks between rooms to grab items.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Html, ContactShadows, RoundedBox, Sparkles, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGame } from '../../context/GameContext'

/* ═══════════════════════════════════════════════════════════════════════
   HOUSE LAYOUT — 4 rooms in 2×2 grid
   Kitchen(+x,-z)  Bedroom(-x,-z)
   Garage(+x,+z)   Bathroom(-x,+z)
   Each room ~5×5, hallway cross in the middle
   ═══════════════════════════════════════════════════════════════════════ */
const R = 5.5 // room half-offset from center

// Items organized by room with 3D positions relative to house
const ITEMS = [
  // ── KITCHEN (top-right: +x, -z) — Water + Food ────────────────────
  { id:'w3', name:'LifeStraw',      emoji:'💧', cat:'W', wt:0.10, util:96, trap:false, room:'Kitchen',   pos:[R+1.5, 1.8, -R-1.5], sz:0.14, color:'#3b82f6' },
  { id:'w4', name:'Aquatabs',       emoji:'💊', cat:'W', wt:0.05, util:88, trap:false, room:'Kitchen',   pos:[R+0.5, 1.8, -R-2.0], sz:0.11, color:'#60a5fa' },
  { id:'w5', name:'Sawyer Filter',  emoji:'🔩', cat:'W', wt:0.25, util:92, trap:false, room:'Kitchen',   pos:[R+2.0, 1.0, -R-0.5], sz:0.14, color:'#2563eb' },
  { id:'f3', name:'Energy Bars',    emoji:'🍫', cat:'F', wt:0.75, util:74, trap:false, room:'Kitchen',   pos:[R+0.0, 1.0, -R-1.0], sz:0.14, color:'#92400e' },
  { id:'f4', name:'Freeze-Dried',   emoji:'🍱', cat:'F', wt:0.90, util:85, trap:false, room:'Kitchen',   pos:[R+1.0, 1.0, -R+0.5], sz:0.16, color:'#b45309' },
  { id:'w1', name:'Water Jug 1gal', emoji:'🪣', cat:'W', wt:8.34, util:22, trap:true,  room:'Kitchen',   pos:[R+0.5, 0.30,-R+1.0], sz:0.38, color:'#1d4ed8' },
  { id:'w2', name:'Water Jugs 2gal',emoji:'🪣', cat:'W', wt:16.68,util:30, trap:true,  room:'Kitchen',   pos:[R+2.0, 0.35,-R+1.5], sz:0.48, color:'#1e40af' },
  { id:'f1', name:'Canned Beans ×6',emoji:'🥫', cat:'F', wt:9.00, util:32, trap:true,  room:'Kitchen',   pos:[R-0.5, 0.28,-R+0.5], sz:0.36, color:'#b91c1c' },

  // ── BATHROOM (bottom-left: -x, +z) — Medical ──────────────────────
  { id:'m2', name:'IFAK Kit',       emoji:'🩹', cat:'M', wt:0.75, util:90, trap:false, room:'Bathroom',  pos:[-R-1.5, 1.6, R+1.5],  sz:0.17, color:'#ef4444' },
  { id:'m3', name:'Medications',    emoji:'💊', cat:'M', wt:0.30, util:96, trap:false, room:'Bathroom',  pos:[-R-0.5, 1.6, R+2.0],  sz:0.12, color:'#f87171' },
  { id:'m4', name:'N95 Masks',      emoji:'😷', cat:'M', wt:0.20, util:72, trap:false, room:'Bathroom',  pos:[-R-2.0, 1.6, R+0.5],  sz:0.12, color:'#fca5a5' },
  { id:'m1', name:'Full First Aid', emoji:'🏥', cat:'M', wt:3.50, util:52, trap:true,  room:'Bathroom',  pos:[-R-1.0, 0.28,R+0.5],  sz:0.30, color:'#dc2626' },

  // ── BEDROOM (top-left: -x, -z) — Shelter + Comms + Nav ────────────
  { id:'s2', name:'Bivvy Sack',     emoji:'🌡️', cat:'S', wt:0.50, util:84, trap:false, room:'Bedroom',   pos:[-R-1.5, 0.6, -R-1.5], sz:0.16, color:'#f97316' },
  { id:'s3', name:'Tarp 8×10',      emoji:'🏕️', cat:'S', wt:1.00, util:80, trap:false, room:'Bedroom',   pos:[-R-2.0, 0.6, -R+0.0], sz:0.17, color:'#84cc16' },
  { id:'c1', name:'NOAA Radio',     emoji:'📻', cat:'C', wt:0.85, util:84, trap:false, room:'Bedroom',   pos:[-R-0.5, 1.0, -R-2.0], sz:0.17, color:'#eab308' },
  { id:'c3', name:'Sat Messenger',  emoji:'🛰️', cat:'C', wt:0.35, util:92, trap:false, room:'Bedroom',   pos:[-R+0.5, 1.0, -R-1.5], sz:0.12, color:'#a855f7' },
  { id:'n1', name:'Map+Compass',    emoji:'🗺️', cat:'N', wt:0.20, util:96, trap:false, room:'Bedroom',   pos:[-R-1.0, 1.0, -R-0.5], sz:0.14, color:'#d97706' },
  { id:'s1', name:'Family Tent',    emoji:'⛺', cat:'S', wt:18.0, util:18, trap:true,  room:'Bedroom',   pos:[-R+0.5, 0.35,-R+1.0], sz:0.55, color:'#15803d' },

  // ── GARAGE (bottom-right: +x, +z) — Tools ─────────────────────────
  { id:'t2', name:'Leatherman',     emoji:'🔪', cat:'T', wt:0.55, util:90, trap:false, room:'Garage',    pos:[R+1.5, 1.2, R+1.5],   sz:0.14, color:'#94a3b8' },
  { id:'t3', name:'Paracord',       emoji:'🪢', cat:'T', wt:0.40, util:76, trap:false, room:'Garage',    pos:[R+0.5, 1.2, R+2.0],   sz:0.12, color:'#a3a3a3' },
  { id:'t4', name:'Firestarter',    emoji:'🔥', cat:'T', wt:0.15, util:80, trap:false, room:'Garage',    pos:[R+2.0, 1.2, R+0.5],   sz:0.11, color:'#f59e0b' },
  { id:'t5', name:'Glass Breaker',  emoji:'🔨', cat:'T', wt:0.08, util:72, trap:false, room:'Garage',    pos:[R+1.0, 1.2, R+0.5],   sz:0.10, color:'#6b7280' },
  { id:'p3', name:'Headlamp',       emoji:'💡', cat:'T', wt:0.35, util:82, trap:false, room:'Garage',    pos:[R-0.5, 1.2, R+1.0],   sz:0.12, color:'#facc15' },
  { id:'t1', name:'Mechanic Toolkit',emoji:'🧰',cat:'T', wt:15.0, util:12, trap:true,  room:'Garage',    pos:[R+1.0, 0.30,R+2.0],   sz:0.48, color:'#475569' },
]

const WEIGHT_LIMIT = 25, TIMER = 60, ESSENTIAL_IDS = ['w3','m2','t2','n1']

function computeScore(bag) {
  const wt = bag.reduce((s,i)=>s+i.wt,0)
  if (wt>WEIGHT_LIMIT) return {score:Math.max(5,35-Math.round((wt-WEIGHT_LIMIT)*2)),passed:false,msg:`TOO HEAVY (${wt.toFixed(1)} lbs)!`}
  if (!bag.some(i=>['w3','w4','w5'].includes(i.id))) return {score:15,passed:false,msg:'No water solution!'}
  if (!bag.some(i=>i.cat==='M')) return {score:25,passed:false,msg:'No medical supplies!'}
  if (!bag.some(i=>i.cat==='N')) return {score:30,passed:false,msg:'No navigation!'}
  const avgU=Math.round(bag.reduce((s,i)=>s+i.util,0)/bag.length)
  const mob=Math.round(((WEIGHT_LIMIT-wt)/WEIGHT_LIMIT)*100)
  const ess=ESSENTIAL_IDS.every(id=>bag.some(i=>i.id===id))?15:0
  const pen=bag.filter(i=>i.trap).length*5
  const t=Math.min(100,Math.max(40,Math.round(avgU*0.35+mob*0.3+ess*1.5-pen)))
  return {score:t,passed:t>=55,msg:t>=55?`Smart loadout! ${wt.toFixed(1)} lbs.`:`Score ${t}. Heavy items hurt.`}
}

/* ═══════════════════════════════════════════════════════════════════════
   DETAILED HUMAN CHARACTER
   Proper proportions: ~1.4m tall, articulated limbs, face detail,
   hoodie, jeans, sneakers, hair with volume, idle breathing.
   ═══════════════════════════════════════════════════════════════════════ */
function HumanCharacter({ target, onArrived, bagCount }) {
  const group = useRef()
  const lArm = useRef(), rArm = useRef(), lLeg = useRef(), rLeg = useRef()
  const tgt = useRef(null), done = useRef(false), wt = useRef(0), moving = useRef(false)
  const breathT = useRef(0)

  useEffect(() => { if(target){tgt.current=new THREE.Vector3(target[0],0,target[2]);done.current=false;moving.current=true} },[target])

  useFrame((_,dt) => {
    if(!group.current) return
    const g = group.current
    breathT.current += dt

    if(tgt.current && !done.current) {
      const dir = new THREE.Vector3().subVectors(tgt.current, g.position); dir.y=0
      const dist = dir.length()
      if(dist<0.35){ done.current=true;tgt.current=null;moving.current=false;onArrived();return }
      const step=Math.min(4.0*dt,dist); dir.normalize().multiplyScalar(step); g.position.add(dir)
      g.rotation.y = Math.atan2(dir.x,dir.z)
      wt.current += dt*14
    } else { wt.current *= 0.92 }

    // Limb swing
    const sw = Math.sin(wt.current) * (moving.current ? 0.7 : 0)
    if(lArm.current) lArm.current.rotation.x = sw
    if(rArm.current) rArm.current.rotation.x = -sw
    if(lLeg.current) lLeg.current.rotation.x = -sw*0.7
    if(rLeg.current) rLeg.current.rotation.x = sw*0.7

    // Idle breathing
    const breath = Math.sin(breathT.current*2)*0.008
    g.children[0].position.y = 0.72 + (moving.current ? Math.abs(Math.sin(wt.current*2))*0.03 : breath)
  })

  const bp = Math.min(1.4, 0.4+bagCount*0.09)
  const skin = '#F4C7A1', hair = '#3d1f00', hoodie = '#2563eb', jeans = '#1e3a5f', shoe = '#3d2b1f'

  return (
    <group ref={group} position={[0,0,0]}>
      {/* ── TORSO (hoodie) ── */}
      <mesh position={[0,0.72,0]} castShadow>
        <capsuleGeometry args={[0.16,0.32,8,16]} />
        <meshStandardMaterial color={hoodie} roughness={0.7} />
      </mesh>
      {/* Hoodie pocket */}
      <mesh position={[0,0.58,0.14]}>
        <boxGeometry args={[0.22,0.08,0.02]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      {/* Hoodie zipper line */}
      <mesh position={[0,0.72,0.155]}>
        <boxGeometry args={[0.015,0.32,0.005]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>

      {/* ── HEAD ── */}
      <group position={[0,1.12,0]}>
        {/* Skull - slightly elongated */}
        <mesh castShadow>
          <sphereGeometry args={[0.15,16,16]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>
        {/* Hair - volume on top */}
        <mesh position={[0,0.06,-0.02]}>
          <sphereGeometry args={[0.155,16,12,0,Math.PI*2,0,Math.PI*0.55]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
        {/* Hair sides */}
        <mesh position={[-0.12,0.02,-0.05]}><sphereGeometry args={[0.06,8,8]} /><meshStandardMaterial color={hair} /></mesh>
        <mesh position={[0.12,0.02,-0.05]}><sphereGeometry args={[0.06,8,8]} /><meshStandardMaterial color={hair} /></mesh>
        {/* Eyes - whites */}
        <mesh position={[-0.05,0.02,0.13]}><sphereGeometry args={[0.025,8,8]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0.05,0.02,0.13]}><sphereGeometry args={[0.025,8,8]} /><meshStandardMaterial color="#fff" /></mesh>
        {/* Pupils */}
        <mesh position={[-0.05,0.02,0.153]}><sphereGeometry args={[0.013,8,8]} /><meshStandardMaterial color="#2c1810" /></mesh>
        <mesh position={[0.05,0.02,0.153]}><sphereGeometry args={[0.013,8,8]} /><meshStandardMaterial color="#2c1810" /></mesh>
        {/* Eyebrows */}
        <mesh position={[-0.05,0.06,0.14]}><boxGeometry args={[0.04,0.008,0.01]} /><meshStandardMaterial color={hair} /></mesh>
        <mesh position={[0.05,0.06,0.14]}><boxGeometry args={[0.04,0.008,0.01]} /><meshStandardMaterial color={hair} /></mesh>
        {/* Nose */}
        <mesh position={[0,-0.01,0.155]}><boxGeometry args={[0.02,0.025,0.015]} /><meshStandardMaterial color="#E8B78A" /></mesh>
        {/* Mouth */}
        <mesh position={[0,-0.05,0.145]}><boxGeometry args={[0.04,0.01,0.008]} /><meshStandardMaterial color="#c0392b" /></mesh>
        {/* Ears */}
        <mesh position={[-0.155,0,0]}><sphereGeometry args={[0.03,6,6]} /><meshStandardMaterial color={skin} /></mesh>
        <mesh position={[0.155,0,0]}><sphereGeometry args={[0.03,6,6]} /><meshStandardMaterial color={skin} /></mesh>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0,0.95,0]}><cylinderGeometry args={[0.05,0.06,0.08,8]} /><meshStandardMaterial color={skin} /></mesh>

      {/* ── LEFT ARM ── */}
      <group ref={lArm} position={[-0.22,0.82,0]}>
        {/* Upper arm (hoodie sleeve) */}
        <mesh position={[0,-0.1,0]}><capsuleGeometry args={[0.05,0.14,6,8]} /><meshStandardMaterial color={hoodie} roughness={0.7} /></mesh>
        {/* Forearm (skin) */}
        <mesh position={[0,-0.28,0]}><capsuleGeometry args={[0.035,0.12,6,8]} /><meshStandardMaterial color={skin} /></mesh>
        {/* Hand */}
        <mesh position={[0,-0.38,0]}><sphereGeometry args={[0.035,8,8]} /><meshStandardMaterial color={skin} /></mesh>
      </group>

      {/* ── RIGHT ARM ── */}
      <group ref={rArm} position={[0.22,0.82,0]}>
        <mesh position={[0,-0.1,0]}><capsuleGeometry args={[0.05,0.14,6,8]} /><meshStandardMaterial color={hoodie} roughness={0.7} /></mesh>
        <mesh position={[0,-0.28,0]}><capsuleGeometry args={[0.035,0.12,6,8]} /><meshStandardMaterial color={skin} /></mesh>
        <mesh position={[0,-0.38,0]}><sphereGeometry args={[0.035,8,8]} /><meshStandardMaterial color={skin} /></mesh>
      </group>

      {/* ── LEFT LEG ── */}
      <group ref={lLeg} position={[-0.08,0.42,0]}>
        {/* Thigh (jeans) */}
        <mesh position={[0,-0.1,0]}><capsuleGeometry args={[0.06,0.16,6,8]} /><meshStandardMaterial color={jeans} roughness={0.8} /></mesh>
        {/* Shin */}
        <mesh position={[0,-0.3,0]}><capsuleGeometry args={[0.05,0.14,6,8]} /><meshStandardMaterial color={jeans} roughness={0.8} /></mesh>
        {/* Shoe */}
        <RoundedBox args={[0.08,0.05,0.14]} position={[0,-0.42,0.02]} radius={0.02}><meshStandardMaterial color={shoe} roughness={0.6} /></RoundedBox>
        {/* Shoe sole */}
        <mesh position={[0,-0.445,0.02]}><boxGeometry args={[0.085,0.015,0.145]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>

      {/* ── RIGHT LEG ── */}
      <group ref={rLeg} position={[0.08,0.42,0]}>
        <mesh position={[0,-0.1,0]}><capsuleGeometry args={[0.06,0.16,6,8]} /><meshStandardMaterial color={jeans} roughness={0.8} /></mesh>
        <mesh position={[0,-0.3,0]}><capsuleGeometry args={[0.05,0.14,6,8]} /><meshStandardMaterial color={jeans} roughness={0.8} /></mesh>
        <RoundedBox args={[0.08,0.05,0.14]} position={[0,-0.42,0.02]} radius={0.02}><meshStandardMaterial color={shoe} roughness={0.6} /></RoundedBox>
        <mesh position={[0,-0.445,0.02]}><boxGeometry args={[0.085,0.015,0.145]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
      </group>

      {/* ── BACKPACK ── */}
      <group position={[0,0.68,-0.2]}>
        <RoundedBox args={[0.22*bp,0.28*bp,0.12*bp]} radius={0.03} castShadow>
          <meshStandardMaterial color="#e74c3c" roughness={0.6} />
        </RoundedBox>
        {/* Backpack flap */}
        <mesh position={[0,0.14*bp+0.01,0]}><boxGeometry args={[0.2*bp,0.03,0.11*bp]} /><meshStandardMaterial color="#c0392b" /></mesh>
        {/* Straps */}
        <mesh position={[-0.08,0.08,0.06*bp]}><boxGeometry args={[0.025,0.22,0.02]} /><meshStandardMaterial color="#c0392b" /></mesh>
        <mesh position={[0.08,0.08,0.06*bp]}><boxGeometry args={[0.025,0.22,0.02]} /><meshStandardMaterial color="#c0392b" /></mesh>
        {/* Buckle */}
        <mesh position={[0,-0.12*bp,0.06*bp+0.01]}><boxGeometry args={[0.04,0.03,0.01]} /><meshStandardMaterial color="#D4A843" metalness={0.9} /></mesh>
      </group>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MULTI-ROOM HOUSE
   ═══════════════════════════════════════════════════════════════════════ */
function RoomBox({ cx, cz, label, wallColor, floorColor, children }) {
  const hw=2.8, hd=2.8, wh=2.5
  return (
    <group position={[cx,0,cz]}>
      {/* Floor */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]} receiveShadow>
        <planeGeometry args={[hw*2,hd*2]} /><meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0,wh/2,-hd]}><planeGeometry args={[hw*2,wh]} /><meshStandardMaterial color={wallColor} roughness={0.95} /></mesh>
      {/* Left wall */}
      <mesh position={[-hw,wh/2,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[hd*2,wh]} /><meshStandardMaterial color={wallColor} roughness={0.95} /></mesh>
      {/* Right wall */}
      <mesh position={[hw,wh/2,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[hd*2,wh]} /><meshStandardMaterial color={wallColor} roughness={0.95} /></mesh>
      {/* Baseboard */}
      <mesh position={[0,0.06,-hd+0.02]}><boxGeometry args={[hw*2,0.12,0.04]} /><meshStandardMaterial color="#5D4037" /></mesh>
      <mesh position={[-hw+0.02,0.06,0]}><boxGeometry args={[0.04,0.12,hd*2]} /><meshStandardMaterial color="#5D4037" /></mesh>
      <mesh position={[hw-0.02,0.06,0]}><boxGeometry args={[0.04,0.12,hd*2]} /><meshStandardMaterial color="#5D4037" /></mesh>
      {/* Room label */}
      <Html position={[0,2.6,0]} center distanceFactor={18} style={{pointerEvents:'none'}}>
        <div style={{background:'rgba(0,0,0,0.6)',color:'#fff',padding:'4px 12px',borderRadius:8,fontSize:13,fontWeight:800,letterSpacing:1}}>{label}</div>
      </Html>
      {children}
    </group>
  )
}

function House() {
  return (
    <group>
      {/* ══ BEDROOM (top-left) ══ */}
      <RoomBox cx={-R} cz={-R} label="🛏️ BEDROOM" wallColor="#F0E4D4" floorColor="#b07840">
        {/* Bed */}
        <RoundedBox args={[2,0.25,1.4]} position={[-0.5,0.2,0]} radius={0.04} castShadow><meshStandardMaterial color="#5D4037" /></RoundedBox>
        <RoundedBox args={[1.8,0.15,1.2]} position={[-0.5,0.40,0]} radius={0.06}><meshStandardMaterial color="#ddd6cc" /></RoundedBox>
        <RoundedBox args={[0.4,0.12,0.3]} position={[-1.2,0.52,0]} radius={0.06}><meshStandardMaterial color="#fff" /></RoundedBox>
        <RoundedBox args={[1.2,0.05,1.1]} position={[-0.2,0.50,0]} radius={0.02}><meshStandardMaterial color="#5B8FA8" /></RoundedBox>
        <RoundedBox args={[0.08,0.9,1.4]} position={[-1.5,0.5,0]} radius={0.03}><meshStandardMaterial color="#5D4037" /></RoundedBox>
        {/* Nightstand */}
        <RoundedBox args={[0.5,0.55,0.4]} position={[1.0,0.28,-0.5]} radius={0.03} castShadow><meshStandardMaterial color="#a07848" /></RoundedBox>
        <mesh position={[1.0,0.56,-0.32]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#D4A843" metalness={0.9} /></mesh>
        {/* Lamp on nightstand */}
        <mesh position={[1.0,0.65,-0.5]}><cylinderGeometry args={[0.06,0.08,0.08,8]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        <mesh position={[1.0,0.80,-0.5]}><coneGeometry args={[0.1,0.15,12,1,true]} /><meshStandardMaterial color="#f1c40f" emissive="#f39c12" emissiveIntensity={0.3} side={THREE.DoubleSide} /></mesh>
        <pointLight position={[1.0-R,0.8,-0.5-R]} intensity={0.3} color="#fff5e6" distance={3} />
        {/* Dresser */}
        <RoundedBox args={[1.2,0.8,0.5]} position={[1.5,0.4,-2.2]} radius={0.03} castShadow><meshStandardMaterial color="#a07848" /></RoundedBox>
        {[0.55,0.35,0.15].map((y,i)=><mesh key={i} position={[1.5,y,-1.94]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#D4A843" metalness={0.9} /></mesh>)}
        {/* Picture frame */}
        <group position={[0,1.8,-2.75]}><mesh><boxGeometry args={[0.8,0.6,0.04]} /><meshStandardMaterial color="#5D4037" /></mesh><mesh position={[0,0,0.025]}><planeGeometry args={[0.65,0.45]} /><meshStandardMaterial color="#2c3e50" /></mesh></group>
      </RoomBox>

      {/* ══ KITCHEN (top-right) ══ */}
      <RoomBox cx={R} cz={-R} label="🍳 KITCHEN" wallColor="#FFF8F0" floorColor="#c4a882">
        {/* Counter (L-shape) */}
        <RoundedBox args={[4.5,0.9,0.7]} position={[0,0.45,-2.2]} radius={0.03} castShadow><meshStandardMaterial color="#ddd6cc" /></RoundedBox>
        <mesh position={[0,0.91,-2.2]}><boxGeometry args={[4.5,0.04,0.72]} /><meshStandardMaterial color="#636e72" roughness={0.3} metalness={0.1} /></mesh>
        {/* Upper cabinets */}
        <RoundedBox args={[3.5,0.7,0.35]} position={[0,1.65,-2.55]} radius={0.03}><meshStandardMaterial color="#ddd6cc" /></RoundedBox>
        {[-1.0,0,1.0].map((x,i)=><mesh key={i} position={[x,1.65,-2.37]}><sphereGeometry args={[0.025,8,8]} /><meshStandardMaterial color="#D4A843" metalness={0.9} /></mesh>)}
        {/* Fridge */}
        <RoundedBox args={[0.8,1.8,0.7]} position={[2.2,0.9,-2.2]} radius={0.04} castShadow><meshStandardMaterial color="#bdc3c7" metalness={0.3} roughness={0.4} /></RoundedBox>
        <mesh position={[2.2,1.2,-1.84]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#7f8c8d" metalness={0.8} /></mesh>
        <mesh position={[2.2,0.5,-1.84]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#7f8c8d" metalness={0.8} /></mesh>
        {/* Small table */}
        <RoundedBox args={[1,0.06,0.8]} position={[-0.5,0.75,0.5]} radius={0.02} castShadow><meshStandardMaterial color="#a07848" /></RoundedBox>
        {[[-0.3,-0.3],[-0.3,0.3],[0.3,-0.3],[0.3,0.3]].map(([dx,dz],i)=><mesh key={i} position={[-0.5+dx,0.38,0.5+dz]}><cylinderGeometry args={[0.03,0.03,0.75,6]} /><meshStandardMaterial color="#7B5B28" /></mesh>)}
        {/* Stove */}
        <mesh position={[-1.5,0.93,-2.2]}><boxGeometry args={[0.8,0.04,0.65]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        {[[-0.15,-0.1],[0.15,-0.1],[-0.15,0.1],[0.15,0.1]].map(([dx,dz],i)=><mesh key={i} position={[-1.5+dx,0.96,-2.2+dz]}><ringGeometry args={[0.06,0.08,12]} /><meshStandardMaterial color="#e74c3c" side={THREE.DoubleSide} /></mesh>)}
      </RoomBox>

      {/* ══ BATHROOM (bottom-left) ══ */}
      <RoomBox cx={-R} cz={R} label="🚿 BATHROOM" wallColor="#E8F4F8" floorColor="#b0b8c0">
        {/* Toilet */}
        <group position={[-1.8,0,1.5]}>
          <RoundedBox args={[0.4,0.4,0.55]} position={[0,0.2,0]} radius={0.06}><meshStandardMaterial color="#ecf0f1" roughness={0.3} /></RoundedBox>
          <RoundedBox args={[0.35,0.5,0.08]} position={[0,0.5,-0.22]} radius={0.04}><meshStandardMaterial color="#ecf0f1" /></RoundedBox>
          <mesh position={[0.1,0.55,-0.22]}><sphereGeometry args={[0.03,8,8]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} /></mesh>
        </group>
        {/* Sink + mirror */}
        <RoundedBox args={[0.8,0.06,0.5]} position={[0,0.85,-2.3]} radius={0.02} castShadow><meshStandardMaterial color="#ecf0f1" /></RoundedBox>
        <mesh position={[0,0.85,-2.3]}><cylinderGeometry args={[0.15,0.15,0.04,16]} /><meshStandardMaterial color="#bdc3c7" roughness={0.2} /></mesh>
        <mesh position={[0,0.72,-2.3]}><boxGeometry args={[0.5,0.7,0.04]} /><meshStandardMaterial color="#ecf0f1" /></mesh>
        {/* Mirror */}
        <mesh position={[0,1.5,-2.75]}><boxGeometry args={[0.7,0.9,0.04]} /><meshStandardMaterial color="#a8d8ea" metalness={0.8} roughness={0.1} /></mesh>
        <mesh position={[0,1.5,-2.73]}><boxGeometry args={[0.78,0.98,0.02]} /><meshStandardMaterial color="#5D4037" /></mesh>
        {/* Medicine cabinet */}
        <RoundedBox args={[0.6,0.7,0.25]} position={[-1.8,1.4,-2.55]} radius={0.03}><meshStandardMaterial color="#ecf0f1" /></RoundedBox>
        <mesh position={[-1.8,1.4,-2.42]}><sphereGeometry args={[0.025,8,8]} /><meshStandardMaterial color="#bdc3c7" metalness={0.8} /></mesh>
        {/* Bathtub */}
        <RoundedBox args={[1.6,0.5,0.8]} position={[1.5,0.25,1.5]} radius={0.08}><meshStandardMaterial color="#ecf0f1" roughness={0.3} /></RoundedBox>
        {/* Towel rack */}
        <mesh position={[2.5,1.2,0]}><cylinderGeometry args={[0.02,0.02,1.0,6]} rotation={[0,0,Math.PI/2]} /><meshStandardMaterial color="#bdc3c7" metalness={0.7} /></mesh>
        <mesh position={[2.5,0.9,0]}><boxGeometry args={[0.02,0.5,0.3]} /><meshStandardMaterial color="#3498db" roughness={0.9} /></mesh>
      </RoomBox>

      {/* ══ GARAGE (bottom-right) ══ */}
      <RoomBox cx={R} cz={R} label="🔧 GARAGE" wallColor="#D5D5D0" floorColor="#808080">
        {/* Workbench */}
        <RoundedBox args={[3.5,0.08,0.8]} position={[0,1.0,-2.2]} radius={0.02} castShadow><meshStandardMaterial color="#8B7355" roughness={0.5} /></RoundedBox>
        {[[-1.5,-0.3],[-1.5,0.3],[1.5,-0.3],[1.5,0.3]].map(([dx,dz],i)=><mesh key={i} position={[dx,0.5,-2.2+dz]}><boxGeometry args={[0.08,1.0,0.08]} /><meshStandardMaterial color="#6B4F12" /></mesh>)}
        {/* Pegboard */}
        <mesh position={[0,1.7,-2.75]}><boxGeometry args={[3.5,1.0,0.05]} /><meshStandardMaterial color="#c0b090" roughness={0.9} /></mesh>
        {/* Peg hooks */}
        {[-1.2,-0.4,0.4,1.2].map((x,i)=><mesh key={i} position={[x,1.7,-2.70]}><cylinderGeometry args={[0.015,0.015,0.1,6]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial color="#7f8c8d" metalness={0.8} /></mesh>)}
        {/* Shelving unit */}
        <group position={[2.2,0,-0.5]}>
          {[0.4,0.9,1.4].map((y,i)=><RoundedBox key={i} args={[0.8,0.06,0.5]} position={[0,y,0]} radius={0.01}><meshStandardMaterial color="#7f8c8d" /></RoundedBox>)}
          {[[-0.35,0,0.2],[0.35,0,0.2],[-0.35,0,-0.2],[0.35,0,-0.2]].map(([dx,_,dz],i)=><mesh key={i} position={[dx,0.7,dz]}><boxGeometry args={[0.04,1.45,0.04]} /><meshStandardMaterial color="#636e72" /></mesh>)}
        </group>
        {/* Tire */}
        <mesh position={[-2.0,0.3,1.5]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.25,0.1,8,16]} /><meshStandardMaterial color="#1a1a1a" roughness={0.9} /></mesh>
        {/* Oil can */}
        <mesh position={[0.5,1.05,-2.0]}><cylinderGeometry args={[0.06,0.06,0.15,8]} /><meshStandardMaterial color="#27ae60" /></mesh>
      </RoomBox>

      {/* ══ HALLWAY (center cross connecting rooms) ══ */}
      {/* Horizontal hallway */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.005,0]}><planeGeometry args={[3,R*2+5.6]} /><meshStandardMaterial color="#a08060" roughness={0.9} /></mesh>
      {/* Vertical hallway */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.006,0]}><planeGeometry args={[R*2+5.6,3]} /><meshStandardMaterial color="#a08060" roughness={0.9} /></mesh>
      {/* Hallway runner rug */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.01,0]}><planeGeometry args={[1.5,R*2+4]} /><meshStandardMaterial color="#8B4513" transparent opacity={0.3} /></mesh>
    </group>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   ITEM 3D / WATER / LIGHTS / PICKUP
   ═══════════════════════════════════════════════════════════════════════ */
function Item3D({ item, onClick, waterLevel, disabled }) {
  const ref=useRef()
  const [hov,setH]=useState(false)
  const sub=item.pos[1]<waterLevel
  const geo=useMemo(()=>{const s=item.sz;switch(item.cat){
    case'W':return<sphereGeometry args={[s,16,16]}/>
    case'M':return<boxGeometry args={[s*1.4,s,s*1.2]}/>
    case'T':return<cylinderGeometry args={[s*.4,s*.5,s*1.8,8]}/>
    case'F':return<boxGeometry args={[s*1.2,s*.8,s]}/>
    case'S':return<coneGeometry args={[s*.8,s*1.5,6]}/>
    case'C':return<boxGeometry args={[s*1.3,s*.9,s*.7]}/>
    case'N':return<boxGeometry args={[s*1.6,s*.15,s*1.2]}/>
    default:return<boxGeometry args={[s,s,s]}/>}},[item])
  useFrame(s=>{if(!ref.current)return;ref.current.scale.setScalar(hov&&!sub?1+Math.sin(s.clock.elapsedTime*5)*0.1:1)})
  const W=item.trap?'group':Float
  const wp=item.trap?{}:{speed:1.5,rotationIntensity:0.15,floatIntensity:0.3}
  return(
    <W {...wp}><group position={item.pos}>
      <mesh ref={ref} castShadow onClick={e=>{e.stopPropagation();if(!sub&&!disabled)onClick(item)}} onPointerOver={()=>setH(true)} onPointerOut={()=>setH(false)}>
        {geo}<meshStandardMaterial color={hov&&!sub?'#fbbf24':item.color} roughness={0.45} metalness={item.cat==='T'?0.6:0.1} transparent={sub} opacity={sub?0.2:1} />
      </mesh>
      {hov&&!sub&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,-item.sz*0.5,0]}><ringGeometry args={[item.sz*0.8,item.sz*1.2,24]}/><meshBasicMaterial color="#fbbf24" transparent opacity={0.4} side={THREE.DoubleSide}/></mesh>}
      <Html position={[0,item.sz+0.2,0]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{fontSize:item.trap?24:16,textShadow:'0 2px 8px rgba(0,0,0,0.6)',opacity:sub?0.15:1}}>{item.emoji}</div></Html>
      {hov&&!sub&&<Html position={[0,item.sz+0.45,0]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{background:'rgba(15,23,42,0.92)',color:'#f1f5f9',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700,whiteSpace:'nowrap'}}>{item.name}·{item.wt}lb·⭐{item.util}{item.room&&` [${item.room}]`}</div></Html>}
      {item.trap&&<Html position={[0,-item.sz-0.08,0]} center distanceFactor={12} style={{pointerEvents:'none'}}><div style={{background:'#dc2626',color:'#fff',padding:'2px 7px',borderRadius:10,fontSize:9,fontWeight:800}}>{item.wt}lbs</div></Html>}
    </group></W>)
}

function Water({level}){const r=useRef();useFrame(s=>{if(r.current)r.current.position.y=level+Math.sin(s.clock.elapsedTime*2)*0.015});if(level<=0.02)return null;return(<mesh ref={r} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[22,22]}/><meshStandardMaterial color="#1e64c8" transparent opacity={0.45} roughness={0.05} metalness={0.4} side={THREE.DoubleSide}/></mesh>)}

function Lights({urg}){return(<><ambientLight intensity={urg?0.3:0.5} color={urg?'#ffaa88':'#fff8f0'}/><pointLight position={[0,8,0]} intensity={2} color="#fff5e6" castShadow shadow-mapSize={1024}/><pointLight position={[-R,4,-R]} intensity={0.4} color="#ffd700"/><pointLight position={[R,4,-R]} intensity={0.4} color="#fff5e6"/><pointLight position={[-R,4,R]} intensity={0.3} color="#87CEEB"/><pointLight position={[R,4,R]} intensity={0.3} color="#f5f5dc"/>{urg&&<pointLight position={[0,3,0]} intensity={0.8} color="#ff4444"/>}</>)}

function PickupFX({position,active}){if(!active||!position)return null;return<Sparkles position={position} count={40} scale={1.8} size={5} speed={3} color="#fbbf24"/>}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function Module1_GoBag() {
  const {dispatch:gd}=useGame()
  const [phase,setPhase]=useState('intro')
  const [bag,setBag]=useState([])
  const [time,setTime]=useState(TIMER)
  const [charTarget,setCharTarget]=useState(null)
  const [pending,setPending]=useState(null)
  const [sparkle,setSparkle]=useState(null)
  const [result,setResult]=useState(null)
  const [walking,setWalking]=useState(false)
  const timerRef=useRef(null),doneRef=useRef(false)

  useEffect(()=>{if(phase!=='play')return;doneRef.current=false;timerRef.current=setInterval(()=>{setTime(p=>{if(p<=1){clearInterval(timerRef.current);setTimeout(()=>{if(!doneRef.current)finish()},0);return 0}return p-1})},1000);return()=>clearInterval(timerRef.current)},[phase])

  const finish=useCallback(()=>{if(doneRef.current)return;doneRef.current=true;clearInterval(timerRef.current);const r=computeScore(bag);setResult(r);gd({type:'RECORD_SCORE',payload:{key:'flood-1',result:{score:r.score,passed:r.passed}}});setPhase('result')},[bag,gd])
  const clickItem=useCallback(item=>{if(walking||bag.find(i=>i.id===item.id))return;setWalking(true);setPending(item);setCharTarget(item.pos)},[walking,bag])
  const onArrived=useCallback(()=>{if(!pending)return;setBag(p=>[...p,pending]);setSparkle(pending.pos);setTimeout(()=>setSparkle(null),900);setPending(null);setCharTarget(null);setWalking(false)},[pending])

  const bagWt=bag.reduce((s,i)=>s+i.wt,0),over=bagWt>WEIGHT_LIMIT
  const waterLevel=phase==='play'?Math.min(1.5,((TIMER-time)/TIMER)*2):0
  const urg=time<=15
  const bagIds=useMemo(()=>bag.map(i=>i.id),[bag])

  if(phase==='intro') return(
    <div style={S.full}><div style={S.card}>
      <div style={{fontSize:72}}>🏠</div>
      <h1 style={{color:'#1e293b',fontSize:28,margin:'0 0 6px',fontWeight:800}}>The Go-Bag</h1>
      <p style={{color:'#64748b',fontSize:14,lineHeight:1.7,margin:'0 0 14px'}}>
        Flood warning! Search <strong>4 rooms</strong> of your house in <strong style={{color:'#dc2626'}}>60 seconds</strong>.
      </p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%',marginBottom:14}}>
        {[['🛏️','Bedroom','Shelter, Comms, Nav'],['🍳','Kitchen','Water, Food'],['🚿','Bathroom','Medical supplies'],['🔧','Garage','Tools, Equipment']].map(([e,n,d],i)=>
        <div key={i} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px 10px',textAlign:'left'}}>
          <div style={{fontSize:18}}>{e} <strong style={{fontSize:12,color:'#334155'}}>{n}</strong></div>
          <div style={{fontSize:11,color:'#64748b'}}>{d}</div>
        </div>)}
      </div>
      <div style={{background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:10,padding:'10px 14px',marginBottom:14,textAlign:'left',width:'100%'}}>
        <ul style={{margin:0,paddingLeft:16,color:'#78350f',fontSize:12,lineHeight:1.9}}>
          <li><strong>Click items</strong> — character runs to grab them</li>
          <li>Weight limit: <strong>25 lbs</strong></li>
          <li>Small items on shelves = <strong>smart</strong> picks</li>
          <li>Big floor items = <strong>TRAPS</strong></li>
          <li>Water rises — floor items get submerged!</li>
        </ul>
      </div>
      <button onClick={()=>setPhase('play')} style={S.btn}>🚨 Start — 60 Seconds!</button>
      <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.ghost,marginTop:8}}>← Back</button>
    </div></div>)

  if(phase==='result'&&result) return(
    <div style={S.full}><div style={{...S.card,maxWidth:520}}>
      <div style={{fontSize:56}}>{result.passed?'✅':'❌'}</div>
      <h1 style={{color:result.passed?'#16a34a':'#dc2626',fontSize:24,margin:'6px 0'}}>{result.passed?'Bag Packed!':'Failed'}</h1>
      <div style={{fontSize:42,fontWeight:800,color:result.passed?'#16a34a':'#dc2626'}}>{result.score}/100</div>
      <p style={{color:'#64748b',fontSize:13,margin:'6px 0 10px'}}>{result.msg}</p>
      <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:10,width:'100%',textAlign:'left',marginBottom:8}}>
        <div style={{fontWeight:700,color:'#334155',marginBottom:4,fontSize:12}}>Bag ({bagWt.toFixed(1)}/{WEIGHT_LIMIT} lbs)</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{bag.map(i=><span key={i.id} style={{fontSize:10,padding:'2px 6px',borderRadius:12,background:i.trap?'#fef2f2':'#f0fdf4',border:`1px solid ${i.trap?'#fecaca':'#bbf7d0'}`,color:i.trap?'#991b1b':'#166534'}}>{i.emoji} {i.name} ({i.wt}lb)</span>)}</div>
      </div>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        <button onClick={()=>{setBag([]);setTime(TIMER);setResult(null);setWalking(false);setCharTarget(null);setPending(null);setPhase('intro')}} style={S.btn}>🔄 Retry</button>
        <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.btn,background:'#64748b'}}>📋 Modules</button>
      </div>
    </div></div>)

  // ── PLAY ──
  return(
    <div style={{width:'100vw',height:'100vh',position:'relative',overflow:'hidden'}}>
      <Canvas shadows camera={{position:[14,14,14],fov:38,near:0.1,far:100}} style={{background:urg?'#3d1520':'#78B8D0',transition:'background 3s'}}>
        <Lights urg={urg}/>
        <Environment preset="apartment" background={false}/>
        <House/>
        <HumanCharacter target={charTarget} onArrived={onArrived} bagCount={bag.length}/>
        {ITEMS.map(i=>!bagIds.includes(i.id)&&<Item3D key={i.id} item={i} waterLevel={waterLevel} onClick={clickItem} disabled={walking}/>)}
        <Water level={waterLevel}/>
        <PickupFX position={sparkle} active={!!sparkle}/>
        <ContactShadows position={[0,0.005,0]} opacity={0.4} scale={25} blur={2.5}/>
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI/6} maxPolarAngle={Math.PI/3.2} minAzimuthAngle={-Math.PI/5} maxAzimuthAngle={Math.PI/5} target={[0,1,0]}/>
        <EffectComposer><Bloom luminanceThreshold={0.9} intensity={0.3} radius={0.4}/><Vignette eskil={false} offset={0.1} darkness={urg?0.7:0.3}/></EffectComposer>
      </Canvas>

      <div style={S.hud}>
        <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.ghost,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>← Quit</button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{...S.pill,background:urg?'#dc2626':'rgba(0,0,0,0.5)',animation:urg?'pulse .5s infinite':'none'}}>⏱ {time}s</div>
          <div style={{...S.pill,background:over?'rgba(220,38,38,0.9)':'rgba(0,0,0,0.5)'}}>⚖️ {bagWt.toFixed(1)}/{WEIGHT_LIMIT}</div>
          <div style={S.pill}>🎒 {bag.length}</div>
          <button onClick={finish} style={{...S.pill,cursor:'pointer',background:'#16a34a',border:'none',fontWeight:700}}>✅ Done</button>
        </div>
      </div>

      <div style={S.bagP}>
        <div style={{fontWeight:800,fontSize:14,color:'#1e293b',marginBottom:4}}>🎒 Bag</div>
        <div style={{height:8,background:'#e2e8f0',borderRadius:4,marginBottom:6,overflow:'hidden'}}><div style={{height:'100%',borderRadius:4,transition:'width .3s',width:`${Math.min(100,(bagWt/WEIGHT_LIMIT)*100)}%`,background:over?'#dc2626':bagWt>20?'#f59e0b':'#16a34a'}}/></div>
        <div style={{fontSize:10,color:over?'#dc2626':'#64748b',fontWeight:700,marginBottom:6}}>{bagWt.toFixed(1)}/{WEIGHT_LIMIT} lbs {over&&'⚠️'}</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {bag.length===0?<div style={{color:'#94a3b8',fontSize:11,textAlign:'center',padding:14}}>Click items in rooms!</div>:
          bag.map(i=><div key={i.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 5px',marginBottom:2,borderRadius:6,background:i.trap?'#fef2f2':'#f0fdf4',border:`1px solid ${i.trap?'#fecaca':'#bbf7d0'}`}}>
            <span style={{fontSize:14}}>{i.emoji}</span>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:9,fontWeight:700,color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.name}</div><div style={{fontSize:8,color:'#64748b'}}>{i.wt}lb · {i.room}</div></div>
            <button onClick={()=>setBag(p=>p.filter(x=>x.id!==i.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:11}}>✕</button>
          </div>)}
        </div>
      </div>

      {walking&&<div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:'#fbbf24',padding:'7px 18px',borderRadius:20,fontSize:12,fontWeight:700,zIndex:20}}>🏃 Running to {pending?.room} — {pending?.name}</div>}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
    </div>)
}

const S={
  full:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)',fontFamily:'system-ui,sans-serif',padding:16},
  card:{maxWidth:460,padding:'28px 24px',textAlign:'center',background:'#fff',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,0.1)',display:'flex',flexDirection:'column',alignItems:'center'},
  btn:{padding:'12px 28px',fontSize:14,fontWeight:700,background:'#2563eb',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',boxShadow:'0 4px 16px rgba(37,99,235,0.3)'},
  ghost:{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:13},
  hud:{position:'absolute',top:0,left:0,right:190,zIndex:20,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'linear-gradient(180deg,rgba(0,0,0,0.35),transparent)'},
  pill:{background:'rgba(0,0,0,0.5)',padding:'5px 12px',borderRadius:20,color:'#fff',fontWeight:700,fontSize:13,fontFamily:'monospace'},
  bagP:{position:'absolute',top:0,right:0,bottom:0,width:190,background:'#fff',borderLeft:'1px solid #e2e8f0',padding:'10px 8px',display:'flex',flexDirection:'column',zIndex:20,overflowY:'auto'},
}
