import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGame } from '../../context/GameContext'

// ── Water source definitions with volume_mL ──
const WATER_SOURCES = [
  { id: 1,  name: 'Old Tire',       emoji: '\uD83D\uDEDE', hasWater: true, volume_mL: 800,  row: 0, col: 0 },
  { id: 2,  name: 'Bucket',         emoji: '\uD83E\uDEE3', hasWater: true, volume_mL: 2000, row: 0, col: 2 },
  { id: 3,  name: 'Flower Pot',     emoji: '\uD83E\uDEB4', hasWater: true, volume_mL: 350,  row: 0, col: 4 },
  { id: 4,  name: 'Puddle',         emoji: '\uD83D\uDCA7', hasWater: true, volume_mL: 3000, row: 1, col: 1 },
  { id: 5,  name: 'Blocked Gutter', emoji: '\uD83C\uDFDA\uFE0F', hasWater: true, volume_mL: 1500, row: 1, col: 3 },
  { id: 6,  name: 'Abandoned Pool', emoji: '\uD83C\uDFCA', hasWater: true, volume_mL: 5000, row: 2, col: 0 },
  { id: 7,  name: 'Tarp',           emoji: '\u26FA',       hasWater: true, volume_mL: 1200, row: 2, col: 2 },
  { id: 8,  name: 'Birdbath',       emoji: '\uD83D\uDC26', hasWater: true, volume_mL: 600,  row: 2, col: 4 },
  { id: 9,  name: 'Bottle Cap',     emoji: '\uD83E\uDDE2', hasWater: true, volume_mL: 50,   row: 3, col: 1 },
  { id: 10, name: 'Tree Hollow',    emoji: '\uD83C\uDF33', hasWater: true, volume_mL: 400,  row: 3, col: 3 },
  { id: 11, name: 'Broken Pipe',    emoji: '\uD83D\uDD27', hasWater: true, volume_mL: 2500, row: 4, col: 0 },
  { id: 12, name: 'Pet Bowl',       emoji: '\uD83D\uDC15', hasWater: true, volume_mL: 300,  row: 4, col: 2 },
  // Decoys -- no standing water
  { id: 13, name: 'Dry Rock',       emoji: '\uD83E\uDEA8', hasWater: false, volume_mL: 0, row: 1, col: 0 },
  { id: 14, name: 'Fence',          emoji: '\uD83E\uDEB5', hasWater: false, volume_mL: 0, row: 3, col: 0 },
  { id: 15, name: 'Metal Sign',     emoji: '\uD83E\uDEA7', hasWater: false, volume_mL: 0, row: 4, col: 4 },
  { id: 16, name: 'Concrete Slab',  emoji: '\uD83E\uDDF1', hasWater: false, volume_mL: 0, row: 0, col: 3 },
]

const TOTAL_HOURS = 72
const BREED_INTERVAL = 12 // hours between breeding cycles
const R0 = 2 // basic reproduction number

const WATER_ONLY = WATER_SOURCES.filter(s => s.hasWater)
const TOTAL_WATER_SOURCES = WATER_ONLY.length

// ── Component ──
export default function Module14_TheSwarm() {
  const { dispatch } = useGame()
  const [phase, setPhase] = useState('intro') // intro | simulation | result
  const [hour, setHour] = useState(0)
  const [treated, setTreated] = useState({}) // id -> true
  const [mosquitoCount, setMosquitoCount] = useState(0)
  const [graphData, setGraphData] = useState([{ hour: 0, population: 0 }])
  const [generation, setGeneration] = useState(0)
  const [decoyClicks, setDecoyClicks] = useState(0)
  const [result, setResult] = useState(null)
  const [flashId, setFlashId] = useState(null)

  const timerRef = useRef(null)
  const hourRef = useRef(0)
  const treatedRef = useRef({})
  const mosquitoRef = useRef(0)
  const generationRef = useRef(0)
  const graphRef = useRef([{ hour: 0, population: 0 }])

  // Keep refs in sync
  useEffect(() => { treatedRef.current = treated }, [treated])
  useEffect(() => { hourRef.current = hour }, [hour])
  useEffect(() => { mosquitoRef.current = mosquitoCount }, [mosquitoCount])
  useEffect(() => { generationRef.current = generation }, [generation])

  // ── Start simulation timer ──
  useEffect(() => {
    if (phase !== 'simulation') return

    timerRef.current = setInterval(() => {
      const nextHour = hourRef.current + 1

      if (nextHour > TOTAL_HOURS) {
        clearInterval(timerRef.current)
        finishSimulation()
        return
      }

      // Check if this hour triggers a breeding cycle (every 12 hours)
      if (nextHour > 0 && nextHour % BREED_INTERVAL === 0) {
        const newGen = generationRef.current + 1
        const multiplier = Math.pow(R0, newGen - 1) // gen1=1x, gen2=2x, gen3=4x, gen4=8x...

        // Calculate new mosquitoes from untreated sources
        let breedingOutput = 0
        WATER_ONLY.forEach(source => {
          if (!treatedRef.current[source.id]) {
            breedingOutput += (source.volume_mL / 100) * multiplier
          }
        })

        const newTotal = mosquitoRef.current + Math.round(breedingOutput)

        setGeneration(newGen)
        setMosquitoCount(newTotal)
        mosquitoRef.current = newTotal
        generationRef.current = newGen

        // Record data point at each breeding cycle
        const newPoint = { hour: nextHour, population: newTotal }
        graphRef.current = [...graphRef.current, newPoint]
        setGraphData([...graphRef.current])
      }

      setHour(nextHour)
      hourRef.current = nextHour
    }, 1000) // 1 second = 1 hour

    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Finish simulation ──
  const finishSimulation = useCallback(() => {
    clearInterval(timerRef.current)

    const treatedWater = WATER_ONLY.filter(s => treatedRef.current[s.id]).length

    // Determine when the last treatment happened (approximate)
    let score = 0
    const ratio = treatedWater / TOTAL_WATER_SOURCES

    if (ratio >= 0.9 && hourRef.current <= 24) {
      score = 100
    } else if (ratio >= 0.9) {
      score = 85
    } else if (ratio >= 0.7 && hourRef.current <= 48) {
      score = Math.round(60 + (ratio - 0.7) * 100)
    } else if (ratio >= 0.5) {
      score = Math.round(40 + (ratio - 0.5) * 40)
    } else {
      score = Math.round(ratio * 60)
    }

    // Penalty for decoy clicks
    score = Math.max(0, Math.min(100, score - decoyClicks * 3))

    const passed = score >= 60
    const finalResult = {
      score,
      passed,
      treatedWater,
      totalSources: TOTAL_WATER_SOURCES,
      finalMosquitoes: mosquitoRef.current,
      finalGeneration: generationRef.current,
      decoyClicks,
    }

    setResult(finalResult)
    setPhase('result')
    dispatch({ type: 'RECORD_SCORE', payload: { key: 'flood-14', result: { score, passed } } })
  }, [decoyClicks, dispatch])

  // ── Handle clicking a water source ──
  const handleSourceClick = useCallback((source) => {
    if (phase !== 'simulation') return
    if (treated[source.id]) return

    if (!source.hasWater) {
      setDecoyClicks(prev => prev + 1)
      setFlashId(source.id)
      setTimeout(() => setFlashId(null), 600)
      return
    }

    setTreated(prev => ({ ...prev, [source.id]: true }))
    setFlashId(source.id)
    setTimeout(() => setFlashId(null), 600)
  }, [phase, treated])

  // ── Start simulation ──
  const startSimulation = () => {
    setPhase('simulation')
    setHour(0)
    setTreated({})
    setMosquitoCount(0)
    setGraphData([{ hour: 0, population: 0 }])
    setGeneration(0)
    setDecoyClicks(0)
    setResult(null)
    hourRef.current = 0
    treatedRef.current = {}
    mosquitoRef.current = 0
    generationRef.current = 0
    graphRef.current = [{ hour: 0, population: 0 }]
  }

  // ── Derived values ──
  const treatedCount = WATER_ONLY.filter(s => treated[s.id]).length
  const remainingSources = TOTAL_WATER_SOURCES - treatedCount
  const timerProgress = (hour / TOTAL_HOURS) * 100
  const urgencyColor = hour < 24 ? '#4ade80' : hour < 48 ? '#fbbf24' : '#ef4444'

  const maxPopulation = useMemo(() => Math.max(1, ...graphData.map(d => d.population)), [graphData])

  // ═══════════════════════════════════════════════
  // ── INTRO PHASE ──
  // ═══════════════════════════════════════════════
  if (phase === 'intro') {
    return (
      <div style={S.container}>
        <div style={S.introCard}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🦟🗺️</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 26, margin: '8px 0' }}>
            Module 14: The Swarm
          </h1>
          <h2 style={{ color: '#fbbf24', fontSize: 16, fontWeight: 'normal', margin: '4px 0 16px' }}>
            Epidemiological R_0 Simulator
          </h2>

          <p style={S.introText}>
            The floodwater has receded, but the <strong style={{ color: '#ef4444' }}>third wave</strong> is
            coming. Stagnant water left in tires, buckets, and gutters becomes a breeding ground for
            mosquitoes carrying <strong style={{ color: '#ef4444' }}>Dengue</strong> and <strong style={{ color: '#ef4444' }}>Malaria</strong>.
          </p>

          <div style={S.missionBox}>
            <strong style={{ color: '#fbbf24' }}>YOUR MISSION:</strong>
            <p style={{ color: '#cbd5e1', margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>
              As a <strong style={{ color: '#38bdf8' }}>Public Health Official</strong>, you must locate and treat/empty
              all standing water sources within 72 hours before the mosquito larva incubation timer hits zero.
              Every 12 hours, remaining sources breed mosquitoes <strong style={{ color: '#ef4444' }}>exponentially</strong> (R_0 = 2).
              Miss too many, and the infection rate graph goes vertical.
            </p>
          </div>

          <div style={S.mechanicsBox}>
            <div style={S.mechItem}>
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>Timer:</span>{' '}
              72 hours (72 seconds real-time). 1 second = 1 hour.
            </div>
            <div style={S.mechItem}>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Breeding:</span>{' '}
              Every 12 hours, untreated sources produce mosquitoes. Output doubles each cycle.
            </div>
            <div style={S.mechItem}>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>R_0 = 2:</span>{' '}
              Generation 1 = 1x, Gen 2 = 2x, Gen 3 = 4x, Gen 4 = 8x ... exponential growth.
            </div>
            <div style={S.mechItem}>
              <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>Goal:</span>{' '}
              Click water sources on the map to empty/treat them before it is too late.
            </div>
          </div>

          <button style={S.primaryBtn} onClick={startSimulation}>
            Begin Outbreak Response
          </button>
          <button
            style={{ ...S.secondaryBtn, marginTop: 10 }}
            onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}
          >
            Back to Modules
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // ── RESULT PHASE ──
  // ═══════════════════════════════════════════════
  if (phase === 'result' && result) {
    const verdictColor = result.passed ? '#4ade80' : '#ef4444'
    const verdictLabel = result.score >= 90
      ? 'EPIDEMIC PREVENTED'
      : result.score >= 60
        ? 'OUTBREAK CONTAINED'
        : 'EPIDEMIC -- VECTOR-BORNE DISEASE SURGE'

    return (
      <div style={S.container}>
        <div style={{ ...S.introCard, maxWidth: 750 }}>
          <div style={{ fontSize: 48 }}>{result.passed ? '✅🦟' : '🚨🦟'}</div>
          <h1 style={{ color: verdictColor, fontSize: 24, margin: '8px 0' }}>
            {verdictLabel}
          </h1>

          {/* Final Graph */}
          <div style={{ margin: '16px 0', background: '#0f172a', borderRadius: 10, padding: 16, border: '1px solid #334155' }}>
            <h3 style={{ color: '#f1f5f9', fontSize: 14, margin: '0 0 8px', textAlign: 'center' }}>
              Infection Rate Over Time (Mosquito Population)
            </h3>
            {renderGraph(graphData, maxPopulation)}
          </div>

          {/* Stats grid */}
          <div style={S.resultGrid}>
            <div style={S.resultCell}>
              <div style={{ fontSize: 28, color: '#38bdf8', fontWeight: 'bold' }}>{result.score}</div>
              <div style={S.resultLabel}>Score</div>
            </div>
            <div style={S.resultCell}>
              <div style={{ fontSize: 28, color: '#4ade80', fontWeight: 'bold' }}>{result.treatedWater}/{result.totalSources}</div>
              <div style={S.resultLabel}>Sources Treated</div>
            </div>
            <div style={S.resultCell}>
              <div style={{ fontSize: 28, color: '#ef4444', fontWeight: 'bold' }}>{result.finalMosquitoes.toLocaleString()}</div>
              <div style={S.resultLabel}>Mosquitoes Bred</div>
            </div>
            <div style={S.resultCell}>
              <div style={{ fontSize: 28, color: '#fbbf24', fontWeight: 'bold' }}>{result.finalGeneration}</div>
              <div style={S.resultLabel}>Generations</div>
            </div>
          </div>

          {/* R_0 explanation */}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 16, margin: '16px 0', textAlign: 'left', border: '1px solid #334155' }}>
            <h3 style={{ color: '#fbbf24', fontSize: 15, margin: '0 0 8px' }}>
              Understanding R_0 (Basic Reproduction Number)
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#f1f5f9' }}>R_0</strong> measures how many new infections one
              infected individual produces. When R_0 {'>'} 1, the disease spreads exponentially.
              In this simulation, R_0 = 2 means each generation of mosquitoes produces <strong style={{ color: '#ef4444' }}>twice</strong> as
              many offspring. After just 6 generations: 1 {'->'} 2 {'->'} 4 {'->'} 8 {'->'} 16 {'->'} 32x multiplier.
            </p>
            <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, margin: '10px 0 0' }}>
              The <strong style={{ color: '#4ade80' }}>"third wave"</strong> of any flood is vector-borne disease.
              Floodwater recedes, but puddles remain in tires, buckets, gutters, and tarps.
              Mosquito larvae incubate in 72 hours. This wave is <strong style={{ color: '#4ade80' }}>entirely preventable</strong> through
              environmental disruption -- emptying standing water before larvae mature.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
            <button style={S.primaryBtn} onClick={startSimulation}>Retry Simulation</button>
            <button style={S.secondaryBtn} onClick={() => dispatch({ type: 'BACK_TO_MODULES' })}>
              Back to Modules
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════
  // ── SIMULATION PHASE ──
  // ═══════════════════════════════════════════════
  return (
    <div style={S.container}>
      {/* Header bar */}
      <div style={S.headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ color: '#f1f5f9', fontWeight: 'bold', fontSize: 16 }}>
            HOUR {hour} / {TOTAL_HOURS}
          </div>
          <div style={{
            color: urgencyColor, fontWeight: 'bold', fontSize: 14,
            padding: '2px 10px', borderRadius: 6,
            background: hour < 24 ? 'rgba(74,222,128,0.15)' : hour < 48 ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.2)',
          }}>
            {hour < 24 ? 'SAFE WINDOW' : hour < 48 ? 'WARNING' : 'CRITICAL'}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Gen {generation} | R_0 = {Math.pow(R0, Math.max(0, generation - 1))}x multiplier
          </div>
        </div>
        <button style={S.finishBtn} onClick={finishSimulation}>
          End Early
        </button>
      </div>

      {/* Timer progress bar */}
      <div style={S.progressOuter}>
        <div style={{
          ...S.progressInner,
          width: `${timerProgress}%`,
          background: urgencyColor,
        }} />
        {/* 12-hour tick marks */}
        {[12, 24, 36, 48, 60].map(tick => (
          <div key={tick} style={{
            position: 'absolute',
            left: `${(tick / TOTAL_HOURS) * 100}%`,
            top: 0, bottom: 0, width: 1,
            background: 'rgba(241,245,249,0.3)',
          }} />
        ))}
      </div>

      {/* Stats row */}
      <div style={S.statsRow}>
        <div style={S.statChip}>
          <span style={{ color: '#4ade80' }}>{treatedCount}</span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>/{TOTAL_WATER_SOURCES} Treated</span>
        </div>
        <div style={S.statChip}>
          <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 18 }}>{mosquitoCount.toLocaleString()}</span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>Mosquitoes</span>
        </div>
        <div style={S.statChip}>
          <span style={{ color: '#fbbf24' }}>{remainingSources}</span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>Untreated</span>
        </div>
        <div style={S.statChip}>
          <span style={{ color: '#ef4444' }}>{decoyClicks}</span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>False Clicks</span>
        </div>
      </div>

      {/* Main split layout */}
      <div style={S.splitLayout}>
        {/* LEFT: Neighborhood Map */}
        <div style={S.mapPanel}>
          <h3 style={{ color: '#f1f5f9', fontSize: 14, margin: '0 0 8px', textAlign: 'center' }}>
            Neighborhood Map -- Click to Treat Water Sources
          </h3>
          <div style={S.mapGrid}>
            {WATER_SOURCES.map(source => {
              const isTreated = treated[source.id]
              const isFlashing = flashId === source.id
              const isDecoy = !source.hasWater

              let cellBg = 'rgba(30,41,59,0.8)'
              let borderColor = '#475569'
              if (isTreated) {
                cellBg = 'rgba(74,222,128,0.15)'
                borderColor = '#4ade80'
              } else if (isFlashing && isDecoy) {
                cellBg = 'rgba(239,68,68,0.3)'
                borderColor = '#ef4444'
              } else if (isFlashing && !isDecoy) {
                cellBg = 'rgba(74,222,128,0.3)'
                borderColor = '#4ade80'
              }

              return (
                <div
                  key={source.id}
                  onClick={() => handleSourceClick(source)}
                  style={{
                    gridRow: source.row + 1,
                    gridColumn: source.col + 1,
                    background: cellBg,
                    border: `2px solid ${borderColor}`,
                    borderRadius: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isTreated ? 'default' : 'pointer',
                    padding: '6px 4px',
                    transition: 'all 0.2s ease',
                    opacity: isTreated ? 0.55 : 1,
                    position: 'relative',
                    minHeight: 72,
                  }}
                >
                  <div style={{ fontSize: 28, lineHeight: 1 }}>
                    {isTreated ? '\u2705' : source.emoji}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#e2e8f0', fontWeight: 'bold',
                    marginTop: 3, textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {source.name}
                  </div>
                  {source.hasWater && !isTreated && (
                    <div style={{
                      fontSize: 9, color: '#38bdf8', marginTop: 2, fontWeight: 'bold',
                    }}>
                      {source.volume_mL} mL
                    </div>
                  )}
                  {isTreated && (
                    <div style={{
                      position: 'absolute', top: 2, right: 4,
                      fontSize: 10, color: '#4ade80', fontWeight: 'bold',
                    }}>
                      SAFE
                    </div>
                  )}
                  {!source.hasWater && !isTreated && (
                    <div style={{
                      fontSize: 9, color: '#64748b', marginTop: 2, fontStyle: 'italic',
                    }}>
                      dry
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Mosquito swarm overlay indicator */}
          {mosquitoCount > 200 && (
            <div style={{
              textAlign: 'center', marginTop: 8,
              color: '#ef4444', fontWeight: 'bold', fontSize: 13,
              background: 'rgba(239,68,68,0.15)', borderRadius: 6, padding: '4px 10px',
            }}>
              MOSQUITO SWARM DENSITY: {mosquitoCount > 1000 ? 'EXTREME' : mosquitoCount > 500 ? 'HIGH' : 'RISING'}
            </div>
          )}
        </div>

        {/* RIGHT: Epidemiological Graph */}
        <div style={S.graphPanel}>
          <h3 style={{ color: '#f1f5f9', fontSize: 14, margin: '0 0 8px', textAlign: 'center' }}>
            Epidemiological Curve -- Mosquito Population
          </h3>
          {renderGraph(graphData, maxPopulation)}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 3, background: '#ef4444', borderRadius: 2 }} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Population Curve</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, background: 'rgba(251,191,36,0.2)', border: '1px dashed #fbbf24', borderRadius: 2 }} />
              <span style={{ color: '#94a3b8', fontSize: 11 }}>Breeding Cycles (every 12h)</span>
            </div>
          </div>

          {/* R_0 info box */}
          <div style={{
            marginTop: 12, background: '#0f172a', borderRadius: 8,
            padding: 10, border: '1px solid #334155',
          }}>
            <div style={{ color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
              R_0 Model (Exponential Growth)
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
              Each cycle multiplier: {generation > 0
                ? Array.from({ length: generation }, (_, i) => `Gen${i + 1}=${Math.pow(R0, i)}x`).join(', ')
                : 'No breeding cycles yet'
              }
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>
              Untreated sources produce (volume_mL / 100) x multiplier mosquitoes per cycle.
            </div>
          </div>
        </div>
      </div>

      {/* Larva Incubation Timer callout */}
      <div style={S.incubationBar}>
        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 13 }}>
          LARVA INCUBATION:
        </span>
        <div style={S.incubationTrack}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (hour / TOTAL_HOURS) * 100)}%`,
            background: hour < 24
              ? 'linear-gradient(90deg, #4ade80, #22c55e)'
              : hour < 48
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, #ef4444, #dc2626)',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ color: urgencyColor, fontWeight: 'bold', fontSize: 13, minWidth: 65, textAlign: 'right' }}>
          {TOTAL_HOURS - hour}h left
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════
// ── SVG Graph Renderer ──
// ═══════════════════════════════════════════════
function renderGraph(graphData, maxPopulation) {
  const svgW = 380
  const svgH = 220
  const padL = 45
  const padR = 10
  const padT = 15
  const padB = 25
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  const safeMax = Math.max(1, maxPopulation)

  // Build polyline points
  const points = graphData.map(d => {
    const x = padL + (d.hour / TOTAL_HOURS) * plotW
    const y = padT + plotH - (d.population / safeMax) * plotH
    return `${x},${y}`
  }).join(' ')

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0]

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: '100%', maxWidth: svgW, display: 'block', margin: '0 auto' }}
    >
      {/* Background */}
      <rect x={padL} y={padT} width={plotW} height={plotH} fill="#0f172a" rx="4" />

      {/* Grid lines and Y-axis labels */}
      {yTicks.map((frac, i) => {
        const y = padT + plotH - frac * plotH
        const val = Math.round(frac * safeMax)
        return (
          <g key={i}>
            <line
              x1={padL} y1={y} x2={padL + plotW} y2={y}
              stroke="#1e293b" strokeWidth="1"
            />
            <text x={padL - 4} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
            </text>
          </g>
        )
      })}

      {/* X-axis labels */}
      {[0, 12, 24, 36, 48, 60, 72].map(h => {
        const x = padL + (h / TOTAL_HOURS) * plotW
        return (
          <g key={h}>
            <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#1e293b" strokeWidth="1" />
            <text x={x} y={svgH - 4} fill="#64748b" fontSize="9" textAnchor="middle">
              {h}h
            </text>
          </g>
        )
      })}

      {/* Breeding cycle markers (vertical dashed) */}
      {[12, 24, 36, 48, 60, 72].map(h => {
        const x = padL + (h / TOTAL_HOURS) * plotW
        return (
          <line
            key={`breed-${h}`}
            x1={x} y1={padT} x2={x} y2={padT + plotH}
            stroke="#fbbf2440" strokeWidth="1" strokeDasharray="4,3"
          />
        )
      })}

      {/* Danger zone shading above certain thresholds */}
      {safeMax > 100 && (
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH * 0.3}
          fill="rgba(239,68,68,0.06)"
        />
      )}

      {/* The population curve */}
      {graphData.length > 1 && (
        <>
          {/* Area fill under curve */}
          <polygon
            points={`${padL + (graphData[0].hour / TOTAL_HOURS) * plotW},${padT + plotH} ${points} ${padL + (graphData[graphData.length - 1].hour / TOTAL_HOURS) * plotW},${padT + plotH}`}
            fill="rgba(239,68,68,0.12)"
          />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {/* Data point dots */}
      {graphData.map((d, i) => {
        const x = padL + (d.hour / TOTAL_HOURS) * plotW
        const y = padT + plotH - (d.population / safeMax) * plotH
        return (
          <circle
            key={i}
            cx={x} cy={y} r={3}
            fill={d.population > safeMax * 0.7 ? '#ef4444' : '#fbbf24'}
            stroke="#0f172a" strokeWidth="1"
          />
        )
      })}

      {/* Axis labels */}
      <text x={svgW / 2} y={svgH} fill="#94a3b8" fontSize="10" textAnchor="middle">
        Time (hours)
      </text>
      <text
        x={8} y={svgH / 2}
        fill="#94a3b8" fontSize="10" textAnchor="middle"
        transform={`rotate(-90, 8, ${svgH / 2})`}
      >
        Population
      </text>

      {/* Axis lines */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#475569" strokeWidth="1.5" />
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#475569" strokeWidth="1.5" />
    </svg>
  )
}

// ═══════════════════════════════════════════════
// ── Styles ──
// ═══════════════════════════════════════════════
const S = {
  container: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#f1f5f9',
  },
  introCard: {
    maxWidth: 620,
    width: '100%',
    background: '#1e293b',
    borderRadius: 16,
    padding: '28px 32px',
    textAlign: 'center',
    marginTop: 32,
    border: '1px solid #334155',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  introText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 1.7,
    margin: '12px 0',
  },
  missionBox: {
    background: '#0f172a',
    borderRadius: 10,
    padding: 16,
    margin: '16px 0',
    border: '1px solid #334155',
    textAlign: 'left',
  },
  mechanicsBox: {
    background: '#0f172a',
    borderRadius: 10,
    padding: 14,
    margin: '12px 0',
    border: '1px solid #334155',
    textAlign: 'left',
  },
  mechItem: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 1.6,
    marginBottom: 4,
  },
  primaryBtn: {
    padding: '12px 32px',
    fontSize: 16,
    fontWeight: 'bold',
    background: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    marginTop: 16,
    display: 'inline-block',
  },
  secondaryBtn: {
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 'bold',
    background: '#475569',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'inline-block',
  },
  headerBar: {
    width: '100%',
    maxWidth: 880,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#1e293b',
    borderRadius: 10,
    padding: '8px 16px',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
    border: '1px solid #334155',
  },
  finishBtn: {
    padding: '6px 16px',
    fontSize: 12,
    fontWeight: 'bold',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  progressOuter: {
    width: '100%',
    maxWidth: 880,
    height: 8,
    background: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  progressInner: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 0.5s ease, background 0.5s ease',
  },
  statsRow: {
    width: '100%',
    maxWidth: 880,
    display: 'flex',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flex: 1,
    minWidth: 100,
    background: '#1e293b',
    borderRadius: 8,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #334155',
    fontSize: 14,
    fontWeight: 'bold',
  },
  splitLayout: {
    width: '100%',
    maxWidth: 880,
    display: 'flex',
    gap: 12,
    flex: 1,
    minHeight: 0,
  },
  mapPanel: {
    flex: 1,
    background: '#1e293b',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  mapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gridTemplateRows: 'repeat(5, 1fr)',
    gap: 6,
    flex: 1,
    minHeight: 0,
  },
  graphPanel: {
    flex: 1,
    background: '#1e293b',
    borderRadius: 12,
    padding: 12,
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  incubationBar: {
    width: '100%',
    maxWidth: 880,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#1e293b',
    borderRadius: 8,
    padding: '8px 14px',
    marginTop: 8,
    border: '1px solid #334155',
  },
  incubationTrack: {
    flex: 1,
    height: 10,
    background: '#0f172a',
    borderRadius: 5,
    overflow: 'hidden',
    border: '1px solid #334155',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    margin: '16px 0',
  },
  resultCell: {
    background: '#0f172a',
    borderRadius: 10,
    padding: 12,
    textAlign: 'center',
    border: '1px solid #334155',
  },
  resultLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
}
