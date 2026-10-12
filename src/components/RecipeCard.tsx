import { Clock3, Flame, Heart, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Recipe } from '../types'
import { RanchMark } from './Artwork'
import { calorieLabel } from '../lib/nutrition'
import { dealt } from '../lib/motion'
import { Photo } from './Photo'
import { DishFx, dishMotion, fxClass } from './DishFx'

export function RecipeCard({ recipe, index, onOpen }: { recipe: Recipe; index: number; onOpen: () => void }) {
  const fx = dishMotion(recipe)
  return <motion.button type="button" className="recipe-card" custom={index} variants={dealt} initial="hidden" animate="shown" whileHover={{ y: -6, rotate: index % 2 ? 0.8 : -0.8 }} whileTap={{ scale: 0.985 }} onClick={onOpen} aria-label={`Abrir receita ${recipe.title}`}>
    <div className="card-stripe" />
    {recipe.draft && <span className="tape-label">Rascunho</span>}
    <div className={`card-picture ${fxClass(fx)}`}>
      <Photo value={recipe.cover} alt="" fallback={<div className="card-placeholder"><RanchMark size={78}/><span>Da cozinha do rancho</span></div>}/>
      <DishFx kind={fx}/>
    </div>
    <div className="card-body">
      <span className="eyebrow">{recipe.category} · {recipe.draft ? 'Rascunho' : 'Ficha da casa'}</span>
      <h3>{recipe.title || 'Receita sem nome'}</h3>
      <p>{recipe.description || 'Uma receita para guardar e fazer de novo.'}</p>
      <div className="card-foot"><span><Clock3 size={15}/>{recipe.prepMinutes + recipe.cookMinutes ? `${recipe.prepMinutes + recipe.cookMinutes} min` : 'Tempo variável'}</span><span><Flame size={15}/>{calorieLabel(recipe)}</span><span><Star size={15} fill="currentColor"/>{recipe.rating || '—'}</span>{recipe.favorite && <Heart size={16} fill="currentColor" aria-label="Favorita"/>}</div>
    </div>
  </motion.button>
}
