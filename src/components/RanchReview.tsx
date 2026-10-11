import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Recipe } from '../types'
import { ranchReviews, ribbonFor, scoreLabel } from '../data/ranchReviews'
import { inView, ink, paper, pendulum, rise, stamp } from '../lib/motion'
import { Photo } from './Photo'

// Estrela de traço levemente torto, como feita à mão com caneta-tinteiro.
const STAR = 'M12.1 2.4l2.7 6.1 6.6.5-5 4.4 1.6 6.4-5.9-3.4-5.8 3.5 1.4-6.5-4.9-4.3 6.6-.7Z'

function StarGlyph({ fill, size }: { fill: number; size: number }) {
  const clip = `s${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id={clip}><rect width={24 * fill} height="24"/></clipPath></defs><path d={STAR} className="star-fill" clipPath={`url(#${clip})`}/><path d={STAR} className="star-line"/></svg>
}

export function HandStars({ value, size = 16, onRate, label }: { value: number; size?: number; onRate?: (n: number) => void; label?: string }) {
  const [hover, setHover] = useState(0)
  const stars = [1, 2, 3, 4, 5]
  if (onRate) {
    const shown = hover || value
    return <div className="hand-stars interactive" role="radiogroup" aria-label={label ?? 'Avaliação'} onMouseLeave={() => setHover(0)}>
      {stars.map(n => <motion.button type="button" key={n} role="radio" aria-checked={value === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onFocus={() => setHover(n)} onBlur={() => setHover(0)} onClick={() => onRate(n)} whileTap={{ scale: 0.75, rotate: -14 }} animate={{ rotate: shown >= n ? (n % 2 ? -5 : 4) : 0 }} transition={stamp}><StarGlyph fill={shown >= n ? 1 : 0} size={size}/></motion.button>)}
    </div>
  }
  return <span className="hand-stars" role="img" aria-label={label ?? `${scoreLabel(value)} de 5 estrelas`}>
    {stars.map(n => <motion.span key={n} initial={{ scale: 0, rotate: -40 }} whileInView={{ scale: 1, rotate: n % 2 ? -4 : 5 }} viewport={{ once: true }} transition={{ ...stamp, delay: 0.1 + n * 0.06 }}><StarGlyph fill={Math.max(0, Math.min(1, value - n + 1))} size={size}/></motion.span>)}
  </span>
}

function pleats(count: number, outer: number, inner: number) {
  return Array.from({ length: count * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer
    const angle = (Math.PI * i) / count - Math.PI / 2
    return `${(50 + r * Math.cos(angle)).toFixed(1)},${(46 + r * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}
const PLEATS = pleats(24, 41, 35.5)

/** Roseta de feira de condado com a nota do Rancho. */
export function Rosette({ score, size = 96 }: { score: number; size?: number }) {
  const rank = ribbonFor(score)
  return <svg className={`rosette rosette-${rank.color}`} width={size} height={size * 1.35} viewBox="0 0 100 135" role="img" aria-label={`Fita ${rank.color}, ${rank.place}: nota ${scoreLabel(score)} de 5`}>
    <polygon className="rosette-tail" points="41,66 23,128 33,121 41,131 53,70"/>
    <polygon className="rosette-tail" points="59,66 77,128 67,121 59,131 47,70"/>
    <polygon className="rosette-pleat" points={PLEATS}/>
    <circle className="rosette-ring" cx="50" cy="46" r="29"/>
    <circle className="rosette-core" cx="50" cy="46" r="24.5"/>
    <text className="rosette-place" x="50" y="38.5">{rank.place}</text>
    <text className="rosette-score" x="50" y="58">{scoreLabel(score)}</text>
  </svg>
}

export function MiniReview({ id }: { id: string }) {
  const review = ranchReviews[id]
  if (!review) return null
  return <span className="mini-review"><HandStars value={review.score} size={13}/><b>{scoreLabel(review.score)}</b><small>nota do Rancho</small></span>
}

/** Ficha de julgamento completa, mostrada dentro da receita. */
export function ReviewCard({ recipe }: { recipe: Recipe }) {
  const review = ranchReviews[recipe.id]
  if (!review) return null
  const rows: [string, number][] = [['Sabor', review.criteria.sabor], ['Facilidade', review.criteria.facilidade], ['Cabe no bolso', review.criteria.bolso], ['Faria de novo', review.criteria.repetir]]
  return <motion.section id="parecer" className="review-card" {...inView} variants={rise}>
    <header>
      <div><span className="eyebrow">Parecer da cozinha de teste</span><h2>Ficha de prova</h2><small>Feita {review.tries} vezes antes de entrar no caderno · provada em {review.testedIn}</small></div>
      <motion.div className="rosette-wrap" initial={{ rotate: -32, scale: 0.5, opacity: 0 }} whileInView={{ rotate: -6, scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ ...pendulum, delay: 0.2 }}><Rosette score={review.score}/></motion.div>
    </header>
    <div className="review-body">
      <ul className="review-criteria">{rows.map(([label, value]) => <li key={label}><span>{label}</span><HandStars value={value} size={17} label={`${label}: ${value} de 5`}/></li>)}</ul>
      <div className="review-verdict"><blockquote>“{review.verdict}”</blockquote><p>{review.notes}</p></div>
    </div>
    <footer><div className="review-pairing"><strong>Na mesa com</strong>{review.pairing.map(item => <span key={item}>{item}</span>)}</div><span className="review-occasion">{review.occasion}</span></footer>
    <motion.span className="rubber-stamp review-stamp" initial={{ opacity: 0, scale: 1.9, rotate: -26 }} whileInView={{ opacity: 1, scale: 1, rotate: -11 }} viewport={{ once: true }} transition={{ ...stamp, delay: 0.6 }}>{review.ribbon}</motion.span>
  </motion.section>
}

const sway = [-2.6, 1.8, -1.2, 2.4, -1.8]
const GAP = 22
const MIN_CARD = 230
/**
 * Varal de provas: as fichas correm pelo varal como roupa no arame.
 * Passa sozinho, para quando a pessoa mexe, aceita arrastar com o dedo e setas de placa de madeira.
 */
export function ReviewLine({ recipes, onOpen }: { recipes: Recipe[]; onOpen: (recipe: Recipe) => void }) {
  const ranked = recipes.filter(recipe => ranchReviews[recipe.id]).sort((a, b) => ranchReviews[b.id].score - ranchReviews[a.id].score)
  const region = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const seen = useInView(region, { once: true, amount: 0.3 })
  const onScreen = useInView(region, { amount: 0.3 })
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const [swing, setSwing] = useState(0)
  const [hold, setHold] = useState(false)
  const [dropped, setDropped] = useState(false)
  const dragged = useRef(false)
  const resumeAt = useRef(0)
  const perView = Math.max(1, Math.floor((width + GAP) / (MIN_CARD + GAP)))
  const card = width ? (width - GAP * (perView - 1)) / perView : 250
  const step = card + GAP
  const last = Math.max(0, ranked.length - perView)
  const current = Math.min(index, last)

  useEffect(() => {
    const node = frame.current; if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node); return () => observer.disconnect()
  }, [])
  useEffect(() => { x.set(-current * step) }, [step]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!seen) return; const timer = setTimeout(() => setDropped(true), 1300); return () => clearTimeout(timer) }, [seen])
  useEffect(() => { if (!swing) return; const timer = setTimeout(() => setSwing(0), 220); return () => clearTimeout(timer) }, [swing])

  function goTo(target: number, byPerson = true) {
    const next = target > last ? 0 : target < 0 ? last : target
    setSwing(Math.sign(next - current)); setIndex(next)
    animate(x, -next * step, reduce ? { duration: 0 } : paper)
    if (byPerson) resumeAt.current = Date.now() + 9000
  }
  useEffect(() => {
    if (reduce || hold || !onScreen || last === 0) return
    const timer = setInterval(() => { if (Date.now() >= resumeAt.current && !document.hidden) goTo(current + 1, false) }, 4800)
    return () => clearInterval(timer)
  }, [reduce, hold, onScreen, last, current, step]) // eslint-disable-line react-hooks/exhaustive-deps

  const range = perView > 1 ? `${current + 1}–${Math.min(current + perView, ranked.length)} de ${ranked.length}` : `${current + 1} de ${ranked.length}`
  return <div className="clothesline" ref={region} role="region" aria-roledescription="carrossel" aria-label="Avaliações das receitas recomendadas pelo Rancho"
    onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocus={() => setHold(true)} onBlur={() => setHold(false)}
    onKeyDown={event => { if (event.key === 'ArrowRight') goTo(current + 1); else if (event.key === 'ArrowLeft') goTo(current - 1) }}>
    <button type="button" className="line-arrow prev" aria-label="Fichas anteriores" onClick={() => goTo(current - 1)}><span className="line-arrow-sign"><ChevronLeft size={26} strokeWidth={2.6}/></span></button>
    <div className="clothesline-frame" ref={frame}>
      <motion.div className="clothesline-track" style={{ x, gap: GAP }} drag={last > 0 ? 'x' : false} dragConstraints={{ left: -last * step, right: 0 }} dragElastic={0.18} dragMomentum={false}
        onPointerDown={() => { dragged.current = false; resumeAt.current = Date.now() + 9000 }}
        onDragStart={() => { dragged.current = true; setHold(true) }}
        onDragEnd={(_, info) => {
          setHold(false)
          const jump = Math.max(1, Math.round(Math.abs(info.offset.x) / step))
          const direction = info.offset.x < -40 || info.velocity.x < -350 ? 1 : info.offset.x > 40 || info.velocity.x > 350 ? -1 : 0
          goTo(Math.min(last, Math.max(0, current + direction * jump)))
        }}>
        {ranked.map((recipe, i) => {
          const review = ranchReviews[recipe.id]
          const rest = sway[i % sway.length] * (perView === 1 ? 0.35 : 1)
          const shown = i >= current && i < current + perView
          return <motion.button type="button" key={recipe.id} className="pinned-note" aria-roledescription="slide" aria-hidden={!shown} tabIndex={shown ? 0 : -1} style={{ width: card, originY: 0 }}
            initial={{ y: -70, opacity: 0, rotate: rest * 4 }} animate={seen ? { y: 0, opacity: 1, rotate: rest - swing * 6 } : undefined} transition={{ ...pendulum, delay: dropped ? 0 : (i % 4) * 0.09 }}
            whileHover={{ rotate: 0, y: 5, transition: { duration: 0.35, ease: ink } }} whileTap={{ scale: 0.98 }}
            onClick={() => { if (!dragged.current) onOpen(recipe) }}>
            <span className="clothespin" aria-hidden="true"/>
            <span className="note-top"><Photo value={recipe.cover} alt="" className="note-photo"/><Rosette score={review.score} size={58}/></span>
            <span className="eyebrow">{review.ribbon}</span>
            <h3>{recipe.title}</h3>
            <HandStars value={review.score} size={14}/>
            <span className="note-verdict">“{review.verdict}”</span>
            <span className="note-cta">Abrir a receita →</span>
          </motion.button>
        })}
      </motion.div>
    </div>
    <button type="button" className="line-arrow next" aria-label="Próximas fichas" onClick={() => goTo(current + 1)}><span className="line-arrow-sign"><ChevronRight size={26} strokeWidth={2.6}/></span></button>
    <div className="line-pager">
      <div className="line-pins">{Array.from({ length: last + 1 }, (_, page) => <button type="button" key={page} className={page === current ? 'is-on' : ''} aria-label={`Ir para a ficha ${page + 1}`} aria-current={page === current} onClick={() => goTo(page)}><i/></button>)}</div>
      <span>{range}</span>
    </div>
  </div>
}
