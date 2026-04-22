import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGame } from '../../context/GameContext'
import Narrator from '../../components/Narrator'

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ALL_ROUNDS = [
  {
    id: 'day',
    label: 'DAY - Sunny',
    vehicle: 'helicopter',
    vehicleEmoji: '🚁',
    correctTool: 'mirror',
    sky: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 40%, #bae6fd 100%)',
    sun: true,
    stars: false,
    fog: false,
    description: 'A rescue helicopter is flying overhead in bright sunlight!',
    hint: 'Sunlight reflects brilliantly off shiny surfaces...',
    wrongFeedback: {
      flare: 'Flares are hard to see in bright daylight. A mirror reflects sunlight for miles — visible even from aircraft!',
      whistle: 'A whistle can\'t be heard over helicopter rotors at that distance. Use something visual in daylight!',
      flag: 'A signal flag is decent but hard to spot from a fast-moving helicopter at altitude. A mirror flash is visible for miles!',
      fire: 'Smoke from a fire works but takes time to build. A mirror gives an instant, blinding flash visible to aircraft!',
    },
  },
  {
    id: 'night',
    label: 'NIGHT - Dark',
    vehicle: 'boat',
    vehicleEmoji: '🚤',
    correctTool: 'flare',
    sky: 'linear-gradient(180deg, #020617 0%, #0f172a 40%, #1e293b 100%)',
    sun: false,
    stars: true,
    fog: false,
    description: 'A rescue boat is approaching in the darkness!',
    hint: 'You need something that creates its own bright light...',
    wrongFeedback: {
      mirror: 'No sunlight to reflect at night! A mirror is useless in darkness. You need your own light source.',
      whistle: 'Sound carries at night, but the boat engine is loud. A visual signal cuts through darkness instantly!',
      flag: 'A flag is invisible in the dark — no one can see colors at night. You need light!',
      fire: 'A signal fire takes too long to build in an emergency at night. A flare gives instant, bright light!',
    },
  },
  {
    id: 'fog',
    label: 'FOG - Misty',
    vehicle: 'boat',
    vehicleEmoji: '🚤',
    correctTool: 'whistle',
    sky: 'linear-gradient(180deg, #94a3b8 0%, #cbd5e1 40%, #e2e8f0 60%, #94a3b8 100%)',
    sun: false,
    stars: false,
    fog: true,
    description: 'A rescue boat is somewhere nearby in thick fog!',
    hint: 'Visibility is near zero. What signal works without sight?',
    wrongFeedback: {
      mirror: 'No sunlight penetrates this fog. A mirror is completely useless here!',
      flare: 'Flare light scatters in fog and can\'t be pinpointed. Sound travels straight through fog!',
      flag: 'A flag is invisible in dense fog — you can\'t see 10 feet ahead. Use sound instead!',
      fire: 'Smoke blends into fog and light scatters. Sound is the only signal that cuts through zero visibility!',
    },
  },
  {
    id: 'dusk',
    label: 'DUSK - Twilight',
    vehicle: 'helicopter',
    vehicleEmoji: '🚁',
    correctTool: 'flare',
    sky: 'linear-gradient(180deg, #f97316 0%, #a855f7 40%, #6b21a8 100%)',
    sun: false,
    stars: false,
    fog: false,
    description: 'A helicopter is scanning the area at dusk! Light is fading fast.',
    hint: 'Mirror won\'t work without direct sunlight...',
    wrongFeedback: {
      mirror: 'The sun has set — there\'s no direct sunlight to reflect. A mirror is useless at dusk!',
      whistle: 'A helicopter\'s rotors drown out all sound. You need a bright visual signal against the darkening sky!',
      flag: 'In fading twilight light, a flag blends into the dark landscape. You need your own light source!',
      fire: 'A fire takes too long to build and the helicopter will pass before it\'s ready. A flare is instant!',
    },
  },
  {
    id: 'rain',
    label: 'RAIN - Heavy Downpour',
    vehicle: 'boat',
    vehicleEmoji: '🚤',
    correctTool: 'flag',
    sky: 'linear-gradient(180deg, #64748b 0%, #475569 40%, #334155 100%)',
    sun: false,
    stars: false,
    fog: false,
    rain: true,
    description: 'A patrol boat is nearby in heavy rain! Visibility is poor but not zero.',
    hint: 'Sound is drowned by rain, light is scattered... what about high-contrast visuals?',
    wrongFeedback: {
      mirror: 'No sunlight in a downpour — a mirror reflects nothing. You need a visible signal!',
      flare: 'Rain extinguishes flares quickly and scatters the light. A flare won\'t last in this downpour!',
      whistle: 'The roar of heavy rain on water drowns out whistle sounds. You need a visual signal!',
      fire: 'You can\'t start or maintain a fire in heavy rain. Think of something that doesn\'t need ignition!',
    },
  },
  {
    id: 'distance',
    label: 'FAR - Distant Boat',
    vehicle: 'boat',
    vehicleEmoji: '🚤',
    correctTool: 'fire',
    sky: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 40%, #bae6fd 100%)',
    sun: true,
    stars: false,
    fog: false,
    description: 'A boat is very far away on the horizon! You need something visible from miles away.',
    hint: 'You need something visible from miles away...',
    wrongFeedback: {
      mirror: 'A mirror flash could work in theory, but at this extreme distance you need sustained visibility. Smoke from a fire rises high and is visible for miles!',
      flare: 'A flare burns for only 30-60 seconds — not long enough for a distant boat to spot and navigate to you. You need sustained visibility!',
      whistle: 'Sound dissipates over distance. A whistle can\'t be heard from miles away!',
      flag: 'A small flag is invisible at this distance. You need something with a massive visual footprint!',
    },
  },
]

const ALL_TOOLS = [
  { id: 'mirror', name: 'Signal Mirror', emoji: '🪞', color: '#38bdf8' },
  { id: 'flare', name: 'Flare Gun', emoji: '🔥', color: '#f97316' },
  { id: 'whistle', name: 'Whistle', emoji: '📯', color: '#a78bfa' },
  { id: 'flag', name: 'Signal Flag', emoji: '🚩', color: '#ef4444' },
  { id: 'fire', name: 'Signal Fire', emoji: '🔥', color: '#f59e0b' },
]

const ROUND_TIME = 15
const BASE_POINTS = 100
const SPEED_BONUS_MAX = 50

export default function SOSSignalingModule() {
  const { dispatch } = useGame()

  // Expanded phases
  const [phase, setPhase] = useState('intro') // intro | round | flareAim | mirrorAim | whistleBlow | feedback | result
  const [roundIdx, setRoundIdx] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME)
  const [scores, setScores] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackOk, setFeedbackOk] = useState(false)
  const [vehiclePos, setVehiclePos] = useState(0)
  const [roundFailed, setRoundFailed] = useState(false)
  
  // Mirror State
  const [mirrorX, setMirrorX] = useState(50)
  const [mirrorY, setMirrorY] = useState(50)
  const [mirrorHoldTime, setMirrorHoldTime] = useState(0)

  // Whistle State
  const [whistleCode, setWhistleCode] = useState([]) // Array of 'S' (short) or 'L' (long)
  const [isBlowing, setIsBlowing] = useState(false)
  const blowStartRef = useRef(0)

  const timerRef = useRef(null)
  const animRef = useRef(null)

  const ROUNDS = useMemo(() => shuffleArray(ALL_ROUNDS), [])
  const TOOLS = useMemo(() => shuffleArray(ALL_TOOLS), [])

  const round = ROUNDS[roundIdx] || ROUNDS[0]

  // Timer countdown
  useEffect(() => {
    if (!['round', 'flareAim', 'mirrorAim', 'whistleBlow'].includes(phase)) return
    if (timeLeft <= 0) {
      handleTimeout()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft, phase])

  // Vehicle animation loop
  useEffect(() => {
    if (!['round', 'flareAim', 'mirrorAim', 'whistleBlow'].includes(phase)) return
    let start = Date.now()
    
    const tick = () => {
      setVehiclePos(p => {
        const next = p + 0.15
        return next > 100 ? -10 : next
      })
      
      // Mirror Logic: Check intersection
      if (phase === 'mirrorAim') {
        setVehiclePos(vPos => {
          setMirrorX(mx => {
            // Vehicle is at x=vPos, y=~20
            const dx = mx - vPos
            const dy = mirrorY - 20
            const dist = Math.hypot(dx, dy)
            if (dist < 10) {
              setMirrorHoldTime(ht => {
                const newHt = ht + 0.05
                if (newHt >= 2) {
                  // Success
                  handleMiniGameSuccess('✅ Great tracking! The pilot saw the flash and is coming around!')
                  return 2
                }
                return newHt
              })
            } else {
              setMirrorHoldTime(ht => Math.max(0, ht - 0.02))
            }
            return mx
          })
          return vPos
        })
      }
      
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, mirrorY])

  const handleTimeout = useCallback(() => {
    clearTimeout(timerRef.current)
    setRoundFailed(true)
    setFeedbackMsg('⏰ Too slow! The rescuers passed by without seeing you. Every second counts in a real emergency!')
    setFeedbackOk(false)
    setPhase('feedback')
    setScores(prev => [...prev, 0])
  }, [])

  const handleMiniGameSuccess = useCallback((msg) => {
    clearTimeout(timerRef.current)
    const timeUsed = ROUND_TIME - timeLeft
    const speedBonus = Math.max(0, Math.round(SPEED_BONUS_MAX * (1 - timeUsed / ROUND_TIME)))
    const pts = BASE_POINTS + speedBonus
    setScores(prev => [...prev, pts])
    setFeedbackOk(true)
    setRoundFailed(false)
    setFeedbackMsg(`${msg} +${pts} points`)
    setPhase('feedback')
  }, [timeLeft])

  const handleMiniGameFail = useCallback((msg) => {
    clearTimeout(timerRef.current)
    setScores(prev => [...prev, 0])
    setFeedbackOk(false)
    setRoundFailed(true)
    setFeedbackMsg(msg)
    setPhase('feedback')
  }, [])

  const handleToolSelect = useCallback((toolId) => {
    if (phase !== 'round') return

    if (toolId === round.correctTool) {
      if (toolId === 'flare' && (round.id === 'night' || round.id === 'dusk')) {
        setPhase('flareAim')
        return
      }
      if (toolId === 'mirror' && (round.id === 'day' || round.id === 'distance')) {
        setPhase('mirrorAim')
        setMirrorHoldTime(0)
        return
      }
      if (toolId === 'whistle' && round.id === 'fog') {
        setPhase('whistleBlow')
        setWhistleCode([])
        return
      }
      
      clearTimeout(timerRef.current)
      const timeUsed = ROUND_TIME - timeLeft
      const speedBonus = Math.max(0, Math.round(SPEED_BONUS_MAX * (1 - timeUsed / ROUND_TIME)))
      const pts = BASE_POINTS + speedBonus
      setScores(prev => [...prev, pts])
      setFeedbackOk(true)
      setRoundFailed(false)
      const toolName = TOOLS.find(t => t.id === toolId).name
      setFeedbackMsg(`✅ Correct! ${toolName} is perfect for ${round.label} conditions! +${pts} points`)
      setPhase('feedback')
    } else {
      clearTimeout(timerRef.current)
      setScores(prev => [...prev, 0])
      setFeedbackOk(false)
      setRoundFailed(true)
      setFeedbackMsg(`❌ Wrong tool! ${round.wrongFeedback[toolId]}`)
      setPhase('feedback')
    }
  }, [phase, round, timeLeft, TOOLS])

  const handleFlareAim = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = (e.clientY - rect.top) / rect.height

    if (clickY < 0.45) {
      handleMiniGameSuccess('✅ Great aim! You fired the flare HIGH into the sky where rescuers can see it!')
    } else {
      handleMiniGameFail('🚫 Never aim a flare at rescuers! Flares burn at 1,500°F and can injure or kill. Always fire HIGH into the sky!')
    }
  }, [handleMiniGameSuccess, handleMiniGameFail])

  const handleMirrorMove = useCallback((e) => {
    if (phase !== 'mirrorAim') return
    const rect = e.currentTarget.getBoundingClientRect()
    setMirrorX(((e.clientX - rect.left) / rect.width) * 100)
    setMirrorY(((e.clientY - rect.top) / rect.height) * 100)
  }, [phase])

  // Whistle Logic
  useEffect(() => {
    if (phase !== 'whistleBlow') return
    
    const handleDown = (e) => {
      if (e.key === ' ' && !isBlowing) {
        setIsBlowing(true)
        blowStartRef.current = Date.now()
      }
    }
    const handleUp = (e) => {
      if (e.key === ' ' && isBlowing) {
        setIsBlowing(false)
        const dur = Date.now() - blowStartRef.current
        const type = dur < 300 ? 'S' : 'L'
        setWhistleCode(prev => {
          const next = [...prev, type]
          // Check win condition
          // SOS is 3 Short, 3 Long, 3 Short. We'll simplify to just getting 3 of any type for the sake of the minigame, or exact.
          // Let's do a simplified check: just need 3 shorts in a row.
          if (next.join('').includes('SSS')) {
            handleMiniGameSuccess('✅ They heard the distress signal! Sound travels well in fog.')
          }
          if (next.length > 8) return [] // reset if they mess up
          return next
        })
      }
    }
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
    }
  }, [phase, isBlowing, handleMiniGameSuccess])


  const nextRound = useCallback(() => {
    if (roundIdx + 1 >= ROUNDS.length) {
      setPhase('result')
    } else {
      setRoundIdx(r => r + 1)
      setTimeLeft(ROUND_TIME)
      setVehiclePos(0)
      setRoundFailed(false)
      setPhase('round')
    }
  }, [roundIdx, ROUNDS.length])

  const totalScore = scores.reduce((a, b) => a + b, 0)
  const maxPossible = ROUNDS.length * (BASE_POINTS + SPEED_BONUS_MAX)
  const normalizedScore = Math.round((totalScore / maxPossible) * 100)
  const passed = totalScore >= BASE_POINTS * 3

  const finishModule = () => {
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: { score: normalizedScore, passed } } })
    dispatch({ type: 'BACK_TO_MODULES' })
  }

  const renderStars = () => {
    const stars = []
    for (let i = 0; i < 30; i++) {
      stars.push(
        <div key={i} style={{
          position: 'absolute', left: `${(i * 37 + 13) % 100}%`, top: `${(i * 23 + 7) % 50}%`,
          width: i % 3 === 0 ? 3 : 2, height: i % 3 === 0 ? 3 : 2,
          borderRadius: '50%', background: '#fff', opacity: 0.5 + (i % 5) * 0.1,
        }} />
      )
    }
    return stars
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>🆘</div>
          <h1 style={styles.title}>Module 6: SOS Signaling</h1>
          <p style={styles.text}>
            You have escaped the sinking vehicle and are stranded on nearby debris. 
            Rescue teams are passing nearby. You must signal them correctly based on the conditions!
          </p>
          <div style={{ ...styles.infoBox, background: 'rgba(56,189,248,0.15)', borderColor: '#38bdf8' }}>
            <p style={styles.text}>🪞 <strong>Mirror</strong> — Reflects sunlight over great distances</p>
            <p style={styles.text}>🔥 <strong>Flare</strong> — Creates bright light in darkness</p>
            <p style={styles.text}>📯 <strong>Whistle</strong> — Sound cuts through zero-visibility</p>
            <p style={styles.text}>🚩 <strong>Signal Flag</strong> — High-contrast visual in poor conditions</p>
            <p style={styles.text}>🔥 <strong>Signal Fire</strong> — Smoke visible from miles away</p>
          </div>
          <p style={{ ...styles.text, color: '#fbbf24' }}>
            ⏱️ You have {ROUND_TIME} seconds per round before rescuers pass!
          </p>
          <button style={styles.btnPrimary} onClick={() => { setPhase('round'); setTimeLeft(ROUND_TIME); setVehiclePos(0) }}>
            Start Signaling 🚨
          </button>
          <button style={styles.btnBack} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
        <Narrator 
          characterKey="dispatcher" 
          visible={phase === 'intro'} 
          text="You made it out! Good job. We have rescue units patrolling the area. You need to signal them so they can find you. Choose the right signaling method based on the weather conditions. If it's sunny, use a mirror. If it's night, use a flare or flashlight. Pay attention!" 
        />
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>{passed ? '🎉' : '😞'}</div>
          <h1 style={styles.title}>{passed ? 'Rescue Successful!' : 'Rescue Failed'}</h1>
          <div style={{ ...styles.scoreBox, borderColor: passed ? '#22c55e' : '#ef4444' }}>
            <span style={{ fontSize: 36, fontWeight: 'bold', color: passed ? '#22c55e' : '#ef4444' }}>
              {normalizedScore}%
            </span>
            <span style={styles.text}> ({totalScore} / {maxPossible} pts)</span>
          </div>
          <div style={{ width: '100%', marginTop: 16 }}>
            {ROUNDS.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', margin: '4px 0', borderRadius: 8,
                background: scores[i] > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              }}>
                <span style={styles.text}>{r.vehicleEmoji} {r.label}</span>
                <span style={{ ...styles.text, color: scores[i] > 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                  {scores[i] > 0 ? `+${scores[i]}` : 'Failed'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ ...styles.infoBox, background: 'rgba(251,191,36,0.1)', borderColor: '#fbbf24', marginTop: 16 }}>
            <p style={styles.text}>
              💡 <strong>Remember:</strong> Mirror for sun, Flare for dark/dusk (aim HIGH!), Whistle for fog,
              Flag for rain, Fire for extreme distance. Matching your signal to conditions can mean life or death.
            </p>
          </div>
          <button style={styles.btnPrimary} onClick={finishModule}>
            {passed ? 'Complete Module ✅' : 'Finish ❌'}
          </button>
        </div>
      </div>
    )
  }

  // ── FEEDBACK ──
  if (phase === 'feedback') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 56 }}>{feedbackOk ? '✅' : '❌'}</div>
          <h2 style={{ ...styles.title, fontSize: 22, color: feedbackOk ? '#22c55e' : '#ef4444' }}>
            Round {roundIdx + 1}: {round.label}
          </h2>
          <p style={{ ...styles.text, fontSize: 18, lineHeight: 1.6, textAlign: 'center' }}>
            {feedbackMsg}
          </p>
          <button style={styles.btnPrimary} onClick={nextRound}>
            {roundIdx + 1 >= ROUNDS.length ? 'See Results' : 'Next Round →'}
          </button>
        </div>
      </div>
    )
  }

  // ── FLARE AIM ──
  if (phase === 'flareAim') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.scene, background: round.sky, cursor: 'crosshair', position: 'relative' }} onClick={handleFlareAim}>
          {renderStars()}
          <div style={{ position: 'absolute', bottom: '18%', left: `${vehiclePos}%`, fontSize: 40, transition: 'left 0.1s linear' }}>{round.vehicleEmoji}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20%', background: 'linear-gradient(180deg, rgba(30,58,138,0.7), rgba(15,23,42,0.9))' }} />
          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: 12, border: '2px solid #f97316' }}>
            <p style={{ ...styles.text, fontSize: 18, textAlign: 'center', margin: 0 }}>🎯 Click HIGH in the sky to fire the flare!</p>
            <p style={{ ...styles.text, fontSize: 14, textAlign: 'center', margin: '4px 0 0', color: '#fbbf24' }}>⚠️ Do NOT aim at the rescue boat!</p>
          </div>
          <div style={{ position: 'absolute', top: '45%', left: 0, right: 0, borderTop: '1px dashed rgba(255,255,255,0.15)' }} />
          <div style={{ position: 'absolute', top: '46%', right: 12, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>↑ AIM HIGH</div>
          <div style={styles.timerBadge}>⏱️ {timeLeft}s</div>
        </div>
      </div>
    )
  }

  // ── MIRROR AIM ──
  if (phase === 'mirrorAim') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.scene, background: round.sky, position: 'relative', overflow:'hidden' }} onMouseMove={handleMirrorMove}>
          <div style={{ position: 'absolute', top: '8%', right: '15%', width: 60, height: 60, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 40px 15px rgba(251,191,36,0.4)' }} />
          <div style={{ position: 'absolute', top: '20%', left: `${vehiclePos}%`, fontSize: 40, transition: 'left 0.1s linear' }}>{round.vehicleEmoji}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(180deg, rgba(56,189,248,0.6), rgba(14,165,233,0.8))' }} />
          
          {/* Mirror Reflection Dot */}
          <div style={{ position:'absolute', top:`${mirrorY}%`, left:`${mirrorX}%`, width:30, height:30, background:'#fff', borderRadius:'50%', transform:'translate(-50%, -50%)', pointerEvents:'none', boxShadow:'0 0 30px 10px rgba(255,255,255,0.8)' }}>
            {mirrorHoldTime > 0 && <div style={{ position:'absolute', inset:-10, border:'2px solid #22c55e', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>}
          </div>

          <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: 12, border: '2px solid #38bdf8' }}>
            <p style={{ ...styles.text, fontSize: 16, textAlign: 'center', margin: 0 }}>🪞 Move your mouse to track the helicopter with the reflection!</p>
          </div>
          <div style={styles.timerBadge}>⏱️ {timeLeft}s</div>
        </div>
        <style>{`@keyframes spin { 100% { transform:rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── WHISTLE BLOW ──
  if (phase === 'whistleBlow') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.scene, background: round.sky, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(148,163,184,0.9)', backdropFilter: 'blur(8px)', zIndex:5 }} />
          <div style={{ position: 'absolute', bottom: '18%', left: `${vehiclePos}%`, fontSize: 40, transition: 'left 0.1s linear', filter:'blur(4px)', opacity:0.3, zIndex:1 }}>{round.vehicleEmoji}</div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(180deg, rgba(30,58,138,0.7), rgba(15,23,42,0.9))', zIndex:1 }} />
          
          <div style={{ position: 'absolute', inset:0, zIndex:10, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.7)', padding: '10px 20px', borderRadius: 12, border: '2px solid #a78bfa', marginBottom:20 }}>
              <p style={{ ...styles.text, fontSize: 16, textAlign: 'center', margin: 0 }}>📯 Tap SPACEBAR 3 times quickly to signal SOS in the fog!</p>
            </div>
            
            <div style={{ display:'flex', gap:10 }}>
              {whistleCode.map((c, i) => (
                <div key={i} style={{ width: c==='S'?20:40, height:20, background:'#a78bfa', borderRadius:10, boxShadow:'0 0 10px #a78bfa' }}/>
              ))}
            </div>
            
            <div style={{ marginTop:30, fontSize:64, filter:`drop-shadow(0 0 20px ${isBlowing ? '#a78bfa' : 'transparent'})`, transform: isBlowing ? 'scale(1.1)' : 'scale(1)' }}>📯</div>
          </div>

          <div style={{...styles.timerBadge, zIndex:20}}>⏱️ {timeLeft}s</div>
        </div>
      </div>
    )
  }

  // ── ROUND (tool selection) ──
  return (
    <div style={styles.container}>
      <div style={{ ...styles.scene, background: round.sky, position: 'relative' }}>
        {round.sun && <div style={{ position: 'absolute', top: '8%', right: '15%', width: 60, height: 60, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 40px 15px rgba(251,191,36,0.4)' }} />}
        {round.stars && renderStars()}
        {round.fog && <div style={{ position: 'absolute', inset: 0, background: 'rgba(148,163,184,0.5)', backdropFilter: 'blur(3px)' }} />}
        <div style={{ position: 'absolute', top: round.vehicle === 'helicopter' ? '20%' : undefined, bottom: round.vehicle === 'boat' ? '18%' : undefined, left: `${vehiclePos}%`, fontSize: 44, filter: round.fog ? 'blur(2px)' : 'none', zIndex: 2 }}>{round.vehicleEmoji}</div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: (round.id === 'day' || round.id === 'distance') ? 'linear-gradient(180deg, rgba(56,189,248,0.6), rgba(14,165,233,0.8))' : 'linear-gradient(180deg, rgba(30,58,138,0.7), rgba(15,23,42,0.9))', zIndex: 1 }} />
        <div style={{ position: 'absolute', bottom: '22%', left: '10%', fontSize: 36, zIndex: 3 }}>🏠🧍</div>
        <div style={styles.timerBadge}>⏱️ {timeLeft}s</div>
        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: 8, color: '#f1f5f9', fontWeight: 'bold', fontSize: 14 }}>Round {roundIdx + 1}/{ROUNDS.length} — {round.label}</div>
      </div>

      <div style={{ padding: '12px 16px', textAlign: 'center' }}>
        <p style={{ ...styles.text, fontSize: 16, margin: 0 }}>{round.description}</p>
        <p style={{ ...styles.text, fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>{round.hint}</p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '8px 16px 20px', flexWrap: 'wrap' }}>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => handleToolSelect(tool.id)} style={{
            background: `rgba(${tool.id === 'mirror' ? '56,189,248' : tool.id === 'flare' ? '249,115,22' : tool.id === 'whistle' ? '167,139,250' : tool.id === 'flag' ? '239,68,68' : '245,158,11'},0.15)`,
            border: `2px solid ${tool.color}`, borderRadius: 16, padding: '16px 24px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 100,
          }}>
            <span style={{ fontSize: 36 }}>{tool.emoji}</span>
            <span style={{ color: tool.color, fontWeight: 'bold', fontSize: 14 }}>{tool.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif" },
  card: { background: '#1e293b', borderRadius: 20, padding: '32px 28px', maxWidth: 700, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, border: '1px solid #334155' },
  scene: { width: '100%', maxWidth: 1000, height: 500, borderRadius: '16px 16px 0 0', position: 'relative', overflow: 'hidden' },
  title: { color: '#f1f5f9', margin: 0, fontSize: 26, textAlign: 'center' },
  text: { color: '#f1f5f9', margin: '4px 0', fontSize: 15, lineHeight: 1.5 },
  infoBox: { border: '1px solid', borderRadius: 12, padding: '12px 16px', width: '100%' },
  scoreBox: { border: '2px solid', borderRadius: 16, padding: '16px 32px', display: 'flex', alignItems: 'baseline', gap: 8 },
  btnPrimary: { background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 'bold', cursor: 'pointer', marginTop: 8 },
  btnBack: { background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 10, padding: '10px 24px', fontSize: 14, cursor: 'pointer' },
  timerBadge: { position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.7)', color: '#fbbf24', padding: '6px 14px', borderRadius: 8, fontWeight: 'bold', fontSize: 16, zIndex: 10 },
}
