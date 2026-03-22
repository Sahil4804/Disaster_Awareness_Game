import { useState, useMemo } from 'react'
import { useGame } from '../context/GameContext'

// ─── Static data ────────────────────────────────────────────────────────────

const ALL_MODULES = {
  flood: [
    { id: 1,  title: 'The 60-Second Go-Bag', phase: 'Preparedness', icon: '🎒', topic: 'Emergency packing & item prioritization' },
    { id: 2,  title: 'Home Defense',          phase: 'Preparedness', icon: '🏠', topic: 'Utility shut-off & sandbag placement' },
    { id: 3,  title: 'Yard Lockdown',         phase: 'Preparedness', icon: '⛓️', topic: 'Securing outdoor hazards' },
    { id: 4,  title: 'The Sinking Car',       phase: 'Response',     icon: '🚗', topic: 'Vehicle escape protocol (SWOC method)' },
    { id: 5,  title: 'Treacherous Trek',      phase: 'Response',     icon: '🚶', topic: 'Safe navigation in floodwater' },
    { id: 6,  title: 'First Responder',       phase: 'Survival',     icon: '🩹', topic: 'Triage & wound care in flood conditions' },
    { id: 7,  title: 'Camp Safe Haven',       phase: 'Survival',     icon: '⛺', topic: 'Temporary shelter construction order' },
    { id: 8,  title: 'SOS Signaling',         phase: 'Survival',     icon: '🪞', topic: 'Condition-based rescue signaling' },
    { id: 9,  title: 'Toxic Cleanup',         phase: 'Recovery',     icon: '☣️', topic: 'Post-flood CO, water & mold hazards' },
    { id: 10, title: 'Invisible Trap',        phase: 'Recovery',     icon: '⚡', topic: 'Submerged power line detection' },
    { id: 11, title: 'Toxic Soup',            phase: 'Recovery',     icon: '🧪', topic: 'Chemical contamination identification' },
    { id: 12, title: 'Wall of Water',         phase: 'Recovery',     icon: '🌊', topic: 'Flash flood rapid escape decisions' },
    { id: 13, title: 'Calm Mind',             phase: 'Recovery',     icon: '🧠', topic: 'Psychological first aid & de-escalation' },
    { id: 14, title: 'The Swarm',             phase: 'Recovery',     icon: '🦟', topic: 'Vector-borne disease prevention' },
  ],
}

const PHASES = [
  { key: 'Preparedness', emoji: '🛡️', color: '#3b82f6', grad: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)'  },
  { key: 'Response',     emoji: '🚨', color: '#f59e0b', grad: 'linear-gradient(135deg,#b45309,#f59e0b)', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)'  },
  { key: 'Survival',     emoji: '⛺', color: '#22c55e', grad: 'linear-gradient(135deg,#15803d,#22c55e)', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)'   },
  { key: 'Recovery',     emoji: '🔧', color: '#a855f7', grad: 'linear-gradient(135deg,#7e22ce,#a855f7)', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.22)'  },
]

const DISASTERS = [
  { key: 'flood', label: 'Flood Survival', emoji: '🌊', color: '#3b82f6' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGrade(score, attempted) {
  if (!attempted) return { letter: '—',  label: 'Not Started', color: '#475569', bg: 'rgba(71,85,105,0.15)'    }
  if (score >= 93) return { letter: 'A+', label: 'Expert',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  }
  if (score >= 85) return { letter: 'A',  label: 'Advanced',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   }
  if (score >= 75) return { letter: 'B+', label: 'Proficient',  color: '#a3e635', bg: 'rgba(163,230,53,0.12)'  }
  if (score >= 65) return { letter: 'B',  label: 'Informed',    color: '#facc15', bg: 'rgba(250,204,21,0.12)'  }
  if (score >= 55) return { letter: 'C+', label: 'Aware',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  }
  if (score >= 45) return { letter: 'C',  label: 'Basic',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  if (score >= 30) return { letter: 'D',  label: 'Novice',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   }
  return              { letter: 'F',  label: 'Critical',    color: '#dc2626', bg: 'rgba(220,38,38,0.12)'   }
}

function scoreColor(s) {
  if (s >= 80) return '#22c55e'
  if (s >= 60) return '#facc15'
  if (s >= 40) return '#f97316'
  return '#ef4444'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBar({ pct = 0, color = '#3b82f6', h = 8 }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,0.07)', borderRadius: h, overflow: 'hidden', width: '100%' }}>
      <div style={{
        height: '100%',
        width: `${Math.max(0, Math.min(100, pct))}%`,
        background: color,
        borderRadius: h,
        transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: `0 0 8px ${color}55`,
      }} />
    </div>
  )
}

function CircleGauge({ score = 0, color = '#3b82f6', size = 130 }) {
  const inner = Math.round(size * 0.72)
  const deg   = Math.round((Math.max(0, Math.min(100, score)) / 100) * 360)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${color} 0deg ${deg}deg, rgba(255,255,255,0.07) ${deg}deg 360deg)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      filter: `drop-shadow(0 0 18px ${color}55)`,
    }}>
      <div style={{
        width: inner, height: inner, borderRadius: '50%', background: '#0b1120',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>
        <span style={{ fontSize: Math.round(size * 0.19), fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
          {score}%
        </span>
        <span style={{ fontSize: Math.round(size * 0.09), color: '#64748b', lineHeight: 1.4 }}>score</span>
      </div>
    </div>
  )
}

function GradeBadge({ grade, large = false }) {
  return (
    <span style={{
      fontSize: large ? 22 : 14,
      fontWeight: 800,
      padding: large ? '5px 16px' : '2px 9px',
      borderRadius: 7,
      color: grade.color,
      background: grade.bg,
      border: `1px solid ${grade.color}55`,
      letterSpacing: 0.5,
      whiteSpace: 'nowrap',
    }}>
      {grade.letter}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MetricsDashboard() {
  const { state, dispatch } = useGame()
  const [activeDisaster, setActiveDisaster] = useState(state.selectedDisaster || 'flood')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [expandedPhase, setExpandedPhase] = useState(null)

  const metrics = useMemo(() => {
    const dis  = activeDisaster
    const mods = ALL_MODULES[dis] || []

    const phaseStats = PHASES.map(ph => {
      const pMods    = mods.filter(m => m.phase === ph.key)
      const attempted = pMods.filter(m => !!state.scores[`${dis}-${m.id}`])
      const passed    = pMods.filter(m => state.completedModules.includes(`${dis}-${m.id}`))
      const avgScore  = attempted.length
        ? Math.round(attempted.reduce((s, m) => s + (state.scores[`${dis}-${m.id}`]?.score || 0), 0) / attempted.length)
        : 0
      return {
        ...ph,
        modules:   pMods,
        attempted: attempted.length,
        passed:    passed.length,
        total:     pMods.length,
        avgScore,
        grade:     getGrade(avgScore, attempted.length),
      }
    })

    const allAttempted = mods.filter(m => !!state.scores[`${dis}-${m.id}`])
    const overallScore = allAttempted.length
      ? Math.round(allAttempted.reduce((s, m) => s + (state.scores[`${dis}-${m.id}`]?.score || 0), 0) / allAttempted.length)
      : 0
    const totalPassed  = mods.filter(m => state.completedModules.includes(`${dis}-${m.id}`)).length
    const passRate     = allAttempted.length ? Math.round((totalPassed / allAttempted.length) * 100) : 0

    const strengths = mods
      .filter(m => (state.scores[`${dis}-${m.id}`]?.score || 0) >= 75)
      .map(m => ({ ...m, score: state.scores[`${dis}-${m.id}`].score, attempts: state.scores[`${dis}-${m.id}`].attempts || 1 }))
      .sort((a, b) => b.score - a.score)

    const gaps = mods
      .filter(m => {
        const s = state.scores[`${dis}-${m.id}`]
        return s ? s.score < 65 : true
      })
      .map(m => {
        const s = state.scores[`${dis}-${m.id}`]
        return { ...m, score: s?.score ?? null, attempts: s?.attempts ?? 0, tried: !!s }
      })
      .sort((a, b) => {
        if (!a.tried && !b.tried) return 0
        if (!a.tried) return 1
        if (!b.tried) return -1
        return a.score - b.score
      })

    // Best and weakest phases (among attempted)
    const attemptedPhases = phaseStats.filter(p => p.attempted > 0)
    const bestPhase    = attemptedPhases.length ? [...attemptedPhases].sort((a, b) => b.avgScore - a.avgScore)[0] : null
    const weakestPhase = attemptedPhases.length ? [...attemptedPhases].sort((a, b) => a.avgScore - b.avgScore)[0] : null

    // Total attempts across all modules
    const totalAttempts = mods.reduce((sum, m) => sum + (state.scores[`${dis}-${m.id}`]?.attempts || 0), 0)

    return {
      mods, phaseStats,
      overallScore, overallGrade: getGrade(overallScore, allAttempted.length),
      totalAttempted: allAttempted.length, totalPassed, totalModules: mods.length,
      passRate, strengths, gaps, bestPhase, weakestPhase, totalAttempts,
    }
  }, [activeDisaster, state.scores, state.completedModules])

  const noData = metrics.totalAttempted === 0

  const handleReset = () => {
    dispatch({ type: 'RESET_PROGRESS' })
    setResetConfirm(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={st.page}>

      {/* ── Reset confirm modal ── */}
      {resetConfirm && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <span style={{ fontSize: 44 }}>⚠️</span>
            <h3 style={{ color: '#f8fafc', marginTop: 12, fontSize: 18 }}>Reset All Progress?</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '10px 0 22px', textAlign: 'center', lineHeight: 1.6 }}>
              This permanently deletes all your scores,<br />completion data, and attempt history.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={st.dangerBtn} onClick={handleReset}>Yes, Reset Everything</button>
              <button style={st.cancelBtn} onClick={() => setResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={st.header}>
        <button style={st.backBtn} onClick={() => dispatch({ type: 'NAVIGATE', payload: 'mainMenu' })}>
          ← Back to Menu
        </button>
        <h1 style={st.pageTitle}>📊 Readiness Dashboard</h1>
        <button style={st.resetBtn} onClick={() => setResetConfirm(true)}>🗑️ Reset</button>
      </div>

      {/* ── Disaster tabs ── */}
      <div style={st.tabs}>
        {DISASTERS.map(d => (
          <button
            key={d.key}
            style={{
              ...st.tab,
              ...(activeDisaster === d.key
                ? { background: `${d.color}22`, borderColor: d.color, color: d.color }
                : {}),
            }}
            onClick={() => setActiveDisaster(d.key)}
          >
            {d.emoji} {d.label}
          </button>
        ))}
        <span style={st.tabNote}>More disasters coming soon</span>
      </div>

      {/* ── Empty state ── */}
      {noData ? (
        <div style={st.emptyState}>
          <span style={{ fontSize: 68 }}>🎮</span>
          <h2 style={{ color: '#f8fafc', marginTop: 18, fontSize: 22 }}>No Data Yet</h2>
          <p style={{ color: '#94a3b8', marginTop: 10, fontSize: 15, maxWidth: 340, textAlign: 'center', lineHeight: 1.7 }}>
            Complete some modules to see your readiness metrics, knowledge gaps, and performance breakdown here.
          </p>
          <button
            style={st.primaryBtn}
            onClick={() => dispatch({ type: 'SELECT_DISASTER', payload: activeDisaster })}
          >
            🚀 Start Training
          </button>
        </div>
      ) : (
        <>
          {/* ══ HERO ROW: Circular score + Phase snapshot ══ */}
          <div style={st.heroRow}>

            {/* Overall score card */}
            <div style={st.heroCard}>
              <p style={st.cardLabel}>🏆 Overall Readiness</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 18 }}>
                <CircleGauge score={metrics.overallScore} color={metrics.overallGrade.color} size={138} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <GradeBadge grade={metrics.overallGrade} large />
                    <span style={{ color: metrics.overallGrade.color, fontWeight: 700, fontSize: 17 }}>
                      {metrics.overallGrade.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <StatLine label="Attempted"  val={`${metrics.totalAttempted} / ${metrics.totalModules}`} col="#94a3b8" />
                    <StatLine label="Passed"     val={`${metrics.totalPassed} / ${metrics.totalModules}`}   col="#4ade80" />
                    <StatLine label="Pass Rate"  val={`${metrics.passRate}%`}                               col="#60a5fa" />
                    <StatLine label="Total Tries" val={metrics.totalAttempts}                               col="#a78bfa" />
                  </div>
                  {metrics.bestPhase && (
                    <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                      💪 Best: <span style={{ color: metrics.bestPhase.color, fontWeight: 700 }}>{metrics.bestPhase.key}</span>
                      {metrics.weakestPhase && metrics.weakestPhase.key !== metrics.bestPhase.key && (
                        <> &nbsp;|&nbsp; ⚠️ Weakest: <span style={{ color: metrics.weakestPhase.color, fontWeight: 700 }}>{metrics.weakestPhase.key}</span></>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Knowledge snapshot */}
            <div style={st.heroCard}>
              <p style={st.cardLabel}>📡 Knowledge Snapshot</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
                {metrics.phaseStats.map(ph => (
                  <div key={ph.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{ph.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 600 }}>{ph.key}</span>
                        <span style={{ fontSize: 12, color: ph.attempted ? ph.color : '#475569', fontWeight: 700 }}>
                          {ph.attempted ? `${ph.avgScore}%` : 'Not started'}
                        </span>
                      </div>
                      <ScoreBar pct={ph.avgScore} color={ph.attempted ? ph.color : '#334155'} h={8} />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', width: 52, textAlign: 'right' }}>
                      {ph.passed}/{ph.total} ✅
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ PHASE CARDS GRID ══ */}
          <SectionTitle>Phase Breakdown</SectionTitle>
          <div style={st.phaseGrid}>
            {metrics.phaseStats.map(ph => (
              <div key={ph.key} style={{ ...st.phaseCard, background: ph.bg, borderColor: ph.border }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 30 }}>{ph.emoji}</span>
                    <h4 style={{ color: ph.color, fontSize: 13, fontWeight: 700, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                      {ph.key}
                    </h4>
                  </div>
                  <GradeBadge grade={ph.grade} />
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Phase Score</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ph.attempted ? ph.color : '#475569' }}>
                      {ph.attempted ? `${ph.avgScore}%` : '—'}
                    </span>
                  </div>
                  <ScoreBar pct={ph.avgScore} color={ph.attempted ? ph.color : '#334155'} h={10} />
                </div>

                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <MiniStat label="Passed"   val={`${ph.passed}/${ph.total}`} />
                  <MiniStat label="Tried"    val={`${ph.attempted}/${ph.total}`} />
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 12, color: ph.grade.color, fontWeight: 600 }}>
                    {ph.grade.label}
                  </span>
                  {ph.attempted < ph.total && (
                    <span style={{ fontSize: 11, color: '#475569', float: 'right' }}>
                      {ph.total - ph.attempted} not tried
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ══ MODULE BREAKDOWN ══ */}
          <SectionTitle>Module-by-Module Breakdown</SectionTitle>
          {metrics.phaseStats.map(ph => (
            <div key={ph.key} style={st.phaseSection}>
              <button
                style={{ ...st.phaseSectionHeader, borderColor: ph.border, background: ph.bg }}
                onClick={() => setExpandedPhase(expandedPhase === ph.key ? null : ph.key)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{ph.emoji}</span>
                  <span style={{ color: ph.color, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {ph.key}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    ({ph.passed}/{ph.total} passed · {ph.attempted ? `avg ${ph.avgScore}%` : 'not started'})
                  </span>
                </span>
                <span style={{ fontSize: 16, color: '#64748b', transition: 'transform 0.2s', transform: expandedPhase === ph.key ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </button>

              {(expandedPhase === null || expandedPhase === ph.key) && (
                <div style={st.moduleList}>
                  {ph.modules.map((m, i) => {
                    const key      = `${activeDisaster}-${m.id}`
                    const sData    = state.scores[key]
                    const passed   = state.completedModules.includes(key)
                    const score    = sData?.score ?? null
                    const attempts = sData?.attempts ?? 0
                    const bestScore = sData?.bestScore ?? score
                    const notTried = !sData

                    return (
                      <div
                        key={m.id}
                        style={{
                          ...st.moduleRow,
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                          opacity: notTried ? 0.6 : 1,
                        }}
                      >
                        {/* Icon + Title */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: '0 0 200px' }}>
                          <span style={{ fontSize: 22 }}>{m.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{m.title}</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Mod {m.id} · {m.topic}</div>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div style={{ flex: 1, padding: '0 20px' }}>
                          {notTried ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1 }}><ScoreBar pct={0} color="#334155" h={8} /></div>
                              <span style={{ fontSize: 11, color: '#475569' }}>Not tried</span>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1 }}><ScoreBar pct={score} color={scoreColor(score)} h={8} /></div>
                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(score), minWidth: 38, textAlign: 'right' }}>
                                  {score}%
                                </span>
                              </div>
                              {bestScore > score && (
                                <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                  Best: {bestScore}%
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status + controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 160px', justifyContent: 'flex-end' }}>
                          {!notTried && (
                            <>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                                background: passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                color: passed ? '#4ade80' : '#f87171',
                              }}>
                                {passed ? '✅ Pass' : '❌ Fail'}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                                {attempts} {attempts === 1 ? 'try' : 'tries'}
                              </span>
                            </>
                          )}
                          <button
                            style={st.playBtn}
                            onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: m.id } })}
                            title={notTried ? 'Start module' : 'Retry module'}
                          >
                            {notTried ? '▶ Start' : '↩ Retry'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* ══ RECOMMENDATIONS ══ */}
          <SectionTitle>🎯 Personalized Recommendations</SectionTitle>
          <div style={st.recoGrid}>

            {/* Strengths */}
            <div style={st.recoCard}>
              <h3 style={{ color: '#4ade80', fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                💪 Your Strengths
                <span style={{ fontSize: 12, color: '#4ade8066', fontWeight: 500 }}>({metrics.strengths.length} modules ≥75%)</span>
              </h3>
              {metrics.strengths.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                  Score ≥75% on any module to see your strengths here. Keep training!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.strengths.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{m.topic}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80' }}>{m.score}%</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{m.attempts} {m.attempts === 1 ? 'try' : 'tries'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gaps */}
            <div style={st.recoCard}>
              <h3 style={{ color: '#f87171', fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ Focus Areas
                <span style={{ fontSize: 12, color: '#f8717166', fontWeight: 500 }}>({metrics.gaps.length} modules need work)</span>
              </h3>
              {metrics.gaps.length === 0 ? (
                <p style={{ color: '#4ade80', fontSize: 13 }}>
                  🎉 No critical gaps! You are well-prepared across all modules.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.gaps.slice(0, 7).map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{m.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                          {m.tried
                            ? `Score: ${m.score}% · ${m.attempts} ${m.attempts === 1 ? 'attempt' : 'attempts'}`
                            : 'Not yet attempted'}
                        </div>
                      </div>
                      <button
                        style={{ ...st.playBtn, fontSize: 12, padding: '4px 10px' }}
                        onClick={() => dispatch({ type: 'PLAY_MODULE', payload: { disaster: activeDisaster, module: m.id } })}
                      >
                        {m.tried ? '↩ Retry' : '▶ Start'}
                      </button>
                    </div>
                  ))}
                  {metrics.gaps.length > 7 && (
                    <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                      +{metrics.gaps.length - 7} more areas to review
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ══ SUMMARY STATS FOOTER BAR ══ */}
          <div style={st.statsBar}>
            <StatBox num={metrics.totalAttempted}          label="Attempted"        />
            <div style={st.statsDivider} />
            <StatBox num={metrics.totalPassed}             label="Passed"           numColor="#4ade80" />
            <div style={st.statsDivider} />
            <StatBox num={`${metrics.overallScore}%`}      label="Avg Score"        numColor={metrics.overallGrade.color} />
            <div style={st.statsDivider} />
            <StatBox num={`${metrics.passRate}%`}          label="Pass Rate"        numColor="#60a5fa" />
            <div style={st.statsDivider} />
            <StatBox num={metrics.totalAttempts}           label="Total Tries"      numColor="#a78bfa" />
            <div style={st.statsDivider} />
            <StatBox num={metrics.overallGrade.label}      label="Readiness Level"  numColor={metrics.overallGrade.color} />
          </div>

          {/* ── CTA ── */}
          <div style={{ textAlign: 'center', padding: '28px 0 56px' }}>
            <button
              style={st.primaryBtn}
              onClick={() => dispatch({ type: 'SELECT_DISASTER', payload: activeDisaster })}
            >
              🚀 Continue Training
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tiny helper components ──────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 14, fontWeight: 700, color: '#f8fafc',
      textTransform: 'uppercase', letterSpacing: 1.5,
      marginBottom: 16, paddingLeft: 12,
      borderLeft: '3px solid #3b82f6',
    }}>
      {children}
    </h2>
  )
}

function StatLine({ label, val, col }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#64748b', minWidth: 80 }}>{label}</span>
      <span style={{ color: col || '#e2e8f0', fontWeight: 700 }}>{val}</span>
    </div>
  )
}

function MiniStat({ label, val }) {
  return (
    <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '5px 0' }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{val}</div>
      <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
    </div>
  )
}

function StatBox({ num, label, numColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 80 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: numColor || '#f8fafc', lineHeight: 1 }}>{num}</span>
      <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{label}</span>
    </div>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = {
  page: {
    minHeight: '100vh',
    padding: '0 28px 60px',
    maxWidth: 980,
    margin: '0 auto',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 0 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    marginBottom: 28,
  },
  pageTitle: {
    fontSize: 20, fontWeight: 800, color: '#f8fafc',
    background: 'linear-gradient(90deg,#60a5fa,#a78bfa)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, padding: '6px 0',
  },
  resetBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
    color: '#f87171', cursor: 'pointer', borderRadius: 8,
    fontSize: 13, padding: '6px 14px', fontWeight: 600,
  },
  tabs: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, flexWrap: 'wrap',
  },
  tab: {
    padding: '8px 22px', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
    cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
  },
  tabNote: { fontSize: 12, color: '#334155', marginLeft: 'auto' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 0', textAlign: 'center',
  },
  primaryBtn: {
    padding: '14px 48px', fontSize: 17, fontWeight: 700,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(37,99,235,0.4)', marginTop: 24,
  },
  heroRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36,
  },
  heroCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 24,
  },
  cardLabel: {
    fontSize: 12, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 1.4, margin: 0,
  },
  phaseGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: 16, marginBottom: 36,
  },
  phaseCard: {
    borderRadius: 14, padding: 20, border: '1px solid',
    transition: 'transform 0.15s',
  },
  phaseSection: { marginBottom: 20 },
  phaseSectionHeader: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderRadius: 10, border: '1px solid',
    cursor: 'pointer', marginBottom: 0, transition: 'opacity 0.15s',
  },
  moduleList: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    overflow: 'hidden',
    marginBottom: 8,
  },
  moduleRow: {
    display: 'flex', alignItems: 'center', padding: '13px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.1s',
    flexWrap: 'wrap', gap: 10,
  },
  playBtn: {
    background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa', cursor: 'pointer', borderRadius: 6,
    fontSize: 12, padding: '5px 12px', fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  recoGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36,
  },
  recoCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 22,
  },
  statsBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16, padding: '22px 24px', marginBottom: 28,
    flexWrap: 'wrap', gap: 12,
  },
  statsDivider: {
    width: 1, height: 44, background: 'rgba(255,255,255,0.08)',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  modal: {
    background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 18, padding: '36px 44px', textAlign: 'center', maxWidth: 380,
  },
  dangerBtn: {
    padding: '10px 20px',
    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
    color: '#f87171', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
  cancelBtn: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
  },
}
