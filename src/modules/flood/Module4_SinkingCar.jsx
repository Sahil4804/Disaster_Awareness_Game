import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

const WATER_RISE_RATE = 0.4 // % per 100ms base rate
const WRONG_PENALTY = 8 // % water jump on wrong choice
const MAX_WATER = 100

function shuffleChoices(choices) {
  const a = [...choices]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const STEPS = [
  {
    id: 'calm',
    title: 'Stay Calm',
    instruction: '😰 The car is sinking! Water is seeping in. What do you do first?',
    emoji: '🧘',
    choices: [
      { id: 'calm', label: '🧘 Stay Calm — Control Breathing', correct: true, feedback: '✅ Correct! Panic causes hyperventilation and poor decisions. Taking 3 deep breaths gives you clarity. You have more time than you think — a car takes 1-2 minutes to fill.' },
      { id: 'panic', label: '😱 PANIC! Scream for Help!', correct: false, feedback: '❌ Panicking wastes oxygen and clouds your judgment. In a submerging car, you have about 60-120 seconds. Staying calm is step #1 — it could save your life.' },
      { id: 'call911', label: '📱 Call 911 Immediately', correct: false, feedback: '❌ Calling 911 takes precious time. By the time help arrives, the car will be fully submerged. You must act NOW — self-rescue is your only option in the first 60 seconds.' },
      { id: 'open_door', label: '🚪 Try to Force Open the Door', correct: false, feedback: '❌ Water pressure makes the door immovable. Even 1 foot of water creates 500 lbs of force on a car door. Save your energy for escape through the window.' },
    ],
  },
  {
    id: 'seatbelt',
    title: 'Remove Seatbelt',
    instruction: '🚗 You\'re calm. The water is ankle-deep inside the car. Next step?',
    emoji: '🔓',
    choices: [
      { id: 'seatbelt', label: '🔓 Unbuckle Your Seatbelt', correct: true, feedback: '✅ Correct! Your seatbelt traps you in the seat. Unbuckling is step #2. Many drowning victims are found still buckled in — they panicked and forgot this simple step.' },
      { id: 'door', label: '🚪 Try to Open the Door', correct: false, feedback: '❌ The door won\'t open! Water pressure outside pushes against it with hundreds of pounds of force. Even a strong adult can\'t push it open. You\'d waste energy and time.' },
      { id: 'window_early', label: '🪟 Roll Down the Window', correct: false, feedback: '❌ Good instinct, but you\'re still buckled! If you open the window while strapped in, water rushes in and you can\'t maneuver. Unbuckle FIRST, then deal with the window.' },
      { id: 'backseat', label: '🔙 Climb to the Back Seat', correct: false, feedback: '❌ Moving to the back seat only delays drowning — it doesn\'t solve the problem. Unbuckle first, then focus on getting OUT of the vehicle entirely.' },
    ],
  },
  {
    id: 'glovebox',
    title: 'Find a Tool',
    instruction: '🔓 Seatbelt is off. Water is rising to your knees. You need to break the window!',
    emoji: '🧰',
    choices: [
      { id: 'glovebox', label: '🧰 Check Glovebox for Glass Breaker / Use Headrest', correct: true, feedback: '✅ Correct! A glass breaker tool, or even the metal prongs of your headrest, can shatter tempered glass. Always keep a glass breaker in your car — it\'s a $10 life-saver.' },
      { id: 'fist', label: '👊 Punch the Window', correct: false, feedback: '❌ Car windows are tempered glass — incredibly strong against blunt force. You\'ll break your hand before the glass. You need a pointed tool that concentrates force on a tiny area.' },
      { id: 'phone', label: '📱 Use Your Phone to Break It', correct: false, feedback: '❌ A phone is too flat and light to break tempered glass. You need something with a sharp, hard point — like a glass breaker tool or the metal prongs of your headrest.' },
      { id: 'kick', label: '🦵 Kick the Window', correct: false, feedback: '❌ Kicking a car window while seated is nearly impossible due to the angle. Even standing outside, tempered glass resists blunt force. You need a pointed tool to concentrate force.' },
      { id: 'elbow', label: '💪 Use Your Elbow', correct: false, feedback: '❌ Your elbow can\'t generate enough concentrated force to break tempered glass. You\'ll injure yourself. The metal prongs on a headrest are designed to work as an emergency glass breaker.' },
    ],
  },
  {
    id: 'breakwindow',
    title: 'Break the Window',
    instruction: '🧰 You have a tool! Water is at chest level. Where do you strike?',
    emoji: '💥',
    choices: [
      { id: 'window_corner', label: '💥 Strike the CORNER of the Side Window', correct: true, feedback: '✅ Correct! Tempered glass is weakest at its corners. One sharp strike to the corner shatters the entire pane. Always aim for side windows — windshields are laminated and won\'t break the same way.' },
      { id: 'window_center', label: '💥 Strike the CENTER of the Window', correct: false, feedback: '❌ The center of tempered glass is its strongest point — it flexes and absorbs impacts. Hit the CORNER where stress concentrations are highest. One strike to the corner shatters it all.' },
      { id: 'windshield', label: '💥 Break the Windshield', correct: false, feedback: '❌ Windshields are LAMINATED glass (two layers bonded with plastic). They crack but don\'t shatter — you\'d waste all your energy and still be trapped. Always target the SIDE windows!' },
      { id: 'rear_window', label: '💥 Break the Rear Window', correct: false, feedback: '❌ The rear window is harder to reach from the driver seat. Focus on your nearest side window — every second counts when water is rising to your chest.' },
    ],
  },
  {
    id: 'waterentry',
    title: 'Water Rushes In!',
    instruction: '💥 Window is broken and water is pouring in fast! The car is filling rapidly!',
    emoji: '🌊',
    choices: [
      { id: 'deep_breath', label: '🫁 Take One Deep Breath Before Water Covers Your Face', correct: true, feedback: '✅ Critical! Take the deepest breath you can while your head is still above water. This gives you 30-60 seconds of air to pull yourself out and swim to the surface.' },
      { id: 'close_eyes', label: '😣 Close Your Eyes and Wait', correct: false, feedback: '❌ Closing your eyes and waiting wastes your air supply. Take a breath while you can and MOVE. The window is your exit — go NOW.' },
      { id: 'plug_window', label: '🤚 Try to Block the Water with Your Hands', correct: false, feedback: '❌ You can\'t stop water rushing through a broken window. The pressure is enormous. Use this moment to take a breath and escape.' },
      { id: 'float', label: '🏊 Let the Water Lift You to the Roof for Air', correct: false, feedback: '❌ Air pockets in sinking cars are unreliable and tiny. Don\'t wait — take a breath NOW and swim out through the window while you still can.' },
    ],
  },
  {
    id: 'escape',
    title: 'Escape!',
    instruction: '🫁 You have a lungful of air. The window is open. Go!',
    emoji: '🏊',
    choices: [
      { id: 'swim_out', label: '🏊 Pull Yourself Out Through the Window', correct: true, feedback: '✅ You made it out! Pull yourself through the window frame (watch for glass edges), and push away from the sinking car immediately.' },
      { id: 'grab_stuff', label: '🎒 Grab Your Belongings First', correct: false, feedback: '❌ Belongings can be replaced — your life cannot. Every second you spend grabbing items is a second closer to drowning. Get OUT immediately through the window.' },
      { id: 'wait', label: '⏳ Wait for the Car to Fill Completely', correct: false, feedback: '❌ While it\'s true that equalizing pressure lets you open the door, waiting that long is extremely dangerous. You might run out of air. The broken window is your exit — use it NOW.' },
    ],
  },
  {
    id: 'surface',
    title: 'Reach the Surface',
    instruction: '🏊 You\'re out of the car! But which direction is up? It\'s dark and disorienting underwater.',
    emoji: '⬆️',
    choices: [
      { id: 'follow_bubbles', label: '🫧 Follow Your Air Bubbles Upward', correct: true, feedback: '✅ Perfect! Air bubbles always rise toward the surface. If you\'re disoriented underwater, exhale a small amount and follow the bubbles up. Once at the surface, swim perpendicular to any current toward shore.' },
      { id: 'swim_random', label: '🏊 Swim in Any Direction Fast', correct: false, feedback: '❌ Panic swimming in a random direction can send you deeper. You could swim into the car or along the bottom. Follow your bubbles — they always go UP.' },
      { id: 'grab_car', label: '🚗 Hold Onto the Car', correct: false, feedback: '❌ The car is sinking! It will pull you down. Let go immediately, follow your bubbles to the surface, then swim away from the vehicle.' },
    ],
  },
]

export default function SinkingCarModule() {
  const { state, dispatch } = useGame()

  const [phase, setPhase] = useState('intro')
  const [currentStep, setCurrentStep] = useState(0)
  const [waterLevel, setWaterLevel] = useState(0)
  const [wrongChoices, setWrongChoices] = useState(0)
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [completedSteps, setCompletedSteps] = useState([])
  const [result, setResult] = useState(null)
  const [gameActive, setGameActive] = useState(false)
  const waterRef = useRef(0)
  const speedMultiplier = useRef(1)
  const animFrameRef = useRef(null)
  const lastTimeRef = useRef(null)
  const drownedRef = useRef(false)
  const completedStepsRef = useRef([])
  const currentStepRef = useRef(0)
  const wrongChoicesRef = useRef(0)

  const finishGame = useCallback((survived) => {
    setGameActive(false)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const stepsCompleted = completedStepsRef.current.length + (survived && currentStepRef.current === STEPS.length - 1 ? 1 : 0)
    const wrongs = wrongChoicesRef.current
    const score = survived
      ? Math.max(0, Math.min(100, 100 - wrongs * 15 - Math.floor(waterRef.current / 3)))
      : Math.max(0, stepsCompleted * 10 - wrongs * 5)
    const passed = survived

    const res = { passed, score, stepsCompleted, wrongChoices: wrongs, waterLevel: Math.round(waterRef.current), survived }
    setResult(res)
    setPhase('result')

    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: `${state.selectedDisaster}-4`, result: { score, passed } },
    })
  }, [dispatch, state.selectedDisaster])

  // Water rising animation loop
  useEffect(() => {
    if (!gameActive || feedbackMsg) return

    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      // Rise based on delta time
      const rise = (delta / 100) * WATER_RISE_RATE * speedMultiplier.current
      waterRef.current = Math.min(MAX_WATER, waterRef.current + rise)
      setWaterLevel(waterRef.current)

      if (waterRef.current >= MAX_WATER) {
        // Game over - drowned; set flag and deactivate, handled by separate useEffect
        drownedRef.current = true
        setGameActive(false)
        return
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      lastTimeRef.current = null
    }
  }, [gameActive, feedbackMsg])

  // Handle drowned game-over when gameActive transitions to false
  useEffect(() => {
    if (!gameActive && drownedRef.current && phase === 'game') {
      drownedRef.current = false
      finishGame(false)
    }
  }, [gameActive, phase, finishGame])

  const handleChoice = useCallback((choice) => {
    if (!gameActive) return

    if (choice.correct) {
      setFeedbackMsg({ text: choice.feedback, correct: true })
      const newCompleted = [...completedStepsRef.current, STEPS[currentStepRef.current].id]
      completedStepsRef.current = newCompleted
      setCompletedSteps(newCompleted)

      const stepAtChoice = currentStepRef.current
      setTimeout(() => {
        setFeedbackMsg(null)
        if (stepAtChoice >= STEPS.length - 1) {
          finishGame(true)
        } else {
          const next = stepAtChoice + 1
          currentStepRef.current = next
          setCurrentStep(next)
        }
      }, 2500)
    } else {
      wrongChoicesRef.current += 1
      setWrongChoices(wrongChoicesRef.current)
      speedMultiplier.current = Math.min(3, speedMultiplier.current + 0.3)
      // Add penalty water
      waterRef.current = Math.min(MAX_WATER, waterRef.current + WRONG_PENALTY)
      setWaterLevel(waterRef.current)
      setFeedbackMsg({ text: choice.feedback, correct: false })

      setTimeout(() => {
        setFeedbackMsg(null)
        if (waterRef.current >= MAX_WATER) {
          drownedRef.current = true
          setGameActive(false)
        }
      }, 2500)
    }
  }, [gameActive, finishGame])

  const startGame = () => {
    setPhase('game')
    setCurrentStep(0)
    currentStepRef.current = 0
    setWaterLevel(0)
    waterRef.current = 0
    speedMultiplier.current = 1
    setWrongChoices(0)
    wrongChoicesRef.current = 0
    setFeedbackMsg(null)
    setCompletedSteps([])
    completedStepsRef.current = []
    setResult(null)
    drownedRef.current = false
    setGameActive(true)
    lastTimeRef.current = null
  }

  const restart = () => {
    startGame()
  }

  // ── Hooks that must be called unconditionally (Rules of Hooks) ──
  // useMemo must NOT be after an early return — keep it here always
  const safeStep = STEPS[Math.min(currentStep, STEPS.length - 1)]
  const shuffledChoices = useMemo(
    () => shuffleChoices(safeStep.choices),
    [currentStep] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const waterPercent = Math.round(waterLevel)
  const waterColor = waterLevel > 70 ? '#dc2626' : waterLevel > 40 ? '#f59e0b' : '#3b82f6'

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={s.screen}>
        <div style={s.introCard}>
          <span style={{ fontSize: 64 }}>🚗</span>
          <h1 style={s.introTitle}>Module 4: The Sinking Car</h1>
          <div style={s.introBody}>
            <p><strong>Scenario:</strong> You drove into floodwater and your car is <span style={{ color: '#f87171', fontWeight: 700 }}>rapidly sinking</span>. Water is pouring in. You must escape before it fills completely.</p>
            <p style={{ marginTop: 12 }}><strong>How to play:</strong></p>
            <ul style={s.introList}>
              <li>🌊 Water rises constantly — wrong choices make it rise FASTER</li>
              <li>Complete 7 escape steps in the correct order</li>
              <li>Each step has multiple options — only ONE is correct</li>
              <li>If water reaches the top, you drown — GAME OVER</li>
            </ul>
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)' }}>
              <p style={{ color: '#fca5a5', fontSize: 14, margin: 0 }}>
                ⚠️ <strong>Real stat:</strong> Nearly half of all flood deaths in the US involve vehicles. Just 6 inches of moving water can knock you down. 12 inches can carry away a car.
              </p>
            </div>
          </div>
          <button style={s.goBtn} onClick={startGame}>
            🚗 Enter the Sinking Car!
          </button>
          <button style={s.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    return (
      <div style={s.screen}>
        <div style={s.resultCard}>
          <span style={{ fontSize: 56 }}>{result.survived ? '🏊' : '💀'}</span>
          <h2 style={{ ...s.resultTitle, color: result.survived ? '#22c55e' : '#ef4444' }}>
            {result.survived ? 'YOU ESCAPED!' : 'YOU DROWNED'}
          </h2>
          <p style={s.scoreText}>
            Score: <strong>{result.score}%</strong> — {result.stepsCompleted}/{STEPS.length} steps completed, {result.wrongChoices} wrong choices
          </p>
          {!result.survived && (
            <div style={s.failBox}>
              <strong>Water level: {result.waterLevel}%</strong> — The car filled before you could escape.
              {result.wrongChoices > 0 && ` Your ${result.wrongChoices} wrong choice(s) made water rise faster.`}
            </div>
          )}

          <div style={s.educationBox}>
            <h3 style={{ color: '#60a5fa', marginBottom: 12, fontSize: 16 }}>📚 The 7-Step Car Escape Protocol</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Memorize this sequence: <strong style={{ color: '#fbbf24' }}>SCUBA</strong> — Stay calm, C(seatbelt) off, Undo window, Break glass, Away (swim out)
            </p>
            {STEPS.map((step, i) => {
              const completed = completedSteps.includes(step.id)
              return (
                <div key={step.id} style={{ ...s.stepReview, borderLeftColor: completed ? '#22c55e' : '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#0f172a', background: completed ? '#22c55e' : '#64748b', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <strong style={{ color: '#f1f5f9', fontSize: 15 }}>{step.emoji} {step.title}</strong>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: completed ? '#4ade80' : '#94a3b8' }}>
                      {completed ? '✅ Completed' : '❌ Not reached'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                    {step.choices.find(c => c.correct).feedback}
                  </p>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 16, padding: 16, background: 'rgba(251,191,36,0.08)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.2)', width: '100%' }}>
            <p style={{ color: '#fde68a', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              🚗 <strong>Prevention is key:</strong> NEVER drive into floodwater. "Turn Around, Don't Drown" — you cannot judge depth or current from the surface. Keep a glass breaker tool in your car at all times.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button style={s.retryBtn} onClick={restart}>Try Again</button>
            <button style={s.backBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GAME ──
  const step = safeStep

  return (
    <div style={s.gameContainer}>
      <div style={s.header}>
        <button style={s.backBtnSmall} onClick={() => { setGameActive(false); dispatch({ type: 'BACK_TO_MODULES' }) }}>← Quit</button>
        <h2 style={s.gameTitle}>🚗 Escape the Sinking Car!</h2>
        <div style={{ fontSize: 14, color: '#f87171', fontWeight: 700 }}>
          💀 Wrong choices: {wrongChoices}
        </div>
      </div>

      {/* Step progress */}
      <div style={s.stepProgress}>
        {STEPS.map((st, i) => {
          const done = completedSteps.includes(st.id)
          const active = i === currentStep
          return (
            <div key={st.id} style={{
              ...s.stepDot,
              background: done ? '#22c55e' : active ? '#fbbf24' : 'rgba(255,255,255,0.1)',
              borderColor: done ? '#22c55e' : active ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              transform: active ? 'scale(1.2)' : 'scale(1)',
            }}>
              <span style={{ fontSize: 14 }}>{done ? '✅' : st.emoji}</span>
              <span style={{ fontSize: 9, color: done ? '#4ade80' : active ? '#fde68a' : '#94a3b8', whiteSpace: 'nowrap' }}>{st.title}</span>
            </div>
          )
        })}
      </div>

      <div style={s.gameLayout}>
        {/* Car scene with water */}
        <div style={s.carScene}>
          {/* Car body */}
          <div style={s.carBody}>
            {/* Interior */}
            <div style={s.carInterior}>
              {/* Dashboard */}
              <div style={s.dashboard}>
                <span style={{ fontSize: 18 }}>🔲</span>
                <span style={{ fontSize: 14 }}>📻</span>
                <span style={{ fontSize: 18 }}>🔲</span>
              </div>

              {/* Seats area */}
              <div style={s.seatsArea}>
                <div style={s.seat}>
                  <span style={{ fontSize: 28 }}>🧑</span>
                  <span style={{ fontSize: 11, color: '#fde68a' }}>YOU</span>
                </div>
                <div style={s.seatDivider} />
                <div style={s.seat}>
                  <span style={{ fontSize: 20 }}>💺</span>
                </div>
              </div>

              {/* Glovebox indicator */}
              {currentStep === 2 && (
                <div style={s.gloveboxHighlight}>
                  <span style={{ fontSize: 12 }}>🧰</span>
                </div>
              )}

              {/* Window indicators */}
              <div style={s.windowLeft}>
                {currentStep >= 3 ? (
                  <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>💥</span>
                ) : (
                  <span style={{ fontSize: 10, color: '#60a5fa' }}>🪟</span>
                )}
              </div>
              <div style={s.windowRight}>
                <span style={{ fontSize: 10, color: '#60a5fa' }}>🪟</span>
              </div>

              {/* Rising water inside car */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${waterPercent}%`,
                background: `linear-gradient(0deg, rgba(29,78,216,0.7) 0%, rgba(59,130,246,0.4) 100%)`,
                transition: 'height 0.3s',
                borderRadius: '0 0 8px 8px',
                zIndex: 2,
              }}>
                {/* Water surface ripple */}
                <div style={{
                  position: 'absolute', top: -2, left: 0, right: 0, height: 4,
                  background: 'rgba(147,197,253,0.5)',
                  borderRadius: 2,
                }} />
              </div>
            </div>

            {/* Wheels */}
            <div style={{ ...s.wheel, left: 20 }}>⚫</div>
            <div style={{ ...s.wheel, right: 20 }}>⚫</div>
          </div>

          {/* Water level gauge */}
          <div style={s.waterGauge}>
            <div style={s.gaugeLabel}>🌊 Water Level</div>
            <div style={s.gaugeTrack}>
              <div style={{
                ...s.gaugeFill,
                height: `${waterPercent}%`,
                background: waterLevel > 70 ? 'linear-gradient(0deg, #dc2626, #ef4444)' : waterLevel > 40 ? 'linear-gradient(0deg, #f59e0b, #fbbf24)' : 'linear-gradient(0deg, #1d4ed8, #3b82f6)',
              }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: waterColor, fontFamily: 'monospace' }}>
              {waterPercent}%
            </div>
            {waterLevel > 70 && (
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, animation: 'pulse 0.5s infinite alternate' }}>
                ⚠️ CRITICAL
              </div>
            )}
          </div>

          {/* Bubbles decoration */}
          {waterLevel > 20 && (
            <>
              <span style={{ position: 'absolute', bottom: '15%', left: '20%', fontSize: 12, opacity: 0.4, animation: 'float 2s infinite' }}>🫧</span>
              <span style={{ position: 'absolute', bottom: '25%', right: '30%', fontSize: 10, opacity: 0.3, animation: 'float 3s infinite' }}>🫧</span>
            </>
          )}
        </div>

        {/* Choice panel */}
        <div style={s.choicePanel}>
          <div style={s.stepHeader}>
            <span style={{ fontSize: 32 }}>{step.emoji}</span>
            <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>
              Step {currentStep + 1}: {step.title}
            </h3>
          </div>

          <p style={{ color: '#e2e8f0', fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>
            {step.instruction}
          </p>

          {feedbackMsg ? (
            <div style={{
              padding: 16, borderRadius: 10,
              background: feedbackMsg.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${feedbackMsg.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: feedbackMsg.correct ? '#86efac' : '#fca5a5',
              fontSize: 14, lineHeight: 1.7,
            }}>
              {feedbackMsg.text}
            </div>
          ) : (
            <div style={s.choiceList}>
              {shuffledChoices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  style={s.choiceBtn}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{choice.label}</span>
                </button>
              ))}
            </div>
          )}

          {wrongChoices > 0 && !feedbackMsg && (
            <div style={{ marginTop: 16, padding: 10, background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
              <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>
                ⚠️ Water is rising faster! Each wrong choice increases the flow rate. Choose carefully!
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { from { opacity: 1; } to { opacity: 0.5; } }
        @keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
      `}</style>
    </div>
  )
}

const s = {
  screen: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 24, color: '#f1f5f9',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 100%)',
  },
  introCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: 560, padding: 48, background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center', color: '#f1f5f9',
  },
  introTitle: { fontSize: 28, fontWeight: 800, marginTop: 16, marginBottom: 20, color: '#f1f5f9' },
  introBody: { textAlign: 'left', lineHeight: 1.8, fontSize: 15, color: '#cbd5e1' },
  introList: { marginTop: 8, paddingLeft: 20, listStyle: 'disc', color: '#e2e8f0' },
  goBtn: {
    marginTop: 28, padding: '14px 40px', fontSize: 17, fontWeight: 700,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
  },
  gameContainer: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0a0e1a 0%, #0f172a 100%)', color: '#f1f5f9',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.3)',
  },
  gameTitle: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  backBtnSmall: { background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 13 },
  stepProgress: {
    display: 'flex', gap: 4, padding: '10px 24px', background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.04)', justifyContent: 'center',
  },
  stepDot: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
    transition: 'all 0.3s', minWidth: 60,
  },
  gameLayout: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  carScene: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, position: 'relative',
    background: 'linear-gradient(180deg, #1e3a5f 0%, #0c2340 100%)',
  },
  carBody: {
    position: 'relative', width: 320, height: 200,
    background: 'linear-gradient(180deg, #374151, #4b5563)',
    borderRadius: '60px 60px 12px 12px',
    border: '3px solid #6b7280',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  carInterior: {
    position: 'absolute', top: 20, left: 20, right: 20, bottom: 10,
    background: '#1f2937', borderRadius: '40px 40px 8px 8px',
    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
  },
  dashboard: {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '6px 16px', background: 'rgba(0,0,0,0.3)',
  },
  seatsArea: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 16px', gap: 12, position: 'relative', zIndex: 3,
  },
  seat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  },
  seatDivider: {
    width: 2, height: 30, background: 'rgba(255,255,255,0.1)', borderRadius: 1,
  },
  gloveboxHighlight: {
    position: 'absolute', top: 8, right: 30,
    background: 'rgba(251,191,36,0.3)', border: '2px solid #fbbf24',
    borderRadius: 6, padding: '2px 6px',
    animation: 'pulse 0.7s infinite alternate', zIndex: 5,
  },
  windowLeft: {
    position: 'absolute', left: 4, top: '30%',
    background: 'rgba(59,130,246,0.15)', borderRadius: 4, padding: '2px 4px',
    border: '1px solid rgba(59,130,246,0.3)', zIndex: 3,
  },
  windowRight: {
    position: 'absolute', right: 4, top: '30%',
    background: 'rgba(59,130,246,0.15)', borderRadius: 4, padding: '2px 4px',
    border: '1px solid rgba(59,130,246,0.3)', zIndex: 3,
  },
  wheel: {
    position: 'absolute', bottom: -14, fontSize: 20,
  },
  waterGauge: {
    position: 'absolute', right: 24, top: 24, bottom: 24,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  gaugeLabel: { fontSize: 11, color: '#93c5fd', fontWeight: 600 },
  gaugeTrack: {
    width: 24, flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 12,
    overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  },
  gaugeFill: {
    width: '100%', borderRadius: 12, transition: 'height 0.3s',
  },
  choicePanel: {
    width: 360, minWidth: 300, padding: 24, display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.06)',
    overflowY: 'auto',
  },
  stepHeader: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
    padding: 12, background: 'rgba(59,130,246,0.08)', borderRadius: 10,
    border: '1px solid rgba(59,130,246,0.2)',
  },
  choiceList: { display: 'flex', flexDirection: 'column', gap: 10 },
  choiceBtn: {
    padding: '14px 16px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2s',
    textAlign: 'left',
  },
  resultCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: 640, width: '100%', padding: 40, background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
    maxHeight: '90vh', overflowY: 'auto', color: '#f1f5f9',
  },
  resultTitle: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  scoreText: { fontSize: 16, marginTop: 8, color: '#cbd5e1' },
  failBox: {
    marginTop: 16, padding: 16, background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
    fontSize: 14, lineHeight: 1.6, width: '100%', color: '#fca5a5',
  },
  educationBox: {
    marginTop: 20, padding: 20, background: 'rgba(59,130,246,0.08)', borderRadius: 12,
    border: '1px solid rgba(59,130,246,0.2)', width: '100%',
  },
  stepReview: {
    padding: '12px 14px', marginBottom: 8, borderRadius: 6,
    background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid',
  },
  retryBtn: {
    padding: '10px 28px', fontSize: 15, fontWeight: 600,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  backBtn: {
    padding: '10px 28px', fontSize: 15, fontWeight: 600,
    background: '#334155', color: '#e0e0e0',
    border: 'none', borderRadius: 8, cursor: 'pointer',
  },
}
