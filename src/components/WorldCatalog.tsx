import { useMemo, useState } from 'react'
import Fuse from 'fuse.js'
import { BookOpen, Search, X } from 'lucide-react'
import type { Recipe } from '../types'
import { RecipeCard } from './RecipeCard'

const PAGE_SIZE = 24
const areaOf = (recipe: Recipe) => recipe.source === 'TheMealDB' ? recipe.tags[0] || 'Outros países' : 'Brasil'

export function WorldCatalog({ recipes, loading, error, onOpen, onRetry }: {
  recipes: Recipe[]; loading: boolean; error: boolean; onOpen: (recipe: Recipe) => void; onRetry: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [area, setArea] = useState('Todos')
  const [page, setPage] = useState(1)
  const fuse = useMemo(() => new Fuse(recipes, { keys: ['title', 'ingredients.name', 'tags', 'category'], threshold: 0.36, ignoreLocation: true }), [recipes])
  const categories = useMemo(() => [...new Set(recipes.map(recipe => recipe.category))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [recipes])
  const areas = useMemo(() => [...new Set(recipes.map(areaOf))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [recipes])
  const found = useMemo(() => (query.trim() ? fuse.search(query.trim()).map(result => result.item) : recipes)
    .filter(recipe => (category === 'Todas' || recipe.category === category) && (area === 'Todos' || areaOf(recipe) === area)), [query, category, area, recipes, fuse])
  const totalPages = Math.max(1, Math.ceil(found.length / PAGE_SIZE))
  const visible = found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return <main className="page world-catalog-page">
    <div className="page-heading"><div><span className="eyebrow">Acervo do Rancho</span><h1>Explore as receitas</h1><p>Busque por prato ou ingrediente e encontre ideias de várias cozinhas do mundo.</p></div></div>
    <section className="world-catalog-intro"><BookOpen size={21}/><p>As receitas internacionais vêm do <a href="https://www.themealdb.com/" target="_blank" rel="noreferrer">TheMealDB</a> e foram traduzidas automaticamente para português brasileiro. Confira medidas e preparo antes de cozinhar.</p></section>
    <section className="world-catalog-filters" aria-label="Buscar no acervo">
      <label className="search-box"><Search size={19}/><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Nome ou ingrediente" aria-label="Buscar por nome ou ingrediente"/>{query && <button type="button" className="search-clear" onClick={() => { setQuery(''); setPage(1) }} aria-label="Limpar busca"><X size={16}/></button>}</label>
      <label>Tipo de prato<select value={category} onChange={event => { setCategory(event.target.value); setPage(1) }}><option>Todas</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Origem<select value={area} onChange={event => { setArea(event.target.value); setPage(1) }}><option>Todos</option>{areas.map(value => <option key={value}>{value}</option>)}</select></label>
    </section>
    {loading ? <div className="empty-state small"><BookOpen/><h2>Abrindo o acervo…</h2></div>
      : error ? <div className="empty-state small"><h2>Não consegui abrir o acervo</h2><p>Confira sua conexão e tente novamente.</p><button className="button button-small" onClick={onRetry}>Tentar de novo</button></div>
        : <>
          <div className="world-catalog-count"><strong>{found.length}</strong> {found.length === 1 ? 'receita encontrada' : 'receitas encontradas'}{found.length !== recipes.length && <span> de {recipes.length} no acervo</span>}</div>
          {visible.length ? <div className="card-grid roomy">{visible.map((recipe, index) => <RecipeCard key={recipe.id} recipe={recipe} index={index} onOpen={() => onOpen(recipe)}/>)}</div>
            : <div className="empty-state small"><Search/><h2>Nenhuma receita encontrada</h2><p>Experimente outro nome, ingrediente ou filtro.</p></div>}
          {totalPages > 1 && <nav className="world-catalog-pages" aria-label="Páginas do acervo"><button className="button button-outline button-small" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Anterior</button><span>Página {page} de {totalPages}</span><button className="button button-outline button-small" disabled={page === totalPages} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Próxima</button></nav>}
        </>}
  </main>
}
