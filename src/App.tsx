import { useEffect, useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { AnimatePresence, motion } from 'framer-motion'
import { Archive, BookOpen, Cloud, Download, Home, LockKeyhole, LogOut, Menu, Moon, Plus, Search, ShieldCheck, ShoppingBasket, Sun, Upload, UserRound, UtensilsCrossed, Wifi, WifiOff, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import ingredientsJson from './data/ingredients.json'
import type { Collection, CookLog, IngredientBase, LocalState, Recipe, ShoppingItem } from './types'
import { CATEGORIES, INGREDIENT_CATEGORIES } from './types'
import { deleteEntity, configured, loadState, saveEntity, seedAccount, supabase, sync } from './lib/store'
import { normalize, prettyAmount, uid } from './lib/format'
import { RecipeCard } from './components/RecipeCard'
import { RecipeForm } from './components/RecipeForm'
import { RecipeView } from './components/RecipeView'
import { Ornament, RanchMark, Skillet } from './components/Artwork'

type Page = 'home' | 'notebook' | 'pantry' | 'shopping' | 'settings' | 'auth' | 'form' | 'recipe' | 'kitchen'
const emptyState: LocalState = { recipes: [], customIngredients: [], collections: [], shopping: [], cookLogs: [] }
const catalog = ingredientsJson as unknown as IngredientBase[]
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'gabrielfjmeira@gmail.com').toLowerCase()

function blankRecipe(): Recipe {
  const now = new Date().toISOString()
  return { id: uid(), title: '', description: '', story: '', source: '', category: 'Acompanhamentos', tags: [], prepMinutes: 15, cookMinutes: 30, servings: 4, difficulty: 1, ingredients: [], steps: [{ id: uid(), text: '' }], utensils: [], tips: '', rating: 0, favorite: false, gallery: [], draft: true, createdAt: now, updatedAt: now }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [scope, setScope] = useState('guest')
  const [state, setState] = useState<LocalState>(emptyState)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<Recipe>()
  const [dark, setDark] = useState(() => localStorage.getItem('rancho-theme') === 'dark')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncLabel, setSyncLabel] = useState('Local')
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState('')
  const ingredients = useMemo(() => [...catalog, ...state.customIngredients], [state.customIngredients])
  const selected = state.recipes.find(recipe => recipe.id === selectedId)
  const isAdmin = session?.user.email?.toLowerCase() === ADMIN_EMAIL

  async function refresh(nextScope = scope) { setState(await loadState(nextScope)) }
  async function runSync(nextScope = scope) {
    if (nextScope === 'guest' || !configured) return
    setSyncLabel('Sincronizando…')
    try { await sync(nextScope); await refresh(nextScope); setSyncLabel('Em dia') }
    catch (error) { console.error('Falha ao sincronizar o caderno', error); setSyncLabel('Pendente') }
  }
  useEffect(() => {
    let alive = true
    async function boot() {
      const current = supabase ? (await supabase.auth.getSession()).data.session : null
      if (!alive) return
      const nextScope = current?.user.id ?? 'guest'
      setSession(current); setScope(nextScope)
      if (current) await seedAccount(nextScope)
      await refresh(nextScope)
      if (current) await runSync(nextScope)
      const sharedId = new URLSearchParams(location.search).get('share')
      if (current && sharedId && supabase) {
        const { data } = await supabase.from('recipes').select('payload').eq('id', sharedId).eq('shared', true).is('deleted_at', null).maybeSingle()
        if (data?.payload) { const shared = data.payload as Recipe; setState(s => ({ ...s, recipes: [shared, ...s.recipes.filter(r => r.id !== shared.id)] })); setSelectedId(shared.id); setPage('recipe') }
      }
      if (alive) setAuthReady(true)
    }
    void boot()
    const auth = supabase?.auth.onAuthStateChange(async (_event, next) => {
      setSession(next); const nextScope = next?.user.id ?? 'guest'; setScope(nextScope)
      if (next) await seedAccount(nextScope)
      await refresh(nextScope); if (next) void runSync(nextScope); setAuthReady(true)
    })
    const onlineHandler = () => { setOnline(navigator.onLine); if (navigator.onLine) void runSync() }
    addEventListener('online', onlineHandler); addEventListener('offline', onlineHandler)
    return () => { alive = false; auth?.data.subscription.unsubscribe(); removeEventListener('online', onlineHandler); removeEventListener('offline', onlineHandler) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('rancho-theme', dark ? 'dark' : 'light') }, [dark])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timer) }, [toast])
  useEffect(() => { if (!isAdmin && page === 'settings') setPage('home') }, [isAdmin, page])

  async function persistRecipe(recipe: Recipe, quiet = false) {
    const withOwner = { ...recipe, ownerId: scope }
    await saveEntity(scope, 'recipes', withOwner)
    setState(current => ({ ...current, recipes: [withOwner, ...current.recipes.filter(r => r.id !== withOwner.id)] }))
    if (!quiet) { setSelectedId(withOwner.id); setPage('recipe'); setToast('Receita guardada no caderno.') }
    if (scope !== 'guest') void runSync()
  }
  async function removeRecipe(recipe: Recipe) {
    await deleteEntity(scope, 'recipes', recipe.id)
    setState(current => ({ ...current, recipes: current.recipes.filter(r => r.id !== recipe.id) }))
    setPage('notebook'); setSelectedId(undefined); setToast('A ficha foi retirada do caderno.')
    if (scope !== 'guest') void runSync()
  }
  async function addPersonal(item: IngredientBase) {
    await saveEntity(scope, 'personal_ingredients', item)
    setState(current => ({ ...current, customIngredients: [...current.customIngredients, item] }))
  }
  async function addLog(log: CookLog) {
    const value = { ...log, ownerId: scope }; await saveEntity(scope, 'cook_logs', value)
    setState(current => ({ ...current, cookLogs: [value, ...current.cookLogs] })); setToast('Preparo registrado.')
  }
  async function saveCollection(collection: Collection) {
    const value = { ...collection, ownerId: scope }; await saveEntity(scope, 'collections', value)
    setState(current => ({ ...current, collections: [value, ...current.collections.filter(c => c.id !== value.id)] }))
    if (scope !== 'guest') void runSync()
  }
  async function toShopping(recipe: Recipe) {
    const next = [...state.shopping]
    for (const ingredient of recipe.ingredients) {
      const compatible = (a:string,b:string) => a === b || (['g','kg'].includes(a) && ['g','kg'].includes(b)) || (['ml','l'].includes(a) && ['ml','l'].includes(b))
      const found = next.find(i => i.ingredientId === ingredient.ingredientId && compatible(i.unit,ingredient.unit) && !i.checked)
      if (found && found.amount !== null && ingredient.amount !== null) {
        const baseAmount = ingredient.amount * (ingredient.unit === 'kg' || ingredient.unit === 'l' ? 1000 : 1)
        found.amount += baseAmount / (found.unit === 'kg' || found.unit === 'l' ? 1000 : 1)
      } else next.push({ id: uid(), ownerId: scope, ingredientId: ingredient.ingredientId, name: ingredient.name, category: ingredient.category, amount: ingredient.amount, unit: ingredient.unit, checked: false })
    }
    for (const item of next) await saveEntity(scope, 'shopping_items', item)
    setState(current => ({ ...current, shopping: next })); setToast('Ingredientes somados à lista.')
  }
  function navigate(next: Page) { setPage(next === 'settings' && !isAdmin ? 'home' : next); setMenu(false); scrollTo({ top: 0, behavior: 'smooth' }) }
  function openRecipe(recipe: Recipe) { setSelectedId(recipe.id); navigate('recipe') }

  if (!authReady) return <LoadingScreen/>
  if (!session) return <Auth session={null} onDone={() => setPage('home')}/>

  return <div className="app-shell">
    <Header page={page} navigate={navigate} menu={menu} setMenu={setMenu} dark={dark} setDark={setDark} session={session} online={online} syncLabel={syncLabel} isAdmin={isAdmin}/>
    <AnimatePresence mode="wait">
      <motion.div key={`${page}-${selectedId ?? ''}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
        {page === 'home' && <HomePage recipes={state.recipes} openRecipe={openRecipe} newRecipe={() => { setEditing(blankRecipe()); navigate('form') }} navigate={navigate}/>}
        {page === 'notebook' && <Notebook recipes={state.recipes} collections={state.collections} onSaveCollection={collection => void saveCollection(collection)} openRecipe={openRecipe} newRecipe={() => { setEditing(blankRecipe()); navigate('form') }}/>}
        {page === 'pantry' && <Pantry recipes={state.recipes} ingredients={ingredients} openRecipe={openRecipe}/>}
        {page === 'shopping' && <Shopping items={state.shopping} scope={scope} onChange={async next => { setState(s => ({ ...s, shopping: next })); for (const item of next) await saveEntity(scope, 'shopping_items', item) }}/>}
        {page === 'settings' && isAdmin && <Settings state={state} scope={scope} onImport={async imported => { for (const recipe of imported.recipes ?? []) await saveEntity(scope, 'recipes', { ...recipe, ownerId: scope }); for (const item of imported.customIngredients ?? []) await saveEntity(scope, 'personal_ingredients', { ...item, ownerId: scope }); for (const item of imported.shopping ?? []) await saveEntity(scope, 'shopping_items', { ...item, ownerId: scope }); await refresh(); setToast('Backup importado.') }} configured={configured}/>}
        {page === 'auth' && <Auth session={session} onDone={() => navigate('home')}/>}
        {page === 'form' && editing && <RecipeForm recipe={editing} ingredients={ingredients} scope={scope} onDraft={recipe => void persistRecipe(recipe, true)} onSave={recipe => void persistRecipe(recipe)} onCancel={() => navigate(editing.title ? 'recipe' : 'notebook')} onIngredientCreate={item => void addPersonal(item)}/>}
        {page === 'recipe' && selected && <RecipeView recipe={selected} logs={state.cookLogs.filter(log => log.recipeId === selected.id)} onBack={() => navigate('notebook')} onEdit={() => { setEditing(selected); navigate('form') }} onDelete={() => void removeRecipe(selected)} onFavorite={() => void persistRecipe({ ...selected, favorite: !selected.favorite }, true)} onShare={() => void persistRecipe({ ...selected, shared: true }, true)} onKitchen={() => navigate('kitchen')} onShopping={() => void toShopping(selected)} onLog={log => void addLog(log)}/>}
        {page === 'recipe' && !selected && <EmptyNotebook newRecipe={() => { setEditing(blankRecipe()); navigate('form') }}/>}
        {page === 'kitchen' && selected && <Kitchen recipe={selected} onClose={() => navigate('recipe')}/>}
      </motion.div>
    </AnimatePresence>
    <Footer/>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function Header({ page, navigate, menu, setMenu, dark, setDark, session, online, syncLabel, isAdmin }: { page: Page; navigate: (p: Page) => void; menu: boolean; setMenu: (v: boolean) => void; dark: boolean; setDark: (v: boolean) => void; session: Session; online: boolean; syncLabel: string; isAdmin: boolean }) {
  const nav: [Page, string, React.ReactNode][] = [['home','Início',<Home size={18}/>],['notebook','Caderno',<BookOpen size={18}/>],['pantry','Despensa',<UtensilsCrossed size={18}/>],['shopping','Compras',<ShoppingBasket size={18}/>]]
  return <><div className="gingham-bar"/><header className="site-header"><button className="brand" onClick={() => navigate('home')}><RanchMark size={54}/><span><strong>Rancho da Cozinha</strong><small>receitas da casa desde sempre</small></span></button><nav className={menu ? 'open' : ''}>{nav.map(([target,label,icon]) => <button key={target} className={page === target ? 'active' : ''} onClick={() => navigate(target)}>{icon}{label}</button>)}{isAdmin && <button className={page === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}><Archive size={18}/>Ajustes</button>}</nav><div className="header-tools"><span className="sync-state" title={online ? syncLabel : 'Sem internet'}>{online ? <Wifi size={15}/> : <WifiOff size={15}/>}<span>{syncLabel}</span></span><button className="icon-button" onClick={() => setDark(!dark)} aria-label={dark ? 'Usar modo claro' : 'Usar Noite no Rancho'}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><button className="account-button" onClick={() => navigate('auth')}><span className="avatar">{session.user.email?.[0].toUpperCase()}</span><span><b>Meu perfil</b><small>{isAdmin ? 'Administrador' : 'Cozinheiro da casa'}</small></span></button><button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Abrir menu">{menu ? <X/> : <Menu/>}</button></div></header></>
}

function HomePage({ recipes, openRecipe, newRecipe, navigate }: { recipes: Recipe[]; openRecipe: (r: Recipe) => void; newRecipe: () => void; navigate: (p: Page) => void }) {
  const today = recipes.length ? recipes[new Date().getDate() % recipes.length] : undefined
  const recent = [...recipes].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  return <main className="page home-page"><section className="home-hero"><img className="hero-background" src="/assets/home-ranch-kitchen.jpg" alt="Cozinha de rancho com caderno de receitas ao pôr do sol"/><div className="hero-copy"><span className="eyebrow">O fogo está aceso</span><h1>Bom ter você<br/>de volta à cozinha.</h1><p>Suas receitas, histórias e pequenos segredos da casa, guardados com o cuidado de um verdadeiro caderno de família.</p><div className="hero-actions"><button className="button" onClick={newRecipe}><Plus size={18}/> Nova receita</button><button className="button button-paper" onClick={() => navigate('pantry')}>O que faço com o que tenho?</button></div></div><div className="hero-stamp">Feito no rancho<br/><strong>com calma</strong></div></section><Ornament/>
    {today && <section className="daily"><div className="section-intro"><span className="eyebrow">Escolha do dia</span><h2>Receita para hoje</h2></div><button className="daily-card" onClick={() => openRecipe(today)}><div><span>{today.category}</span><h3>{today.title}</h3><p>{today.description}</p><small>{today.prepMinutes + today.cookMinutes} minutos · rende {today.servings}</small></div><Skillet size={110}/><b>ABRIR FICHA →</b></button></section>}
    <section className="home-section"><div className="section-row"><div><span className="eyebrow">Páginas recentes</span><h2>Do seu caderno</h2></div><button className="text-button" onClick={() => navigate('notebook')}>Ver todas →</button></div>{recent.length ? <div className="card-grid">{recent.map((r,i) => <RecipeCard key={r.id} recipe={r} index={i} onOpen={() => openRecipe(r)}/>)}</div> : <EmptyNotebook newRecipe={newRecipe}/>}</section>
    <section className="quick-notes"><button onClick={() => navigate('pantry')}><UtensilsCrossed/><span><strong>Despensa do dia</strong><small>Descubra receitas com o que já tem</small></span></button><button onClick={() => navigate('shopping')}><ShoppingBasket/><span><strong>Lista do mercado</strong><small>Itens organizados por corredor</small></span></button><button onClick={() => navigate('auth')}><UserRound/><span><strong>Meu perfil</strong><small>Conta, acesso e sincronização</small></span></button></section>
  </main>
}

function EmptyNotebook({ newRecipe }: { newRecipe: () => void }) { return <div className="empty-state"><Skillet/><h2>Seu caderno ainda está em branco.</h2><p>Que tal registrar a primeira receita da casa?</p><button className="button" onClick={newRecipe}><Plus size={18}/> Escrever a primeira ficha</button></div> }

function Notebook({ recipes, collections, onSaveCollection, openRecipe, newRecipe }: { recipes: Recipe[]; collections: Collection[]; onSaveCollection: (c: Collection) => void; openRecipe: (r: Recipe) => void; newRecipe: () => void }) {
  const [query,setQuery] = useState(''); const [category,setCategory] = useState('Todas'); const [favorite,setFavorite] = useState(false); const [difficulty,setDifficulty] = useState(0); const [collectionId,setCollectionId]=useState(''); const [newCollection,setNewCollection]=useState('')
  const fuse = useMemo(() => new Fuse(recipes, { keys: ['title','description','tags','ingredients.name'], threshold: .35, ignoreLocation: true }), [recipes])
  const searched = query ? fuse.search(query).map(r => r.item) : recipes
  const activeCollection=collections.find(c=>c.id===collectionId)
  const filtered = searched.filter(r => (category === 'Todas' || r.category === category) && (!favorite || r.favorite) && (!difficulty || r.difficulty === difficulty) && (!activeCollection || activeCollection.recipeIds.includes(r.id)))
  function createCollection(){if(!newCollection.trim())return;const c={id:uid(),name:newCollection.trim(),recipeIds:[]};onSaveCollection(c);setCollectionId(c.id);setNewCollection('')}
  function addToCollection(recipeId:string,id:string){const c=collections.find(x=>x.id===id);if(!c)return;onSaveCollection({...c,recipeIds:[...new Set([...c.recipeIds,recipeId])]})}
  return <main className="page notebook-page"><div className="page-heading"><div><span className="eyebrow">Fichas guardadas</span><h1>Meu caderno</h1><p>{recipes.length} receita{recipes.length !== 1 ? 's' : ''}, cada uma com sua história.</p></div><button className="button" onClick={newRecipe}><Plus size={18}/> Nova receita</button></div><div className="search-panel"><label className="search-box"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, ingrediente ou tag"/></label><div className="filter-row"><select aria-label="Filtrar por categoria" value={category} onChange={e => setCategory(e.target.value)}><option>Todas</option>{[...new Set([...CATEGORIES,...recipes.map(r => r.category)])].map(x => <option key={x}>{x}</option>)}</select><select aria-label="Filtrar por dificuldade" value={difficulty} onChange={e => setDifficulty(Number(e.target.value))}><option value="0">Toda dificuldade</option><option value="1">1 chapéu</option><option value="2">2 chapéus</option><option value="3">3 chapéus</option></select><label className="check-chip"><input type="checkbox" checked={favorite} onChange={e => setFavorite(e.target.checked)}/> Favoritas da casa</label></div><div className="collection-tools"><select aria-label="Filtrar por coleção" value={collectionId} onChange={e=>setCollectionId(e.target.value)}><option value="">Todas as coleções</option>{collections.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input value={newCollection} onChange={e=>setNewCollection(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')createCollection()}} placeholder="Nova coleção, ex.: Natal"/><button className="button button-small" onClick={createCollection}>Criar coleção</button></div></div>{filtered.length ? <div className="card-grid roomy">{filtered.map((r,i) => <div className="card-wrap" key={r.id}><RecipeCard recipe={r} index={i} onOpen={() => openRecipe(r)}/>{collections.length>0&&<select aria-label={`Adicionar ${r.title} a uma coleção`} defaultValue="" onChange={e=>{addToCollection(r.id,e.target.value);e.target.value='' }}><option value="" disabled>+ coleção</option>{collections.filter(c=>!c.recipeIds.includes(r.id)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}</div>)}</div> : <div className="empty-state small"><Search/><h2>Nenhuma ficha encontrada</h2><p>Tente retirar um filtro ou buscar outro ingrediente.</p></div>}</main>
}

function Pantry({ recipes, ingredients, openRecipe }: { recipes: Recipe[]; ingredients: IngredientBase[]; openRecipe: (r: Recipe) => void }) {
  const [query,setQuery] = useState(''); const [selected,setSelected] = useState<IngredientBase[]>([])
  const fuse = useMemo(() => new Fuse(ingredients, { keys: ['name','aliases'], threshold: .36, ignoreLocation: true }), [ingredients])
  const matches = query ? fuse.search(query,{limit:10}).map(x => x.item).filter(x => !selected.some(s => s.id === x.id)) : []
  const ranked = recipes.map(recipe => { const ids = new Set(recipe.ingredients.map(i => i.ingredientId)); const names = recipe.ingredients.map(i => normalize(i.name)); const hit = selected.filter(item => ids.has(item.id) || names.some(n => n.includes(normalize(item.name)) || normalize(item.name).includes(n))).length; return { recipe, hit, score: selected.length ? hit / selected.length : 0 } }).filter(x => x.hit > 0).sort((a,b) => b.score-a.score)
  return <main className="page pantry-page"><div className="page-heading"><div><span className="eyebrow">Abra a despensa</span><h1>O que dá para fazer?</h1><p>Marque o que você tem e veja quais fichas combinam.</p></div></div><section className="pantry-board"><label className="search-box"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite um ingrediente que está em casa"/></label>{matches.length > 0 && <div className="suggestions floating">{matches.map(item => <button key={item.id} onClick={() => { setSelected(s => [...s,item]); setQuery('') }}><span>{item.name}</span><small>{item.category}</small></button>)}</div>}<div className="pantry-tags">{selected.length === 0 && <p>Sua bancada está vazia. Comece procurando um ingrediente.</p>}{selected.map(item => <button key={item.id} onClick={() => setSelected(s => s.filter(x => x.id !== item.id))}>{item.name}<X size={14}/></button>)}</div></section><div className="match-heading"><h2>Receitas possíveis</h2><span>{ranked.length ? `${ranked.length} combinações` : 'Selecione ingredientes para começar'}</span></div><div className="match-list">{ranked.map(({recipe,hit,score}) => <button key={recipe.id} onClick={() => openRecipe(recipe)}><div className="match-score"><strong>{Math.round(score*100)}%</strong><span>{hit} de {selected.length}</span></div><div><h3>{recipe.title}</h3><p>{recipe.description}</p><small>{recipe.ingredients.filter(i => !selected.some(s => s.id === i.ingredientId || normalize(s.name) === normalize(i.name))).slice(0,4).map(i => i.name).join(' · ') || 'Você tem tudo que selecionou'}</small></div><span>Ver ficha →</span></button>)}</div></main>
}

function Shopping({ items, scope, onChange }: { items: ShoppingItem[]; scope: string; onChange: (items: ShoppingItem[]) => void }) {
  const groups = items.reduce<Record<string,ShoppingItem[]>>((acc,item) => { (acc[item.category] ??= []).push(item); return acc }, {})
  async function removeChecked() { const checked = items.filter(i => i.checked); for (const item of checked) await deleteEntity(scope,'shopping_items',item.id); onChange(items.filter(i => !i.checked)) }
  return <main className="page shopping-page"><div className="page-heading"><div><span className="eyebrow">Para levar ao mercado</span><h1>Lista de compras</h1><p>{items.filter(i=>!i.checked).length} itens ainda na sacola.</p></div>{items.some(i=>i.checked) && <button className="button button-outline" onClick={() => void removeChecked()}>Limpar comprados</button>}</div>{items.length === 0 ? <div className="empty-state"><ShoppingBasket/><h2>A sacola está vazia.</h2><p>Abra uma receita e mande os ingredientes para cá.</p></div> : <div className="shopping-paper">{INGREDIENT_CATEGORIES.filter(cat => groups[cat]?.length).map(category => <section key={category}><h2>{category}</h2>{groups[category].map(item => <label key={item.id} className={item.checked ? 'checked' : ''}><input type="checkbox" checked={item.checked} onChange={() => onChange(items.map(i => i.id === item.id ? {...i,checked:!i.checked}:i))}/><span>{item.name}</span><strong>{prettyAmount(item.amount)} {item.amount !== null && item.unit}</strong></label>)}</section>)}</div>}</main>
}

function Settings({ state, scope, onImport, configured }: { state: LocalState; scope: string; onImport: (state: LocalState) => void; configured: boolean }) {
  function download() { const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`rancho-da-cozinha-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href) }
  async function upload(file: File) { try { const data=JSON.parse(await file.text()) as LocalState; if (!Array.isArray(data.recipes)) throw new Error(); onImport(data) } catch { alert('Este arquivo não parece ser um backup do Rancho da Cozinha.') } }
  return <main className="page settings-page"><div className="page-heading"><div><span className="eyebrow">Celeiro de dados</span><h1>Ajustes e backup</h1><p>Cuide do seu caderno e mantenha uma cópia segura.</p></div></div><div className="settings-grid"><section><Cloud/><div><h2>Sincronização</h2><p>{configured ? scope === 'guest' ? 'O Supabase está pronto. Entre na sua conta para sincronizar entre aparelhos.' : 'Sua conta está ligada ao Supabase e usa cache offline neste aparelho.' : 'Modo local ativo. Preencha as variáveis do Supabase para sincronizar entre PC e celular.'}</p></div></section><section><Download/><div><h2>Exportar caderno</h2><p>Baixe receitas, ingredientes pessoais, lista e histórico em JSON.</p><button className="button button-small" onClick={download}>Baixar backup</button></div></section><section><Upload/><div><h2>Importar caderno</h2><p>Restaure um arquivo de backup. Itens com IDs iguais são atualizados.</p><label className="button button-small file-button">Escolher arquivo<input type="file" accept="application/json" onChange={e => e.target.files?.[0] && void upload(e.target.files[0])}/></label></div></section><section><Archive/><div><h2>O que está guardado</h2><p>{state.recipes.length} receitas · {state.customIngredients.length} ingredientes pessoais · {state.cookLogs.length} preparos registrados.</p></div></section></div></main>
}

function Auth({ session, onDone }: { session: Session | null; onDone: () => void }) {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [mode,setMode]=useState<'login'|'signup'>('login'); const [message,setMessage]=useState('')
  async function submit(event: React.FormEvent) { event.preventDefault(); if(!supabase){setMessage('Configure o Supabase no arquivo .env para entrar.');return} const result=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password}); setMessage(result.error?.message ?? (mode==='signup'&&!result.data.session?'Confira seu e-mail para confirmar a conta.':'Conta conectada.')); if(result.data.session) onDone() }
  async function google(){ if(!supabase){setMessage('Configure o Supabase no arquivo .env para entrar.');return} await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin}}) }
  if(session) return <main className="page profile-page"><section className="profile-card"><div className="profile-emblem"><RanchMark size={150}/></div><div className="profile-copy"><span className="eyebrow">Conta da casa</span><h1>Seu lugar à mesa.</h1><p>Suas fichas ficam ligadas a esta conta e acompanham você entre os aparelhos.</p><div className="profile-email"><span className="avatar large">{session.user.email?.[0].toUpperCase()}</span><div><small>Conectado como</small><strong>{session.user.email}</strong></div></div><div className="profile-trust"><ShieldCheck size={19}/><span>Acesso protegido e caderno particular</span></div><button className="button button-outline" onClick={async()=>{await supabase?.auth.signOut();onDone()}}><LogOut size={18}/> Sair da conta</button></div></section></main>
  return <main className="auth-shell"><section className="auth-visual"><img src="/assets/login-ranch-kitchen.jpg" alt="Caderno aberto em uma cozinha de rancho iluminada por lampião"/><div className="auth-visual-copy"><div className="auth-brand"><RanchMark size={98}/><div><strong>Rancho da Cozinha</strong><small>receitas da casa desde sempre</small></div></div><blockquote>“Toda casa tem receitas que merecem atravessar gerações.”</blockquote><span>Seu caderno particular, sempre à mão.</span></div></section><section className="auth-panel"><form className="auth-card" onSubmit={e=>void submit(e)}><span className="auth-kicker"><LockKeyhole size={16}/> Acesso exclusivo</span><h1>{mode==='login'?'Entre no seu rancho':'Abra seu caderno'}</h1><p className="auth-lead">Entre para acessar suas receitas, sua despensa e as memórias da sua cozinha.</p><button className="google-button" type="button" onClick={()=>void google()}><span>G</span> Continuar com Google</button><div className="auth-divider"><span>ou use seu e-mail</span></div><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label><label>Senha<input type="password" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></label><button className="button auth-submit" type="submit">{mode==='login'?'Entrar na cozinha':'Criar meu caderno'}</button><button className="text-button auth-switch" type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Primeira vez por aqui? Criar conta':'Já tenho uma conta'}</button>{message&&<p role="status" className="auth-message">{message}</p>}<div className="auth-security"><ShieldCheck size={17}/><span>Seu conteúdo só aparece depois do login.</span></div></form><a className="auth-credit" href="https://www.jessbranding.com.br" target="_blank" rel="noreferrer">Experiência criada por <strong>Jess Branding</strong></a></section></main>
}

function LoadingScreen() { return <main className="loading-screen"><RanchMark size={130}/><span className="eyebrow">Preparando a mesa</span><p>Abrindo seu caderno…</p></main> }

function Footer() { return <footer className="site-footer"><div><RanchMark size={58}/><span><strong>Rancho da Cozinha</strong><small>Memórias servidas à mesa.</small></span></div><p>Design e experiência por <a href="https://www.jessbranding.com.br" target="_blank" rel="noreferrer">Jess Branding</a></p></footer> }

function Kitchen({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [index,setIndex]=useState(0); const [drawer,setDrawer]=useState(false); const [timers,setTimers]=useState<{id:string;label:string;left:number}[]>([])
  useEffect(()=>{ let lock: WakeLockSentinel|undefined; navigator.wakeLock?.request('screen').then(v=>lock=v).catch(()=>{}); const tick=setInterval(()=>setTimers(ts=>ts.map(t=>({...t,left:Math.max(0,t.left-1)}))),1000); return()=>{clearInterval(tick);void lock?.release()}},[])
  const step=recipe.steps[index]
  function start(minutes:number){setTimers(ts=>[...ts,{id:uid(),label:`Passo ${index+1}`,left:minutes*60}])}
  return <main className="kitchen-mode"><header><button className="text-button" onClick={onClose}><X/> Sair do modo cozinha</button><span>{recipe.title}</span><button className="button button-small" onClick={()=>setDrawer(!drawer)}>Ingredientes</button></header><div className="kitchen-progress"><i style={{width:`${((index+1)/recipe.steps.length)*100}%`}}/></div><section><span className="eyebrow">Passo {index+1} de {recipe.steps.length}</span><h1>{step.text || 'Descreva este passo no editor da receita.'}</h1>{step.timerMinutes&&<button className="windup-timer" onClick={()=>start(step.timerMinutes!)}><ClockIcon/>Iniciar relógio de {step.timerMinutes} min</button>}<div className="kitchen-nav"><button disabled={index===0} onClick={()=>setIndex(index-1)}>← Anterior</button><strong>{String(index+1).padStart(2,'0')}</strong><button disabled={index===recipe.steps.length-1} onClick={()=>setIndex(index+1)}>Próximo →</button></div></section>{timers.length>0&&<div className="timer-tray">{timers.map(t=><button key={t.id} className={t.left===0?'done':''} onClick={()=>setTimers(ts=>ts.filter(x=>x.id!==t.id))}><small>{t.label}</small><strong>{Math.floor(t.left/60)}:{String(t.left%60).padStart(2,'0')}</strong></button>)}</div>}{drawer&&<aside className="kitchen-drawer"><button onClick={()=>setDrawer(false)}><X/></button><h2>Ingredientes</h2>{recipe.ingredients.map(i=><p key={i.id}><strong>{prettyAmount(i.amount)} {i.amount!==null&&i.unit}</strong> {i.name}</p>)}</aside>}</main>
}
function ClockIcon(){return <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="22" r="14" stroke="currentColor" strokeWidth="2"/><path d="M20 22v-8m0 8 6 4M16 4h8M29 9l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
