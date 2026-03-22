import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

const TIMER_SECONDS = 90

const YARD_ITEMS = [
  {
    id: 'propane',
    name: 'Propane Tank',
    emoji: '🔴',
    correctAction: 'anchor',
    position: { top: '15%', left: '10%' },
    feedback: {
      anchor: '✅ Correct! Propane tanks must be anchored with chains to prevent them from floating away, leaking, and potentially exploding.',
      moveInside: '❌ Propane tanks should NEVER be moved inside — a leak indoors is deadly. Anchor them with chains outside.',
      tieDown: '❌ Rope or tie-downs aren\'t strong enough. Propane tanks need heavy-duty chains bolted to a concrete pad.',
      flipOver: '❌ Propane tanks should never be flipped — they need to stay upright to prevent valve damage and leaks. Anchor them.',
    },
  },
  {
    id: 'table',
    name: 'Patio Table',
    emoji: '🪑',
    correctAction: 'moveInside',
    position: { top: '25%', left: '55%' },
    feedback: {
      anchor: '❌ Tables are light enough to move. Anchoring wastes time when you can just bring it inside where it\'s completely safe.',
      moveInside: '✅ Correct! Patio furniture becomes a battering ram in floodwaters. Moving it inside eliminates the threat entirely.',
      tieDown: '❌ Tie-downs aren\'t reliable in flood surge. The table can still break free and smash through windows.',
      flipOver: '❌ A flipped table still floats and becomes debris. Just bring it inside.',
    },
  },
  {
    id: 'trashcans',
    name: 'Trash Cans',
    emoji: '🗑️',
    correctAction: 'moveInside',
    position: { top: '50%', left: '8%' },
    feedback: {
      anchor: '❌ Trash cans are hollow and buoyant — they\'ll float even when anchored if water is high enough. Move them inside.',
      moveInside: '✅ Correct! Empty trash cans are extremely buoyant and become dangerous projectiles. Bring them into the garage.',
      tieDown: '❌ Tying down hollow containers doesn\'t work — they fill with water, get heavy, and rip free.',
      flipOver: '❌ Flipped trash cans still roll and float. Bring them inside where they can\'t become projectiles.',
    },
  },
  {
    id: 'tools',
    name: 'Garden Tools',
    emoji: '🔧',
    correctAction: 'moveInside',
    position: { top: '70%', left: '30%' },
    feedback: {
      anchor: '❌ Small loose items should just be brought inside. Anchoring each tool wastes precious time.',
      moveInside: '✅ Correct! Rakes, shovels, and shears become dangerous debris in moving water. Bring them all into the garage.',
      tieDown: '❌ You can\'t effectively tie down individual garden tools. Just bring them inside — it\'s faster and safer.',
      flipOver: '❌ You can\'t flip garden tools. Just bring them inside — it\'s the fastest option.',
    },
  },
  {
    id: 'bicycle',
    name: 'Bicycle',
    emoji: '🚲',
    correctAction: 'moveInside',
    position: { top: '40%', left: '75%' },
    feedback: {
      anchor: '❌ A bicycle is easy to move. Don\'t waste time anchoring when you can just carry it inside.',
      moveInside: '✅ Correct! A bicycle tumbling in floodwater can break windows and injure people. It\'s light — bring it in.',
      tieDown: '❌ Tying a bike to a pole still lets it swing and cause damage. Just bring it inside.',
      flipOver: '❌ Flipping a bicycle doesn\'t secure it. It\'ll still wash away. Bring it inside.',
    },
  },
  {
    id: 'bbq',
    name: 'BBQ Grill',
    emoji: '🔥',
    correctAction: 'anchor',
    position: { top: '15%', left: '38%' },
    feedback: {
      anchor: '✅ Correct! Heavy grills with propane attachments should be anchored to prevent floating and gas line damage.',
      moveInside: '❌ BBQ grills with propane lines should NOT be brought inside — gas leaks in enclosed spaces are explosive.',
      tieDown: '❌ Tie-downs aren\'t strong enough for a heavy grill in flood surge. Use chains and anchor bolts.',
      flipOver: '❌ Flipping a BBQ grill damages it and doesn\'t prevent floating. Anchor it with chains.',
    },
  },
  {
    id: 'plants',
    name: 'Potted Plants',
    emoji: '🪴',
    correctAction: 'moveInside',
    position: { top: '60%', left: '60%' },
    feedback: {
      anchor: '❌ Heavy pots can crack when anchored improperly. Just move lightweight pots inside.',
      moveInside: '✅ Correct! Potted plants become heavy projectiles when waterlogged. Move them into the garage or a safe room.',
      tieDown: '❌ Pots are round and slip out of tie-downs. Save time and just bring them inside.',
      flipOver: '❌ Flipping potted plants dumps the soil and kills the plant. Just bring them inside.',
    },
  },
  {
    id: 'trampoline',
    name: 'Trampoline',
    emoji: '⭕',
    correctAction: 'anchor',
    position: { top: '75%', left: '70%' },
    feedback: {
      anchor: '✅ Correct! Trampolines are massive wind/water sails. Use heavy-duty anchor stakes or straps into the ground — they can\'t be moved inside.',
      moveInside: '❌ Trampolines are too large to move inside. You must anchor them with ground stakes or heavy-duty straps.',
      tieDown: '❌ Regular tie-downs aren\'t enough for something this big. You need ground anchor stakes rated for wind/water force.',
      flipOver: '❌ You can\'t effectively flip a trampoline, and it wouldn\'t help. Anchor it with ground stakes.',
    },
  },
  {
    id: 'kayak',
    name: 'Kayak',
    emoji: '🛶',
    correctAction: 'anchor',
    position: { top: '30%', left: '25%' },
    feedback: {
      anchor: '✅ Correct! Kayaks float and become dangerous battering rams. Anchor them to a fixed structure with heavy straps.',
      moveInside: '❌ Kayaks are too large for most garages. Anchor them to a permanent structure outside.',
      tieDown: '❌ Rope alone won\'t hold a buoyant kayak in flood surge. Use chains or heavy straps anchored to concrete.',
      flipOver: '❌ Flipping a kayak won\'t stop it from floating away. It needs to be firmly anchored.',
    },
  },
  {
    id: 'umbrella_stand',
    name: 'Patio Umbrella',
    emoji: '⛱️',
    correctAction: 'moveInside',
    position: { top: '55%', left: '45%' },
    feedback: {
      anchor: '❌ Patio umbrellas act as sails in wind and are too lightweight to anchor effectively. Bring it inside.',
      moveInside: '✅ Correct! Patio umbrellas catch wind like sails and become airborne missiles. Close it, collapse it, and store inside.',
      tieDown: '❌ Even tied down, the fabric canopy catches wind and water. Just collapse and bring inside.',
      flipOver: '❌ That won\'t help — the wind will catch it regardless. Bring it inside.',
    },
  },
  {
    id: 'dog_house',
    name: 'Dog House',
    emoji: '🐕',
    correctAction: 'anchor',
    position: { top: '80%', left: '50%' },
    feedback: {
      anchor: '✅ Correct! Dog houses are light wood/plastic that float easily. Anchor to ground stakes or a permanent structure.',
      moveInside: '❌ Most dog houses are too bulky to fit through doors. Anchor them securely to the ground instead.',
      tieDown: '❌ Rope isn\'t reliable when a buoyant structure is fighting against flood surge. Use ground anchors.',
      flipOver: '❌ An upside-down dog house fills with water and becomes heavier — but still floats. Anchor it.',
    },
  },
  {
    id: 'kiddie_pool',
    name: 'Kiddie Pool',
    emoji: '🏖️',
    correctAction: 'flipOver',
    position: { top: '45%', left: '85%' },
    feedback: {
      anchor: '❌ Kiddie pools are lightweight plastic — just flip them over and weight them. Anchoring is overkill.',
      moveInside: '❌ You could, but just flipping it upside down prevents water collection and takes 2 seconds. Faster!',
      tieDown: '❌ You can\'t effectively tie down a kiddie pool. Flip it upside down so it can\'t fill with water and float.',
      flipOver: '✅ Correct! Flipping lightweight concave items upside down prevents them from filling with water, becoming heavy, and floating away as projectiles.',
    },
  },
  {
    id: 'wheelbarrow',
    name: 'Wheelbarrow',
    emoji: '🛒',
    correctAction: 'flipOver',
    position: { top: '85%', left: '20%' },
    feedback: {
      anchor: '❌ Wheelbarrows are easy to flip. Don\'t waste time anchoring when you can just turn it over.',
      moveInside: '❌ Sure, but flipping upside down is faster and just as effective. Time matters!',
      tieDown: '❌ Just flip it over! Upside-down wheelbarrows can\'t collect water and won\'t float.',
      flipOver: '✅ Correct! Flip concave outdoor items upside down — wheelbarrows, wagons, basins. They can\'t collect water if they\'re inverted.',
    },
  },
  {
    id: 'gas_cans',
    name: 'Gasoline Cans',
    emoji: '⛽',
    correctAction: 'moveInside',
    position: { top: '65%', left: '75%' },
    feedback: {
      anchor: '❌ Gas cans can leak if anchoring hardware punctures them. Move to a high, dry indoor shelf — away from ignition sources.',
      moveInside: '✅ Correct! Gasoline cans in floodwater contaminate everything downstream. Move them to a high shelf in the garage where water can\'t reach.',
      tieDown: '❌ Ropes can crush or puncture gas cans. Bring them to a high indoor shelf instead.',
      flipOver: '❌ Don\'t flip gas cans! They can leak. Move to a high indoor shelf instead.',
    },
  },
]

const ACTIONS = [
  { id: 'anchor', label: '⛓️ Anchor with Chains', color: '#f59e0b' },
  { id: 'moveInside', label: '🏠 Move Inside', color: '#22c55e' },
  { id: 'tieDown', label: '🪢 Tie Down with Rope', color: '#a855f7' },
  { id: 'flipOver', label: '🔄 Flip Upside Down', color: '#06b6d4' },
]

export default function YardLockdownModule() {
  const { state, dispatch } = useGame()

  const [phase, setPhase] = useState('intro')
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [selectedItem, setSelectedItem] = useState(null)
  const [securedItems, setSecuredItems] = useState({}) // { itemId: { action, correct } }
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (phase !== 'game') return
    if (timeLeft <= 0) {
      finishGame()
      return
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, phase])

  // Auto-finish when all items secured
  useEffect(() => {
    if (phase === 'game' && Object.keys(securedItems).length === YARD_ITEMS.length) {
      setTimeout(() => finishGame(), 1000)
    }
  }, [securedItems, phase])

  const handleItemClick = useCallback((item) => {
    if (securedItems[item.id]) return
    setSelectedItem(item)
    setFeedbackMsg(null)
  }, [securedItems])

  const handleActionClick = useCallback((actionId) => {
    if (!selectedItem) return
    const item = selectedItem
    const correct = item.correctAction === actionId
    const feedback = item.feedback[actionId]

    setSecuredItems(prev => ({ ...prev, [item.id]: { action: actionId, correct } }))
    setFeedbackMsg({ text: feedback, correct })
    setSelectedItem(null)

    setTimeout(() => setFeedbackMsg(null), 3500)
  }, [selectedItem])

  const finishGame = useCallback(() => {
    const entries = Object.values(securedItems)
    const correctCount = entries.filter(e => e.correct).length
    const totalItems = YARD_ITEMS.length
    const secured = entries.length
    const timeBonus = Math.max(0, Math.floor(timeLeft / 5))
    const score = Math.max(0, Math.min(100, Math.round((correctCount / totalItems) * 80) + timeBonus))
    const passed = correctCount >= 10 && secured === totalItems

    const res = { passed, score, correctCount, totalItems, secured, timeLeft }
    setResult(res)
    setPhase('result')

    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: `${state.selectedDisaster}-3`, result: { score, passed } },
    })
  }, [securedItems, timeLeft, dispatch, state.selectedDisaster])

  const restart = () => {
    setPhase('game')
    setTimeLeft(TIMER_SECONDS)
    setSelectedItem(null)
    setSecuredItems({})
    setFeedbackMsg(null)
    setResult(null)
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={s.screen}>
        <div style={s.introCard}>
          <span style={{ fontSize: 64 }}>🏡</span>
          <h1 style={s.introTitle}>Module 3: Yard Lockdown</h1>
          <div style={s.introBody}>
            <p><strong>Scenario:</strong> Flood surge is approaching. Loose outdoor items become <span style={{ color: '#f87171', fontWeight: 700 }}>deadly projectiles</span> in moving water. You have <span style={{ color: '#f87171', fontWeight: 700 }}>90 seconds</span> to secure everything.</p>
            <p style={{ marginTop: 12 }}><strong>How to play:</strong></p>
            <ul style={s.introList}>
              <li>Click an item in the yard to select it</li>
              <li>Choose the correct action: ⛓️ Anchor, 🏠 Move Inside, 🪢 Tie Down, or 🔄 Flip Upside Down</li>
              <li>Each item has ONE correct action — wrong choices give feedback</li>
              <li>Secure all 14 items before time runs out!</li>
            </ul>
            <p style={{ marginTop: 12, color: '#fbbf24' }}>⚠️ Think about each item's weight, material, and danger level.</p>
          </div>
          <button style={s.goBtn} onClick={() => setPhase('game')}>
            🏡 Lock Down the Yard — 90s Timer Begins!
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
          <span style={{ fontSize: 56 }}>{result.passed ? '🏆' : '💀'}</span>
          <h2 style={{ ...s.resultTitle, color: result.passed ? '#22c55e' : '#ef4444' }}>
            {result.passed ? 'YARD SECURED!' : 'YARD NOT SAFE'}
          </h2>
          <p style={s.scoreText}>
            Score: <strong>{result.score}%</strong> — {result.correctCount}/{result.totalItems} correct actions, {result.secured} items addressed
          </p>

          <div style={s.educationBox}>
            <h3 style={{ color: '#60a5fa', marginBottom: 12, fontSize: 16 }}>📚 Item-by-Item Review</h3>
            {YARD_ITEMS.map(item => {
              const entry = securedItems[item.id]
              const wasCorrect = entry?.correct
              const actionUsed = entry?.action
              return (
                <div key={item.id} style={{ ...s.reviewItem, borderLeftColor: wasCorrect ? '#22c55e' : entry ? '#ef4444' : '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20 }}>{item.emoji}</span>
                    <strong style={{ color: '#f1f5f9' }}>{item.name}</strong>
                    <span style={{ fontSize: 12, color: wasCorrect ? '#4ade80' : entry ? '#f87171' : '#94a3b8', marginLeft: 'auto' }}>
                      {wasCorrect ? '✅ Correct' : entry ? '❌ Wrong' : '⏭️ Skipped'}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
                    {entry ? item.feedback[actionUsed] : `Should have been: ${item.correctAction === 'anchor' ? '⛓️ Anchor' : item.correctAction === 'moveInside' ? '🏠 Move Inside' : item.correctAction === 'flipOver' ? '🔄 Flip Upside Down' : '🪢 Tie Down'}`}
                  </p>
                </div>
              )
            })}
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
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e'
  const securedCount = Object.keys(securedItems).length

  return (
    <div style={s.gameContainer}>
      <div style={s.header}>
        <button style={s.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>← Quit</button>
        <h2 style={s.gameTitle}>🏡 Secure the Yard!</h2>
        <div style={{ ...s.timer, color: timerColor }}>
          ⏱ {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      {/* Progress */}
      <div style={s.progressBar}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Items Secured:</span>
        <div style={s.progressTrack}>
          <div style={{ ...s.progressFill, width: `${(securedCount / YARD_ITEMS.length) * 100}%` }} />
        </div>
        <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>{securedCount}/{YARD_ITEMS.length}</span>
      </div>

      {feedbackMsg && (
        <div style={{
          padding: '12px 24px',
          background: feedbackMsg.correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          borderBottom: `1px solid ${feedbackMsg.correct ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: feedbackMsg.correct ? '#86efac' : '#fca5a5',
          fontSize: 14, textAlign: 'center', fontWeight: 500,
        }}>
          {feedbackMsg.text}
        </div>
      )}

      <div style={s.gameLayout}>
        {/* Yard view */}
        <div style={s.yardPanel}>
          <div style={s.yard}>
            {/* Yard background elements */}
            <div style={s.yardGrass}>
              <span style={{ position: 'absolute', top: '5%', right: '5%', fontSize: 28 }}>🌳</span>
              <span style={{ position: 'absolute', bottom: '5%', left: '5%', fontSize: 28 }}>🌳</span>
              <span style={{ position: 'absolute', top: '45%', right: '15%', fontSize: 20 }}>🌿</span>
              <span style={{ position: 'absolute', bottom: '25%', left: '45%', fontSize: 20 }}>🌱</span>
              {/* House indicator */}
              <div style={s.houseIcon}>🏠 House</div>
              {/* Fence */}
              <div style={s.fence}>{'🟫'.repeat(12)}</div>

              {/* Yard items */}
              {YARD_ITEMS.map(item => {
                const secured = securedItems[item.id]
                const isSelected = selectedItem?.id === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    style={{
                      position: 'absolute',
                      top: item.position.top,
                      left: item.position.left,
                      width: 80,
                      height: 80,
                      borderRadius: 12,
                      border: isSelected ? '3px solid #fbbf24' : secured?.correct ? '2px solid #22c55e' : secured ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.2)',
                      background: isSelected ? 'rgba(251,191,36,0.2)' : secured?.correct ? 'rgba(34,197,94,0.15)' : secured ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                      cursor: secured ? 'default' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      transition: 'all 0.2s',
                      zIndex: isSelected ? 10 : 1,
                      boxShadow: isSelected ? '0 0 20px rgba(251,191,36,0.4)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{item.emoji}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#f1f5f9', textAlign: 'center', lineHeight: 1.1 }}>{item.name}</span>
                    {secured && (
                      <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 16 }}>
                        {secured.correct ? '✅' : '❌'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Action panel */}
        <div style={s.actionPanel}>
          {selectedItem ? (
            <>
              <div style={s.selectedHeader}>
                <span style={{ fontSize: 40 }}>{selectedItem.emoji}</span>
                <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>{selectedItem.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Choose the correct action:</p>
              </div>
              <div style={s.actionList}>
                {ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action.id)}
                    style={{
                      ...s.actionBtn,
                      borderColor: action.color,
                      background: `${action.color}15`,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: action.color }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={s.noSelection}>
              <span style={{ fontSize: 40 }}>👆</span>
              <p style={{ color: '#94a3b8', fontSize: 15 }}>Click an item in the yard to select it</p>
              <div style={{ marginTop: 20, padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                <p style={{ color: '#93c5fd', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  💡 <strong>Think about:</strong><br />
                  • Can it be easily carried inside?<br />
                  • Does it contain fuel/gas (dangerous indoors)?<br />
                  • Is it too large to move?<br />
                  • Is it concave and could collect water?
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div style={s.legend}>
            <div style={s.legendItem}><span style={{ color: '#f59e0b' }}>⛓️ Anchor</span> — Heavy/gas items that can't go inside</div>
            <div style={s.legendItem}><span style={{ color: '#22c55e' }}>🏠 Move Inside</span> — Portable items that fit in garage</div>
            <div style={s.legendItem}><span style={{ color: '#a855f7' }}>🪢 Tie Down</span> — Trap option! Rarely the best choice</div>
            <div style={s.legendItem}><span style={{ color: '#06b6d4' }}>🔄 Flip Over</span> — Concave items that collect water</div>
          </div>
        </div>
      </div>
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
    background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
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
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px',
    background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  progressTrack: {
    flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 4,
    transition: 'width 0.3s',
  },
  gameLayout: {
    display: 'flex', flex: 1, overflow: 'hidden',
  },
  yardPanel: {
    flex: 1, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  yard: {
    width: '100%', maxWidth: 550, aspectRatio: '4/3', position: 'relative',
  },
  yardGrass: {
    width: '100%', height: '100%', position: 'relative',
    background: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%)',
    borderRadius: 12, border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden',
  },
  houseIcon: {
    position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(30,41,59,0.9)', padding: '4px 12px', borderRadius: 6,
    fontSize: 12, fontWeight: 700, color: '#f1f5f9', zIndex: 5,
  },
  fence: {
    position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: 10,
    letterSpacing: -2, lineHeight: 1, padding: '2px 4px', opacity: 0.5,
  },
  actionPanel: {
    width: 300, minWidth: 260, padding: 20, display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.06)',
    overflowY: 'auto',
  },
  selectedHeader: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 16,
    padding: 16, background: 'rgba(251,191,36,0.08)', borderRadius: 12,
    border: '1px solid rgba(251,191,36,0.2)',
  },
  actionList: { display: 'flex', flexDirection: 'column', gap: 10 },
  actionBtn: {
    padding: '14px 16px', borderRadius: 10, border: '2px solid',
    background: 'transparent', cursor: 'pointer', transition: 'all 0.2s',
    textAlign: 'left',
  },
  noSelection: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textAlign: 'center',
  },
  legend: {
    marginTop: 'auto', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  legendItem: { fontSize: 11, color: '#94a3b8', lineHeight: 1.5 },
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
  reviewItem: {
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
