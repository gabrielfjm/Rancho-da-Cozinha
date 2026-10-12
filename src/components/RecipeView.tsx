import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, BookOpen, ChefHat, Clock3, Heart, ListPlus, Pencil, Plus, Printer, Share2, Star, Trash2 } from 'lucide-react'
import type { CookLog, Recipe, RecipeIngredient } from '../types'
import { gramsFor, prettyAmount, uid } from '../lib/format'
import { calculateNutrition } from '../lib/nutrition'
import { ink, paper, stamp } from '../lib/motion'
import { ranchReviews, scoreLabel } from '../data/ranchReviews'
import { Ornament, Skillet } from './Artwork'
import { BusyButton, ConfirmButton, CountUp, InkBox, Stamp, useBusy } from './Feedback'
import { Photo } from './Photo'
import { DishFx, dishMotion, fxClass } from './DishFx'
import { HandStars, ReviewCard, Rosette } from './RanchReview'
import { UtensilRack } from './Utensils'

function measure(item: RecipeIngredient, factor: number, metric: boolean) {
  if (item.amount === null) return item.note ? '' : 'a gosto'
  if (metric) {
    const grams = gramsFor(item.amount * factor, item.unit, item.gramsPerUnit)
    if (grams !== null) return `${prettyAmount(grams)} ${item.unit === 'ml' || item.unit === 'l' ? 'ml' : 'g'}`
  }
  return `${prettyAmount(item.amount * factor)} ${item.unit}`
}

function FavoriteButton({ on, onToggle }: { on: boolean; onToggle: () => Promise<unknown> }) {
  const [busy, run] = useBusy()
  const [touched, setTouched] = useState(false)
  return <motion.button type="button" className={`icon-button heart-button${on ? ' is-on' : ''}`} aria-pressed={on} aria-label={on ? 'Remover dos favoritos' : 'Favoritar'} disabled={busy} onClick={() => { setTouched(true); void run(onToggle) }} whileTap={{ scale: 0.82 }}>
    <motion.span key={String(on)} initial={touched && on ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 11 }}><Heart size={19} fill={on ? 'currentColor' : 'none'}/></motion.span>
    {touched && on && <span className="heart-ring" aria-hidden="true"/>}
  </motion.button>
}

export function RecipeView({ recipe, logs, catalog = false, backLabel, onBack, onEdit, onDelete, onFavorite, onRate, onShare, onSaveToNotebook, onKitchen, onShopping, onLog }: {
  recipe: Recipe; logs: CookLog[]; catalog?: boolean; backLabel?: string; onBack: () => void; onEdit: () => void; onDelete: () => Promise<unknown>
  onFavorite: () => Promise<unknown>; onRate: (rating: number) => Promise<unknown>; onShare: () => Promise<unknown>; onSaveToNotebook?: () => Promise<unknown>
  onKitchen: () => void; onShopping: () => Promise<boolean>; onLog: (log: CookLog) => Promise<boolean>
}) {
  const [servings, setServings] = useState(recipe.servings)
  const [metric, setMetric] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [note, setNote] = useState('')
  const factor = servings / Math.max(recipe.servings, 1)
  const grouped = useMemo(() => recipe.ingredients.reduce<Record<string, RecipeIngredient[]>>((groups, item) => { (groups[item.group || 'Ingredientes'] ??= []).push(item); return groups }, {}), [recipe.ingredients])
  const nutrition = useMemo(() => calculateNutrition(recipe), [recipe])
  const review = ranchReviews[recipe.id]
  const fx = dishMotion(recipe)
  const total = recipe.ingredients.length
  function toggle(id: string) { setChecked(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]) }

  return <main className="page view-page">
    <div className="recipe-actions no-print"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> {backLabel ?? 'Voltar ao caderno'}</button><div>{catalog
      ? <BusyButton className="button button-small" busyLabel="Copiando a ficha…" onClick={() => onSaveToNotebook?.()}><Plus size={17}/> Guardar no meu caderno</BusyButton>
      : <><FavoriteButton on={recipe.favorite} onToggle={onFavorite}/><button className="icon-button" onClick={onEdit} aria-label="Editar receita"><Pencil size={18}/></button><button className="icon-button" onClick={() => window.print()} aria-label="Imprimir ou salvar em PDF"><Printer size={18}/></button><BusyButton className="icon-button" busyLabel="" onClick={onShare} aria-label="Compartilhar receita"><Share2 size={18}/></BusyButton><ConfirmButton label="Excluir receita" icon={<Trash2 size={18}/>} question="Arrancar esta ficha do caderno? Não dá para desfazer." confirmLabel="Arrancar a ficha" busyLabel="Arrancando…" onConfirm={onDelete}/></>}</div></div>

    <header className="recipe-cover">
      <motion.div className="recipe-cover-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ink, delay: 0.1 }}>
        <span className="eyebrow">{recipe.category} · {catalog ? recipe.originalLanguage ? 'Acervo internacional' : 'Base brasileira do Rancho' : 'Ficha da casa'}</span>
        <h1>{recipe.title}</h1><p>{recipe.description}</p>
        <div className="cover-meta"><span><Clock3 size={16}/>{recipe.prepMinutes + recipe.cookMinutes ? `${recipe.prepMinutes + recipe.cookMinutes} min` : 'Tempo não informado'}</span>{recipe.difficultyKnown !== false && <span><ChefHat size={16}/>{recipe.difficulty} chapéu{recipe.difficulty > 1 ? 's' : ''}</span>}
          {review && <button type="button" className="cover-score" onClick={() => document.getElementById('parecer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Star size={16} fill="currentColor"/>Nota do Rancho {scoreLabel(review.score)}</button>}
          {!catalog && <span className="cover-rating no-print"><small>Sua nota</small><HandStars value={recipe.rating} size={19} label="Sua nota para esta receita" onRate={n => void onRate(n === recipe.rating ? 0 : n)}/></span>}
        </div>
      </motion.div>
      <motion.div className="cover-art" initial={{ opacity: 0, rotate: 9, y: 22 }} animate={{ opacity: 1, rotate: 0, y: 0 }} transition={{ ...paper, delay: 0.18 }}>
        {recipe.cover ? <div className={`cover-photo ${fxClass(fx)} always`}><Photo value={recipe.cover} alt={`Foto de ${recipe.title}`}/><DishFx kind={fx} mode="always"/></div> : <Skillet size={150}/>}
        {review && <motion.div className="cover-rosette" initial={{ rotate: -40, scale: 0.4, opacity: 0 }} animate={{ rotate: -10, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 9, delay: 0.5 }}><Rosette score={review.score} size={74}/></motion.div>}
      </motion.div>
    </header>

    {recipe.story && <motion.aside className="story-note" initial={{ opacity: 0, y: -10, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: -0.4 }} transition={{ ...paper, delay: 0.3 }}><span>Do caderno</span><p>{recipe.story}</p>{recipe.source && <small>Fonte: {recipe.sourceUrl?.startsWith('https://') ? <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.source}</a> : recipe.source}</small>}</motion.aside>}

    <div className="view-toolbar no-print">
      <label>{recipe.servingsKnown === false ? 'Multiplicar receita' : 'Porções'} <div className="counter"><button type="button" onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Diminuir porções">−</button><span className="counter-window"><AnimatePresence mode="popLayout" initial={false}><motion.strong key={servings} initial={{ y: -14, opacity: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ y: 14, opacity: 0 }} transition={{ duration: 0.2 }}>{servings}</motion.strong></AnimatePresence></span><button type="button" onClick={() => setServings(servings + 1)} aria-label="Aumentar porções">+</button></div></label>
      <label className="switch-label"><input type="checkbox" checked={metric} onChange={e => setMetric(e.target.checked)}/><span className="switch-track" aria-hidden="true"><i/></span> Medidas métricas</label>
      <button className="button button-small" onClick={onKitchen}><BookOpen size={17}/> Modo cozinha</button>
    </div>

    <div className="mobile-tabs no-print">{(['ingredients', 'steps'] as const).map(value => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{tab === value && <motion.span layoutId="tab-ink" className="tab-ink" transition={paper}/>}<span>{value === 'ingredients' ? 'Ingredientes' : 'Preparo'}</span></button>)}</div>

    <div className="open-book">
      <section className={`book-page ingredients-page ${tab === 'steps' ? 'mobile-hidden' : ''}`}>
        <div className="book-page-title"><span>01 / O que separar</span><h2>Ingredientes</h2></div>
        {total > 0 && <div className="gather no-print"><span>{checked.length === 0 ? 'Marque o que já está na bancada' : `${checked.length} de ${total} separados`}</span><i><motion.b initial={false} animate={{ scaleX: checked.length / total }} transition={paper}/></i></div>}
        <AnimatePresence>{total > 0 && checked.length === total && <Stamp className="bench-stamp" angle={-7}>Tudo na bancada</Stamp>}</AnimatePresence>
        {Object.entries(grouped).map(([group, items]) => <div className="ingredient-group" key={group}><h3>{group}</h3><ul>{items.map(item => {
          const done = checked.includes(item.id)
          const amount = measure(item, factor, metric)
          return <li key={item.id}><label className={`ink-check${done ? ' struck' : ''}`}><input type="checkbox" checked={done} onChange={() => toggle(item.id)}/><InkBox/><span className="ink-text"><motion.strong key={amount} initial={{ opacity: 0.2, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{amount}</motion.strong> {item.name}{item.note && <em> — {item.note}</em>}</span></label></li>
        })}</ul></div>)}
        <BusyButton className="button button-outline button-small no-print" busyLabel="Somando à lista…" doneLabel="Foi para a lista" onClick={onShopping}><ListPlus size={17}/> Levar para a lista</BusyButton>
        <UtensilRack items={recipe.utensils}/>
      </section>
      <section className={`book-page steps-page ${tab === 'ingredients' ? 'mobile-hidden' : ''}`}>
        <div className="book-page-title"><span>02 / Hora de cozinhar</span><h2>Modo de preparo</h2></div>
        <ol className="steps-list">{recipe.steps.map((step, index) => <motion.li key={step.id} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.45, ease: ink, delay: Math.min(index, 5) * 0.06 }}><span className="step-number">{String(index + 1).padStart(2, '0')}</span><div><p>{step.text}</p>{step.timerMinutes && <small className="step-clock">Relógio: {step.timerMinutes} min</small>}{step.photo && <Photo value={step.photo} alt={`Passo ${index + 1}`} className="step-photo"/>}</div></motion.li>)}</ol>
        {recipe.tips && <motion.div className="tips" initial={{ opacity: 0, y: 18, rotate: -5 }} whileInView={{ opacity: 1, y: 0, rotate: -1 }} viewport={{ once: true }} transition={paper}><strong>Dica da casa</strong><p>{recipe.tips}</p></motion.div>}
      </section>
    </div>

    {review && <ReviewCard recipe={recipe}/>}

    {recipe.gallery.length > 0 && <section className="recipe-gallery"><div><span className="eyebrow">Retratos da mesa</span><h2>Galeria da receita</h2></div><div>{recipe.gallery.map((image, index) => <motion.div key={`${image}-${index}`} initial={{ opacity: 0, y: 24, rotate: index % 2 ? 6 : -6 }} whileInView={{ opacity: 1, y: 0, rotate: index % 2 ? 1.2 : -1.2 }} viewport={{ once: true }} transition={{ ...paper, delay: index * 0.07 }} whileHover={{ rotate: 0, scale: 1.03 }}><Photo value={image} alt={`${recipe.title}, foto ${index + 1}`}/></motion.div>)}</div></section>}

    <div className={`after-book${catalog ? ' catalog-nutrition' : ''}`}>
      <section className="nutrition-panel"><span className="eyebrow">Estimativa automática</span><h2>Na mesa, por porção</h2><p>Calculado automaticamente pelas quantidades e porções, usando a composição disponível para {nutrition.known} de {recipe.ingredients.length} ingredientes.</p><div className="nutrition-grid">{([['Energia', nutrition.kcal, 'kcal'], ['Proteínas', nutrition.protein, 'g'], ['Carboidratos', nutrition.carbs, 'g'], ['Gorduras', nutrition.fat, 'g'], ['Fibras', nutrition.fiber, 'g']] as const).map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{nutrition.known ? <CountUp value={value} decimals={1} suffix={` ${unit}`}/> : `— ${unit}`}</strong></div>)}</div></section>
      {!catalog && <section className="cook-history"><h2>Vezes que fiz</h2>
        <div className="log-entry no-print"><input aria-label="Nota deste preparo" value={note} onChange={e => setNote(e.target.value)} placeholder="Como ficou desta vez?"/><BusyButton className="button button-small" busyLabel="Anotando…" onClick={async () => { const ok = await onLog({ id: uid(), recipeId: recipe.id, cookedAt: new Date().toISOString(), note }); if (ok) setNote(''); return ok }}>Registrar preparo</BusyButton></div>
        {logs.length === 0 && <p>A primeira lembrança desta receita ainda está por vir.</p>}
        <AnimatePresence initial={false}>{logs.map(log => <motion.p className="history-line" key={log.id} layout initial={{ opacity: 0, x: -14, height: 0 }} animate={{ opacity: 1, x: 0, height: 'auto' }} transition={stamp}><strong>{new Date(log.cookedAt).toLocaleDateString('pt-BR')}</strong> {log.note}</motion.p>)}</AnimatePresence>
      </section>}
    </div>
    <Ornament/>
  </main>
}
