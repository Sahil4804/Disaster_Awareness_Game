import { useGame } from '../context/GameContext'

const floodModules = [
  { id: 1,  title: 'The 60-Second Go-Bag', phase: 'Preparedness', icon: '🎒' },
  { id: 2,  title: 'Home Defense',          phase: 'Preparedness', icon: '🏠' },
  { id: 3,  title: 'Yard Lockdown',         phase: 'Preparedness', icon: '⛓️' },
  { id: 4,  title: 'The Sinking Car',       phase: 'Response',     icon: '🚗' },
  { id: 5,  title: 'Treacherous Trek',      phase: 'Response',     icon: '🚶' },
  { id: 6,  title: 'First Responder',       phase: 'Survival',     icon: '🩹' },
  { id: 7,  title: 'Camp Safe Haven',       phase: 'Survival',     icon: '⛺' },
  { id: 8,  title: 'SOS Signaling',         phase: 'Survival',     icon: '🪞' },
  { id: 9,  title: 'Toxic Cleanup',         phase: 'Recovery',     icon: '☣️' },
  { id: 10, title: 'Invisible Trap',        phase: 'Recovery',     icon: '⚡' },
  { id: 11, title: 'Toxic Soup',            phase: 'Recovery',     icon: '🧪' },
  { id: 12, title: 'Wall of Water',         phase: 'Recovery',     icon: '🌊' },
  { id: 13, title: 'Calm Mind',             phase: 'Recovery',     icon: '🧠' },
  { id: 14, title: 'The Swarm',             phase: 'Recovery',     icon: '🦟' },
]

const phaseColors = {
  Preparedness: '#3b82f6',
  Response:     '#f59e0b',
  Survival:     '#22c55e',
  Recovery:     '#a855f7',
}

const phaseEmojis = {
  Preparedness: '🛡️',
  Response:     '🚨',
  Survival:     '⛺',
  Recovery:     '🔧',
}

function scoreColor(s) {
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#facc15'
  if (s >= 40) return '#f97316'
  return '#ef4444'
}

export default function ModuleSelect() {
  const { state, dispatch } = useGame()
  const disaster = state.selectedDisaster
  const modules  = disaster === 'flood' ? floodModules : []
  const phases   = [...new Set(modules.map(m => m.phase))]
  const totalCompleted = state.completedModules.filter(k => k.startsWith(disaster)).length

  // Compute overall average score for the disaster
  const scoredKeys = modules.map(m => `${disaster}-${m.id}`).filter(k => state.scores[k])
  const avgScore = scoredKeys.length
    ? Math.round(scoredKeys.reduce((s, k) => s + (state.scores[k]?.score || 0), 0) / scoredKeys.length)
    : null

  return (
    <div style={styles.container}>
      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={() => dispatch({ type: 'BACK_TO_DISASTERS' })}>
          ← Disasters
        </button>
        <button
          style={styles.metricsBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'metrics' })}
        >
          📊 My Dashboard
        </button>
      </div>

      <h2 style={styles.heading}>
        🌊 {disaster?.charAt(0).toUpperCase() + disaster?.slice(1)} Survival Course
      </h2>
      <p style={styles.sub}>14 modules across 4 phases. Complete them all to master flood survival.</p>

      {/* Progress bar */}
      <div style={styles.progressRow}>
        <div style={styles.progressOuter}>
          <div style={{ ...styles.progressInner, width: `${(totalCompleted / 14) * 100}%` }} />
        </div>
        <span style={styles.progressText}>
          {totalCompleted}/14 passed
          {avgScore !== null && (
            <span style={{ marginLeft: 14, color: scoreColor(avgScore) }}>
              · avg {avgScore}%
            </span>
          )}
        </span>
      </div>

      {phases.map(phase => (
        <div key={phase} style={{ marginBottom: 36 }}>
          <h3 style={{ ...styles.phaseTitle, color: phaseColors[phase] }}>
            {phaseEmojis[phase]} {phase}
          </h3>
          <div style={styles.grid}>
            {modules
              .filter(m => m.phase === phase)
              .map(m => {
                const key       = `${disaster}-${m.id}`
                const completed = state.completedModules.includes(key)
                const scoreData = state.scores[key]
                const score     = scoreData?.score
                const attempts  = scoreData?.attempts || 0
                const failed    = scoreData && !completed

                return (
                  <button
                    key={m.id}
                    style={{
                      ...styles.card,
                      borderColor: completed
                        ? '#22c55e'
                        : failed
                          ? 'rgba(239,68,68,0.5)'
                          : phaseColors[m.phase],
                      background: completed
                        ? 'rgba(34,197,94,0.07)'
                        : failed
                          ? 'rgba(239,68,68,0.05)'
                          : 'rgba(255,255,255,0.04)',
                    }}
                    onClick={() => dispatch({ type: 'SELECT_MODULE', payload: m.id })}
                  >
                    <span style={{ fontSize: 32 }}>{m.icon}</span>
                    <span style={styles.modNum}>Module {m.id}</span>
                    <span style={styles.modTitle}>{m.title}</span>

                    {/* Score bar if attempted */}
                    {score !== undefined && (
                      <div style={{ width: '100%', marginTop: 4 }}>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: scoreColor(score), borderRadius: 4 }} />
                        </div>
                        <div style={{ fontSize: 11, color: scoreColor(score), fontWeight: 700, marginTop: 3 }}>
                          {score}%
                          {attempts > 1 && <span style={{ color: '#64748b', fontWeight: 400 }}> · {attempts} tries</span>}
                        </div>
                      </div>
                    )}

                    {completed && <span style={styles.badgePassed}>✅ Passed</span>}
                    {failed    && <span style={styles.badgeFailed}>❌ Failed</span>}
                    {!scoreData && <span style={styles.badgeNew}>▶ Start</span>}
                  </button>
                )
              })}
          </div>
        </div>
      ))}

      {/* Bottom metrics nudge */}
      {scoredKeys.length > 0 && (
        <div style={styles.metricsBanner}>
          <span>📊 You've played {scoredKeys.length} module{scoredKeys.length !== 1 ? 's' : ''}.</span>
          <button
            style={styles.metricsInlineBtn}
            onClick={() => dispatch({ type: 'NAVIGATE', payload: 'metrics' })}
          >
            See your full readiness report →
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', padding: '40px 24px 60px', maxWidth: 960, margin: '0 auto' },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 28,
  },
  backBtn: {
    background: 'none', border: 'none', color: '#60a5fa',
    cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  metricsBtn: {
    padding: '8px 18px', borderRadius: 20,
    background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)',
    color: '#a78bfa', cursor: 'pointer', fontSize: 13, fontWeight: 700,
    transition: 'all 0.15s',
  },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 6, color: '#f8fafc' },
  sub: { color: '#94a3b8', marginBottom: 18, fontSize: 14 },
  progressRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 },
  progressOuter: { flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' },
  progressInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
    borderRadius: 4, transition: 'width 0.5s',
  },
  progressText: { fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', fontWeight: 600 },
  phaseTitle: {
    fontSize: 14, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 14,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14,
  },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: '20px 14px', borderRadius: 14,
    border: '2px solid', cursor: 'pointer',
    transition: 'all 0.15s', position: 'relative',
    textAlign: 'center',
  },
  modNum: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 },
  modTitle: { fontSize: 12, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 },
  badgePassed: {
    fontSize: 10, color: '#4ade80', fontWeight: 700,
    background: 'rgba(34,197,94,0.12)', padding: '2px 7px', borderRadius: 4, marginTop: 2,
  },
  badgeFailed: {
    fontSize: 10, color: '#f87171', fontWeight: 700,
    background: 'rgba(239,68,68,0.12)', padding: '2px 7px', borderRadius: 4, marginTop: 2,
  },
  badgeNew: {
    fontSize: 10, color: '#60a5fa', fontWeight: 700,
    background: 'rgba(59,130,246,0.12)', padding: '2px 7px', borderRadius: 4, marginTop: 2,
  },
  metricsBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
    padding: '14px 20px', borderRadius: 12,
    background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)',
    color: '#94a3b8', fontSize: 13, flexWrap: 'wrap',
  },
  metricsInlineBtn: {
    background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, textDecoration: 'underline',
  },
}
