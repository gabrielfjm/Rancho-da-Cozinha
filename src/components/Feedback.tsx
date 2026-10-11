import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { ink, paper, stamp } from '../lib/motion'

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Trava uma ação assíncrona enquanto ela roda: um clique, uma gravação. */
export function useBusy() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const run = useCallback(async <T,>(task: () => Promise<T> | T): Promise<T | undefined> => {
    if (lock.current) return undefined
    lock.current = true; setBusy(true)
    try { return await task() } finally { lock.current = false; setBusy(false) }
  }, [])
  return [busy, run] as const
}

/** Colher de pau mexendo a tigela: o "aguarde" da casa. */
export function Stir({ size = 18 }: { size?: number }) {
  return <svg className="stir" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><g className="stir-spoon"><path d="M12 14.5V2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/><ellipse cx="12" cy="14.6" rx="2" ry="1.3" fill="currentColor"/></g><path d="M2.8 12.2h18.4a9.2 8.4 0 0 1-18.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="var(--stir-bowl, transparent)"/></svg>
}

export function InkCheck({ size = 16 }: { size?: number }) {
  return <svg className="ink-check-mark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.8 9.4 18 20 5.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

/** Quadradinho desenhado à caneta, com o visto riscado ao marcar. */
export function InkBox() {
  return <svg className="ink-box" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path className="ink-box-frame" d="M3.6 4.3c4.8-.7 10-.6 14.9.1.5 4.6.4 9.3-.1 13.9-4.9.6-9.8.6-14.7 0-.5-4.6-.6-9.3-.1-14Z"/><path className="ink-box-tick" d="M6.2 11.6 9.7 15.4 17.4 5.4"/></svg>
}

type BusyButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: () => Promise<unknown> | unknown; busyLabel?: string; doneLabel?: string
}
/** Botão que não aceita clique repetido enquanto o servidor responde. */
export function BusyButton({ onClick, busyLabel = 'Um instante…', doneLabel, children, className = 'button', disabled, ...rest }: BusyButtonProps) {
  const [busy, run] = useBusy()
  const [done, setDone] = useState(false)
  useEffect(() => { if (!done) return; const timer = setTimeout(() => setDone(false), 1800); return () => clearTimeout(timer) }, [done])
  const face = busy ? 'busy' : done ? 'done' : 'idle'
  return <button type="button" {...rest} className={`${className} busy-button is-${face}`} aria-busy={busy} disabled={disabled || busy} onClick={() => void run(async () => {
    try { const result = await onClick(); if (doneLabel && result !== false) setDone(true) } catch (error) { console.error(error) }
  })}>
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={face} className="busy-face" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -7 }} transition={{ duration: 0.15 }}>
        {busy ? <><Stir/>{busyLabel}</> : done ? <><InkCheck/>{doneLabel}</> : children}
      </motion.span>
    </AnimatePresence>
  </button>
}

/** Confirmação presa no próprio botão, sem janelas do navegador. */
export function ConfirmButton({ className = 'icon-button', label, icon, question, confirmLabel, busyLabel, onConfirm }: {
  className?: string; label: string; icon: ReactNode; question: string; confirmLabel: string; busyLabel: string; onConfirm: () => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  const [busy, run] = useBusy()
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <span className="confirm-wrap" ref={box}>
    <button type="button" className={className} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>{icon}</button>
    <AnimatePresence>{open && <motion.div className="confirm-pop" role="dialog" aria-label={question} initial={{ opacity: 0, y: -8, rotate: -3, scale: 0.94 }} animate={{ opacity: 1, y: 0, rotate: -0.8, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.96, transition: { duration: 0.14 } }} transition={paper}>
      <p>{question}</p>
      <div><button type="button" className="text-button" onClick={() => setOpen(false)} disabled={busy}>Deixar como está</button><button type="button" className="button button-small" autoFocus disabled={busy} onClick={() => void run(async () => { await onConfirm(); setOpen(false) })}>{busy ? <><Stir/>{busyLabel}</> : confirmLabel}</button></div>
    </motion.div>}</AnimatePresence>
  </span>
}

export type Note = { id: string; text: string; tone: 'ok' | 'warn' }
/** Avisos como comandas de lanchonete presas no balcão. */
export function TicketStack({ notes, dismiss }: { notes: Note[]; dismiss: (id: string) => void }) {
  return <div className="ticket-stack" role="status" aria-live="polite">
    <AnimatePresence initial={false}>{notes.map((note, index) => <motion.button type="button" layout key={note.id} className={`ticket ${note.tone}`} onClick={() => dismiss(note.id)} initial={{ opacity: 0, y: 46, rotate: -5 }} animate={{ opacity: 1, y: 0, rotate: index % 2 ? 1.2 : -1 }} exit={{ opacity: 0, x: 70, rotate: 7, transition: { duration: 0.22 } }} transition={paper}>
      <span className="ticket-paper"><span className="ticket-stub">{note.tone === 'ok' ? <InkCheck size={15}/> : '!'}</span><span className="ticket-text">{note.text}</span></span>
    </motion.button>)}</AnimatePresence>
  </div>
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'local'
const syncText: Record<SyncStatus, string> = {
  idle: 'Caderno em dia', syncing: 'Sincronizando…', offline: 'Sem internet — guardando no aparelho',
  error: 'A sincronização falhou. Toque para tentar de novo', local: 'Caderno só neste aparelho'
}
/** Lampião do cabeçalho: chama firme quando está tudo salvo, tremula quando conversa com o servidor. */
export function SyncLamp({ status, pending, onRetry }: { status: SyncStatus; pending: number; onRetry: () => void }) {
  const text = status === 'offline' && pending ? `${pending} alteração${pending > 1 ? 'ões' : ''} esperando a internet` : syncText[status]
  const short = status === 'syncing' ? 'Sincronizando…' : status === 'offline' ? 'Sem internet' : status === 'error' ? 'Tentar de novo' : ''
  return <button type="button" className={`sync-lamp ${status}`} onClick={onRetry} title={text} aria-label={text}>
    <svg width="22" height="27" viewBox="0 0 22 27" fill="none" aria-hidden="true"><path d="M7 5a4 4 0 0 1 8 0" stroke="currentColor" strokeWidth="1.5"/><path d="M5.3 7.3h11.4l-1.2 2.6H6.5Z" fill="currentColor"/><circle className="lamp-halo" cx="11" cy="15.6" r="7.5"/><rect className="lamp-glass" x="6" y="9.9" width="10" height="11.2" rx="2.2" stroke="currentColor" strokeWidth="1.5"/><path className="lamp-flame" d="M11 18.9c-1.6 0-2.5-1.1-2.5-2.3 0-1.6 1.5-2.6 2.5-4.6 1 2 2.5 3 2.5 4.6 0 1.2-.9 2.3-2.5 2.3Z"/><path d="M4.6 21.1h12.8l-1.1 2.7H5.7Z" fill="currentColor"/></svg>
    {pending > 0 && status !== 'syncing' && <b>{pending}</b>}
    <span aria-hidden="true">{short}</span>
  </button>
}

/** Número que corre até o valor quando aparece na tela. */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const from = useRef(0)
  const format = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  const [initial] = useState(() => format(0))
  useEffect(() => {
    const node = ref.current
    if (!node || !seen) return
    if (reduce) { node.textContent = format(value); from.current = value; return }
    const controls = animate(from.current, value, { duration: 0.85, ease: ink, onUpdate: v => { node.textContent = format(v) } })
    from.current = value
    return () => controls.stop()
  }, [seen, value]) // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className="count-up">{initial}</span>
}

/** Carimbo que desce com força e fica levemente torto. */
export function Stamp({ children, className = '', delay = 0, angle = -8 }: { children: ReactNode; className?: string; delay?: number; angle?: number }) {
  return <motion.span className={`rubber-stamp ${className}`} initial={{ opacity: 0, scale: 1.9, rotate: angle - 14 }} animate={{ opacity: 1, scale: 1, rotate: angle }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ ...stamp, delay }}>{children}</motion.span>
}
