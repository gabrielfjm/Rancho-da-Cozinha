import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Maximize2, Minimize2, Plus, X } from 'lucide-react'
import type { CookLog, Recipe } from '../types'
import { normalize, prettyAmount, uid } from '../lib/format'
import { paper, stamp } from '../lib/motion'
import { BusyButton, CountUp, InkBox } from './Feedback'
import { HandStars } from './RanchReview'
import { Photo } from './Photo'
import { Skillet } from './Artwork'
import { DishFx } from './DishFx'
import { TimerChip } from './Timers'
import { clock, openClock, remaining, startTimer, useNow, useTimers } from '../lib/timers'
import { primeAudio } from '../lib/alarm'

const pad = (n: number) => String(n).padStart(2, '0')

const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'sem', 'em', 'para', 'ou', 'e', 'a', 'o', 'ao', 'na', 'no', 'em', 'po'])
/** Ingredientes citados no texto do passo, tolerando plural e acento ("ovo" encontra "ovos"). */
function usedIn(recipe: Recipe, text: string) {
  const body = normalize(text)
  if (!body.trim()) return []
  return recipe.ingredients.filter(item => normalize(item.name).split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !stopWords.has(word)).slice(0, 2)
    .some(word => new RegExp(`\\b${word.slice(0, Math.max(3, word.length - 1))}`).test(body))).slice(0, 6)
}

// O maço de fichas: avançar tira a ficha de cima para a esquerda; voltar devolve a anterior por cima.
const deal = {
  enter: (dir: number) => dir >= 0 ? { opacity: 0, y: 28, scale: 0.94, x: 0, rotate: 0, zIndex: 1 } : { opacity: 0, x: '-112%', rotate: -10, y: 0, scale: 1, zIndex: 3 },
  center: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, zIndex: 2, transition: { type: 'spring' as const, stiffness: 230, damping: 27 } },
  exit: (dir: number) => dir >= 0 ? { opacity: 0, x: '-112%', rotate: -9, zIndex: 3, transition: { duration: 0.38, ease: [0.4, 0, 0.7, 0.2] as [number, number, number, number] } } : { opacity: 0, y: 28, scale: 0.94, zIndex: 1, transition: { duration: 0.24 } }
}

function ClockIcon() { return <svg className="windup-clock" width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="22" r="14" stroke="currentColor" strokeWidth="2.2"/><path className="windup-hand" d="M20 22v-8m0 8 6 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M16 4h8M29 9l3-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg> }
export function Kitchen({ recipe, catalog, onClose, onLog, onRate, onSave }: {
  recipe: Recipe; catalog: boolean; onClose: () => void; onLog: (log: CookLog) => Promise<boolean>; onRate: (rating: number) => Promise<unknown>; onSave: () => Promise<unknown>
}) {
  const steps = recipe.steps.length ? recipe.steps : [{ id: 'vazio', text: '' }]
  const last = steps.length - 1
  const [[index, dir], setStep] = useState<[number, number]>([0, 0])
  const [drawer, setDrawer] = useState(false)
  const timers = useTimers()
  const now = useNow(timers.length > 0)
  const [gathered, setGathered] = useState<string[]>([])
  const [finale, setFinale] = useState<{ minutes: number; timers: number }>()
  const [full, setFull] = useState(false)
  const started = useRef(Date.now())
  const timersUsed = useRef(0)
  const dragged = useRef(false)
  const step = steps[index]
  const uses = useMemo(() => usedIn(recipe, step.text), [recipe, step.text])
  const stepTimer = timers.find(timer => timer.recipeId === recipe.id && timer.step === index + 1)
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled

  function go(delta: number) { setStep(([current]) => { const next = Math.min(last, Math.max(0, current + delta)); return next === current ? [current, 0] : [next, delta] }) }
  function jump(target: number) { setStep(([current]) => target === current ? [current, 0] : [target, Math.sign(target - current)]) }
  function finish() { setDrawer(false); setFinale({ minutes: Math.max(1, Math.round((Date.now() - started.current) / 60000)), timers: timersUsed.current }) }
  function start(minutes: number) {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    primeAudio()
    if (!stepTimer) timersUsed.current += 1
    openClock(startTimer({ recipeId: recipe.id, recipeTitle: recipe.title, step: index + 1, text: step.text, minutes }).id)
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else void document.documentElement.requestFullscreen().catch(() => {})
  }

  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    navigator.wakeLock?.request('screen').then(value => { lock = value }).catch(() => {})
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const syncFull = () => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', syncFull)
    if (document.fullscreenEnabled && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {})
    return () => {
      void lock?.release(); document.body.style.overflow = overflow
      document.removeEventListener('fullscreenchange', syncFull)
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (finale || (event.target as HTMLElement).closest('textarea, input')) return
      if (event.key === 'ArrowRight') { if (index === last) finish(); else go(1) }
      else if (event.key === 'ArrowLeft') go(-1)
      else if (event.key === 'Escape') setDrawer(false)
    }
    addEventListener('keydown', keys); return () => removeEventListener('keydown', keys)
  }, [index, last, finale]) // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(<motion.main className="cook" role="dialog" aria-modal="true" aria-label={`Modo cozinha: ${recipe.title}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
    <div className="cook-glow" aria-hidden="true"/>
    <header className="cook-top">
      <button type="button" className="cook-icon" onClick={onClose} aria-label="Sair do modo cozinha"><X size={22}/></button>
      <div className="cook-title"><small>Modo cozinha</small><strong>{recipe.title}</strong></div>
      <div className="cook-tools">
        {canFullscreen && <button type="button" className="cook-icon cook-full" onClick={toggleFullscreen} aria-label={full ? 'Sair da tela cheia' : 'Tela cheia'}>{full ? <Minimize2 size={19}/> : <Maximize2 size={19}/>}</button>}
        <button type="button" className="cook-pill" onClick={() => setDrawer(true)} aria-label="Ver ingredientes"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2.8h8v3.4H8z"/><path d="M7.2 6.2h9.6l1.4 3v10.3a2.2 2.2 0 0 1-2.2 2.2H8a2.2 2.2 0 0 1-2.2-2.2V9.2Z"/><path d="M8.8 12.5h6.4v4.6H8.8z"/></svg><span>Ingredientes</span>{recipe.ingredients.length > 0 && <b>{gathered.length}/{recipe.ingredients.length}</b>}</button>
      </div>
    </header>
    <div className="cook-rail" aria-hidden="true"><motion.i initial={false} animate={{ scaleX: (index + 1) / steps.length }} transition={paper}/></div>

    <AnimatePresence>{timers.length > 0 && <motion.div className="cook-timers" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <AnimatePresence>{timers.map(timer => <TimerChip key={timer.id} timer={timer} now={now} showRecipe={timer.recipeId !== recipe.id}/>)}</AnimatePresence>
    </motion.div>}</AnimatePresence>

    <section className="cook-stage">
      <div className="cook-deck">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.article key={index} className="cook-card" custom={dir} variants={deal} initial="enter" animate="center" exit="exit"
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.4}
            onPointerDown={() => { dragged.current = false }} onDragStart={() => { dragged.current = true }}
            onDragEnd={(_, info) => { if (info.offset.x < -80 || info.velocity.x < -450) { if (index === last) finish(); else go(1) } else if (info.offset.x > 80 || info.velocity.x > 450) go(-1) }}>
            <div className="cook-card-head">
              <span className="cook-number"><small>Passo</small><b>{pad(index + 1)}</b></span>
              <span className="cook-of">de {pad(steps.length)}</span>
              {step.timerMinutes ? <span className="cook-badge">{step.timerMinutes} min no relógio</span> : null}
            </div>
            <p className="cook-text">{step.text || 'Este passo ainda não tem descrição. Dá para completar no editor da receita.'}</p>
            {uses.length > 0 && <div className="cook-uses"><span>Neste passo</span>{uses.map(item => <em key={item.id}><b>{prettyAmount(item.amount)}{item.amount !== null ? ` ${item.unit}` : ''}</b> {item.name}</em>)}</div>}
            {step.photo && <Photo value={step.photo} alt={`Passo ${index + 1}`} className="cook-photo"/>}
            {step.timerMinutes ? <button type="button" className={`cook-timer${stepTimer ? ' is-running' : ''}`} onClick={() => stepTimer ? openClock(stepTimer.id) : start(step.timerMinutes!)}><ClockIcon/>{stepTimer ? <>{stepTimer.firedAt ? 'O relógio tocou' : `Ver o relógio · ${clock(remaining(stepTimer, now))}`}</> : <>Dar corda no relógio · {step.timerMinutes} min</>}</button> : null}
            {index < last
              ? <p className="cook-next"><span>Depois</span>{steps[index + 1].text}</p>
              : <p className="cook-next is-last"><span>Último passo</span>Depois disso é só servir.</p>}
          </motion.article>
        </AnimatePresence>
      </div>
    </section>

    <nav className="cook-pages" aria-label="Passos da receita">{steps.map((item, i) => <button type="button" key={item.id} className={i === index ? 'is-on' : i < index ? 'is-done' : ''} aria-label={`Ir para o passo ${i + 1}`} aria-current={i === index ? 'step' : undefined} onClick={() => jump(i)}>
      {i === index && <motion.span layoutId="cook-page" className="cook-page-ink" transition={paper}/>}<span>{pad(i + 1)}</span>
    </button>)}</nav>

    <footer className="cook-controls">
      <button type="button" className="cook-prev" disabled={index === 0} onClick={() => go(-1)}><ArrowLeft size={22}/><span>Anterior</span></button>
      <AnimatePresence mode="wait" initial={false}>{index < last
        ? <motion.button key="next" type="button" className="cook-forward" onClick={() => go(1)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}><span>Próximo passo</span><ArrowRight size={22}/></motion.button>
        : <motion.button key="finish" type="button" className="cook-finish" onClick={finish} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={stamp}><Check size={22}/><span>Concluir receita</span></motion.button>}
      </AnimatePresence>
    </footer>

    <AnimatePresence>{drawer && <>
      <motion.div key="scrim" className="cook-scrim" onClick={() => setDrawer(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
      <motion.aside key="drawer" className="cook-drawer" aria-label="Ingredientes" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.22 } }} transition={paper}>
        <header><div><small>Separe tudo na bancada</small><h2>Ingredientes</h2></div><button type="button" className="cook-icon dark" onClick={() => setDrawer(false)} aria-label="Fechar ingredientes"><X size={20}/></button></header>
        <ul>{recipe.ingredients.map((item, n) => { const done = gathered.includes(item.id); return <motion.li key={item.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + Math.min(n, 12) * 0.03 }}>
          <label className={`ink-check${done ? ' struck' : ''}`}><input type="checkbox" checked={done} onChange={() => setGathered(g => done ? g.filter(x => x !== item.id) : [...g, item.id])}/><InkBox/><span className="ink-text"><strong>{prettyAmount(item.amount)}{item.amount !== null ? ` ${item.unit}` : ''}</strong> {item.name}{item.note && <em> — {item.note}</em>}</span></label>
        </motion.li> })}</ul>
      </motion.aside>
    </>}</AnimatePresence>

    <AnimatePresence>{finale && <Finale key="finale" recipe={recipe} catalog={catalog} minutes={finale.minutes} steps={steps.length} timers={finale.timers} onLog={onLog} onRate={onRate} onSave={onSave} onReview={() => setFinale(undefined)} onClose={onClose}/>}</AnimatePresence>
  </motion.main>, document.body)
}

function Finale({ recipe, catalog, minutes, steps, timers, onLog, onRate, onSave, onReview, onClose }: {
  recipe: Recipe; catalog: boolean; minutes: number; steps: number; timers: number
  onLog: (log: CookLog) => Promise<boolean>; onRate: (rating: number) => Promise<unknown>; onSave: () => Promise<unknown>; onReview: () => void; onClose: () => void
}) {
  const [rating, setRating] = useState(recipe.rating || 0)
  const [note, setNote] = useState('')
  async function register() {
    const ok = await onLog({ id: uid(), recipeId: recipe.id, cookedAt: new Date().toISOString(), note: note.trim() || `Feita no modo cozinha em ${minutes} min.` })
    if (!ok) return false
    if (rating !== recipe.rating) await onRate(rating)
    onClose(); return true
  }
  return <motion.div className="cook-finale" role="dialog" aria-label="Receita concluída" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="finale-embers" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i}/>)}</div>
    <motion.section className="finale-card" initial={{ y: 70, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: -0.6 }} transition={{ ...paper, delay: 0.1 }}>
      <span className="finale-tape" aria-hidden="true"/>
      <div className="finale-plate" aria-hidden="true"><DishFx kind="steam" mode="always"/><Skillet size={96}/></div>
      <motion.span className="rubber-stamp finale-stamp" initial={{ opacity: 0, scale: 2.4, rotate: -32 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} transition={{ ...stamp, delay: 0.6 }}>Feito na casa</motion.span>
      <span className="eyebrow">Receita concluída</span>
      <h2>Bom apetite!</h2>
      <p className="finale-sub">{recipe.title} saiu do fogão.</p>
      <ul className="finale-stats">
        <li><b><CountUp value={minutes}/></b><span>min no fogão</span></li>
        <li><b><CountUp value={steps}/></b><span>passo{steps > 1 ? 's' : ''}</span></li>
        <li><b><CountUp value={timers}/></b><span>relógio{timers === 1 ? '' : 's'}</span></li>
      </ul>
      {catalog ? <>
        <p className="finale-hint">Gostou? Guarde no seu caderno para fazer de novo quando quiser.</p>
        <div className="finale-actions"><BusyButton className="button" busyLabel="Copiando a ficha…" onClick={onSave}><Plus size={18}/> Guardar no meu caderno</BusyButton><button type="button" className="button button-paper" onClick={onClose}>Voltar à receita</button></div>
      </> : <>
        <div className="finale-rate"><span>Como ficou desta vez?</span><HandStars value={rating} size={32} label="Nota deste preparo" onRate={n => setRating(n === rating ? 0 : n)}/></div>
        <textarea rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Uma anotação para a próxima vez…" aria-label="Anotação deste preparo"/>
        <div className="finale-actions"><BusyButton className="button" busyLabel="Anotando no caderno…" onClick={register}>Registrar em “Vezes que fiz”</BusyButton><button type="button" className="button button-paper" onClick={onClose}>Sair sem registrar</button></div>
      </>}
      <button type="button" className="text-button finale-review" onClick={onReview}>Rever os passos</button>
    </motion.section>
  </motion.div>
}
