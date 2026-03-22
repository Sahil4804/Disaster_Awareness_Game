import { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../../context/GameContext'

// ── Game Data (unchanged) ─────────────────────────────────────────────────────

const BUILD_STEPS = [
  {
    id: 'tarp',
    label: 'Ground Tarp',
    emoji: '🟦',
    color: '#2563eb',
    action: 'Lay flat on the driest ground available.',
    why: 'Ground contact steals body heat 25× faster than cold air. The tarp is always first — it is your thermal barrier and moisture shield.',
  },
  {
    id: 'poles',
    label: 'Tent Poles',
    emoji: '🪵',
    color: '#92400e',
    action: 'Insert poles through sleeves and stand them on the tarp.',
    why: 'Poles form the load-bearing skeleton. Nothing can attach or hold shape without the frame in place.',
  },
  {
    id: 'rainfly',
    label: 'Rainfly',
    emoji: '🟠',
    color: '#c2410c',
    action: 'Drape and clip the rainfly over the pole frame.',
    why: 'In flood conditions rain is certain. The rainfly is NOT optional — it is the only layer that makes the shelter waterproof.',
  },
  {
    id: 'pegs',
    label: 'Ground Pegs',
    emoji: '⛏️',
    color: '#64748b',
    action: 'Drive pegs into each corner at 45° angle.',
    why: 'Without pegs, the shelter collapses in any wind or rain. Pegs are the last step but equally critical.',
  },
]

// ── Animation Helper ──────────────────────────────────────────────────────────

/**
 * Always renders children into the scene (so geometry is allocated once).
 * When show=false  → invisible.
 * When show=true   → item appears at fromY and lerps smoothly down to 0.
 */
function FloatIn({ show, fromY = 12, children }) {
  const ref    = useRef()
  const primed = useRef(false)

  useFrame(() => {
    if (!ref.current) return
    if (show) {
      if (!primed.current) {
        ref.current.position.y = fromY
        primed.current = true
      }
      // Lerp toward resting position (y = 0 relative to group root)
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, 0, 0.055)
      ref.current.visible = true
    } else {
      ref.current.visible = false
      primed.current = false
    }
  })

  return <group ref={ref}>{children}</group>
}

// ── 3-D Tent Parts ────────────────────────────────────────────────────────────

/** Step 1 — Blue ground tarp lying flat */
function GroundTarp({ show }) {
  return (
    <FloatIn show={show} fromY={8}>
      {/* Main tarp surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3.2, 2.6]} />
        <meshStandardMaterial color="#1d4ed8" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Tarp border — contrasting edge so it reads clearly */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[3.4, 2.8]} />
        <meshStandardMaterial color="#1e3a8a" transparent opacity={0.35} wireframe />
      </mesh>
    </FloatIn>
  )
}

/**
 * Step 2 — A-frame pole skeleton.
 * Two A-frames (one at each end) + a ridge pole running between the peaks.
 * Poles lean from ground corners (±1.3, 0) up to the centre peak (0, 1.95).
 */
function TentFrame({ show }) {
  // Geometry: pole length = distance from corner to peak
  const poleLen  = Math.sqrt(1.3 ** 2 + 1.95 ** 2) // ≈ 2.34 units
  const tiltZ    = Math.atan2(1.3, 1.95)             // ≈ 33.7° (tilt from vertical)

  return (
    <FloatIn show={show} fromY={14}>
      {/* ── Front A-frame (z = -1.3) ── */}
      <group position={[0, 0, -1.3]}>
        {/* Left pole: leans from (-1.3, 0) up to (0, 1.95) */}
        <mesh position={[-0.65, 0.975, 0]} rotation={[0, 0, -tiltZ]}>
          <cylinderGeometry args={[0.04, 0.04, poleLen, 10]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
        </mesh>
        {/* Right pole: mirror */}
        <mesh position={[0.65, 0.975, 0]} rotation={[0, 0, tiltZ]}>
          <cylinderGeometry args={[0.04, 0.04, poleLen, 10]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
        </mesh>
      </group>

      {/* ── Back A-frame (z = +1.3) ── */}
      <group position={[0, 0, 1.3]}>
        <mesh position={[-0.65, 0.975, 0]} rotation={[0, 0, -tiltZ]}>
          <cylinderGeometry args={[0.04, 0.04, poleLen, 10]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
        </mesh>
        <mesh position={[0.65, 0.975, 0]} rotation={[0, 0, tiltZ]}>
          <cylinderGeometry args={[0.04, 0.04, poleLen, 10]} />
          <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
        </mesh>
      </group>

      {/* ── Ridge pole connecting the two peaks ── */}
      {/* CylinderGeometry default axis = Y; rotate 90° around X to point along Z */}
      <mesh position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.65, 10]} />
        <meshStandardMaterial color="#6B3F2A" roughness={0.6} />
      </mesh>
    </FloatIn>
  )
}

/**
 * Step 3 — Rainfly: a proper triangular-prism tent shape.
 *
 * We use THREE.ExtrudeGeometry on a triangular cross-section:
 *   base: -1.42 to +1.42 at y = 0
 *   peak: (0, 2.0)
 * Extruded 2.7 units along Z, then centred so the tent straddles z = 0.
 *
 * Semi-transparent (opacity 0.78) so you can see the poles through the fabric.
 */
function Rainfly({ show }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-1.42, 0)
    shape.lineTo(1.42, 0)
    shape.lineTo(0, 2.0)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth: 2.7, bevelEnabled: false })
  }, [])

  return (
    <FloatIn show={show} fromY={16}>
      {/* position z = -1.35 centres the 2.7-unit extrusion around z = 0 */}
      <mesh geometry={geo} position={[0, 0, -1.35]}>
        <meshStandardMaterial
          color="#ea580c"
          transparent
          opacity={0.78}
          side={THREE.DoubleSide}
          roughness={0.55}
        />
      </mesh>
      {/* Subtle darker seam along the ridge for realism */}
      <mesh position={[0, 2.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 2.72, 8]} />
        <meshStandardMaterial color="#9a3412" roughness={0.5} />
      </mesh>
    </FloatIn>
  )
}

/** Step 4 — Metallic stakes at the four corners + yellow guy-lines */
function GroundPegs({ show }) {
  // [x, z, rotateY] — one peg per corner, angled outward
  const corners = [
    [-1.55, -1.35,  0.4],
    [ 1.55, -1.35, -0.4],
    [-1.55,  1.35,  0.4],
    [ 1.55,  1.35, -0.4],
  ]

  return (
    <FloatIn show={show} fromY={10}>
      {corners.map(([x, z, ry], i) => (
        <group key={i}>
          {/* Stake: angled outward (tilt 35° from vertical) */}
          <mesh
            position={[x, 0.18, z]}
            rotation={[0.62 * (z < 0 ? -1 : 1), ry, 0.62 * (x < 0 ? -1 : 1)]}
          >
            <cylinderGeometry args={[0.04, 0.025, 0.42, 6]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.85} roughness={0.15} />
          </mesh>
          {/* Guy-line from near the top of the tent side down to the stake */}
          <mesh
            position={[x * 0.46, 0.85, z * 0.46]}
            rotation={[
              Math.atan2(Math.abs(z) * 0.54, 0.85) * (z < 0 ? -1 : 1),
              0,
              Math.atan2(Math.abs(x) * 0.54, 0.85) * (x < 0 ? -1 : 1),
            ]}
          >
            <cylinderGeometry args={[0.008, 0.008, 1.4, 4]} />
            <meshStandardMaterial color="#fbbf24" transparent opacity={0.75} />
          </mesh>
        </group>
      ))}
    </FloatIn>
  )
}

// ── Scene Ambiance ────────────────────────────────────────────────────────────

/** Flickering campfire with point light */
function Campfire() {
  const lightRef = useRef()
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.elapsedTime
      lightRef.current.intensity = 2.0
        + Math.sin(t * 13) * 0.7
        + Math.sin(t * 7.3) * 0.4
    }
  })
  return (
    <group position={[4.2, 0, 1.8]}>
      <pointLight ref={lightRef} color="#ff6820" intensity={2} distance={11} />
      {/* Glow core */}
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#ff4500" emissive="#ff2200" emissiveIntensity={3} />
      </mesh>
      {/* Flame */}
      <mesh position={[0, 0.32, 0]}>
        <coneGeometry args={[0.08, 0.28, 6]} />
        <meshStandardMaterial color="#ffa500" emissive="#ff6000" emissiveIntensity={2.5} transparent opacity={0.85} />
      </mesh>
      {/* Logs */}
      {[[0.14, 0.6], [-0.12, -0.4]].map(([x, ry], i) => (
        <mesh key={i} position={[x, 0.04, 0]} rotation={[0, ry, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.065, 0.56, 6]} />
          <meshStandardMaterial color={i === 0 ? '#4a2500' : '#3d1f00'} />
        </mesh>
      ))}
    </group>
  )
}

/** Background pine trees */
function Trees() {
  const data = [
    [-5, -3.5], [5, -3.5], [-6.5, -2.5], [6.5, -2.5],
    [-4, -5.5], [4, -5.5], [-7.5, -4.5], [7.5, -4.5],
    [-3, -7],   [3, -7],   [0, -8],
  ]
  return (
    <>
      {data.map(([x, z], i) => {
        const h = 2.6 + (i % 4) * 0.7
        const r = 0.85 + (i % 3) * 0.2
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.13, 0.19, 1.1, 6]} />
              <meshStandardMaterial color="#5C3D2E" />
            </mesh>
            <mesh position={[0, 1.7 + h * 0.3, 0]}>
              <coneGeometry args={[r, h, 7]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#14532d' : '#166534'} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

/** Green glow when tent is fully assembled */
function CompletionAura({ show }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current && show) {
      ref.current.intensity = 1.8 + Math.sin(clock.elapsedTime * 2.2) * 0.9
    }
  })
  if (!show) return null
  return <pointLight ref={ref} position={[0, 2.5, 0]} color="#22c55e" intensity={2} distance={8} />
}

/** The complete 3-D scene */
function TentScene({ placedIds, completed }) {
  const hasTarp    = placedIds.includes('tarp')
  const hasPoles   = placedIds.includes('poles')
  const hasRainfly = placedIds.includes('rainfly')
  const hasPegs    = placedIds.includes('pegs')

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 10.5]} fov={42} />
      <OrbitControls
        target={[0, 1.0, 0]}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={0.28}
        maxPolarAngle={1.3}
        minAzimuthAngle={-1.0}
        maxAzimuthAngle={1.0}
        enableDamping
        dampingFactor={0.07}
      />

      {/* Lighting */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 9, 5]} intensity={0.55} color="#c8d8ff" />
      <hemisphereLight args={['#08122a', '#1a2e1a', 0.45]} />

      <Stars radius={90} depth={60} count={2400} factor={4} fade speed={0.3} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#172a17" roughness={1} />
      </mesh>
      {/* Flattened dirt patch under tent */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[4.2, 3.4]} />
        <meshStandardMaterial color="#2a1a08" roughness={1} />
      </mesh>

      <Trees />
      <Campfire />
      <CompletionAura show={completed} />

      {/* Tent parts — appear in placement order */}
      <GroundTarp show={hasTarp}    />
      <TentFrame  show={hasPoles}   />
      <Rainfly    show={hasRainfly} />
      <GroundPegs show={hasPegs}    />
    </>
  )
}

// ── Step Card (sidebar) ───────────────────────────────────────────────────────

function StepCard({ step, idx, status, onClick }) {
  const isPlaced = status === 'placed'
  const isNext   = status === 'next'

  return (
    <button
      onClick={isNext ? onClick : undefined}
      disabled={!isNext}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 11, width: '100%', textAlign: 'left',
        border: `2px solid ${isPlaced ? '#22c55e' : isNext ? step.color : 'rgba(255,255,255,0.07)'}`,
        background: isPlaced
          ? 'rgba(34,197,94,0.1)'
          : isNext
            ? `${step.color}1a`
            : 'rgba(255,255,255,0.03)',
        cursor: isNext ? 'pointer' : 'default',
        opacity: status === 'locked' ? 0.38 : 1,
        transform: isNext ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isNext ? `0 0 16px ${step.color}44` : 'none',
        transition: 'all 0.18s',
      }}
    >
      <span style={{
        fontSize: 22, width: 34, height: 34, borderRadius: 7, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isPlaced ? 'rgba(34,197,94,0.2)' : isNext ? `${step.color}30` : 'rgba(255,255,255,0.05)',
      }}>
        {isPlaced ? '✅' : step.emoji}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: isPlaced ? '#4ade80' : isNext ? '#f8fafc' : '#475569' }}>
          Step {idx + 1}: {step.label}
        </div>
        {isNext && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
            {step.action}
          </div>
        )}
      </div>
      {isNext && (
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 5,
          background: step.color, color: '#fff', flexShrink: 0,
        }}>
          PLACE ▶
        </span>
      )}
      {status === 'locked' && <span style={{ color: '#334155', fontSize: 12 }}>🔒</span>}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Module7_CampSafeHaven() {
  const { dispatch } = useGame()
  const [phase, setPhase]           = useState('intro')
  const [placedIds, setPlacedIds]   = useState([])
  const [feedback, setFeedback]     = useState(null)
  const [wrongCount, setWrongCount] = useState(0)
  const [result, setResult]         = useState(null)
  const [shake, setShake]           = useState(false)

  const completed = placedIds.length === BUILD_STEPS.length

  const handlePlace = (stepId) => {
    if (feedback) return
    const expected = BUILD_STEPS[placedIds.length]

    if (stepId === expected.id) {
      const newPlaced = [...placedIds, stepId]
      setPlacedIds(newPlaced)
      setFeedback({ correct: true, text: `✅ ${expected.label} placed!\n\n💡 ${expected.why}` })
      setTimeout(() => {
        setFeedback(null)
        if (newPlaced.length === BUILD_STEPS.length) {
          const score = Math.max(55, 100 - wrongCount * 12)
          const r = { score, passed: true }
          setResult(r)
          setTimeout(() => setPhase('result'), 1400)
          dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-7', result: r } })
        }
      }, 2700)
    } else {
      setWrongCount(c => c + 1)
      setShake(true)
      setTimeout(() => setShake(false), 600)
      const exp = BUILD_STEPS[placedIds.length]
      setFeedback({
        correct: false,
        text: `❌ Wrong order!\n\n"${exp.label}" must come next.\n\n💡 ${exp.why}`,
      })
      setTimeout(() => setFeedback(null), 3500)
    }
  }

  const restart = () => {
    setPhase('play')
    setPlacedIds([])
    setFeedback(null)
    setWrongCount(0)
    setResult(null)
    setShake(false)
  }

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={ui.screen}>
        <div style={ui.card}>
          <div style={{ fontSize: 56 }}>⛺</div>
          <h1 style={ui.title}>Module 7: Camp Safe Haven</h1>
          <p style={ui.body}>
            A flash flood has forced you to shelter outside overnight. Build a
            <strong style={{ color: '#f97316' }}> waterproof, insulated shelter</strong> before
            the rain arrives — in the correct order, or it fails.
          </p>
          <div style={ui.warnBox}>
            <p style={{ color: '#fbbf24', fontWeight: 700, margin: '0 0 6px', fontSize: 14 }}>⚠️ Why Order Matters</p>
            <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, lineHeight: 1.65 }}>
              Hypothermia is the leading cause of outdoor death even in mild temperatures.
              Building out of sequence means your shelter leaks, collapses, or fails to insulate.
              The sequence is a life skill — memorise it.
            </p>
          </div>
          <p style={{ color: '#60a5fa', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
            🖱️ Click items in the left panel in the correct build order<br />
            🎥 Drag the 3-D scene to orbit and inspect your shelter
          </p>
          <button style={ui.primaryBtn} onClick={() => setPhase('play')}>⛺ Start Building</button>
          <button style={ui.ghost} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>← Back to Modules</button>
        </div>
      </div>
    )
  }

  // ── Result ────────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    return (
      <div style={ui.screen}>
        <div style={ui.card}>
          <div style={{ fontSize: 52 }}>⛺✅</div>
          <h1 style={{ ...ui.title, color: '#22c55e' }}>Shelter Complete!</h1>
          <p style={{ fontSize: 30, fontWeight: 800, color: '#60a5fa', margin: '4px 0 8px' }}>{result.score}%</p>
          {wrongCount > 0 && (
            <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>
              {wrongCount} wrong-order attempt{wrongCount > 1 ? 's' : ''} — practise until it is automatic
            </p>
          )}
          <div style={{ ...ui.warnBox, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', textAlign: 'left', width: '100%' }}>
            <p style={{ color: '#60a5fa', fontWeight: 700, margin: '0 0 12px', fontSize: 14 }}>📋 The Correct 4-Step Order</p>
            {BUILD_STEPS.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 800, background: s.color, color: '#fff', borderRadius: 4, padding: '2px 7px', flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </span>
                <div>
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                  <p style={{ color: '#94a3b8', fontSize: 12, margin: '2px 0 0', lineHeight: 1.5 }}>{s.why}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={ui.primaryBtn} onClick={restart}>🔄 Rebuild</button>
            <button style={ui.secondaryBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>📋 Modules</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Play ──────────────────────────────────────────────────────────────────
  const nextStep = BUILD_STEPS[placedIds.length]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#050d1a', fontFamily: 'system-ui,sans-serif', overflow: 'hidden' }}>

      {/* 3-D canvas */}
      <Canvas style={{ position: 'absolute', inset: 0 }}>
        <TentScene placedIds={placedIds} completed={completed} />
      </Canvas>

      {/* ── Left sidebar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%', width: 268,
        padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 9,
        background: 'linear-gradient(90deg, rgba(5,13,26,0.97) 82%, transparent)',
        pointerEvents: 'none',
      }}>
        <button style={{ ...ui.ghost, pointerEvents: 'auto', fontSize: 12, color: '#475569' }}
          onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
          ← Quit
        </button>
        <div>
          <h2 style={{ color: '#f8fafc', fontSize: 14, fontWeight: 800, margin: '6px 0 2px' }}>⛺ Build Your Shelter</h2>
          <p style={{ color: '#475569', fontSize: 11, margin: 0 }}>Click items in the correct order</p>
        </div>

        {/* Progress bar */}
        <div style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 4 }}>
            <span>Progress</span>
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{placedIds.length} / {BUILD_STEPS.length}</span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 5,
              width: `${(placedIds.length / BUILD_STEPS.length) * 100}%`,
              background: 'linear-gradient(90deg,#3b82f6,#22c55e)',
              transition: 'width 0.5s',
            }} />
          </div>
        </div>

        {/* Step cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'auto' }}>
          {BUILD_STEPS.map((step, idx) => {
            const isPlaced = placedIds.includes(step.id)
            const isNext   = !isPlaced && idx === placedIds.length
            return (
              <StepCard
                key={step.id}
                step={step}
                idx={idx}
                status={isPlaced ? 'placed' : isNext ? 'next' : 'locked'}
                onClick={() => handlePlace(step.id)}
              />
            )
          })}
        </div>

        {wrongCount > 0 && (
          <p style={{ color: '#f87171', fontSize: 11, margin: 0, pointerEvents: 'none' }}>
            ❌ {wrongCount} wrong-order attempt{wrongCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Top-right hint ── */}
      {nextStep && !feedback && !completed && (
        <div style={{
          position: 'absolute', top: 18, right: 18,
          background: 'rgba(5,13,26,0.92)', border: `1px solid ${nextStep.color}55`,
          borderRadius: 12, padding: '11px 15px', maxWidth: 210,
          backdropFilter: 'blur(8px)',
        }}>
          <p style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 3px' }}>Next →</p>
          <p style={{ color: '#f8fafc', fontSize: 13, fontWeight: 700, margin: 0 }}>{nextStep.emoji} {nextStep.label}</p>
        </div>
      )}

      {/* ── Feedback overlay ── */}
      {feedback && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%,-50%) ${shake ? 'translateX(-10px)' : ''}`,
          maxWidth: 360, width: '88%',
          background: feedback.correct ? 'rgba(20,83,45,0.96)' : 'rgba(127,29,29,0.96)',
          border: `2px solid ${feedback.correct ? '#22c55e' : '#ef4444'}`,
          borderRadius: 16, padding: '20px 24px', backdropFilter: 'blur(14px)',
          boxShadow: `0 0 36px ${feedback.correct ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'}`,
          zIndex: 10, textAlign: 'center', transition: 'transform 0.08s',
        }}>
          <p style={{ color: '#f8fafc', fontSize: 14, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
            {feedback.text}
          </p>
        </div>
      )}

      {/* ── Completion banner ── */}
      {completed && phase === 'play' && (
        <div style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20,83,45,0.97)', border: '2px solid #22c55e',
          borderRadius: 14, padding: '14px 30px', backdropFilter: 'blur(12px)',
          boxShadow: '0 0 44px rgba(34,197,94,0.55)',
        }}>
          <p style={{ color: '#4ade80', fontSize: 16, fontWeight: 800, margin: 0 }}>🎉 Shelter Complete! Calculating score…</p>
        </div>
      )}

      {!completed && (
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', color: '#2d3e2d', fontSize: 11, pointerEvents: 'none' }}>
          🖱️ Drag to orbit · Watch the tent assemble
        </div>
      )}
    </div>
  )
}

// ── Shared UI styles ──────────────────────────────────────────────────────────
const ui = {
  screen: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, background: 'linear-gradient(135deg,#050d1a 0%,#0f172a 60%,#0b1628 100%)',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    maxWidth: 560, padding: '44px 40px', textAlign: 'center',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 20, backdropFilter: 'blur(10px)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: 800, margin: 0 },
  body:  { color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, margin: 0 },
  warnBox: {
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: 12, padding: '14px 18px', width: '100%',
  },
  primaryBtn: {
    padding: '13px 40px', fontSize: 16, fontWeight: 700,
    background: 'linear-gradient(135deg,#ea580c,#f97316)',
    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(234,88,12,0.4)',
  },
  secondaryBtn: {
    padding: '13px 28px', fontSize: 15, fontWeight: 600,
    background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)',
    color: '#a5b4fc', borderRadius: 12, cursor: 'pointer',
  },
  ghost: {
    background: 'none', border: 'none', color: '#475569',
    cursor: 'pointer', fontSize: 14, padding: 0,
  },
}
