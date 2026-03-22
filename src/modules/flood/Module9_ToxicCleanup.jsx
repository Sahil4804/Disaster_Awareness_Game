import { useState, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

const CHALLENGES = [
  {
    id: 'water',
    title: 'Challenge 1: Contaminated Water',
    emoji: '🚰',
    description: 'Floodwater has contaminated your only water source. The water is brown and murky. You need safe drinking water to survive.',
    scene: 'water',
  },
  {
    id: 'power',
    title: 'Challenge 2: Generator Safety',
    emoji: '⚡',
    description: 'Power is out. You found a portable generator. Where do you set it up?',
    scene: 'power',
  },
  {
    id: 'mold',
    title: 'Challenge 3: Mold Cleanup',
    emoji: '🦠',
    description: 'Mold is spreading on the walls after the flood. It must be cleaned, but mold spores are extremely dangerous.',
    scene: 'mold',
  },
  {
    id: 'food',
    title: 'Challenge 4: Flood-Touched Food',
    emoji: '🥫',
    description: 'The flood has receded. Your pantry was partially flooded. Which foods are safe to keep?',
    scene: 'food',
  },
  {
    id: 'structure',
    title: 'Challenge 5: Re-entering Your Home',
    emoji: '🏚️',
    description: 'The flood has receded. Before going back inside, what must you check?',
    scene: 'structure',
  },
]

const WATER_STEPS = [
  { id: 'drink', label: 'Drink it directly 🥤', correct: false, feedback: '☠️ NEVER drink floodwater! It contains sewage, chemicals, bacteria, and parasites. Drinking it directly causes severe illness — cholera, dysentery, and worse.' },
  { id: 'filter_only', label: 'Filter through cloth only 🧽', correct: false, feedback: '⚠️ Filtering removes sediment but NOT bacteria or viruses. Cloth filtering is only step 1 — you still need to boil or disinfect!' },
  { id: 'boil_muddy', label: 'Boil the muddy water 🔥', correct: false, feedback: '⚠️ Boiling kills germs but doesn\'t remove sediment, chemicals, or heavy metals. Filter FIRST through cloth to remove particles, THEN boil!' },
  { id: 'filter_then_boil', label: 'Filter through cloth, THEN boil 1 min ✅', correct: true, feedback: '✅ Perfect! Step 1: Filter through cloth to remove sediment. Step 2: Bring to a rolling boil for 1 minute to kill pathogens. This is the safest field method!' },
  { id: 'bleach', label: 'Add 8 drops of bleach per gallon, wait 30 min 🧪', correct: true, feedback: '✅ Also correct! When boiling isn\'t possible, 8 drops of unscented liquid bleach per gallon, waited 30 minutes, is the EPA-recommended alternative. The water should have a slight chlorine smell.' },
  { id: 'solar', label: 'Leave in sunlight for a few hours ☀️', correct: false, feedback: '⚠️ SODIS (solar disinfection) works but takes 6+ hours in clear bottles in direct sun. In a flood emergency, you may not have that time. Boiling or bleach is faster and more reliable.' },
  { id: 'iodine', label: 'Add iodine tablets 💊', correct: false, feedback: '⚠️ Iodine tablets work for biological contaminants but NOT for chemical contamination common in floods. Also, they\'re not safe for pregnant women or those with thyroid conditions.' },
]

const FOOD_OPTIONS = [
  { id: 'sealed_cans', label: 'Unopened cans with intact seals — wash with bleach solution 🥫', correct: true, feedback: '✅ Intact sealed cans can be saved! Wash the outside with a bleach/water solution (1 tbsp bleach per gallon water), dry, and relabel if labels fell off.' },
  { id: 'cardboard_food', label: 'Food in cardboard boxes (cereal, pasta) 📦', correct: false, feedback: '❌ Cardboard absorbs floodwater like a sponge. Even sealed inner bags can be compromised by floodwater bacteria seeping through micro-tears. Discard ALL cardboard-packaged food.' },
  { id: 'fridge_food', label: 'Refrigerator food — power was out for 3 days 🧊', correct: false, feedback: '❌ After 4 hours without power, refrigerated food is unsafe. After 48 hours, even frozen food thaws and breeds dangerous bacteria. The "smell test" is unreliable — discard it all.' },
  { id: 'root_veggies', label: 'Unpackaged root vegetables from the garden 🥔', correct: false, feedback: '❌ Any unpackaged food that contacted floodwater must be discarded. Floodwater carries sewage, chemicals, and pathogens that absorb into porous food surfaces.' },
]

const STRUCTURE_OPTIONS = [
  { id: 'check_structure', label: 'Look for cracks, shifted foundation, sagging before entering 🔍', correct: true, feedback: '✅ Correct! Floods undermine foundations and weaken load-bearing walls. If you see cracks, sagging roofs, or shifted walls, do NOT enter. Call a structural engineer.' },
  { id: 'rush_in', label: 'Go right in — it\'s your home! 🏠', correct: false, feedback: '❌ Rushing into a flood-damaged home is extremely dangerous. Floors can collapse, walls can fall, and hidden gas leaks can cause explosions. Always inspect from outside first.' },
  { id: 'check_electric', label: 'Turn the power back on to see inside 💡', correct: false, feedback: '❌ NEVER turn power on in a flood-damaged home without professional inspection! Wet wiring causes fires and electrocution. A licensed electrician must clear it first.' },
  { id: 'document_only', label: 'Just take photos for insurance and leave 📸', correct: false, feedback: '⚠️ Photos are smart, but you should also do a visual structural check from outside. Check for gas smells (leave immediately if you smell gas), and don\'t touch standing water inside.' },
]

const PPE_ITEMS = [
  { id: 'mask', name: 'N95 Mask', emoji: '😷', color: '#38bdf8' },
  { id: 'gloves', name: 'Rubber Gloves', emoji: '🧤', color: '#22c55e' },
  { id: 'goggles', name: 'Safety Goggles', emoji: '🥽', color: '#f97316' },
]

const POINTS_PER_CHALLENGE = 100

export default function ToxicCleanupModule() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | challenge | feedback | result
  const [challengeIdx, setChallengeIdx] = useState(0)
  const [scores, setScores] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState('')
  const [feedbackOk, setFeedbackOk] = useState(false)
  // Power challenge
  const [generatorPlaced, setGeneratorPlaced] = useState(false)
  // Mold challenge
  const [equippedPPE, setEquippedPPE] = useState([])
  const [moldAttempted, setMoldAttempted] = useState(false)

  const challenge = CHALLENGES[challengeIdx] || CHALLENGES[0]

  const showFeedback = useCallback((ok, msg, pts) => {
    setFeedbackOk(ok)
    setFeedbackMsg(msg)
    setScores(prev => [...prev, pts])
    setPhase('feedback')
  }, [])

  // Water challenge handler
  const handleWaterChoice = useCallback((step) => {
    if (step.correct) {
      showFeedback(true, step.feedback, POINTS_PER_CHALLENGE)
    } else {
      showFeedback(false, step.feedback, 0)
    }
  }, [showFeedback])

  // Power challenge handler
  const handleGeneratorPlace = useCallback((location) => {
    if (location === 'outside') {
      showFeedback(true,
        '✅ Correct! Generators must ALWAYS run OUTSIDE, at least 20 feet from windows and doors. Carbon monoxide (CO) is colorless and odorless — it kills hundreds of people every year during power outages!',
        POINTS_PER_CHALLENGE
      )
    } else {
      showFeedback(false,
        '☠️ DEADLY MISTAKE! Running a generator indoors produces carbon monoxide (CO), a colorless, odorless gas. CO poisoning kills within minutes in enclosed spaces. MORE people die from generator CO poisoning after floods than from the flood itself!',
        0
      )
    }
  }, [showFeedback])

  // Food challenge handler
  const handleFoodChoice = useCallback((option) => {
    if (option.correct) {
      showFeedback(true, option.feedback, POINTS_PER_CHALLENGE)
    } else {
      showFeedback(false, option.feedback, 0)
    }
  }, [showFeedback])

  // Structure challenge handler
  const handleStructureChoice = useCallback((option) => {
    if (option.correct) {
      showFeedback(true, option.feedback, POINTS_PER_CHALLENGE)
    } else {
      showFeedback(false, option.feedback, 0)
    }
  }, [showFeedback])

  // Mold challenge handlers
  const togglePPE = useCallback((ppeId) => {
    setEquippedPPE(prev =>
      prev.includes(ppeId) ? prev.filter(id => id !== ppeId) : [...prev, ppeId]
    )
  }, [])

  const handleMoldClean = useCallback(() => {
    if (equippedPPE.length === 3) {
      showFeedback(true,
        '✅ Excellent! You wore ALL required PPE: mask (prevents inhaling spores), gloves (prevents skin contact), goggles (prevents eye exposure). Mold spores cause severe respiratory illness, skin rashes, and eye infections. Full PPE is non-negotiable!',
        POINTS_PER_CHALLENGE
      )
    } else {
      const missing = PPE_ITEMS.filter(p => !equippedPPE.includes(p.id))
      const missingNames = missing.map(p => `${p.emoji} ${p.name}`).join(', ')
      setMoldAttempted(true)
      showFeedback(false,
        `🚫 STOP! You're missing: ${missingNames}. Mold spores are microscopic and extremely dangerous. Without full PPE, you risk: ${missing.some(m => m.id === 'mask') ? '🫁 Respiratory infection from inhaled spores. ' : ''}${missing.some(m => m.id === 'gloves') ? '🖐️ Skin rashes and allergic reactions. ' : ''}${missing.some(m => m.id === 'goggles') ? '👁️ Severe eye irritation and infection. ' : ''}ALWAYS wear ALL three items!`,
        0
      )
    }
  }, [equippedPPE, showFeedback])

  const nextChallenge = useCallback(() => {
    if (challengeIdx + 1 >= CHALLENGES.length) {
      setPhase('result')
    } else {
      setChallengeIdx(c => c + 1)
      setGeneratorPlaced(false)
      setEquippedPPE([])
      setMoldAttempted(false)
      setPhase('challenge')
    }
  }, [challengeIdx])

  const totalScore = scores.reduce((a, b) => a + b, 0)
  const maxPossible = CHALLENGES.length * POINTS_PER_CHALLENGE
  const normalizedScore = Math.round((totalScore / maxPossible) * 100)
  const passed = totalScore >= POINTS_PER_CHALLENGE * 3

  const finishModule = () => {
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-9', result: { score: normalizedScore, passed } } })
    dispatch({ type: 'BACK_TO_MODULES' })
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>☣️</div>
          <h1 style={styles.title}>Module 9: Toxic Cleanup</h1>
          <p style={styles.text}>
            The flood has receded, but deadly hazards remain. Contaminated water,
            carbon monoxide, and toxic mold kill hundreds of people AFTER floods end.
          </p>
          <div style={{ ...styles.infoBox, background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' }}>
            <p style={{ ...styles.text, fontWeight: 'bold', color: '#ef4444' }}>⚠️ Post-flood dangers:</p>
            <p style={styles.text}>🚰 Contaminated water causes cholera & dysentery</p>
            <p style={styles.text}>⚡ Generators produce deadly carbon monoxide</p>
            <p style={styles.text}>🦠 Mold spores cause severe respiratory illness</p>
            <p style={styles.text}>🥫 Flood-touched food harbors invisible bacteria</p>
            <p style={styles.text}>🏚️ Structural damage makes re-entry deadly</p>
          </div>
          <p style={{ ...styles.text, color: '#fbbf24' }}>
            Complete 5 survival challenges to pass this module.
          </p>
          <button style={styles.btnPrimary} onClick={() => setPhase('challenge')}>
            Begin Cleanup ☣️
          </button>
          <button style={styles.btnBack} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 64 }}>{passed ? '🏠' : '🏚️'}</div>
          <h1 style={styles.title}>{passed ? 'Home Safe!' : 'Dangerous Mistakes'}</h1>
          <div style={{ ...styles.scoreBox, borderColor: passed ? '#22c55e' : '#ef4444' }}>
            <span style={{ fontSize: 36, fontWeight: 'bold', color: passed ? '#22c55e' : '#ef4444' }}>
              {normalizedScore}%
            </span>
            <span style={styles.text}> ({totalScore} / {maxPossible} pts)</span>
          </div>
          <div style={{ width: '100%', marginTop: 12 }}>
            {CHALLENGES.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', margin: '4px 0', borderRadius: 8,
                background: scores[i] > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              }}>
                <span style={styles.text}>{c.emoji} {c.title}</span>
                <span style={{ ...styles.text, color: scores[i] > 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>
                  {scores[i] > 0 ? `+${scores[i]}` : 'Failed'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ ...styles.infoBox, background: 'rgba(251,191,36,0.1)', borderColor: '#fbbf24', marginTop: 12 }}>
            <p style={styles.text}>
              💡 <strong>Key takeaways:</strong> Filter THEN boil water (or use bleach). Generators go OUTSIDE only.
              Full PPE for mold — mask, gloves, AND goggles. Discard all flood-touched food except intact sealed cans.
              Never re-enter without checking structure first. These rules save lives after every flood.
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
          <div style={{ fontSize: 56 }}>{feedbackOk ? '✅' : '☠️'}</div>
          <h2 style={{ ...styles.title, fontSize: 20, color: feedbackOk ? '#22c55e' : '#ef4444' }}>
            {challenge.title}
          </h2>
          <p style={{ ...styles.text, fontSize: 16, lineHeight: 1.7, textAlign: 'center' }}>
            {feedbackMsg}
          </p>
          <button style={styles.btnPrimary} onClick={nextChallenge}>
            {challengeIdx + 1 >= CHALLENGES.length ? 'See Results' : 'Next Challenge →'}
          </button>
        </div>
      </div>
    )
  }

  // ── CHALLENGE SCENES ──
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Challenge {challengeIdx + 1} / {CHALLENGES.length}
          </span>
          <div style={{ flex: 1, height: 4, background: '#334155', borderRadius: 4 }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
              width: `${((challengeIdx + 1) / CHALLENGES.length) * 100}%`,
              transition: 'width 0.3s',
            }} />
          </div>
        </div>

        <div style={{ fontSize: 48 }}>{challenge.emoji}</div>
        <h2 style={{ ...styles.title, fontSize: 22 }}>{challenge.title}</h2>
        <p style={{ ...styles.text, textAlign: 'center' }}>{challenge.description}</p>

        {/* ── WATER SCENE ── */}
        {challenge.id === 'water' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Visual of dirty water */}
            <div style={{
              background: 'linear-gradient(180deg, #78350f, #92400e, #a16207)',
              borderRadius: 12, height: 80, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid #a16207',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 36, opacity: 0.8 }}>🥤</span>
              <span style={{ position: 'absolute', fontSize: 14, bottom: 4, color: '#fde68a' }}>
                ~ murky brown water ~
              </span>
              {/* Floating debris */}
              <span style={{ position: 'absolute', top: 8, left: '20%', fontSize: 16 }}>🍂</span>
              <span style={{ position: 'absolute', top: 12, right: '25%', fontSize: 14 }}>🪵</span>
            </div>
            <p style={{ ...styles.text, fontSize: 13, color: '#fbbf24', textAlign: 'center' }}>
              How will you make this water safe to drink?
            </p>
            {WATER_STEPS.map(step => (
              <button key={step.id} onClick={() => handleWaterChoice(step)} style={{
                background: step.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${step.correct ? '#22c55e33' : '#47556933'}`,
                borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                textAlign: 'left', color: '#f1f5f9', fontSize: 15,
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = step.correct ? '#22c55e33' : '#47556933'; e.currentTarget.style.background = step.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)' }}
              >
                {step.label}
              </button>
            ))}
          </div>
        )}

        {/* ── POWER SCENE ── */}
        {challenge.id === 'power' && (
          <div style={{ width: '100%' }}>
            {/* House diagram */}
            <div style={{
              position: 'relative', width: '100%', height: 280,
              background: '#0f172a', borderRadius: 12, overflow: 'hidden',
              border: '1px solid #334155',
            }}>
              {/* Sky */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '30%', background: '#1e293b' }} />
              {/* Ground */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '25%',
                background: 'linear-gradient(180deg, #365314, #1a2e05)',
              }} />
              {/* House */}
              <div style={{
                position: 'absolute', left: '25%', right: '25%', top: '20%', bottom: '25%',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Roof */}
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '100px solid transparent',
                  borderRight: '100px solid transparent',
                  borderBottom: '50px solid #dc2626',
                }} />
                {/* Walls */}
                <div style={{
                  width: 200, flex: 1, background: '#78716c',
                  border: '2px solid #57534e', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Window */}
                  <div style={{ width: 30, height: 30, background: '#fbbf24', border: '2px solid #57534e', borderRadius: 2 }} />
                  {/* INSIDE click zone */}
                  <div
                    onClick={() => handleGeneratorPlace('inside')}
                    style={{
                      position: 'absolute', inset: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
                    }}
                  >
                    <span style={{
                      fontSize: 11, color: '#fbbf24', background: 'rgba(0,0,0,0.5)',
                      padding: '2px 8px', borderRadius: 4,
                    }}>
                      Click: Place INSIDE 🏠
                    </span>
                  </div>
                </div>
              </div>
              {/* Outside zone - LEFT */}
              <div
                onClick={() => handleGeneratorPlace('outside')}
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '22%',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-end',
                  justifyContent: 'center', paddingBottom: '28%',
                }}
              >
                <span style={{
                  fontSize: 11, color: '#22c55e', background: 'rgba(0,0,0,0.5)',
                  padding: '2px 8px', borderRadius: 4, textAlign: 'center',
                }}>
                  Click: Place OUTSIDE 🌳
                </span>
              </div>
              {/* Outside zone - RIGHT */}
              <div
                onClick={() => handleGeneratorPlace('outside')}
                style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: '22%',
                  cursor: 'pointer', display: 'flex', alignItems: 'flex-end',
                  justifyContent: 'center', paddingBottom: '28%',
                }}
              >
                <span style={{
                  fontSize: 11, color: '#22c55e', background: 'rgba(0,0,0,0.5)',
                  padding: '2px 8px', borderRadius: 4, textAlign: 'center',
                }}>
                  Click: Place OUTSIDE 🌳
                </span>
              </div>
              {/* Generator icon */}
              <div style={{
                position: 'absolute', bottom: '28%', left: '50%', transform: 'translateX(-50%)',
                fontSize: 32,
              }}>
                🔌
              </div>
            </div>
            <p style={{ ...styles.text, fontSize: 13, color: '#fbbf24', textAlign: 'center', marginTop: 8 }}>
              ⚡ Where do you place the generator?
            </p>
          </div>
        )}

        {/* ── MOLD SCENE ── */}
        {challenge.id === 'mold' && (
          <div style={{ width: '100%' }}>
            {/* PPE Selection */}
            <p style={{ ...styles.text, fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 8 }}>
              Select your safety equipment before cleaning:
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              {PPE_ITEMS.map(ppe => {
                const equipped = equippedPPE.includes(ppe.id)
                return (
                  <button key={ppe.id} onClick={() => togglePPE(ppe.id)} style={{
                    background: equipped ? `${ppe.color}22` : 'rgba(51,65,85,0.5)',
                    border: `2px solid ${equipped ? ppe.color : '#475569'}`,
                    borderRadius: 14, padding: '12px 16px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.2s', minWidth: 90,
                    boxShadow: equipped ? `0 0 15px ${ppe.color}33` : 'none',
                  }}>
                    <span style={{ fontSize: 32 }}>{ppe.emoji}</span>
                    <span style={{ color: equipped ? ppe.color : '#94a3b8', fontWeight: 'bold', fontSize: 12 }}>
                      {equipped ? '✅ Equipped' : ppe.name}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Equipped status */}
            <div style={{
              textAlign: 'center', padding: '6px 12px', borderRadius: 8, marginBottom: 12,
              background: equippedPPE.length === 3 ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${equippedPPE.length === 3 ? '#22c55e' : '#fbbf24'}`,
            }}>
              <span style={{ color: equippedPPE.length === 3 ? '#22c55e' : '#fbbf24', fontSize: 13, fontWeight: 'bold' }}>
                PPE: {equippedPPE.length}/3 equipped {equippedPPE.length === 3 ? '— Ready!' : '— Select all 3!'}
              </span>
            </div>
            {/* Mold wall */}
            <div
              onClick={handleMoldClean}
              style={{
                background: 'linear-gradient(135deg, #1e293b, #334155)',
                borderRadius: 12, height: 120, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #475569', position: 'relative', overflow: 'hidden',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#475569'}
            >
              {/* Mold spots */}
              <div style={{ position: 'absolute', top: '15%', left: '20%', fontSize: 24, opacity: 0.8 }}>🟢</div>
              <div style={{ position: 'absolute', top: '40%', left: '35%', fontSize: 18, opacity: 0.6 }}>🟤</div>
              <div style={{ position: 'absolute', top: '25%', right: '25%', fontSize: 28, opacity: 0.7 }}>⬛</div>
              <div style={{ position: 'absolute', bottom: '20%', left: '50%', fontSize: 20, opacity: 0.5 }}>🟢</div>
              <div style={{ position: 'absolute', top: '55%', right: '35%', fontSize: 16, opacity: 0.6 }}>🟤</div>
              <span style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 'bold', zIndex: 1, textShadow: '0 0 8px rgba(0,0,0,0.8)' }}>
                🧹 Click to clean mold
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8', zIndex: 1, marginTop: 4 }}>
                🦠 Toxic black & green mold patches
              </span>
            </div>
          </div>
        )}

        {/* ── FOOD SCENE ── */}
        {challenge.id === 'food' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Visual of flooded pantry */}
            <div style={{
              background: 'linear-gradient(180deg, #78350f, #451a03)',
              borderRadius: 12, height: 80, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid #92400e',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 36 }}>🥫📦🧊🥔</span>
              <span style={{ position: 'absolute', fontSize: 14, bottom: 4, color: '#fde68a' }}>
                ~ flood-damaged pantry ~
              </span>
            </div>
            <p style={{ ...styles.text, fontSize: 13, color: '#fbbf24', textAlign: 'center' }}>
              Which food is safe to keep after the flood?
            </p>
            {FOOD_OPTIONS.map(option => (
              <button key={option.id} onClick={() => handleFoodChoice(option)} style={{
                background: option.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${option.correct ? '#22c55e33' : '#47556933'}`,
                borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                textAlign: 'left', color: '#f1f5f9', fontSize: 15,
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = option.correct ? '#22c55e33' : '#47556933'; e.currentTarget.style.background = option.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {/* ── STRUCTURE SCENE ── */}
        {challenge.id === 'structure' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Visual of damaged house */}
            <div style={{
              background: 'linear-gradient(180deg, #1e293b, #0f172a)',
              borderRadius: 12, height: 80, display: 'flex', alignItems: 'center',
              justifyContent: 'center', border: '2px solid #475569',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ fontSize: 36 }}>🏚️</span>
              <span style={{ position: 'absolute', fontSize: 14, bottom: 4, color: '#fbbf24' }}>
                ~ flood-damaged home ~
              </span>
              <span style={{ position: 'absolute', top: 8, left: '15%', fontSize: 18, opacity: 0.6 }}>⚠️</span>
              <span style={{ position: 'absolute', top: 12, right: '20%', fontSize: 16, opacity: 0.5 }}>💧</span>
            </div>
            <p style={{ ...styles.text, fontSize: 13, color: '#fbbf24', textAlign: 'center' }}>
              What should you do before re-entering your flood-damaged home?
            </p>
            {STRUCTURE_OPTIONS.map(option => (
              <button key={option.id} onClick={() => handleStructureChoice(option)} style={{
                background: option.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)',
                border: `1px solid ${option.correct ? '#22c55e33' : '#47556933'}`,
                borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                textAlign: 'left', color: '#f1f5f9', fontSize: 15,
                transition: 'border-color 0.2s, background 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.background = 'rgba(96,165,250,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = option.correct ? '#22c55e33' : '#47556933'; e.currentTarget.style.background = option.correct ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.05)' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: '#1e293b',
    borderRadius: 20,
    padding: '28px 24px',
    maxWidth: 520,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    margin: 0,
    fontSize: 26,
    textAlign: 'center',
  },
  text: {
    color: '#f1f5f9',
    margin: '4px 0',
    fontSize: 15,
    lineHeight: 1.5,
  },
  infoBox: {
    border: '1px solid',
    borderRadius: 12,
    padding: '12px 16px',
    width: '100%',
  },
  scoreBox: {
    border: '2px solid',
    borderRadius: 16,
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '14px 32px',
    fontSize: 17,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 8,
    transition: 'transform 0.15s',
  },
  btnBack: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: 10,
    padding: '10px 24px',
    fontSize: 14,
    cursor: 'pointer',
  },
}
