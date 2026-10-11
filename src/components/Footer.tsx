import { BookOpen, Home, Plus, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { RanchMark } from './Artwork'

// Ditados populares do campo e da cozinha; um por dia.
const sayings = [
  'De grão em grão, a galinha enche o papo.',
  'Panela velha é que faz comida boa.',
  'Saco vazio não para em pé.',
  'Toda panela tem sua tampa.',
  'O olho do dono engorda o boi.',
  'Quem planta colhe.',
  'Cada um puxa a brasa para a sua sardinha.'
]

// Bando pequeno em V solto: posição relativa e atraso da batida de asa.
const flock: [number, number, number][] = [[0, 0, 0], [-20, -9, 0.17], [-38, 5, 0.31]]

/** Horizonte da fazenda que sobe do rodapé: morros, cata-vento girando, celeiro com a janela acesa, silo e cerca. */
function Landscape() {
  const fence = (from: number, to: number, top: number) => Array.from({ length: Math.floor((to - from) / 22) + 1 }, (_, i) => <rect key={i} x={from + i * 22} y={top} width="3.5" height="30" rx="1"/>)
  return <svg className="footer-landscape" viewBox="0 0 1440 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g className="land">
      <path d="M0 120V84c110-14 230-8 350-4s250-18 370-12 220 18 340 10 250-24 380-12V120Z"/>
      <path d="M601 92l16-72h4l-15 72zM643 92l-16-72h-4l15 72zM610 50h24v3h-24zM606 68h32v3h-32z"/>
      <rect x="617" y="13" width="10" height="10" rx="2"/>
      <path d="M627 18h28l6-5v12l-6-5h-28z"/>
      <path d="M744 102V40l-12 2 18-24 24-12 24 12 18 24-12-2v62z"/>
      <path d="M824 102V30a12 12 0 0 1 24 0v72z"/>
      <path d="M380 66h120v3H380zM380 73h120v3H380zM940 63h160v3H940zM940 70h160v3H940z"/>
      {fence(380, 500, 60)}{fence(940, 1100, 57)}
    </g>
    <g className="windmill-blades">{Array.from({ length: 6 }, (_, i) => <path key={i} d="M622 18l-3-21h6z" transform={`rotate(${i * 60} 622 18)`}/>)}<circle cx="622" cy="18" r="3.5"/></g>
    <rect className="barn-window" x="768" y="24" width="12" height="11" rx="1"/>
    <path className="barn-door" d="M762 72V50h24v22M762 50l24 22M786 50l-24 22"/>
    <g className="flock">{flock.map(([x, y, delay], i) => <g key={i} transform={`translate(${x} ${y})`}><g className="bird" style={{ animationDelay: `${delay}s` }}><path className="wing left" style={{ animationDelay: `${delay}s` }} d="M0 0q-4.5-5.5-10-3"/><path className="wing right" style={{ animationDelay: `${delay}s` }} d="M0 0q4.5-5.5 10-3"/></g></g>)}</g>
  </svg>
}

export function Footer({ navigate, newRecipe }: { navigate: (page: 'home' | 'notebook' | 'pantry' | 'shopping') => void; newRecipe: () => void }) {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return <footer className="site-footer">
    <Landscape/>
    <div className="footer-body">
      <div className="footer-brand"><RanchMark size={64}/><span><strong>Rancho da Cozinha</strong><small>Memórias servidas à mesa.</small></span></div>
      <nav className="footer-links" aria-label="Atalhos do rodapé">
        <span className="footer-label">Pela casa</span>
        <button type="button" onClick={() => navigate('home')}><Home size={16}/> Início</button>
        <button type="button" onClick={() => navigate('notebook')}><BookOpen size={16}/> Meu caderno</button>
        <button type="button" onClick={() => navigate('pantry')}><UtensilsCrossed size={16}/> Despensa</button>
        <button type="button" onClick={() => navigate('shopping')}><ShoppingBasket size={16}/> Lista de compras</button>
        <button type="button" className="footer-new" onClick={newRecipe}><Plus size={16}/> Nova receita</button>
      </nav>
      <figure className="footer-saying"><span className="footer-label">Ditado do dia</span><blockquote>“{sayings[dayOfYear % sayings.length]}”</blockquote></figure>
    </div>
    <div className="footer-base">
      <span>© {now.getFullYear()} Rancho da Cozinha · receitas da casa desde sempre</span>
      <span>Design e experiência por <a href="https://www.jessbranding.com.br" target="_blank" rel="noreferrer">Jess Branding</a></span>
    </div>
  </footer>
}
