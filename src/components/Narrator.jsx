import React, { useEffect, useState, useRef, useCallback } from 'react';

const CHARACTERS = {
  broadcaster: { name: 'Emergency Broadcaster', img: '/assets/avatars/broadcaster.png' },
  neighbor: { name: 'Helpful Neighbor', img: '/assets/avatars/neighbor.png' },
  doctor: { name: 'Head Doctor', img: '/assets/avatars/doctor.png' },
  dispatcher: { name: 'Rescue Dispatcher', img: '/assets/avatars/dispatcher.png' }
}

export default function Narrator({ characterKey, text, visible, emotion = 'neutral', autoHide = false, onComplete }) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [hasSpoken, setHasSpoken] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)
  const utteranceRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  // Wait for voices to load (Chrome loads them async)
  useEffect(() => {
    const synth = synthRef.current
    const checkVoices = () => {
      if (synth.getVoices().length > 0) {
        setVoicesReady(true)
      }
    }
    checkVoices()
    synth.addEventListener('voiceschanged', checkVoices)
    return () => synth.removeEventListener('voiceschanged', checkVoices)
  }, [])

  // Cancel speech when component unmounts or becomes invisible
  useEffect(() => {
    if (!visible) {
      const synth = synthRef.current
      if (synth.speaking) {
        synth.cancel()
        setIsSpeaking(false)
      }
      setHasSpoken(false) // reset so it can speak again next time it appears
    }
    return () => {
      const synth = synthRef.current
      if (synth.speaking) synth.cancel()
    }
  }, [visible])

  // Speak function — must be called from a user click event handler
  const speak = useCallback(() => {
    const synth = window.speechSynthesis
    if (!text || isSpeaking || !synth) return

    // Unstick routine for Chrome/Safari bugs
    synth.cancel()
    synth.resume()

    const utterance = new SpeechSynthesisUtterance(text)
    
    // Emotion-based TTS tweaks
    let basePitch = (characterKey === 'doctor' || characterKey === 'broadcaster') ? 0.9 : 1.1
    let baseRate = 1.0
    
    if (emotion === 'urgent') {
      basePitch += 0.2
      baseRate = 1.25
    } else if (emotion === 'calm') {
      basePitch -= 0.1
      baseRate = 0.9
    }

    utterance.rate = baseRate
    utterance.pitch = basePitch

    // Ensure we use a voice if available
    const voices = synth.getVoices()
    if (voices.length > 0) {
      const preferred = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) 
        || voices.find(v => v.lang.startsWith('en') && !v.localService)
        || voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred
    }

    utterance.onstart = () => {
      setIsSpeaking(true)
    }
    
    utterance.onend = () => {
      setIsSpeaking(false)
      setHasSpoken(true)
      if (onComplete) onComplete()
      
      // Auto-hide logic if requested (useful for in-game mid-play narrations)
      if (autoHide) {
        setTimeout(() => {
          if (onComplete) onComplete('hidden')
        }, 1500)
      }
    }
    
    utterance.onerror = (e) => {
      console.warn('Speech error:', e)
      setIsSpeaking(false)
      setHasSpoken(true)
    }

    // Keep reference to prevent garbage collection
    utteranceRef.current = utterance
    window._globalUtterances = window._globalUtterances || []
    window._globalUtterances.push(utterance)

    setTimeout(() => {
      synth.speak(utterance)
    }, 50)
  }, [text, characterKey, onComplete, isSpeaking])

  const charInfo = CHARACTERS[characterKey] || CHARACTERS.neighbor

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      width: 340,
      display: 'flex',
      alignItems: 'flex-end',
      flexDirection: 'row-reverse', // Flip so avatar is on the left, bubble on the right
      gap: 12,
      zIndex: 9999,
      animation: 'narratorSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards'
    }}>
      <style>{`
        @keyframes narratorSlideIn {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes narratorPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
        }
        @keyframes speakerBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes narratorShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-2deg); }
          50% { transform: translateX(4px) rotate(2deg); }
          75% { transform: translateX(-4px) rotate(-1deg); }
        }
      `}</style>

      {/* Speech Bubble */}
      <div style={{
        background: emotion === 'urgent' ? '#fef2f2' : '#fff',
        borderRadius: '16px 16px 16px 0',
        padding: '12px 16px',
        boxShadow: emotion === 'urgent' ? '0 4px 20px rgba(239,68,68,0.4)' : '0 4px 20px rgba(0,0,0,0.3)',
        position: 'relative',
        flex: 1,
        border: `2px solid ${emotion === 'urgent' ? '#fca5a5' : '#e2e8f0'}`,
        marginBottom: 40,
        pointerEvents: 'auto',
        animation: emotion === 'urgent' ? 'narratorShake 0.4s ease-in-out infinite' : 'none',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 12, color: emotion === 'urgent' ? '#dc2626' : '#3b82f6', marginBottom: 4, textTransform: 'uppercase' }}>
          {charInfo.name} {emotion === 'urgent' ? '⚠️' : ''}
        </div>
        <div style={{ color: emotion === 'urgent' ? '#991b1b' : '#1e293b', fontSize: 14, lineHeight: 1.4, marginBottom: isSpeaking || hasSpoken ? 0 : 8, fontWeight: emotion === 'urgent' ? 600 : 400 }}>
          {text}
        </div>

        {/* Play button — user gesture triggers speech */}
        {!isSpeaking && !hasSpoken && (
          <button
            onClick={speak}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 8, padding: '6px 14px', borderRadius: 999,
              border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
              animation: 'speakerBounce 1.5s ease-in-out infinite',
              pointerEvents: 'auto',
            }}
          >
            🔊 Listen
          </button>
        )}

        {isSpeaking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#22c55e', fontSize: 11, fontWeight: 700 }}>
            <span style={{ animation: 'speakerBounce 0.6s ease-in-out infinite' }}>🔊</span> Speaking...
          </div>
        )}

        {hasSpoken && !isSpeaking && (
          <button
            onClick={() => { setHasSpoken(false); setTimeout(speak, 50) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              marginTop: 8, padding: '4px 10px', borderRadius: 999,
              border: '1px solid #cbd5e1', background: '#f8fafc',
              color: '#64748b', fontWeight: 600, fontSize: 10, cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            🔄 Replay
          </button>
        )}

        {/* Tail (Left side) */}
        <div style={{
          position: 'absolute', bottom: -10, left: 10,
          width: 0, height: 0,
          borderTop: `10px solid ${emotion === 'urgent' ? '#fef2f2' : '#fff'}`, borderLeft: '10px solid transparent'
        }}/>
      </div>

      {/* Avatar */}
      <div
        onClick={!hasSpoken && !isSpeaking ? speak : undefined}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          border: `4px solid ${isSpeaking ? (emotion === 'urgent' ? '#ef4444' : '#22c55e') : '#cbd5e1'}`,
          overflow: 'hidden',
          boxShadow: isSpeaking ? `0 0 20px ${emotion === 'urgent' ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.5)'}` : '0 4px 10px rgba(0,0,0,0.3)',
          transition: 'all 0.3s',
          transform: isSpeaking ? 'scale(1.05)' : 'scale(1)',
          backgroundColor: '#f1f5f9',
          cursor: !hasSpoken && !isSpeaking ? 'pointer' : 'default',
          animation: isSpeaking ? 'narratorPulse 1.5s ease-in-out infinite' : 'none',
          pointerEvents: 'auto',
          flexShrink: 0,
        }}
      >
        <img src={charInfo.img} alt={charInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </div>
  )
}
