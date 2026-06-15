import { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/Timer.css'

const MODES = {
  work:  { label: 'Sesión de trabajo', mins: 25 },
  short: { label: 'Descanso corto',    mins: 5  },
  long:  { label: 'Descanso largo',    mins: 15 },
}

const CIRC = 553  // 2 * π * 88

function fmt(s) {
  const m  = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

function playBell() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start()
    osc.stop(ctx.currentTime + 0.8)
  } catch(e) {}
}

export default function Timer({ onPomComplete, onFocusTick, pomsDone, quote }) {
  const [mode, setMode]           = useState('work')
  const [remaining, setRemaining] = useState(25 * 60)
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [running, setRunning]     = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [ambientActive, setAmbientActive] = useState(null)

  const intervalRef  = useRef(null)
  const ambientRef   = useRef(null)
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining

  const nextMode = useCallback((current, poms) => {
    if (current !== 'work') return 'work'
    return (poms + 1) % 4 === 0 ? 'long' : 'short'
  }, [])

  const applyMode = useCallback((m) => {
    const secs = MODES[m].mins * 60
    setMode(m)
    setTotalSecs(secs)
    setRemaining(secs)
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [])

  // Title update
  useEffect(() => {
    document.title = running ? `${fmt(remaining)} — FocusFlow` : 'FocusFlow'
  }, [remaining, running])

  const stopTimer = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
  }

  const startTimer = () => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          playBell()
          if (mode === 'work') {
            onPomComplete()
            showNotif('🍅 ¡Pomodoro completado! Tómate un descanso.')
            const nm = nextMode('work', pomsDone)
            setTimeout(() => applyMode(nm), 300)
          } else {
            showNotif('✅ ¡Descanso terminado! Listo para trabajar.')
            setTimeout(() => applyMode('work'), 300)
          }
          return 0
        }
        if (mode === 'work') onFocusTick()
        return prev - 1
      })
    }, 1000)
  }

  const toggleTimer = () => running ? stopTimer() : startTimer()

  const resetTimer = () => {
    stopTimer()
    setRemaining(totalSecs)
  }

  const handleModeChange = (m) => {
    if (running) return
    applyMode(m)
  }

  // Ambient sound
  const toggleAmbient = (type) => {
    if (ambientRef.current) {
      try { ambientRef.current.close() } catch(e) {}
      ambientRef.current = null
    }
    if (ambientActive === type) { setAmbientActive(null); return }
    setAmbientActive(type)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ambientRef.current = ctx
      const buf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src  = ctx.createBufferSource()
      src.buffer = buf; src.loop = true
      const filt = ctx.createBiquadFilter()
      const gain = ctx.createGain()
      if (type === 'rain')       { filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 0.5; gain.gain.value = 0.08 }
      else if (type === 'cafe')  { filt.type = 'bandpass'; filt.frequency.value = 300; filt.Q.value = 1;   gain.gain.value = 0.04 }
      else                       { filt.type = 'lowpass';  filt.frequency.value = 200;                     gain.gain.value = 0.06 }
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination)
      src.start()
    } catch(e) {}
  }

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    if (ambientRef.current) try { ambientRef.current.close() } catch(e) {}
  }, [])

  const pct    = remaining / totalSecs
  const offset = CIRC * (1 - pct)

  const pomDots = Array.from({ length: 8 }, (_, i) => ({
    done: i < pomsDone,
    current: i === pomsDone,
  }))

  return (
    <>
      <div className="card timer-card">
        {/* MODE TABS */}
        <div className="mode-tabs">
          {Object.entries(MODES).map(([key, val]) => (
            <button
              key={key}
              className={`mode-tab ${mode === key ? 'active' : ''}`}
              onClick={() => handleModeChange(key)}
            >
              {val.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* CIRCLE */}
        <div className="circle-wrap">
          <svg className="timer-circle" width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            <circle className="circle-bg" cx="100" cy="100" r="88" />
            <circle
              className="circle-progress"
              cx="100" cy="100" r="88"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="timer-display">
            <div className="timer-time">{fmt(remaining)}</div>
            <div className="timer-session-label">{MODES[mode].label}</div>
          </div>
        </div>

        {/* POM DOTS */}
        <div className="pomodoro-count">
          {pomDots.map((d, i) => (
            <div key={i} className={`pom-dot ${d.done ? 'done' : ''} ${d.current && running ? 'current' : ''}`} />
          ))}
        </div>

        {/* CONTROLS */}
        <div className="timer-controls">
          <button className="btn btn-icon" onClick={resetTimer} title="Reiniciar">↺</button>
          <button className="btn btn-primary" onClick={toggleTimer}>
            {running ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button className="btn btn-icon" onClick={() => setFocusOpen(true)} title="Modo Enfoque">⛶</button>
        </div>

        {/* AMBIENT */}
        <div className="ambient-row">
          <span className="ambient-label">Ambiente:</span>
          {[
            { key: 'rain',   label: '🌧 Lluvia' },
            { key: 'cafe',   label: '☕ Café'   },
            { key: 'forest', label: '🌲 Bosque' },
          ].map(a => (
            <button
              key={a.key}
              className={`amb-btn ${ambientActive === a.key ? 'active' : ''}`}
              onClick={() => toggleAmbient(a.key)}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* QUOTE */}
        <div className="motivational">"{quote}"</div>
      </div>

      {/* FOCUS OVERLAY */}
      {focusOpen && (
        <div className="focus-overlay active">
          <div className="focus-mode-label">Modo Enfoque</div>
          <div className="focus-time">{fmt(remaining)}</div>
          <div className="focus-task-label">Concentrado en tu trabajo</div>
          <div className="focus-pom-dots">
            {pomDots.map((d, i) => (
              <div key={i} className={`pom-dot ${d.done ? 'done' : ''}`}
                style={{ width: '8px', height: '8px' }} />
            ))}
          </div>
          <button className="focus-exit" onClick={() => setFocusOpen(false)}>
            ✕ Salir del modo enfoque
          </button>
        </div>
      )}
    </>
  )
}

function showNotif(msg) {
  const n = document.createElement('div')
  n.className = 'notification'
  n.textContent = msg
  document.body.appendChild(n)
  setTimeout(() => n.remove(), 3500)
}