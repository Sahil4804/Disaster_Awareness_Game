import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations, Html } from '@react-three/drei'
import * as THREE from 'three'

/* ══════════════════════════════════════════════
   PRELOAD THE MODEL
   ══════════════════════════════════════════════ */
useGLTF.preload('/models/Xbot.glb')

/* ══════════════════════════════════════════════
   PULSING INJURY MARKER
   ══════════════════════════════════════════════ */
function PulsingMesh({ position, args, color, intensity = 1 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.emissiveIntensity = intensity * (0.5 + Math.sin(clock.elapsedTime * 3) * 0.5)
  })
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={args || [0.03, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} opacity={0.6} transparent />
    </mesh>
  )
}

/* ══════════════════════════════════════════════
   BLOOD POOL
   ══════════════════════════════════════════════ */
function BloodPool({ degradeTime, position = [0.12, 0.005, 0.05] }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 0.04 + Math.min(degradeTime * 0.0008, 0.1)
    ref.current.scale.set(s * 18, s * 18, 1)
    ref.current.material.opacity = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.1
  })
  return (
    <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 32]} />
      <meshStandardMaterial color="#880000" emissive="#550000" emissiveIntensity={0.3} opacity={0.5} transparent />
    </mesh>
  )
}

/* ══════════════════════════════════════════════
   SKELETON OVERLAY (X-ray mode)
   ══════════════════════════════════════════════ */
function SkeletonOverlay({ scene, visible }) {
  const bonesRef = useRef([])

  useEffect(() => {
    const bones = []
    scene.traverse((child) => {
      if (child.isBone) bones.push(child)
    })
    bonesRef.current = bones
  }, [scene])

  if (!visible) return null

  return (
    <group>
      {/* We'll render small spheres at each bone joint position */}
      {bonesRef.current.map((bone, i) => {
        const pos = new THREE.Vector3()
        bone.getWorldPosition(pos)
        // Only render major bones, skip finger tips etc
        const name = bone.name.toLowerCase()
        const isMinor = name.includes('thumb4') || name.includes('index4') || name.includes('middle4') || name.includes('ring4') || name.includes('pinky4') || name.includes('toe_end') || name.includes('headtop')
        if (isMinor) return null
        const isMajor = name.includes('spine') || name.includes('hips') || name.includes('head') || name.includes('arm') || name.includes('leg') || name.includes('foot') || name.includes('hand') || name.includes('shoulder') || name.includes('neck')
        const radius = isMajor ? 0.025 : 0.012
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[radius, 8, 8]} />
            <meshStandardMaterial color="#88ccff" emissive="#4488ff" emissiveIntensity={0.8} opacity={0.7} transparent />
          </mesh>
        )
      })}
    </group>
  )
}

/* ══════════════════════════════════════════════
   HUMAN MODEL — loads Xbot.glb
   ══════════════════════════════════════════════ */
function HumanModel({ casualtyId, casualtyState, selectedItem, onZoneClick, xrayMode }) {
  const cs = casualtyState
  const isChild = casualtyId === 'CAS-4'
  const groupRef = useRef()

  // Load model
  const { scene, animations } = useGLTF('/models/Xbot.glb')
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const { actions } = useAnimations(animations, groupRef)

  // Play idle or sad_pose animation
  useEffect(() => {
    const animName = cs.dead ? 'sad_pose' : 'idle'
    const action = actions[animName]
    if (action) {
      action.reset().fadeIn(0.5).play()
      if (cs.dead) {
        action.paused = true
        action.time = 0
      }
      return () => action.fadeOut(0.3)
    }
  }, [actions, cs.dead])

  // Shivering for CAS-4
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    if (casualtyId === 'CAS-4' && !cs.dead && !cs.treated) {
      groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 28) * 0.015
      groupRef.current.position.x = Math.cos(clock.elapsedTime * 20) * 0.003
    } else {
      groupRef.current.rotation.z *= 0.95
      groupRef.current.position.x *= 0.95
    }
  })

  // Determine skin color
  const skinColor = useMemo(() => {
    if (cs.dead) return new THREE.Color('#555555')
    switch (casualtyId) {
      case 'CAS-1': return new THREE.Color(cs.vitals.spo2 < 70 ? '#5577aa' : '#7799bb')
      case 'CAS-4': return new THREE.Color('#88aacc')
      case 'CAS-5': return new THREE.Color('#666666')
      case 'CAS-6': return new THREE.Color('#c47060')
      case 'CAS-7': return new THREE.Color('#bbaa99')
      case 'CAS-8': return new THREE.Color('#dda888')
      default: return new THREE.Color('#cc9977')
    }
  }, [casualtyId, cs.dead, cs.vitals?.spo2])

  // Apply materials to meshes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (child.name === 'Beta_Surface') {
          // Main body surface
          child.material = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.5,
            metalness: 0.05,
            transparent: xrayMode,
            opacity: xrayMode ? 0.12 : 1,
            side: THREE.DoubleSide,
          })
        } else if (child.name === 'Beta_Joints') {
          // Joint markers — visible in x-ray, subtle normally
          child.material = new THREE.MeshStandardMaterial({
            color: xrayMode ? '#88ccff' : skinColor,
            roughness: xrayMode ? 0.3 : 0.5,
            metalness: xrayMode ? 0.2 : 0.05,
            emissive: xrayMode ? '#4488ff' : '#000000',
            emissiveIntensity: xrayMode ? 0.5 : 0,
            transparent: !xrayMode,
            opacity: xrayMode ? 0.85 : 0.3,
          })
        }
      }
    })
  }, [clonedScene, skinColor, xrayMode])

  const handleClick = (e) => {
    e.stopPropagation()
    if (!selectedItem) return

    // Determine which zone was clicked based on Y position of the click point
    const point = e.point
    const y = point.y

    let zone = 'torso'
    if (y > 1.5) zone = 'head'
    else if (y > 1.2) zone = 'chest'
    else if (y > 0.85) zone = 'torso'
    else if (y > 0.4) {
      zone = point.x < 0 ? 'leftLeg' : 'rightLeg'
    } else {
      zone = point.x < 0 ? 'leftLeg' : 'rightLeg'
    }

    // Arms: check x position at upper body height
    if (y > 0.85 && y < 1.5) {
      if (Math.abs(point.x) > 0.15) {
        zone = point.x < 0 ? 'leftArm' : 'rightArm'
      }
    }

    onZoneClick(zone)
  }

  const scale = isChild ? 0.0085 : 0.01

  return (
    <group ref={groupRef}>
      <primitive
        object={clonedScene}
        scale={[scale, scale, scale]}
        position={[0, 0, 0]}
        onClick={handleClick}
      />

      {/* ═══ X-RAY SKELETON ═══ */}
      {xrayMode && <SkeletonOverlay scene={clonedScene} visible={xrayMode} />}

      {/* ═══ INJURY MARKERS & EFFECTS ═══ */}

      {/* CAS-1: Cyanosis glow on chest */}
      {casualtyId === 'CAS-1' && !cs.treatments.includes('Rescue Breathing Mask') && (
        <PulsingMesh position={[0, 1.3, 0.12]} args={[0.1, 12, 12]} color="#3366bb" intensity={0.5} />
      )}
      {/* CAS-1: Rescue mask */}
      {casualtyId === 'CAS-1' && cs.treatments.includes('Rescue Breathing Mask') && (
        <mesh position={[0, 1.6, 0.12]}>
          <boxGeometry args={[0.12, 0.06, 0.05]} />
          <meshStandardMaterial color="#22cc55" opacity={0.5} transparent emissive="#22cc55" emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* CAS-2: Arterial bleeding on right leg */}
      {casualtyId === 'CAS-2' && !cs.treated && !cs.dead && !cs.treatments.includes('Tourniquet') && (
        <PulsingMesh position={[0.08, 0.65, 0.06]} args={[0.04, 10, 10]} color="#cc0000" intensity={1.5} />
      )}
      {casualtyId === 'CAS-2' && !cs.treated && !cs.dead && (
        <BloodPool degradeTime={cs.degradeTime} position={[0.1, 0.005, 0.08]} />
      )}
      {/* CAS-2: Bone fragment */}
      {casualtyId === 'CAS-2' && !cs.treatments.includes('Pressure Bandage') && !xrayMode && (
        <mesh position={[0.12, 0.6, 0.06]} rotation={[0.3, 0, 0.5]}>
          <capsuleGeometry args={[0.005, 0.03, 4, 8]} />
          <meshStandardMaterial color="#eeddcc" emissive="#997755" emissiveIntensity={0.5} />
        </mesh>
      )}
      {/* CAS-2: Tourniquet */}
      {casualtyId === 'CAS-2' && cs.treatments.includes('Tourniquet') && (
        <mesh position={[0.08, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.012, 8, 24]} />
          <meshStandardMaterial color="#cc2222" />
        </mesh>
      )}
      {/* CAS-2: Pressure bandage */}
      {casualtyId === 'CAS-2' && cs.treatments.includes('Pressure Bandage') && (
        <mesh position={[0.08, 0.6, 0]}>
          <capsuleGeometry args={[0.065, 0.08, 8, 16]} />
          <meshStandardMaterial color="#ffffff" opacity={0.5} transparent />
        </mesh>
      )}

      {/* CAS-2: X-ray broken femur */}
      {casualtyId === 'CAS-2' && xrayMode && <>
        <mesh position={[0.08, 0.72, 0]} rotation={[0, 0, 0.06]}>
          <capsuleGeometry args={[0.016, 0.1, 6, 10]} />
          <meshStandardMaterial color="#e8e0d0" opacity={0.9} transparent />
        </mesh>
        <mesh position={[0.09, 0.58, 0]} rotation={[0, 0, -0.2]}>
          <capsuleGeometry args={[0.016, 0.08, 6, 10]} />
          <meshStandardMaterial color="#e8e0d0" opacity={0.9} transparent />
        </mesh>
        <PulsingMesh position={[0.085, 0.65, 0.02]} args={[0.03, 8, 8]} color="#ff2222" intensity={2.5} />
        <Html position={[0.28, 0.65, 0]} distanceFactor={2.5}>
          <div style={{ background: 'rgba(180,0,0,0.3)', border: '1px solid #ff4444', padding: '3px 10px', borderRadius: 4, color: '#ff6666', fontSize: '12px', fontFamily: '"Courier New",monospace', whiteSpace: 'nowrap' }}>COMPOUND FRACTURE — FEMUR</div>
        </Html>
      </>}

      {/* CAS-3: Laceration on left forearm */}
      {casualtyId === 'CAS-3' && !cs.treatments.includes('Gauze Pads') && <>
        <mesh position={[-0.22, 0.95, 0.04]}>
          <boxGeometry args={[0.012, 0.08, 0.003]} />
          <meshStandardMaterial color="#cc0000" emissive="#990000" emissiveIntensity={1} />
        </mesh>
        <PulsingMesh position={[-0.22, 0.95, 0.05]} args={[0.025, 8, 8]} color="#cc0000" intensity={0.8} />
      </>}
      {casualtyId === 'CAS-3' && cs.treatments.includes('Gauze Pads') && (
        <mesh position={[-0.22, 0.95, 0.05]}>
          <boxGeometry args={[0.05, 0.1, 0.012]} />
          <meshStandardMaterial color="#fff" opacity={0.85} transparent />
        </mesh>
      )}

      {/* CAS-4: Hypothermia frost glow */}
      {casualtyId === 'CAS-4' && !cs.treatments.includes('Mylar Blanket') && (
        <PulsingMesh position={[0, 1.1, 0.1]} args={[0.12, 12, 12]} color="#5588cc" intensity={0.35} />
      )}
      {/* CAS-4: Mylar blanket */}
      {casualtyId === 'CAS-4' && cs.treatments.includes('Mylar Blanket') && (
        <mesh position={[0, 1.1, 0.1]}>
          <boxGeometry args={[0.4, 0.6, 0.02]} />
          <meshStandardMaterial color="#ffaa00" opacity={0.2} transparent metalness={0.9} roughness={0.1} />
        </mesh>
      )}

      {/* CAS-5: Cranial injury */}
      {casualtyId === 'CAS-5' && <>
        <mesh position={[0.06, 1.72, 0.05]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#440000" roughness={0.95} />
        </mesh>
        {xrayMode && <>
          <PulsingMesh position={[0.05, 1.7, 0.04]} args={[0.04, 6, 6]} color="#ff2222" intensity={2} />
          <Html position={[0.2, 1.72, 0]} distanceFactor={2.5}>
            <div style={{ background: 'rgba(180,0,0,0.3)', border: '1px solid #ff4444', padding: '3px 10px', borderRadius: 4, color: '#ff6666', fontSize: '12px', fontFamily: '"Courier New",monospace', whiteSpace: 'nowrap' }}>SKULL FRACTURE</div>
          </Html>
        </>}
      </>}

      {/* CAS-6: Electrical burn — entry on right hand, burn on forearm */}
      {casualtyId === 'CAS-6' && !cs.treatments.includes('Burn Dressing') && <>
        <mesh position={[0.25, 0.85, 0.03]}>
          <sphereGeometry args={[0.022, 10, 10]} />
          <meshStandardMaterial color="#2a0a0a" roughness={0.95} />
        </mesh>
        <PulsingMesh position={[0.22, 0.95, 0.04]} args={[0.03, 8, 8]} color="#cc4422" intensity={0.7} />
        <mesh position={[0.22, 1.02, 0.04]}>
          <boxGeometry args={[0.025, 0.06, 0.004]} />
          <meshStandardMaterial color="#aa3322" emissive="#882211" emissiveIntensity={0.5} />
        </mesh>
        {/* Exit wound on left foot */}
        <mesh position={[-0.08, 0.04, 0.08]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#3a1515" roughness={0.95} />
        </mesh>
        {xrayMode && (
          <Html position={[0.35, 0.95, 0]} distanceFactor={2.5}>
            <div style={{ background: 'rgba(200,60,20,0.25)', border: '1px solid #ff6644', padding: '3px 10px', borderRadius: 4, color: '#ff8866', fontSize: '12px', fontFamily: '"Courier New",monospace', whiteSpace: 'nowrap' }}>ELECTRICAL BURN</div>
          </Html>
        )}
      </>}
      {casualtyId === 'CAS-6' && cs.treatments.includes('Burn Dressing') && (
        <mesh position={[0.22, 0.96, 0.05]}>
          <boxGeometry args={[0.06, 0.14, 0.012]} />
          <meshStandardMaterial color="#f0f0f0" opacity={0.8} transparent />
        </mesh>
      )}

      {/* CAS-7: Deep laceration on left leg */}
      {casualtyId === 'CAS-7' && !cs.treatments.includes('Pressure Bandage') && <>
        <mesh position={[-0.08, 0.5, 0.06]}>
          <boxGeometry args={[0.014, 0.12, 0.004]} />
          <meshStandardMaterial color="#bb2222" emissive="#881111" emissiveIntensity={1} />
        </mesh>
        <PulsingMesh position={[-0.08, 0.5, 0.07]} args={[0.03, 8, 8]} color="#cc2222" intensity={0.6} />
        {xrayMode && (
          <Html position={[-0.25, 0.5, 0]} distanceFactor={2.5}>
            <div style={{ background: 'rgba(200,100,0,0.2)', border: '1px solid #ffaa44', padding: '3px 10px', borderRadius: 4, color: '#ffcc66', fontSize: '12px', fontFamily: '"Courier New",monospace', whiteSpace: 'nowrap' }}>LACERATION — L.LEG</div>
          </Html>
        )}
      </>}
      {casualtyId === 'CAS-7' && cs.treatments.includes('Pressure Bandage') && (
        <mesh position={[-0.08, 0.5, 0]}>
          <capsuleGeometry args={[0.06, 0.08, 8, 16]} />
          <meshStandardMaterial color="#fff" opacity={0.5} transparent />
        </mesh>
      )}

      {/* CAS-8: Minor scratches on left arm */}
      {casualtyId === 'CAS-8' && !cs.treatments.includes('Gauze Pads') && <>
        <mesh position={[-0.22, 1.0, 0.035]}><boxGeometry args={[0.005, 0.035, 0.002]} /><meshStandardMaterial color="#cc6644" emissive="#884422" emissiveIntensity={0.4} /></mesh>
        <mesh position={[-0.21, 0.93, 0.035]}><boxGeometry args={[0.004, 0.028, 0.002]} /><meshStandardMaterial color="#cc6644" emissive="#884422" emissiveIntensity={0.4} /></mesh>
      </>}
      {casualtyId === 'CAS-8' && cs.treatments.includes('Gauze Pads') && (
        <mesh position={[-0.22, 0.96, 0.05]}>
          <boxGeometry args={[0.05, 0.1, 0.01]} />
          <meshStandardMaterial color="#fff" opacity={0.85} transparent />
        </mesh>
      )}

      {/* X-RAY label */}
      {xrayMode && (
        <Html position={[0, 1.95, 0]} center distanceFactor={2.5}>
          <div style={{ background: 'rgba(50,120,220,0.25)', border: '1px solid #4488ff', padding: '5px 16px', borderRadius: 4, color: '#66aaff', fontSize: '14px', fontFamily: '"Courier New",monospace', letterSpacing: '0.15em', fontWeight: 'bold' }}>X-RAY MODE</div>
        </Html>
      )}
    </group>
  )
}

/* ══════════════════════════════════════════════
   CANVAS WRAPPER (exported)
   ══════════════════════════════════════════════ */
export default function HumanBody3D({ casualtyId, casualtyState, selectedItem, onZoneClick, xrayMode }) {
  return (
    <Canvas
      camera={{ position: [0, 1.0, 2.8], fov: 38 }}
      shadows
      style={{ borderRadius: 8, cursor: selectedItem ? 'crosshair' : 'grab' }}
    >
      <color attach="background" args={['#080810']} />
      <fog attach="fog" args={['#080810', 4, 9]} />

      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 4]} intensity={1.2} castShadow shadow-mapSize={[512, 512]} color="#fff8f0" />
      <directionalLight position={[-3, 3, -2]} intensity={0.3} color="#6688cc" />
      <pointLight position={[0, 1.5, 2.5]} intensity={0.5} distance={6} />
      {xrayMode && <pointLight position={[0, 1.2, 1]} intensity={0.8} color="#4499ff" distance={5} />}

      <OrbitControls
        enableZoom minDistance={0.9} maxDistance={4.5}
        target={[0, 0.95, 0]}
        autoRotate={!selectedItem && !xrayMode}
        autoRotateSpeed={0.35}
        enableDamping dampingFactor={0.08}
      />

      <HumanModel
        casualtyId={casualtyId}
        casualtyState={casualtyState}
        selectedItem={selectedItem}
        onZoneClick={onZoneClick}
        xrayMode={xrayMode}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#0c0c18" />
      </mesh>
      <gridHelper args={[4, 20, '#181828', '#181828']} position={[0, 0.001, 0]} />

      {/* Flood water for water casualties */}
      {(casualtyId === 'CAS-1' || casualtyId === 'CAS-4') && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color="#1a3355" opacity={0.2} transparent />
        </mesh>
      )}
    </Canvas>
  )
}
