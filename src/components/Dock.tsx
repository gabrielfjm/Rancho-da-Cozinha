import { motion } from 'framer-motion'
import { paper } from '../lib/motion'

type DockTarget = 'home' | 'notebook' | 'pantry' | 'shopping'

// Ícones da casa em traço de caneta: celeiro, caderno com fita, pote de conserva e cesta de feira.
const icons: Record<DockTarget, React.ReactNode> = {
  home: <><path d="M3.5 20.5V10.2L12 4l8.5 6.2v10.3"/><path d="M2 11.3 12 4l10 7.3"/><path d="M9 20.5v-6h6v6M9 14.5l6 6M15 14.5l-6 6"/><path d="M10.5 9.5h3"/></>,
  notebook: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5Z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5"/><path d="M14 3v7l-1.8-1.4L10.4 10V3"/></>,
  pantry: <><path d="M8 2.8h8v3.4H8z"/><path d="M7.2 6.2h9.6l1.4 3v10.3a2.2 2.2 0 0 1-2.2 2.2H8a2.2 2.2 0 0 1-2.2-2.2V9.2Z"/><path d="M8.8 12.5h6.4v4.6H8.8z"/></>,
  shopping: <><path d="M3.5 10.5h17l-2 9.5a1.6 1.6 0 0 1-1.6 1.3H7.1A1.6 1.6 0 0 1 5.5 20Z"/><path d="M8 10.5 12 4l4 6.5"/><path d="M9 13.5v5M12 13.5v5M15 13.5v5"/></>
}
const items: [DockTarget, string][] = [['home', 'Início'], ['notebook', 'Caderno'], ['pantry', 'Despensa'], ['shopping', 'Compras']]

/** Barra de navegação do celular: tira de couro com costura, aba ativa deslizando e botão central de nova receita. */
export function Dock({ active, navigate, newRecipe }: { active?: DockTarget; navigate: (target: DockTarget) => void; newRecipe: () => void }) {
  const button = ([target, label]: [DockTarget, string]) => {
    const on = active === target
    return <motion.button key={target} type="button" className={`dock-item${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => navigate(target)} whileTap={{ scale: 0.88 }}>
      {on && <motion.span layoutId="dock-ink" className="dock-ink" transition={paper}/>}
      <motion.svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" animate={{ y: on ? -2 : 0, scale: on ? 1.08 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>{icons[target]}</motion.svg>
      <span>{label}</span>
    </motion.button>
  }
  return <motion.nav className="dock" aria-label="Navegação principal" initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '110%' }} transition={paper}>
    {items.slice(0, 2).map(button)}
    <motion.button type="button" className="dock-new" aria-label="Nova receita" onClick={newRecipe} whileTap={{ scale: 0.9, rotate: -8 }}>
      <span className="dock-new-badge"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></span>
      <span>Nova</span>
    </motion.button>
    {items.slice(2).map(button)}
  </motion.nav>
}
