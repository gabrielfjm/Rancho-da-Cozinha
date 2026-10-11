import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Heart } from 'lucide-react'
import { ink, paper } from '../lib/motion'
import { InkCheck } from './Feedback'

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches)
  useEffect(() => {
    const media = matchMedia(query); const sync = () => setMatch(media.matches)
    sync(); media.addEventListener('change', sync); return () => media.removeEventListener('change', sync)
  }, [query])
  return match
}

export type PaperOption = { value: string; label: string; hint?: string }
/** Menu de papel pautado com margem vermelha, no lugar do select do navegador. */
export function PaperSelect({ label, value, options, onChange, placeholder = 'Escolher', compact = false, icon }: {
  label: string; value: string; options: PaperOption[]; onChange: (value: string) => void; placeholder?: string; compact?: boolean; icon?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find(option => option.value === value)
  useEffect(() => {
    if (!open) return
    setActive(Math.max(0, options.findIndex(option => option.value === value)))
    const outside = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  function choose(option: PaperOption) { onChange(option.value); setOpen(false) }
  function keys(event: KeyboardEvent) {
    if (!open) { if (['ArrowDown', 'Enter', ' '].includes(event.key)) { event.preventDefault(); setOpen(true) } return }
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(current => Math.min(options.length - 1, current + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(current => Math.max(0, current - 1)) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[active]) choose(options[active]) }
    else if (event.key === 'Tab') setOpen(false)
  }
  return <div className={`paper-select${compact ? ' compact' : ''}${open ? ' is-open' : ''}`} ref={box}>
    <button type="button" className="paper-select-button" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} aria-label={compact ? label : undefined} aria-activedescendant={open ? `${id}-${active}` : undefined} onClick={() => setOpen(!open)} onKeyDown={keys}>
      {icon}<span className="paper-select-text">{!compact && <small>{label}</small>}<strong>{selected?.label ?? placeholder}</strong></span><ChevronDown className="paper-select-chevron" size={17}/>
    </button>
    <AnimatePresence>{open && <motion.ul id={id} role="listbox" aria-label={label} className="paper-select-menu" style={compact ? { originY: 0, x: '-50%' } : { originY: 0 }} initial={{ opacity: 0, y: -6, scaleY: 0.9 }} animate={{ opacity: 1, y: 0, scaleY: 1 }} exit={{ opacity: 0, y: -4, scaleY: 0.95, transition: { duration: 0.12 } }} transition={{ duration: 0.2, ease: ink }}>
      {options.map((option, index) => <li key={option.value} id={`${id}-${index}`} role="option" aria-selected={option.value === value} className={index === active ? 'is-active' : ''} onPointerEnter={() => setActive(index)} onClick={() => choose(option)}>
        <span className="paper-tick">{option.value === value && <InkCheck size={14}/>}</span><span>{option.label}</span>{option.hint && <small>{option.hint}</small>}
      </li>)}
    </motion.ul>}</AnimatePresence>
  </div>
}

/** Chapéu de cowboy em traço simples, a unidade de dificuldade da casa. */
export function Hat({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size * 0.72} viewBox="0 0 30 22" fill="none" aria-hidden="true"><path d="M8.5 14.5c-.3-5 .9-9.6 3.3-9.6 1.2 0 1.8 1.2 3.2 1.2s2-1.2 3.2-1.2c2.4 0 3.6 4.6 3.3 9.6" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M2 13.2c1.6 3.2 6.6 5 13 5s11.4-1.8 13-5c-2.6 1.4-7.2 2.1-13 2.1S4.6 14.6 2 13.2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 12.6c3.8 1 8.2 1 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

export function HatPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="hat-picker" role="radiogroup" aria-label="Dificuldade">
    <small className="hat-caption">Dificuldade</small>
    {[0, 1, 2, 3].map(level => <button type="button" role="radio" key={level} aria-checked={value === level} aria-label={level ? `${level} chapéu${level > 1 ? 's' : ''}` : 'Qualquer dificuldade'} title={level ? ['Fácil', 'Média', 'Caprichada'][level - 1] : 'Qualquer dificuldade'} className={value === level ? 'is-on' : ''} onClick={() => onChange(level)}>
      {value === level && <motion.span layoutId="hat-ink" className="hat-ink" transition={paper}/>}
      <span className="hat-face">{level ? Array.from({ length: level }, (_, i) => <Hat key={i} size={level === 3 ? 21 : 25}/>) : 'Todas'}</span>
    </button>)}
  </div>
}

export function FavoriteToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return <motion.button type="button" className="fav-toggle" aria-pressed={on} onClick={() => onChange(!on)} whileTap={{ scale: 0.95 }}>
    <motion.span key={String(on)} initial={on ? { scale: 0.3, rotate: -20 } : false} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 12 }}><Heart size={18} fill={on ? 'currentColor' : 'none'}/></motion.span>
    Favoritas da casa
  </motion.button>
}
