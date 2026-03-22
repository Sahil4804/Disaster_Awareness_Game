import { useState } from 'react'

/**
 * SourcesPanel — Floating corner widget (position: fixed, bottom-right).
 * Shows official citations that back the scoring criteria for the current module.
 * Available during play AND after submission.
 */
export default function SourcesPanel({ moduleData }) {
  const [open, setOpen] = useState(false)

  if (!moduleData) return null

  const { moduleTitle, rationale, sources } = moduleData

  return (
    <>
      {/* ── Floating toggle button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="View official sources & scoring criteria"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '9px 16px',
          borderRadius: 24,
          background: open
            ? 'linear-gradient(135deg, #1e3a5f, #1e293b)'
            : 'rgba(15,23,42,0.92)',
          border: `1px solid ${open ? '#3b82f6' : 'rgba(96,165,250,0.35)'}`,
          color: open ? '#60a5fa' : '#94a3b8',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          boxShadow: open
            ? '0 0 20px rgba(59,130,246,0.35), 0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 14px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s',
          letterSpacing: 0.3,
        }}
      >
        <span style={{ fontSize: 16 }}>📋</span>
        {open ? 'Hide Sources' : 'Official Sources'}
        <span style={{
          fontSize: 10,
          background: 'rgba(59,130,246,0.25)',
          color: '#60a5fa',
          borderRadius: 4,
          padding: '1px 5px',
          fontWeight: 800,
        }}>
          {sources.length}
        </span>
      </button>

      {/* ── Sliding panel ── */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 72,
          right: 20,
          zIndex: 199,
          width: 350,
          maxHeight: '72vh',
          overflowY: 'auto',
          background: 'rgba(10,18,35,0.97)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 16,
          boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          fontFamily: 'system-ui, sans-serif',
        }}>

          {/* Panel header */}
          <div style={{
            padding: '16px 18px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            position: 'sticky',
            top: 0,
            background: 'rgba(10,18,35,0.98)',
            borderRadius: '16px 16px 0 0',
            backdropFilter: 'blur(16px)',
            zIndex: 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, margin: 0, fontWeight: 700 }}>
                  Official Standards
                </p>
                <h3 style={{ color: '#f8fafc', fontSize: 14, margin: '3px 0 0', fontWeight: 700 }}>
                  📋 {moduleTitle}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#64748b', borderRadius: 6, padding: '3px 8px',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Rationale box */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 6px', fontWeight: 700 }}>
              ⚖️ Scoring Rationale
            </p>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.7 }}>
              {rationale}
            </p>
          </div>

          {/* Source cards */}
          <div style={{ padding: '12px 18px 18px' }}>
            <p style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 10px', fontWeight: 700 }}>
              📚 Source Documents
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sources.map((src, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderLeft: `3px solid ${src.orgColor}`,
                    borderRadius: '0 10px 10px 0',
                    padding: '12px 14px',
                  }}
                >
                  {/* Org name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{src.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: src.orgColor,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {src.org}
                    </span>
                  </div>

                  {/* Document title */}
                  <p style={{
                    color: '#e2e8f0', fontSize: 12, fontWeight: 700,
                    margin: '0 0 6px', lineHeight: 1.4,
                  }}>
                    {src.title}
                  </p>

                  {/* Key excerpt */}
                  <p style={{
                    color: '#64748b', fontSize: 11, margin: '0 0 8px', lineHeight: 1.65,
                    borderLeft: '2px solid rgba(255,255,255,0.06)',
                    paddingLeft: 8,
                    fontStyle: 'italic',
                  }}>
                    {src.excerpt}
                  </p>

                  {/* Link */}
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      color: '#3b82f6', fontSize: 11, textDecoration: 'none',
                      borderBottom: '1px solid rgba(59,130,246,0.3)',
                      paddingBottom: 1,
                      wordBreak: 'break-all',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                    onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}
                  >
                    <span>↗</span>
                    <span>{src.url}</span>
                  </a>
                </div>
              ))}
            </div>

            {/* Footer disclaimer */}
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: 8,
            }}>
              <p style={{ color: '#475569', fontSize: 10, margin: 0, lineHeight: 1.6, textAlign: 'center' }}>
                🔗 All sources are from official government or internationally recognised humanitarian organisations.
                Links open in a new tab.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
