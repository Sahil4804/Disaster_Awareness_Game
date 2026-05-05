import { useState, useEffect, useRef } from 'react'
import { useGame } from '../../context/GameContext'
import Narrator from '../../components/Narrator'

const ROUTES = [
  { id: 'highway', name: 'NH-48 Highway', dist: '12 km', time: '~18 min', emoji: '🛣️', hazards: ['Low-lying underpass', 'IMD Flash Flood Warning zone'], status: 'CAUTION', safety: 'caution', ndma: '"Turn Around, Don\'t Drown" — Never drive through flooded underpasses. 30cm of water can float most vehicles.', floodAt: 65 },
  { id: 'stateroad', name: 'State Road 27', dist: '18 km', time: '~25 min', emoji: '🌉', hazards: ['Bridge over River Kosi', 'Longer route'], status: 'SAFE', safety: 'safe', ndma: 'NDMA: Use elevated routes and bridges during floods. Monitor CWC river level data before crossing.', floodAt: 80 },
  { id: 'bypass', name: 'Village Bypass', dist: '8 km', time: '~12 min', emoji: '🏘️', hazards: ['Unpaved road near canal', 'Debris reported'], status: 'CLOSED', safety: 'danger', ndma: 'NDMA: Avoid unpaved/kutcha roads during floods. Waterlogged soil collapses without warning.', floodAt: 40 },
]

const ESCAPE_STEPS = [
  { id: 'calm', label: 'Stay Calm', emoji: '😤', instruction: 'Time your breathing. Click EXACTLY when the rings align!', action: 'Click when the inner ring hits the outer ring.', ndma: 'NDMA: Panic consumes oxygen and clouds judgment. Stay calm and act methodically.', req: 3 },
  { id: 'unbuckle', label: 'Unbuckle Seatbelt', emoji: '🔓', instruction: 'Tensioner jammed! Maintain focus under pressure.', action: 'Type the exact sequence shown to release.', ndma: 'NDMA: Remove seatbelt first — you cannot escape while restrained.', req: 1 },
  { id: 'window', label: 'Open Window', emoji: '🪟', instruction: 'Hold the switch, but keep your mouse in the moving safe zone!', action: 'Hold click and follow the target area.', ndma: 'NDMA: Windows are your primary escape. Doors are nearly impossible to open due to water pressure (~600 lbs/sqft).', req: 1 },
  { id: 'break', label: 'Break Window', emoji: '🔨', instruction: 'Power failed! Time your strikes on the moving weak point.', action: 'Click when the crosshair is over the moving target.', ndma: 'NDMA: If windows fail, remove headrest, use metal spikes to strike the CORNER of side windows. Never attempt the windshield.', req: 4 },
  { id: 'swim', label: 'Escape & Swim Up', emoji: '🏊', instruction: 'Climb out through the shattered window. Swim to the surface.', action: 'Click to swim upward', ndma: 'NDMA: Once out, swim to the nearest elevated surface. Signal for help. Never re-enter floodwater.', req: 1 },
]

function InternalEscapeGame() {
  const { dispatch: gameDispatch } = useGame()
  const [waterLevel, setWaterLevel] = useState(0) // 0 to 100
  const [stepIdx, setStepIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [gameState, setGameState] = useState('playing') // playing, failed, escaped
  
  // Visual states
  const [beltUnbuckled, setBeltUnbuckled] = useState(false)
  const [beltSuccess, setBeltSuccess] = useState(false)
  const [sparks, setSparks] = useState([])
  const [cracks, setCracks] = useState([])
  const [isShattered, setIsShattered] = useState(false)
  const [waterInrush, setWaterInrush] = useState(false)
  const [headrestEquipped, setHeadrestEquipped] = useState(false)
  const [windowBgOffset, setWindowBgOffset] = useState(0)
  const [bubbles, setBubbles] = useState([])
  
  // Mid-game Narrator State
  const [midGameNarrative, setMidGameNarrative] = useState(null)
  const hasWarnedWaterRef = useRef(false)

  // Step 1: Calm QTE
  const [breathPhase, setBreathPhase] = useState(0) // 0 to 100 oscillating
  
  // Step 2: Unbuckle QTE (Sequence)
  const [beltSequence, setBeltSequence] = useState([])
  const [beltInputIdx, setBeltInputIdx] = useState(0)
  
  // Step 3: Window QTE (Struggle Hold)
  const [isHolding, setIsHolding] = useState(false)
  const [safeZoneX, setSafeZoneX] = useState(50) // 0 to 100 %
  const [mouseX, setMouseX] = useState(50) // 0 to 100 %
  const [holdProgress, setHoldProgress] = useState(0) // 0 to 100
  
  // Step 4: Break Window QTE (Moving Target)
  const [targetPos, setTargetPos] = useState({ x: 50, y: 80 }) // % relative to window pane

  const animRef = useRef(null)

  // Game Loop for QTEs
  useEffect(() => {
    if (gameState !== 'playing') return
    let start = Date.now()
    
    const tick = () => {
      const now = Date.now()
      const t = now - start
      
      const stepId = ESCAPE_STEPS[stepIdx].id
      
      if (stepId === 'calm') {
        // Oscillate 0 to 100
        setBreathPhase((Math.sin(t / 550) + 1) * 50)
      }
      
      if (stepId === 'window') {
        // Erratic movement for safe zone
        setSafeZoneX(50 + Math.sin(t / 450) * 30 + Math.cos(t / 1000) * 15)
        
        setIsHolding(holding => {
          if (holding) {
            setMouseX(mx => {
              setSafeZoneX(sx => {
                if (Math.abs(mx - sx) < 15) {
                  setHoldProgress(hp => {
                    const next = hp + 0.5
                    if (next >= 100) {
                      handleWindowSuccess()
                      return 100
                    }
                    return next
                  })
                } else {
                  setHoldProgress(hp => Math.max(0, hp - 0.5)) // Drain if out of bounds
                }
                return sx
              })
              return mx
            })
          } else {
            setHoldProgress(hp => Math.max(0, hp - 1)) // Drain if not holding
          }
          return holding
        })
      }
      
      if (stepId === 'break' && headrestEquipped && !isShattered) {
        // Target moves around the center of the window area
        setTargetPos({
          x: 50 + Math.sin(t / 400) * 30,
          y: 50 + Math.cos(t / 300) * 20
        })
      }
      
      animRef.current = requestAnimationFrame(tick)
    }
    
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [gameState, stepIdx, headrestEquipped, isShattered])

  // Generate sequence for Step 2
  useEffect(() => {
    if (ESCAPE_STEPS[stepIdx].id === 'unbuckle') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789'
      const seq = Array.from({length: 8}).map(() => chars[Math.floor(Math.random() * chars.length)])
      setBeltSequence(seq)
      setBeltInputIdx(0)
    }
  }, [stepIdx])

  // Keydown listener for Step 2
  useEffect(() => {
    if (gameState !== 'playing' || ESCAPE_STEPS[stepIdx].id !== 'unbuckle') return
    
    const handleKey = (e) => {
      const key = e.key.toUpperCase()
      if (key === beltSequence[beltInputIdx]) {
        const next = beltInputIdx + 1
        setBeltInputIdx(next)
        if (next >= beltSequence.length) {
          // Success Cutscene
          setBeltSuccess(true)
          setTimeout(() => {
            setBeltUnbuckled(true)
            setStepIdx(i => i + 1)
          }, 1200)
        }
      } else {
        // Reset on mistake
        setBeltInputIdx(0)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [gameState, stepIdx, beltInputIdx, beltSequence])

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return
    const timer = setInterval(() => {
      setWaterLevel(prev => {
        const next = prev + 0.8 // ~125 seconds to fill 100%
        
        if (next >= 50 && !hasWarnedWaterRef.current) {
          hasWarnedWaterRef.current = true
          setMidGameNarrative({ text: "Water is at chest level! You must escape the vehicle immediately before the pressure locks the doors!", emotion: 'urgent', characterKey: 'dispatcher', visible: true })
        }

        if (next >= 100) {
          setGameState('failed')
          return 100
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameState])

  const step = ESCAPE_STEPS[stepIdx]

  const handleCalmClick = () => {
    if (breathPhase > 85) {
      // Success hit
      const nextProg = progress + 1
      if (nextProg >= step.req) {
        setProgress(0)
        setStepIdx(i => i + 1)
      } else {
        setProgress(nextProg)
      }
    } else {
      setWaterLevel(w => Math.min(100, w + 2))
    }
  }

  const handleWindowSuccess = () => {
    setIsHolding(false)
    setWindowBgOffset(20) // visually roll down
    
    // Sparks
    const newSparks = Array.from({length: 25}).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 150,
      y: (Math.random() - 0.5) * 150
    }))
    setSparks(newSparks)
    setWindowBgOffset(0) // bounce back
    
    setTimeout(() => {
      setStepIdx(i => i + 1) 
      setSparks([])
    }, 1500)
  }

  const handleBreakClick = (e) => {
    if (!headrestEquipped || isShattered) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = ((e.clientX - rect.left) / rect.width) * 100
    const clickY = ((e.clientY - rect.top) / rect.height) * 100
    
    const dist = Math.hypot(clickX - targetPos.x, clickY - targetPos.y)
    
    if (dist < 15) {
      const nextProg = progress + 1
      
      if (nextProg >= step.req) {
        setIsShattered(true)
        setCracks([])
        
        setTimeout(() => {
          setWaterInrush(true)
          setTimeout(() => {
            setProgress(0)
            setStepIdx(i => i + 1) // move to swim
          }, 1500)
        }, 500)
      } else {
        setCracks(prev => [...prev, { id: Date.now(), x: e.clientX - rect.left, y: e.clientY - rect.top, size: 50 + Math.random() * 80 }])
        setProgress(nextProg)
      }
    }
  }

  const handleSwimClick = () => {
    const newBubbles = Array.from({length: 30}).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      size: 10 + Math.random() * 40,
      delay: Math.random() * 0.8
    }))
    setBubbles(newBubbles)
    
    setTimeout(() => {
      setGameState('escaped')
      gameDispatch({ type:'RECORD_SCORE', payload:{ key:'flood-5', result:{ score: 100 - waterLevel, passed: true } } })
    }, 2000)
  }

  // Multi-POV Image Logic
  let bgImage = '/assets/medical/pov_front.png'
  if (step.id === 'unbuckle') bgImage = '/assets/medical/pov_buckle.png'
  else if (step.id === 'window') bgImage = '/assets/medical/pov_door.png'
  else if (step.id === 'break') {
    if (!headrestEquipped) bgImage = '/assets/medical/pov_headrest.png'
    else bgImage = '/assets/medical/pov_door.png'
  }
  else if (step.id === 'swim') bgImage = '/assets/medical/pov_underwater.png'

  const panicLevel = step.id === 'calm' ? 1 - (progress / step.req) : 0
  const shakeDur = waterInrush ? 0.1 : (2 - (waterLevel / 100) * 1.5)

  return (
    <div style={{ position:'fixed', inset:0, background:'#000', fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:'hidden' }}>
      
      <style>{`
        @keyframes slosh { 0%,100%{transform:rotate(0deg) translateY(0)} 25%{transform:rotate(-1deg) translateY(5px)} 75%{transform:rotate(1deg) translateY(-5px)} }
        @keyframes screenShake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(4px,4px)} 50%{transform:translate(-4px,-2px)} 75%{transform:translate(2px,-4px)} }
        @keyframes intenseShake { 0%,100%{transform:translate(0,0)} 20%{transform:translate(10px,10px)} 40%{transform:translate(-10px,-5px)} 60%{transform:translate(5px,-10px)} 80%{transform:translate(-10px,5px)} }
        @keyframes pulseCalm { 0%,100%{transform:scale(1); opacity:0.6} 50%{transform:scale(1.3); opacity:1} }
        @keyframes sparkFly { 0%{transform:translate(0,0) scale(1); opacity:1} 100%{transform:translate(var(--tx), var(--ty)) scale(0); opacity:0} }
        @keyframes floatUp { 0%{transform:translateY(100vh) scale(0.5); opacity:0} 20%{opacity:1; transform:translateY(80vh) scale(1)} 100%{transform:translateY(-20vh) scale(1.5); opacity:0} }
        @keyframes shardExplode { 0%{transform:translate3d(0,0,0) rotate(0deg); opacity:1} 100%{transform:translate3d(var(--tx), var(--ty), var(--tz)) rotate(var(--rot)); opacity:0} }
        @keyframes waterSurge { 0%{transform:translateX(-100%); opacity:0} 100%{transform:translateX(0); opacity:1} }
        @keyframes bgFade { 0%{opacity:0.5; filter:blur(10px)} 100%{opacity:1; filter:blur(0px)} }
        @keyframes cinematicFlash { 0%{opacity:1} 100%{opacity:0} }
        @keyframes beltSuccessSnap { 0%{transform:translate(-50%,-50%) scale(1)} 20%{transform:translate(-50%,-50%) scale(1.1); box-shadow:0 0 100px #22c55e} 100%{transform:translate(-50%,200%) scale(0.5); opacity:0} }
        
        .glass-crack { stroke: rgba(255,255,255,0.85); stroke-width: 1.5; fill: none; stroke-linecap: round; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }
        .headrest-cursor { cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M24 2 L20 20 L28 20 Z' fill='%2394a3b8'/><rect x='14' y='20' width='20' height='16' rx='4' fill='%231e293b'/></svg>") 24 2, crosshair !important; }
      `}</style>

      {/* Main Container with Shake */}
      <div style={{ position:'absolute', inset:0, animation:`${waterInrush ? 'intenseShake' : 'screenShake'} ${shakeDur}s infinite` }}>
        
        {/* Dynamic Background Image Switcher */}
        <div key={bgImage} style={{ position:'absolute', inset:0, zIndex:0, transform:`translateY(${windowBgOffset}px)`, transition:'transform 0.3s' }}>
          <img src={bgImage} alt="Car POV" style={{ width:'100%', height:'100%', objectFit:'cover', animation:'bgFade 0.5s ease-out forwards' }} />
          {/* Darkness as water rises */}
          <div style={{ position:'absolute', inset:0, background:`rgba(0,0,20,${0.3 + (waterLevel/100)*0.5})` }} />
        </div>

        {/* Dynamic Vignette (Panic) */}
        <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', background:`radial-gradient(circle at center, transparent 20%, rgba(30,0,0,${panicLevel * 0.95}) 80%)`, transition:'background 0.5s' }} />

        {/* Cinematic Screen Flash on Shatter */}
        {isShattered && <div style={{ position:'absolute', inset:0, zIndex:100, background:'#fff', pointerEvents:'none', animation:'cinematicFlash 1.5s cubic-bezier(0, 1, 0.5, 1) forwards' }}/>}

        {/* 2. Realistic Seatbelt UI Over pov_buckle */}
        {(step.id === 'unbuckle' || (step.id !== 'calm' && !beltUnbuckled)) && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:3 }}>
            {!beltUnbuckled && step.id === 'unbuckle' && (
              <div style={{ 
                position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:400, height:180, 
                background: beltSuccess ? 'rgba(20,83,45,0.95)' : 'rgba(185,28,28,0.95)', 
                borderRadius:16, border:`3px solid ${beltSuccess ? '#4ade80' : '#ef4444'}`, borderTop:`16px solid ${beltSuccess ? '#166534' : '#7f1d1d'}`, 
                pointerEvents:'auto', display:'flex', alignItems:'center', justifyContent:'center', 
                boxShadow:`0 0 50px ${beltSuccess ? 'rgba(74,222,128,0.8)' : 'rgba(239,68,68,0.6)'}`, backdropFilter:'blur(10px)',
                animation: beltSuccess ? 'beltSuccessSnap 1.2s cubic-bezier(0.5, -0.5, 0.2, 1) forwards' : 'none'
              }}>
                {/* Sequence display inside the buckle UI */}
                <div style={{ width:'80%', background:'#111', borderRadius:6, border:'3px solid #333', padding:16, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  {beltSequence.map((char, i) => (
                    <div key={i} style={{ color: beltSuccess ? '#4ade80' : i < beltInputIdx ? '#22c55e' : i === beltInputIdx ? '#fbbf24' : '#475569', fontSize:28, fontWeight:900, fontFamily:'monospace', transition:'color 0.2s' }}>
                      {char}
                    </div>
                  ))}
                </div>
                <div style={{ position:'absolute', top:-40, left:'50%', transform:'translateX(-50%)', color: beltSuccess ? '#4ade80' : '#fff', fontWeight:900, fontSize:18, textShadow:'0 4px 8px #000', whiteSpace:'nowrap', animation: beltSuccess ? 'none' : 'pulseCalm 1s infinite' }}>
                  {beltSuccess ? 'RELEASED!' : 'JAMMED! TYPE SEQUENCE:'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Glass Pane overlay for Break Window over pov_door */}
        {stepIdx >= 2 && step.id !== 'swim' && headrestEquipped && bgImage === '/assets/medical/pov_door.png' && (
          <div style={{ position:'absolute', top:'5%', left:'10%', width:'80%', height:'45%', zIndex:4, pointerEvents:'none' }}>
            
            <div className={headrestEquipped ? 'headrest-cursor' : ''} onClick={step.id === 'break' ? handleBreakClick : undefined} style={{ 
              position:'absolute', inset:0, 
              background: isShattered ? 'none' : 'rgba(255,255,255,0.05)', 
              boxShadow: isShattered ? 'none' : 'inset 0 0 20px rgba(255,255,255,0.1)', 
              pointerEvents: step.id === 'break' && headrestEquipped && !isShattered ? 'auto' : 'none', 
              overflow:'visible', border: isShattered ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}>
              
              {/* Moving Target for Break */}
              {step.id === 'break' && headrestEquipped && !isShattered && (
                <div style={{ position:'absolute', top:`${targetPos.y}%`, left:`${targetPos.x}%`, width:60, height:60, transform:'translate(-50%, -50%)', border:'3px dashed #ef4444', borderRadius:'50%', pointerEvents:'none', animation:'pulseCalm 0.5s infinite' }}>
                  <div style={{ position:'absolute', inset:20, background:'#ef4444', borderRadius:'50%' }}/>
                </div>
              )}

              {/* Cracks */}
              {!isShattered && cracks.length > 0 && (
                <svg width="100%" height="100%" style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                  {cracks.map(c => (
                    <g key={c.id} transform={`translate(${c.x}, ${c.y})`}>
                      <circle cx="0" cy="0" r="3" fill="#fff" filter="drop-shadow(0 0 4px #fff)" />
                      <path d={`M0,0 L${c.size},${c.size/3} M0,0 L${-c.size/1.2},${c.size} M0,0 L${c.size/2},${-c.size} M0,0 L${-c.size},${-c.size/2} M${c.size/3},${c.size/5} L${c.size/1.5},${-c.size/1.5} M${-c.size/2},${c.size/2} L${-c.size},${c.size/3}`} className="glass-crack" />
                    </g>
                  ))}
                </svg>
              )}

              {/* Shards falling animation on shatter */}
              {isShattered && (
                <div style={{ position:'absolute', inset:0, perspective:'1000px' }}>
                  {Array.from({length: 40}).map((_, i) => (
                    <div key={i} style={{ 
                      position:'absolute', 
                      top:`${20 + Math.random() * 60}%`, left:`${20 + Math.random() * 60}%`, 
                      width:`${40 + Math.random() * 60}px`, height:`${40 + Math.random() * 60}px`, 
                      background:'rgba(255,255,255,0.4)', backdropFilter:'blur(4px)', boxShadow:'inset 0 0 20px rgba(255,255,255,0.5)',
                      clipPath:`polygon(${Math.random()*100}% 0%, 100% ${Math.random()*100}%, ${Math.random()*100}% 100%, 0% ${Math.random()*100}%)`, 
                      animation:`shardExplode 1.5s cubic-bezier(0.1, 0.8, 0.2, 1) forwards`, 
                      '--tx':`${(Math.random()-0.5)*1500}px`,
                      '--ty':`${(Math.random()-0.5)*1500}px`,
                      '--tz':`${Math.random()*800}px`,
                      '--rot':`${(Math.random()-0.5)*1080}deg` 
                    }}/>
                  ))}
                </div>
              )}

              {/* Prompt */}
              {step.id === 'break' && headrestEquipped && !isShattered && cracks.length < step.req && (
                <div style={{ position:'absolute', bottom:20, left:20, color:'#fbbf24', fontWeight:900, fontSize:22, textShadow:'0 4px 15px rgba(0,0,0,0.9), 0 0 10px #fbbf24' }}>STRIKE MOVING TARGET!</div>
              )}
            </div>

            {/* Water Inrush Surge */}
            {waterInrush && (
              <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, rgba(14,165,233,0.9), transparent)', animation:'waterSurge 0.5s ease-out forwards', filter:'blur(4px)' }}/>
                <div style={{ position:'absolute', inset:0, background:'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.1\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23n)\' opacity=\'0.8\'/%3E%3C/svg%3E")', mixBlendMode:'overlay', animation:'waterSurge 0.5s ease-out forwards' }}/>
              </div>
            )}
          </div>
        )}

        {/* 3. Window Door Panel / Switch UI over pov_door */}
        {step.id === 'window' && (
          <div style={{ position:'absolute', bottom:'20%', left:'10%', width:'80%', height:'30%', pointerEvents:'none', zIndex:5, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            
            {/* Interaction Area wrapper to track mouse */}
            <div 
              onMouseDown={() => setIsHolding(true)} 
              onMouseUp={() => setIsHolding(false)} 
              onMouseLeave={() => setIsHolding(false)} 
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                setMouseX(((e.clientX - rect.left) / rect.width) * 100)
              }}
              style={{ position:'relative', width:300, height:100, background:'rgba(30,41,59,0.95)', borderRadius:'16px', border:'3px solid #334155', boxShadow:'inset 2px 2px 5px rgba(255,255,255,0.1), 0 30px 60px rgba(0,0,0,0.9)', pointerEvents:'auto', cursor:'pointer', overflow:'hidden', backdropFilter:'blur(10px)' }}
            >
              
              {/* Hold Progress BG */}
              <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${holdProgress}%`, background:'rgba(59,130,246,0.5)', transition:'width 0.1s' }}/>

              {/* Safe Zone */}
              <div style={{ position:'absolute', top:0, bottom:0, left:`${safeZoneX}%`, width:'30%', transform:'translateX(-50%)', background:'rgba(34,197,94,0.4)', borderLeft:'4px solid #22c55e', borderRight:'4px solid #22c55e' }}/>
              
              {/* Mouse Cursor Line */}
              <div style={{ position:'absolute', top:0, bottom:0, left:`${mouseX}%`, width:6, background:'#fff', transform:'translateX(-50%)', boxShadow:'0 0 10px #fff' }}/>

              {/* Switch Graphic */}
              <div style={{ position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)', width:60, height:40, background: isHolding ? '#0f172a' : '#334155', borderRadius:'8px 8px 0 0', border:'4px solid #000', borderBottomWidth:0, zIndex:10 }} />
              
              {/* Sparks */}
              {sparks.map(s => (
                <div key={s.id} style={{ position:'absolute', top:'50%', left:'50%', width:8, height:8, background:'#fbbf24', borderRadius:'50%', boxShadow:'0 0 20px 6px #fbbf24', '--tx':`${s.x}px`, '--ty':`${s.y}px`, animation:'sparkFly 0.6s cubic-bezier(0, 0.5, 0.5, 1) forwards' }}/>
              ))}
            </div>

            {sparks.length > 0 && <div style={{ position:'absolute', inset:0, background:'rgba(251,191,36,0.15)', animation:'pulse 0.1s infinite' }}/>}
            
            <div style={{ position:'absolute', top:'-30px', left:'50%', transform:'translateX(-50%)', color:'#fff', fontSize:18, fontWeight:900, textShadow:'0 2px 4px #000', whiteSpace:'nowrap' }}>HOLD SWITCH IN GREEN ZONE</div>
          </div>
        )}

        {/* Headrest Grab over pov_headrest */}
        {step.id === 'break' && !headrestEquipped && (
          <div onClick={() => setHeadrestEquipped(true)} style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:300, height:220, background:'rgba(51,65,85,0.85)', backdropFilter:'blur(10px)', borderRadius:'40px 40px 12px 12px', borderTop:'8px solid #475569', boxShadow:'0 30px 60px rgba(0,0,0,0.9)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', zIndex:5 }}>
            <div style={{ width:24, height:80, background:'linear-gradient(90deg, #94a3b8, #fff, #94a3b8)', marginTop:-80, position:'absolute', left:'25%' }}/>
            <div style={{ width:24, height:80, background:'linear-gradient(90deg, #94a3b8, #fff, #94a3b8)', marginTop:-80, position:'absolute', right:'25%' }}/>
            <div style={{ color:'#fff', marginTop:80, fontWeight:900, fontSize:24, textShadow:'0 4px 8px #000', textAlign:'center', animation:'pulseCalm 2s infinite' }}>CLICK TO DETACH<br/>HEADREST SPIKES</div>
          </div>
        )}

        {/* Main Base Rising Water (Overlays all POVs) */}
        <div style={{ position:'absolute', bottom:0, left:-50, right:-50, height:`${waterLevel}%`, background:'linear-gradient(180deg, rgba(14,165,233,0.7), rgba(15,23,42,0.95))', borderTop:'4px solid rgba(147,197,253,0.6)', zIndex:6, transition:'height 1s linear', animation:'slosh 4s ease-in-out infinite', backdropFilter:'blur(4px)', pointerEvents:'none' }}>
          <div style={{ position:'absolute', inset:0, opacity:0.2, background:'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.05\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }}/>
        </div>
        
        {/* Full-Screen Blue Tint from Water Inrush */}
        {waterInrush && <div style={{ position:'absolute', inset:0, background:'rgba(14,165,233,0.3)', pointerEvents:'none', zIndex:7, animation:'fadeIn 0.5s forwards' }}/>}

        {/* 1. Breathe QTE (Centered) */}
        {step.id === 'calm' && (
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center', zIndex:10 }}>
            <div onClick={handleCalmClick} style={{ width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'4px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backdropFilter:'blur(8px)', boxShadow:'0 0 40px rgba(255,255,255,0.2)', position:'relative' }}>
              <div style={{ position:'absolute', inset:10, borderRadius:'50%', border:'4px dashed #22c55e', opacity:0.8 }}/>
              <div style={{ position:'absolute', width:`${breathPhase}%`, height:`${breathPhase}%`, borderRadius:'50%', border:'4px solid #fff', boxShadow:'0 0 15px #fff' }}/>
              <div style={{ color:'#fff', fontWeight:900, fontSize:24, textShadow:'0 4px 15px rgba(0,0,0,0.9)', textAlign:'center', zIndex:2 }}>BREATHE<br/>{progress}/3</div>
            </div>
          </div>
        )}

        {/* 5. Swim Up (Centered) */}
        {step.id === 'swim' && (
          <div onClick={handleSwimClick} style={{ position:'absolute', inset:0, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
            <div style={{ fontSize:80, filter:'drop-shadow(0 0 30px rgba(59,130,246,0.9))', animation:'floatUp 2s infinite alternate' }}>🏊</div>
            <div style={{ color:'#fff', fontWeight:900, fontSize:32, marginTop:30, textShadow:'0 6px 30px #000', letterSpacing:6 }}>CLICK TO SWIM TO SURFACE</div>
            {bubbles.map(b => (
              <div key={b.id} style={{ position:'absolute', bottom:-100, left:`${b.left}%`, width:b.size, height:b.size, borderRadius:'50%', border:'3px solid rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.15)', animation:`floatUp 2s ease-in ${b.delay}s forwards` }}/>
            ))}
          </div>
        )}

      </div>

      {/* Top HUD */}
      <div style={{ position:'relative', zIndex:20, padding:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', pointerEvents:'none' }}>
        <div style={{ background:'rgba(15,23,42,0.9)', padding:'20px 28px', borderRadius:16, border:'2px solid #334155', maxWidth:380, backdropFilter:'blur(16px)', boxShadow:'0 15px 40px rgba(0,0,0,0.7)' }}>
          <div style={{ color:'#94a3b8', fontSize:11, fontWeight:900, letterSpacing:3, marginBottom:8 }}>ESCAPE PROTOCOL</div>
          <div style={{ color:'#f1f5f9', fontSize:22, fontWeight:900, marginBottom:10 }}>{stepIdx + 1}. {step.label}</div>
          <div style={{ color:'#cbd5e1', fontSize:14, lineHeight:1.6 }}>{step.instruction}</div>
          
          <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(239,68,68,0.15)', borderLeft:'4px solid #ef4444', borderRadius:6 }}>
            <div style={{ color:'#fca5a5', fontSize:12, lineHeight:1.5, fontWeight:700 }}>ACTION: {step.action}</div>
          </div>
        </div>

        <div style={{ background:'rgba(15,23,42,0.9)', padding:'20px 28px', borderRadius:16, border:`2px solid ${waterLevel > 70 ? '#ef4444' : '#334155'}`, textAlign:'center', minWidth:140, backdropFilter:'blur(16px)', boxShadow:'0 15px 40px rgba(0,0,0,0.7)' }}>
          <div style={{ color: waterLevel > 70 ? '#fca5a5' : '#94a3b8', fontSize:11, fontWeight:900, letterSpacing:3, marginBottom:6 }}>CABIN WATER</div>
          <div style={{ color: waterLevel > 70 ? '#ef4444' : '#0ea5e9', fontSize:40, fontWeight:900 }}>{Math.floor(waterLevel)}%</div>
        </div>
      </div>

      {/* In-Game Narrator */}
      {midGameNarrative && (
        <Narrator
          characterKey={midGameNarrative.characterKey}
          text={midGameNarrative.text}
          visible={midGameNarrative.visible}
          emotion={midGameNarrative.emotion}
          autoHide={true}
          onComplete={(status) => {
            if (status === 'hidden') setMidGameNarrative(prev => ({ ...prev, visible: false }))
          }}
        />
      )}

      {/* Result Overlays */}
      {gameState === 'failed' && (
        <div style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(0,0,0,0.95)', display:'flex', alignItems:'center', justifyContent:'center', padding:40, textAlign:'center', pointerEvents:'auto', overflow:'hidden' }}>
          {/* Mournful rain overlay */}
          <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(8deg, transparent 0 22px, rgba(140,170,210,0.07) 22px 24px)', backgroundSize:'100% 140px', animation:'rainFall 0.45s linear infinite', mixBlendMode:'screen', pointerEvents:'none' }}/>
          <style>{`@keyframes rainFall { from{background-position:0 0} to{background-position:0 200px} }`}</style>
          <div style={{ background:'linear-gradient(135deg,#7f1d1d,#450a0a)', padding:48, borderRadius:24, border:'3px solid #ef4444', maxWidth:640, boxShadow:'0 30px 80px rgba(239,68,68,0.5)', position:'relative', zIndex:1 }}>
            <div style={{ fontSize:80, marginBottom:20, animation:'bob 1.5s ease-in-out infinite', filter:'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>💀</div>
            <div style={{ color:'#fff', fontSize:36, fontWeight:900, letterSpacing:3, marginBottom:20 }}>CABIN FLOODED</div>
            <div style={{ color:'#fca5a5', fontSize:18, lineHeight:1.7, marginBottom:32 }}>
              You failed to escape before the water completely filled the vehicle.
              <br/><br/>
              <b>FEMA / Red Cross:</b> Panic hyperventilation consumes O₂ rapidly. Six inches of water can knock you down, 12 inches moves a car. Act immediately—do not wait.
            </div>
            <div style={{ display:'flex', gap:20, justifyContent:'center' }}>
              <button onClick={() => { setGameState('playing'); setWaterLevel(0); setStepIdx(0); setProgress(0); setHeadrestEquipped(false); setBeltUnbuckled(false); setCracks([]); setIsShattered(false); setWaterInrush(false); }} style={{ padding:'16px 40px', borderRadius:999, border:'none', background:'#ef4444', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 10px 30px rgba(239,68,68,0.5)' }}>🔄 RETRY ESCAPE</button>
              <button onClick={() => gameDispatch({ type:'BACK_TO_MODULES' })} style={{ padding:'16px 40px', borderRadius:999, border:'3px solid #ef4444', background:'transparent', color:'#ef4444', fontWeight:900, fontSize:16, cursor:'pointer' }}>← MODULES</button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'escaped' && (
        <div style={{ position:'absolute', inset:0, zIndex:50, background:'rgba(0,0,0,0.92)', display:'flex', alignItems:'center', justifyContent:'center', padding:40, textAlign:'center', pointerEvents:'auto', overflow:'hidden' }}>
          {/* Confetti rain */}
          {Array.from({length:32}).map((_,i)=>(
            <div key={i} style={{
              position:'absolute', left:`${(i*7+3)%97}%`, top:`-${10+(i%5)*8}px`,
              width:8, height:14, borderRadius:2,
              background:['#fbbf24','#34d399','#60a5fa','#f472b6','#a78bfa'][i%5],
              animation:`confettiFall ${3+i*0.12}s ease-in ${i*0.08}s infinite`,
              opacity:0.9,
            }}/>
          ))}
          <div style={{ background:'linear-gradient(135deg,#166534,#064e3b)', padding:48, borderRadius:24, border:'3px solid #22c55e', maxWidth:640, boxShadow:'0 30px 80px rgba(34,197,94,0.5)', position:'relative', zIndex:1, animation:'fadeIn 0.5s ease-out' }}>
            <div style={{ fontSize:80, marginBottom:20, filter:'drop-shadow(0 8px 16px rgba(0,0,0,0.5))', animation:'bob 2s ease-in-out infinite' }}>🏊</div>
            <div style={{ color:'#fff', fontSize:36, fontWeight:900, letterSpacing:3, marginBottom:10, textShadow:'0 4px 12px rgba(0,0,0,0.5)' }}>ESCAPE SUCCESSFUL</div>
            <div style={{ color:'#4ade80', fontSize:32, fontWeight:900, marginBottom:32, textShadow:'0 4px 12px rgba(74,222,128,0.4)' }}>SCORE: {Math.floor(100 - waterLevel)}</div>
            <div style={{ color:'#bbf7d0', fontSize:18, lineHeight:1.7, marginBottom:32 }}>
              You successfully followed NDMA guidelines to escape the sinking vehicle!
              <br/><br/>
              Remember: <b>Stay Calm, Unbuckle, Open Window, Break Window, Swim.</b>
            </div>
            <div style={{ display:'flex', gap:20, justifyContent:'center' }}>
              <button onClick={() => gameDispatch({ type:'BACK_TO_MODULES' })} style={{ padding:'16px 40px', borderRadius:999, border:'none', background:'#22c55e', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 10px 30px rgba(34,197,94,0.5)' }}>← FINISH CHAPTER</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function Module5_SinkingCar() {
  const [storyPhase, setStoryPhase] = useState('expertBrief') // expertBrief, routeAlert, flashFlood, sinkingCar
  const [selectedRoute, setSelectedRoute] = useState(null)
  const [feedback, setFeedback] = useState(null)
  
  useEffect(() => {
    if (storyPhase === 'flashFlood') {
      const t = setTimeout(() => setStoryPhase('sinkingCar'), 3500)
      return () => clearTimeout(t)
    }
  }, [storyPhase])

  if (storyPhase === 'expertBrief') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#050a15,#0a1628,#050a15)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Segoe UI',system-ui,sans-serif", position:'relative', overflow:'hidden' }}>
        {/* Storm sky atmospheric backdrop */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'url(/assets/shared/stormy_sky.jpg)', backgroundSize:'cover', backgroundPosition:'center', opacity:0.35, filter:'brightness(0.45) saturate(1.2)', pointerEvents:'none' }}/>
        {/* Rain */}
        <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(8deg, transparent 0 22px, rgba(180,210,255,0.08) 22px 24px)', backgroundSize:'100% 140px', animation:'rainFall 0.4s linear infinite', pointerEvents:'none', mixBlendMode:'screen' }}/>
        {/* Lightning */}
        <div style={{ position:'absolute', inset:0, background:'rgba(180,200,255,0.5)', animation:'lightningFlash 9s linear infinite', pointerEvents:'none' }}/>
        {/* Vignette */}
        <div style={{ position:'absolute', inset:0, boxShadow:'inset 0 0 240px 60px rgba(0,0,0,0.7)', pointerEvents:'none' }}/>
        <style>{`
          @keyframes rainFall { from{background-position:0 0} to{background-position:0 200px} }
          @keyframes lightningFlash { 0%,92%,100%{opacity:0} 93%,95%{opacity:0.85} 94%{opacity:0.3} }
          @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        `}</style>
        <div style={{ textAlign:'center', maxWidth:600, padding:40, animation:'fadeIn 1s ease-out', position:'relative', zIndex:1 }}>
          <div style={{ fontSize:14, color:'#ef4444', fontWeight:800, letterSpacing:4, marginBottom:6, animation:'pulse 2s infinite' }}>🚨 CRITICAL ESCALATION</div>
          <div style={{ fontSize:32, color:'#f1f5f9', fontWeight:900, marginBottom:8 }}>Trauma Specialist Required</div>
          <div style={{ color:'#94a3b8', fontSize:13, marginBottom:24, lineHeight:1.7 }}>
            The victims have been stabilized, but their internal injuries require a trauma specialist. 
            Due to the flooding, the main hospital is cut off. You must take the emergency vehicle and escort a medical expert from the city boundary back to the shelter.
          </div>
          <button onClick={() => setStoryPhase('routeAlert')} style={{ padding:'14px 48px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#dc2626,#991b1b)', color:'#fff', fontWeight:900, fontSize:16, cursor:'pointer', boxShadow:'0 8px 24px rgba(220,38,38,0.4)' }}>
            🚗 Get to the Vehicle
          </button>
        </div>
        <Narrator 
          characterKey="dispatcher" 
          visible={storyPhase === 'expertBrief'} 
          text="This is rescue dispatch. The injured victims are stabilized but need a trauma specialist. The roads are flooded and the hospital is cut off. You need to take the emergency vehicle to pick up the doctor at the city boundary. Be extremely careful—we are receiving reports of flash floods." 
        />
      </div>
    )
  }

  if (storyPhase === 'routeAlert') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#0a1628,#020617)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Segoe UI',system-ui,sans-serif", position:'relative' }}>
        
        <div style={{ position:'absolute', inset:0, opacity:0.3, overflow:'hidden', zIndex:0 }}>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'40%', background:'#111', transform:'perspective(500px) rotateX(60deg)' }}>
            <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:4, background:'#fbbf24', transform:'translateX(-50%)', borderStyle:'dashed', borderColor:'#fbbf24', borderWidth:'0 0 0 8px' }}/>
          </div>
        </div>

        <div style={{ position:'relative', zIndex:10, display:'flex', gap:40, alignItems:'center' }}>
          
          <div style={{ maxWidth:360 }}>
            <div style={{ fontSize:14, color:'#fbbf24', fontWeight:800, letterSpacing:2, marginBottom:8 }}>🗺️ NAVIGATION DECISION</div>
            <div style={{ fontSize:28, color:'#f1f5f9', fontWeight:900, marginBottom:16 }}>Choose Your Route</div>
            <div style={{ color:'#94a3b8', fontSize:14, lineHeight:1.6, marginBottom:24 }}>
              Before proceeding, consult the NDMA Emergency Resource Locator on your device. 
              The city is experiencing heavy rainfall. Flash floods are highly likely.
            </div>
            
            {selectedRoute && (
              <button 
                onClick={() => {
                  if (selectedRoute === 'highway') setFeedback('WARNING: Underpasses flood quickly. A flash flood hits your vehicle!')
                  else if (selectedRoute === 'bypass') setFeedback('WARNING: Unpaved roads collapse in floodwater. You are trapped and a flash flood hits!')
                  else setFeedback('Good choice using an elevated route. However, an unprecedented upstream embankment failure causes a flash flood wave!')
                  
                  setTimeout(() => setStoryPhase('flashFlood'), 3500)
                }}
                style={{ padding:'14px 32px', borderRadius:999, border:'none', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff', fontWeight:800, fontSize:15, cursor:'pointer', boxShadow:'0 8px 24px rgba(37,99,235,0.4)', animation:'pulse 2s infinite' }}>
                Start Route 🚗
              </button>
            )}
          </div>

          <div style={{ width:280, height:580, background:'#000', borderRadius:32, border:'4px solid #2a2a2a', boxShadow:'0 20px 50px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.1)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            
            <div style={{ display:'flex', justifyContent:'center', padding:'6px 0 0' }}>
              <div style={{ width:70, height:16, background:'#1a1a1a', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#0c1425', border:'1px solid #1e293b' }}/>
              </div>
            </div>
            
            <div style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)', padding:'10px 14px', display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
              <span style={{ fontSize:16 }}>📡</span>
              <div>
                <div style={{ color:'#fff', fontSize:11, fontWeight:800, letterSpacing:0.5 }}>NDMA Alert System</div>
                <div style={{ color:'#fca5a5', fontSize:8, fontWeight:600 }}>LIVE ROUTING DATA</div>
              </div>
            </div>

            <div style={{ flex:1, padding:12, background:'#050b18', overflowY:'auto' }}>
              <div style={{ color:'#93c5fd', fontSize:10, fontWeight:800, marginBottom:8 }}>AVAILABLE ROUTES TO BOUNDARY:</div>
              
              {ROUTES.map(r => (
                <div key={r.id} onClick={() => setSelectedRoute(r.id)} style={{ padding:10, borderRadius:8, marginBottom:10, cursor:'pointer', border:`2px solid ${selectedRoute === r.id ? '#3b82f6' : '#1e293b'}`, background: selectedRoute === r.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)', transition:'all 0.2s' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <div style={{ color:'#f1f5f9', fontWeight:800, fontSize:12 }}>{r.emoji} {r.name}</div>
                    <div style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:4, background: r.safety === 'danger' ? 'rgba(239,68,68,0.2)' : r.safety === 'caution' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)', color: r.safety === 'danger' ? '#ef4444' : r.safety === 'caution' ? '#f59e0b' : '#22c55e' }}>{r.status}</div>
                  </div>
                  
                  <div style={{ display:'flex', gap:10, color:'#94a3b8', fontSize:10, marginBottom:6 }}>
                    <span>⏱️ {r.time}</span>
                    <span>📏 {r.dist}</span>
                  </div>
                  
                  <div style={{ background:'rgba(0,0,0,0.3)', padding:6, borderRadius:4 }}>
                    <div style={{ color:'#fca5a5', fontSize:8, fontWeight:800, marginBottom:2 }}>⚠️ HAZARDS</div>
                    {r.hazards.map((h,i) => <div key={i} style={{ color:'#cbd5e1', fontSize:9 }}>• {h}</div>)}
                  </div>
                  
                  {selectedRoute === r.id && (
                    <div style={{ marginTop:8, padding:8, background:'rgba(37,99,235,0.15)', borderRadius:6, borderLeft:'3px solid #3b82f6' }}>
                      <div style={{ color:'#93c5fd', fontSize:8, fontWeight:800, marginBottom:2 }}>📋 NDMA GUIDELINE</div>
                      <div style={{ color:'#bfdbfe', fontSize:9, lineHeight:1.4 }}>{r.ndma}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div style={{ display:'flex', justifyContent:'center', padding:'8px 0', background:'#000' }}>
              <div style={{ width:60, height:4, borderRadius:2, background:'#333' }}/>
            </div>
          </div>
        </div>

        {feedback && <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', padding:40, textAlign:'center' }}>
          <div style={{ background:'linear-gradient(135deg,#7f1d1d,#450a0a)', padding:40, borderRadius:20, border:'2px solid #ef4444', maxWidth:600, animation:'fadeIn 0.3s' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🌊</div>
            <div style={{ color:'#fff', fontSize:20, fontWeight:800, lineHeight:1.5 }}>{feedback}</div>
          </div>
        </div>}
      </div>
    )
  }

  if (storyPhase === 'flashFlood') {
    return (
      <div style={{ position:'fixed', inset:0, background:'#020617', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'rgba(29,78,216,0.8)', animation:'waterRise 3s ease-in forwards' }}/>
        <div style={{ position:'relative', zIndex:10, textAlign:'center', animation:'screenShake 0.5s infinite' }}>
          <div style={{ fontSize:64, marginBottom:16 }}>🌊🚗</div>
          <div style={{ color:'#fff', fontSize:32, fontWeight:900, letterSpacing:4, background:'rgba(239,68,68,0.8)', padding:'8px 24px', borderRadius:8 }}>
            FLASH FLOOD SURGE
          </div>
          <div style={{ color:'#f1f5f9', fontSize:16, marginTop:16, fontWeight:700 }}>
            Your vehicle has been swept into deep floodwater.
          </div>
        </div>
        <style>{`
          @keyframes waterRise { 0% { top: 100% } 100% { top: 0% } }
          @keyframes screenShake { 0%, 100% { transform: translate(0, 0) } 25% { transform: translate(-10px, 10px) } 50% { transform: translate(10px, -10px) } 75% { transform: translate(-10px, -10px) } }
        `}</style>
      </div>
    )
  }

  if (storyPhase === 'sinkingCar') {
    return <InternalEscapeGame />
  }

  return null
}
