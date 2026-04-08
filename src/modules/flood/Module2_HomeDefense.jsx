import { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../../context/GameContext'

/* ─── constants ─── */
const MONO = "'Courier New', Courier, monospace"
const COL_BG = '#0f172a'
const COL_PANEL = '#1e293b'
const COL_TEXT = '#f1f5f9'
const COL_BLUE = '#3b82f6'
const COL_BLUE_DIM = '#1e3a5f'
const COL_GREEN = '#22c55e'
const COL_RED = '#ef4444'
const COL_AMBER = '#f59e0b'
const COL_SAND = '#d4a24e'

const GRID_COLS = 7
const GRID_ROWS = 5
const SANDBAG_COST = 15
const SANDBAG_TIME = 3
const SEAL_COST = 40
const SEAL_TIME = 8
const STARTING_BUDGET = 500
const STARTING_TIME = 120

/* ─── helpers ─── */
function createEmptyGrid() {
  return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(false))
}

function validatePyramid(matrix) {
  const rowCounts = matrix.map(row => row.filter(Boolean).length)
  const totalBags = rowCounts.reduce((a, b) => a + b, 0)
  if (totalBags === 0) return { valid: false, reason: 'NO_BAGS' }

  /* Check for single vertical column: every placed bag is in the same column(s)
     and total width is 1 */
  const filledCols = new Set()
  matrix.forEach(row => row.forEach((v, c) => { if (v) filledCols.add(c) }))
  if (filledCols.size <= 1 && totalBags > 1) {
    return { valid: false, reason: 'VERTICAL' }
  }

  /* Each row (from top=0 to bottom=GRID_ROWS-1) must have count <= row below.
     Bottom row is matrix[GRID_ROWS-1]. We iterate top-down, so row i must
     have count <= row i+1 for i < GRID_ROWS-1. Also disallow equal non-zero
     counts all the way (i.e. a rectangle is not a pyramid). */
  let allEqual = true
  for (let r = 0; r < GRID_ROWS - 1; r++) {
    if (rowCounts[r] > 0 && rowCounts[r] > rowCounts[r + 1]) {
      return { valid: false, reason: 'VERTICAL' }
    }
    if (rowCounts[r] !== rowCounts[r + 1]) allEqual = false
  }

  /* If every non-zero row has the same count and there are more than 1 row
     with bags, it's a rectangle which also fails pyramid check */
  const nonZeroRows = rowCounts.filter(c => c > 0)
  if (nonZeroRows.length > 1 && allEqual) {
    return { valid: false, reason: 'VERTICAL' }
  }

  /* Bottom row (highest index) must be the widest row with bags */
  const maxCount = Math.max(...rowCounts)
  if (rowCounts[GRID_ROWS - 1] !== maxCount) {
    return { valid: false, reason: 'VERTICAL' }
  }

  return { valid: true, reason: null }
}

/* ─── component ─── */
export default function Module2_HomeDefense() {
  const { dispatch } = useGame()

  const [phase, setPhase] = useState('intro') // intro | build | simulate | result
  const [budget, setBudget] = useState(STARTING_BUDGET)
  const [timeLeft, setTimeLeft] = useState(STARTING_TIME)
  const [sandbagMatrix, setSandbagMatrix] = useState(createEmptyGrid)
  const [drainSeals, setDrainSeals] = useState({ toilet_1: false, toilet_2: false, shower: false })
  const [resultMsg, setResultMsg] = useState(null)
  const [resultPassed, setResultPassed] = useState(false)
  const [simStep, setSimStep] = useState(0)
  const [simMessages, setSimMessages] = useState([])
  const timerRef = useRef(null)

  /* countdown during build phase */
  useEffect(() => {
    if (phase !== 'build') return
    if (timeLeft <= 0) {
      setPhase('simulate')
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setPhase('simulate')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, timeLeft <= 0])

  /* spend time helper */
  const spendTime = useCallback((seconds) => {
    setTimeLeft(t => Math.max(0, t - seconds))
  }, [])

  /* place a sandbag */
  const placeSandbag = useCallback((row, col) => {
    if (phase !== 'build') return
    if (budget < SANDBAG_COST) return
    if (timeLeft < SANDBAG_TIME) return
    setSandbagMatrix(prev => {
      if (prev[row][col]) return prev
      const next = prev.map(r => [...r])
      next[row][col] = true
      return next
    })
    setBudget(b => b - SANDBAG_COST)
    spendTime(SANDBAG_TIME)
  }, [phase, budget, timeLeft, spendTime])

  /* remove a sandbag */
  const removeSandbag = useCallback((row, col) => {
    if (phase !== 'build') return
    setSandbagMatrix(prev => {
      if (!prev[row][col]) return prev
      const next = prev.map(r => [...r])
      next[row][col] = false
      return next
    })
    setBudget(b => b + SANDBAG_COST) // refund
  }, [phase])

  /* seal a drain */
  const sealDrain = useCallback((key) => {
    if (phase !== 'build') return
    if (drainSeals[key]) return
    if (budget < SEAL_COST) return
    if (timeLeft < SEAL_TIME) return
    setDrainSeals(prev => ({ ...prev, [key]: true }))
    setBudget(b => b - SEAL_COST)
    spendTime(SEAL_TIME)
  }, [phase, budget, timeLeft, drainSeals])

  /* simulate flood check */
  const runSimulation = useCallback(() => {
    setPhase('simulate')
    clearInterval(timerRef.current)
    setSimStep(0)
    setSimMessages([])

    const steps = []
    const totalBags = sandbagMatrix.flat().filter(Boolean).length

    /* Step 1: wall check */
    steps.push({ delay: 800, msg: '>> Analyzing sandbag formation...' })
    const pyramidResult = validatePyramid(sandbagMatrix)

    if (totalBags === 0) {
      steps.push({ delay: 1200, msg: '[CRITICAL] No sandbags placed. No flood barrier exists.', fail: true })
      steps.push({
        delay: 1800,
        msg: 'RESULT: TOTAL FAILURE -- No defenses deployed.',
        final: true,
        passed: false,
        score: 0
      })
    } else if (!pyramidResult.valid) {
      steps.push({
        delay: 1200,
        msg: '[FAIL] WALL COLLAPSED -- single column has no lateral support.',
        fail: true
      })
      steps.push({
        delay: 1800,
        msg: 'Sandbags must form an interlocking pyramid (1:3 ratio). Wide base tapering upward.',
        fail: true
      })
      steps.push({
        delay: 2400,
        msg: 'RESULT: STRUCTURAL FAILURE -- Score 10/100',
        final: true,
        passed: false,
        score: 10
      })
    } else {
      steps.push({ delay: 1200, msg: '[OK] Sandbag pyramid validated. Lateral support confirmed.' })

      /* Step 2: drain check */
      steps.push({ delay: 2000, msg: '>> Checking drain seals against hydrostatic backflow...' })
      const allSealed = drainSeals.toilet_1 && drainSeals.toilet_2 && drainSeals.shower
      const sealCount = [drainSeals.toilet_1, drainSeals.toilet_2, drainSeals.shower].filter(Boolean).length

      if (!allSealed) {
        const unsealed = []
        if (!drainSeals.toilet_1) unsealed.push('Toilet #1')
        if (!drainSeals.toilet_2) unsealed.push('Toilet #2')
        if (!drainSeals.shower) unsealed.push('Shower')
        steps.push({
          delay: 2600,
          msg: `[FAIL] SEWAGE BACKFLOW -- hydrostatic pressure pushed raw sewage up through unsealed drains: ${unsealed.join(', ')}`,
          fail: true
        })
        steps.push({
          delay: 3200,
          msg: 'Even a perfect sandbag wall cannot stop water from rising through the plumbing system.',
          fail: true
        })
        const partialScore = 25 + sealCount * 10
        steps.push({
          delay: 3800,
          msg: `RESULT: CONTAMINATION FAILURE -- Score ${partialScore}/100`,
          final: true,
          passed: false,
          score: partialScore
        })
      } else {
        steps.push({ delay: 2600, msg: '[OK] All drain seals verified. Backflow prevention active.' })
        steps.push({ delay: 3200, msg: '>> Running full hydrostatic pressure simulation...' })
        steps.push({ delay: 3800, msg: '[OK] Foundation holding. Pressure distributed across pyramid base.' })
        steps.push({ delay: 4200, msg: '[OK] Sewer lines sealed. No backflow detected.' })

        /* compute score based on remaining budget and time */
        const budgetBonus = Math.round((budget / STARTING_BUDGET) * 15)
        const timeBonus = Math.round((timeLeft / STARTING_TIME) * 10)
        const bagBonus = Math.min(15, totalBags)
        const finalScore = Math.min(100, 60 + budgetBonus + timeBonus + bagBonus)

        steps.push({
          delay: 4800,
          msg: `RESULT: HOME DEFENDED SUCCESSFULLY -- Score ${finalScore}/100`,
          final: true,
          passed: true,
          score: finalScore
        })
      }
    }

    /* play steps with delays */
    let accumulated = 0
    steps.forEach((step, i) => {
      accumulated = step.delay
      setTimeout(() => {
        setSimMessages(prev => [...prev, step])
        setSimStep(i + 1)
        if (step.final) {
          setResultPassed(step.passed)
          setResultMsg(step.msg)
          setTimeout(() => {
            setPhase('result')
            dispatch({
              type: 'RECORD_SCORE',
              payload: { key: 'flood-2', result: { score: step.score, passed: step.passed } }
            })
          }, 1200)
        }
      }, accumulated)
    })
  }, [sandbagMatrix, drainSeals, budget, timeLeft, dispatch])

  /* full reset */
  const resetAll = useCallback(() => {
    setBudget(STARTING_BUDGET)
    setTimeLeft(STARTING_TIME)
    setSandbagMatrix(createEmptyGrid())
    setDrainSeals({ toilet_1: false, toilet_2: false, shower: false })
    setResultMsg(null)
    setResultPassed(false)
    setSimStep(0)
    setSimMessages([])
    setPhase('intro')
  }, [])

  /* ─── styles ─── */
  const containerStyle = {
    minHeight: '100vh',
    background: COL_BG,
    color: COL_TEXT,
    fontFamily: MONO,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden'
  }

  const panelStyle = {
    background: COL_PANEL,
    border: `1px solid ${COL_BLUE_DIM}`,
    borderRadius: 4,
    padding: '16px',
    marginBottom: '12px'
  }

  const btnStyle = (color = COL_BLUE, disabled = false) => ({
    padding: '10px 22px',
    background: disabled ? '#1e293b' : `${color}22`,
    color: disabled ? '#475569' : color,
    border: `1px solid ${disabled ? '#334155' : color}`,
    borderRadius: 4,
    fontFamily: MONO,
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: 1,
    textTransform: 'uppercase',
    transition: 'all 0.2s'
  })

  const bagCount = sandbagMatrix.flat().filter(Boolean).length
  const sealCount = [drainSeals.toilet_1, drainSeals.toilet_2, drainSeals.shower].filter(Boolean).length

  /* ─── INTRO PHASE ─── */
  if (phase === 'intro') {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 40, height: 40, border: `2px solid ${COL_BLUE}`, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: COL_BLUE, fontWeight: 700
            }}>02</div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COL_BLUE, letterSpacing: 2 }}>
                MODULE 2: HOME DEFENSE
              </div>
              <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1 }}>
                HYDROSTATIC PRESSURE & RISK BUDGETING
              </div>
            </div>
          </div>

          {/* Blueprint-style briefing */}
          <div style={{ ...panelStyle, borderColor: COL_BLUE }}>
            <div style={{ fontSize: 11, color: COL_BLUE, letterSpacing: 2, marginBottom: 12, borderBottom: `1px solid ${COL_BLUE_DIM}`, paddingBottom: 8 }}>
              // MISSION BRIEFING
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#94a3b8' }}>
              A Category 3 hurricane is approaching. You have <span style={{ color: COL_AMBER, fontWeight: 700 }}>$500</span> and{' '}
              <span style={{ color: COL_AMBER, fontWeight: 700 }}>120 seconds</span> before landfall.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#94a3b8', marginTop: 8 }}>
              Your objectives:
            </div>
            <ul style={{ fontSize: 12, lineHeight: 2, color: '#94a3b8', paddingLeft: 20, margin: '8px 0' }}>
              <li>Build a sandbag wall around your home foundation (${SANDBAG_COST}/bag, {SANDBAG_TIME}s each)</li>
              <li>Seal all three drain points against sewage backflow (${SEAL_COST}/seal, {SEAL_TIME}s each)</li>
              <li>Sandbags MUST form an interlocking pyramid -- wide base tapering up</li>
            </ul>

            <div style={{
              marginTop: 16, padding: 12, background: '#1a0a0a',
              border: `1px solid ${COL_RED}44`, borderRadius: 4
            }}>
              <div style={{ fontSize: 11, color: COL_RED, letterSpacing: 1, marginBottom: 6 }}>
                // PROFESSOR'S WARNING
              </div>
              <div style={{ fontSize: 12, color: '#f87171', lineHeight: 1.7 }}>
                A single vertical line of sandbags WILL collapse -- no lateral support.
                You must validate a 1:3 interlocking pyramid ratio. And even a perfect
                wall without drain seals will allow hydrostatic pressure to push raw
                sewage up through your plumbing.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              style={btnStyle(COL_GREEN)}
              onClick={() => setPhase('build')}
            >
              Begin Preparation
            </button>
            <button
              style={btnStyle('#94a3b8')}
              onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
            >
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── BUILD / SIMULATE / RESULT PHASES ─── */
  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 900, width: '100%' }}>

        {/* ─── TOP BAR: status ─── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '10px 16px',
          background: COL_PANEL, border: `1px solid ${COL_BLUE_DIM}`, borderRadius: 4
        }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: COL_BLUE, fontWeight: 700, letterSpacing: 2 }}>
              HOME DEFENSE
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              PHASE: <span style={{ color: COL_AMBER, fontWeight: 700 }}>
                {phase === 'build' ? 'PREPARATION' : phase === 'simulate' ? 'SIMULATION' : 'RESULTS'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>BUDGET: </span>
              <span style={{ color: budget < 50 ? COL_RED : COL_GREEN, fontWeight: 700 }}>${budget}</span>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>TIME: </span>
              <span style={{
                color: timeLeft < 20 ? COL_RED : timeLeft < 40 ? COL_AMBER : COL_TEXT,
                fontWeight: 700
              }}>
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* ─── MAIN LAYOUT ─── */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

          {/* ─── LEFT: Blueprint Cross-Section ─── */}
          <div style={{ flex: '1 1 540px', ...panelStyle }}>
            <div style={{ fontSize: 10, color: COL_BLUE, letterSpacing: 2, marginBottom: 10 }}>
              // CROSS-SECTION VIEW -- SCALE 1:50
            </div>

            <svg viewBox="0 0 540 380" style={{
              width: '100%', background: '#080e1a',
              border: `1px solid ${COL_BLUE_DIM}`, borderRadius: 4
            }}>
              {/* Grid lines */}
              {Array.from({ length: 28 }, (_, i) => (
                <line key={`vg${i}`} x1={i * 20} y1={0} x2={i * 20} y2={380}
                  stroke={COL_BLUE} strokeOpacity={0.08} strokeWidth={0.5} />
              ))}
              {Array.from({ length: 20 }, (_, i) => (
                <line key={`hg${i}`} x1={0} y1={i * 20} x2={540} y2={i * 20}
                  stroke={COL_BLUE} strokeOpacity={0.08} strokeWidth={0.5} />
              ))}

              {/* Ground line */}
              <line x1={0} y1={220} x2={540} y2={220}
                stroke={COL_BLUE} strokeWidth={2} strokeDasharray="8,4" />
              <text x={8} y={215} fill={COL_BLUE} fontSize={8} fontFamily={MONO} opacity={0.6}>
                GROUND LEVEL
              </text>

              {/* Foundation / basement */}
              <rect x={120} y={220} width={300} height={80}
                fill="none" stroke={COL_BLUE} strokeWidth={1.5} />
              <text x={130} y={238} fill={COL_BLUE} fontSize={8} fontFamily={MONO} opacity={0.5}>
                FOUNDATION
              </text>
              {/* Foundation hatch lines */}
              {Array.from({ length: 12 }, (_, i) => (
                <line key={`fh${i}`}
                  x1={120 + i * 26} y1={220} x2={120 + i * 26 + 20} y2={300}
                  stroke={COL_BLUE} strokeOpacity={0.12} strokeWidth={0.5} />
              ))}

              {/* Ground floor */}
              <rect x={120} y={120} width={300} height={100}
                fill="none" stroke={COL_BLUE} strokeWidth={1.5} />
              <text x={130} y={138} fill={COL_BLUE} fontSize={8} fontFamily={MONO} opacity={0.5}>
                GROUND FLOOR
              </text>

              {/* Upper floor */}
              <rect x={120} y={40} width={300} height={80}
                fill="none" stroke={COL_BLUE} strokeWidth={1.5} />
              <text x={130} y={58} fill={COL_BLUE} fontSize={8} fontFamily={MONO} opacity={0.5}>
                UPPER FLOOR
              </text>

              {/* Roof */}
              <polygon points="110,40 270,8 430,40"
                fill="none" stroke={COL_BLUE} strokeWidth={1.5} />

              {/* Toilet 1 */}
              <rect x={160} y={180} width={30} height={30}
                fill={drainSeals.toilet_1 ? `${COL_GREEN}33` : `${COL_RED}22`}
                stroke={drainSeals.toilet_1 ? COL_GREEN : COL_RED}
                strokeWidth={1.5} strokeDasharray={drainSeals.toilet_1 ? 'none' : '3,2'} />
              <text x={163} y={198} fill={drainSeals.toilet_1 ? COL_GREEN : COL_RED}
                fontSize={7} fontFamily={MONO} fontWeight={700}>WC1</text>
              {drainSeals.toilet_1 && (
                <text x={165} y={207} fill={COL_GREEN} fontSize={7} fontFamily={MONO}>SEAL</text>
              )}
              {/* Pipe from toilet to foundation */}
              <line x1={175} y1={210} x2={175} y2={300}
                stroke={COL_BLUE} strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.4} />

              {/* Toilet 2 */}
              <rect x={250} y={180} width={30} height={30}
                fill={drainSeals.toilet_2 ? `${COL_GREEN}33` : `${COL_RED}22`}
                stroke={drainSeals.toilet_2 ? COL_GREEN : COL_RED}
                strokeWidth={1.5} strokeDasharray={drainSeals.toilet_2 ? 'none' : '3,2'} />
              <text x={253} y={198} fill={drainSeals.toilet_2 ? COL_GREEN : COL_RED}
                fontSize={7} fontFamily={MONO} fontWeight={700}>WC2</text>
              {drainSeals.toilet_2 && (
                <text x={255} y={207} fill={COL_GREEN} fontSize={7} fontFamily={MONO}>SEAL</text>
              )}
              <line x1={265} y1={210} x2={265} y2={300}
                stroke={COL_BLUE} strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.4} />

              {/* Shower */}
              <rect x={340} y={180} width={35} height={30}
                fill={drainSeals.shower ? `${COL_GREEN}33` : `${COL_RED}22`}
                stroke={drainSeals.shower ? COL_GREEN : COL_RED}
                strokeWidth={1.5} strokeDasharray={drainSeals.shower ? 'none' : '3,2'} />
              <text x={343} y={198} fill={drainSeals.shower ? COL_GREEN : COL_RED}
                fontSize={7} fontFamily={MONO} fontWeight={700}>SHW</text>
              {drainSeals.shower && (
                <text x={345} y={207} fill={COL_GREEN} fontSize={7} fontFamily={MONO}>SEAL</text>
              )}
              <line x1={357} y1={210} x2={357} y2={300}
                stroke={COL_BLUE} strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.4} />

              {/* Sewer main */}
              <line x1={140} y1={295} x2={400} y2={295}
                stroke={COL_BLUE} strokeWidth={2} strokeOpacity={0.3} />
              <text x={410} y={298} fill={COL_BLUE} fontSize={7} fontFamily={MONO} opacity={0.4}>
                SEWER MAIN
              </text>

              {/* Sandbag wall area -- left side of house */}
              <rect x={30} y={220} width={(GRID_COLS * 12 + 4)} height={(GRID_ROWS * 12 + 4)}
                fill="none" stroke={COL_SAND} strokeWidth={1} strokeDasharray="4,2" strokeOpacity={0.5} />
              <text x={30} y={216} fill={COL_SAND} fontSize={7} fontFamily={MONO} opacity={0.7}>
                SANDBAG ZONE
              </text>

              {/* Render placed sandbags in blueprint */}
              {sandbagMatrix.map((row, r) =>
                row.map((placed, c) => placed ? (
                  <rect key={`sb${r}-${c}`}
                    x={32 + c * 12} y={222 + r * 12} width={10} height={10}
                    fill={`${COL_SAND}66`} stroke={COL_SAND} strokeWidth={0.8} />
                ) : null)
              )}

              {/* Sandbag wall area -- right side of house */}
              <rect x={(540 - 30 - GRID_COLS * 12 - 4)} y={220}
                width={(GRID_COLS * 12 + 4)} height={(GRID_ROWS * 12 + 4)}
                fill="none" stroke={COL_SAND} strokeWidth={1} strokeDasharray="4,2" strokeOpacity={0.5} />
              <text x={(540 - 30 - GRID_COLS * 12 - 4)} y={216}
                fill={COL_SAND} fontSize={7} fontFamily={MONO} opacity={0.7}>
                SANDBAG ZONE
              </text>

              {/* Mirror sandbags on right */}
              {sandbagMatrix.map((row, r) =>
                row.map((placed, c) => placed ? (
                  <rect key={`sbr${r}-${c}`}
                    x={(540 - 30 - GRID_COLS * 12 - 2) + c * 12} y={222 + r * 12}
                    width={10} height={10}
                    fill={`${COL_SAND}66`} stroke={COL_SAND} strokeWidth={0.8} />
                ) : null)
              )}

              {/* Flood water indicator during sim */}
              {(phase === 'simulate' || phase === 'result') && (
                <rect x={0} y={260} width={540} height={120}
                  fill={COL_BLUE} fillOpacity={0.1} />
              )}
              {(phase === 'simulate' || phase === 'result') && (
                <text x={460} y={340} fill={COL_BLUE} fontSize={8} fontFamily={MONO} opacity={0.5}>
                  FLOOD WATER
                </text>
              )}

              {/* Dimension lines */}
              <line x1={108} y1={40} x2={108} y2={300} stroke={COL_BLUE} strokeWidth={0.5} strokeOpacity={0.3} />
              <text x={100} y={170} fill={COL_BLUE} fontSize={7} fontFamily={MONO} opacity={0.3}
                transform="rotate(-90,100,170)">26 ft</text>

              {/* Title block */}
              <rect x={400} y={350} width={132} height={24}
                fill="none" stroke={COL_BLUE} strokeWidth={0.5} strokeOpacity={0.3} />
              <text x={408} y={364} fill={COL_BLUE} fontSize={7} fontFamily={MONO} opacity={0.4}>
                DWG: HD-002 REV.A
              </text>
            </svg>
          </div>

          {/* ─── RIGHT: Controls ─── */}
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Sandbag placement grid */}
            {phase === 'build' && (
              <div style={panelStyle}>
                <div style={{ fontSize: 10, color: COL_SAND, letterSpacing: 2, marginBottom: 8 }}>
                  // SANDBAG PLACEMENT -- {bagCount} BAGS (${bagCount * SANDBAG_COST})
                </div>
                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 10 }}>
                  Click to place ($15, 3s). Right-click to remove (refund). Build a PYRAMID -- wide base.
                </div>
                <div style={{ fontSize: 9, color: '#475569', marginBottom: 8 }}>
                  ROW 1 (top) ... ROW {GRID_ROWS} (bottom/ground)
                </div>

                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 3,
                  padding: 8, background: '#0a0f1a', borderRadius: 4,
                  border: `1px solid ${COL_BLUE_DIM}`
                }}>
                  {sandbagMatrix.map((row, r) => (
                    <div key={r} style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                      <span style={{
                        fontSize: 8, color: '#334155', width: 16, textAlign: 'right',
                        lineHeight: '28px', fontFamily: MONO
                      }}>
                        {r + 1}
                      </span>
                      {row.map((placed, c) => (
                        <div
                          key={c}
                          onClick={() => !placed && placeSandbag(r, c)}
                          onContextMenu={(e) => { e.preventDefault(); removeSandbag(r, c) }}
                          style={{
                            width: 28, height: 28,
                            background: placed ? `${COL_SAND}44` : '#0f172a',
                            border: `1px solid ${placed ? COL_SAND : '#1e3050'}`,
                            borderRadius: 2,
                            cursor: phase === 'build' ? 'pointer' : 'default',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s',
                            fontSize: 10, color: placed ? COL_SAND : 'transparent'
                          }}
                        >
                          {placed ? '\u2588' : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Pyramid hint */}
                <div style={{
                  marginTop: 8, padding: 6, fontSize: 9, color: '#64748b',
                  background: '#0a0f1a', borderRadius: 3, lineHeight: 1.6,
                  border: `1px solid ${COL_BLUE_DIM}`
                }}>
                  TIP: Bottom row (row {GRID_ROWS}) should be the widest.
                  Each row above must have fewer or equal bags.
                  A single vertical column WILL collapse.
                </div>
              </div>
            )}

            {/* Drain seals */}
            {phase === 'build' && (
              <div style={panelStyle}>
                <div style={{ fontSize: 10, color: COL_GREEN, letterSpacing: 2, marginBottom: 8 }}>
                  // DRAIN SEALS -- {sealCount}/3 SEALED
                </div>
                <div style={{ fontSize: 9, color: '#64748b', marginBottom: 10 }}>
                  Each seal: ${SEAL_COST}, {SEAL_TIME}s install time. ALL three required.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'toilet_1', label: 'Toilet #1 (Ground Floor)', icon: 'WC1' },
                    { key: 'toilet_2', label: 'Toilet #2 (Ground Floor)', icon: 'WC2' },
                    { key: 'shower', label: 'Shower Drain (Ground Floor)', icon: 'SHW' }
                  ].map(drain => (
                    <button
                      key={drain.key}
                      onClick={() => sealDrain(drain.key)}
                      disabled={drainSeals[drain.key] || budget < SEAL_COST || timeLeft < SEAL_TIME}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: drainSeals[drain.key] ? `${COL_GREEN}15` : '#0a0f1a',
                        border: `1px solid ${drainSeals[drain.key] ? COL_GREEN : '#334155'}`,
                        borderRadius: 4,
                        cursor: drainSeals[drain.key] ? 'default' : 'pointer',
                        fontFamily: MONO, fontSize: 11, color: COL_TEXT,
                        textAlign: 'left', width: '100%',
                        opacity: (!drainSeals[drain.key] && (budget < SEAL_COST || timeLeft < SEAL_TIME)) ? 0.4 : 1
                      }}
                    >
                      <span style={{
                        display: 'inline-block', width: 32, height: 20,
                        background: drainSeals[drain.key] ? `${COL_GREEN}33` : `${COL_RED}22`,
                        border: `1px solid ${drainSeals[drain.key] ? COL_GREEN : COL_RED}`,
                        borderRadius: 2, textAlign: 'center', lineHeight: '20px',
                        fontSize: 8, color: drainSeals[drain.key] ? COL_GREEN : COL_RED,
                        fontWeight: 700
                      }}>
                        {drain.icon}
                      </span>
                      <span style={{ flex: 1, fontSize: 10 }}>{drain.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: drainSeals[drain.key] ? COL_GREEN : '#94a3b8'
                      }}>
                        {drainSeals[drain.key] ? 'SEALED' : `$${SEAL_COST}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {phase === 'build' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  style={btnStyle(COL_GREEN)}
                  onClick={runSimulation}
                >
                  Simulate Flood
                </button>
                <button
                  style={btnStyle('#94a3b8')}
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
            )}

            {/* Simulation log */}
            {(phase === 'simulate' || phase === 'result') && (
              <div style={panelStyle}>
                <div style={{ fontSize: 10, color: COL_BLUE, letterSpacing: 2, marginBottom: 10 }}>
                  // SIMULATION LOG
                </div>
                <div style={{
                  background: '#050a12', padding: 12, borderRadius: 4,
                  border: `1px solid ${COL_BLUE_DIM}`,
                  minHeight: 200, maxHeight: 320, overflowY: 'auto',
                  fontFamily: MONO, fontSize: 11, lineHeight: 1.8
                }}>
                  {simMessages.map((msg, i) => (
                    <div key={i} style={{
                      color: msg.fail ? COL_RED : msg.final ? (msg.passed ? COL_GREEN : COL_RED) : '#94a3b8',
                      fontWeight: msg.final ? 700 : 400,
                      borderBottom: msg.final ? `1px solid ${msg.passed ? COL_GREEN : COL_RED}44` : 'none',
                      paddingBottom: msg.final ? 6 : 0,
                      marginBottom: msg.final ? 6 : 2
                    }}>
                      {msg.msg}
                    </div>
                  ))}
                  {phase === 'simulate' && simMessages.length > 0 && !simMessages[simMessages.length - 1]?.final && (
                    <span style={{ color: COL_BLUE, animation: 'blink 1s infinite' }}>_</span>
                  )}
                </div>
              </div>
            )}

            {/* Result panel */}
            {phase === 'result' && (
              <div style={{
                ...panelStyle,
                borderColor: resultPassed ? COL_GREEN : COL_RED,
                background: resultPassed ? `${COL_GREEN}08` : `${COL_RED}08`
              }}>
                <div style={{
                  fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 12,
                  color: resultPassed ? COL_GREEN : COL_RED, textAlign: 'center'
                }}>
                  {resultPassed ? 'HOME DEFENDED' : 'DEFENSE FAILED'}
                </div>

                {/* Stats summary */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16
                }}>
                  <div style={{ padding: 8, background: '#0a0f1a', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1 }}>SANDBAGS</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: COL_SAND }}>{bagCount}</div>
                  </div>
                  <div style={{ padding: 8, background: '#0a0f1a', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1 }}>DRAINS SEALED</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: sealCount === 3 ? COL_GREEN : COL_RED }}>
                      {sealCount}/3
                    </div>
                  </div>
                  <div style={{ padding: 8, background: '#0a0f1a', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1 }}>BUDGET LEFT</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: COL_AMBER }}>${budget}</div>
                  </div>
                  <div style={{ padding: 8, background: '#0a0f1a', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1 }}>TIME LEFT</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: COL_AMBER }}>{timeLeft}s</div>
                  </div>
                </div>

                {/* Educational note */}
                {!resultPassed && (
                  <div style={{
                    padding: 10, background: '#1a0808', borderRadius: 4,
                    border: `1px solid ${COL_RED}33`, marginBottom: 12
                  }}>
                    <div style={{ fontSize: 10, color: COL_RED, letterSpacing: 1, marginBottom: 4 }}>
                      // KEY LESSON
                    </div>
                    <div style={{ fontSize: 11, color: '#f87171', lineHeight: 1.6 }}>
                      {!validatePyramid(sandbagMatrix).valid ? (
                        'Sandbags must be stacked in a pyramid formation with a wide base. A single column or rectangle provides no lateral support and will be pushed over by water pressure. The correct ratio is approximately 1:3 -- for every 1 bag of height, you need 3 bags of base width.'
                      ) : (
                        'Hydrostatic pressure during flooding pushes water (and sewage) upward through any unsealed drain. Every toilet, shower drain, and floor drain on the ground floor must be sealed with a backflow preventer or physical seal. A perfect wall means nothing if sewage rises through your plumbing.'
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button style={btnStyle(COL_BLUE)} onClick={resetAll}>
                    Try Again
                  </button>
                  <button
                    style={btnStyle('#94a3b8')}
                    onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
                  >
                    Back to Modules
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── BOTTOM: Resource meters ─── */}
        {phase === 'build' && (
          <div style={{
            ...panelStyle, marginTop: 12,
            display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-end', flexWrap: 'wrap'
          }}>
            {/* Budget bar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>BUDGET</div>
              <div style={{
                width: 180, height: 16, background: '#0a0f1a', borderRadius: 2,
                border: `1px solid ${COL_BLUE_DIM}`, overflow: 'hidden', position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(budget / STARTING_BUDGET) * 100}%`,
                  background: budget < 50 ? COL_RED : budget < 150 ? COL_AMBER : COL_GREEN,
                  transition: 'width 0.3s, background 0.3s'
                }} />
                <span style={{
                  position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700,
                  lineHeight: '16px', color: COL_TEXT
                }}>
                  ${budget} / ${STARTING_BUDGET}
                </span>
              </div>
            </div>

            {/* Time bar */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>
                TIME TO LANDFALL
              </div>
              <div style={{
                width: 180, height: 16, background: '#0a0f1a', borderRadius: 2,
                border: `1px solid ${COL_BLUE_DIM}`, overflow: 'hidden', position: 'relative'
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(timeLeft / STARTING_TIME) * 100}%`,
                  background: timeLeft < 20 ? COL_RED : timeLeft < 40 ? COL_AMBER : COL_BLUE,
                  transition: 'width 0.3s, background 0.3s'
                }} />
                <span style={{
                  position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700,
                  lineHeight: '16px', color: COL_TEXT
                }}>
                  {timeLeft}s / {STARTING_TIME}s
                </span>
              </div>
            </div>

            {/* Bag count */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SANDBAGS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COL_SAND }}>{bagCount}</div>
            </div>

            {/* Seal count */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SEALS</div>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: sealCount === 3 ? COL_GREEN : sealCount > 0 ? COL_AMBER : COL_RED
              }}>
                {sealCount}/3
              </div>
            </div>

            {/* Cost breakdown */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 4 }}>SPENT</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
                ${STARTING_BUDGET - budget}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
