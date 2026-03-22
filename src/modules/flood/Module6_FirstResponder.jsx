import { useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

const NPCS = [
  {
    id: 'bleeding',
    name: 'Marcus',
    emoji: '🩸',
    injury: 'Severe arm bleeding — blood soaking through shirt',
    priority: 1,
    priorityLabel: 'CRITICAL',
    priorityColor: '#ef4444',
    correctSupplies: ['pressure_bandage', 'bottled_water'],
    explanation: 'Severe bleeding can be fatal in minutes. Apply direct pressure with a clean bandage, and use clean bottled water (NEVER floodwater) to rinse the wound first.',
  },
  {
    id: 'hypothermia',
    name: 'Elena',
    emoji: '🥶',
    injury: 'Shivering uncontrollably, lips turning blue — hypothermia',
    priority: 2,
    priorityLabel: 'URGENT',
    priorityColor: '#f59e0b',
    correctSupplies: ['mylar_blanket'],
    explanation: 'Wrap in a Mylar blanket to retain body heat. Do NOT rub their skin — that is a myth and can cause further harm. Mylar reflects 90% of body heat back.',
  },
  {
    id: 'burns',
    name: 'Aisha',
    emoji: '🔥',
    injury: 'Chemical burns on hands from contact with contaminated floodwater',
    priority: 2,
    priorityLabel: 'URGENT',
    priorityColor: '#f59e0b',
    correctSupplies: ['bottled_water', 'burn_cream', 'loose_bandage'],
    explanation: 'Chemical burns must be flushed with large amounts of clean water for 15-20 minutes. Apply burn cream, then wrap loosely. NEVER use butter or ice on burns — these are dangerous myths.',
  },
  {
    id: 'shock',
    name: 'David',
    emoji: '😶',
    injury: 'Pale, sweating, rapid pulse — showing signs of shock',
    priority: 2,
    priorityLabel: 'URGENT',
    priorityColor: '#f59e0b',
    correctSupplies: ['mylar_blanket', 'elevate_legs'],
    explanation: 'Lay them flat, elevate legs 8-12 inches to improve blood flow to vital organs, and keep them warm with a blanket. Do NOT give food or water to someone in shock.',
  },
  {
    id: 'scrape',
    name: 'Jordan',
    emoji: '🤕',
    injury: 'Scraped knee from slipping on debris',
    priority: 3,
    priorityLabel: 'MINOR',
    priorityColor: '#22c55e',
    correctSupplies: ['antiseptic', 'bandaid', 'bottled_water'],
    explanation: 'Clean with bottled water, apply antiseptic to prevent infection (floodwater carries bacteria!), then cover with a bandaid.',
  },
]

const NPC_COUNT = NPCS.length

const ALL_SUPPLIES = [
  { id: 'pressure_bandage', name: 'Pressure Bandage', emoji: '🩹', desc: 'Sterile compression bandage for heavy bleeding' },
  { id: 'bottled_water', name: 'Clean Bottled Water', emoji: '💧', desc: 'Sealed, clean water for wound irrigation' },
  { id: 'mylar_blanket', name: 'Mylar Blanket', emoji: '🪶', desc: 'Reflects body heat — treats hypothermia' },
  { id: 'antiseptic', name: 'Antiseptic Wipes', emoji: '🧴', desc: 'Kills bacteria on minor wounds' },
  { id: 'bandaid', name: 'Adhesive Bandage', emoji: '🩹', desc: 'Covers minor cuts and scrapes' },
  { id: 'burn_cream', name: 'Burn Cream', emoji: '🧴', desc: 'Topical cream for burn treatment' },
  { id: 'loose_bandage', name: 'Loose Wrap Bandage', emoji: '🩹', desc: 'Non-adhesive wrap for burns' },
  { id: 'elevate_legs', name: 'Elevate Legs (Position)', emoji: '🦵', desc: 'Raise legs above heart level' },
  // TRAPS
  { id: 'flood_water', name: 'Flood Water', emoji: '🚰', desc: 'Water from the flooded street', isTrap: true, trapMsg: '🚨 NEVER use floodwater on wounds! Floodwater contains sewage, chemicals, bacteria, and parasites. Using it guarantees a severe, potentially fatal infection.' },
  { id: 'rubbing', name: 'Friction / Rubbing Skin', emoji: '🤲', desc: 'Rub limbs to warm them up', isTrap: true, trapMsg: '❌ MYTH! Rubbing a hypothermia victim\'s skin can cause cardiac arrest by pushing cold blood to the heart. Warm them passively with blankets instead.' },
  { id: 'tourniquet', name: 'Tourniquet', emoji: '🔗', desc: 'Cuts off circulation entirely', isTrap: true, trapMsg: '⚠️ A tourniquet is a last resort only when direct pressure fails and the limb may be lost. For most bleeding, firm pressure with a bandage is the correct first response.' },
  { id: 'ice_pack', name: 'Ice Pack', emoji: '🧊', desc: 'Cold compress', isTrap: true, trapMsg: '❌ Applying cold to a hypothermia victim will make them WORSE. They need warmth, not cold!' },
  { id: 'butter', name: 'Butter / Grease', emoji: '🧈', desc: 'Folk remedy for burns', isTrap: true, trapMsg: '❌ NEVER put butter or grease on burns! It traps heat in the skin, worsens damage, and increases infection risk. This is one of the most dangerous medical myths.' },
  { id: 'food_water_shock', name: 'Give Food & Water', emoji: '🥤', desc: 'Feed the patient', isTrap: true, trapMsg: '❌ NEVER give food or water to someone in shock. They may need surgery, and anything in the stomach complicates anesthesia. If they vomit while semi-conscious, they can choke.' },
]

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FirstResponder() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | triage | treat | result
  const [triageOrder, setTriageOrder] = useState([])
  const [triageMessage, setTriageMessage] = useState('')
  const [currentNpcIndex, setCurrentNpcIndex] = useState(0)
  const [selectedSupplies, setSelectedSupplies] = useState([])
  const [treatFeedback, setTreatFeedback] = useState('')
  const [treatFeedbackColor, setTreatFeedbackColor] = useState('#f1f5f9')
  const [triageCorrect, setTriageCorrect] = useState(false)
  const [treatResults, setTreatResults] = useState([]) // { npcId, correct, usedFloodWater }
  const [usedFloodWater, setUsedFloodWater] = useState(false)
  const [supplies] = useState(() => shuffleArray(ALL_SUPPLIES))
  const [shuffledNpcs] = useState(() => shuffleArray(NPCS))

  // ── TRIAGE: Player picks order ──
  // Correct order: priority 1 first, then all priority 2s (any order among them), then priority 3 last
  const isTriageCorrect = (order) => {
    // Check that priorities are non-decreasing
    for (let i = 1; i < order.length; i++) {
      if (order[i].priority < order[i - 1].priority) return false
    }
    return true
  }

  const handleTriagePick = useCallback((npc) => {
    if (triageOrder.find(n => n.id === npc.id)) return
    const newOrder = [...triageOrder, npc]
    setTriageOrder(newOrder)
    setTriageMessage('')

    if (newOrder.length === NPC_COUNT) {
      const correct = isTriageCorrect(newOrder)
      setTriageCorrect(correct)
      if (correct) {
        setTriageMessage('✅ Correct triage order! Treat the most life-threatening injury first.')
        setTimeout(() => setPhase('treat'), 1500)
      } else {
        // Find first wrong pick
        const msgs = {
          bleeding: 'Severe bleeding can kill in minutes — it must be treated FIRST!',
          hypothermia: 'Hypothermia is urgent but not as immediately fatal as severe bleeding.',
          burns: 'Chemical burns are urgent but not as immediately fatal as severe bleeding.',
          shock: 'Shock is urgent but not as immediately fatal as severe bleeding.',
          scrape: 'A scraped knee is painful but not life-threatening. Treat it last.',
        }
        // Find first violation
        let wrongNpc = newOrder[0]
        for (let i = 1; i < newOrder.length; i++) {
          if (newOrder[i].priority < newOrder[i - 1].priority) {
            wrongNpc = newOrder[i]
            break
          }
        }
        setTriageMessage(`❌ Wrong order! ${msgs[wrongNpc.id]}`)
        setTimeout(() => {
          setTriageOrder([])
          setTriageMessage('Try again — pick the most critical patient first.')
        }, 2500)
      }
    }
  }, [triageOrder])

  // ── TREATMENT: Player selects supplies for current NPC ──
  const orderedNpcs = triageCorrect ? [...NPCS].sort((a, b) => a.priority - b.priority) : NPCS
  const currentNpc = orderedNpcs[currentNpcIndex]

  const toggleSupply = useCallback((supply) => {
    setTreatFeedback('')
    if (supply.isTrap) {
      setTreatFeedback(supply.trapMsg)
      setTreatFeedbackColor('#f87171')
      if (supply.id === 'flood_water') {
        setUsedFloodWater(true)
      }
      return
    }
    setSelectedSupplies(prev =>
      prev.includes(supply.id) ? prev.filter(s => s !== supply.id) : [...prev, supply.id]
    )
  }, [])

  const submitTreatment = useCallback(() => {
    if (!currentNpc) return
    const correct = currentNpc.correctSupplies
    const selected = [...selectedSupplies].sort()
    const expected = [...correct].sort()
    const isCorrect = selected.length === expected.length && selected.every((s, i) => s === expected[i])

    if (isCorrect) {
      setTreatFeedback('✅ Correct treatment! ' + currentNpc.explanation)
      setTreatFeedbackColor('#4ade80')
    } else {
      const missing = expected.filter(s => !selected.includes(s))
      const extra = selected.filter(s => !expected.includes(s))
      let msg = '❌ Not quite right. '
      if (missing.length > 0) {
        const missingNames = missing.map(m => ALL_SUPPLIES.find(s => s.id === m)?.name).join(', ')
        msg += `Missing: ${missingNames}. `
      }
      if (extra.length > 0) {
        const extraNames = extra.map(e => ALL_SUPPLIES.find(s => s.id === e)?.name).join(', ')
        msg += `Unnecessary: ${extraNames}. `
      }
      msg += currentNpc.explanation
      setTreatFeedback(msg)
      setTreatFeedbackColor('#fbbf24')
    }

    const newResults = [...treatResults, { npcId: currentNpc.id, correct: isCorrect, usedFloodWater }]
    setTreatResults(newResults)

    if (usedFloodWater) {
      // FAIL — flood water used
      setTimeout(() => {
        const score = 10
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: { score, passed: false } } })
        setPhase('result')
      }, 2500)
      return
    }

    setTimeout(() => {
      if (currentNpcIndex < NPC_COUNT - 1) {
        setCurrentNpcIndex(i => i + 1)
        setSelectedSupplies([])
        setTreatFeedback('')
        setUsedFloodWater(false)
      } else {
        // All done — calculate score
        const triagePoints = triageCorrect ? 30 : 10
        const treatPoints = newResults.filter(r => r.correct).length * Math.round(60 / NPC_COUNT)
        const floodPenalty = newResults.some(r => r.usedFloodWater) ? -50 : 0
        const score = Math.max(0, Math.min(100, triagePoints + treatPoints + 10 + floodPenalty))
        const passed = score >= 50 && !newResults.some(r => r.usedFloodWater)
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-6', result: { score, passed } } })
        setPhase('result')
      }
    }, 2500)
  }, [currentNpc, selectedSupplies, treatResults, usedFloodWater, triageCorrect, currentNpcIndex, dispatch])

  // ── INTRO SCREEN ──
  if (phase === 'intro') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 600, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚑🩹</div>
          <h1 style={{ fontSize: 32, color: '#f472b6', marginBottom: 12 }}>Module 6: First Responder</h1>
          <p style={{ fontSize: 18, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 20 }}>
            You've found five injured people after the flood. As the only person with a first aid kit, you must <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>triage</span> them correctly and apply the right treatment.
          </p>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ color: '#fbbf24', marginBottom: 12 }}>📋 Your Tasks:</h3>
            <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 2.2, color: '#e2e8f0' }}>
              <li><strong style={{ color: '#f472b6' }}>Triage</strong> — Pick who to treat first (most critical → least)</li>
              <li><strong style={{ color: '#38bdf8' }}>Treat</strong> — Select the correct supplies for each injury</li>
            </ol>
            <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '16px 0' }} />
            <p style={{ color: '#fda4af', fontSize: 14 }}>
              ⚠️ <strong>CRITICAL WARNING:</strong> NEVER use floodwater to clean wounds. It contains sewage, chemicals, and deadly bacteria.
            </p>
          </div>
          <button
            onClick={() => setPhase('triage')}
            style={{ padding: '14px 48px', fontSize: 20, fontWeight: 'bold', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}
          >
            Begin Triage 🏥
          </button>
          <br />
          <button
            onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
            style={{ marginTop: 16, padding: '10px 24px', fontSize: 14, background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }}
          >
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── TRIAGE SCREEN ──
  if (phase === 'triage') {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
        <h2 style={{ color: '#f472b6', marginBottom: 4, fontSize: 24 }}>🚑 Triage — Who Do You Treat First?</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Click patients in order: most critical → least critical</p>

        {/* Selected order */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, minHeight: 40, alignItems: 'center' }}>
          {triageOrder.map((npc, i) => (
            <div key={npc.id} style={{ background: '#334155', borderRadius: 8, padding: '6px 16px', color: '#e2e8f0', fontSize: 14 }}>
              <strong>#{i + 1}</strong> {npc.emoji} {npc.name}
            </div>
          ))}
          {triageOrder.length === 0 && <span style={{ color: '#64748b', fontSize: 14 }}>Pick the most critical patient first...</span>}
        </div>

        {/* NPC cards */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          {shuffledNpcs.map(npc => {
            const picked = triageOrder.find(n => n.id === npc.id)
            return (
              <div
                key={npc.id}
                onClick={() => !picked && handleTriagePick(npc)}
                style={{
                  width: 220, background: picked ? '#1e293b' : '#1e293b',
                  border: picked ? '2px solid #475569' : '2px solid #64748b',
                  borderRadius: 12, padding: 20, cursor: picked ? 'default' : 'pointer',
                  opacity: picked ? 0.5 : 1,
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>{npc.emoji}</div>
                <h3 style={{ color: '#f1f5f9', marginBottom: 4, fontSize: 18 }}>{npc.name}</h3>
                <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>{npc.injury}</p>
                <span style={{
                  display: 'inline-block', marginTop: 8,
                  padding: '4px 12px', borderRadius: 20,
                  background: npc.priorityColor + '22',
                  color: npc.priorityColor, fontSize: 12, fontWeight: 'bold',
                }}>
                  {npc.priorityLabel}
                </span>
              </div>
            )
          })}
        </div>

        {triageMessage && (
          <div style={{
            background: '#1e293b', border: '1px solid #475569', borderRadius: 8,
            padding: '12px 24px', maxWidth: 500, textAlign: 'center',
            color: triageMessage.startsWith('✅') ? '#4ade80' : '#fbbf24',
            fontSize: 15, fontWeight: 500,
          }}>
            {triageMessage}
          </div>
        )}

        <button
          onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
          style={{ marginTop: 24, padding: '8px 20px', fontSize: 13, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
        >
          ← Quit
        </button>
      </div>
    )
  }

  // ── TREATMENT SCREEN ──
  if (phase === 'treat' && currentNpc) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 4, fontSize: 22 }}>🩹 Treating Patient {currentNpcIndex + 1}/{NPC_COUNT}</h2>

        {/* Patient card */}
        <div style={{
          background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 20, maxWidth: 420, width: '100%',
          border: `2px solid ${currentNpc.priorityColor}`, textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{currentNpc.emoji}</div>
          <h3 style={{ color: '#f1f5f9', fontSize: 20, marginBottom: 4 }}>{currentNpc.name}</h3>
          <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.5 }}>{currentNpc.injury}</p>
          <span style={{
            display: 'inline-block', marginTop: 8,
            padding: '4px 14px', borderRadius: 20,
            background: currentNpc.priorityColor + '22',
            color: currentNpc.priorityColor, fontSize: 13, fontWeight: 'bold',
          }}>
            {currentNpc.priorityLabel}
          </span>
        </div>

        {/* Supply selection */}
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>Select the correct supplies, then click "Apply Treatment":</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 600, marginBottom: 16 }}>
          {supplies.map(supply => {
            const isSelected = selectedSupplies.includes(supply.id)
            return (
              <div
                key={supply.id}
                onClick={() => toggleSupply(supply)}
                style={{
                  background: isSelected ? '#1d4ed8' : '#1e293b',
                  border: isSelected ? '2px solid #60a5fa' : '2px solid #475569',
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  minWidth: 130, textAlign: 'center',
                  transition: 'all 0.15s',
                  opacity: supply.isTrap && (supply.id === 'flood_water' && usedFloodWater) ? 0.4 : 1,
                }}
              >
                <div style={{ fontSize: 24 }}>{supply.emoji}</div>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginTop: 4 }}>{supply.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{supply.desc}</div>
              </div>
            )
          })}
        </div>

        <button
          onClick={submitTreatment}
          disabled={selectedSupplies.length === 0}
          style={{
            padding: '12px 36px', fontSize: 16, fontWeight: 'bold',
            background: selectedSupplies.length > 0 ? '#16a34a' : '#334155',
            color: selectedSupplies.length > 0 ? '#fff' : '#64748b',
            border: 'none', borderRadius: 8, cursor: selectedSupplies.length > 0 ? 'pointer' : 'default',
            marginBottom: 16,
          }}
        >
          💊 Apply Treatment
        </button>

        {treatFeedback && (
          <div style={{
            background: '#1e293b', border: '1px solid #475569', borderRadius: 8,
            padding: '14px 24px', maxWidth: 520, textAlign: 'center',
            color: treatFeedbackColor, fontSize: 14, lineHeight: 1.6,
          }}>
            {treatFeedback}
          </div>
        )}

        <button
          onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
          style={{ marginTop: 24, padding: '8px 20px', fontSize: 13, background: 'transparent', color: '#64748b', border: '1px solid #334155', borderRadius: 6, cursor: 'pointer' }}
        >
          ← Quit
        </button>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (phase === 'result') {
    const anyFlood = treatResults.some(r => r.usedFloodWater) || usedFloodWater
    const correctTreatments = treatResults.filter(r => r.correct).length
    const triagePoints = triageCorrect ? 30 : 10
    const treatPoints = correctTreatments * Math.round(60 / NPC_COUNT)
    const score = anyFlood ? 10 : Math.max(0, Math.min(100, triagePoints + treatPoints + 10))
    const passed = score >= 50 && !anyFlood

    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 560, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{passed ? '🏥' : '⚠️'}</div>
          <h1 style={{ fontSize: 28, color: passed ? '#4ade80' : '#f87171', marginBottom: 8 }}>
            {anyFlood ? 'CRITICAL FAILURE: Contaminated Water Used!' : passed ? 'All Patients Treated!' : 'Treatment Incomplete'}
          </h1>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: passed ? '#4ade80' : '#f87171', margin: '16px 0' }}>
            {score}/100
          </div>

          {anyFlood && (
            <div style={{ background: '#7f1d1d', borderRadius: 12, padding: 20, marginBottom: 20, textAlign: 'left' }}>
              <p style={{ color: '#fca5a5', fontSize: 15, lineHeight: 1.6 }}>
                🚨 <strong>You used floodwater on an open wound.</strong> Floodwater is a cocktail of raw sewage, industrial chemicals, dead animals, and dangerous bacteria including E. coli, Leptospirosis, and Tetanus. Using it to clean ANY wound virtually guarantees a severe, potentially fatal infection.
              </p>
            </div>
          )}

          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 20 }}>
            <p style={{ color: '#cbd5e1', marginBottom: 8 }}>📋 <strong>Triage order:</strong> <span style={{ color: triageCorrect ? '#4ade80' : '#fbbf24' }}>{triageCorrect ? 'Correct ✅' : 'Incorrect ❌'}</span></p>
            <p style={{ color: '#cbd5e1', marginBottom: 8 }}>💊 <strong>Correct treatments:</strong> {correctTreatments}/{NPC_COUNT}</p>
          </div>

          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, textAlign: 'left', marginBottom: 24 }}>
            <h3 style={{ color: '#38bdf8', marginBottom: 12 }}>📚 Key Takeaways:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2.2 }}>
              <li style={{ color: '#fda4af' }}>🩸 <strong>Severe bleeding</strong> kills in minutes → always treat first with direct pressure</li>
              <li style={{ color: '#a5f3fc' }}>🥶 <strong>Hypothermia</strong> → Mylar blanket, NOT rubbing (that's a dangerous myth)</li>
              <li style={{ color: '#fb923c' }}>🔥 <strong>Chemical burns</strong> → Flush with clean water 15-20 min, apply burn cream, wrap loosely. NEVER use butter!</li>
              <li style={{ color: '#c4b5fd' }}>😶 <strong>Shock</strong> → Lay flat, elevate legs, keep warm. NEVER give food or water!</li>
              <li style={{ color: '#bbf7d0' }}>🤕 <strong>Minor wounds</strong> → Clean with bottled water + antiseptic + bandage</li>
              <li style={{ color: '#fde68a' }}>🚰 <strong>NEVER</strong> use floodwater — it's contaminated with sewage &amp; chemicals</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setPhase('intro')
                setTriageOrder([])
                setTriageMessage('')
                setCurrentNpcIndex(0)
                setSelectedSupplies([])
                setTreatFeedback('')
                setTriageCorrect(false)
                setTreatResults([])
                setUsedFloodWater(false)
              }}
              style={{ padding: '12px 32px', fontSize: 16, fontWeight: 'bold', background: '#e11d48', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
              style={{ padding: '12px 32px', fontSize: 16, fontWeight: 'bold', background: '#475569', color: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              ← Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
