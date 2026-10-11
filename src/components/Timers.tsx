import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Pause, Play, Plus, RotateCcw, Square, X } from 'lucide-react'
import { addMinute, clock, closeClock, isPaused, kindCopy, openClock, pauseTimer, remaining, restartTimer, resumeTimer, snoozeTimer, stopTimer, useClockView, useNow, useTimers, type RanchTimer, type TimerKind } from '../lib/timers'
import { paper, stamp } from '../lib/motion'

const kindGlyphs: Record<TimerKind, React.ReactNode> = {
  forno: <><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 8.5h17"/><rect x="7" y="11" width="10" height="6" rx="1"/><path d="M7 6.3h.01M10 6.3h.01M17 6.3h-3"/></>,
  fogao: <><path d="M12 21c-3.6 0-6-2.3-6-5.6 0-3.3 2.6-5 3.4-8.4 1.7 1.1 2.4 3 2.4 3 .9-1.8.8-4 .2-6 3.9 2 6 5.6 6 9.4 0 3.4-2.4 5.6-6 5.6Z"/><path d="M12 21c-1.5 0-2.6-1-2.6-2.5 0-1.6 1.4-2.4 2.1-3.7 1.4 1 3.1 2 3.1 3.7 0 1.5-1.1 2.5-2.6 2.5Z"/></>,
  geladeira: <><path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5"/></>,
  descanso: <><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/><path d="M9.5 18.5h5"/></>,
  brasa: <><path d="M4 10h16a8 6 0 0 1-16 0Z"/><path d="M7 10V8M12 10V7M17 10V8"/><path d="M8.5 15.5 6 21M15.5 15.5 18 21"/></>,
  geral: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2.5h6"/></>
}
export function KindIcon({ kind, size = 20 }: { kind: TimerKind; size?: number }) {
  return <svg className="kind-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kindGlyphs[kind]}</svg>
}

export function TimerFace({ left, total, size = 32 }: { left: number; total: number; size?: number }) {
  const angle = 360 * (1 - left / Math.max(total, 1))
  return <svg className="timer-face" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true"><g className="timer-bells"><circle cx="9" cy="8" r="4.5" fill="currentColor"/><circle cx="31" cy="8" r="4.5" fill="currentColor"/></g><circle cx="20" cy="22" r="14" fill="#fff6e4" stroke="currentColor" strokeWidth="2.4"/><path d="M20 10.5v2.2M20 31.3v2.2M8.5 22h2.2M29.3 22h2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M20 22V12.5" stroke="#9b2d20" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${angle} 20 22)`}/><circle cx="20" cy="22" r="1.8" fill="currentColor"/><path d="M11 34l-2.5 3M29 34l2.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

/** Chip de um relógio: tocar no X pede confirmação antes de cancelar, para não perder o tempo do forno sem querer. */
export function TimerChip({ timer, now, onOpen, showRecipe = false }: { timer: RanchTimer; now: number; onOpen?: (timer: RanchTimer) => void; showRecipe?: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 2600); return () => clearTimeout(id) }, [armed])
  const ringing = Boolean(timer.firedAt)
  const paused = isPaused(timer)
  const left = remaining(timer, now)
  const copy = kindCopy[timer.kind]
  return <motion.div layout className={`timer-chip kind-${timer.kind}${ringing ? ' is-ringing' : ''}${paused ? ' is-paused' : ''}`} initial={{ y: 30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={paper}>
    <button type="button" className="timer-chip-main" onClick={() => ringing ? stopTimer(timer.id) : onOpen ? onOpen(timer) : openClock(timer.id)} aria-label={ringing ? `${copy.title} Toque para desligar o alarme` : `${copy.label}, ${timer.recipeTitle}: faltam ${clock(left)}`}>
      <TimerFace left={left} total={timer.total}/>
      <span className="timer-chip-copy"><small><KindIcon kind={timer.kind} size={16}/>{ringing ? 'Tocou! Desligar' : `${paused ? 'Pausado · ' : ''}${showRecipe ? timer.recipeTitle : `${copy.label} · passo ${timer.step}`}`}</small><strong>{ringing ? copy.label : clock(left)}</strong></span>
    </button>
    {!ringing && <button type="button" className={`timer-chip-x${armed ? ' is-armed' : ''}`} onClick={() => armed ? stopTimer(timer.id) : setArmed(true)} aria-label={armed ? 'Confirmar: cancelar este relógio' : 'Cancelar relógio'}>{armed ? 'Cancelar?' : <X size={14}/>}</button>}
  </motion.div>
}

/** Relógios correndo fora do modo cozinha: ficam flutuando para não serem esquecidos. */
export function TimerTray() {
  const timers = useTimers()
  const now = useNow(timers.length > 0)
  return <div className="timer-float" aria-live="polite"><AnimatePresence>{timers.map(timer => <TimerChip key={timer.id} timer={timer} now={now} showRecipe/>)}</AnimatePresence></div>
}

/** Cortina de alarme: cobre a tela quando um relógio termina, com o sino do rancho tocando. */
export function AlarmCurtain() {
  const timers = useTimers()
  const ringing = timers.filter(timer => timer.firedAt)
  const timer = ringing[0]
  const copy = timer ? kindCopy[timer.kind] : undefined
  const late = timer?.firedAt ? Math.floor((Date.now() - timer.endsAt) / 60000) : 0
  return createPortal(<AnimatePresence>{timer && copy && <motion.div key={timer.id} className={`alarm-curtain kind-${timer.kind}`} role="alertdialog" aria-modal="true" aria-label={copy.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="alarm-rays" aria-hidden="true"/>
    <motion.section className="alarm-card" initial={{ y: 60, scale: 0.9, rotate: -3 }} animate={{ y: 0, scale: 1, rotate: -0.8 }} transition={paper}>
      <div className="alarm-clock" aria-hidden="true"><TimerFace left={0} total={1} size={120}/><span className="alarm-kind"><KindIcon kind={timer.kind} size={26}/></span></div>
      <motion.span className="rubber-stamp alarm-stamp" initial={{ opacity: 0, scale: 2.2, rotate: -28 }} animate={{ opacity: 1, scale: 1, rotate: -10 }} transition={{ ...stamp, delay: 0.3 }}>{copy.label}</motion.span>
      <h2>{copy.title}</h2>
      <p>{copy.body(timer.recipeTitle, timer.step)}</p>
      {late > 0 && <small className="alarm-late">Tocou há {late} min, enquanto o app estava fechado.</small>}
      <div className="alarm-actions">
        <button type="button" className="button" onClick={() => stopTimer(timer.id)} autoFocus>Desligar alarme</button>
        <button type="button" className="button button-paper" onClick={() => snoozeTimer(timer.id)}>Mais 5 minutos</button>
      </div>
      {ringing.length > 1 && <small className="alarm-more">Mais {ringing.length - 1} relógio{ringing.length > 2 ? 's' : ''} tocando</small>}
    </motion.section>
  </motion.div>}</AnimatePresence>, document.body)
}

/** Despertador de corda grande: anel de progresso no mostrador, ponteiro do tempo e ponteiro de segundos com tique. */
function BigClock({ timer, now }: { timer: RanchTimer; now: number }) {
  const left = remaining(timer, now)
  const elapsed = Math.max(0, timer.total - left)
  const ring = 2 * Math.PI * 74
  return <svg className="big-clock" viewBox="0 0 240 262" aria-hidden="true">
    <path className="big-clock-handle" d="M84 34Q120 2 156 34"/>
    <g className="big-clock-bells"><path d="M34 62a26 26 0 0 1 44-28Z"/><path d="M206 62a26 26 0 0 0-44-28Z"/><path className="big-clock-hammer" d="M120 44V26"/><circle cx="120" cy="22" r="5"/></g>
    <circle className="big-clock-body" cx="120" cy="142" r="100"/>
    <circle className="big-clock-dial" cx="120" cy="142" r="86"/>
    <circle className="big-clock-track" cx="120" cy="142" r="74"/>
    <circle className="big-clock-progress" cx="120" cy="142" r="74" strokeDasharray={ring} strokeDashoffset={ring * (1 - left / Math.max(timer.total, 1))} transform="rotate(-90 120 142)"/>
    {Array.from({ length: 60 }, (_, i) => <line key={i} className={i % 5 ? 'tick' : 'tick major'} x1="120" y1={i % 5 ? 62 : 60} x2="120" y2={i % 5 ? 66 : 70} transform={`rotate(${i * 6} 120 142)`}/>)}
    <text className="big-clock-brand" x="120" y="178">Rancho</text>
    <text className="big-clock-kind" x="120" y="199">{kindCopy[timer.kind].label}</text>
    <line className="big-clock-hand" x1="120" y1="142" x2="120" y2="88" style={{ transform: `rotate(${360 * elapsed / Math.max(timer.total, 1)}deg)` }}/>
    <line className="big-clock-second" x1="120" y1="156" x2="120" y2="78" style={{ transform: `rotate(${elapsed * 6}deg)` }}/>
    <circle className="big-clock-cap" cx="120" cy="142" r="7"/>
    <path className="big-clock-legs" d="M62 222 42 252M178 222l20 30"/>
  </svg>
}

/** Tela inteira só do relógio: contagem gigante, pausar, retomar, reiniciar, mais um minuto e parar. */
export function ClockScreen() {
  const openId = useClockView()
  const timers = useTimers()
  const timer = timers.find(item => item.id === openId)
  const now = useNow(Boolean(timer))
  const [confirmStop, setConfirmStop] = useState(false)
  useEffect(() => { setConfirmStop(false) }, [openId])
  useEffect(() => { if (!confirmStop) return; const id = setTimeout(() => setConfirmStop(false), 3000); return () => clearTimeout(id) }, [confirmStop])
  useEffect(() => { if (openId && !timer) closeClock() }, [openId, timer])
  useEffect(() => {
    if (!timer) return
    const keys = (event: KeyboardEvent) => { if (event.key === 'Escape') closeClock(); else if (event.key === ' ') { event.preventDefault(); if (isPaused(timer)) resumeTimer(timer.id); else pauseTimer(timer.id) } }
    addEventListener('keydown', keys); return () => removeEventListener('keydown', keys)
  }, [timer])
  const left = timer ? remaining(timer, now) : 0
  const paused = timer ? isPaused(timer) : false
  const copy = timer ? kindCopy[timer.kind] : undefined
  const others = timers.filter(item => item.id !== openId)
  return createPortal(<AnimatePresence>{timer && copy && <motion.div key="clock" className={`clock-screen kind-${timer.kind}${paused ? ' is-paused' : ''}${!paused && left <= 60 ? ' is-final' : ''}`} role="dialog" aria-modal="true" aria-label={`Relógio: ${copy.label}, ${timer.recipeTitle}`} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40, transition: { duration: 0.22 } }} transition={paper}>
    <div className="clock-glow" aria-hidden="true"/>
    <header className="clock-top">
      <button type="button" className="cook-icon" onClick={closeClock} aria-label="Voltar"><ArrowLeft size={22}/></button>
      <div className="cook-title"><small>Relógio da cozinha</small><strong>{timer.recipeTitle}</strong></div>
      <span className="clock-kind-badge"><KindIcon kind={timer.kind} size={18}/>{copy.label}</span>
    </header>
    {others.length > 0 && <nav className="clock-others" aria-label="Outros relógios">{others.map(item => <button type="button" key={item.id} className={item.firedAt ? 'is-ringing' : ''} onClick={() => openClock(item.id)}><KindIcon kind={item.kind} size={14}/>{kindCopy[item.kind].label} · {item.firedAt ? 'tocou' : clock(remaining(item, now))}</button>)}</nav>}
    <section className="clock-stage">
      <motion.div className="clock-face-wrap" key={timer.id} initial={{ scale: 0.8, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 14 }}>
        <BigClock timer={timer} now={now}/>
        <AnimatePresence>{paused && <motion.span className="rubber-stamp clock-paused" initial={{ opacity: 0, scale: 2, rotate: -26 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} exit={{ opacity: 0, scale: 0.8 }} transition={stamp}>Pausado</motion.span>}</AnimatePresence>
      </motion.div>
      <div className="clock-digits"><span className="clock-time">{clock(left)}</span><small>{paused ? 'contagem pausada' : left <= 60 ? 'último minuto!' : `de ${clock(timer.total)} · passo ${timer.step}`}</small></div>
      {timer.stepText && <p className="clock-step">“{timer.stepText}”</p>}
    </section>
    <footer className="clock-controls">
      <button type="button" className="clock-round" onClick={() => restartTimer(timer.id)} aria-label="Reiniciar a contagem"><RotateCcw size={24}/><span>Reiniciar</span></button>
      <motion.button type="button" className={`clock-main${paused ? ' is-play' : ''}`} onClick={() => paused ? resumeTimer(timer.id) : pauseTimer(timer.id)} aria-label={paused ? 'Continuar a contagem' : 'Pausar a contagem'} whileTap={{ scale: 0.92 }}>
        <AnimatePresence mode="wait" initial={false}><motion.span key={paused ? 'play' : 'pause'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }}>{paused ? <Play size={38} fill="currentColor"/> : <Pause size={38} fill="currentColor"/>}</motion.span></AnimatePresence>
        <small>{paused ? 'Continuar' : 'Pausar'}</small>
      </motion.button>
      <button type="button" className={`clock-round stop${confirmStop ? ' is-armed' : ''}`} onClick={() => confirmStop ? stopTimer(timer.id) : setConfirmStop(true)} aria-label={confirmStop ? 'Confirmar: parar e apagar o relógio' : 'Parar o relógio'}><Square size={22} fill="currentColor"/><span>{confirmStop ? 'Confirmar' : 'Parar'}</span></button>
      <button type="button" className="clock-add" onClick={() => addMinute(timer.id)}><Plus size={16}/> 1 minuto</button>
    </footer>
  </motion.div>}</AnimatePresence>, document.body)
}
