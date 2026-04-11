/**
 * Module 1 — The Go-Bag: 3D Room Grab Game
 * Isometric 3D room built with react-three-fiber.
 * Character walks to items, picks them up. Water rises. 60 seconds.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Float, Html, ContactShadows, RoundedBox, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../../context/GameContext'

// ═══════════════════════════════════════════════════════════════════════════════
// ITEMS — each has 3D position [x, y, z] in room coordinates
// Room: 10 wide (x: -5..5), 6 tall (y: 0..6), 8 deep (z: -4..4)
// ═══════════════════════════════════════════════════════════════════════════════
const ITEMS = [
  // ── SMART (small, hidden, high utility) ───────────────────────────────────
  { id:'w3', name:'LifeStraw',      emoji:'💧', cat:'W', wt:0.10, util:96, trap:false, tip:'Filters 1,000 gal. 0.1 lbs!',       pos:[3.2, 3.6, -3.6],  sz:0.18, color:'#3b82f6' },
  { id:'w4', name:'Aquatabs',       emoji:'💊', cat:'W', wt:0.05, util:88, trap:false, tip:'50 purification tablets.',            pos:[-3.8, 3.6, -3.6], sz:0.14, color:'#60a5fa' },
  { id:'w5', name:'Sawyer Filter',  emoji:'🔩', cat:'W', wt:0.25, util:92, trap:false, tip:'100k gallon lifetime filter.',       pos:[1.0, 1.1, -1.5],  sz:0.18, color:'#2563eb' },
  { id:'m2', name:'IFAK Kit',       emoji:'🩹', cat:'M', wt:0.75, util:90, trap:false, tip:'Tourniquet + chest seal + gauze.',   pos:[-2.5, 3.6, -3.6], sz:0.22, color:'#ef4444' },
  { id:'m3', name:'Medications',    emoji:'💊', cat:'M', wt:0.30, util:96, trap:false, tip:'Your prescriptions. Irreplaceable.', pos:[-4.2, 1.5, -2.0], sz:0.16, color:'#f87171' },
  { id:'m4', name:'N95 Masks',      emoji:'😷', cat:'M', wt:0.20, util:72, trap:false, tip:'Mold + sewage protection.',          pos:[4.2, 2.4, -2.5],  sz:0.16, color:'#fca5a5' },
  { id:'t2', name:'Leatherman',     emoji:'🔪', cat:'T', wt:0.55, util:90, trap:false, tip:'25 functions. Essential.',            pos:[1.8, 1.1, -1.8],  sz:0.18, color:'#94a3b8' },
  { id:'t3', name:'Paracord',       emoji:'🪢', cat:'T', wt:0.40, util:76, trap:false, tip:'550lb test. 40+ uses.',              pos:[3.8, 2.4, -2.5],  sz:0.16, color:'#a3a3a3' },
  { id:'t4', name:'Firestarter',    emoji:'🔥', cat:'T', wt:0.15, util:80, trap:false, tip:'Windproof lighter + matches.',       pos:[-1.0, 0.3, 1.5],  sz:0.14, color:'#f59e0b' },
  { id:'t5', name:'Glass Breaker',  emoji:'🔨', cat:'T', wt:0.08, util:72, trap:false, tip:'Escape trapped vehicles.',           pos:[2.5, 1.1, -1.2],  sz:0.14, color:'#6b7280' },
  { id:'s2', name:'Bivvy Sack',     emoji:'🌡️', cat:'S', wt:0.50, util:84, trap:false, tip:'Reflects 80% body heat.',            pos:[4.0, 0.3, 1.0],   sz:0.20, color:'#f97316' },
  { id:'s3', name:'Tarp 8×10',      emoji:'🏕️', cat:'S', wt:1.00, util:80, trap:false, tip:'Rain shelter. 1 lb.',                pos:[-0.5, 0.3, 2.0],  sz:0.22, color:'#84cc16' },
  { id:'c1', name:'NOAA Radio',     emoji:'📻', cat:'C', wt:0.85, util:84, trap:false, tip:'Hand-crank emergency radio.',        pos:[-1.5, 3.6, -3.6], sz:0.22, color:'#eab308' },
  { id:'c3', name:'Sat Messenger',  emoji:'🛰️', cat:'C', wt:0.35, util:92, trap:false, tip:'SOS via satellite.',                 pos:[1.2, 3.6, -3.6],  sz:0.16, color:'#a855f7' },
  { id:'n1', name:'Map+Compass',    emoji:'🗺️', cat:'N', wt:0.20, util:96, trap:false, tip:'No battery needed.',                 pos:[0.0, 3.6, -3.6],  sz:0.18, color:'#d97706' },
  { id:'f3', name:'Energy Bars',    emoji:'🍫', cat:'F', wt:0.75, util:74, trap:false, tip:'2,000 cal/lb. No prep.',             pos:[-3.5, 0.3, 0.5],  sz:0.18, color:'#92400e' },
  { id:'f4', name:'Freeze-Dried',   emoji:'🍱', cat:'F', wt:0.90, util:85, trap:false, tip:'3-day food supply.',                 pos:[-4.0, 2.4, -2.5], sz:0.20, color:'#b45309' },
  { id:'p3', name:'Headlamp',       emoji:'💡', cat:'T', wt:0.35, util:82, trap:false, tip:'Hands-free light.',                  pos:[3.5, 1.1, -1.0],  sz:0.16, color:'#facc15' },

  // ── TRAPS (big, obvious, heavy) ───────────────────────────────────────────
  { id:'w1', name:'Water Jug 1gal', emoji:'🪣', cat:'W', wt:8.34, util:22, trap:true, tip:'8.34 lbs! Weight trap.',              pos:[-2.0, 0.3, 2.5],  sz:0.45, color:'#1d4ed8' },
  { id:'w2', name:'Water Jugs 2gal',emoji:'🪣', cat:'W', wt:16.68,util:30, trap:true, tip:'16.68 lbs — 67% budget gone.',        pos:[2.0, 0.3, 2.8],   sz:0.55, color:'#1e40af' },
  { id:'f1', name:'Canned Beans ×6',emoji:'🥫', cat:'F', wt:9.00, util:32, trap:true, tip:'9 lbs of cans. Terrible.',            pos:[0.0, 0.3, 2.2],   sz:0.42, color:'#b91c1c' },
  { id:'t1', name:'Mechanic Toolkit',emoji:'🧰',cat:'T', wt:15.0, util:12, trap:true, tip:'15 lbs! Do not pack.',                pos:[3.5, 0.3, 2.5],   sz:0.55, color:'#475569' },
  { id:'s1', name:'Family Tent',    emoji:'⛺', cat:'S', wt:18.0, util:18, trap:true, tip:'18 lbs. Car camping gear.',            pos:[-3.5, 0.3, 2.8],  sz:0.65, color:'#15803d' },
  { id:'m1', name:'Full First Aid', emoji:'🏥', cat:'M', wt:3.50, util:52, trap:true, tip:'3.5 lbs. Over-engineered.',           pos:[-1.0, 0.3, 1.0],  sz:0.38, color:'#dc2626' },
]

const WEIGHT_LIMIT = 25
const TIMER = 60
const ESSENTIAL_IDS = ['w3','m2','t2','n1']

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════════════════════
function computeScore(bag) {
  const wt = bag.reduce((s, i) => s + i.wt, 0)
  if (wt > WEIGHT_LIMIT) return { score: Math.max(5, 35 - Math.round((wt - WEIGHT_LIMIT) * 2)), passed: false, msg: `BAG TOO HEAVY (${wt.toFixed(1)} lbs). You can't run from the flood.` }
  const hasWater = bag.some(i => ['w3','w4','w5'].includes(i.id))
  const hasMed = bag.some(i => i.cat === 'M')
  const hasNav = bag.some(i => i.cat === 'N')
  if (!hasWater) return { score: 15, passed: false, msg: 'No water solution! Dehydration kills in 72 hours.' }
  if (!hasMed) return { score: 25, passed: false, msg: 'No medical supplies! Flood wounds cause fatal infection.' }
  if (!hasNav) return { score: 30, passed: false, msg: 'No navigation! Cell towers fail in disasters.' }
  const avgUtil = bag.length ? Math.round(bag.reduce((s, i) => s + i.util, 0) / bag.length) : 0
  const mobil = Math.round(((WEIGHT_LIMIT - wt) / WEIGHT_LIMIT) * 100)
  const essBonus = ESSENTIAL_IDS.every(id => bag.some(i => i.id === id)) ? 15 : 0
  const trapPen = bag.filter(i => i.trap).length * 5
  const total = Math.min(100, Math.max(40, Math.round(avgUtil * 0.35 + mobil * 0.3 + essBonus * 1.5 - trapPen)))
  return { score: total, passed: total >= 55, msg: total >= 55 ? `Smart loadout! ${wt.toFixed(1)} lbs packed.` : `Score ${total}. Too many heavy items.` }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3D SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Room (walls, floor, furniture) ───────────────────────────────────────────
function Room() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#b8845a" roughness={0.8} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 3, -4]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#F5E6D3" roughness={0.9} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-5, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#EDD9BE" roughness={0.9} />
      </mesh>

      {/* Right wall */}
      <mesh position={[5, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#EDD9BE" roughness={0.9} />
      </mesh>

      {/* Window on back wall */}
      <mesh position={[0, 4, -3.95]}>
        <planeGeometry args={[2.5, 1.8]} />
        <meshStandardMaterial color="#87CEEB" emissive="#87CEEB" emissiveIntensity={0.3} />
      </mesh>
      {/* Window frame */}
      <RoundedBox args={[2.7, 0.1, 0.1]} position={[0, 4.9, -3.9]} radius={0.02}>
        <meshStandardMaterial color="#8B7355" />
      </RoundedBox>
      <RoundedBox args={[2.7, 0.1, 0.1]} position={[0, 3.1, -3.9]} radius={0.02}>
        <meshStandardMaterial color="#8B7355" />
      </RoundedBox>
      <RoundedBox args={[0.1, 1.9, 0.1]} position={[0, 4.0, -3.9]} radius={0.02}>
        <meshStandardMaterial color="#8B7355" />
      </RoundedBox>

      {/* ── Shelf (back wall, high) ── */}
      <RoundedBox args={[7, 0.12, 0.5]} position={[0, 3.4, -3.7]} radius={0.03} castShadow>
        <meshStandardMaterial color="#a0845c" roughness={0.6} />
      </RoundedBox>
      {/* Shelf brackets */}
      <mesh position={[-2, 3.15, -3.7]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color="#8B6914" /></mesh>
      <mesh position={[2, 3.15, -3.7]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color="#8B6914" /></mesh>

      {/* ── Desk ── */}
      <RoundedBox args={[2.5, 0.1, 1.2]} position={[2, 0.9, -1.5]} radius={0.03} castShadow>
        <meshStandardMaterial color="#a0845c" roughness={0.5} />
      </RoundedBox>
      {/* Desk legs */}
      {[[-0.6, -0.4], [-0.6, 0.4], [0.6, -0.4], [0.6, 0.4]].map(([dx, dz], i) => (
        <mesh key={`dl${i}`} position={[2 + dx, 0.45, -1.5 + dz]}>
          <boxGeometry args={[0.08, 0.9, 0.08]} /><meshStandardMaterial color="#8B7355" />
        </mesh>
      ))}

      {/* ── Cabinet (right wall) ── */}
      <RoundedBox args={[0.8, 2.8, 0.7]} position={[4.3, 1.4, -2.3]} radius={0.04} castShadow>
        <meshStandardMaterial color="#a0845c" roughness={0.6} />
      </RoundedBox>
      {/* Cabinet shelves */}
      <mesh position={[4.3, 1.6, -2.3]}><boxGeometry args={[0.75, 0.04, 0.65]} /><meshStandardMaterial color="#8B6914" /></mesh>
      {/* Cabinet knobs */}
      <mesh position={[4.3, 2.0, -1.95]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#D4A843" metalness={0.8} /></mesh>
      <mesh position={[4.3, 1.0, -1.95]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#D4A843" metalness={0.8} /></mesh>

      {/* ── Bed ── */}
      <RoundedBox args={[2.2, 0.5, 1.5]} position={[-3.5, 0.35, 1.5]} radius={0.06} castShadow>
        <meshStandardMaterial color="#6B8E9B" roughness={0.7} />
      </RoundedBox>
      {/* Pillow */}
      <RoundedBox args={[0.6, 0.2, 0.4]} position={[-4.2, 0.7, 1.5]} radius={0.08}>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </RoundedBox>
      {/* Blanket */}
      <mesh position={[-3.2, 0.62, 1.5]}>
        <boxGeometry args={[1.4, 0.06, 1.3]} /><meshStandardMaterial color="#8BAAB6" />
      </mesh>

      {/* ── Small side table ── */}
      <RoundedBox args={[0.8, 0.08, 0.8]} position={[-4.2, 1.3, -2]} radius={0.03} castShadow>
        <meshStandardMaterial color="#a0845c" />
      </RoundedBox>
      <mesh position={[-4.2, 0.65, -2]}><cylinderGeometry args={[0.06, 0.06, 1.3, 8]} /><meshStandardMaterial color="#8B7355" /></mesh>

      {/* ── Rug ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.5]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#c4956a" roughness={1} transparent opacity={0.5} />
      </mesh>

      {/* Baseboard trim */}
      <mesh position={[0, 0.08, -3.96]}><boxGeometry args={[10, 0.16, 0.08]} /><meshStandardMaterial color="#8B7355" /></mesh>
      <mesh position={[-4.96, 0.08, 0]}><boxGeometry args={[0.08, 0.16, 8]} /><meshStandardMaterial color="#8B7355" /></mesh>
      <mesh position={[4.96, 0.08, 0]}><boxGeometry args={[0.08, 0.16, 8]} /><meshStandardMaterial color="#8B7355" /></mesh>
    </group>
  )
}

// ── Character ────────────────────────────────────────────────────────────────
function Character({ target, onArrived, bagCount }) {
  const groupRef = useRef()
  const bobRef = useRef(0)
  const targetRef = useRef(null)
  const arrivedRef = useRef(false)

  useEffect(() => {
    if (target) {
      targetRef.current = new THREE.Vector3(target[0], 0, target[2])
      arrivedRef.current = false
    }
  }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const g = groupRef.current

    if (targetRef.current && !arrivedRef.current) {
      const dir = new THREE.Vector3().subVectors(targetRef.current, g.position)
      dir.y = 0
      const dist = dir.length()

      if (dist < 0.2) {
        arrivedRef.current = true
        targetRef.current = null
        onArrived()
        return
      }

      const speed = 3.5
      const step = Math.min(speed * delta, dist)
      dir.normalize().multiplyScalar(step)
      g.position.add(dir)
      g.rotation.y = Math.atan2(dir.x, dir.z)

      // Walk bob
      bobRef.current += delta * 10
      g.children.forEach(c => { if (c.userData.body) c.position.y = 0.55 + Math.sin(bobRef.current) * 0.06 })
    }
  })

  const bpScale = Math.min(1, 0.3 + bagCount * 0.07)

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Body */}
      <mesh position={[0, 0.55, 0]} castShadow userData={{ body: true }}>
        <capsuleGeometry args={[0.18, 0.5, 8, 16]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#fcd9b6" roughness={0.8} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.18, -0.02]}>
        <sphereGeometry args={[0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4a2c0a" />
      </mesh>
      {/* Backpack (grows with items) */}
      <mesh position={[0, 0.55, -0.2]} scale={[bpScale, bpScale, bpScale]} castShadow>
        <boxGeometry args={[0.3, 0.35, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.7} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.06, 1.08, 0.14]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
      <mesh position={[0.06, 1.08, 0.14]}><sphereGeometry args={[0.025, 8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
    </group>
  )
}

// ── Item3D ───────────────────────────────────────────────────────────────────
function Item3D({ item, onClick, waterLevel, disabled }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const submerged = item.pos[1] < waterLevel

  // Shape by category
  const geometry = useMemo(() => {
    switch (item.cat) {
      case 'W': return <sphereGeometry args={[item.sz, 16, 16]} />
      case 'M': return <boxGeometry args={[item.sz * 1.4, item.sz, item.sz * 1.2]} />
      case 'T': return <cylinderGeometry args={[item.sz * 0.4, item.sz * 0.5, item.sz * 1.8, 8]} />
      case 'F': return <boxGeometry args={[item.sz * 1.2, item.sz * 0.8, item.sz]} />
      case 'S': return <coneGeometry args={[item.sz * 0.8, item.sz * 1.5, 6]} />
      case 'C': return <boxGeometry args={[item.sz * 1.3, item.sz * 0.9, item.sz * 0.7]} />
      case 'N': return <boxGeometry args={[item.sz * 1.6, item.sz * 0.15, item.sz * 1.2]} />
      default: return <boxGeometry args={[item.sz, item.sz, item.sz]} />
    }
  }, [item])

  useFrame((state) => {
    if (!meshRef.current) return
    if (hovered && !submerged) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.08)
    } else {
      meshRef.current.scale.setScalar(1)
    }
  })

  const Wrapper = item.trap ? 'group' : Float
  const wrapperProps = item.trap ? {} : { speed: 2, rotationIntensity: 0.2, floatIntensity: 0.4 }

  return (
    <Wrapper {...wrapperProps}>
      <group position={item.pos}>
        <mesh
          ref={meshRef}
          castShadow
          onClick={(e) => { e.stopPropagation(); if (!submerged && !disabled) onClick(item) }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {geometry}
          <meshStandardMaterial
            color={hovered && !submerged ? '#fbbf24' : item.color}
            roughness={0.5}
            metalness={item.cat === 'T' ? 0.6 : 0.1}
            transparent={submerged}
            opacity={submerged ? 0.25 : 1}
          />
        </mesh>
        {/* Emoji label */}
        <Html position={[0, item.sz + 0.25, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div style={{
            fontSize: item.trap ? 28 : 20, textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            opacity: submerged ? 0.2 : 1, transition: 'opacity 0.5s',
            filter: hovered && !submerged ? 'brightness(1.3)' : 'none',
          }}>
            {item.emoji}
          </div>
        </Html>
        {/* Name label on hover */}
        {hovered && !submerged && (
          <Html position={[0, item.sz + 0.55, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: 'rgba(15,23,42,0.9)', color: '#f1f5f9', padding: '4px 10px',
              borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}>
              {item.name} · {item.wt}lb · ⭐{item.util}
            </div>
          </Html>
        )}
        {/* Weight badge on traps */}
        {item.trap && (
          <Html position={[0, -item.sz - 0.1, 0]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div style={{
              background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: 10,
              fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap',
            }}>
              {item.wt} lbs
            </div>
          </Html>
        )}
      </group>
    </Wrapper>
  )
}

// ── Water ────────────────────────────────────────────────────────────────────
function Water({ level }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = level + Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
  })
  if (level <= 0.01) return null
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, level, 0]}>
      <planeGeometry args={[10, 8]} />
      <meshStandardMaterial color="#1e64c8" transparent opacity={0.45} roughness={0.1} metalness={0.3} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Pickup sparkles ──────────────────────────────────────────────────────────
function PickupEffect({ position, active }) {
  if (!active || !position) return null
  return <Sparkles position={position} count={30} scale={1.5} size={4} speed={3} color="#fbbf24" />
}

// ── Lighting ─────────────────────────────────────────────────────────────────
function Lights({ urgency }) {
  return (
    <>
      <ambientLight intensity={urgency ? 0.35 : 0.55} color={urgency ? '#ffaa88' : '#fff5e6'} />
      <pointLight position={[0, 5.5, 0]} intensity={1.5} color="#fff5e6" castShadow shadow-mapSize={1024} />
      <pointLight position={[-3, 3, 2]} intensity={0.5} color="#ffd700" />
      <pointLight position={[4, 2, -1]} intensity={0.4} color="#87CEEB" />
      {urgency && <pointLight position={[0, 2, 0]} intensity={0.8} color="#ff4444" />}
    </>
  )
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
  const [pendingItem, setPendingItem] = useState(null)
  const [sparklePos, setSparklePos] = useState(null)
  const [result, setResult] = useState(null)
  const [walking, setWalking] = useState(false)
  const timerRef = useRef(null)
  const doneRef = useRef(false)

  // Timer
  useEffect(() => {
    if (phase !== 'play') return
    doneRef.current = false
    timerRef.current = setInterval(() => {
      setTime(p => {
        if (p <= 1) { clearInterval(timerRef.current); setTimeout(() => { if (!doneRef.current) finish() }, 0); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase])

  const finish = useCallback(() => {
    if (doneRef.current) return; doneRef.current = true
    clearInterval(timerRef.current)
    const r = computeScore(bag)
    setResult(r)
    gd({ type: 'RECORD_SCORE', payload: { key: 'flood-1', result: { score: r.score, passed: r.passed } } })
    setPhase('result')
  }, [bag, gd])

  const handleItemClick = useCallback((item) => {
    if (walking || bag.find(i => i.id === item.id)) return
    setWalking(true)
    setPendingItem(item)
    setCharTarget(item.pos)
  }, [walking, bag])

  const handleArrived = useCallback(() => {
    if (!pendingItem) return
    setBag(prev => [...prev, pendingItem])
    setSparklePos(pendingItem.pos)
    setTimeout(() => setSparklePos(null), 800)
    setPendingItem(null)
    setCharTarget(null)
    setWalking(false)
  }, [pendingItem])

  const removeItem = useCallback((id) => setBag(prev => prev.filter(i => i.id !== id)), [])

  const bagWt = bag.reduce((s, i) => s + i.wt, 0)
  const overweight = bagWt > WEIGHT_LIMIT
  const waterLevel = phase === 'play' ? Math.min(2.1, ((TIMER - time) / TIMER) * 2.8) : 0
  const urgency = time <= 15
  const bagIds = useMemo(() => bag.map(i => i.id), [bag])

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={S.full}>
        <div style={S.card}>
          <div style={{ fontSize: 72 }}>🎒</div>
          <h1 style={{ color: '#1e293b', fontSize: 30, margin: '0 0 8px', fontWeight: 800 }}>The Go-Bag</h1>
          <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, margin: '0 0 16px' }}>
            A flood is coming. You have <strong style={{ color: '#dc2626' }}>60 seconds</strong> to grab survival gear from your room.
          </p>
          <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: '14px 18px', marginBottom: 16, textAlign: 'left', width: '100%' }}>
            <div style={{ color: '#92400e', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>How to Play</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#78350f', fontSize: 13, lineHeight: 2 }}>
              <li><strong>Click items</strong> in the 3D room — your character walks to grab them</li>
              <li>Weight limit: <strong>25 lbs</strong> — go over and you can't escape</li>
              <li>Small items on <strong>shelves = smart</strong> picks (high utility, low weight)</li>
              <li>Big items on the <strong>floor = TRAPS</strong> (heavy, low utility)</li>
              <li><strong>Water rises</strong> — floor items get submerged!</li>
              <li>Click <strong>Done</strong> when you're satisfied, or wait for the timer</li>
            </ul>
          </div>
          <button onClick={() => setPhase('play')} style={S.btn}>
            🚨 Start — 60 Seconds!
          </button>
          <button onClick={() => gd({ type: 'BACK_TO_MODULES' })} style={{ ...S.ghost, marginTop: 10 }}>← Back to Modules</button>
        </div>
      </div>
    )
  }

  // ── RESULT ─────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div style={S.full}>
        <div style={{ ...S.card, maxWidth: 560 }}>
          <div style={{ fontSize: 64 }}>{result.passed ? '✅' : '❌'}</div>
          <h1 style={{ color: result.passed ? '#16a34a' : '#dc2626', fontSize: 28, margin: '8px 0' }}>
            {result.passed ? 'Bag Packed!' : 'Failed'}
          </h1>
          <div style={{ fontSize: 48, fontWeight: 800, color: result.passed ? '#16a34a' : '#dc2626' }}>{result.score}/100</div>
          <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 16px' }}>{result.msg}</p>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, width: '100%', textAlign: 'left', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#334155', marginBottom: 6, fontSize: 13 }}>Your Bag ({bagWt.toFixed(1)} / {WEIGHT_LIMIT} lbs)</div>
            {bag.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 12 }}>Empty!</div> : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {bag.map(item => (
                  <span key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 16, fontSize: 11, background: item.trap ? '#fef2f2' : '#f0fdf4', border: `1px solid ${item.trap ? '#fecaca' : '#bbf7d0'}`, color: item.trap ? '#991b1b' : '#166534' }}>
                    {item.emoji} {item.name} ({item.wt}lb)
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, width: '100%', textAlign: 'left' }}>
            <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6, fontSize: 13 }}>💡 Key Lessons</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#1e3a5f', fontSize: 12, lineHeight: 1.9 }}>
              <li>LifeStraw (0.1 lb) replaces 100+ lbs of water jugs</li>
              <li>IFAK Trauma Kit addresses top 3 survivable traumas</li>
              <li>Big obvious items are weight TRAPS — low utility per pound</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => { setBag([]); setTime(TIMER); setResult(null); setWalking(false); setCharTarget(null); setPendingItem(null); setPhase('intro') }} style={S.btn}>🔄 Retry</button>
            <button onClick={() => gd({ type: 'BACK_TO_MODULES' })} style={{ ...S.btn, background: '#64748b' }}>📋 Modules</button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY (3D Scene + HUD) ──────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* 3D Canvas — fills viewport */}
      <Canvas
        shadows
        camera={{ position: [8, 7, 8], fov: 35, near: 0.1, far: 100 }}
        style={{ background: urgency ? '#4a1a2e' : '#87CEEB', transition: 'background 3s' }}
      >
        <Lights urgency={urgency} />
        <Room />
        <Character target={charTarget} onArrived={handleArrived} bagCount={bag.length} />

        {ITEMS.map(item => (
          !bagIds.includes(item.id) && (
            <Item3D key={item.id} item={item} waterLevel={waterLevel}
              onClick={handleItemClick} disabled={walking} />
          )
        ))}

        <Water level={waterLevel} />
        <PickupEffect position={sparklePos} active={!!sparklePos} />

        <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={12} blur={2} />

        <OrbitControls
          enablePan={false} enableZoom={false}
          minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI / 3}
          minAzimuthAngle={-Math.PI / 6} maxAzimuthAngle={Math.PI / 6}
          target={[0, 1.5, 0]}
        />
      </Canvas>

      {/* HUD — Top bar */}
      <div style={S.hud}>
        <button onClick={() => gd({ type: 'BACK_TO_MODULES' })} style={{ ...S.ghost, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>← Quit</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...S.hudPill, background: urgency ? '#dc2626' : 'rgba(0,0,0,0.5)', animation: urgency ? 'pulse 0.5s infinite' : 'none' }}>
            ⏱ {time}s
          </div>
          <div style={{ ...S.hudPill, background: overweight ? 'rgba(220,38,38,0.9)' : 'rgba(0,0,0,0.5)' }}>
            ⚖️ {bagWt.toFixed(1)}/{WEIGHT_LIMIT}
          </div>
          <div style={S.hudPill}>🎒 {bag.length}</div>
          <button onClick={finish} style={{ ...S.hudPill, cursor: 'pointer', background: '#16a34a', border: 'none', fontWeight: 700 }}>
            ✅ Done
          </button>
        </div>
      </div>

      {/* Bag panel — right side */}
      <div style={S.bagPanel}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 6 }}>🎒 Bag</div>
        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, marginBottom: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, transition: 'width 0.3s', width: `${Math.min(100, (bagWt / WEIGHT_LIMIT) * 100)}%`, background: overweight ? '#dc2626' : bagWt > 20 ? '#f59e0b' : '#16a34a' }} />
        </div>
        <div style={{ fontSize: 11, color: overweight ? '#dc2626' : '#64748b', fontWeight: 700, marginBottom: 8 }}>
          {bagWt.toFixed(1)} / {WEIGHT_LIMIT} lbs {overweight && '⚠️ OVER!'}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {bag.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 }}>Click items in the room!</div>
          ) : bag.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', marginBottom: 3, borderRadius: 8, background: item.trap ? '#fef2f2' : '#f0fdf4', border: `1px solid ${item.trap ? '#fecaca' : '#bbf7d0'}` }}>
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 9, color: '#64748b' }}>{item.wt}lb · ⭐{item.util}</div>
              </div>
              <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 12 }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Walking indicator */}
      {walking && (
        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fbbf24', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 20 }}>
          🏃 Walking to {pendingItem?.name}...
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}`}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const S = {
  full: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', fontFamily: 'system-ui, sans-serif', padding: 20 },
  card: { maxWidth: 480, padding: '32px 28px', textAlign: 'center', background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  btn: { padding: '13px 32px', fontSize: 15, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' },
  ghost: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 },
  hud: { position: 'absolute', top: 0, left: 0, right: 200, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(180deg, rgba(0,0,0,0.35), transparent)' },
  hudPill: { background: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: 20, color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: 'monospace' },
  bagPanel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 200, background: '#fff', borderLeft: '1px solid #e2e8f0', padding: '12px 10px', display: 'flex', flexDirection: 'column', zIndex: 20, overflowY: 'auto' },
}
