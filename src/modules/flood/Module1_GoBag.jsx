/**
 * Module 1 — The Go-Bag: Detailed 3D Room Grab Game
 * Rich isometric room with dozens of props, animated character with limbs,
 * post-processing (bloom, vignette), detailed furniture, decorations.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Html, ContactShadows, RoundedBox, Sparkles, Environment, MeshWobbleMaterial } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useGame } from '../../context/GameContext'

// ═══════════════════════════════════════════════════════════════════════════════
// ITEMS
// ═══════════════════════════════════════════════════════════════════════════════
const ITEMS = [
  // SMART (small, hidden, high utility)
  { id:'w3', name:'LifeStraw',      emoji:'💧', cat:'W', wt:0.10, util:96, trap:false, tip:'Filters 1,000 gal. 0.1 lbs!',       pos:[3.0, 3.55, -3.5],  sz:0.15, color:'#3b82f6' },
  { id:'w4', name:'Aquatabs',       emoji:'💊', cat:'W', wt:0.05, util:88, trap:false, tip:'50 purification tablets.',            pos:[-3.5, 3.55, -3.5], sz:0.12, color:'#60a5fa' },
  { id:'w5', name:'Sawyer Filter',  emoji:'🔩', cat:'W', wt:0.25, util:92, trap:false, tip:'100k gallon lifetime.',              pos:[1.2, 1.05, -1.5],  sz:0.15, color:'#2563eb' },
  { id:'m2', name:'IFAK Kit',       emoji:'🩹', cat:'M', wt:0.75, util:90, trap:false, tip:'Tourniquet + gauze.',                pos:[-2.2, 3.55, -3.5], sz:0.18, color:'#ef4444' },
  { id:'m3', name:'Medications',    emoji:'💊', cat:'M', wt:0.30, util:96, trap:false, tip:'Prescriptions. Irreplaceable.',      pos:[-4.1, 1.45, -1.8], sz:0.13, color:'#f87171' },
  { id:'m4', name:'N95 Masks',      emoji:'😷', cat:'M', wt:0.20, util:72, trap:false, tip:'Mold protection.',                   pos:[4.1, 2.35, -2.3],  sz:0.13, color:'#fca5a5' },
  { id:'t2', name:'Leatherman',     emoji:'🔪', cat:'T', wt:0.55, util:90, trap:false, tip:'25 functions. Essential.',            pos:[1.9, 1.05, -1.8],  sz:0.15, color:'#94a3b8' },
  { id:'t3', name:'Paracord',       emoji:'🪢', cat:'T', wt:0.40, util:76, trap:false, tip:'550lb test. 40+ uses.',              pos:[3.7, 2.35, -2.3],  sz:0.13, color:'#a3a3a3' },
  { id:'t4', name:'Firestarter',    emoji:'🔥', cat:'T', wt:0.15, util:80, trap:false, tip:'Windproof lighter.',                 pos:[-0.8, 0.28, 1.2],  sz:0.12, color:'#f59e0b' },
  { id:'t5', name:'Glass Breaker',  emoji:'🔨', cat:'T', wt:0.08, util:72, trap:false, tip:'Escape vehicles.',                   pos:[2.6, 1.05, -1.2],  sz:0.11, color:'#6b7280' },
  { id:'s2', name:'Bivvy Sack',     emoji:'🌡️', cat:'S', wt:0.50, util:84, trap:false, tip:'80% body heat retention.',           pos:[3.8, 0.28, 0.8],   sz:0.17, color:'#f97316' },
  { id:'s3', name:'Tarp 8×10',      emoji:'🏕️', cat:'S', wt:1.00, util:80, trap:false, tip:'Rain shelter. 1 lb.',                pos:[-0.3, 0.28, 1.8],  sz:0.18, color:'#84cc16' },
  { id:'c1', name:'NOAA Radio',     emoji:'📻', cat:'C', wt:0.85, util:84, trap:false, tip:'Hand-crank radio.',                  pos:[-1.2, 3.55, -3.5], sz:0.18, color:'#eab308' },
  { id:'c3', name:'Sat Messenger',  emoji:'🛰️', cat:'C', wt:0.35, util:92, trap:false, tip:'SOS via satellite.',                 pos:[1.5, 3.55, -3.5],  sz:0.13, color:'#a855f7' },
  { id:'n1', name:'Map+Compass',    emoji:'🗺️', cat:'N', wt:0.20, util:96, trap:false, tip:'No battery needed.',                 pos:[0.2, 3.55, -3.5],  sz:0.15, color:'#d97706' },
  { id:'f3', name:'Energy Bars',    emoji:'🍫', cat:'F', wt:0.75, util:74, trap:false, tip:'2,000 cal/lb.',                      pos:[-3.3, 0.28, 0.3],  sz:0.15, color:'#92400e' },
  { id:'f4', name:'Freeze-Dried',   emoji:'🍱', cat:'F', wt:0.90, util:85, trap:false, tip:'3-day supply.',                      pos:[-3.8, 2.35, -2.3], sz:0.17, color:'#b45309' },
  { id:'p3', name:'Headlamp',       emoji:'💡', cat:'T', wt:0.35, util:82, trap:false, tip:'Hands-free light.',                  pos:[3.3, 1.05, -0.8],  sz:0.13, color:'#facc15' },
  // TRAPS
  { id:'w1', name:'Water Jug 1gal', emoji:'🪣', cat:'W', wt:8.34, util:22, trap:true, tip:'8.34 lbs! Weight trap.',              pos:[-1.8, 0.35, 2.5],  sz:0.40, color:'#1d4ed8' },
  { id:'w2', name:'Water Jugs 2gal',emoji:'🪣', cat:'W', wt:16.68,util:30, trap:true, tip:'16.68 lbs — budget gone.',            pos:[1.8, 0.40, 2.8],   sz:0.50, color:'#1e40af' },
  { id:'f1', name:'Canned Beans ×6',emoji:'🥫', cat:'F', wt:9.00, util:32, trap:true, tip:'9 lbs of cans.',                      pos:[0.2, 0.30, 2.0],   sz:0.38, color:'#b91c1c' },
  { id:'t1', name:'Mechanic Toolkit',emoji:'🧰',cat:'T', wt:15.0, util:12, trap:true, tip:'15 lbs! Do not pack.',                pos:[3.2, 0.35, 2.5],   sz:0.50, color:'#475569' },
  { id:'s1', name:'Family Tent',    emoji:'⛺', cat:'S', wt:18.0, util:18, trap:true, tip:'18 lbs. Impossible to carry.',         pos:[-3.2, 0.40, 2.8],  sz:0.58, color:'#15803d' },
  { id:'m1', name:'Full First Aid', emoji:'🏥', cat:'M', wt:3.50, util:52, trap:true, tip:'3.5 lbs. Over-engineered.',           pos:[-0.8, 0.30, 0.8],  sz:0.32, color:'#dc2626' },
]

const WEIGHT_LIMIT = 25, TIMER = 60, ESSENTIAL_IDS = ['w3','m2','t2','n1']

function computeScore(bag) {
  const wt = bag.reduce((s,i) => s+i.wt, 0)
  if (wt > WEIGHT_LIMIT) return { score: Math.max(5, 35-Math.round((wt-WEIGHT_LIMIT)*2)), passed: false, msg: `TOO HEAVY (${wt.toFixed(1)} lbs)!` }
  if (!bag.some(i => ['w3','w4','w5'].includes(i.id))) return { score: 15, passed: false, msg: 'No water solution!' }
  if (!bag.some(i => i.cat === 'M')) return { score: 25, passed: false, msg: 'No medical supplies!' }
  if (!bag.some(i => i.cat === 'N')) return { score: 30, passed: false, msg: 'No navigation!' }
  const avgUtil = Math.round(bag.reduce((s,i)=>s+i.util,0)/bag.length)
  const mobil = Math.round(((WEIGHT_LIMIT-wt)/WEIGHT_LIMIT)*100)
  const ess = ESSENTIAL_IDS.every(id => bag.some(i => i.id === id)) ? 15 : 0
  const pen = bag.filter(i => i.trap).length * 5
  const t = Math.min(100, Math.max(40, Math.round(avgUtil*0.35 + mobil*0.3 + ess*1.5 - pen)))
  return { score: t, passed: t >= 55, msg: t >= 55 ? `Smart loadout! ${wt.toFixed(1)} lbs.` : `Score ${t}. Heavy items hurt you.` }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D ROOM — Highly Detailed
// ═══════════════════════════════════════════════════════════════════════════════
function DetailedRoom() {
  return (
    <group>
      {/* ══ FLOOR with plank pattern ══ */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[10,8]} />
        <meshStandardMaterial color="#b07840" roughness={0.85} />
      </mesh>
      {/* Floor plank lines */}
      {Array.from({length:10},(_,i) => (
        <mesh key={`fp${i}`} rotation={[-Math.PI/2,0,0]} position={[-4.5+i,0.005,0]}>
          <planeGeometry args={[0.02,8]} />
          <meshStandardMaterial color="#8B6530" />
        </mesh>
      ))}

      {/* ══ WALLS ══ */}
      <mesh position={[0,3,-4]} receiveShadow><planeGeometry args={[10,6]} /><meshStandardMaterial color="#F5E6D3" roughness={0.95} /></mesh>
      <mesh position={[-5,3,0]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[8,6]} /><meshStandardMaterial color="#EDD9BE" roughness={0.95} /></mesh>
      <mesh position={[5,3,0]} rotation={[0,-Math.PI/2,0]}><planeGeometry args={[8,6]} /><meshStandardMaterial color="#EDD9BE" roughness={0.95} /></mesh>

      {/* Baseboards */}
      <RoundedBox args={[10,0.18,0.06]} position={[0,0.09,-3.97]} radius={0.02}><meshStandardMaterial color="#6B4F12" /></RoundedBox>
      <RoundedBox args={[0.06,0.18,8]} position={[-4.97,0.09,0]} radius={0.02}><meshStandardMaterial color="#6B4F12" /></RoundedBox>
      <RoundedBox args={[0.06,0.18,8]} position={[4.97,0.09,0]} radius={0.02}><meshStandardMaterial color="#6B4F12" /></RoundedBox>

      {/* ══ WINDOW — detailed frame + curtains ══ */}
      <mesh position={[0,4,-3.95]}><planeGeometry args={[2.4,1.7]} /><meshStandardMaterial color="#A8D8EA" emissive="#87CEEB" emissiveIntensity={0.4} /></mesh>
      {/* Window frame */}
      {[[-1.25,4,-3.92,'v'],[1.25,4,-3.92,'v'],[0,4.88,-3.92,'h'],[0,3.12,-3.92,'h'],[0,4,-3.92,'v']].map(([x,y,z,d],i) => (
        <mesh key={`wf${i}`} position={[x,y,z]}><boxGeometry args={d==='h'?[2.6,0.1,0.06]:[0.08,1.8,0.06]} /><meshStandardMaterial color="#6B4F12" /></mesh>
      ))}
      {/* Curtains */}
      <mesh position={[-1.6,4.2,-3.88]}><boxGeometry args={[0.4,2.2,0.04]} /><MeshWobbleMaterial color="#8B4513" factor={0.3} speed={1} /></mesh>
      <mesh position={[1.6,4.2,-3.88]}><boxGeometry args={[0.4,2.2,0.04]} /><MeshWobbleMaterial color="#8B4513" factor={0.3} speed={1} /></mesh>
      {/* Curtain rod */}
      <mesh position={[0,5.1,-3.88]}><cylinderGeometry args={[0.03,0.03,3.8,8]} rotation={[0,0,Math.PI/2]} /><meshStandardMaterial color="#D4A843" metalness={0.9} roughness={0.2} /></mesh>

      {/* ══ WALL SHELF (back wall, high) + decorations ══ */}
      <RoundedBox args={[7,0.1,0.5]} position={[0,3.4,-3.65]} radius={0.03} castShadow><meshStandardMaterial color="#a07848" roughness={0.5} /></RoundedBox>
      {[-2.5,-0.5,2.0].map((x,i) => <mesh key={`sb${i}`} position={[x,3.15,-3.65]}><boxGeometry args={[0.06,0.5,0.06]} /><meshStandardMaterial color="#7B5B28" /></mesh>)}
      {/* Books on shelf (decorative) */}
      {[[-4.0,'#c0392b',0.35],[-3.7,'#2980b9',0.30],[-3.45,'#27ae60',0.38],[-3.2,'#f39c12',0.25],[3.8,'#8e44ad',0.32],[4.1,'#e74c3c',0.28],[4.35,'#3498db',0.35]].map(([x,c,h],i) => (
        <mesh key={`bk${i}`} position={[x,3.4+h/2+0.05,-3.55]}><boxGeometry args={[0.12,h,0.25]} /><meshStandardMaterial color={c} roughness={0.8} /></mesh>
      ))}

      {/* ══ PICTURE FRAMES on back wall ══ */}
      {[[-3,4.5,0.9,0.7,'#2c3e50'],[-3,2.2,0.7,0.5,'#1a5276'],[3.5,4.8,0.6,0.5,'#7d3c98']].map(([x,y,w,h,c],i) => (
        <group key={`pic${i}`} position={[x,y,-3.94]}>
          <mesh><boxGeometry args={[w+0.08,h+0.08,0.03]} /><meshStandardMaterial color="#6B4F12" /></mesh>
          <mesh position={[0,0,0.02]}><planeGeometry args={[w,h]} /><meshStandardMaterial color={c} /></mesh>
        </group>
      ))}

      {/* ══ CLOCK on wall ══ */}
      <group position={[2.5,5,-3.94]}>
        <mesh><cylinderGeometry args={[0.3,0.3,0.06,24]} rotation={[Math.PI/2,0,0]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        <mesh position={[0,0,0.04]}><circleGeometry args={[0.26,24]} /><meshStandardMaterial color="#ecf0f1" /></mesh>
        {/* Clock hands */}
        <mesh position={[0,0.08,0.05]}><boxGeometry args={[0.02,0.18,0.01]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        <mesh position={[0.06,0,0.05]} rotation={[0,0,-Math.PI/3]}><boxGeometry args={[0.015,0.12,0.01]} /><meshStandardMaterial color="#c0392b" /></mesh>
      </group>

      {/* ══ DESK — detailed ══ */}
      <RoundedBox args={[2.5,0.08,1.2]} position={[2,0.92,-1.5]} radius={0.02} castShadow><meshStandardMaterial color="#a07848" roughness={0.45} /></RoundedBox>
      {[[-1.1,-0.5],[-1.1,0.5],[1.1,-0.5],[1.1,0.5]].map(([dx,dz],i) => (
        <mesh key={`dl${i}`} position={[2+dx,0.46,-1.5+dz]}><boxGeometry args={[0.07,0.92,0.07]} /><meshStandardMaterial color="#7B5B28" /></mesh>
      ))}
      {/* Desk lamp */}
      <group position={[3.0,0.96,-1.8]}>
        <mesh><cylinderGeometry args={[0.12,0.15,0.04,12]} /><meshStandardMaterial color="#2c3e50" /></mesh>
        <mesh position={[0,0.2,0]}><cylinderGeometry args={[0.02,0.02,0.4,6]} /><meshStandardMaterial color="#7f8c8d" metalness={0.8} /></mesh>
        <mesh position={[0.08,0.38,0]} rotation={[0,0,0.3]}><coneGeometry args={[0.12,0.15,12,1,true]} /><meshStandardMaterial color="#f1c40f" emissive="#f39c12" emissiveIntensity={0.4} side={THREE.DoubleSide} /></mesh>
        <pointLight position={[0.08,0.32,0]} intensity={0.3} color="#fff5e6" distance={2} />
      </group>
      {/* Pencil cup on desk */}
      <mesh position={[1.3,1.05,-1.7]}><cylinderGeometry args={[0.06,0.06,0.15,8]} /><meshStandardMaterial color="#34495e" /></mesh>
      {[0,0.04,-0.03].map((dx,i) => <mesh key={`pn${i}`} position={[1.3+dx,1.18,-1.7]}><cylinderGeometry args={[0.008,0.008,0.15,4]} /><meshStandardMaterial color={['#e74c3c','#f39c12','#2ecc71'][i]} /></mesh>)}

      {/* ══ CABINET — detailed with doors ══ */}
      <RoundedBox args={[0.85,2.8,0.7]} position={[4.3,1.4,-2.3]} radius={0.03} castShadow><meshStandardMaterial color="#a07848" roughness={0.55} /></RoundedBox>
      <mesh position={[4.3,1.7,-2.3]}><boxGeometry args={[0.8,0.03,0.65]} /><meshStandardMaterial color="#8B6914" /></mesh>
      <mesh position={[4.3,0.6,-2.3]}><boxGeometry args={[0.8,0.03,0.65]} /><meshStandardMaterial color="#8B6914" /></mesh>
      {[2.1,1.3,0.5].map((y,i) => <mesh key={`ck${i}`} position={[4.3,y,-1.94]}><sphereGeometry args={[0.04,8,8]} /><meshStandardMaterial color="#D4A843" metalness={0.9} roughness={0.1} /></mesh>)}
      {/* Door line */}
      <mesh position={[4.3,1.4,-1.95]}><boxGeometry args={[0.01,2.7,0.01]} /><meshStandardMaterial color="#7B5B28" /></mesh>

      {/* ══ BED — detailed ══ */}
      {/* Bed frame */}
      <RoundedBox args={[2.3,0.25,1.6]} position={[-3.5,0.22,1.5]} radius={0.04} castShadow><meshStandardMaterial color="#5D4037" roughness={0.7} /></RoundedBox>
      {/* Headboard */}
      <RoundedBox args={[0.1,1.2,1.6]} position={[-4.6,0.7,1.5]} radius={0.04}><meshStandardMaterial color="#5D4037" /></RoundedBox>
      {/* Mattress */}
      <RoundedBox args={[2.1,0.2,1.4]} position={[-3.5,0.42,1.5]} radius={0.06}><meshStandardMaterial color="#ddd6cc" roughness={0.9} /></RoundedBox>
      {/* Pillow */}
      <RoundedBox args={[0.5,0.15,0.35]} position={[-4.3,0.58,1.5]} radius={0.07}><meshStandardMaterial color="#fff" roughness={0.95} /></RoundedBox>
      {/* Blanket */}
      <RoundedBox args={[1.5,0.06,1.3]} position={[-3.2,0.55,1.5]} radius={0.03}><meshStandardMaterial color="#5B8FA8" roughness={0.8} /></RoundedBox>
      {/* Blanket fold */}
      <mesh position={[-2.45,0.6,1.5]}><boxGeometry args={[0.2,0.12,1.2]} /><meshStandardMaterial color="#4A7A90" roughness={0.8} /></mesh>

      {/* ══ SIDE TABLE ══ */}
      <RoundedBox args={[0.7,0.06,0.7]} position={[-4.2,1.25,-1.8]} radius={0.02} castShadow><meshStandardMaterial color="#a07848" /></RoundedBox>
      <mesh position={[-4.2,0.62,-1.8]}><cylinderGeometry args={[0.05,0.05,1.25,8]} /><meshStandardMaterial color="#7B5B28" /></mesh>
      {/* Mug on side table */}
      <mesh position={[-4.0,1.35,-1.7]}><cylinderGeometry args={[0.05,0.04,0.1,8]} /><meshStandardMaterial color="#e74c3c" /></mesh>

      {/* ══ POTTED PLANT ══ */}
      <group position={[-4.5,0,-3.2]}>
        <mesh position={[0,0.15,0]}><cylinderGeometry args={[0.18,0.14,0.3,8]} /><meshStandardMaterial color="#8B4513" roughness={0.9} /></mesh>
        <mesh position={[0,0.35,0]}><sphereGeometry args={[0.12,8,8]} /><meshStandardMaterial color="#3d2b1f" /></mesh>
        {[0,0.8,-0.6,1.2,-1.0].map((a,i) => (
          <mesh key={`lf${i}`} position={[Math.sin(a)*0.08, 0.5+i*0.08, Math.cos(a)*0.08]} rotation={[0.3*Math.cos(a),a,0.3*Math.sin(a)]}>
            <sphereGeometry args={[0.1+i*0.01,6,6]} /><meshStandardMaterial color={i<2?'#27ae60':'#2ecc71'} />
          </mesh>
        ))}
      </group>

      {/* ══ ANOTHER PLANT (right corner) ══ */}
      <group position={[4.5,0,2.5]}>
        <mesh position={[0,0.2,0]}><cylinderGeometry args={[0.15,0.12,0.4,8]} /><meshStandardMaterial color="#6B4F12" /></mesh>
        {[0,1.0,2.0,3.0].map((a,i) => (
          <mesh key={`rp${i}`} position={[Math.sin(a)*0.06, 0.45+i*0.06, Math.cos(a)*0.06]}>
            <sphereGeometry args={[0.08,6,6]} /><meshStandardMaterial color="#1abc9c" />
          </mesh>
        ))}
      </group>

      {/* ══ RUG — oval ══ */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.008,0.5]}>
        <circleGeometry args={[2.2,32]} />
        <meshStandardMaterial color="#c4956a" roughness={1} transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.009,0.5]}>
        <ringGeometry args={[1.8,2.2,32]} />
        <meshStandardMaterial color="#a07040" roughness={1} transparent opacity={0.3} />
      </mesh>

      {/* ══ SMALL SHELF (right wall) ══ */}
      <RoundedBox args={[0.4,0.08,1.8]} position={[4.8,2.2,-2.3]} radius={0.02} rotation={[0,Math.PI/2,0]} castShadow>
        <meshStandardMaterial color="#a07848" />
      </RoundedBox>

      {/* ══ TOY BOX on floor ══ */}
      <RoundedBox args={[0.6,0.4,0.4]} position={[-2.0,0.2,-3.2]} radius={0.04}>
        <meshStandardMaterial color="#e74c3c" roughness={0.7} />
      </RoundedBox>
      {/* Toy sticking out */}
      <mesh position={[-1.85,0.45,-3.15]}><sphereGeometry args={[0.08,8,8]} /><meshStandardMaterial color="#f1c40f" /></mesh>

      {/* ══ SHOES by door ══ */}
      {[[-1.5,0.06,3.5],[- 1.3,0.06,3.4]].map(([x,y,z],i) => (
        <mesh key={`sh${i}`} position={[x,y,z]} rotation={[0,0.3*i,0]}><boxGeometry args={[0.2,0.1,0.35]} /><meshStandardMaterial color={i===0?'#2c3e50':'#34495e'} /></mesh>
      ))}

      {/* ══ DOORWAY (right side of back wall) ══ */}
      <mesh position={[4.2,1.3,-3.95]}><planeGeometry args={[1.2,2.6]} /><meshStandardMaterial color="#2c1810" /></mesh>
      <mesh position={[4.2,2.65,-3.93]}><boxGeometry args={[1.3,0.08,0.06]} /><meshStandardMaterial color="#6B4F12" /></mesh>
      {[3.58,4.82].map((x,i) => <mesh key={`dj${i}`} position={[x,1.3,-3.93]}><boxGeometry args={[0.08,2.65,0.06]} /><meshStandardMaterial color="#6B4F12" /></mesh>)}

      {/* ══ CEILING LIGHT ══ */}
      <mesh position={[0,5.8,0]}><cylinderGeometry args={[0.04,0.04,0.3,6]} /><meshStandardMaterial color="#7f8c8d" metalness={0.8} /></mesh>
      <mesh position={[0,5.6,0]}><sphereGeometry args={[0.2,12,12]} /><meshStandardMaterial color="#fff8e7" emissive="#fff5e6" emissiveIntensity={0.6} transparent opacity={0.9} /></mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARACTER — with limbs and walk animation
// ═══════════════════════════════════════════════════════════════════════════════
function Character({ target, onArrived, bagCount }) {
  const group = useRef()
  const lArmRef = useRef()
  const rArmRef = useRef()
  const lLegRef = useRef()
  const rLegRef = useRef()
  const targetVec = useRef(null)
  const arrived = useRef(false)
  const walkT = useRef(0)
  const isWalking = useRef(false)

  useEffect(() => {
    if (target) {
      targetVec.current = new THREE.Vector3(target[0], 0, target[2])
      arrived.current = false
      isWalking.current = true
    }
  }, [target])

  useFrame((_, dt) => {
    if (!group.current) return
    const g = group.current

    if (targetVec.current && !arrived.current) {
      const dir = new THREE.Vector3().subVectors(targetVec.current, g.position)
      dir.y = 0
      const dist = dir.length()
      if (dist < 0.25) {
        arrived.current = true; targetVec.current = null; isWalking.current = false
        onArrived()
        return
      }
      const step = Math.min(3.5 * dt, dist)
      dir.normalize().multiplyScalar(step)
      g.position.add(dir)
      g.rotation.y = Math.atan2(dir.x, dir.z)
      walkT.current += dt * 12
    } else {
      walkT.current *= 0.9 // slow down
    }

    // Limb animation
    const swing = Math.sin(walkT.current) * (isWalking.current ? 0.6 : 0.05)
    if (lArmRef.current) lArmRef.current.rotation.x = swing
    if (rArmRef.current) rArmRef.current.rotation.x = -swing
    if (lLegRef.current) lLegRef.current.rotation.x = -swing * 0.8
    if (rLegRef.current) rLegRef.current.rotation.x = swing * 0.8

    // Body bob
    g.children[0].position.y = isWalking.current ? 0.52 + Math.abs(Math.sin(walkT.current * 2)) * 0.04 : 0.52
  })

  const bpS = Math.min(1.3, 0.3 + bagCount * 0.08)

  return (
    <group ref={group} position={[0, 0, 1]}>
      {/* Torso */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.3, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color="#fcd9b6" roughness={0.8} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.03, -0.02]}>
        <sphereGeometry args={[0.12, 12, 8, 0, Math.PI*2, 0, Math.PI/2]} />
        <meshStandardMaterial color="#3d1f00" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.05, 0.94, 0.12]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh position={[0.05, 0.94, 0.12]}><sphereGeometry args={[0.022, 8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
      {/* Mouth */}
      <mesh position={[0, 0.87, 0.13]}><boxGeometry args={[0.06, 0.015, 0.01]} /><meshStandardMaterial color="#c0392b" /></mesh>
      {/* Left arm */}
      <group ref={lArmRef} position={[-0.2, 0.6, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.04, 0.2, 6, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>
        <mesh position={[0, -0.28, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#fcd9b6" /></mesh>
      </group>
      {/* Right arm */}
      <group ref={rArmRef} position={[0.2, 0.6, 0]}>
        <mesh position={[0, -0.12, 0]}><capsuleGeometry args={[0.04, 0.2, 6, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>
        <mesh position={[0, -0.28, 0]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#fcd9b6" /></mesh>
      </group>
      {/* Left leg */}
      <group ref={lLegRef} position={[-0.08, 0.25, 0]}>
        <mesh position={[0, -0.13, 0]}><capsuleGeometry args={[0.05, 0.2, 6, 8]} /><meshStandardMaterial color="#1e3a5f" /></mesh>
        <mesh position={[0, -0.28, 0.03]}><boxGeometry args={[0.08, 0.05, 0.12]} /><meshStandardMaterial color="#5D4037" /></mesh>
      </group>
      {/* Right leg */}
      <group ref={rLegRef} position={[0.08, 0.25, 0]}>
        <mesh position={[0, -0.13, 0]}><capsuleGeometry args={[0.05, 0.2, 6, 8]} /><meshStandardMaterial color="#1e3a5f" /></mesh>
        <mesh position={[0, -0.28, 0.03]}><boxGeometry args={[0.08, 0.05, 0.12]} /><meshStandardMaterial color="#5D4037" /></mesh>
      </group>
      {/* Backpack */}
      <RoundedBox args={[0.22*bpS, 0.28*bpS, 0.14*bpS]} position={[0, 0.52, -0.18]} radius={0.03} castShadow>
        <meshStandardMaterial color="#e74c3c" roughness={0.6} />
      </RoundedBox>
      {/* Backpack strap */}
      <mesh position={[-0.1, 0.62, -0.08]}><boxGeometry args={[0.02, 0.2, 0.02]} /><meshStandardMaterial color="#c0392b" /></mesh>
      <mesh position={[0.1, 0.62, -0.08]}><boxGeometry args={[0.02, 0.2, 0.02]} /><meshStandardMaterial color="#c0392b" /></mesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM 3D
// ═══════════════════════════════════════════════════════════════════════════════
function Item3D({ item, onClick, waterLevel, disabled }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const sub = item.pos[1] < waterLevel

  const geo = useMemo(() => {
    const s = item.sz
    switch(item.cat) {
      case 'W': return <sphereGeometry args={[s, 16, 16]} />
      case 'M': return <boxGeometry args={[s*1.4, s, s*1.2]} />
      case 'T': return <cylinderGeometry args={[s*0.4, s*0.5, s*1.8, 8]} />
      case 'F': return <boxGeometry args={[s*1.2, s*0.8, s]} />
      case 'S': return <coneGeometry args={[s*0.8, s*1.5, 6]} />
      case 'C': return <boxGeometry args={[s*1.3, s*0.9, s*0.7]} />
      case 'N': return <boxGeometry args={[s*1.6, s*0.15, s*1.2]} />
      default: return <boxGeometry args={[s, s, s]} />
    }
  }, [item])

  useFrame((state) => {
    if (!ref.current) return
    if (hovered && !sub) ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.1)
    else ref.current.scale.setScalar(1)
  })

  const Wrap = item.trap ? 'group' : Float
  const wp = item.trap ? {} : { speed: 1.5, rotationIntensity: 0.15, floatIntensity: 0.3 }

  return (
    <Wrap {...wp}>
      <group position={item.pos}>
        <mesh ref={ref} castShadow
          onClick={e => { e.stopPropagation(); if (!sub && !disabled) onClick(item) }}
          onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
          {geo}
          <meshStandardMaterial color={hovered && !sub ? '#fbbf24' : item.color} roughness={0.45} metalness={item.cat==='T'?0.6:0.1} transparent={sub} opacity={sub?0.2:1} />
        </mesh>
        {/* Glow ring on hover */}
        {hovered && !sub && (
          <mesh rotation={[-Math.PI/2,0,0]} position={[0,-item.sz*0.5,0]}>
            <ringGeometry args={[item.sz*0.8, item.sz*1.2, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
        )}
        <Html position={[0, item.sz+0.2, 0]} center distanceFactor={9} style={{pointerEvents:'none'}}>
          <div style={{fontSize: item.trap?26:18, textShadow:'0 2px 8px rgba(0,0,0,0.6)', opacity:sub?0.15:1}}>{item.emoji}</div>
        </Html>
        {hovered && !sub && (
          <Html position={[0, item.sz+0.5, 0]} center distanceFactor={9} style={{pointerEvents:'none'}}>
            <div style={{background:'rgba(15,23,42,0.92)',color:'#f1f5f9',padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:700,whiteSpace:'nowrap',boxShadow:'0 4px 16px rgba(0,0,0,0.4)'}}>
              {item.name} · {item.wt}lb · ⭐{item.util}
            </div>
          </Html>
        )}
        {item.trap && <Html position={[0,-item.sz-0.08,0]} center distanceFactor={9} style={{pointerEvents:'none'}}>
          <div style={{background:'#dc2626',color:'#fff',padding:'2px 7px',borderRadius:10,fontSize:9,fontWeight:800}}>{item.wt}lbs</div>
        </Html>}
      </group>
    </Wrap>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WATER
// ═══════════════════════════════════════════════════════════════════════════════
function Water({ level }) {
  const ref = useRef()
  useFrame(s => { if (ref.current) ref.current.position.y = level + Math.sin(s.clock.elapsedTime*2)*0.015 })
  if (level <= 0.02) return null
  return (
    <group>
      <mesh ref={ref} rotation={[-Math.PI/2,0,0]}>
        <planeGeometry args={[10,8]} />
        <meshStandardMaterial color="#1e64c8" transparent opacity={0.5} roughness={0.05} metalness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Foam/edge highlight */}
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,level+0.01,0]}>
        <planeGeometry args={[10,8]} />
        <meshBasicMaterial color="#4da6ff" transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

function Lights({ urgency }) {
  return (
    <>
      <ambientLight intensity={urgency ? 0.3 : 0.5} color={urgency ? '#ffaa88' : '#fff8f0'} />
      <pointLight position={[0,5.5,0]} intensity={1.8} color="#fff5e6" castShadow shadow-mapSize={1024} />
      <pointLight position={[-3,3,2]} intensity={0.4} color="#ffd700" />
      <pointLight position={[4,2,-1]} intensity={0.35} color="#87CEEB" />
      {urgency && <pointLight position={[0,2,0]} intensity={0.7} color="#ff4444" />}
    </>
  )
}

function PickupFX({ position, active }) {
  if (!active || !position) return null
  return <Sparkles position={position} count={40} scale={1.8} size={5} speed={3} color="#fbbf24" />
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Module1_GoBag() {
  const { dispatch: gd } = useGame()
  const [phase, setPhase] = useState('intro')
  const [bag, setBag] = useState([])
  const [time, setTime] = useState(TIMER)
  const [charTarget, setCharTarget] = useState(null)
  const [pending, setPending] = useState(null)
  const [sparkle, setSparkle] = useState(null)
  const [result, setResult] = useState(null)
  const [walking, setWalking] = useState(false)
  const timerRef = useRef(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (phase !== 'play') return
    doneRef.current = false
    timerRef.current = setInterval(() => {
      setTime(p => { if (p<=1){clearInterval(timerRef.current);setTimeout(()=>{if(!doneRef.current)finish()},0);return 0} return p-1 })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const finish = useCallback(() => {
    if (doneRef.current) return; doneRef.current = true; clearInterval(timerRef.current)
    const r = computeScore(bag); setResult(r)
    gd({ type:'RECORD_SCORE', payload:{key:'flood-1',result:{score:r.score,passed:r.passed}} }); setPhase('result')
  }, [bag, gd])

  const clickItem = useCallback(item => {
    if (walking || bag.find(i=>i.id===item.id)) return
    setWalking(true); setPending(item); setCharTarget(item.pos)
  }, [walking, bag])

  const onArrived = useCallback(() => {
    if (!pending) return
    setBag(p => [...p, pending]); setSparkle(pending.pos)
    setTimeout(() => setSparkle(null), 900)
    setPending(null); setCharTarget(null); setWalking(false)
  }, [pending])

  const bagWt = bag.reduce((s,i)=>s+i.wt,0)
  const over = bagWt > WEIGHT_LIMIT
  const waterLevel = phase==='play' ? Math.min(2.1, ((TIMER-time)/TIMER)*2.8) : 0
  const urg = time <= 15
  const bagIds = useMemo(() => bag.map(i=>i.id), [bag])

  // INTRO
  if (phase === 'intro') return (
    <div style={S.full}>
      <div style={S.card}>
        <div style={{fontSize:72}}>🎒</div>
        <h1 style={{color:'#1e293b',fontSize:28,margin:'0 0 6px',fontWeight:800}}>The Go-Bag</h1>
        <p style={{color:'#64748b',fontSize:14,lineHeight:1.7,margin:'0 0 14px'}}>
          Flood warning! <strong style={{color:'#dc2626'}}>60 seconds</strong> to grab survival gear. Water is rising!
        </p>
        <div style={{background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:12,padding:'12px 16px',marginBottom:14,textAlign:'left',width:'100%'}}>
          <ul style={{margin:0,paddingLeft:18,color:'#78350f',fontSize:12,lineHeight:2}}>
            <li><strong>Click items</strong> — your character walks & grabs them</li>
            <li>Weight limit: <strong>25 lbs</strong></li>
            <li><strong>Small shelf items</strong> = smart (high utility, low weight)</li>
            <li><strong>Big floor items</strong> = TRAPS (heavy, low utility)</li>
            <li>Water rises — floor items get <strong>submerged!</strong></li>
          </ul>
        </div>
        <button onClick={()=>setPhase('play')} style={S.btn}>🚨 Start — 60 Seconds!</button>
        <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.ghost,marginTop:10}}>← Back</button>
      </div>
    </div>
  )

  // RESULT
  if (phase === 'result' && result) return (
    <div style={S.full}>
      <div style={{...S.card,maxWidth:540}}>
        <div style={{fontSize:56}}>{result.passed?'✅':'❌'}</div>
        <h1 style={{color:result.passed?'#16a34a':'#dc2626',fontSize:26,margin:'6px 0'}}>{result.passed?'Bag Packed!':'Failed'}</h1>
        <div style={{fontSize:44,fontWeight:800,color:result.passed?'#16a34a':'#dc2626'}}>{result.score}/100</div>
        <p style={{color:'#64748b',fontSize:13,margin:'6px 0 12px'}}>{result.msg}</p>
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:12,width:'100%',textAlign:'left',marginBottom:10}}>
          <div style={{fontWeight:700,color:'#334155',marginBottom:4,fontSize:12}}>Bag ({bagWt.toFixed(1)}/{WEIGHT_LIMIT} lbs)</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
            {bag.map(i => <span key={i.id} style={{fontSize:10,padding:'2px 6px',borderRadius:12,background:i.trap?'#fef2f2':'#f0fdf4',border:`1px solid ${i.trap?'#fecaca':'#bbf7d0'}`,color:i.trap?'#991b1b':'#166534'}}>{i.emoji} {i.name} ({i.wt}lb)</span>)}
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          <button onClick={()=>{setBag([]);setTime(TIMER);setResult(null);setWalking(false);setCharTarget(null);setPending(null);setPhase('intro')}} style={S.btn}>🔄 Retry</button>
          <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.btn,background:'#64748b'}}>📋 Modules</button>
        </div>
      </div>
    </div>
  )

  // PLAY
  return (
    <div style={{width:'100vw',height:'100vh',position:'relative',overflow:'hidden'}}>
      <Canvas shadows camera={{position:[9,7,9],fov:32,near:0.1,far:100}} style={{background:urg?'#3d1520':'#78B8D0',transition:'background 3s'}}>
        <Lights urgency={urg} />
        <Environment preset="apartment" background={false} />
        <DetailedRoom />
        <Character target={charTarget} onArrived={onArrived} bagCount={bag.length} />
        {ITEMS.map(i => !bagIds.includes(i.id) && <Item3D key={i.id} item={i} waterLevel={waterLevel} onClick={clickItem} disabled={walking} />)}
        <Water level={waterLevel} />
        <PickupFX position={sparkle} active={!!sparkle} />
        <ContactShadows position={[0,0.005,0]} opacity={0.5} scale={14} blur={2.5} />
        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI/5} maxPolarAngle={Math.PI/3} minAzimuthAngle={-Math.PI/6} maxAzimuthAngle={Math.PI/6} target={[0,1.5,0]} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.9} intensity={0.3} radius={0.4} />
          <Vignette eskil={false} offset={0.1} darkness={urg?0.7:0.35} />
        </EffectComposer>
      </Canvas>

      {/* HUD */}
      <div style={S.hud}>
        <button onClick={()=>gd({type:'BACK_TO_MODULES'})} style={{...S.ghost,color:'#fff',textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>← Quit</button>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{...S.pill,background:urg?'#dc2626':'rgba(0,0,0,0.5)',animation:urg?'pulse .5s infinite':'none'}}>⏱ {time}s</div>
          <div style={{...S.pill,background:over?'rgba(220,38,38,0.9)':'rgba(0,0,0,0.5)'}}>⚖️ {bagWt.toFixed(1)}/{WEIGHT_LIMIT}</div>
          <div style={S.pill}>🎒 {bag.length}</div>
          <button onClick={finish} style={{...S.pill,cursor:'pointer',background:'#16a34a',border:'none',fontWeight:700}}>✅ Done</button>
        </div>
      </div>

      {/* Bag panel */}
      <div style={S.bagP}>
        <div style={{fontWeight:800,fontSize:14,color:'#1e293b',marginBottom:4}}>🎒 Bag</div>
        <div style={{height:8,background:'#e2e8f0',borderRadius:4,marginBottom:6,overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:4,transition:'width .3s',width:`${Math.min(100,(bagWt/WEIGHT_LIMIT)*100)}%`,background:over?'#dc2626':bagWt>20?'#f59e0b':'#16a34a'}} />
        </div>
        <div style={{fontSize:10,color:over?'#dc2626':'#64748b',fontWeight:700,marginBottom:6}}>{bagWt.toFixed(1)}/{WEIGHT_LIMIT} lbs {over&&'⚠️'}</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {bag.length===0?<div style={{color:'#94a3b8',fontSize:11,textAlign:'center',padding:14}}>Click items!</div>:
          bag.map(i=><div key={i.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 5px',marginBottom:2,borderRadius:6,background:i.trap?'#fef2f2':'#f0fdf4',border:`1px solid ${i.trap?'#fecaca':'#bbf7d0'}`}}>
            <span style={{fontSize:14}}>{i.emoji}</span>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:9,fontWeight:700,color:'#334155',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i.name}</div><div style={{fontSize:8,color:'#64748b'}}>{i.wt}lb</div></div>
            <button onClick={()=>setBag(p=>p.filter(x=>x.id!==i.id))} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',fontSize:11}}>✕</button>
          </div>)}
        </div>
      </div>

      {walking && <div style={{position:'absolute',bottom:16,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:'#fbbf24',padding:'7px 18px',borderRadius:20,fontSize:12,fontWeight:700,zIndex:20}}>🏃 Grabbing {pending?.name}...</div>}
      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
    </div>
  )
}

const S = {
  full:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#f8fafc,#e2e8f0)',fontFamily:'system-ui,sans-serif',padding:16},
  card:{maxWidth:460,padding:'28px 24px',textAlign:'center',background:'#fff',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,0.1)',display:'flex',flexDirection:'column',alignItems:'center'},
  btn:{padding:'12px 28px',fontSize:14,fontWeight:700,background:'#2563eb',color:'#fff',border:'none',borderRadius:12,cursor:'pointer',boxShadow:'0 4px 16px rgba(37,99,235,0.3)'},
  ghost:{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:13},
  hud:{position:'absolute',top:0,left:0,right:190,zIndex:20,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'linear-gradient(180deg,rgba(0,0,0,0.35),transparent)'},
  pill:{background:'rgba(0,0,0,0.5)',padding:'5px 12px',borderRadius:20,color:'#fff',fontWeight:700,fontSize:13,fontFamily:'monospace'},
  bagP:{position:'absolute',top:0,right:0,bottom:0,width:190,background:'#fff',borderLeft:'1px solid #e2e8f0',padding:'10px 8px',display:'flex',flexDirection:'column',zIndex:20,overflowY:'auto'},
}
