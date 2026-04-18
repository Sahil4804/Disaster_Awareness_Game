import { useGame } from '../context/GameContext'

export default function MainMenu() {
  const { state, dispatch } = useGame()

  // Show a quick summary if there's any score data
  const totalCompleted = state.completedModules.length
  const hasData = Object.keys(state.scores).length > 0

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconRow}>🌊 🔥 🌀 🏚️</div>
        <h1 style={styles.title}>Disaster Survival Simulator</h1>
        <p style={styles.subtitle}>Learn. Prepare. Survive.</p>
        <p style={styles.desc}>
          Interactive modules that teach real survival skills through hands-on scenarios.
          Every decision matters — just like in a real disaster.
        </p>

        <div style={styles.stats}>
          <div style={styles.stat}><span style={styles.statNum}>14</span><span style={styles.statLabel}>Modules</span></div>
          <div style={styles.stat}><span style={styles.statNum}>4</span><span style={styles.statLabel}>Phases</span></div>
          <div style={styles.stat}><span style={styles.statNum}>50+</span><span style={styles.statLabel}>Skills</span></div>
        </div>

        {/* If user has played before, show a quick progress hint */}
        {hasData && (
          <div style={styles.progressHint}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ color: '#cbd5e1', fontSize: 13 }}>
              You've completed{' '}
              <strong style={{ color: '#60a5fa' }}>{totalCompleted}/14</strong>{' '}
              modules
            </span>
            <button
              style={styles.metricsLinkBtn}
              onClick={() => dispatch({ type: 'NAVIGATE', payload: 'metrics' })}
            >
              View Progress →
            </button>
          </div>
        )}

        <button
          style={styles.startBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'disasterSelect' })}
        >
          🚨 Start Training
        </button>

        <button
          style={styles.metricsBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'metrics' })}
        >
          📊 My Readiness Dashboard
        </button>

        <button
          style={styles.presentationBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'presentation' })}
        >
          🎞️ Project Presentation
        </button>

        <button
          style={styles.ironTideBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'ironTide' })}
        >
          🩸 Operation: Iron Tide — Immersive Triage Sim
        </button>

        <button
          style={styles.sosBtn}
          onClick={() => dispatch({ type: 'NAVIGATE', payload: 'sosGame' })}
        >
          🪞 Signal for Survival — SOS Signaling Game
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 24,
    background: 'linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0f172a 100%)',
  },
  card: {
    textAlign: 'center', maxWidth: 580, padding: '56px 48px',
    background: 'rgba(255,255,255,0.05)', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
  },
  iconRow: { fontSize: 40, letterSpacing: 12, marginBottom: 20 },
  title: {
    fontSize: 38, fontWeight: 800, marginBottom: 8,
    background: 'linear-gradient(90deg, #60a5fa, #38bdf8, #22d3ee)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  subtitle: { fontSize: 20, color: '#94a3b8', marginBottom: 20, fontWeight: 500 },
  desc: { fontSize: 15, lineHeight: 1.8, color: '#cbd5e1', marginBottom: 28 },
  stats: { display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 28 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: 800, color: '#60a5fa' },
  statLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  progressHint: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 10, marginBottom: 20,
    background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)',
    flexWrap: 'wrap',
  },
  metricsLinkBtn: {
    background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer',
    fontSize: 13, fontWeight: 700, textDecoration: 'underline',
  },

  startBtn: {
    display: 'block', width: '100%',
    padding: '16px 0', fontSize: 18, fontWeight: 700,
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
    transition: 'transform 0.15s', boxShadow: '0 4px 24px rgba(37,99,235,0.45)',
    marginBottom: 12,
  },
  metricsBtn: {
    display: 'block', width: '100%',
    padding: '14px 0', fontSize: 16, fontWeight: 600,
    background: 'rgba(167,139,250,0.12)',
    color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)',
    borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s', marginBottom: 10,
  },
  presentationBtn: {
    display: 'block', width: '100%',
    padding: '12px 0', fontSize: 14, fontWeight: 600,
    background: 'rgba(34,197,94,0.08)',
    color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s', marginBottom: 10,
  },
  ironTideBtn: {
    display: 'block', width: '100%',
    padding: '14px 0', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.08))',
    color: '#f87171', border: '1px solid rgba(220,38,38,0.35)',
    borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 0 20px rgba(220,38,38,0.15)',
    marginBottom: 10,
  },
  sosBtn: {
    display: 'block', width: '100%',
    padding: '14px 0', fontSize: 15, fontWeight: 700,
    background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(6,182,212,0.08))',
    color: '#22d3ee', border: '1px solid rgba(6,182,212,0.35)',
    borderRadius: 12, cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 0 20px rgba(6,182,212,0.15)',
  },
}
