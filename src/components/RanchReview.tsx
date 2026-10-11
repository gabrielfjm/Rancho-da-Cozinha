import { useId, useState } from 'react'
import { motion } from 'framer-motion'
import type { Recipe } from '../types'
import { ranchReviews, ribbonFor, scoreLabel } from '../data/ranchReviews'
import { inView, ink, pendulum, rise, stamp } from '../lib/motion'
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
/** Varal de provas: as fichas julgadas penduradas com prendedor de madeira. */
export function ReviewLine({ recipes, onOpen }: { recipes: Recipe[]; onOpen: (recipe: Recipe) => void }) {
  const ranked = recipes.filter(recipe => ranchReviews[recipe.id]).sort((a, b) => ranchReviews[b.id].score - ranchReviews[a.id].score)
  return <div className="clothesline"><div className="clothesline-track" tabIndex={0} aria-label="Avaliações das receitas recomendadas pelo Rancho">
    {ranked.map((recipe, index) => {
      const review = ranchReviews[recipe.id]
      const rest = sway[index % sway.length]
      return <motion.article key={recipe.id} className="pinned-note" style={{ originY: 0 }} initial={{ y: -70, opacity: 0, rotate: rest * 4 }} whileInView={{ y: 0, opacity: 1, rotate: rest }} viewport={{ once: true, amount: 0.35 }} transition={{ ...pendulum, delay: (index % 4) * 0.09 }} whileHover={{ rotate: 0, y: 5, transition: { duration: 0.35, ease: ink } }}>
        <span className="clothespin" aria-hidden="true"/>
        <div className="note-top"><Photo value={recipe.cover} alt="" className="note-photo"/><Rosette score={review.score} size={58}/></div>
        <span className="eyebrow">{review.ribbon}</span>
        <h3>{recipe.title}</h3>
        <HandStars value={review.score} size={14}/>
        <p className="note-verdict">“{review.verdict}”</p>
        <button type="button" className="text-button" onClick={() => onOpen(recipe)}>Ler a ficha de prova →</button>
      </motion.article>
    })}
  </div></div>
}
