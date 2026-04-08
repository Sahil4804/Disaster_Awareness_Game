import { useState, useCallback, useMemo, useEffect } from 'react'
import { useGame } from '../../context/GameContext'

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DIALOGUE_ROUNDS = [
  {
    npcText: "Oh god oh god oh god! The water is rising! We're all going to drown! I can't breathe! I CAN'T BREATHE!",
    npcEmoji: '😰',
    options: [
      {
        text: "STOP PANICKING! You need to calm down RIGHT NOW!",
        type: 'aggressive',
        panicChange: 10,
        feedback: "Yelling at someone to 'calm down' NEVER works. It invalidates their feelings and increases panic. Aggressive commands trigger the fight-or-flight response even more.",
      },
      {
        text: "You're right, we're probably going to die! This is hopeless!",
        type: 'fearful',
        panicChange: 15,
        feedback: "Agreeing with catastrophic thinking validates and amplifies panic. A panicking person needs an anchor to reality, not confirmation of their worst fears.",
      },
      {
        text: "I hear you — this is scary. Can you look at me? Let's breathe together. In... and out.",
        type: 'calm',
        panicChange: -15,
        feedback: "Acknowledging fear without judgment, then redirecting to a physical task (breathing) is textbook psychological first aid. You gave them an anchor.",
      },
    ],
  },
  {
    npcText: "My kids! My kids are at school! I have to go back through the flood to get them! I'll swim if I have to!",
    npcEmoji: '😭',
    options: [
      {
        text: "Don't be stupid! You'll die if you go in that water!",
        type: 'aggressive',
        panicChange: 12,
        feedback: "Calling someone 'stupid' during a crisis destroys trust. They'll stop listening to you entirely and may act even more recklessly out of defiance.",
      },
      {
        text: "Oh no, your poor kids! What if something happens to them?!",
        type: 'fearful',
        panicChange: 15,
        feedback: "Amplifying their fear about loved ones pushes them toward dangerous impulsive action. They need reassurance and a plan, not more worst-case scenarios.",
      },
      {
        text: "Your kids matter. Schools have emergency plans too. Let's find a phone to contact them — that's the fastest way to help.",
        type: 'calm',
        panicChange: -15,
        feedback: "Validating their concern, then offering a SAFE concrete action (calling the school) redirects protective energy into something productive instead of suicidal.",
      },
    ],
  },
  {
    npcText: "I feel dizzy... my chest hurts... I think I'm having a heart attack! Am I dying?!",
    npcEmoji: '🥵',
    options: [
      {
        text: "You're fine! It's just panic! Stop being dramatic!",
        type: 'aggressive',
        panicChange: 10,
        feedback: "Dismissing physical symptoms is dangerous — they could be real OR panic attack symptoms. Either way, dismissal makes the person feel unheard and alone.",
      },
      {
        text: "Heart attack?! We don't have any medical supplies! What do we do?!",
        type: 'fearful',
        panicChange: 12,
        feedback: "Panicking about their symptoms mirrors their fear back at them. This feedback loop can escalate a panic attack into a full medical emergency.",
      },
      {
        text: "Those symptoms can happen with extreme stress. Sit down here. Let's count backwards from 10 together. Can you feel your feet on the ground?",
        type: 'calm',
        panicChange: -15,
        feedback: "Grounding techniques (counting, feeling physical sensations) activate the rational brain and interrupt the panic spiral. You're guiding them back to the present moment.",
      },
    ],
  },
  {
    npcText: "Why isn't anyone coming to rescue us?! The government doesn't care! Nobody's coming! We're abandoned!",
    npcEmoji: '😤',
    options: [
      {
        text: "Will you SHUT UP? Your whining isn't helping anyone!",
        type: 'aggressive',
        panicChange: 12,
        feedback: "Hostile responses create conflict within the group, which is deadly in emergencies. Group cohesion is a survival factor — breaking it puts everyone at risk.",
      },
      {
        text: "You're right, no one is going to help us. We're on our own and it's terrifying.",
        type: 'fearful',
        panicChange: 15,
        feedback: "Validating abandonment fears without offering hope leads to learned helplessness. People who believe rescue won't come stop taking survival actions.",
      },
      {
        text: "Help will come — floods make roads slow. While we wait, let's make sure we're visible. Can you help me hang something bright up high?",
        type: 'calm',
        panicChange: -15,
        feedback: "Giving a purposeful task transforms helplessness into agency. People who feel useful cope dramatically better. You also addressed the concern rationally.",
      },
    ],
  },
  {
    npcText: "I... I'm trying to stay calm but I keep seeing the water in my head. What if it comes back? What if this happens again?",
    npcEmoji: '😟',
    options: [
      {
        text: "Just stop thinking about it. Worrying about the future is pointless.",
        type: 'aggressive',
        panicChange: 8,
        feedback: "Telling someone to 'just stop' thinking intrusive thoughts is impossible and dismissive. Trauma responses need acknowledgment, not suppression.",
      },
      {
        text: "It probably WILL happen again. Climate change means more floods every year...",
        type: 'fearful',
        panicChange: 12,
        feedback: "While factually possible, feeding future catastrophe thinking during acute stress deepens trauma. There's a time for preparedness talk — acute crisis isn't it.",
      },
      {
        text: "It makes sense your mind keeps replaying it — that's normal after something scary. Right now, we're safe here. Let's focus on what we can control today.",
        type: 'calm',
        panicChange: -15,
        feedback: "Normalizing trauma responses reduces shame. Gently redirecting to the present and controllable factors is a core principle of Psychological First Aid (PFA).",
      },
    ],
  },
  {
    npcText: "I just want to go home... I left my cat inside. She's probably scared... she's probably drowned... *starts sobbing*",
    npcEmoji: '\u{1F622}',
    options: [
      { text: "It's just a cat. People are dying here and you're worried about a pet?!", type: 'aggressive', panicChange: 12, feedback: "Dismissing someone's attachment to a pet is cruel and counterproductive. Pets are family. This comment destroys trust and increases isolation." },
      { text: "Your poor cat! Animals suffer so much in floods! So many pets die in disasters!", type: 'fearful', panicChange: 10, feedback: "Amplifying grief with more tragic details is harmful. They need comfort and a small hope, not confirmation of the worst outcome." },
      { text: "Your cat matters to you. Many pets survive floods \u2014 they find high spots. When it's safe, we'll check. Can you tell me your cat's name?", type: 'calm', panicChange: -15, feedback: "Validating the emotional bond, providing realistic hope, and asking a personal question (the cat's name) redirects focus from catastrophic thinking to connection and future planning." },
    ],
  },
  {
    npcText: "What if there's another wave? What if this shelter floods too? I keep hearing rumbling... is that more water coming?!",
    npcEmoji: '\u{1F628}',
    options: [
      { text: "Would you STOP with the what-ifs?! You're making everyone anxious!", type: 'aggressive', panicChange: 12, feedback: "Public shaming increases panic exponentially. Now they're scared of the flood AND of being judged. Their anxiety becomes a social performance that's harder to manage." },
      { text: "Oh no, what if you're right?! Should we move higher? Maybe this shelter isn't safe!", type: 'fearful', panicChange: 18, feedback: "Validating unfounded fears without evidence can trigger group panic. One fearful person can become 50 if fear is amplified and acted on without facts." },
      { text: "That rumbling is thunder, not water \u2014 I've been listening too. This shelter is on high ground. Can you help me check our supplies? Having a task helps.", type: 'calm', panicChange: -15, feedback: "Address the specific fear with facts (thunder vs water), provide environmental reassurance (high ground), and give them a productive task. Active people panic less." },
    ],
  },
  {
    npcText: "Why should I listen to you anyway?! You're not a rescue worker! You don't know what you're doing! NOBODY knows what they're doing!",
    npcEmoji: '\u{1F621}',
    options: [
      { text: "FINE! Do whatever you want! See if I care when you get yourself killed!", type: 'aggressive', panicChange: 15, feedback: "Abandoning someone in crisis is the worst possible response. Their anger is actually fear in disguise. Walking away confirms their deepest fear \u2014 that no one will help them." },
      { text: "You're right... I don't really know what I'm doing either. I'm scared too...", type: 'fearful', panicChange: 10, feedback: "While honesty about fear can sometimes build connection, admitting total incompetence removes their last anchor of perceived safety. They need to believe SOMEONE has a plan." },
      { text: "You're right, I'm not a professional. But I'm here, and I'm not leaving. We're figuring this out together. What do you think we should do first?", type: 'calm', panicChange: -15, feedback: "Acknowledging their point without defensiveness, affirming your presence, and inviting collaboration converts their anger into agency. People who feel heard and included calm down." },
    ],
  },
]

const PANIC_START = 145   // Starting BPM (elevated heart rate)
const PANIC_FAIL = 180    // BPM threshold — cardiac danger
const PANIC_WIN = 95      // Below 100 BPM = calm

export default function Module13_CalmMind() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro')
  const [round, setRound] = useState(0)
  const [panic, setPanic] = useState(PANIC_START)
  const [feedback, setFeedback] = useState(null)
  const [result, setResult] = useState(null)
  const [calmCount, setCalmCount] = useState(0)

  const handleChoice = useCallback((option) => {
    // Prevent clicks while feedback is showing
    if (feedback) return

    const newPanic = Math.max(60, Math.min(PANIC_FAIL, panic + option.panicChange))
    setPanic(newPanic)
    if (option.type === 'calm') setCalmCount(c => c + 1)

    setFeedback({
      text: option.feedback,
      type: option.type,
    })

    // Check end conditions after short delay
    setTimeout(() => {
      if (newPanic >= PANIC_FAIL) {
        const r = { score: 10, passed: false, reason: 'panic_max' }
        setResult(r)
        setPhase('result')
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-13', result: r } })
      } else if (newPanic <= PANIC_WIN) {
        const score = Math.round(((PANIC_START - newPanic) / (PANIC_START - 60)) * 100)
        const r = { score: Math.max(score, 70), passed: true, reason: 'calm' }
        setResult(r)
        setPhase('result')
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-13', result: r } })
      } else if (round >= DIALOGUE_ROUNDS.length - 1) {
        // Out of rounds — score based on final panic (below 120 BPM is manageable)
        const midpoint = Math.round((PANIC_WIN + PANIC_FAIL) / 2)
        const score = newPanic <= midpoint ? Math.round(((PANIC_FAIL - newPanic) / (PANIC_FAIL - 60)) * 100) : 30
        const passed = newPanic <= midpoint
        const r = { score, passed, reason: passed ? 'manageable' : 'too_panicked' }
        setResult(r)
        setPhase('result')
        dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-13', result: r } })
      } else {
        setFeedback(null)
        setRound(r => r + 1)
      }
    }, 3000)
  }, [panic, round, feedback, dispatch])

  const resetGame = () => {
    setPhase('intro')
    setRound(0)
    setPanic(PANIC_START)
    setFeedback(null)
    setResult(null)
    setCalmCount(0)
  }

  // Safely get current dialogue (guard against out-of-bounds round)
  const currentDialogue = round < DIALOGUE_ROUNDS.length ? DIALOGUE_ROUNDS[round] : null

  // useMemo must be called unconditionally (React rules of hooks)
  const shuffledOptions = useMemo(
    () => {
      const d = round < DIALOGUE_ROUNDS.length ? DIALOGUE_ROUNDS[round] : null
      return d ? shuffleArray(d.options) : []
    },
    [round]
  )

  // Handle the out-of-rounds edge case in useEffect (NOT during render)
  useEffect(() => {
    if (phase !== 'play' || currentDialogue !== null || result !== null) return
    const midpoint = Math.round((PANIC_WIN + PANIC_FAIL) / 2)
    const score = panic <= midpoint ? Math.round(((PANIC_FAIL - panic) / (PANIC_FAIL - 60)) * 100) : 30
    const passed = panic <= midpoint
    const r = { score, passed, reason: passed ? 'manageable' : 'too_panicked' }
    setResult(r)
    setPhase('result')
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-13', result: r } })
  }, [phase, currentDialogue, result, panic, dispatch])

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>🧠😰</div>
          <h1 style={styles.title}>Module 13: Calm Mind</h1>
          <p style={styles.text}>
            A fellow flood survivor is having a severe panic attack. They're about to run into
            dangerous floodwater. You need to use <strong style={{ color: '#38bdf8' }}>Psychological First Aid</strong> to
            de-escalate them.
          </p>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 8, margin: '12px 0' }}>
            <p style={{ ...styles.text, color: '#fbbf24', margin: 0 }}>
              <strong>PANIC BPM</strong> starts at {PANIC_START} BPM (elevated heart rate).
            </p>
            <p style={{ ...styles.text, color: '#4ade80', margin: '4px 0' }}>
              Get it BELOW {PANIC_WIN} BPM to succeed.
            </p>
            <p style={{ ...styles.text, color: '#f87171', margin: '4px 0' }}>
              If it hits {PANIC_FAIL} BPM, they run into danger.
            </p>
          </div>
          <p style={{ ...styles.text, fontSize: 13, color: '#94a3b8' }}>
            Choose your words carefully. Calm, task-oriented responses work best.
          </p>
          <button style={styles.startBtn} onClick={() => setPhase('play')}>
            🤝 Begin Conversation
          </button>
        </div>
      </div>
    )
  }

  // ── RESULT ──
  if (phase === 'result' && result) {
    return (
      <div style={styles.container}>
        <div style={styles.introBox}>
          <div style={{ fontSize: 64 }}>
            {result.passed ? '🤝✅' : '😱❌'}
          </div>
          <h1 style={{ ...styles.title, color: result.passed ? '#4ade80' : '#f87171' }}>
            {result.passed
              ? result.reason === 'calm' ? 'SURVIVOR CALMED' : 'PANIC MANAGEABLE'
              : result.reason === 'panic_max' ? 'SURVIVOR RAN INTO DANGER' : 'COULD NOT DE-ESCALATE'
            }
          </h1>
          <div style={{ fontSize: 48, color: '#38bdf8', margin: '12px 0' }}>{result.score}%</div>
          <p style={styles.text}>
            {result.passed
              ? 'You successfully used psychological first aid to help a panicking survivor. Your calm, task-oriented approach gave them an anchor.'
              : 'The survivor panicked beyond control. Aggressive or fear-amplifying responses made things worse.'}
          </p>
          <div style={{ ...styles.text, background: '#1e293b', padding: 16, borderRadius: 8, marginTop: 12 }}>
            <strong style={{ color: '#fbbf24' }}>PSYCHOLOGICAL FIRST AID PRINCIPLES:</strong>
            <ul style={{ textAlign: 'left', color: '#cbd5e1', lineHeight: 1.8 }}>
              <li><strong style={{ color: '#4ade80' }}>Acknowledge</strong> — Validate their feelings without judgment</li>
              <li><strong style={{ color: '#4ade80' }}>Ground</strong> — Use breathing, counting, or physical sensations</li>
              <li><strong style={{ color: '#4ade80' }}>Redirect</strong> — Give purposeful tasks to create agency</li>
              <li><strong style={{ color: '#f87171' }}>Never</strong> say "calm down" — it invalidates and escalates</li>
              <li><strong style={{ color: '#f87171' }}>Never</strong> amplify catastrophic thinking</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            <button style={styles.startBtn} onClick={resetGame}>🔄 Retry</button>
            <button style={{ ...styles.startBtn, background: '#6366f1' }} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              📋 Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PLAY ──
  // Guard: if round is out of bounds, useEffect above handles transition
  if (!currentDialogue) return null

  const panicColor = panic >= 160 ? '#ef4444' : panic >= 120 ? '#f59e0b' : '#22c55e'

  return (
    <div style={styles.container}>
      {/* Panic Meter */}
      <div style={styles.meterContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: 14 }}>
            💓 PANIC BPM
          </span>
          <span style={{ color: panicColor, fontWeight: 'bold', fontSize: 14 }}>
            {panic} BPM
          </span>
        </div>
        <div style={styles.meterTrack}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, ((panic - 60) / (PANIC_FAIL - 60)) * 100))}%`,
            background: panic >= 160
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : panic >= 120
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #22c55e, #16a34a)',
            borderRadius: 8,
            transition: 'width 0.5s ease, background 0.5s ease',
          }} />
          {/* Threshold markers */}
          <div style={{ position: 'absolute', left: `${((PANIC_WIN - 60) / (PANIC_FAIL - 60)) * 100}%`, top: -16, fontSize: 10, color: '#4ade80' }}>
            ✅ {PANIC_WIN}
          </div>
          <div style={{ position: 'absolute', left: '96%', top: -16, fontSize: 10, color: '#f87171' }}>
            ☠️ {PANIC_FAIL}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: '#4ade80' }}>CALM</span>
          <span style={{ fontSize: 11, color: '#f87171' }}>DANGER</span>
        </div>
      </div>

      {/* Round indicator */}
      <div style={{ color: '#64748b', fontSize: 12, margin: '8px 0' }}>
        Round {round + 1} / {DIALOGUE_ROUNDS.length}
      </div>

      {/* NPC */}
      <div style={styles.npcSection}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{currentDialogue.npcEmoji}</div>
        <div style={styles.speechBubble}>
          <div style={{ fontSize: 14, color: '#f1f5f9', lineHeight: 1.6 }}>
            "{currentDialogue.npcText}"
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          ...styles.feedbackBox,
          borderColor: feedback.type === 'calm' ? '#4ade80' : feedback.type === 'aggressive' ? '#f87171' : '#f59e0b',
          background: feedback.type === 'calm' ? 'rgba(74,222,128,0.1)' : feedback.type === 'aggressive' ? 'rgba(248,113,113,0.1)' : 'rgba(245,158,11,0.1)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', color: feedback.type === 'calm' ? '#4ade80' : feedback.type === 'aggressive' ? '#f87171' : '#f59e0b', marginBottom: 4 }}>
            {feedback.type === 'calm' ? '✅ GOOD RESPONSE' : feedback.type === 'aggressive' ? '❌ AGGRESSIVE — ESCALATES PANIC' : '⚠️ FEARFUL — AMPLIFIES PANIC'}
          </div>
          <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{feedback.text}</div>
        </div>
      )}

      {/* Response Options */}
      {!feedback && (
        <div style={styles.optionsContainer}>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
            Choose your response:
          </div>
          {shuffledOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleChoice(opt)}
              style={{
                ...styles.optionBtn,
                borderColor: i === 0 ? '#f87171' : i === 1 ? '#f59e0b' : '#4ade80',
              }}
            >
              <div style={{ fontSize: 14, color: '#f1f5f9' }}>"{opt.text}"</div>
            </button>
          ))}
        </div>
      )}
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
    padding: 16,
    fontFamily: 'system-ui, sans-serif',
  },
  introBox: {
    maxWidth: 600,
    background: '#1e293b',
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    marginTop: 40,
    border: '1px solid #334155',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 28,
    margin: '12px 0',
  },
  text: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 1.6,
    margin: '10px 0',
  },
  startBtn: {
    padding: '14px 36px',
    fontSize: 18,
    fontWeight: 'bold',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 16,
  },
  meterContainer: {
    width: '100%',
    maxWidth: 500,
    padding: '12px 16px',
    background: '#1e293b',
    borderRadius: 12,
    position: 'relative',
  },
  meterTrack: {
    width: '100%',
    height: 20,
    background: '#0f172a',
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  npcSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    maxWidth: 500,
  },
  speechBubble: {
    background: '#334155',
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    maxWidth: '100%',
    border: '1px solid #475569',
  },
  optionsContainer: {
    width: '100%',
    maxWidth: 500,
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  optionBtn: {
    background: '#1e293b',
    border: '2px solid #475569',
    borderRadius: 12,
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  feedbackBox: {
    width: '100%',
    maxWidth: 500,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    border: '2px solid',
  },
}
