import { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/Timer.css'

const MODES = {
  work:  { label: 'Sesión de trabajo', tab: '🎯 Trabajo',  defaultMins: 25 },
  short: { label: 'Descanso corto',    tab: '☕ Descanso', defaultMins: 5  },
  long:  { label: 'Descanso largo',    tab: '🛌 Largo',    defaultMins: 15 },
}

const WORK_DURATIONS  = [15, 20, 25, 30, 45, 60]
const SHORT_DURATIONS = [5, 10, 15]
const LONG_DURATIONS  = [15, 20, 30]

const CIRC = 553

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
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(); osc.stop(ctx.currentTime + 0.8)
  } catch(e) {}
}

export default function Timer({ onPomComplete, onFocusTick, pomsDone, quote }) {
  const [mode, setMode]               = useState('work')
  const [workMins, setWorkMins]       = useState(25)
  const [shortMins, setShortMins]     = useState(5)
  const [longMins, setLongMins]       = useState(15)
  const [remaining, setRemaining]     = useState(25 * 60)
  const [totalSecs, setTotalSecs]     = useState(25 * 60)
  const [running, setRunning]         = useState(false)
  const [focusOpen, setFocusOpen]     = useState(false)
  const [ambientActive, setAmbientActive] = useState(null)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [showSettings, setShowSettings]   = useState(false)

  const intervalRef   = useRef(null)
  const ambientRef    = useRef(null)
  const modeRef       = useRef(mode)
  const pomsDoneRef   = useRef(pomsDone)
  modeRef.current     = mode
  pomsDoneRef.current = pomsDone

  // Cargar preferencias guardadas
  useEffect(() => {
    const savedWork  = parseInt(localStorage.getItem('ff_work_mins')  || '25')
    const savedShort = parseInt(localStorage.getItem('ff_short_mins') || '5')
    const savedLong  = parseInt(localStorage.getItem('ff_long_mins')  || '15')
    setWorkMins(savedWork)
    setShortMins(savedShort)
    setLongMins(savedLong)
    setTotalSecs(savedWork * 60)
    setRemaining(savedWork * 60)
  }, [])

  useEffect(() => {
    document.title = running ? `${fmt(remaining)} — FocusFlow` : 'FocusFlow'
  }, [remaining, running])

  const getMins = useCallback((m) => {
    if (m === 'work')  return workMins
    if (m === 'short') return shortMins
    return longMins
  }, [workMins, shortMins, longMins])

  const applyMode = useCallback((m, customMins) => {
    const mins = customMins ?? getMins(m)
    const secs = mins * 60
    setMode(m); setTotalSecs(secs); setRemaining(secs)
    setRunning(false); clearInterval(intervalRef.current)
  }, [getMins])

  const stopTimer = () => { clearInterval(intervalRef.current); setRunning(false) }

  const startTimer = () => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          playBell()
          if (modeRef.current === 'work') {
            setShowConfirm(true)
          } else {
            showNotif('✅ ¡Descanso terminado! Listo para trabajar.')
            setTimeout(() => applyMode('work'), 300)
          }
          return 0
        }
        if (modeRef.current === 'work') onFocusTick()
        return prev - 1
      })
    }, 1000)
  }

  const handleConfirm = (completed) => {
    setShowConfirm(false)
    onPomComplete(completed)
    const poms = pomsDoneRef.current + 1
    const nm   = poms % 4 === 0 ? 'long' : 'short'
    showNotif(completed
      ? '🍅 ¡Pomodoro completado! Tómate un descanso.'
      : '📝 Pomodoro registrado. ¡Sigue adelante!')
    setTimeout(() => applyMode(nm), 300)
  }

  const handleSetDuration = (m, mins) => {
    if (m === 'work')  { setWorkMins(mins);  localStorage.setItem('ff_work_mins',  mins) }
    if (m === 'short') { setShortMins(mins); localStorage.setItem('ff_short_mins', mins) }
    if (m === 'long')  { setLongMins(mins);  localStorage.setItem('ff_long_mins',  mins) }
    if (m === mode && !running) applyMode(m, mins)
  }

  const toggleTimer      = () => running ? stopTimer() : startTimer()
  const resetTimer       = () => { stopTimer(); setRemaining(totalSecs) }
  const handleModeChange = (m) => { if (!running) applyMode(m) }

  const toggleAmbient = (type) => {
    if (ambientRef.current) { try { ambientRef.current.close() } catch(e) {} ambientRef.current = null }
    if (ambientActive === type) { setAmbientActive(null); return }
    setAmbientActive(type)
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)()
      ambientRef.current = ctx
      const buf  = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src  = ctx.createBufferSource(); src.buffer = buf; src.loop = true
      const filt = ctx.createBiquadFilter(); const gain = ctx.createGain()
      if (type === 'rain')      { filt.type='bandpass'; filt.frequency.value=600; filt.Q.value=0.5; gain.gain.value=0.08 }
      else if (type === 'cafe') { filt.type='bandpass'; filt.frequency.value=300; filt.Q.value=1;   gain.gain.value=0.04 }
      else                      { filt.type='lowpass';  filt.frequency.value=200;                   gain.gain.value=0.06 }
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination); src.start()
    } catch(e) {}
  }

  useEffect(() => () => {
    clearInterval(intervalRef.current)
    if (ambientRef.current) try { ambientRef.current.close() } catch(e) {}
  }, [])

  const offset  = CIRC * (1 - remaining / totalSecs)
  const pomDots = Array.from({ length: 8 }, (_, i) => ({
    done: i < pomsDone, current: i === pomsDone && running,
  }))

  const currentDurations = mode === 'work' ? WORK_DURATIONS : mode === 'short' ? SHORT_DURATIONS : LONG_DURATIONS
  const currentMins      = mode === 'work' ? workMins : mode === 'short' ? shortMins : longMins

  return (
    <>
      <div className="card timer-card">

        {/* TABS */}
        <div className="mode-tabs">
          {Object.entries(MODES).map(([key, val]) => (
            <button key={key}
              className={`mode-tab ${mode === key ? 'active' : ''}`}
              onClick={() => handleModeChange(key)}
              title={
                key==='work'  ? '25 min de trabajo enfocado' :
                key==='short' ? '5 min entre pomodoros' :
                                '15 min tras 4 pomodoros'
              }
            >{val.tab}</button>
          ))}
        </div>

        {/* SELECTOR DE DURACIÓN */}
        <div style={{ marginBottom:'1rem' }}>
          <div style={{
            fontSize:'.65rem', color:'var(--text3)', textTransform:'uppercase',
            letterSpacing:'.08em', fontWeight:600, marginBottom:'.4rem', textAlign:'center',
          }}>
            Duración de sesión
          </div>
          <div style={{ display:'flex', gap:'.35rem', justifyContent:'center', flexWrap:'wrap' }}>
            {currentDurations.map(mins => (
              <button key={mins}
                onClick={() => handleSetDuration(mode, mins)}
                style={{
                  padding:'.3rem .6rem',
                  border:'1px solid',
                  borderColor: currentMins===mins ? 'var(--accent)' : 'var(--border)',
                  background:  currentMins===mins ? 'rgba(99,102,241,0.15)' : 'var(--surface2)',
                  color:       currentMins===mins ? 'var(--accent)' : 'var(--text3)',
                  borderRadius:'8px', fontSize:'.75rem', fontWeight:600,
                  cursor: running ? 'not-allowed' : 'pointer',
                  fontFamily:'inherit', transition:'all .2s',
                  opacity: running ? 0.5 : 1,
                }}
                disabled={running}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* CIRCLE */}
        <div className="circle-wrap">
          <svg className="timer-circle" width="200" height="200" viewBox="0 0 200 200">
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
            <circle className="circle-bg" cx="100" cy="100" r="88"/>
            <circle className="circle-progress" cx="100" cy="100" r="88"
              strokeDasharray={CIRC} strokeDashoffset={offset}/>
          </svg>
          <div className="timer-display">
            <div className="timer-time">{fmt(remaining)}</div>
            <div className="timer-session-label">{MODES[mode].label}</div>
          </div>
        </div>

        {/* DOTS */}
        <div className="pomodoro-count">
          {pomDots.map((d, i) => (
            <div key={i} className={`pom-dot ${d.done?'done':''} ${d.current?'current':''}`}/>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="timer-controls">
          <button className="btn btn-icon" onClick={resetTimer} title="Reiniciar">↺</button>
          <button className="btn btn-primary" onClick={toggleTimer}>
            {running ? '⏸ Pausar' : '▶ Iniciar'}
          </button>
          <button className="btn btn-icon" onClick={() => setFocusOpen(true)} title="Modo enfoque">⛶</button>
        </div>

        {/* AMBIENT */}
        <div className="ambient-row">
          <span className="ambient-label">Ambiente:</span>
          {[
            {key:'rain',   label:'🌧 Lluvia'},
            {key:'cafe',   label:'☕ Café'  },
            {key:'forest', label:'🌲 Bosque'},
          ].map(a => (
            <button key={a.key} className={`amb-btn ${ambientActive===a.key?'active':''}`}
              onClick={() => toggleAmbient(a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="motivational">"{quote}"</div>
      </div>

      {/* POPUP CONFIRMACIÓN */}
      {showConfirm && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:500,
        }}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'20px', padding:'2rem', maxWidth:'340px', width:'90%',
            textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'.75rem' }}>🍅</div>
            <div style={{ fontSize:'1.1rem', fontWeight:700, marginBottom:'.4rem', color:'var(--text)' }}>
              ¡Sesión terminada!
            </div>
            <div style={{ fontSize:'.85rem', color:'var(--text2)', marginBottom:'1.5rem', lineHeight:1.5 }}>
              ¿Completaste lo que te propusiste en esta sesión?
            </div>
            <div style={{ display:'flex', gap:'.75rem' }}>
              <button onClick={() => handleConfirm(false)} style={{
                flex:1, padding:'.7rem', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:'12px',
                color:'var(--text2)', fontWeight:600, cursor:'pointer',
                fontSize:'.85rem', fontFamily:'inherit', transition:'all .2s',
              }}>
                😅 No del todo
              </button>
              <button onClick={() => handleConfirm(true)} style={{
                flex:1, padding:'.7rem', background:'var(--accent)',
                border:'none', borderRadius:'12px', color:'#fff',
                fontWeight:600, cursor:'pointer', fontSize:'.85rem',
                fontFamily:'inherit', transition:'all .2s',
              }}>
                ✅ ¡Sí!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOCUS OVERLAY */}
      {focusOpen && (
        <div className="focus-overlay active">
          <div className="focus-mode-label">Modo Enfoque</div>
          <div className="focus-time">{fmt(remaining)}</div>
          <div className="focus-task-label">Concentrado en tu trabajo</div>
          <div className="focus-pom-dots">
            {pomDots.map((d,i) => (
              <div key={i} className={`pom-dot ${d.done?'done':''}`}
                style={{width:'8px',height:'8px'}}/>
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
  n.className = 'notification'; n.textContent = msg
  document.body.appendChild(n); setTimeout(() => n.remove(), 3500)
}