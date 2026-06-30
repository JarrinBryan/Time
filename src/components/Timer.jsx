import { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/Timer.css'

const CIRC = 553

function fmt(s) {
  const m  = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

function fmtCountdown(secs) {
  if (secs <= 0) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`
  return `${s}s`
}

function getNowSecs() {
  const d = new Date()
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
}

function timeStrToSecs(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 3600 + m * 60
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

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

export default function Timer({ onPomComplete, onFocusTick, pomsDone, quote, tasks, onTaskComplete }) {
  const [remaining,     setRemaining]     = useState(0)
  const [totalSecs,     setTotalSecs]     = useState(0)
  const [running,       setRunning]       = useState(false)
  const [focusOpen,     setFocusOpen]     = useState(false)
  const [ambientActive, setAmbientActive] = useState(null)
  const [phase,         setPhase]         = useState('idle')   // 'idle'|'waiting'|'active'|'done'
  const [activeTask,    setActiveTask]    = useState(null)
  const [nextTask,      setNextTask]      = useState(null)
  const [countdown,     setCountdown]     = useState(null)     // segundos hasta la próxima
  const [showReview,    setShowReview]    = useState(false)
  const [reviewTask,    setReviewTask]    = useState(null)

  const intervalRef  = useRef(null)
  const ambientRef   = useRef(null)
  const phaseRef     = useRef(phase)
  const activeRef    = useRef(activeTask)
  phaseRef.current   = phase
  activeRef.current  = activeTask

  // ── Detectar tarea activa del calendario ──────────────────────
  const syncWithCalendar = useCallback(() => {
    const now    = getNowSecs()
    const today  = todayKey()
    const todays = (tasks || []).filter(t => t.date === today && t.time && t.endTime)

    // ¿Hay una tarea activa AHORA?
    const current = todays.find(t => {
      const start = timeStrToSecs(t.time)
      const end   = timeStrToSecs(t.endTime)
      return now >= start && now < end && !t.done?.includes(today)
    })

    if (current) {
      // Activar inmediatamente
      const end     = timeStrToSecs(current.endTime)
      const left    = end - now
      setActiveTask(current)
      setNextTask(null)
      setCountdown(null)
      setPhase('active')
      setTotalSecs(left)
      setRemaining(left)
      setRunning(true)
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            playBell()
            setPhase('done')
            setShowReview(true)
            setReviewTask(activeRef.current)
            return 0
          }
          onFocusTick()
          return prev - 1
        })
      }, 1000)
      return
    }

    // ¿Hay una próxima tarea hoy?
    const upcoming = todays
      .filter(t => timeStrToSecs(t.time) > now && !t.done?.includes(today))
      .sort((a,b) => timeStrToSecs(a.time) - timeStrToSecs(b.time))[0]

    if (upcoming) {
      const secsUntil = timeStrToSecs(upcoming.time) - now
      setNextTask(upcoming)
      setActiveTask(null)
      setCountdown(secsUntil)
      setPhase('waiting')
      setRunning(false)
      clearInterval(intervalRef.current)
      return
    }

    // Sin tareas
    if (phaseRef.current !== 'done') {
      setPhase('idle')
      setActiveTask(null)
      setNextTask(null)
      setCountdown(null)
      setRunning(false)
      clearInterval(intervalRef.current)
    }
  }, [tasks, onFocusTick])

  // Sincronizar cada 10 segundos
  useEffect(() => {
    syncWithCalendar()
    const t = setInterval(syncWithCalendar, 10000)
    return () => clearInterval(t)
  }, [syncWithCalendar])

  // Countdown regresivo hasta próxima actividad
  useEffect(() => {
    if (phase !== 'waiting') return
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          clearInterval(t)
          syncWithCalendar()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase, syncWithCalendar])

  // Título de pestaña
  useEffect(() => {
    if (running && activeTask) {
      document.title = `${fmt(remaining)} — ${activeTask.text}`
    } else {
      document.title = 'FocusFlow'
    }
  }, [remaining, running, activeTask])

  // Ambient
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

  const handleReview = (completed) => {
    setShowReview(false)
    if (reviewTask) {
      onTaskComplete(reviewTask.id, reviewTask.date, completed)
      onPomComplete(completed)
    }
    setPhase('idle')
    setActiveTask(null)
    setReviewTask(null)
    setTimeout(syncWithCalendar, 500)
  }

  const pct    = totalSecs > 0 ? remaining / totalSecs : 0
  const offset = CIRC * (1 - pct)

  // Color del círculo según fase
  const circleColor = phase === 'active'  ? 'url(#timerGrad)'
                    : phase === 'waiting' ? '#f59e0b'
                    : phase === 'done'    ? '#10b981'
                    : '#334155'

  return (
    <>
      <div className="card timer-card">

        {/* ── FASE: IDLE ── */}
        {phase === 'idle' && (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'3rem', marginBottom:'.75rem', opacity:.4 }}>📅</div>
            <div style={{ fontSize:'.95rem', fontWeight:700, color:'var(--text)', marginBottom:'.4rem' }}>
              Sin actividades programadas
            </div>
            <div style={{ fontSize:'.8rem', color:'var(--text3)', lineHeight:1.5 }}>
              Añade actividades en el calendario<br/>y el timer se activará automáticamente
            </div>
          </div>
        )}

        {/* ── FASE: WAITING ── */}
        {phase === 'waiting' && nextTask && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'.68rem', color:'var(--amber)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'.6rem' }}>
              ⏳ Próxima actividad
            </div>

            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:'14px', padding:'1rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text)', marginBottom:'.3rem' }}>
                {nextTask.text}
              </div>
              <div style={{ fontSize:'.8rem', color:'var(--text2)' }}>
                🕐 {nextTask.time} – {nextTask.endTime}
                <span style={{ marginLeft:'.5rem', color:'var(--text3)' }}>
                  ({nextTask.duration >= 60 ? `${nextTask.duration/60}h` : `${nextTask.duration}m`})
                </span>
              </div>
            </div>

            {/* Círculo cuenta atrás */}
            <div className="circle-wrap" style={{ marginBottom:'1rem' }}>
              <svg className="timer-circle" width="200" height="200" viewBox="0 0 200 200">
                <circle className="circle-bg" cx="100" cy="100" r="88"/>
                <circle className="circle-progress" cx="100" cy="100" r="88"
                  stroke="#f59e0b" strokeDasharray={CIRC} strokeDashoffset={CIRC * 0.7}
                  style={{ transition:'none' }}/>
              </svg>
              <div className="timer-display">
                <div className="timer-time" style={{ fontSize:'2rem', color:'var(--amber)' }}>
                  {countdown !== null ? fmtCountdown(countdown) : '--:--'}
                </div>
                <div className="timer-session-label">para comenzar</div>
              </div>
            </div>
          </div>
        )}

        {/* ── FASE: ACTIVE ── */}
        {phase === 'active' && activeTask && (
          <>
            <div style={{ background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.3)',
              borderRadius:'12px', padding:'.7rem 1rem', marginBottom:'1rem', textAlign:'center' }}>
              <div style={{ fontSize:'.65rem', color:'var(--accent)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'.2rem' }}>
                🎯 En curso ahora
              </div>
              <div style={{ fontSize:'.95rem', fontWeight:700, color:'var(--text)' }}>
                {activeTask.text}
              </div>
              <div style={{ fontSize:'.75rem', color:'var(--text3)', marginTop:'.15rem' }}>
                {activeTask.time} – {activeTask.endTime}
              </div>
            </div>

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
                  stroke={circleColor} strokeDasharray={CIRC} strokeDashoffset={offset}/>
              </svg>
              <div className="timer-display">
                <div className="timer-time">{fmt(remaining)}</div>
                <div className="timer-session-label">restantes</div>
              </div>
            </div>

            <div className="pomodoro-count">
              {Array.from({length:8},(_,i)=>i).map(i => (
                <div key={i} className={`pom-dot ${i<pomsDone?'done':''} ${i===pomsDone&&running?'current':''}`}/>
              ))}
            </div>
          </>
        )}

        {/* ── FASE: DONE ── */}
        {phase === 'done' && (
          <div style={{ textAlign:'center', padding:'.5rem 0' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🎉</div>
            <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--green)', marginBottom:'.3rem' }}>
              ¡Actividad finalizada!
            </div>
            <div style={{ fontSize:'.8rem', color:'var(--text3)' }}>
              La ventana de evaluación se abrió
            </div>
          </div>
        )}

        {/* AMBIENT — siempre visible */}
        <div className="ambient-row" style={{ marginTop: phase==='idle'?'1rem':'.75rem' }}>
          <span className="ambient-label">Ambiente:</span>
          {[{key:'rain',label:'🌧 Lluvia'},{key:'cafe',label:'☕ Café'},{key:'forest',label:'🌲 Bosque'}].map(a => (
            <button key={a.key} className={`amb-btn ${ambientActive===a.key?'active':''}`}
              onClick={() => toggleAmbient(a.key)}>{a.label}
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
            <div style={{ fontSize:'1.15rem', fontWeight:800, color:'var(--text)', marginBottom:'.4rem' }}>
              Tiempo completado
            </div>
            <div style={{ background:'var(--surface2)', border:'1px solid var(--border)',
              borderRadius:'12px', padding:'.85rem', margin:'1rem 0' }}>
              <div style={{ fontSize:'1rem', fontWeight:700, color:'var(--text)', marginBottom:'.25rem' }}>
                {reviewTask.text}
              </div>
              <div style={{ fontSize:'.8rem', color:'var(--text3)' }}>
                {reviewTask.time} – {reviewTask.endTime} ·{' '}
                {reviewTask.duration >= 60 ? `${reviewTask.duration/60}h` : `${reviewTask.duration}m`}
              </div>
            </div>
            <div style={{ fontSize:'.88rem', color:'var(--text2)', marginBottom:'1.5rem', lineHeight:1.5 }}>
              ¿Cómo te fue con esta actividad?
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
              <button onClick={() => handleReview(true)} style={{
                padding:'.8rem', background:'var(--accent)', border:'none',
                borderRadius:'14px', color:'#fff', fontWeight:700,
                cursor:'pointer', fontSize:'.9rem', fontFamily:'inherit',
                transition:'all .2s',
              }}>
                ✅ La completé al 100%
              </button>
              <button onClick={() => handleReview('partial')} style={{
                padding:'.8rem', background:'var(--surface2)',
                border:'1px solid var(--amber)', borderRadius:'14px',
                color:'var(--amber)', fontWeight:700,
                cursor:'pointer', fontSize:'.9rem', fontFamily:'inherit',
                transition:'all .2s',
              }}>
                🟡 La hice parcialmente
              </button>
              <button onClick={() => handleReview(false)} style={{
                padding:'.8rem', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:'14px',
                color:'var(--text3)', fontWeight:700,
                cursor:'pointer', fontSize:'.9rem', fontFamily:'inherit',
                transition:'all .2s',
              }}>
                ❌ No la completé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOCUS OVERLAY */}
      {focusOpen && (
        <div className="focus-overlay active">
          <div className="focus-mode-label">Modo Enfoque</div>
          <div className="focus-time">
            {phase === 'active' ? fmt(remaining) : countdown !== null ? fmtCountdown(countdown) : '--:--'}
          </div>
          <div className="focus-task-label">
            {phase === 'active' && activeTask ? activeTask.text : 'Esperando actividad...'}
          </div>
          <button className="focus-exit" onClick={() => setFocusOpen(false)}>
            ✕ Salir del modo enfoque
          </button>
        </div>
      )}

      {/* Botón modo enfoque — siempre visible */}
      {phase === 'active' && (
        <div style={{ textAlign:'center', marginTop:'.5rem' }}>
          <button onClick={() => setFocusOpen(true)} style={{
            background:'transparent', border:'1px solid var(--border)',
            borderRadius:'8px', color:'var(--text3)', padding:'.35rem .9rem',
            fontSize:'.75rem', cursor:'pointer', fontFamily:'inherit',
            transition:'all .2s',
          }}>
            ⛶ Modo enfoque
          </button>
        </div>
      )}
    </>
  )
}