import { useGame } from '../context/GameContext'

const disasters = [
  { id: 'flood', name: 'Flood', emoji: '🌊', color: '#3b82f6', desc: 'Flash floods, rising water, escape & rescue', modules: 14, available: true },
  { id: 'earthquake', name: 'Earthquake', emoji: '🏚️', color: '#b45309', desc: 'Coming soon', modules: 0, available: false },
  { id: 'wildfire', name: 'Wildfire', emoji: '🔥', color: '#ef4444', desc: 'Coming soon', modules: 0, available: false },
  { id: 'hurricane', name: 'Hurricane', emoji: '🌀', color: '#8b5cf6', desc: 'Coming soon', modules: 0, available: false },
]

export default function DisasterSelect() {
  const { dispatch } = useGame()

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => dispatch({ type: 'BACK_TO_MENU' })}>
        ← Main Menu
      </button>
      <h2 style={styles.heading}>Select a Disaster</h2>
      <p style={styles.sub}>Choose a scenario to begin your survival training.</p>
      <div style={styles.grid}>
        {disasters.map((d) => (
          <button
            key={d.id}
            style={{
              ...styles.card,
              borderColor: d.available ? d.color : '#334155',
              opacity: d.available ? 1 : 0.4,
              cursor: d.available ? 'pointer' : 'not-allowed',
            }}
            disabled={!d.available}
            onClick={() => dispatch({ type: 'SELECT_DISASTER', payload: d.id })}
          >
            <span style={{ fontSize: 52 }}>{d.emoji}</span>
            <span style={styles.name}>{d.name}</span>
            <span style={styles.desc}>{d.desc}</span>
            <span style={styles.count}>
              {d.available ? `${d.modules} modules` : '🔒 Locked'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh', padding: '48px 24px', maxWidth: 800, margin: '0 auto',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#60a5fa',
    cursor: 'pointer', fontSize: 14, marginBottom: 32, fontWeight: 600,
  },
  heading: { fontSize: 30, fontWeight: 700, marginBottom: 8, color: '#f8fafc' },
  sub: { color: '#94a3b8', marginBottom: 32, fontSize: 15 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 20,
  },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: 28, background: 'rgba(255,255,255,0.05)', borderRadius: 16,
    border: '2px solid', transition: 'transform 0.15s',
  },
  name: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  desc: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 },
  count: { fontSize: 12, color: '#64748b', fontWeight: 600 },
}
