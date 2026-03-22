import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

const TIMER_SECONDS = 90

const TASKS = [
  { id: 'electricity', label: 'Main Electrical Breaker', emoji: '⚡', order: 1 },
  { id: 'gas', label: 'Gas Valve', emoji: '🔥', order: 2 },
  { id: 'sandbags', label: 'Sandbag Placement', emoji: '🧱', order: 3 },
  { id: 'windows', label: 'Close & Lock All Windows', emoji: '🪟', order: 4 },
  { id: 'valuables', label: 'Move Valuables to Upper Floor', emoji: '📦', order: 5 },
  { id: 'documents', label: 'Grab Waterproof Document Bag', emoji: '📋', order: 6 },
]

const TASK_EXPLANATIONS = {
  electricity: '⚡ Floodwater conducts electricity. If your home floods with the breaker ON, anyone touching the water could be electrocuted. Always shut off electricity FIRST.',
  gas: '🔥 Rising water can crack gas lines, causing leaks. A single spark near a gas leak causes explosions. Turn off the gas valve AFTER electricity is safe.',
  sandbags: '🧱 Sandbags in a staggered brick pattern interlock and resist water pressure. Straight stacking leaves gaps that water pushes through easily.',
  windows: '🪟 Closed windows slow water entry and prevent debris from flying in. Lock them — water pressure can push unlocked windows open.',
  valuables: '📦 Electronics, important papers, and irreplaceable items should go to the highest floor. Floodwater ruins everything on ground level within minutes.',
  documents: '📋 Insurance papers, IDs, birth certificates, and medical records in a waterproof bag are critical for recovery. Without them, getting aid takes weeks longer.',
}

// Sandbag brick pattern: 3 rows
// Row 0 (top): 1 bag centered
// Row 1 (mid): 2 bags
// Row 2 (bottom): 3 bags
// Staggered means each row is offset by half a bag width
const SANDBAG_SLOTS = [
  // row, col, correct position index, isStaggered
  { id: 0, row: 0, col: 1, label: 'Top Center' },
  { id: 1, row: 1, col: 0, label: 'Mid Left' },
  { id: 2, row: 1, col: 1, label: 'Mid Right' },
  { id: 3, row: 2, col: 0, label: 'Bot Left' },
  { id: 4, row: 2, col: 1, label: 'Bot Center' },
  { id: 5, row: 2, col: 2, label: 'Bot Right' },
]

export default function HomeDefenseModule() {
  const { state, dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | game | sandbag | result
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [completedTasks, setCompletedTasks] = useState([])
  const [currentWarning, setCurrentWarning] = useState(null)
  const [sandbagPlaced, setSandbagPlaced] = useState([]) // indices of placed bags
  const [sandbagMode, setSandbagMode] = useState('staggered') // staggered | straight
  const [sandbagFailed, setSandbagFailed] = useState(false)
  const [sandbagComplete, setSandbagComplete] = useState(false)
  const [result, setResult] = useState(null)
  const [taskFeedback, setTaskFeedback] = useState(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)

  // Timer
  useEffect(() => {
    if (phase !== 'game' && phase !== 'sandbag') return
    if (timeLeft <= 0) {
      finishGame()
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase])

  const handleTaskClick = useCallback((taskId) => {
    if (phase !== 'game') return
    if (completedTasks.includes(taskId)) return

    const task = TASKS.find(t => t.id === taskId)
    const expectedOrder = completedTasks.length + 1

    if (task.order !== expectedOrder) {
      setWrongAttempts(w => w + 1)
      if (taskId === 'gas' && completedTasks.length === 0) {
        setCurrentWarning('⚠️ You must shut off electricity FIRST to prevent electrocution! Floodwater + live wires = instant death.')
      } else if (taskId === 'sandbags' && completedTasks.length < 2) {
        setCurrentWarning('⚠️ Secure utilities first! Sandbags won\'t help if your house explodes from a gas leak or electrocutes your family.')
      } else if (taskId === 'windows' && completedTasks.length < 3) {
        setCurrentWarning('⚠️ Secure utilities and sandbags first! Windows come after the most dangerous threats are handled.')
      } else if (taskId === 'valuables' && completedTasks.length < 4) {
        setCurrentWarning('⚠️ Not yet! Close windows first to slow water entry, then move valuables upstairs.')
      } else if (taskId === 'documents' && completedTasks.length < 5) {
        setCurrentWarning('⚠️ Move valuables upstairs first! Grab your document bag last — it goes with you when you evacuate.')
      } else if (completedTasks.includes(taskId)) {
        setCurrentWarning('⚠️ You already completed this step!')
      } else {
        setCurrentWarning('⚠️ Wrong order! Think about what poses the most immediate danger.')
      }
      setTimeout(() => setCurrentWarning(null), 3000)
      return
    }

    const newCompleted = [...completedTasks, taskId]
    setCompletedTasks(newCompleted)
    setTaskFeedback({ taskId, text: TASK_EXPLANATIONS[taskId] })
    setTimeout(() => setTaskFeedback(null), 3000)

    if (taskId === 'sandbags') {
      setPhase('sandbag')
    }

    // Check if all non-sandbag tasks are done (sandbag task transitions to sandbag phase)
    if (taskId !== 'sandbags' && newCompleted.length === TASKS.length) {
      setTimeout(() => finishGame(true), 1500)
    }
  }, [phase, completedTasks])

  const handleSandbagClick = useCallback((slotId) => {
    if (sandbagPlaced.includes(slotId) || sandbagComplete) return
    const newPlaced = [...sandbagPlaced, slotId]
    setSandbagPlaced(newPlaced)

    if (newPlaced.length === 6) {
      setSandbagComplete(true)
      // Check if placed in valid brick/staggered pattern (all slots filled = correct since slots define the pattern)
      // Return to game phase for remaining tasks after sandbags
      setTimeout(() => setPhase('game'), 1500)
    }
  }, [sandbagPlaced, sandbagComplete])

  const handleStraightStack = useCallback(() => {
    setSandbagFailed(true)
    setWrongAttempts(w => w + 1)
    setCurrentWarning('❌ Straight stacking fails! Sandbags stacked directly on top of each other leave vertical gaps. Water finds these gaps and pushes through. The staggered BRICK pattern interlocks bags so water can\'t find a straight path through.')
    setTimeout(() => {
      setCurrentWarning(null)
      setSandbagFailed(false)
    }, 4000)
  }, [])

  const finishGame = useCallback((allDone = false) => {
    const tasksCompleted = allDone ? TASKS.length : completedTasks.length
    const timeBonus = Math.max(0, Math.floor(timeLeft / 10))
    const taskScore = Math.round(tasksCompleted * (80 / TASKS.length))
    const penaltyScore = wrongAttempts * 5
    const score = Math.max(0, Math.min(100, taskScore + timeBonus - penaltyScore))
    const passed = tasksCompleted === TASKS.length && allDone

    const res = { passed, score, tasksCompleted, wrongAttempts, timeLeft }
    setResult(res)
    setPhase('result')

    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: `${state.selectedDisaster}-2`, result: { score, passed } },
    })
  }, [completedTasks, timeLeft, wrongAttempts, dispatch, state.selectedDisaster])

  const restart = () => {
    setPhase('game')
    setTimeLeft(TIMER_SECONDS)
    setCompletedTasks([])
    setCurrentWarning(null)
    setSandbagPlaced([])
    setSandbagMode('staggered')
    setSandbagFailed(false)
    setSandbagComplete(false)
    setResult(null)
    setTaskFeedback(null)
    setWrongAttempts(0)
  }

  // ── INTRO SCREEN ──
  if (phase === 'intro') {
    return (
      <div style={s.screen}>
        <div style={s.introCard}>
          <span style={{ fontSize: 64 }}>🏠</span>
          <h1 style={s.introTitle}>Module 2: Home Defense</h1>
          <div style={s.introBody}>
            <p><strong>Scenario:</strong> Floodwaters are rising toward your home. You have <span style={{ color: '#f87171', fontWeight: 700 }}>90 seconds</span> to secure your house before water reaches the front door.</p>
            <p style={{ marginTop: 12 }}><strong>Your Tasks (in the correct order):</strong></p>
            <ul style={s.introList}>
              <li>⚡ Switch off the main electrical breaker</li>
              <li>🔥 Turn off the gas valve</li>
              <li>🧱 Place sandbags at the front door in a brick pattern</li>
              <li>🪟 Close & lock all windows</li>
              <li>📦 Move valuables to the upper floor</li>
              <li>📋 Grab your waterproof document bag</li>
            </ul>
            <p style={{ marginTop: 12, color: '#fbbf24' }}>⚠️ Order matters! Doing things in the wrong sequence can be fatal.</p>
          </div>
          <button style={s.goBtn} onClick={() => setPhase('game')}>
            🏠 Defend Your Home — 90s Timer Begins!
          </button>
          <button style={s.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (phase === 'result' && result) {
    return (
      <div style={s.screen}>
        <div style={s.resultCard}>
          <span style={{ fontSize: 56 }}>{result.passed ? '🏆' : '💀'}</span>
          <h2 style={{ ...s.resultTitle, color: result.passed ? '#22c55e' : '#ef4444' }}>
            {result.passed ? 'HOME SECURED!' : 'HOME COMPROMISED'}
          </h2>
          <p style={s.scoreText}>
            Score: <strong>{result.score}%</strong> — {result.tasksCompleted}/{TASKS.length} tasks completed
          </p>
          {result.wrongAttempts > 0 && (
            <p style={{ color: '#f59e0b', fontSize: 14, marginTop: 4 }}>
              ⚠️ {result.wrongAttempts} wrong attempt(s) — each mistake costs lives in a real flood
            </p>
          )}

          <div style={s.educationBox}>
            <h3 style={{ color: '#60a5fa', marginBottom: 12, fontSize: 16 }}>📚 Why This Order Matters</h3>
            <div style={s.eduItem}>
              <strong>1. ⚡ Electricity First:</strong> Floodwater is an excellent conductor. A live circuit in standing water creates an invisible death trap. FEMA reports electrocution as a leading cause of flood deaths inside homes.
            </div>
            <div style={s.eduItem}>
              <strong>2. 🔥 Gas Second:</strong> Rising water puts pressure on gas lines and can crack fittings. A gas leak + any ignition source = explosion. Shutting gas off prevents your home from becoming a bomb.
            </div>
            <div style={s.eduItem}>
              <strong>3. 🧱 Sandbags Third:</strong> The staggered brick pattern is critical — it creates an interlocking wall with no straight-through gaps. Each bag overlaps the seam below, forcing water to travel a longer path and losing energy.
            </div>
            <div style={s.eduItem}>
              <strong>4. 🪟 Windows Fourth:</strong> Closed and locked windows slow water entry and prevent debris from flying in. Water pressure can push unlocked windows open, so locking them matters.
            </div>
            <div style={s.eduItem}>
              <strong>5. 📦 Valuables Fifth:</strong> Electronics, important papers, and irreplaceable items should go to the highest floor. Floodwater ruins everything on ground level within minutes.
            </div>
            <div style={s.eduItem}>
              <strong>6. 📋 Documents Last:</strong> Insurance papers, IDs, birth certificates, and medical records in a waterproof bag are critical for recovery. Grab this last because it goes with you when you evacuate.
            </div>
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

  // ── SANDBAG PHASE ──
  if (phase === 'sandbag') {
    const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e'
    return (
      <div style={s.gameContainer}>
        <div style={s.header}>
          <button style={s.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>← Quit</button>
          <h2 style={s.gameTitle}>🧱 Place Sandbags — Brick Pattern!</h2>
          <div style={{ ...s.timer, color: timerColor }}>
            ⏱ {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <p style={{ color: '#f1f5f9', fontSize: 16, marginBottom: 8, textAlign: 'center' }}>
            Click each slot to place a sandbag in the <strong style={{ color: '#fbbf24' }}>staggered brick pattern</strong>
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
            The brick pattern interlocks bags so water cannot push through vertical gaps.
          </p>

          {/* Door frame */}
          <div style={s.doorFrame}>
            <div style={s.doorLabel}>🚪 FRONT DOOR</div>

            {/* Sandbag pyramid - staggered brick */}
            <div style={s.sandbagArea}>
              {/* Row 0 - top: 1 bag, offset */}
              <div style={s.sandbagRow}>
                <SandbagSlot slot={SANDBAG_SLOTS[0]} placed={sandbagPlaced.includes(0)} onClick={() => handleSandbagClick(0)} />
              </div>
              {/* Row 1 - mid: 2 bags */}
              <div style={s.sandbagRow}>
                <SandbagSlot slot={SANDBAG_SLOTS[1]} placed={sandbagPlaced.includes(1)} onClick={() => handleSandbagClick(1)} />
                <SandbagSlot slot={SANDBAG_SLOTS[2]} placed={sandbagPlaced.includes(2)} onClick={() => handleSandbagClick(2)} />
              </div>
              {/* Row 2 - bottom: 3 bags */}
              <div style={s.sandbagRow}>
                <SandbagSlot slot={SANDBAG_SLOTS[3]} placed={sandbagPlaced.includes(3)} onClick={() => handleSandbagClick(3)} />
                <SandbagSlot slot={SANDBAG_SLOTS[4]} placed={sandbagPlaced.includes(4)} onClick={() => handleSandbagClick(4)} />
                <SandbagSlot slot={SANDBAG_SLOTS[5]} placed={sandbagPlaced.includes(5)} onClick={() => handleSandbagClick(5)} />
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button
                style={{ ...s.patternBtn, background: 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: '0 2px 12px rgba(34,197,94,0.3)' }}
                onClick={() => setSandbagMode('staggered')}
              >
                🧱 Staggered (Brick)
              </button>
              <button
                style={{ ...s.patternBtn, background: 'linear-gradient(135deg, #dc2626, #ef4444)', boxShadow: '0 2px 12px rgba(220,38,38,0.3)' }}
                onClick={handleStraightStack}
              >
                📦 Straight Stack
              </button>
            </div>
          </div>

          {sandbagComplete && (
            <div style={{ marginTop: 20, padding: 16, background: 'rgba(34,197,94,0.15)', borderRadius: 10, border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80', textAlign: 'center', fontSize: 15, fontWeight: 600 }}>
              ✅ Sandbags placed in brick pattern! Water will be deflected. House secured!
            </div>
          )}

          {currentWarning && (
            <div style={s.warningBanner}>{currentWarning}</div>
          )}

          <div style={{ marginTop: 20, color: '#94a3b8', fontSize: 13, textAlign: 'center', maxWidth: 500 }}>
            📖 <strong>Why brick pattern?</strong> Straight stacking leaves continuous vertical seams. Water under pressure finds the path of least resistance — a straight seam lets it push right through. The offset brick pattern forces water to zig-zag, dramatically slowing penetration.
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN GAME SCREEN ──
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e'

  return (
    <div style={s.gameContainer}>
      <div style={s.header}>
        <button style={s.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>← Quit</button>
        <h2 style={s.gameTitle}>🏠 Secure Your Home!</h2>
        <div style={{ ...s.timer, color: timerColor }}>
          ⏱ {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Task progress bar */}
      <div style={s.progressBar}>
        {TASKS.map(task => {
          const done = completedTasks.includes(task.id)
          return (
            <div key={task.id} style={{ ...s.progressStep, background: done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)', borderColor: done ? '#22c55e' : 'rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 20 }}>{done ? '✅' : task.emoji}</span>
              <span style={{ fontSize: 12, color: done ? '#4ade80' : '#94a3b8' }}>{task.label}</span>
            </div>
          )
        })}
      </div>

      {currentWarning && <div style={s.warningBanner}>{currentWarning}</div>}
      {taskFeedback && (
        <div style={s.feedbackBanner}>{taskFeedback.text}</div>
      )}

      {/* House Cross-Section */}
      <div style={s.houseContainer}>
        <div style={s.house}>
          {/* Roof */}
          <div style={s.roof}>
            <span style={{ fontSize: 32 }}>🏠</span>
            <span style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 700 }}>YOUR HOME</span>
          </div>

          {/* Top floor - Bedroom & Study */}
          <div style={s.floor}>
            {/* Bedroom - windows */}
            <div style={s.room}>
              <div style={s.roomLabel}>🛏️ Bedroom</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>🛏️</span>
                <span style={{ fontSize: 24 }}>🪟</span>
              </div>
              {/* Windows hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('windows') ? 'rgba(34,197,94,0.3)' : 'rgba(96,165,250,0.2)',
                  borderColor: completedTasks.includes('windows') ? '#22c55e' : '#60a5fa',
                  cursor: completedTasks.includes('windows') ? 'default' : 'pointer',
                }}
                onClick={() => handleTaskClick('windows')}
                disabled={completedTasks.includes('windows')}
              >
                {completedTasks.includes('windows') ? '✅' : '🪟'} Windows
              </button>
            </div>

            {/* Study - valuables & documents */}
            <div style={s.room}>
              <div style={s.roomLabel}>📚 Study</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>📦</span>
                <span style={{ fontSize: 24 }}>📋</span>
              </div>
              {/* Valuables hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('valuables') ? 'rgba(34,197,94,0.3)' : 'rgba(251,146,60,0.2)',
                  borderColor: completedTasks.includes('valuables') ? '#22c55e' : '#fb923c',
                  cursor: completedTasks.includes('valuables') ? 'default' : 'pointer',
                  marginBottom: 4,
                }}
                onClick={() => handleTaskClick('valuables')}
                disabled={completedTasks.includes('valuables')}
              >
                {completedTasks.includes('valuables') ? '✅' : '📦'} Valuables
              </button>
              {/* Documents hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('documents') ? 'rgba(34,197,94,0.3)' : 'rgba(192,132,252,0.2)',
                  borderColor: completedTasks.includes('documents') ? '#22c55e' : '#c084fc',
                  cursor: completedTasks.includes('documents') ? 'default' : 'pointer',
                }}
                onClick={() => handleTaskClick('documents')}
                disabled={completedTasks.includes('documents')}
              >
                {completedTasks.includes('documents') ? '✅' : '📋'} Documents
              </button>
            </div>
          </div>

          {/* Middle floor - 2 rooms */}
          <div style={s.floor}>
            {/* Kitchen */}
            <div style={s.room}>
              <div style={s.roomLabel}>🍳 Kitchen</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>🍽️</span>
                <span style={{ fontSize: 24 }}>🚰</span>
              </div>
              {/* Gas valve hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('gas') ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.2)',
                  borderColor: completedTasks.includes('gas') ? '#22c55e' : '#fbbf24',
                  cursor: completedTasks.includes('gas') ? 'default' : 'pointer',
                }}
                onClick={() => handleTaskClick('gas')}
                disabled={completedTasks.includes('gas')}
              >
                {completedTasks.includes('gas') ? '✅' : '🔥'} Gas Valve
              </button>
            </div>

            {/* Living Room */}
            <div style={s.room}>
              <div style={s.roomLabel}>🛋️ Living Room</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>📺</span>
                <span style={{ fontSize: 24 }}>🛋️</span>
              </div>
            </div>
          </div>

          {/* Lower floor */}
          <div style={s.floor}>
            {/* Basement - breaker */}
            <div style={{ ...s.room, background: 'rgba(30,41,59,0.8)' }}>
              <div style={s.roomLabel}>🔌 Basement</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>📦</span>
                <span style={{ fontSize: 24 }}>🔧</span>
              </div>
              {/* Electrical breaker hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('electricity') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)',
                  borderColor: completedTasks.includes('electricity') ? '#22c55e' : '#ef4444',
                  cursor: completedTasks.includes('electricity') ? 'default' : 'pointer',
                }}
                onClick={() => handleTaskClick('electricity')}
                disabled={completedTasks.includes('electricity')}
              >
                {completedTasks.includes('electricity') ? '✅' : '⚡'} Breaker Panel
              </button>
            </div>

            {/* Entrance - sandbags */}
            <div style={{ ...s.room, background: 'rgba(30,58,138,0.3)' }}>
              <div style={s.roomLabel}>🚪 Entrance</div>
              <div style={s.roomContent}>
                <span style={{ fontSize: 24 }}>🚪</span>
                <span style={{ fontSize: 24 }}>🧥</span>
              </div>
              {/* Sandbag hotspot */}
              <button
                style={{
                  ...s.hotspot,
                  background: completedTasks.includes('sandbags') ? 'rgba(34,197,94,0.3)' : 'rgba(168,85,247,0.2)',
                  borderColor: completedTasks.includes('sandbags') ? '#22c55e' : '#a855f7',
                  cursor: completedTasks.includes('sandbags') ? 'default' : 'pointer',
                }}
                onClick={() => handleTaskClick('sandbags')}
                disabled={completedTasks.includes('sandbags')}
              >
                {completedTasks.includes('sandbags') ? '✅' : '🧱'} Sandbags
              </button>
            </div>
          </div>

          {/* Rising water indicator */}
          <div style={s.waterLevel}>
            <div style={{
              ...s.waterFill,
              height: `${Math.min(100, ((TIMER_SECONDS - timeLeft) / TIMER_SECONDS) * 100)}%`,
            }} />
            <span style={s.waterLabel}>🌊 Rising Water</span>
          </div>
        </div>

        <div style={{ marginTop: 16, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
          Click the <strong style={{ color: '#fbbf24' }}>highlighted hotspots</strong> in the correct order to secure your home
        </div>
      </div>

      <style>{`
        @keyframes pulse { from { transform: scale(1); } to { transform: scale(1.05); } }
        @keyframes waterRise { from { opacity: 0.6; } to { opacity: 1; } }
      `}</style>
    </div>
  )
}

function SandbagSlot({ slot, placed, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 80,
        height: 36,
        borderRadius: 6,
        border: placed ? '2px solid #22c55e' : '2px dashed rgba(251,191,36,0.5)',
        background: placed ? 'linear-gradient(135deg, #92400e, #b45309)' : 'rgba(255,255,255,0.05)',
        color: placed ? '#fef3c7' : '#94a3b8',
        fontSize: 13,
        fontWeight: 600,
        cursor: placed ? 'default' : 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {placed ? '🧱 Bag' : '+ Place'}
    </button>
  )
}

// ── STYLES ──
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
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
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
  timer: { fontSize: 28, fontWeight: 800, fontFamily: 'monospace' },
  backBtnSmall: { background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 13 },
  progressBar: {
    display: 'flex', gap: 8, padding: '12px 24px', background: 'rgba(0,0,0,0.2)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  progressStep: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', borderRadius: 8, border: '1px solid',
    transition: 'all 0.3s',
  },
  warningBanner: {
    padding: '12px 24px', background: 'rgba(239,68,68,0.15)', borderBottom: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5', fontSize: 14, fontWeight: 600, textAlign: 'center',
  },
  feedbackBanner: {
    padding: '12px 24px', background: 'rgba(34,197,94,0.1)', borderBottom: '1px solid rgba(34,197,94,0.3)',
    color: '#86efac', fontSize: 14, textAlign: 'center',
  },
  houseContainer: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  house: {
    position: 'relative', width: 480, border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.8)',
  },
  roof: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 0', background: 'linear-gradient(135deg, #7c2d12, #92400e)',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
  },
  floor: {
    display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  room: {
    flex: 1, padding: 16, borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', gap: 8, minHeight: 130,
    background: 'rgba(30,41,59,0.5)', position: 'relative',
  },
  roomLabel: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' },
  roomContent: { display: 'flex', gap: 8, justifyContent: 'center', margin: '4px 0' },
  hotspot: {
    padding: '8px 12px', borderRadius: 8, border: '2px solid',
    fontSize: 13, fontWeight: 700, color: '#f1f5f9',
    cursor: 'pointer', transition: 'all 0.2s', marginTop: 'auto',
  },
  waterLevel: {
    position: 'absolute', right: -40, top: 0, bottom: 0, width: 30,
    background: 'rgba(0,0,0,0.3)', borderRadius: 4, overflow: 'hidden',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
  },
  waterFill: {
    background: 'linear-gradient(0deg, #1d4ed8, #3b82f6)', transition: 'height 1s',
    borderRadius: '4px 4px 0 0',
  },
  waterLabel: {
    position: 'absolute', bottom: -24, left: -10, fontSize: 10, color: '#60a5fa', whiteSpace: 'nowrap',
  },
  doorFrame: {
    border: '3px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: 32,
    background: 'rgba(15,23,42,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  doorLabel: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  sandbagArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  sandbagRow: { display: 'flex', gap: 4 },
  patternBtn: {
    padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#fff',
    border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  resultCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: 640, width: '100%', padding: 40, background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
    maxHeight: '90vh', overflowY: 'auto', color: '#f1f5f9',
  },
  resultTitle: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  scoreText: { fontSize: 16, marginTop: 8, color: '#cbd5e1' },
  educationBox: {
    marginTop: 20, padding: 20, background: 'rgba(59,130,246,0.08)', borderRadius: 12,
    border: '1px solid rgba(59,130,246,0.2)', width: '100%',
  },
  eduItem: {
    padding: '10px 0', fontSize: 14, lineHeight: 1.7, color: '#e2e8f0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
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
