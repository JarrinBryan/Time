import { useState, useEffect, useCallback } from 'react'

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function dateKey(d) {
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

function getNowStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function getWeekDates() {
  const today = new Date()
  const dow   = today.getDay()
  const diff  = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const PRIORITY = {
  high:   { label:'Alta',  color:'#ef4444', bg:'rgba(239,68,68,0.18)'  },
  medium: { label:'Media', color:'#f59e0b', bg:'rgba(245,158,11,0.18)' },
  low:    { label:'Baja',  color:'#10b981', bg:'rgba(16,185,129,0.18)' },
}

const DURATIONS = [
  { label:'30m', value:30  },
  { label:'1h',  value:60  },
  { label:'1.5h',value:90  },
  { label:'2h',  value:120 },
  { label:'3h',  value:180 },
  { label:'4h',  value:240 },
]

const DAY_NAMES  = ['Lun','Mar','Mié','Jue','Vie']
const HOURS      = Array.from({ length: 15 }, (_, i) => i + 7) // 7am–9pm

function fmtHour(h) {
  return `${String(h).padStart(2,'0')}:00`
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total  = h * 60 + m + mins
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`
}

export default function TaskList({ onDoneCountChange }) {
  const [tasks,     setTasks]     = useState([])
  const [weekDates, setWeekDates] = useState(getWeekDates())
  const [nowStr,    setNowStr]    = useState(getNowStr())

  // Modal estado
  const [modal, setModal]   = useState(null) // { dayIndex, hour } | null
  const [input, setInput]   = useState('')
  const [time,  setTime]    = useState('')
  const [duration, setDuration] = useState(60)
  const [priority, setPriority] = useState('medium')

  // Tooltip hover
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const t = setInterval(() => setNowStr(getNowStr()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    try { setTasks(JSON.parse(localStorage.getItem('ff_tasks') || '[]')) } catch(e) {}
  }, [])

  const saveTasks = useCallback((next) => {
    localStorage.setItem('ff_tasks', JSON.stringify(next))
    const today = todayKey()
    onDoneCountChange(next.filter(t => t.date === today && t.done?.includes(today)).length)
  }, [onDoneCountChange])

  const openModal = (dayIndex, hour) => {
    setModal({ dayIndex, hour })
    setTime(fmtHour(hour))
    setInput(''); setDuration(60); setPriority('medium')
  }

  const closeModal = () => setModal(null)

  const addTask = () => {
    const text = input.trim()
    if (!text || !modal) return
    const d    = weekDates[modal.dayIndex]
    const dk   = dateKey(d)
    const endT = addMinutes(time, duration)
    const task = {
      id: Date.now(), text,
      date: dk, done: [],
      time, endTime: endT, duration, priority,
    }
    const next = [...tasks, task].sort((a,b) => (a.time||'').localeCompare(b.time||''))
    setTasks(next); saveTasks(next)
    closeModal()
  }

  const toggleDone = (id, dk) => {
    const next = tasks.map(t => {
      if (t.id !== id) return t
      const done = t.done || []
      return { ...t, done: done.includes(dk) ? done.filter(x=>x!==dk) : [...done, dk] }
    })
    setTasks(next); saveTasks(next)
  }

  const deleteTask = (id) => {
    const next = tasks.filter(t => t.id !== id)
    setTasks(next); saveTasks(next)
  }

  const todayStr  = todayKey()
  const todayDone = tasks.filter(t => t.date === todayStr && t.done?.includes(todayStr)).length
  const todayAll  = tasks.filter(t => t.date === todayStr).length

  // Tarea activa ahora
  const activeTasks   = tasks.filter(t => t.date===todayStr && !t.done?.includes(todayStr) && t.time && t.time<=nowStr && t.endTime>nowStr)
  const currentTask   = activeTasks[0] || null

  return (
    <div className="card" style={{ flex:1 }}>

      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <div>
          <div className="card-title" style={{ margin:0 }}>Planificador semanal</div>
          <div style={{ fontSize:'.72rem', color:'var(--text3)', marginTop:'.15rem' }}>
            Haz clic en cualquier hora para añadir una actividad
          </div>
        </div>
        <div style={{ fontSize:'.78rem', color:'var(--text2)', background:'var(--surface2)',
          border:'1px solid var(--border)', borderRadius:'20px', padding:'.3rem .85rem', fontWeight:600 }}>
          {todayDone}/{todayAll} hoy
        </div>
      </div>

      {/* BANNER TAREA ACTIVA */}
      {currentTask && (
        <div style={{
          background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.35)',
          borderRadius:'10px', padding:'.6rem .9rem', marginBottom:'.85rem',
          display:'flex', alignItems:'center', gap:'.65rem',
        }}>
          <span style={{ fontSize:'1.1rem' }}>🎯</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'.65rem', color:'var(--accent)', fontWeight:700,
              textTransform:'uppercase', letterSpacing:'.07em' }}>En progreso ahora</div>
            <div style={{ fontSize:'.85rem', fontWeight:600, color:'var(--text)' }}>
              {currentTask.text}
              <span style={{ color:'var(--text3)', fontWeight:400, fontSize:'.75rem', marginLeft:'.5rem' }}>
                {currentTask.time}–{currentTask.endTime}
              </span>
            </div>
          </div>
          <button onClick={() => toggleDone(currentTask.id, todayStr)} style={{
            background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px',
            padding:'.35rem .75rem', fontSize:'.75rem', fontWeight:700,
            cursor:'pointer', fontFamily:'inherit',
          }}>✓ Completar</button>
        </div>
      )}

      {/* CALENDARIO */}
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:'520px' }}>

          {/* CABECERA días */}
          <div style={{
            display:'grid', gridTemplateColumns:'48px repeat(5,1fr)',
            gap:'3px', marginBottom:'3px', position:'sticky', top:0, zIndex:2,
          }}>
            <div/>
            {weekDates.map((d, i) => {
              const dk      = dateKey(d)
              const isToday = dk === todayStr
              const dayDone = tasks.filter(t => t.date===dk && t.done?.includes(dk)).length
              const dayAll  = tasks.filter(t => t.date===dk).length
              return (
                <div key={i} style={{
                  textAlign:'center', padding:'.45rem .2rem',
                  background: isToday ? 'rgba(99,102,241,0.18)' : 'var(--surface2)',
                  borderRadius:'10px',
                  border:`1px solid ${isToday?'rgba(99,102,241,0.5)':'var(--border)'}`,
                }}>
                  <div style={{ fontSize:'.68rem', fontWeight:700,
                    color: isToday?'var(--accent)':'var(--text3)',
                    textTransform:'uppercase', letterSpacing:'.05em' }}>
                    {DAY_NAMES[i]}
                  </div>
                  <div style={{ fontSize:'.9rem', fontWeight:800,
                    color: isToday?'var(--accent)':'var(--text)', lineHeight:1 }}>
                    {d.getDate()}
                  </div>
                  {dayAll > 0 && (
                    <div style={{ fontSize:'.58rem', color: dayDone===dayAll?'var(--green)':'var(--text3)',
                      marginTop:'.1rem', fontWeight:600 }}>
                      {dayDone}/{dayAll}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* GRID horas */}
          <div style={{ maxHeight:'420px', overflowY:'auto', paddingRight:'2px' }}>
            {HOURS.map(hour => {
              const hourStr = fmtHour(hour)
              const isNowHour = parseInt(nowStr.split(':')[0]) === hour
              return (
                <div key={hour} style={{
                  display:'grid', gridTemplateColumns:'48px repeat(5,1fr)',
                  gap:'3px', marginBottom:'3px',
                  background: isNowHour ? 'rgba(99,102,241,0.04)' : 'transparent',
                  borderRadius:'6px',
                }}>
                  {/* Etiqueta hora */}
                  <div style={{
                    fontSize:'.65rem', color: isNowHour?'var(--accent)':'var(--text3)',
                    fontWeight: isNowHour?700:500,
                    display:'flex', alignItems:'center', justifyContent:'flex-end',
                    paddingRight:'8px', paddingTop:'6px', flexShrink:0,
                  }}>
                    {hourStr}
                    {isNowHour && <span style={{ marginLeft:'2px', color:'var(--accent)' }}>●</span>}
                  </div>

                  {/* Celdas por día */}
                  {weekDates.map((d, di) => {
                    const dk        = dateKey(d)
                    const isToday   = dk === todayStr
                    const cellTasks = tasks.filter(t => {
                      if (t.date !== dk || !t.time) return false
                      const [th] = t.time.split(':').map(Number)
                      return th === hour
                    })

                    return (
                      <div key={di}
                        onClick={() => cellTasks.length === 0 && openModal(di, hour)}
                        style={{
                          minHeight:'42px', borderRadius:'7px', padding:'3px',
                          background: isToday ? 'rgba(99,102,241,0.05)' : 'var(--surface2)',
                          border:`1px solid ${isToday?'rgba(99,102,241,0.15)':'var(--border)'}`,
                          cursor: cellTasks.length===0 ? 'pointer' : 'default',
                          transition:'background .15s',
                          position:'relative',
                        }}
                        onMouseEnter={e => { if(cellTasks.length===0) e.currentTarget.style.background = isToday?'rgba(99,102,241,0.12)':'var(--surface3)' }}
                        onMouseLeave={e => { if(cellTasks.length===0) e.currentTarget.style.background = isToday?'rgba(99,102,241,0.05)':'var(--surface2)' }}
                      >
                        {cellTasks.length === 0 && (
                          <div style={{
                            position:'absolute', inset:0, display:'flex',
                            alignItems:'center', justifyContent:'center',
                            opacity:0, transition:'opacity .15s',
                            fontSize:'.7rem', color:'var(--text3)',
                          }}
                            onMouseEnter={e => e.currentTarget.style.opacity='1'}
                            onMouseLeave={e => e.currentTarget.style.opacity='0'}
                          >
                            +
                          </div>
                        )}

                        {cellTasks.map(task => {
                          const isDone = task.done?.includes(dk)
                          const p      = PRIORITY[task.priority || 'medium']
                          const isHov  = hovered === task.id
                          return (
                            <div key={task.id}
                              onMouseEnter={() => setHovered(task.id)}
                              onMouseLeave={() => setHovered(null)}
                              style={{
                                background: isDone ? 'rgba(16,185,129,0.15)' : p.bg,
                                border:`1px solid ${isDone?'#10b98144':p.color+'55'}`,
                                borderLeft:`3px solid ${isDone?'var(--green)':p.color}`,
                                borderRadius:'5px', padding:'4px 6px',
                                cursor:'pointer', transition:'all .15s',
                                transform: isHov ? 'scale(1.02)' : 'scale(1)',
                                position:'relative',
                              }}
                              onClick={(e) => { e.stopPropagation(); toggleDone(task.id, dk) }}
                            >
                              <div style={{
                                fontSize:'.68rem', fontWeight:700, lineHeight:1.25,
                                color: isDone?'var(--green)':p.color,
                                textDecoration: isDone?'line-through':'none',
                                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                                maxWidth:'100%',
                              }}>
                                {isDone ? '✓ ' : ''}{task.text}
                              </div>
                              <div style={{ fontSize:'.58rem', color:'var(--text3)', marginTop:'1px' }}>
                                {task.time}–{task.endTime}
                                {' · '}{task.duration>=60?`${task.duration/60}h`:`${task.duration}m`}
                              </div>
                              {isHov && (
                                <button
                                  onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                                  style={{
                                    position:'absolute', top:'2px', right:'2px',
                                    background:'rgba(239,68,68,0.25)', border:'none',
                                    borderRadius:'4px', color:'#ef4444',
                                    cursor:'pointer', padding:'1px 5px',
                                    fontSize:'.62rem', fontWeight:700, lineHeight:1.4,
                                  }}>✕</button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* MODAL AÑADIR TAREA */}
      {modal !== null && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:300,
        }}
          onClick={closeModal}
        >
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:'20px', padding:'1.75rem', width:'360px', maxWidth:'95vw',
            boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
          }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--text)' }}>
                  Nueva actividad
                </div>
                <div style={{ fontSize:'.75rem', color:'var(--text3)', marginTop:'.15rem' }}>
                  {DAY_NAMES[modal.dayIndex]} {weekDates[modal.dayIndex].getDate()} · {time}
                </div>
              </div>
              <button onClick={closeModal} style={{
                background:'var(--surface2)', border:'1px solid var(--border)',
                borderRadius:'8px', color:'var(--text3)', cursor:'pointer',
                width:'30px', height:'30px', fontSize:'1rem', fontFamily:'inherit',
              }}>✕</button>
            </div>

            {/* Nombre */}
            <div style={{ marginBottom:'.85rem' }}>
              <label style={labelStyle}>¿Qué vas a hacer?</label>
              <input autoFocus style={{ ...inputStyle, marginTop:'.3rem' }}
                placeholder="Ej: Estudiar React, Ejercicio..."
                maxLength={60} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addTask()}
              />
            </div>

            {/* Hora */}
            <div style={{ marginBottom:'.85rem' }}>
              <label style={labelStyle}>Hora de inicio</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                style={{ ...inputStyle, marginTop:'.3rem' }}/>
            </div>

            {/* Duración */}
            <div style={{ marginBottom:'.85rem' }}>
              <label style={labelStyle}>Duración</label>
              <div style={{ display:'flex', gap:'.35rem', marginTop:'.3rem', flexWrap:'wrap' }}>
                {DURATIONS.map(d => (
                  <button key={d.value} onClick={() => setDuration(d.value)}
                    style={durBtnStyle(duration===d.value)}>
                    {d.label}
                  </button>
                ))}
              </div>
              {time && (
                <div style={{ fontSize:'.7rem', color:'var(--text3)', marginTop:'.4rem' }}>
                  Termina a las <strong style={{ color:'var(--accent)' }}>{addMinutes(time, duration)}</strong>
                </div>
              )}
            </div>

            {/* Prioridad */}
            <div style={{ marginBottom:'1.25rem' }}>
              <label style={labelStyle}>Prioridad</label>
              <div style={{ display:'flex', gap:'.4rem', marginTop:'.3rem' }}>
                {Object.entries(PRIORITY).map(([key, val]) => (
                  <button key={key} onClick={() => setPriority(key)} style={{
                    flex:1, padding:'.45rem', border:'1px solid',
                    borderColor: priority===key ? val.color : 'var(--border)',
                    background:  priority===key ? val.bg    : 'var(--surface2)',
                    color:       priority===key ? val.color : 'var(--text3)',
                    borderRadius:'9px', fontSize:'.75rem', fontWeight:700,
                    cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                  }}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div style={{ display:'flex', gap:'.6rem' }}>
              <button onClick={closeModal} style={{
                flex:1, padding:'.65rem', background:'var(--surface2)',
                border:'1px solid var(--border)', borderRadius:'12px',
                color:'var(--text2)', fontWeight:600, cursor:'pointer',
                fontSize:'.85rem', fontFamily:'inherit',
              }}>Cancelar</button>
              <button onClick={addTask} disabled={!input.trim()} style={{
                flex:2, padding:'.65rem',
                background: input.trim() ? 'var(--accent)' : 'var(--surface3)',
                border:'none', borderRadius:'12px',
                color: input.trim() ? '#fff' : 'var(--text3)',
                fontWeight:700, cursor: input.trim()?'pointer':'default',
                fontSize:'.85rem', fontFamily:'inherit', transition:'all .2s',
              }}>
                ✓ Agregar actividad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Estilos ── */
const inputStyle = {
  width:'100%', background:'var(--surface2)', border:'1px solid var(--border)',
  borderRadius:'9px', color:'var(--text)', padding:'.55rem .8rem',
  fontSize:'.84rem', outline:'none', fontFamily:'inherit',
}
const labelStyle = {
  fontSize:'.68rem', color:'var(--text3)', textTransform:'uppercase',
  letterSpacing:'.07em', fontWeight:700,
}
const durBtnStyle = (active) => ({
  padding:'.35rem .6rem', border:'1px solid',
  borderColor: active ? 'var(--accent)' : 'var(--border)',
  background:  active ? 'rgba(99,102,241,0.18)' : 'var(--surface2)',
  color:       active ? 'var(--accent)' : 'var(--text3)',
  borderRadius:'8px', fontSize:'.75rem', fontWeight:700,
  cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
})