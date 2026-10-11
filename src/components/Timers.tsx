import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { clock, kindCopy, remaining, snoozeTimer, stopTimer, useNow, useTimers, type RanchTimer, type TimerKind } from '../lib/timers'
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
  const left = remaining(timer, now)
  const copy = kindCopy[timer.kind]
  return <motion.div layout className={`timer-chip kind-${timer.kind}${ringing ? ' is-ringing' : ''}`} initial={{ y: 30, opacity: 0, rotate: -6 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={paper}>
    <button type="button" className="timer-chip-main" onClick={() => ringing ? stopTimer(timer.id) : onOpen?.(timer)} aria-label={ringing ? `${copy.title} Toque para desligar o alarme` : `${copy.label}, ${timer.recipeTitle}: faltam ${clock(left)}`}>
      <TimerFace left={left} total={timer.total}/>
      <span className="timer-chip-copy"><small><KindIcon kind={timer.kind} size={16}/>{ringing ? 'Tocou! Desligar' : showRecipe ? timer.recipeTitle : `${copy.label} · passo ${timer.step}`}</small><strong>{ringing ? copy.label : clock(left)}</strong></span>
    </button>
    {!ringing && <button type="button" className={`timer-chip-x${armed ? ' is-armed' : ''}`} onClick={() => armed ? stopTimer(timer.id) : setArmed(true)} aria-label={armed ? 'Confirmar: cancelar este relógio' : 'Cancelar relógio'}>{armed ? 'Cancelar?' : <X size={14}/>}</button>}
  </motion.div>
}

/** Relógios correndo fora do modo cozinha: ficam flutuando para não serem esquecidos. */
export function TimerTray({ onOpen }: { onOpen: (timer: RanchTimer) => void }) {
  const timers = useTimers()
  const now = useNow(timers.length > 0)
  return <div className="timer-float" aria-live="polite"><AnimatePresence>{timers.map(timer => <TimerChip key={timer.id} timer={timer} now={now} onOpen={onOpen} showRecipe/>)}</AnimatePresence></div>
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
