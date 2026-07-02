import { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/Timer.css'

const CIRC = 553

function fmt(s) {
  const m  = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

function fmtCountdown(secs) {
  if (!secs || secs <= 0) return '00:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

function getNowSecs() {
  const d = new Date()
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

function timeStrToSecs(t) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 3600 + m * 60
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
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

export default function Timer({ onPomComplete, onFocusTick, onTaskComplete, pomsDone, quote, tasks }) {
  const [phase,       setPhase]       = useState('idle')
  const [remaining,   setRemaining]   = useState(0)
  const [totalSecs,   setTotalSecs]   = useState(0)
  const [countdown,   setCountdown]   = useState(null)
  const [activeTask,  setActiveTask]  = useState(null)
  const [nextTask,    setNextTask]    = useState(null)
  const [showReview,  setShowReview]  = useState(false)
  const [reviewTask,  setReviewTask]  = useState(null)
  const [focusOpen,   setFocusOpen]   = useState(false)
  const [ambientActive, setAmbientActive] = useState(null)

  const timerRef    = useRef(null)
  const countRef    = useRef(null)
  const ambientRef  = useRef(null)
  const phaseRef    = useRef(phase)
  const taskRef     = useRef(activeTask)
  phaseRef.current  = phase
  taskRef.current   = activeTask

  // ── NÚCLEO: detectar qué tarea toca ahora ──────────────────
  const sync = useCallback(() => {
    // No interrumpir si ya hay revisión pendiente o ya está activo
    if (phaseRef.current === 'reviewing') return

    const now   = getNowSecs()
    const today = todayKey()

    // Leer tareas frescas de localStorage siempre (por si TaskList las actualizó)
    let allTasks = tasks
    try {
      allTasks = JSON.parse(localStorage.getItem('ff_tasks') || '[]')
    } catch(e) {}

    const todayTasks = allTasks.filter(t =>
      t.date === today && t.time && t.endTime
    )

    // 1. ¿Hay una tarea activa AHORA y no completada?
    const active = todayTasks.find(t => {
      const start = timeStrToSecs(t.time)
      const end   = timeStrToSecs(t.endTime)
      return now >= start && now < end && !t.done?.includes(today)
    })

    if (active) {
      // Si ya es la misma tarea activa, solo actualizar remaining
      if (phaseRef.current === 'active' && taskRef.current?.id === active.id) {
        return
      }
      // Nueva tarea activa — arrancar timer
      const end  = timeStrToSecs(active.endTime)
      const left = Math.max(0, end - now)

      clearInterval(timerRef.current)
      clearInterval(countRef.current)

      setActiveTask(active)
      setNextTask(null)
      setCountdown(null)
      setPhase('active')
      setTotalSecs(left)
      setRemaining(left)

      timerRef.current = setInterval(() => {
        setRemaining(prev => {
          const next = prev - 1
          if (next <= 0) {
            clearInterval(timerRef.current)
            playBell()
            setPhase('reviewing')
            setShowReview(true)
            setReviewTask(taskRef.current)
            return 0
          }
          onFocusTick()
          return next
        })
      }, 1000)
      return
    }

    // 2. ¿Hay una próxima tarea hoy?
    const upcoming = todayTasks
      .filter(t => {
        const start = timeStrToSecs(t.time)
        return start > now && !t.done?.includes(today)
      })
      .sort((a,b) => timeStrToSecs(a.time) - timeStrToSecs(b.time))[0]

    if (upcoming && phaseRef.current !== 'reviewing') {
      const secsUntil = timeStrToSecs(upcoming.time) - now
      setNextTask(upcoming)
      setActiveTask(null)

      if (phaseRef.current !== 'waiting') {
        setPhase('waiting')
        clearInterval(timerRef.current)
      }

      setCountdown(secsUntil)

      // Iniciar countdown regresivo
      clearInterval(countRef.current)
      countRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countRef.current)
            sync()   // re-sincronizar cuando llega el momento
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return
    }

    // 3. Sin tareas — idle
    if (phaseRef.current !== 'reviewing' && phaseRef.current !== 'active') {
      setPhase('idle')
      setActiveTask(null)
      setNextTask(null)
      setCountdown(null)
      clearInterval(timerRef.current)
      clearInterval(countRef.current)
    }
  }, [tasks, onFocusTick])

  // Sincronizar al montar y cada 15 segundos
  useEffect(() => {
    sync()
    const t = setInterval(sync, 15000)
    return () => clearInterval(t)
  }, [sync])

  // Re-sincronizar cuando cambian las tareas
  useEffect(() => {
    if (phaseRef.current !== 'active' && phaseRef.current !== 'reviewing') {
      sync()
    }
  }, [tasks, sync])

  // Cleanup
  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(countRef.current)
    if (ambientRef.current) try { ambientRef.current.close() } catch(e) {}
  }, [])

  // Título pestaña
  useEffect(() => {
    if (phase === 'active' && activeTask) {
      document.title = `${fmt(remaining)} · ${activeTask.text}`
    } else if (phase === 'waiting' && countdown !== null) {
      document.title = `⏳ ${fmtCountdown(countdown)} · FocusFlow`
    } else {
      document.title = 'FocusFlow'
    }
  }, [remaining, countdown, phase, activeTask])

  const handleReview = (result) => {
    setShowReview(false)
    setPhase('idle')
    if (reviewTask) {
      onTaskComplete(reviewTask.id, reviewTask.date, result)
      if (result === true || result === 'partial') {
        onPomComplete(true)
      }
    }
    setReviewTask(null)
    setActiveTask(null)
    // Re-sincronizar para ver si hay siguiente tarea
    setTimeout(sync, 800)
  }

  const toggleAmbient = (type) => {
    if (ambientRef.current) {
      try { ambientRef.current.close() } catch(e) {}
      ambientRef.current = null
    }
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

  const pct    = totalSecs > 0 ? remaining / totalSecs : 0
  const offset = CIRC * (1 - pct)

  return (
    <>
      <div className="card timer-card">

        {/* ── IDLE: sin actividades ── */}
        {phase === 'idle' && (
          <div style={{ textAlign:'center', padding:'1.5rem 0' }}>
            <div style={{ fontSize:'2.8rem', marginBottom:'.75rem', opacity:.35 }}>📅</div>
            <div style={{ fontSize:'.95rem', fontWeight:700, color:'var(--text)',
              marginBottom:'.35rem' }}>
              Sin actividades ahora
            </div>
            <div style={{ fontSize:'.78rem', color:'var(--text3)', lineHeight:1.6 }}>
              Añade una actividad en el calendario<br/>
              con hora de inicio y el timer<br/>
              <strong style={{ color:'var(--accent)' }}>se activará automáticamente</strong>
            </div>
          </div>
        )}

        {/* ── WAITING: cuenta atrás hasta la próxima ── */}
        {phase === 'waiting' && nextTask && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'.65rem', color:'var(--amber)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'.75rem' }}>
              ⏳ Próxima actividad
            </div>

            {/* Tarjeta actividad */}
            <div style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:'14px', padding:'1rem', marginBottom:'1.25rem',
              textAlign:'left',
            }}>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text)',
                marginBottom:'.3rem' }}>
                {nextTask.text}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem',
                fontSize:'.8rem', color:'var(--text2)' }}>
                <span>🕐 {nextTask.time} – {nextTask.endTime}</span>
                <span style={{ color:'var(--text3)' }}>·</span>
                <span>{nextTask.duration >= 60
                  ? `${nextTask.duration/60}h`
                  : `${nextTask.duration}m`}
                </span>
              </div>
            </div>

            {/* Círculo cuenta atrás */}
            <div className="circle-wrap">
              <svg className="timer-circle" width="200" height="200" viewBox="0 0 200 200">
                <circle className="circle-bg" cx="100" cy="100" r="88"/>
                <circle cx="100" cy="100" r="88" fill="none"
                  stroke="#f59e0b" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * 0.75}
                  style={{ transform:'rotate(-90deg)', transformOrigin:'center' }}/>
              </svg>
              <div className="timer-display">
                <div className="timer-time" style={{ color:'var(--amber)', fontSize:'2.2rem' }}>
                  {fmtCountdown(countdown)}
                </div>
                <div className="timer-session-label">para comenzar</div>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVE: actividad en curso ── */}
        {(phase === 'active' || phase === 'reviewing') && activeTask && (
          <>
            {/* Banner actividad */}
            <div style={{
              background:'rgba(99,102,241,0.1)',
              border:'1px solid rgba(99,102,241,0.3)',
              borderRadius:'12px', padding:'.7rem 1rem',
              marginBottom:'1rem', textAlign:'left',
            }}>
              <div style={{ fontSize:'.62rem', color:'var(--accent)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.2rem' }}>
                🎯 En curso ahora
              </div>
              <div style={{ fontSize:'.95rem', fontWeight:700, color:'var(--text)',
                marginBottom:'.15rem' }}>
                {activeTask.text}
              </div>
              <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>
                {activeTask.time} – {activeTask.endTime}
              </div>
            </div>

            {/* Círculo progreso */}
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
                <div className="timer-session-label">restantes</div>
              </div>
            </div>

            {/* Dots pomodoro */}
            <div className="pomodoro-count">
              {Array.from({length:8},(_,i)=>i).map(i => (
                <div key={i} className={`pom-dot ${i < pomsDone ? 'done' : ''} ${i === pomsDone ? 'current' : ''}`}/>
              ))}
            </div>

            {/* Botón modo enfoque */}
            <div style={{ textAlign:'center', marginBottom:'.75rem' }}>
              <button onClick={() => setFocusOpen(true)} style={{
                background:'transparent', border:'1px solid var(--border)',
                borderRadius:'8px', color:'var(--text3)', padding:'.35rem 1rem',
                fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit',
                transition:'all .2s',
              }}>
                ⛶ Modo enfoque
              </button>
            </div>
          </>
        )}

        {/* ── DONE: terminó ── */}
        {phase === 'done' && (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🎉</div>
            <div style={{ fontSize:'.95rem', fontWeight:700, color:'var(--green)' }}>
              ¡Actividad completada!
            </div>
          </div>
        )}

        {/* AMBIENT — siempre visible */}
        <div className="ambient-row" style={{ marginTop:'.75rem' }}>
          <span className="ambient-label">Ambiente:</span>
          {[
            { key:'rain',   label:'🌧 Lluvia' },
            { key:'cafe',   label:'☕ Café'   },
            { key:'forest', label:'🌲 Bosque' },
          ].map(a => (
            <button key={a.key}
              className={`amb-btn ${ambientActive === a.key ? 'active' : ''}`}
              onClick={() => toggleAmbient(a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="motivational">"{quote}"</div>
      </div>

      {/* ── MODAL REVISIÓN ── */}
      {showReview && reviewTask && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:500,
        }}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'24px', padding:'2rem', maxWidth:'360px', width:'92%',
            textAlign:'center', boxShadow:'0 32px 80px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize:'3rem', marginBottom:'.75rem' }}>⏰</div>
            <div style={{ fontSize:'1.15rem', fontWeight:800, color:'var(--text)',
              marginBottom:'.5rem' }}>
              Tiempo completado
            </div>

            {/* Info de la tarea */}
            <div style={{
              background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:'12px', padding:'.85rem', margin:'0 0 1rem',
              textAlign:'left',
            }}>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text)',
                marginBottom:'.2rem' }}>
                {reviewTask.text}
              </div>
              <div style={{ fontSize:'.78rem', color:'var(--text3)' }}>
                {reviewTask.time} – {reviewTask.endTime} ·{' '}
                {reviewTask.duration >= 60
                  ? `${reviewTask.duration/60}h`
                  : `${reviewTask.duration}m`}
              </div>
            </div>

            <div style={{ fontSize:'.88rem', color:'var(--text2)',
              marginBottom:'1.25rem', lineHeight:1.5 }}>
              ¿Cómo te fue?
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'.5rem' }}>
              <button onClick={() => handleReview(true)} style={{
                padding:'.75rem', background:'var(--accent)', border:'none',
                borderRadius:'14px', color:'#fff', fontWeight:700,
                cursor:'pointer', fontSize:'.88rem', fontFamily:'inherit',
              }}>
                ✅ La completé al 100%
              </button>
              <button onClick={() => handleReview('partial')} style={{
                padding:'.75rem', background:'var(--surface2)',
                border:'1px solid var(--amber)', borderRadius:'14px',
                color:'var(--amber)', fontWeight:700, cursor:'pointer',
                fontSize:'.88rem', fontFamily:'inherit',
              }}>
                🟡 La hice parcialmente
              </button>
              <button onClick={() => handleReview(false)} style={{
                padding:'.75rem', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:'14px',
                color:'var(--text3)', fontWeight:700, cursor:'pointer',
                fontSize:'.88rem', fontFamily:'inherit',
              }}>
                ❌ No la completé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO ENFOQUE ── */}
      {focusOpen && (
        <div className="focus-overlay active">
          <div className="focus-mode-label">Modo Enfoque</div>
          <div className="focus-time">{fmt(remaining)}</div>
          <div className="focus-task-label">
            {activeTask?.text || 'Concentrado...'}
          </div>
          <div className="focus-pom-dots">
            {Array.from({length:8},(_,i)=>i).map(i => (
              <div key={i} className={`pom-dot ${i < pomsDone ? 'done' : ''}`}
                style={{width:'8px', height:'8px'}}/>
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