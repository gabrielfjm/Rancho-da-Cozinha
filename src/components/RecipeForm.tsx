import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Flame, GripVertical, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react'
import type { IngredientBase, Recipe, RecipeIngredient, Step } from '../types'
import { CATEGORIES, INGREDIENT_CATEGORIES } from '../types'
import { parseAmount, prettyAmount, uid } from '../lib/format'
import { uploadImage } from '../lib/store'
import { calculateNutrition } from '../lib/nutrition'

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="sortable-row"><button type="button" className="drag-handle" aria-label="Arrastar para reordenar" {...attributes} {...listeners}><GripVertical size={18}/></button>{children}</div>
}

function ListField({ label, values, placeholder, onChange, wide = false }: { label: string; values: string[]; placeholder: string; onChange: (values: string[]) => void; wide?: boolean }) {
  const [value, setValue] = useState('')
  function add() {
    const item = value.trim()
    if (!item || values.some(current => current.toLocaleLowerCase() === item.toLocaleLowerCase())) return
    onChange([...values, item]); setValue('')
  }
  return <div className={`list-field${wide ? ' wide' : ''}`}><span className="field-label">{label}</span><div className="list-field-add"><input value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} placeholder={placeholder}/><button type="button" className="button button-small" onClick={add}><Plus size={16}/> Adicionar</button></div>{values.length > 0 ? <ol className="value-list">{values.map((item, index) => <li key={`${item}-${index}`}><span>{item}</span><button type="button" aria-label={`Remover ${item}`} onClick={() => onChange(values.filter((_, current) => current !== index))}><X size={15}/></button></li>)}</ol> : <p className="list-empty">A lista começa a aparecer conforme você adiciona.</p>}</div>
}

export function RecipeForm({ recipe, ingredients, scope, onDraft, onSave, onCancel, onIngredientCreate }: {
  recipe: Recipe; ingredients: IngredientBase[]; scope: string; onDraft: (recipe: Recipe) => void;
  onSave: (recipe: Recipe) => void; onCancel: () => void; onIngredientCreate: (ingredient: IngredientBase) => void
}) {
  const [draft, setDraft] = useState(recipe)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [creating, setCreating] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState<string>('Outros')
  const [customUnit, setCustomUnit] = useState('g')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const fuse = useMemo(() => new Fuse(ingredients, { keys: ['name', 'aliases'], threshold: 0.38, ignoreLocation: true }), [ingredients])
  const frequency = useMemo(() => new Map(draft.ingredients.map(i => [i.ingredientId, 1])), [draft.ingredients])
  const matches = query.trim() ? fuse.search(query, { limit: 12 }).map(x => x.item) : ingredients.filter(x => frequency.has(x.id)).slice(0, 6)
  const nutrition = useMemo(() => calculateNutrition(draft), [draft])
  useEffect(() => { const timer = setTimeout(() => onDraft({ ...draft, updatedAt: new Date().toISOString() }), 700); return () => clearTimeout(timer) }, [draft]) // eslint-disable-line react-hooks/exhaustive-deps
  function patch<K extends keyof Recipe>(key: K, value: Recipe[K]) { setDraft(current => ({ ...current, [key]: value })) }
  function addIngredient(item: IngredientBase) {
    const row: RecipeIngredient = { id: uid(), ingredientId: item.id, name: item.name, category: item.category, amount: 1, unit: item.defaultUnit, note: '', group, gramsPerUnit: item.gramsPerUnit, nutrition: item.nutrition }
    patch('ingredients', [...draft.ingredients, row]); setQuery('')
  }
  function updateIngredient(id: string, next: Partial<RecipeIngredient>) { patch('ingredients', draft.ingredients.map(i => i.id === id ? { ...i, ...next } : i)) }
  function updateStep(id: string, next: Partial<Step>) { patch('steps', draft.steps.map(s => s.id === id ? { ...s, ...next } : s)) }
  function reorder(event: DragEndEvent, key: 'ingredients' | 'steps') {
    if (!event.over || event.active.id === event.over.id) return
    if (key === 'ingredients') {
      const oldIndex = draft.ingredients.findIndex(item => item.id === event.active.id)
      const newIndex = draft.ingredients.findIndex(item => item.id === event.over?.id)
      if (oldIndex >= 0 && newIndex >= 0) patch('ingredients', arrayMove(draft.ingredients, oldIndex, newIndex))
    } else {
      const oldIndex = draft.steps.findIndex(item => item.id === event.active.id)
      const newIndex = draft.steps.findIndex(item => item.id === event.over?.id)
      if (oldIndex >= 0 && newIndex >= 0) patch('steps', arrayMove(draft.steps, oldIndex, newIndex))
    }
  }
  async function photo(file: File, target: 'cover' | 'gallery' | string) {
    setUploading(true); setMessage('')
    try {
      const url = await uploadImage(scope, file)
      if (target === 'cover') patch('cover', url)
      else if (target === 'gallery') patch('gallery', [...draft.gallery, url])
      else updateStep(target, { photo: url })
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao enviar a foto.') }
    finally { setUploading(false) }
  }
  function makeIngredient() {
    if (!customName.trim()) return
    const item: IngredientBase = { id: uid(), name: customName.trim(), aliases: [], category: customCategory, units: [customUnit], defaultUnit: customUnit, gramsPerUnit: ['g', 'ml'].includes(customUnit) ? { [customUnit]: 1 } : {}, source: 'Pessoal', ownerId: scope }
    onIngredientCreate(item); addIngredient(item); setCreating(false); setCustomName('')
  }
  return <main className="page form-page">
    <div className="page-heading"><div><span className="eyebrow">Do caderno da casa</span><h1>{recipe.title ? 'Editar receita' : 'Nova receita'}</h1><p>Seu rascunho é guardado enquanto você escreve.</p></div><button className="text-button" onClick={onCancel}><X size={17}/> Fechar</button></div>
    <form onSubmit={event => { event.preventDefault(); if (!draft.title.trim()) { setMessage('Dê um nome para a receita.'); return } onSave({ ...draft, draft: false, updatedAt: new Date().toISOString() }) }}>
      <section className="form-section"><div className="section-heading"><span>01</span><h2>A história começa aqui</h2></div><div className="form-grid">
        <label className="wide">Nome da receita<input required value={draft.title} onChange={e => patch('title', e.target.value)} placeholder="Ex.: Chili de panela de ferro"/></label>
        <label>Categoria<select value={draft.category} onChange={e => patch('category', e.target.value)}>{[...new Set([...CATEGORIES, draft.category])].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Ou crie uma categoria<input placeholder="Nome de uma nova categoria" onBlur={e => { if (e.target.value.trim()) { patch('category', e.target.value.trim()); e.target.value = '' } }}/></label>
        <label className="wide">Descrição curta<textarea rows={2} value={draft.description} onChange={e => patch('description', e.target.value)} placeholder="O que torna esta receita especial?"/></label>
        <label className="wide">História da receita<textarea rows={3} value={draft.story} onChange={e => patch('story', e.target.value)} placeholder="Quem ensinou? Em que mesa ela apareceu primeiro?"/></label>
        <label>Origem ou fonte<input value={draft.source} onChange={e => patch('source', e.target.value)} placeholder="Livro, pessoa ou link"/></label>
        <ListField label="Tags da receita" values={draft.tags} onChange={values => patch('tags', values)} placeholder="Ex.: jantar especial"/>
      </div></section>
      <section className="form-section"><div className="section-heading"><span>02</span><h2>Tempo e mesa</h2></div><div className="form-grid four">
        <label>Preparo (min)<input type="number" min="0" value={draft.prepMinutes} onChange={e => patch('prepMinutes', Number(e.target.value))}/></label>
        <label>Cozimento (min)<input type="number" min="0" value={draft.cookMinutes} onChange={e => patch('cookMinutes', Number(e.target.value))}/></label>
        <label>Porções<input type="number" min="1" value={draft.servings} onChange={e => patch('servings', Math.max(1, Number(e.target.value)))}/></label>
        <label>Dificuldade<select value={draft.difficulty} onChange={e => patch('difficulty', Number(e.target.value) as 1 | 2 | 3)}><option value="1">1 chapéu · Fácil</option><option value="2">2 chapéus · Média</option><option value="3">3 chapéus · Caprichada</option></select></label>
      </div><div className="calorie-preview"><Flame size={21}/><div><small>Calorias calculadas automaticamente</small><strong>{nutrition.known ? `${Math.round(nutrition.kcal)} kcal por porção` : 'Adicione ingredientes com quantidade'}</strong></div><span>{nutrition.known} de {draft.ingredients.length} ingredientes reconhecidos</span></div><div className="photo-fields"><label className="photo-upload"><ImagePlus size={20}/> Foto de capa<input type="file" accept="image/*" onChange={e => e.target.files?.[0] && void photo(e.target.files[0], 'cover')}/></label><label className="photo-upload"><ImagePlus size={20}/> Adicionar à galeria<input type="file" accept="image/*" multiple onChange={e => Array.from(e.target.files ?? []).forEach(file => void photo(file, 'gallery'))}/></label><span>{uploading ? 'Comprimindo foto…' : `${draft.gallery.length} foto(s) na galeria`}</span></div></section>
      <section className="form-section"><div className="section-heading"><span>03</span><h2>Ingredientes</h2></div><p className="helper">Procure pelo nome. A busca aceita variações e palavras sem acento.</p><div className="ingredient-search"><label>Buscar ingrediente<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Farinha, maçã, cominho…" autoComplete="off"/></label><label>Grupo desta adição<input value={group} onChange={e => setGroup(e.target.value)} placeholder="Massa, recheio…"/></label></div>
        {(query || matches.length > 0) && <div className="suggestions" role="listbox" aria-label="Sugestões de ingredientes">{matches.map(item => <button key={item.id} type="button" role="option" aria-selected="false" onClick={() => addIngredient(item)}><span>{item.name}</span><small>{item.category}</small></button>)}{query && <button type="button" className="create-option" onClick={() => { setCustomName(query); setCreating(true) }}><Plus size={16}/> Criar ingrediente “{query}”</button>}</div>}
        {creating && <div className="custom-ingredient"><h3>Novo ingrediente da casa</h3><div className="form-grid three"><label>Nome<input value={customName} onChange={e => setCustomName(e.target.value)}/></label><label>Setor<select value={customCategory} onChange={e => setCustomCategory(e.target.value)}>{INGREDIENT_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></label><label>Unidade<select value={customUnit} onChange={e => setCustomUnit(e.target.value)}>{['g','kg','ml','l','unidade','xícara','colher de sopa','colher de chá','pitada'].map(x => <option key={x}>{x}</option>)}</select></label></div><button type="button" className="button button-small" onClick={makeIngredient}>Guardar ingrediente</button><button type="button" className="text-button" onClick={() => setCreating(false)}>Cancelar</button></div>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => reorder(event, 'ingredients')}><SortableContext items={draft.ingredients.map(i => i.id)} strategy={verticalListSortingStrategy}><div className="editor-list">{draft.ingredients.map(item => { const base = ingredients.find(x => x.id === item.ingredientId); return <SortableRow key={item.id} id={item.id}><div className="ingredient-editor"><strong>{item.name}</strong><div className="ingredient-inputs"><label>Quantidade<input aria-label={`Quantidade de ${item.name}`} defaultValue={item.amount === null ? '' : prettyAmount(item.amount)} key={`${item.id}-${item.amount}`} onBlur={e => updateIngredient(item.id, { amount: parseAmount(e.target.value) })}/></label><label>Unidade<select aria-label={`Unidade de ${item.name}`} value={item.unit} onChange={e => updateIngredient(item.id, { unit: e.target.value })}>{[...new Set([...(base?.units ?? []), item.unit])].map(x => <option key={x}>{x}</option>)}</select></label><label>Grupo<input aria-label={`Grupo de ${item.name}`} value={item.group} onChange={e => updateIngredient(item.id, { group: e.target.value })}/></label><label>Observação<input aria-label={`Observação de ${item.name}`} value={item.note} onChange={e => updateIngredient(item.id, { note: e.target.value })} placeholder="picada fininha"/></label><label className="taste"><input type="checkbox" checked={item.amount === null} onChange={e => updateIngredient(item.id, { amount: e.target.checked ? null : 1 })}/> a gosto</label></div></div><button type="button" className="icon-button" aria-label={`Remover ${item.name}`} onClick={() => patch('ingredients', draft.ingredients.filter(i => i.id !== item.id))}><Trash2 size={17}/></button></SortableRow> })}</div></SortableContext></DndContext>
      </section>
      <section className="form-section"><div className="section-heading"><span>04</span><h2>Modo de preparo</h2></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => reorder(event, 'steps')}><SortableContext items={draft.steps.map(s => s.id)} strategy={verticalListSortingStrategy}><div className="editor-list">{draft.steps.map((step, index) => <SortableRow key={step.id} id={step.id}><div className="step-editor"><label>Passo {index + 1}<textarea rows={3} value={step.text} onChange={e => updateStep(step.id, { text: e.target.value })} placeholder="O que acontece nesta etapa?"/></label><div className="step-extras"><label>Timer (min)<input type="number" min="0" value={step.timerMinutes ?? ''} onChange={e => updateStep(step.id, { timerMinutes: e.target.value ? Number(e.target.value) : undefined })}/></label><label className="photo-upload"><ImagePlus size={17}/> Foto do passo<input type="file" accept="image/*" onChange={e => e.target.files?.[0] && void photo(e.target.files[0], step.id)}/></label></div></div><button type="button" className="icon-button" aria-label={`Remover passo ${index + 1}`} onClick={() => patch('steps', draft.steps.filter(s => s.id !== step.id))}><Trash2 size={17}/></button></SortableRow>)}</div></SortableContext></DndContext><button type="button" className="button button-outline" onClick={() => patch('steps', [...draft.steps, { id: uid(), text: '' }])}><Plus size={17}/> Adicionar passo</button></section>
      <section className="form-section"><div className="section-heading"><span>05</span><h2>Toques finais</h2></div><div className="form-grid"><ListField label="Utensílios" values={draft.utensils} onChange={values => patch('utensils', values)} placeholder="Ex.: panela de ferro"/><label>Avaliação<select value={draft.rating} onChange={e => patch('rating', Number(e.target.value))}>{[0,1,2,3,4,5].map(x => <option key={x} value={x}>{x === 0 ? 'Ainda não avaliada' : `${x} estrela${x > 1 ? 's' : ''}`}</option>)}</select></label><label className="wide">Dicas da casa<textarea rows={3} value={draft.tips} onChange={e => patch('tips', e.target.value)} placeholder="Aquele detalhe que não cabe no passo a passo…"/></label><label className="checkbox-label"><input type="checkbox" checked={draft.favorite} onChange={e => patch('favorite', e.target.checked)}/> Favorita da casa</label></div></section>
      {message && <p role="alert" className="error-message">{message}</p>}
      <div className="form-actions"><button type="button" className="button button-outline" onClick={onCancel}>Voltar ao caderno</button><button type="submit" className="button"><Save size={18}/> Guardar receita</button></div>
    </form>
  </main>
}
