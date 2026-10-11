import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, ChefHat, Clock3, Heart, ListPlus, Pencil, Plus, Printer, Share2, Star, Trash2 } from 'lucide-react'
import type { CookLog, Recipe, RecipeIngredient } from '../types'
import { gramsFor, prettyAmount, uid } from '../lib/format'
import { calculateNutrition } from '../lib/nutrition'
import { photoUrl } from '../lib/store'
import { Ornament, Skillet } from './Artwork'

function RemotePhoto({ value, alt, className }: { value?: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => { void photoUrl(value).then(setUrl) }, [value])
  return url ? <img src={url} alt={alt} className={className}/> : null
}

function measure(item: RecipeIngredient, factor: number, metric: boolean) {
  if (item.amount === null) return 'a gosto'
  if (metric) {
    const grams = gramsFor(item.amount * factor, item.unit, item.gramsPerUnit)
    if (grams !== null) return `${prettyAmount(grams)} ${item.unit === 'ml' || item.unit === 'l' ? 'ml' : 'g'}`
  }
  return `${prettyAmount(item.amount * factor)} ${item.unit}`
}
export function RecipeView({ recipe, logs, catalog = false, onBack, onEdit, onDelete, onFavorite, onShare, onSaveToNotebook, onKitchen, onShopping, onLog }: {
  recipe: Recipe; logs: CookLog[]; onBack: () => void; onEdit: () => void; onDelete: () => void;
  catalog?: boolean; onFavorite: () => void; onShare: () => void; onSaveToNotebook?: () => void; onKitchen: () => void; onShopping: () => void; onLog: (log: CookLog) => void
}) {
  const [servings, setServings] = useState(recipe.servings)
  const [metric, setMetric] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  const [tab, setTab] = useState<'ingredients' | 'steps'>('ingredients')
  const [photo, setPhoto] = useState<string>()
  const [note, setNote] = useState('')
  useEffect(() => { void photoUrl(recipe.cover).then(setPhoto) }, [recipe.cover])
  const factor = servings / Math.max(recipe.servings, 1)
  const grouped = useMemo(() => recipe.ingredients.reduce<Record<string, RecipeIngredient[]>>((groups, item) => { (groups[item.group || 'Ingredientes'] ??= []).push(item); return groups }, {}), [recipe.ingredients])
  const nutrition = useMemo(() => calculateNutrition(recipe), [recipe])
  function toggle(id: string) { setChecked(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]) }
  async function share() {
    onShare()
    const link = `${location.origin}/?share=${recipe.id}`
    if (navigator.share) { try { await navigator.share({ title: recipe.title, url: link }); return } catch { /* cancelamento */ } }
    await navigator.clipboard.writeText(link)
  }
  return <main className="page view-page">
    <div className="recipe-actions no-print"><button className="text-button" onClick={onBack}><ArrowLeft size={17}/> {catalog ? 'Voltar às sugestões' : 'Voltar ao caderno'}</button><div>{catalog ? <button className="button button-small" onClick={onSaveToNotebook}><Plus size={17}/> Guardar no meu caderno</button> : <><button className="icon-button" onClick={onFavorite} aria-label={recipe.favorite ? 'Remover dos favoritos' : 'Favoritar'}><Heart size={19} fill={recipe.favorite ? 'currentColor' : 'none'}/></button><button className="icon-button" onClick={onEdit} aria-label="Editar receita"><Pencil size={18}/></button><button className="icon-button" onClick={() => window.print()} aria-label="Imprimir ou salvar em PDF"><Printer size={18}/></button><button className="icon-button" onClick={() => void share()} aria-label="Compartilhar receita"><Share2 size={18}/></button><button className="icon-button" onClick={onDelete} aria-label="Excluir receita"><Trash2 size={18}/></button></>}</div></div>
    <header className="recipe-cover"><div className="recipe-cover-copy"><span className="eyebrow">{recipe.category} · {catalog ? 'Base brasileira do Rancho' : 'Ficha da casa'}</span><h1>{recipe.title}</h1><p>{recipe.description}</p><div className="cover-meta"><span><Clock3 size={16}/>{recipe.prepMinutes + recipe.cookMinutes} min</span><span><ChefHat size={16}/>{recipe.difficulty} chapéu{recipe.difficulty > 1 ? 's' : ''}</span>{!catalog && <span><Star size={16}/>{recipe.rating || '—'}/5</span>}</div></div><div className="cover-art">{photo ? <img src={photo} alt={`Foto de ${recipe.title}`}/> : <Skillet size={150}/>}</div></header>
    {recipe.story && <aside className="story-note"><span>Do caderno</span><p>{recipe.story}</p>{recipe.source && <small>Fonte: {recipe.source}</small>}</aside>}
    <div className="view-toolbar no-print"><label>Porções <div className="counter"><button type="button" onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Diminuir porções">−</button><strong>{servings}</strong><button type="button" onClick={() => setServings(servings + 1)} aria-label="Aumentar porções">+</button></div></label><label className="switch-label"><input type="checkbox" checked={metric} onChange={e => setMetric(e.target.checked)}/> Medidas métricas</label><button className="button button-small" onClick={onKitchen}><BookOpen size={17}/> Modo cozinha</button></div>
    <div className="mobile-tabs no-print"><button className={tab === 'ingredients' ? 'active' : ''} onClick={() => setTab('ingredients')}>Ingredientes</button><button className={tab === 'steps' ? 'active' : ''} onClick={() => setTab('steps')}>Preparo</button></div>
    <div className="open-book"><section className={`book-page ingredients-page ${tab === 'steps' ? 'mobile-hidden' : ''}`}><div className="book-page-title"><span>01 / O que separar</span><h2>Ingredientes</h2></div>{Object.entries(grouped).map(([group, items]) => <div className="ingredient-group" key={group}><h3>{group}</h3><ul>{items.map(item => <li key={item.id}><label className={checked.includes(item.id) ? 'struck' : ''}><input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)}/><span><strong>{measure(item, factor, metric)}</strong> {item.name}{item.note && <em> — {item.note}</em>}</span></label></li>)}</ul></div>)}<button className="button button-outline button-small no-print" onClick={onShopping}><ListPlus size={17}/> Levar para a lista</button>{recipe.utensils.length > 0 && <div className="utensils"><h3>À mão</h3><p>{recipe.utensils.join(' · ')}</p></div>}</section><section className={`book-page steps-page ${tab === 'ingredients' ? 'mobile-hidden' : ''}`}><div className="book-page-title"><span>02 / Hora de cozinhar</span><h2>Modo de preparo</h2></div><ol className="steps-list">{recipe.steps.map((step, index) => <li key={step.id}><span className="step-number">{String(index + 1).padStart(2, '0')}</span><div><p>{step.text}</p>{step.timerMinutes && <small>Relógio: {step.timerMinutes} min</small>}</div></li>)}</ol>{recipe.tips && <div className="tips"><strong>Dica da casa</strong><p>{recipe.tips}</p></div>}</section></div>
    {recipe.gallery.length > 0 && <section className="recipe-gallery"><div><span className="eyebrow">Retratos da mesa</span><h2>Galeria da receita</h2></div><div>{recipe.gallery.map((image,index)=><RemotePhoto key={`${image}-${index}`} value={image} alt={`${recipe.title}, foto ${index+1}`}/>)}</div></section>}
    <div className={`after-book${catalog ? ' catalog-nutrition' : ''}`}><section className="nutrition-panel"><span className="eyebrow">Estimativa automática</span><h2>Na mesa, por porção</h2><p>Calculado automaticamente pelas quantidades e porções, usando a composição disponível para {nutrition.known} de {recipe.ingredients.length} ingredientes.</p><div className="nutrition-grid">{[['Energia', nutrition.kcal, 'kcal'], ['Proteínas', nutrition.protein, 'g'], ['Carboidratos', nutrition.carbs, 'g'], ['Gorduras', nutrition.fat, 'g'], ['Fibras', nutrition.fiber, 'g']].map(([label, value, unit]) => <div key={label}><span>{label}</span><strong>{nutrition.known ? Number(value).toFixed(1) : '—'} {unit}</strong></div>)}</div></section>{!catalog && <section className="cook-history"><h2>Vezes que fiz</h2><div className="log-entry no-print"><input aria-label="Nota deste preparo" value={note} onChange={e => setNote(e.target.value)} placeholder="Como ficou desta vez?"/><button className="button button-small" onClick={() => { onLog({ id: uid(), recipeId: recipe.id, cookedAt: new Date().toISOString(), note }); setNote('') }}>Registrar preparo</button></div>{logs.length === 0 ? <p>A primeira lembrança desta receita ainda está por vir.</p> : logs.map(log => <p className="history-line" key={log.id}><strong>{new Date(log.cookedAt).toLocaleDateString('pt-BR')}</strong> {log.note}</p>)}</section>}</div>
    <Ornament/>
  </main>
}
