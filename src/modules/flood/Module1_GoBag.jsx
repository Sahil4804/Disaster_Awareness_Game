import { useState, useEffect, useCallback } from 'react'
import { useGame } from '../../context/GameContext'

// ── Item Database ──
// Each item has: name, emoji, weight (1-3), category, isEssential, feedback
const ALL_ITEMS = [
  // ESSENTIALS (must-picks)
  { id: 'water', name: 'Water Bottles (2L)', emoji: '💧', weight: 2, isEssential: true, category: 'hydration', feedback: 'Water is the #1 priority. You can survive days without food, but only hours without water in a crisis.' },
  { id: 'firstaid', name: 'First Aid Kit', emoji: '🩹', weight: 1, isEssential: true, category: 'medical', feedback: 'Floodwater causes severe infections. A first aid kit with bandages and antiseptic is life-saving.' },
  { id: 'flashlight', name: 'Flashlight + Batteries', emoji: '🔦', weight: 1, isEssential: true, category: 'tools', feedback: 'Power goes out in floods. A flashlight is critical for navigation and signaling rescuers at night.' },
  { id: 'meds', name: 'Prescription Meds', emoji: '💊', weight: 1, isEssential: true, category: 'medical', feedback: 'Going without critical medication during a multi-day emergency can be fatal. Always pack a 3-day supply.' },
  { id: 'docs', name: 'ID & Documents (sealed bag)', emoji: '📋', weight: 1, isEssential: true, category: 'documents', feedback: 'After a disaster, you need ID to access shelters, insurance, and aid. A waterproof bag keeps them safe.' },
  { id: 'cash', name: 'Emergency Cash ($50)', emoji: '💵', weight: 1, isEssential: true, category: 'documents', feedback: 'ATMs and card readers go down when power fails. Small bills let you buy essentials from anyone.' },
  { id: 'whistle', name: 'Emergency Whistle', emoji: '📯', weight: 1, isEssential: true, category: 'tools', feedback: 'A whistle can be heard far further than shouting and doesn\'t tire you out. Three blasts = SOS.' },
  { id: 'radio', name: 'Hand-Crank Radio', emoji: '📻', weight: 1, isEssential: true, category: 'tools', feedback: 'When cell towers are down, NOAA weather radio is your only source of official emergency updates.' },
  { id: 'blanket', name: 'Mylar Emergency Blanket', emoji: '🪶', weight: 1, isEssential: true, category: 'shelter', feedback: 'Hypothermia kills fast in wet conditions. A Mylar blanket retains 90% body heat and weighs almost nothing.' },
  { id: 'map', name: 'Local Waterproof Map', emoji: '🗺️', weight: 1, isEssential: true, category: 'navigation', feedback: 'GPS needs power and signal. A waterproof paper map of your area shows evacuation routes that still work.' },
  { id: 'knife', name: 'Multi-Tool / Pocket Knife', emoji: '🔪', weight: 1, isEssential: true, category: 'tools', feedback: 'A multi-tool can cut rope, open cans, pry things, and perform dozens of emergency tasks. One of the most versatile survival items per gram.' },
  { id: 'poncho', name: 'Rain Poncho', emoji: '🧥', weight: 1, isEssential: true, category: 'shelter', feedback: 'Staying dry prevents hypothermia. A compact poncho weighs almost nothing but keeps rain off your core, where heat loss is greatest.' },
  { id: 'charger', name: 'Portable Phone Charger', emoji: '🔋', weight: 1, isEssential: true, category: 'tools', feedback: 'A charged phone is your link to emergency services, GPS, and family. A portable charger extends your phone life for days when grid power is gone.' },
  { id: 'rope', name: 'Paracord (50ft)', emoji: '🪢', weight: 1, isEssential: true, category: 'tools', feedback: 'Paracord can build shelter, create a clothesline, tie down tarps, make a tourniquet, or pull someone from water. 50 feet weighs under a pound.' },
  { id: 'waterpur', name: 'Water Purification Tablets', emoji: '💧', weight: 1, isEssential: true, category: 'hydration', feedback: 'When your bottled water runs out, purification tablets can make questionable water safe. One tablet treats 1 liter — pack at least 10.' },

  // BAD PICKS (traps — heavy, useless, or dangerous)
  { id: 'laptop', name: 'Laptop', emoji: '💻', weight: 3, isEssential: false, category: 'electronics', feedback: 'A laptop is heavy, fragile, and useless without power. It wastes critical bag space for survival items.' },
  { id: 'books', name: 'Stack of Books', emoji: '📚', weight: 3, isEssential: false, category: 'comfort', feedback: 'Books are extremely heavy when wet. Every pound counts when you might be wading through floodwater.' },
  { id: 'pillow', name: 'Pillow', emoji: '🛏️', weight: 2, isEssential: false, category: 'comfort', feedback: 'Comfort items feel important but take space from life-saving gear. A Mylar blanket does more.' },
  { id: 'hairdryer', name: 'Hair Dryer', emoji: '💇', weight: 2, isEssential: false, category: 'electronics', feedback: 'No electricity means no hair dryer. It\'s dead weight in a flood scenario.' },
  { id: 'gaming', name: 'Gaming Console', emoji: '🎮', weight: 3, isEssential: false, category: 'electronics', feedback: 'A gaming console is heavy and useless without power. Survival bags must prioritize function over comfort.' },
  { id: 'candles', name: 'Scented Candles', emoji: '🕯️', weight: 2, isEssential: false, category: 'comfort', feedback: 'Open flames near floodwater gas leaks can cause explosions. Use a flashlight instead — much safer.' },
  { id: 'dumbbells', name: 'Dumbbells', emoji: '🏋️', weight: 3, isEssential: false, category: 'heavy', feedback: 'You might need to swim, climb, or run. Extra weight can literally drag you under floodwater.' },
  { id: 'perfume', name: 'Cologne / Perfume', emoji: '🧴', weight: 1, isEssential: false, category: 'comfort', feedback: 'Glass bottles break, and fragrance attracts insects. Not useful in a survival situation.' },
  { id: 'heels', name: 'Dress Shoes / Heels', emoji: '👠', weight: 2, isEssential: false, category: 'clothing', feedback: 'You need sturdy, closed-toe shoes to avoid debris injuries. Dress shoes provide zero protection.' },
  { id: 'trophy', name: 'Trophy / Award', emoji: '🏆', weight: 2, isEssential: false, category: 'sentimental', feedback: 'Sentimental items are hard to leave behind, but your life is worth more than any trophy.' },
  { id: 'tv', name: 'Portable TV', emoji: '📺', weight: 3, isEssential: false, category: 'electronics', feedback: 'A TV needs power and signal — both gone in a flood. A hand-crank radio gives you emergency broadcasts without electricity.' },
  { id: 'guitar', name: 'Acoustic Guitar', emoji: '🎸', weight: 3, isEssential: false, category: 'comfort', feedback: 'Musical instruments are bulky and heavy. Every cubic inch of your bag should serve a survival function in the first 72 hours.' },
  { id: 'china', name: 'Fine China Set', emoji: '🍽️', weight: 3, isEssential: false, category: 'heavy', feedback: 'Ceramic plates shatter easily and weigh a ton. You can eat from tin foil or your hands. Survival isn\'t about comfort dining.' },
  { id: 'iron', name: 'Clothes Iron', emoji: '👔', weight: 2, isEssential: false, category: 'electronics', feedback: 'No electricity, no need for pressed clothes. An iron is dead weight when you\'re fighting for survival.' },
  { id: 'photo_album', name: 'Family Photo Album', emoji: '📷', weight: 2, isEssential: false, category: 'sentimental', feedback: 'Incredibly hard to leave behind, but photo albums are heavy, water-damaged easily, and replaceable with digital copies. Your family needs you alive more than photos.' },
  { id: 'makeup', name: 'Makeup Bag', emoji: '💄', weight: 1, isEssential: false, category: 'comfort', feedback: 'Cosmetics serve no survival function and many are flammable or attract insects. Save that bag space for a first aid kit.' },
  { id: 'blender', name: 'Kitchen Blender', emoji: '🫗', weight: 3, isEssential: false, category: 'heavy', feedback: 'No electricity, nowhere to plug it in. Kitchen appliances are among the worst things to grab during evacuation.' },
  { id: 'skateboard', name: 'Skateboard', emoji: '🛹', weight: 2, isEssential: false, category: 'comfort', feedback: 'Skateboards are useless on wet, debris-covered, or flooded terrain. Sturdy boots are what you need for evacuation.' },
  { id: 'jewelry', name: 'Jewelry Box', emoji: '💍', weight: 1, isEssential: false, category: 'sentimental', feedback: 'Jewelry can be replaced or claimed on insurance. It also makes you a theft target at crowded shelters. Leave it behind.' },
  { id: 'textbooks', name: 'School Textbooks', emoji: '📖', weight: 3, isEssential: false, category: 'heavy', feedback: 'Textbooks get destroyed by water and weigh as much as survival supplies. School can wait — survival can\'t.' },
]

const MAX_BAG_SLOTS = 12
const MAX_WEIGHT = 15
const TIMER_SECONDS = 60
const REQUIRED_ESSENTIALS = 10 // must pick at least 10 of 15 essentials to pass

// ── Shuffle helper ──
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function GoBagModule() {
  const { state, dispatch } = useGame()

  const [items] = useState(() => shuffle(ALL_ITEMS))
  const [bag, setBag] = useState([])
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const [gameOver, setGameOver] = useState(false)
  const [result, setResult] = useState(null) // { passed, score, essentialsPicked, feedback[] }
  const [showIntro, setShowIntro] = useState(true)

  // ── Timer ──
  useEffect(() => {
    if (showIntro || gameOver) return
    if (timeLeft <= 0) {
      evaluateBag()
      return
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timeLeft, showIntro, gameOver])

  const currentWeight = bag.reduce((sum, item) => sum + item.weight, 0)

  const addToBag = useCallback((item) => {
    if (gameOver) return
    if (bag.length >= MAX_BAG_SLOTS) return
    if (currentWeight + item.weight > MAX_WEIGHT) return
    if (bag.find((b) => b.id === item.id)) return
    setBag((prev) => [...prev, item])
  }, [bag, currentWeight, gameOver])

  const removeFromBag = useCallback((itemId) => {
    if (gameOver) return
    setBag((prev) => prev.filter((b) => b.id !== itemId))
  }, [gameOver])

  const evaluateBag = useCallback(() => {
    setGameOver(true)

    const essentialsPicked = bag.filter((b) => b.isEssential)
    const junkPicked = bag.filter((b) => !b.isEssential)
    const essentialsMissed = ALL_ITEMS.filter(
      (i) => i.isEssential && !bag.find((b) => b.id === i.id)
    )

    // Score: +10 per essential, -5 per junk
    const rawScore = essentialsPicked.length * 10 - junkPicked.length * 5
    const score = Math.max(0, Math.min(100, rawScore))
    const passed = essentialsPicked.length >= REQUIRED_ESSENTIALS && junkPicked.length <= 2

    // Build feedback
    const feedback = []
    if (essentialsPicked.length === ALL_ITEMS.filter(i => i.isEssential).length) {
      feedback.push({ type: 'perfect', text: 'PERFECT! You packed every essential item. You clearly understand survival priorities.' })
    }
    junkPicked.forEach((item) => {
      feedback.push({ type: 'bad', text: `❌ ${item.name}: ${item.feedback}` })
    })
    essentialsMissed.forEach((item) => {
      feedback.push({ type: 'missed', text: `⚠️ You left behind: ${item.name} — ${item.feedback}` })
    })
    essentialsPicked.forEach((item) => {
      feedback.push({ type: 'good', text: `✅ ${item.name}: ${item.feedback}` })
    })

    const res = { passed, score, essentialsPicked: essentialsPicked.length, junkCount: junkPicked.length, feedback }
    setResult(res)

    dispatch({
      type: 'RECORD_SCORE',
      payload: { key: `${state.selectedDisaster}-1`, result: { score, passed } },
    })
  }, [bag, dispatch, state.selectedDisaster])

  const submitBag = () => {
    if (bag.length === 0) return
    evaluateBag()
  }

  const restart = () => {
    setBag([])
    setTimeLeft(TIMER_SECONDS)
    setGameOver(false)
    setResult(null)
  }

  // ── INTRO SCREEN ──
  if (showIntro) {
    return (
      <div style={styles.screen}>
        <div style={styles.introCard}>
          <span style={{ fontSize: 64 }}>🎒</span>
          <h1 style={styles.introTitle}>Module 1: The 60-Second Go-Bag</h1>
          <div style={styles.introBody}>
            <p><strong>Scenario:</strong> A flash flood warning has been issued for your area. You have <span style={{ color: '#f87171', fontWeight: 700 }}>60 seconds</span> to pack a survival bag before evacuating.</p>
            <p style={{ marginTop: 12 }}><strong>Rules:</strong></p>
            <ul style={styles.introList}>
              <li>Your bag has <strong>12 slots</strong> and a <strong>weight limit of 15</strong></li>
              <li>Click items to add them to your bag</li>
              <li>Choose wisely — not everything will help you survive</li>
              <li>Submit your bag before time runs out, or it auto-submits at 0:00</li>
            </ul>
          </div>
          <button style={styles.goBtn} onClick={() => setShowIntro(false)}>
            Start Packing — 60s Timer Begins!
          </button>
          <button style={styles.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
            ← Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  if (gameOver && result) {
    return (
      <div style={styles.screen}>
        <div style={styles.resultCard}>
          <span style={{ fontSize: 56 }}>{result.passed ? '🏆' : '💀'}</span>
          <h2 style={{ ...styles.resultTitle, color: result.passed ? '#22c55e' : '#ef4444' }}>
            {result.passed ? 'SURVIVAL READY!' : 'NOT PREPARED'}
          </h2>
          <p style={styles.scoreText}>
            Score: <strong>{result.score}%</strong> — {result.essentialsPicked}/{ALL_ITEMS.filter(i => i.isEssential).length} essentials, {result.junkCount} unnecessary items
          </p>

          {!result.passed && (
            <div style={styles.failBox}>
              <strong>Why you failed:</strong>{' '}
              {result.essentialsPicked < REQUIRED_ESSENTIALS
                ? `You only packed ${result.essentialsPicked} essentials (need at least ${REQUIRED_ESSENTIALS}).`
                : `You packed too many unnecessary items (${result.junkCount}). Space wasted on junk could have held life-saving gear.`}
            </div>
          )}

          <div style={styles.feedbackList}>
            {result.feedback.map((f, i) => (
              <div key={i} style={{
                ...styles.feedbackItem,
                borderLeftColor: f.type === 'good' ? '#22c55e' : f.type === 'bad' ? '#ef4444' : f.type === 'missed' ? '#f59e0b' : '#3b82f6',
              }}>
                {f.text}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button style={styles.retryBtn} onClick={restart}>Try Again</button>
            <button style={styles.backBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN GAME SCREEN ──
  const timerColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e'
  const timerPulse = timeLeft <= 10

  return (
    <div style={styles.gameContainer}>
      {/* HEADER */}
      <div style={styles.header}>
        <button style={styles.backBtnSmall} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
          ← Quit
        </button>
        <h2 style={styles.gameTitle}>🎒 Pack Your Go-Bag!</h2>
        <div style={{
          ...styles.timer,
          color: timerColor,
          animation: timerPulse ? 'pulse 0.5s infinite alternate' : 'none',
        }}>
          ⏱ {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>

      <div style={styles.gameLayout}>
        {/* ITEMS GRID */}
        <div style={styles.itemsPanel}>
          <h3 style={styles.panelTitle}>Available Items</h3>
          <div style={styles.itemsGrid}>
            {items.map((item) => {
              const inBag = bag.find((b) => b.id === item.id)
              const tooHeavy = currentWeight + item.weight > MAX_WEIGHT
              const bagFull = bag.length >= MAX_BAG_SLOTS
              const disabled = inBag || (tooHeavy && !inBag) || (bagFull && !inBag)

              return (
                <button
                  key={item.id}
                  style={{
                    ...styles.itemCard,
                    opacity: inBag ? 0.3 : disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    borderColor: inBag ? '#22c55e' : 'rgba(255,255,255,0.08)',
                    transform: inBag ? 'scale(0.95)' : 'scale(1)',
                  }}
                  disabled={disabled}
                  onClick={() => addToBag(item)}
                >
                  <span style={{ fontSize: 28 }}>{item.emoji}</span>
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemWeight}>
                    {'⬤'.repeat(item.weight)}{'○'.repeat(3 - item.weight)} wt:{item.weight}
                  </span>
                  {inBag && <span style={styles.inBagTag}>IN BAG</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* BAG PANEL */}
        <div style={styles.bagPanel}>
          <h3 style={styles.panelTitle}>Your Go-Bag</h3>
          <div style={styles.bagStats}>
            <span>Slots: <strong>{bag.length}</strong>/{MAX_BAG_SLOTS}</span>
            <span>Weight: <strong style={{ color: currentWeight > MAX_WEIGHT - 2 ? '#f59e0b' : '#22c55e' }}>{currentWeight}</strong>/{MAX_WEIGHT}</span>
          </div>

          {/* Weight bar */}
          <div style={styles.weightBarOuter}>
            <div style={{
              ...styles.weightBarInner,
              width: `${(currentWeight / MAX_WEIGHT) * 100}%`,
              background: currentWeight > MAX_WEIGHT - 2 ? '#f59e0b' : '#22c55e',
            }} />
          </div>

          {/* Bag contents */}
          <div style={styles.bagItems}>
            {bag.length === 0 && (
              <p style={{ textAlign: 'center', opacity: 0.4, padding: 24 }}>
                Click items on the left to add them here
              </p>
            )}
            {bag.map((item) => (
              <div key={item.id} style={styles.bagItem}>
                <span>{item.emoji} {item.name}</span>
                <button
                  style={styles.removeBtn}
                  onClick={() => removeFromBag(item.id)}
                >
                  ✕
                </button>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: MAX_BAG_SLOTS - bag.length }).map((_, i) => (
              <div key={`empty-${i}`} style={styles.emptySlot}>
                empty slot
              </div>
            ))}
          </div>

          <button
            style={{
              ...styles.submitBtn,
              opacity: bag.length === 0 ? 0.4 : 1,
              cursor: bag.length === 0 ? 'not-allowed' : 'pointer',
            }}
            disabled={bag.length === 0}
            onClick={submitBag}
          >
            Submit Bag ✓
          </button>
        </div>
      </div>

      {/* Pulse animation via style tag */}
      <style>{`
        @keyframes pulse {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}

// ── STYLES ──
const styles = {
  screen: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 24,
    background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 100%)',
  },
  introCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: 560, padding: 48, background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center',
  },
  introTitle: { fontSize: 28, fontWeight: 800, marginTop: 16, marginBottom: 20 },
  introBody: { textAlign: 'left', lineHeight: 1.8, fontSize: 15, opacity: 0.85 },
  introList: { marginTop: 8, paddingLeft: 20, listStyle: 'disc' },
  goBtn: {
    marginTop: 28, padding: '14px 40px', fontSize: 17, fontWeight: 700,
    background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',
    border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(220,38,38,0.4)',
  },

  // Game layout
  gameContainer: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column',
    background: 'linear-gradient(180deg, #0a0e1a 0%, #111827 100%)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.3)',
  },
  gameTitle: { fontSize: 20, fontWeight: 700 },
  timer: { fontSize: 28, fontWeight: 800, fontFamily: 'monospace' },

  gameLayout: {
    display: 'flex', flex: 1, gap: 0, overflow: 'hidden',
  },
  itemsPanel: {
    flex: 1, padding: 20, overflowY: 'auto', maxHeight: 'calc(100vh - 70px)',
  },
  bagPanel: {
    width: 320, minWidth: 280, padding: 20, overflowY: 'auto',
    background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 70px)',
  },
  panelTitle: { fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, opacity: 0.6 },

  // Items grid
  itemsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12,
  },
  itemCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '16px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 10,
    border: '1.5px solid', transition: 'all 0.15s', position: 'relative',
  },
  itemName: { fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.3 },
  itemWeight: { fontSize: 10, opacity: 0.4 },
  inBagTag: {
    position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700,
    color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '2px 6px', borderRadius: 4,
  },

  // Bag
  bagStats: {
    display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, opacity: 0.8,
  },
  weightBarOuter: {
    height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 16, overflow: 'hidden',
  },
  weightBarInner: {
    height: '100%', borderRadius: 3, transition: 'width 0.3s, background 0.3s',
  },
  bagItems: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16,
  },
  bagItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 13,
  },
  removeBtn: {
    background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none',
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
  },
  emptySlot: {
    padding: '8px 12px', border: '1px dashed rgba(255,255,255,0.08)',
    borderRadius: 8, fontSize: 12, opacity: 0.2, textAlign: 'center',
  },
  submitBtn: {
    padding: '12px 24px', fontSize: 16, fontWeight: 700,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#fff',
    border: 'none', borderRadius: 10, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
  },

  // Result
  resultCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    maxWidth: 640, width: '100%', padding: 40, background: 'rgba(255,255,255,0.04)',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  resultTitle: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  scoreText: { fontSize: 16, marginTop: 8, opacity: 0.8 },
  failBox: {
    marginTop: 16, padding: 16, background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
    fontSize: 14, lineHeight: 1.6, width: '100%',
  },
  feedbackList: {
    marginTop: 20, width: '100%', display: 'flex', flexDirection: 'column', gap: 8,
  },
  feedbackItem: {
    padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
    background: 'rgba(255,255,255,0.03)', borderRadius: 6,
    borderLeft: '3px solid',
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
  backBtnSmall: {
    background: 'none', border: 'none', color: '#60a5fa',
    cursor: 'pointer', fontSize: 13,
  },
}
