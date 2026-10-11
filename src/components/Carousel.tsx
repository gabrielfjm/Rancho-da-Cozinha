import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Passagem automática compartilhada pelos carrosséis da casa.
 * Para com o mouse em cima, durante o arrasto e por alguns segundos depois de um toque;
 * toque no celular não conta como "mouse em cima".
 */
export function useRotation(count: number, dwell: number, ref: RefObject<Element | null>) {
  const reduce = useReducedMotion()
  const onScreen = useInView(ref, { amount: 0.3 })
  const [index, setIndex] = useState(0)
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [resting, setResting] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const restTimer = useRef<number | undefined>(undefined)
  const playing = !reduce && !hover && !dragging && !resting && !hidden && onScreen && count > 1
  useEffect(() => { const sync = () => setHidden(document.hidden); document.addEventListener('visibilitychange', sync); return () => document.removeEventListener('visibilitychange', sync) }, [])
  useEffect(() => () => window.clearTimeout(restTimer.current), [])
  useEffect(() => { if (index >= count) setIndex(0) }, [count, index])
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % count), dwell)
    return () => window.clearTimeout(timer)
  }, [playing, index, count, dwell])
  function rest() { setResting(true); window.clearTimeout(restTimer.current); restTimer.current = window.setTimeout(() => setResting(false), 6500) }
  function goTo(target: number) { setIndex((target % count + count) % count); rest() }
  const hoverProps = {
    onPointerEnter: (event: PointerEvent) => { if (event.pointerType === 'mouse') setHover(true) },
    onPointerLeave: (event: PointerEvent) => { if (event.pointerType === 'mouse') setHover(false) }
  }
  return { index: Math.min(index, Math.max(0, count - 1)), setIndex, goTo, playing, dwell, setDragging, rest, hoverProps }
}

/** Placa de madeira em forma de seta. */
export function SignArrow({ direction, label, onClick, small = false }: { direction: 'prev' | 'next'; label: string; onClick: () => void; small?: boolean }) {
  return <button type="button" className={`line-arrow ${direction}${small ? ' small' : ''}`} aria-label={label} onClick={onClick}><span className="line-arrow-sign">{direction === 'prev' ? <ChevronLeft size={small ? 22 : 26} strokeWidth={2.6}/> : <ChevronRight size={small ? 22 : 26} strokeWidth={2.6}/>}</span></button>
}

/** Prendedores de roupa como marcador de posição; o atual vai enchendo enquanto o carrossel passa sozinho. */
export function Pins({ count, current, playing, dwell, onPick, label }: { count: number; current: number; playing: boolean; dwell: number; onPick: (index: number) => void; label: (index: number) => string }) {
  return <div className="line-pins">{Array.from({ length: count }, (_, page) => <button type="button" key={page} className={page === current ? 'is-on' : ''} aria-label={label(page)} aria-current={page === current} onClick={() => onPick(page)}><i>{page === current && playing && <b key={current} style={{ animationDuration: `${dwell}ms` }}/>}</i></button>)}</div>
}
