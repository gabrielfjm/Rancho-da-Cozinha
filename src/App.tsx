import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Archive, BookOpen, Camera, Cloud, Download, Flame, FolderPlus, Home, LockKeyhole, LogOut, Menu, Plus, Search, ShieldCheck, ShoppingBasket, SlidersHorizontal, ThermometerSun, Upload, UserRound, UtensilsCrossed, X } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import ingredientsJson from './data/ingredients.json'
import type { Collection, CookLog, IngredientBase, LocalState, Recipe, ShoppingItem } from './types'
import { CATEGORIES, INGREDIENT_CATEGORIES } from './types'
import { deleteEntity, configured, loadState, pendingChanges, saveEntity, seedAccount, supabase, sync, uploadAvatar } from './lib/store'
import { normalize, prettyAmount, uid } from './lib/format'
import { brazilianRecipes, type BrazilianRecipe } from './data/brazilianRecipes'
import { currentMoment, momentSentence, rankForMoment } from './lib/moment'
import { ranchReviews } from './data/ranchReviews'
import { calorieLabel } from './lib/nutrition'
import { weatherAtCurrentLocation, type WeatherContext } from './lib/weather'
import { inView, ink, pageVariants, paper, rise, stack, stamp, type PageMotion } from './lib/motion'
import { RecipeCard } from './components/RecipeCard'
import { RecipeForm } from './components/RecipeForm'
import { RecipeView } from './components/RecipeView'
import { RanchMark, Skillet } from './components/Artwork'
import { BusyButton, CountUp, InkBox, Stir, SyncLamp, TicketStack, useBusy, type Note, type SyncStatus } from './components/Feedback'
import { Photo } from './components/Photo'
import { DishFx, dishMotion, fxClass } from './components/DishFx'
import { MiniReview, ReviewLine, Rosette } from './components/RanchReview'
import { Pins, SignArrow, useRotation } from './components/Carousel'
import { FavoriteToggle, HatPicker, PaperSelect, useMedia } from './components/Filters'
import { WeatherTicket } from './components/WeatherTicket'
import { Footer } from './components/Footer'

type Page = 'home' | 'notebook' | 'pantry' | 'shopping' | 'settings' | 'auth' | 'form' | 'recipe' | 'kitchen'
const emptyState: LocalState = { recipes: [], customIngredients: [], collections: [], shopping: [], cookLogs: [] }
const catalog = ingredientsJson as unknown as IngredientBase[]
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'gabrielfjmeira@gmail.com').toLowerCase()

function blankRecipe(): Recipe {
  const now = new Date().toISOString()
  return { id: uid(), title: '', description: '', story: '', source: '', category: 'Acompanhamentos', tags: [], prepMinutes: 15, cookMinutes: 30, servings: 4, difficulty: 1, ingredients: [], steps: [{ id: uid(), text: '' }], utensils: [], tips: '', rating: 0, favorite: false, gallery: [], draft: true, createdAt: now, updatedAt: now }
}
const sameUnitFamily = (a: string, b: string) => a === b || (['g', 'kg'].includes(a) && ['g', 'kg'].includes(b)) || (['ml', 'l'].includes(a) && ['ml', 'l'].includes(b))
const baseFactor = (unit: string) => unit === 'kg' || unit === 'l' ? 1000 : 1

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [scope, setScope] = useState('guest')
  const [state, setState] = useState<LocalState>(emptyState)
  const [page, setPage] = useState<Page>('home')
  const [pageMotion, setPageMotion] = useState<PageMotion>('turn')
  const [selectedId, setSelectedId] = useState<string>()
  const [editing, setEditing] = useState<Recipe>()
  const [menu, setMenu] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(configured ? 'idle' : 'local')
  const [pending, setPending] = useState(0)
  const scopeRef = useRef('guest')
  const syncJob = useRef<{ running: boolean; again: boolean; timer?: number }>({ running: false, again: false })
  const ingredients = useMemo(() => [...catalog, ...state.customIngredients], [state.customIngredients])
  const selectedFromNotebook = state.recipes.find(recipe => recipe.id === selectedId)
  const selectedFromCatalog = brazilianRecipes.find(recipe => recipe.id === selectedId)
  const selected = selectedFromNotebook ?? selectedFromCatalog
  const isAdmin = session?.user.email?.toLowerCase() === ADMIN_EMAIL

  function adoptScope(next: string) { scopeRef.current = next; setScope(next) }
  async function refresh(nextScope: string) { setState(await loadState(nextScope)) }
  async function countPending(nextScope = scopeRef.current) { setPending(await pendingChanges(nextScope)) }
  // Uma sincronização por vez; pedidos feitos no meio do caminho viram uma única rodada extra.
  async function runSync(nextScope = scopeRef.current) {
    if (nextScope === 'guest' || !configured) return
    const job = syncJob.current
    if (!navigator.onLine) { setSyncStatus('offline'); void countPending(nextScope); return }
    if (job.running) { job.again = true; return }
    job.running = true; setSyncStatus('syncing')
    try {
      do { job.again = false; await sync(nextScope) } while (job.again)
      await refresh(nextScope); setSyncStatus('idle')
    } catch (error) {
      console.error('Falha ao sincronizar o caderno', error)
      setSyncStatus(navigator.onLine ? 'error' : 'offline')
    } finally { job.running = false; void countPending(nextScope) }
  }
  function scheduleSync(delay = 900) {
    if (scopeRef.current === 'guest' || !configured) return
    void countPending()
    window.clearTimeout(syncJob.current.timer)
    syncJob.current.timer = window.setTimeout(() => void runSync(), delay)
  }

  useEffect(() => {
    let alive = true
    async function boot() {
      const current = supabase ? (await supabase.auth.getSession()).data.session : null
      if (!alive) return
      const nextScope = current?.user.id ?? 'guest'
      setSession(current); adoptScope(nextScope)
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
      setSession(next); const nextScope = next?.user.id ?? 'guest'; adoptScope(nextScope)
      if (next) await seedAccount(nextScope)
      await refresh(nextScope); if (next) void runSync(nextScope); setAuthReady(true)
    })
    const connection = () => { if (navigator.onLine) void runSync(); else { setSyncStatus('offline'); void countPending() } }
    addEventListener('online', connection); addEventListener('offline', connection)
    return () => { alive = false; auth?.data.subscription.unsubscribe(); removeEventListener('online', connection); removeEventListener('offline', connection) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isAdmin && page === 'settings') setPage('home') }, [isAdmin, page])

  function notify(text: string, tone: Note['tone'] = 'ok') {
    const id = uid()
    setNotes(current => [...current.slice(-2), { id, text, tone }])
    setTimeout(() => setNotes(current => current.filter(note => note.id !== id)), tone === 'ok' ? 2800 : 4800)
  }
  async function attempt(task: () => Promise<void>, failure: string) {
    try { await task(); return true } catch (error) { console.error(error); notify(failure, 'warn'); return false }
  }
  async function storeRecipe(recipe: Recipe) {
    const withOwner = { ...recipe, ownerId: scope }
    await saveEntity(scope, 'recipes', withOwner)
    setState(current => ({ ...current, recipes: [withOwner, ...current.recipes.filter(r => r.id !== withOwner.id)] }))
  }
  const saveDraft = (recipe: Recipe) => attempt(async () => { await storeRecipe(recipe); scheduleSync(2500) }, 'O rascunho não foi guardado neste aparelho.')
  const saveRecipe = (recipe: Recipe) => attempt(async () => { await storeRecipe(recipe); scheduleSync(300) }, 'A receita não foi guardada. Tente outra vez.')
  function recipeSaved(recipe: Recipe) { setSelectedId(recipe.id); go('recipe', 'open'); notify('Receita guardada no caderno.') }
  const removeRecipe = (recipe: Recipe) => attempt(async () => {
    await deleteEntity(scope, 'recipes', recipe.id)
    setState(current => ({ ...current, recipes: current.recipes.filter(r => r.id !== recipe.id) }))
    setSelectedId(undefined); go('notebook', 'tear'); notify('A ficha foi arrancada do caderno.'); scheduleSync(300)
  }, 'Não consegui retirar a ficha. Tente de novo.')
  const toggleFavorite = (recipe: Recipe) => attempt(async () => {
    await storeRecipe({ ...recipe, favorite: !recipe.favorite }); scheduleSync()
    notify(recipe.favorite ? 'Saiu das favoritas da casa.' : 'Entrou para as favoritas da casa.')
  }, 'Não deu para marcar a favorita.')
  const rateRecipe = (recipe: Recipe, rating: number) => attempt(async () => {
    await storeRecipe({ ...recipe, rating }); scheduleSync(); notify(rating ? `Nota ${rating} anotada na ficha.` : 'Nota apagada da ficha.')
  }, 'A nota não foi guardada.')
  const shareRecipe = (recipe: Recipe) => attempt(async () => {
    await storeRecipe({ ...recipe, shared: true }); scheduleSync(200)
    const link = `${location.origin}/?share=${recipe.id}`
    if (navigator.share) { try { await navigator.share({ title: recipe.title, url: link }); return } catch (error) { if ((error as Error).name === 'AbortError') return } }
    await navigator.clipboard.writeText(link); notify('Link da ficha copiado. É só colar na conversa.')
  }, 'Não consegui preparar o link agora.')
  const addPersonal = (item: IngredientBase) => attempt(async () => {
    await saveEntity(scope, 'personal_ingredients', item)
    setState(current => ({ ...current, customIngredients: [...current.customIngredients, item] })); scheduleSync(); notify(`“${item.name}” entrou na sua despensa.`)
  }, 'O ingrediente não foi guardado.')
  const addLog = (log: CookLog) => attempt(async () => {
    const value = { ...log, ownerId: scope }; await saveEntity(scope, 'cook_logs', value)
    setState(current => ({ ...current, cookLogs: [value, ...current.cookLogs] })); scheduleSync(); notify('Preparo registrado no caderno.')
  }, 'O preparo não foi registrado.')
  const saveCollection = (collection: Collection, message: string) => attempt(async () => {
    const value = { ...collection, ownerId: scope }; await saveEntity(scope, 'collections', value)
    setState(current => ({ ...current, collections: [value, ...current.collections.filter(c => c.id !== value.id)] })); scheduleSync(); notify(message)
  }, 'A coleção não foi guardada.')
  const toShopping = (recipe: Recipe) => attempt(async () => {
    const next = state.shopping.map(item => ({ ...item }))
    const touched = new Set<string>()
    for (const ingredient of recipe.ingredients) {
      const found = next.find(i => i.ingredientId === ingredient.ingredientId && sameUnitFamily(i.unit, ingredient.unit) && !i.checked)
      if (found && found.amount !== null && ingredient.amount !== null) {
        found.amount += ingredient.amount * baseFactor(ingredient.unit) / baseFactor(found.unit); touched.add(found.id)
      } else {
        const item: ShoppingItem = { id: uid(), ownerId: scope, ingredientId: ingredient.ingredientId, name: ingredient.name, category: ingredient.category, amount: ingredient.amount, unit: ingredient.unit, checked: false }
        next.push(item); touched.add(item.id)
      }
    }
    for (const item of next) if (touched.has(item.id)) await saveEntity(scope, 'shopping_items', item)
    setState(current => ({ ...current, shopping: next })); scheduleSync(); notify('Ingredientes somados à lista de compras.')
  }, 'Não consegui levar os ingredientes para a lista.')
  const toggleShopping = (id: string) => attempt(async () => {
    const item = state.shopping.find(i => i.id === id); if (!item) return
    const value = { ...item, checked: !item.checked }
    setState(current => ({ ...current, shopping: current.shopping.map(i => i.id === id ? value : i) }))
    await saveEntity(scope, 'shopping_items', value); scheduleSync(1500)
  }, 'O item não foi marcado. Tente de novo.')
  const clearShopping = () => attempt(async () => {
    const checked = state.shopping.filter(i => i.checked)
    for (const item of checked) await deleteEntity(scope, 'shopping_items', item.id)
    setState(current => ({ ...current, shopping: current.shopping.filter(i => !i.checked) })); scheduleSync()
    notify(`${checked.length} ${checked.length === 1 ? 'item saiu' : 'itens saíram'} da sacola.`)
  }, 'Não consegui limpar os comprados.')
  const importBackup = (imported: LocalState) => attempt(async () => {
    for (const recipe of imported.recipes ?? []) await saveEntity(scope, 'recipes', { ...recipe, ownerId: scope })
    for (const item of imported.customIngredients ?? []) await saveEntity(scope, 'personal_ingredients', { ...item, ownerId: scope })
    for (const item of imported.shopping ?? []) await saveEntity(scope, 'shopping_items', { ...item, ownerId: scope })
    await refresh(scope); scheduleSync(300); notify('Backup importado para o caderno.')
  }, 'O backup não foi importado.')

  function go(next: Page, kind: PageMotion = 'turn') { setPageMotion(kind); setPage(next === 'settings' && !isAdmin ? 'home' : next); setMenu(false) }
  function openRecipe(recipe: Recipe) { setSelectedId(recipe.id); go('recipe', 'open') }
  function newRecipe() { setEditing(blankRecipe()); go('form') }
  async function adoptRecipe(recipe: Recipe) {
    const now = new Date().toISOString()
    const copy: Recipe = { ...recipe, id: uid(), ownerId: scope, source: `${recipe.source} · ${'sourceUrl' in recipe ? recipe.sourceUrl : ''}`.replace(/ · $/, ''), ingredients: recipe.ingredients.map(item => ({ ...item, id: uid() })), steps: recipe.steps.map(step => ({ ...step, id: uid() })), favorite: false, rating: 0, createdAt: now, updatedAt: now }
    const ok = await saveRecipe(copy)
    if (ok) recipeSaved(copy)
    return ok
  }

  return <MotionConfig reducedMotion="user">
    <AnimatePresence mode="wait">
      {!authReady ? <LoadingScreen key="loading"/>
        : !session ? <Auth key="auth" session={null} onDone={() => setPage('home')}/>
        : <motion.div key="app" className="app-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          <Header page={page} navigate={target => go(target)} menu={menu} setMenu={setMenu} session={session} isAdmin={isAdmin} syncStatus={syncStatus} pending={pending} onSync={() => void runSync()}/>
          <AnimatePresence mode="wait" custom={pageMotion} onExitComplete={() => scrollTo({ top: 0 })}>
            <motion.div key={`${page}-${selectedId ?? ''}`} className="page-sheet" custom={pageMotion} variants={pageVariants} initial="enter" animate="center" exit="exit" style={{ transformOrigin: '50% 0' }}>
              {page === 'home' && <HomePage recipes={state.recipes} openRecipe={openRecipe} saveSuggestion={adoptRecipe} newRecipe={newRecipe} navigate={target => go(target)}/>}
              {page === 'notebook' && <Notebook recipes={state.recipes} collections={state.collections} onSaveCollection={saveCollection} openRecipe={openRecipe} newRecipe={newRecipe}/>}
              {page === 'pantry' && <Pantry recipes={state.recipes} ingredients={ingredients} openRecipe={openRecipe}/>}
              {page === 'shopping' && <Shopping items={state.shopping} onToggle={toggleShopping} onClear={clearShopping}/>}
              {page === 'settings' && isAdmin && <Settings state={state} scope={scope} onImport={importBackup} onInvalid={() => notify('Este arquivo não parece ser um backup do Rancho da Cozinha.', 'warn')} configured={configured}/>}
              {page === 'auth' && <Auth session={session} onDone={() => go('home')}/>}
              {page === 'form' && editing && <RecipeForm recipe={editing} ingredients={ingredients} scope={scope} onDraft={saveDraft} onSave={saveRecipe} onSaved={recipeSaved} onCancel={() => go(editing.title ? 'recipe' : 'notebook')} onIngredientCreate={addPersonal}/>}
              {page === 'recipe' && selected && <RecipeView recipe={selected} catalog={Boolean(selectedFromCatalog && !selectedFromNotebook)} logs={state.cookLogs.filter(log => log.recipeId === selected.id)} onBack={() => go(selectedFromCatalog && !selectedFromNotebook ? 'home' : 'notebook')} onEdit={() => { setEditing(selected); go('form') }} onDelete={() => removeRecipe(selected)} onFavorite={() => toggleFavorite(selected)} onRate={rating => rateRecipe(selected, rating)} onShare={() => shareRecipe(selected)} onSaveToNotebook={() => adoptRecipe(selected)} onKitchen={() => go('kitchen', 'kitchen')} onShopping={() => toShopping(selected)} onLog={addLog}/>}
              {page === 'recipe' && !selected && <main className="page"><EmptyNotebook newRecipe={newRecipe}/></main>}
              {page === 'kitchen' && selected && <Kitchen recipe={selected} onClose={() => go('recipe', 'open')}/>}
            </motion.div>
          </AnimatePresence>
          <Footer navigate={target => go(target)} newRecipe={newRecipe}/>
        </motion.div>}
    </AnimatePresence>
    <TicketStack notes={notes} dismiss={id => setNotes(current => current.filter(note => note.id !== id))}/>
  </MotionConfig>
}

function ProfileAvatar({ session, className = '' }: { session: Session; className?: string }) {
  const value = session.user.user_metadata?.avatar_path as string | undefined
  const name = String(session.user.user_metadata?.full_name || session.user.email || 'Cozinheiro')
  return <span className={`avatar ${className}`}><Photo value={value} alt={`Foto de ${name}`} fallback={name[0]?.toUpperCase()}/></span>
}

function Header({ page, navigate, menu, setMenu, session, isAdmin, syncStatus, pending, onSync }: { page: Page; navigate: (p: Page) => void; menu: boolean; setMenu: (v: boolean) => void; session: Session; isAdmin: boolean; syncStatus: SyncStatus; pending: number; onSync: () => void }) {
  const nav: [Page, string, React.ReactNode][] = [['home', 'Início', <Home size={18}/>], ['notebook', 'Caderno', <BookOpen size={18}/>], ['pantry', 'Despensa', <UtensilsCrossed size={18}/>], ['shopping', 'Compras', <ShoppingBasket size={18}/>]]
  if (isAdmin) nav.push(['settings', 'Ajustes', <Archive size={18}/>])
  const name = String(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Cozinheiro')
  return <><div className="gingham-bar"/><header className="site-header"><button className="brand" onClick={() => navigate('home')}><RanchMark size={54}/><span><strong>Rancho da Cozinha</strong><small>receitas da casa desde sempre</small></span></button>
    <nav className={menu ? 'open' : ''}>{nav.map(([target, label, icon]) => <button key={target} className={page === target ? 'active' : ''} onClick={() => navigate(target)}>{icon}{label}{page === target && <motion.span layoutId="nav-ink" className="nav-ink" transition={paper}/>}</button>)}</nav>
    <div className="header-tools"><SyncLamp status={syncStatus} pending={pending} onRetry={onSync}/><button className="profile-link" onClick={() => navigate('auth')}><ProfileAvatar session={session}/><span><b>{name}</b><small>Perfil</small></span></button><button className="logout-button" onClick={() => void supabase?.auth.signOut()} aria-label="Sair da conta" title="Sair da conta"><LogOut size={19}/><span>Sair</span></button><button className="menu-button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu}>{menu ? <X/> : <Menu/>}</button></div>
  </header></>
}

/** Maço de fichas com o número carimbado: contador das seções da casa. */
function Tally({ count, label }: { count: number; label: string }) {
  return <motion.span className="tally" initial={{ opacity: 0, rotate: 6, y: -8 }} whileInView={{ opacity: 1, rotate: -2.5, y: 0 }} viewport={{ once: true }} transition={paper} whileHover={{ rotate: 0, y: -2 }}>
    <b><CountUp value={count}/></b><small>{label}</small>
  </motion.span>
}

function CatalogCard({ item, onOpen }: { item: BrazilianRecipe; onOpen: () => void }) {
  const fx = dishMotion(item)
  return <motion.article className="catalog-card" variants={rise} whileHover={{ y: -4 }}>
    <div className={`catalog-photo ${fxClass(fx)}`}><Photo value={item.cover} alt={item.title}/><DishFx kind={fx}/></div>
    <div><span>{item.regions[0]}</span><h3>{item.title}</h3><MiniReview id={item.id}/><p>{calorieLabel(item)} · {item.prepMinutes + item.cookMinutes} min</p><button onClick={onOpen}><BookOpen size={16}/> Ver receita</button></div>
  </motion.article>
}

const FEATURE_DWELL = 7000
const featureSwap = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 44, rotate: dir * 0.8 }),
  center: { opacity: 1, x: 0, rotate: 0, transition: { duration: 0.45, ease: ink } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -32, rotate: dir * -0.8, transition: { duration: 0.22 } })
}
function HomePage({ recipes, openRecipe, saveSuggestion, newRecipe, navigate }: { recipes: Recipe[]; openRecipe: (r: Recipe) => void; saveSuggestion: (r: Recipe) => Promise<boolean>; newRecipe: () => void; navigate: (p: Page) => void }) {
  const [weather, setWeather] = useState<WeatherContext>()
  const [weatherState, setWeatherState] = useState<'loading' | 'ready' | 'denied'>('loading')
  async function loadWeather() {
    setWeatherState('loading')
    try { setWeather(await weatherAtCurrentLocation()); setWeatherState('ready') }
    catch { setWeatherState('denied') }
  }
  useEffect(() => { void loadWeather() }, [])
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 5 * 60 * 1000); return () => clearInterval(timer) }, [])
  const moment = useMemo(() => currentMoment(weather, now), [weather, now])
  const picks = useMemo(() => rankForMoment(brazilianRecipes, moment, now), [moment, now])
  const featured = picks.slice(0, 4)
  const featuredKey = featured.map(item => item.recipe.id).join()
  const daily = useRef<HTMLElement>(null)
  const rotation = useRotation(featured.length, FEATURE_DWELL, daily)
  useEffect(() => { rotation.setIndex(0) }, [featuredKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // Direção da troca: para a direita ao avançar (inclusive quando volta ao começo sozinho).
  const shownIndex = useRef(rotation.index); const direction = useRef(1)
  if (shownIndex.current !== rotation.index) { direction.current = (rotation.index - shownIndex.current + featured.length) % featured.length === 1 ? 1 : -1; shownIndex.current = rotation.index }
  const cardDragged = useRef(false)
  const pick = featured[rotation.index] ?? picks[0]
  const recommendation = pick.recipe
  const review = ranchReviews[recommendation.id]
  const fx = dishMotion(recommendation)
  const recent = [...recipes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4)
  return <main className="page home-page">
    <motion.section className="home-command" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ink }}>
      <div><span className="eyebrow">Sua cozinha, direto ao ponto</span><h1>O que vamos <span className="scribble">preparar<svg viewBox="0 0 200 18" preserveAspectRatio="none" aria-hidden="true"><path d="M3 12.5c38-7 81-9.5 121-6.2 27 2.2 49 .8 73-4.6"/></svg></span>?</h1></div>
      <div><button className="button" onClick={newRecipe}><Plus size={18}/> Nova receita</button><button className="button button-paper" onClick={() => navigate('pantry')}>Cozinhar com o que tenho</button></div>
    </motion.section>

    <section className="daily smart-daily" ref={daily}>
      <div className="section-row"><div className="section-intro"><span className="eyebrow">Sugestão do Rancho para agora</span><h2>O prato certo para agora</h2></div>
        <WeatherTicket weather={weather} state={weatherState} moment={moment} onLocate={() => void loadWeather()}/>
      </div>
      <div className="climate-stage" {...rotation.hoverProps}>
        <AnimatePresence mode="wait" initial={false} custom={direction.current}>
          <motion.article key={recommendation.id} className="climate-card" custom={direction.current} variants={featureSwap} initial="enter" animate="center" exit="exit"
            drag={featured.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.3} dragSnapToOrigin
            onPointerDown={() => { cardDragged.current = false }}
            onDragStart={() => { cardDragged.current = true; rotation.setDragging(true) }}
            onDragEnd={(_, info) => { rotation.setDragging(false); if (info.offset.x < -60 || info.velocity.x < -400) rotation.goTo(rotation.index + 1); else if (info.offset.x > 60 || info.velocity.x > 400) rotation.goTo(rotation.index - 1); else rotation.rest() }}
            onClick={() => { if (!cardDragged.current) openRecipe(recommendation) }}>
            <div className={`climate-photo ${fxClass(fx)} always`}><Photo value={recommendation.cover} alt={recommendation.title}/><DishFx kind={fx} mode="always"/>
              {review && <motion.div className="climate-rosette" initial={{ rotate: -38, scale: 0.4, opacity: 0 }} animate={{ rotate: -8, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 170, damping: 9, delay: 0.4 }}><Rosette score={review.score} size={84}/></motion.div>}
            </div>
            <div className="climate-card-copy">
              <motion.span className="recommendation-badge" initial={{ scale: 1.6, opacity: 0, rotate: -9 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ ...stamp, delay: 0.25 }}><ThermometerSun size={16}/>{pick.reason ?? 'Escolha da cozinha do Rancho'}{moment.temperature !== undefined ? ` · ${moment.temperature} °C` : ''}</motion.span>
              <span className="eyebrow">{recommendation.regions.join(' · ')}</span><h3>{recommendation.title}</h3><p>{recommendation.description}</p>
              {review && <p className="climate-verdict">“{review.verdict}”<small>— cozinha de teste do Rancho</small></p>}
              <div className="recommendation-meta"><span><Flame size={16}/>{calorieLabel(recommendation)}</span><span>{recommendation.prepMinutes + recommendation.cookMinutes} min</span><span>rende {recommendation.servings}</span></div>
              <div className="recommendation-actions"><button className="button" onClick={event => { event.stopPropagation(); openRecipe(recommendation) }}><BookOpen size={17}/> Abrir a receita</button><span onClick={event => event.stopPropagation()}><BusyButton className="button button-paper" busyLabel="Copiando a ficha…" doneLabel="No seu caderno" onClick={() => saveSuggestion(recommendation)}><Plus size={17}/> Guardar no meu caderno</BusyButton></span></div>
            </div>
          </motion.article>
        </AnimatePresence>
        {featured.length > 1 && <div className="climate-pager">
          <SignArrow small direction="prev" label="Sugestão anterior" onClick={() => rotation.goTo(rotation.index - 1)}/>
          <Pins count={featured.length} current={rotation.index} playing={rotation.playing} dwell={FEATURE_DWELL} onPick={rotation.goTo} label={index => `Ver sugestão ${index + 1}: ${featured[index].recipe.title}`}/>
          <span>{rotation.index + 1} de {featured.length} ideias para agora</span>
          <SignArrow small direction="next" label="Próxima sugestão" onClick={() => rotation.goTo(rotation.index + 1)}/>
        </div>}
      </div>
    </section>

    <section className="home-section tasting-section"><div className="section-row"><div><span className="eyebrow">Provado e aprovado</span><h2>Varal de provas do Rancho</h2><p>{momentSentence(moment)}: as primeiras fichas do varal combinam com agora.</p></div><Tally count={Object.keys(ranchReviews).length} label="fichas julgadas"/></div><ReviewLine picks={picks} onOpen={openRecipe}/></section>

    <section className="home-section catalog-section"><div className="section-row"><div><span className="eyebrow">Base brasileira do Rancho</span><h2>Sabores de várias regiões</h2><p>Receitas selecionadas e prontas para entrar no seu caderno.</p></div><Tally count={brazilianRecipes.length} label="receitas na base"/></div>
      <motion.div className="catalog-grid" {...inView} variants={stack(0.07)}>{brazilianRecipes.filter(item => item.id !== picks[0].recipe.id).slice(0, 6).map(item => <CatalogCard key={item.id} item={item} onOpen={() => openRecipe(item)}/>)}</motion.div>
    </section>

    <section className="home-section"><div className="section-row"><div><span className="eyebrow">Páginas recentes</span><h2>Do seu caderno</h2></div><button className="text-button" onClick={() => navigate('notebook')}>Ver todas →</button></div>{recent.length ? <div className="card-grid">{recent.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} onOpen={() => openRecipe(r)}/>)}</div> : <EmptyNotebook newRecipe={newRecipe}/>}</section>

    <motion.section className="quick-notes" {...inView} variants={stack(0.09)}>
      <motion.button variants={rise} whileHover={{ y: -3 }} onClick={() => navigate('pantry')}><UtensilsCrossed/><span><strong>Despensa do dia</strong><small>Descubra receitas com o que já tem</small></span></motion.button>
      <motion.button variants={rise} whileHover={{ y: -3 }} onClick={() => navigate('shopping')}><ShoppingBasket/><span><strong>Lista do mercado</strong><small>Itens organizados por corredor</small></span></motion.button>
      <motion.button variants={rise} whileHover={{ y: -3 }} onClick={() => navigate('auth')}><UserRound/><span><strong>Meu perfil</strong><small>Conta, acesso e sincronização</small></span></motion.button>
    </motion.section>
  </main>
}

function EmptyNotebook({ newRecipe }: { newRecipe: () => void }) {
  return <motion.div className="empty-state" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: ink }}><span className="idle-skillet"><Skillet/></span><h2>Seu caderno ainda está em branco.</h2><p>Que tal registrar a primeira receita da casa?</p><button className="button" onClick={newRecipe}><Plus size={18}/> Escrever a primeira ficha</button></motion.div>
}

function Notebook({ recipes, collections, onSaveCollection, openRecipe, newRecipe }: { recipes: Recipe[]; collections: Collection[]; onSaveCollection: (c: Collection, message: string) => Promise<boolean>; openRecipe: (r: Recipe) => void; newRecipe: () => void }) {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('Todas'); const [favorite, setFavorite] = useState(false); const [difficulty, setDifficulty] = useState(0); const [collectionId, setCollectionId] = useState(''); const [newCollection, setNewCollection] = useState('')
  const [naming, setNaming] = useState(false)
  const [creating, runCreate] = useBusy()
  const narrow = useMedia('(max-width: 700px)')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const fuse = useMemo(() => new Fuse(recipes, { keys: ['title', 'description', 'tags', 'ingredients.name'], threshold: .35, ignoreLocation: true }), [recipes])
  const searched = query ? fuse.search(query).map(r => r.item) : recipes
  const activeCollection = collections.find(c => c.id === collectionId)
  const filtered = searched.filter(r => (category === 'Todas' || r.category === category) && (!favorite || r.favorite) && (!difficulty || r.difficulty === difficulty) && (!activeCollection || activeCollection.recipeIds.includes(r.id)))
  const categories = [...new Set([...CATEGORIES, ...recipes.map(r => r.category)])]
  const categoryOptions = [{ value: 'Todas', label: 'Todas as categorias' }, ...categories.map(name => { const count = recipes.filter(r => r.category === name).length; return { value: name, label: name, hint: count ? String(count) : undefined } })]
  const collectionOptions = [{ value: '', label: 'Todas as coleções' }, ...collections.map(c => ({ value: c.id, label: c.name, hint: String(c.recipeIds.length) }))]
  const active: { key: string; label: string; clear: () => void }[] = [
    ...(query ? [{ key: 'q', label: `“${query}”`, clear: () => setQuery('') }] : []),
    ...(category !== 'Todas' ? [{ key: 'c', label: category, clear: () => setCategory('Todas') }] : []),
    ...(difficulty ? [{ key: 'd', label: `${difficulty} chapéu${difficulty > 1 ? 's' : ''}`, clear: () => setDifficulty(0) }] : []),
    ...(favorite ? [{ key: 'f', label: 'Favoritas', clear: () => setFavorite(false) }] : []),
    ...(activeCollection ? [{ key: 'k', label: activeCollection.name, clear: () => setCollectionId('') }] : [])
  ]
  const filterCount = active.filter(item => item.key !== 'q').length
  function clearAll() { setQuery(''); setCategory('Todas'); setDifficulty(0); setFavorite(false); setCollectionId('') }
  function createCollection() {
    const name = newCollection.trim(); if (!name) return
    void runCreate(async () => { const c = { id: uid(), name, recipeIds: [] }; if (await onSaveCollection(c, `Coleção “${name}” criada.`)) { setCollectionId(c.id); setNewCollection(''); setNaming(false) } })
  }
  function addToCollection(recipe: Recipe, id: string) { const c = collections.find(x => x.id === id); if (!c) return; void onSaveCollection({ ...c, recipeIds: [...new Set([...c.recipeIds, recipe.id])] }, `“${recipe.title}” foi para ${c.name}.`) }
  const showFilters = !narrow || filtersOpen
  return <main className="page notebook-page">
    <div className="page-heading"><div><span className="eyebrow">Fichas guardadas</span><h1>Meu caderno</h1><p>{recipes.length} receita{recipes.length !== 1 ? 's' : ''}, cada uma com sua história.</p></div><button className="button" onClick={newRecipe}><Plus size={18}/> Nova receita</button></div>
    <motion.section className="search-panel fichario" aria-label="Buscar e filtrar receitas" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: ink }}>
      <span className="fichario-tab" aria-hidden="true">Fichário</span>
      <div className="fichario-top">
        <label className="search-box"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={narrow ? 'Buscar receita' : 'Nome, ingrediente ou tag'} aria-label="Buscar receitas por nome, ingrediente ou tag"/>{query && <button type="button" className="search-clear" aria-label="Limpar busca" onClick={() => setQuery('')}><X size={16}/></button>}</label>
        {narrow && <button type="button" className={`filter-toggle${filtersOpen ? ' is-open' : ''}`} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18}/> Filtros{filterCount > 0 && <b>{filterCount}</b>}</button>}
      </div>
      <AnimatePresence initial={false}>{showFilters && <motion.div className="fichario-filters" initial={narrow ? { opacity: 0, y: -8 } : false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }} transition={{ duration: 0.22, ease: ink }}>
        <PaperSelect label="Categoria" value={category} options={categoryOptions} onChange={setCategory}/>
        <HatPicker value={difficulty} onChange={setDifficulty}/>
        <FavoriteToggle on={favorite} onChange={setFavorite}/>
        {collections.length > 0 && <PaperSelect label="Coleção" value={collectionId} options={collectionOptions} onChange={setCollectionId}/>}
        <div className="new-collection">
          <AnimatePresence mode="wait" initial={false}>{naming
            ? <motion.form key="form" className="new-collection-form" onSubmit={event => { event.preventDefault(); createCollection() }} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.22, ease: ink }}>
                <input autoFocus value={newCollection} onChange={e => setNewCollection(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setNaming(false) }} placeholder="Ex.: Natal, Domingo em família" aria-label="Nome da nova coleção"/>
                <button type="submit" className="button button-small" disabled={creating || !newCollection.trim()}>{creating ? <><Stir/> Criando…</> : 'Criar'}</button>
                <button type="button" className="icon-button" aria-label="Cancelar nova coleção" onClick={() => setNaming(false)}><X size={16}/></button>
              </motion.form>
            : <motion.button key="open" type="button" className="new-collection-open" onClick={() => setNaming(true)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><FolderPlus size={17}/> Nova coleção</motion.button>}
          </AnimatePresence>
        </div>
      </motion.div>}</AnimatePresence>
      <div className="fichario-foot">
        <span className="fichario-count">{filtered.length === recipes.length ? `${recipes.length} fichas no fichário` : `${filtered.length} de ${recipes.length} fichas`}</span>
        <AnimatePresence initial={false}>{active.map(item => <motion.button layout key={item.key} type="button" className="filter-chip" aria-label={`Tirar filtro ${item.label}`} onClick={item.clear} initial={{ opacity: 0, y: -10, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: -1 }} exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.14 } }} transition={paper}>{item.label}<X size={13}/></motion.button>)}</AnimatePresence>
        {active.length > 1 && <button type="button" className="text-button fichario-clear" onClick={clearAll}>Limpar tudo</button>}
      </div>
    </motion.section>
    <AnimatePresence mode="wait" initial={false}>{filtered.length
      ? <motion.div key="grid" layout className="card-grid roomy" exit={{ opacity: 0 }}><AnimatePresence mode="popLayout">{filtered.map((r, i) => { const available = collections.filter(c => !c.recipeIds.includes(r.id)); return <motion.div layout className="card-wrap" key={r.id} exit={{ opacity: 0, scale: 0.9, rotate: -3, transition: { duration: 0.2 } }} transition={paper}><RecipeCard recipe={r} index={i} onOpen={() => openRecipe(r)}/>{available.length > 0 && <PaperSelect compact label={`Guardar ${r.title} em uma coleção`} value="" placeholder="Guardar em coleção" icon={<FolderPlus size={15}/>} options={available.map(c => ({ value: c.id, label: c.name }))} onChange={id => addToCollection(r, id)}/>}</motion.div> })}</AnimatePresence></motion.div>
      : <motion.div key="empty" className="empty-state small" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Search/><h2>Nenhuma ficha encontrada</h2><p>Tente retirar um filtro ou buscar outro ingrediente.</p>{active.length > 0 && <button className="button button-outline button-small" onClick={clearAll}>Limpar filtros</button>}</motion.div>}
    </AnimatePresence>
  </main>
}

const tagTilt = [-1.6, 1.3, -0.5, 2]
function Pantry({ recipes, ingredients, openRecipe }: { recipes: Recipe[]; ingredients: IngredientBase[]; openRecipe: (r: Recipe) => void }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState<IngredientBase[]>([])
  const fuse = useMemo(() => new Fuse(ingredients, { keys: ['name', 'aliases'], threshold: .36, ignoreLocation: true }), [ingredients])
  const matches = query ? fuse.search(query, { limit: 10 }).map(x => x.item).filter(x => !selected.some(s => s.id === x.id)) : []
  const ranked = recipes.map(recipe => { const ids = new Set(recipe.ingredients.map(i => i.ingredientId)); const names = recipe.ingredients.map(i => normalize(i.name)); const hit = selected.filter(item => ids.has(item.id) || names.some(n => n.includes(normalize(item.name)) || normalize(item.name).includes(n))).length; return { recipe, hit, score: selected.length ? hit / selected.length : 0 } }).filter(x => x.hit > 0).sort((a, b) => b.score - a.score)
  return <main className="page pantry-page"><div className="page-heading"><div><span className="eyebrow">Abra a despensa</span><h1>O que dá para fazer?</h1><p>Marque o que você tem e veja quais fichas combinam.</p></div></div>
    <section className="pantry-board"><label className="search-box"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite um ingrediente que está em casa"/></label>
      <AnimatePresence>{matches.length > 0 && <motion.div className="suggestions floating" style={{ x: '-50%' }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }} transition={{ duration: 0.18 }}>{matches.map(item => <button key={item.id} onClick={() => { setSelected(s => [...s, item]); setQuery('') }}><span>{item.name}</span><small>{item.category}</small></button>)}</motion.div>}</AnimatePresence>
      <div className="pantry-tags">{selected.length === 0 && <p>Sua bancada está vazia. Comece procurando um ingrediente.</p>}<AnimatePresence>{selected.map((item, i) => <motion.button layout key={item.id} aria-label={`Tirar ${item.name} da bancada`} onClick={() => setSelected(s => s.filter(x => x.id !== item.id))} initial={{ opacity: 0, y: -30, rotate: -14 }} animate={{ opacity: 1, y: 0, rotate: tagTilt[i % tagTilt.length] }} exit={{ opacity: 0, scale: 0.6, rotate: 10, transition: { duration: 0.15 } }} transition={paper}>{item.name}<X size={14}/></motion.button>)}</AnimatePresence></div>
    </section>
    <div className="match-heading"><h2>Receitas possíveis</h2><span>{ranked.length ? `${ranked.length} combinaç${ranked.length > 1 ? 'ões' : 'ão'}` : selected.length ? 'Nenhuma ficha usa esses ingredientes ainda' : 'Selecione ingredientes para começar'}</span></div>
    <div className="match-list"><AnimatePresence initial={false}>{ranked.map(({ recipe, hit, score }) => <motion.button layout key={recipe.id} onClick={() => openRecipe(recipe)} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }} transition={paper}><div className="match-score"><strong><CountUp value={Math.round(score * 100)} suffix="%"/></strong><span>{hit} de {selected.length}</span></div><div><h3>{recipe.title}</h3><p>{recipe.description}</p><small>{recipe.ingredients.filter(i => !selected.some(s => s.id === i.ingredientId || normalize(s.name) === normalize(i.name))).slice(0, 4).map(i => i.name).join(' · ') || 'Você tem tudo que selecionou'}</small></div><span>Ver ficha →</span></motion.button>)}</AnimatePresence></div>
  </main>
}

function Shopping({ items, onToggle, onClear }: { items: ShoppingItem[]; onToggle: (id: string) => Promise<boolean>; onClear: () => Promise<boolean> }) {
  const groups = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => { (acc[item.category] ??= []).push(item); return acc }, {})
  const sections = [...INGREDIENT_CATEGORIES.filter(cat => groups[cat]?.length), ...Object.keys(groups).filter(cat => !(INGREDIENT_CATEGORIES as readonly string[]).includes(cat))]
  const left = items.filter(i => !i.checked).length
  return <main className="page shopping-page"><div className="page-heading"><div><span className="eyebrow">Para levar ao mercado</span><h1>Lista de compras</h1><p>{left ? `${left} ${left === 1 ? 'item ainda' : 'itens ainda'} na sacola.` : items.length ? 'Tudo riscado. Hora de voltar pra casa.' : 'Nada anotado por enquanto.'}</p></div>{items.some(i => i.checked) && <BusyButton className="button button-outline" busyLabel="Limpando…" onClick={onClear}>Limpar comprados</BusyButton>}</div>
    {items.length === 0 ? <motion.div className="empty-state basket-empty" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}><ShoppingBasket/><h2>A sacola está vazia.</h2><p>Abra uma receita e mande os ingredientes para cá.</p></motion.div>
      : <motion.div className="shopping-paper" initial={{ opacity: 0, y: 24, rotate: -0.8 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={paper}><AnimatePresence initial={false}>{sections.map(category => <motion.section key={category} layout exit={{ opacity: 0, height: 0, transition: { duration: 0.25 } }}><h2>{category}</h2><AnimatePresence initial={false}>{groups[category].map(item => <motion.label layout key={item.id} className={`ink-check${item.checked ? ' struck' : ''}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }} transition={paper}><input type="checkbox" checked={item.checked} onChange={() => void onToggle(item.id)}/><InkBox/><span className="ink-text">{item.name}</span><strong>{prettyAmount(item.amount)} {item.amount !== null && item.unit}</strong></motion.label>)}</AnimatePresence></motion.section>)}</AnimatePresence></motion.div>}
  </main>
}

function Settings({ state, scope, onImport, onInvalid, configured }: { state: LocalState; scope: string; onImport: (state: LocalState) => Promise<boolean>; onInvalid: () => void; configured: boolean }) {
  const [importing, run] = useBusy()
  function download() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rancho-da-cozinha-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href) }
  function upload(file: File) { void run(async () => { let data: LocalState; try { data = JSON.parse(await file.text()) as LocalState; if (!Array.isArray(data.recipes)) throw new Error() } catch { onInvalid(); return } await onImport(data) }) }
  return <main className="page settings-page"><div className="page-heading"><div><span className="eyebrow">Celeiro de dados</span><h1>Ajustes e backup</h1><p>Cuide do seu caderno e mantenha uma cópia segura.</p></div></div>
    <motion.div className="settings-grid" {...inView} variants={stack(0.08)}>
      <motion.section variants={rise}><Cloud/><div><h2>Sincronização</h2><p>{configured ? scope === 'guest' ? 'O Supabase está pronto. Entre na sua conta para sincronizar entre aparelhos.' : 'Sua conta está ligada ao Supabase e usa cache offline neste aparelho.' : 'Modo local ativo. Preencha as variáveis do Supabase para sincronizar entre PC e celular.'}</p></div></motion.section>
      <motion.section variants={rise}><Download/><div><h2>Exportar caderno</h2><p>Baixe receitas, ingredientes pessoais, lista e histórico em JSON.</p><button className="button button-small" onClick={download}>Baixar backup</button></div></motion.section>
      <motion.section variants={rise}><Upload/><div><h2>Importar caderno</h2><p>Restaure um arquivo de backup. Itens com IDs iguais são atualizados.</p><label className={`button button-small file-button${importing ? ' is-busy' : ''}`} aria-busy={importing}>{importing ? <><Stir/> Importando…</> : 'Escolher arquivo'}<input type="file" accept="application/json" disabled={importing} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload(file) }}/></label></div></motion.section>
      <motion.section variants={rise}><Archive/><div><h2>O que está guardado</h2><p>{state.recipes.length} receitas · {state.customIngredients.length} ingredientes pessoais · {state.cookLogs.length} preparos registrados.</p></div></motion.section>
    </motion.div>
  </main>
}

function ProfilePage({ session, onDone }: { session: Session; onDone: () => void }) {
  const metadata = session.user.user_metadata ?? {}
  const [name, setName] = useState(String(metadata.full_name || ''))
  const [email, setEmail] = useState(session.user.email || '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!supabase || saving) return
    setSaving(true); setMessage('')
    const changes: { email?: string; data: Record<string, unknown> } = { data: { ...metadata, full_name: name.trim() } }
    if (email.trim() && email.trim() !== session.user.email) changes.email = email.trim()
    const { error } = await supabase.auth.updateUser(changes)
    setSaving(false)
    setMessage(error ? `Não foi possível salvar: ${error.message}` : changes.email ? 'Dados salvos. Confirme o novo e-mail pela mensagem enviada.' : 'Dados do perfil atualizados.')
  }
  async function photo(file: File) {
    if (saving) return
    setSaving(true); setMessage('Revelando sua foto…')
    try {
      const avatarPath = await uploadAvatar(session.user.id, file)
      const { error } = await supabase!.auth.updateUser({ data: { ...metadata, full_name: name.trim(), avatar_path: avatarPath } })
      if (error) throw error
      setMessage('Foto do perfil atualizada.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível enviar a foto.') }
    finally { setSaving(false) }
  }
  return <main className="page profile-page"><motion.section className="profile-card profile-editor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={paper}><div className="profile-side"><div className={`profile-photo${saving ? ' is-busy' : ''}`}><ProfileAvatar session={session} className="profile-avatar"/><label className="photo-action"><Camera size={18}/> Trocar foto<input type="file" accept="image/*" disabled={saving} onChange={event => event.target.files?.[0] && void photo(event.target.files[0])}/></label></div><h2>{name || 'Seu perfil'}</h2><p>{session.user.email}</p><div className="profile-trust"><ShieldCheck size={18}/><span>Conta protegida e conteúdo particular</span></div></div>
    <form className="profile-form" onSubmit={event => void save(event)}><span className="eyebrow">Dados cadastrais</span><h1>Seu lugar à mesa</h1><p>Atualize seu nome, e-mail e foto. As recomendações usam a localização atual do aparelho.</p><div className="form-grid"><label>Nome completo<input value={name} onChange={event => setName(event.target.value)} placeholder="Como devemos chamar você?"/></label><label>E-mail<input type="email" required value={email} onChange={event => setEmail(event.target.value)}/></label></div>
      <AnimatePresence mode="wait">{message && <motion.p key={message} className="profile-message" role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message}</motion.p>}</AnimatePresence>
      <div className="profile-actions"><button className="button" type="submit" disabled={saving} aria-busy={saving}>{saving ? <><Stir/> Salvando…</> : 'Salvar alterações'}</button><button className="button button-outline" type="button" onClick={async () => { await supabase?.auth.signOut(); onDone() }}><LogOut size={18}/> Sair da conta</button></div></form>
  </motion.section></main>
}

function Auth({ session, onDone }: { session: Session | null; onDone: () => void }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [mode, setMode] = useState<'login' | 'signup'>('login'); const [message, setMessage] = useState('')
  const [busy, run] = useBusy(); const [leaving, setLeaving] = useState(false)
  function submit(event: React.FormEvent) {
    event.preventDefault()
    void run(async () => {
      if (!supabase) { setMessage('Configure o Supabase no arquivo .env para entrar.'); return }
      setMessage('')
      const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
      setMessage(result.error?.message ?? (mode === 'signup' && !result.data.session ? 'Confira seu e-mail para confirmar a conta.' : 'Conta conectada.'))
      if (result.data.session) onDone()
    })
  }
  async function google() { if (!supabase) { setMessage('Configure o Supabase no arquivo .env para entrar.'); return } setLeaving(true); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } }); if (error) { setLeaving(false); setMessage(error.message) } }
  if (session) return <ProfilePage session={session} onDone={onDone}/>
  return <motion.main className="auth-shell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
    <section className="auth-visual"><img src="/assets/login-ranch-kitchen.jpg" alt="Caderno aberto em uma cozinha de rancho iluminada por lampião"/><div className="auth-visual-copy"><div className="auth-brand"><div><strong>Rancho da Cozinha</strong><small>receitas da casa desde sempre</small></div></div><motion.blockquote initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: ink, delay: 0.3 }}>“Toda casa tem receitas que merecem atravessar gerações.”</motion.blockquote><span>Seu caderno particular, sempre à mão.</span></div></section>
    <section className="auth-panel"><motion.form className="auth-card" onSubmit={submit} initial="hidden" animate="shown" variants={stack(0.06)}>
      <motion.span variants={rise} className="auth-kicker"><LockKeyhole size={16}/> Acesso exclusivo</motion.span>
      <AnimatePresence mode="wait" initial={false}><motion.h1 key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>{mode === 'login' ? 'Entre no seu rancho' : 'Abra seu caderno'}</motion.h1></AnimatePresence>
      <motion.p variants={rise} className="auth-lead">Entre para acessar suas receitas, sua despensa e as memórias da sua cozinha.</motion.p>
      <motion.button variants={rise} className="google-button" type="button" disabled={leaving || busy} onClick={() => void google()}>{leaving ? <><Stir/> Indo até o Google…</> : <><span>G</span> Continuar com Google</>}</motion.button>
      <motion.div variants={rise} className="auth-divider"><span>ou use seu e-mail</span></motion.div>
      <motion.label variants={rise}>E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com"/></motion.label>
      <motion.label variants={rise}>Senha<input type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres"/></motion.label>
      <motion.button variants={rise} className="button auth-submit" type="submit" disabled={busy || leaving} aria-busy={busy}>{busy ? <><Stir/>{mode === 'login' ? 'Abrindo a porteira…' : 'Preparando seu caderno…'}</> : mode === 'login' ? 'Entrar na cozinha' : 'Criar meu caderno'}</motion.button>
      <motion.button variants={rise} className="text-button auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage('') }}>{mode === 'login' ? 'Primeira vez por aqui? Criar conta' : 'Já tenho uma conta'}</motion.button>
      <AnimatePresence>{message && <motion.p key={message} role="status" className="auth-message" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message}</motion.p>}</AnimatePresence>
      <motion.div variants={rise} className="auth-security"><ShieldCheck size={17}/><span>Seu conteúdo só aparece depois do login.</span></motion.div>
    </motion.form><a className="auth-credit" href="https://www.jessbranding.com.br" target="_blank" rel="noreferrer">Experiência criada por <strong>Jess Branding</strong></a></section>
  </motion.main>
}

const loadingLines = ['Acendendo o fogão a lenha…', 'Tirando a poeira do caderno…', 'Passando o café…', 'Separando as fichas da casa…']
function LoadingScreen() {
  const [line, setLine] = useState(0)
  useEffect(() => { const timer = setInterval(() => setLine(current => (current + 1) % loadingLines.length), 1600); return () => clearInterval(timer) }, [])
  return <motion.main className="loading-screen" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
    <motion.span initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: ink }}><RanchMark size={130}/></motion.span>
    <span className="loading-stove" aria-hidden="true"><DishFx kind="steam" mode="always"/><Skillet size={74}/><i className="stove-flame"/></span>
    <span className="eyebrow">Preparando a mesa</span>
    <AnimatePresence mode="wait"><motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>{loadingLines[line]}</motion.p></AnimatePresence>
  </motion.main>
}


type KitchenTimer = { id: string; label: string; total: number; left: number }
// Campainha de relógio de corda: três toques curtos, sem arquivo de áudio.
function ring(label: string) {
  try {
    const context = new AudioContext(); const now = context.currentTime
    ;[0, 0.28, 0.56].forEach((offset, index) => {
      const oscillator = context.createOscillator(); const gain = context.createGain()
      oscillator.type = 'triangle'; oscillator.frequency.value = index === 1 ? 1320 : 990
      gain.gain.setValueAtTime(0.0001, now + offset); gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.25)
      oscillator.connect(gain).connect(context.destination); oscillator.start(now + offset); oscillator.stop(now + offset + 0.26)
    })
    setTimeout(() => void context.close(), 1200)
  } catch { /* sem áudio disponível */ }
  navigator.vibrate?.([220, 100, 220])
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('Rancho da Cozinha', { body: `${label}: o relógio tocou.`, icon: '/icon-192.png' })
}
const stepCard = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 90, rotate: dir * 2.5 }),
  center: { opacity: 1, x: 0, rotate: 0, transition: paper },
  exit: (dir: number) => ({ opacity: 0, x: dir * -90, rotate: dir * -2.5, transition: { duration: 0.18 } })
}
function Kitchen({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [[index, dir], setStep] = useState<[number, number]>([0, 0]); const [drawer, setDrawer] = useState(false); const [timers, setTimers] = useState<KitchenTimer[]>([])
  const rung = useRef(new Set<string>())
  const last = recipe.steps.length - 1
  function go(delta: number) { setStep(([current]) => { const next = Math.min(last, Math.max(0, current + delta)); return next === current ? [current, 0] : [next, delta] }) }
  useEffect(() => { let lock: WakeLockSentinel | undefined; navigator.wakeLock?.request('screen').then(v => lock = v).catch(() => {}); const tick = setInterval(() => setTimers(ts => ts.map(t => ({ ...t, left: Math.max(0, t.left - 1) }))), 1000); return () => { clearInterval(tick); void lock?.release() } }, [])
  useEffect(() => { for (const timer of timers) if (timer.left === 0 && !rung.current.has(timer.id)) { rung.current.add(timer.id); ring(timer.label) } }, [timers])
  useEffect(() => {
    const keys = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') go(1); else if (event.key === 'ArrowLeft') go(-1); else if (event.key === 'Escape') setDrawer(false) }
    addEventListener('keydown', keys); return () => removeEventListener('keydown', keys)
  }, [last]) // eslint-disable-line react-hooks/exhaustive-deps
  const step = recipe.steps[index]
  function start(minutes: number) {
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission()
    setTimers(ts => [...ts, { id: uid(), label: `Passo ${index + 1}`, total: minutes * 60, left: minutes * 60 }])
  }
  return <main className="kitchen-mode"><header><button className="text-button" onClick={onClose}><X/> Sair do modo cozinha</button><span>{recipe.title}</span><button className="button button-small" onClick={() => setDrawer(!drawer)} aria-expanded={drawer}>Ingredientes</button></header>
    <div className="kitchen-progress"><motion.i initial={false} animate={{ width: `${((index + 1) / recipe.steps.length) * 100}%` }} transition={paper}/></div>
    <section>
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div key={index} className="kitchen-card" custom={dir} variants={stepCard} initial="enter" animate="center" exit="exit" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.35} onDragEnd={(_, info) => { if (info.offset.x < -80 || info.velocity.x < -450) go(1); else if (info.offset.x > 80 || info.velocity.x > 450) go(-1) }}>
          <span className="eyebrow">Passo {index + 1} de {recipe.steps.length}</span>
          <h1>{step.text || 'Descreva este passo no editor da receita.'}</h1>
          {step.timerMinutes && <motion.button className="windup-timer" onClick={() => start(step.timerMinutes!)} whileTap={{ scale: 0.95 }}><ClockIcon/>Dar corda no relógio de {step.timerMinutes} min</motion.button>}
          <small className="swipe-hint">Arraste para os lados para trocar de passo</small>
        </motion.div>
      </AnimatePresence>
      <div className="kitchen-nav"><button disabled={index === 0} onClick={() => go(-1)}>← Anterior</button><AnimatePresence mode="popLayout" initial={false}><motion.strong key={index} initial={{ y: dir * 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: dir * -18, opacity: 0 }}>{String(index + 1).padStart(2, '0')}</motion.strong></AnimatePresence><button disabled={index === last} onClick={() => go(1)}>Próximo →</button></div>
    </section>
    <div className="timer-tray"><AnimatePresence>{timers.map(t => { const done = t.left === 0; return <motion.button layout key={t.id} className={done ? 'done' : ''} aria-label={done ? `${t.label}: tempo esgotado. Toque para desligar` : `${t.label}: faltam ${Math.ceil(t.left / 60)} minutos. Toque para cancelar`} onClick={() => setTimers(ts => ts.filter(x => x.id !== t.id))} initial={{ y: 70, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ scale: 0.6, opacity: 0 }} transition={paper}><TimerFace left={t.left} total={t.total}/><span><small>{t.label}</small><strong>{Math.floor(t.left / 60)}:{String(t.left % 60).padStart(2, '0')}</strong></span></motion.button> })}</AnimatePresence></div>
    <AnimatePresence>{drawer && <motion.aside className="kitchen-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.22 } }} transition={paper}><button onClick={() => setDrawer(false)} aria-label="Fechar ingredientes"><X/></button><h2>Ingredientes</h2>{recipe.ingredients.map((i, n) => <motion.p key={i.id} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + Math.min(n, 10) * 0.03 }}><strong>{prettyAmount(i.amount)} {i.amount !== null && i.unit}</strong> {i.name}</motion.p>)}</motion.aside>}</AnimatePresence>
  </main>
}
function TimerFace({ left, total }: { left: number; total: number }) {
  const angle = 360 * (1 - left / Math.max(total, 1))
  return <svg className="timer-face" width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="4.5" fill="currentColor"/><circle cx="31" cy="8" r="4.5" fill="currentColor"/><circle cx="20" cy="22" r="14" fill="#fff6e4" stroke="currentColor" strokeWidth="2.4"/><path d="M20 10.5v2.2M20 31.3v2.2M8.5 22h2.2M29.3 22h2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M20 22V12.5" stroke="#9b2d20" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${angle} 20 22)`}/><circle cx="20" cy="22" r="1.8" fill="currentColor"/><path d="M11 34l-2.5 3M29 34l2.5 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}
function ClockIcon() { return <svg className="windup-clock" width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="22" r="14" stroke="currentColor" strokeWidth="2"/><path className="windup-hand" d="M20 22v-8m0 8 6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M16 4h8M29 9l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> }
