import { Clock3, Heart, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Recipe } from '../types'
import { RanchMark } from './Artwork'
import { useEffect, useState } from 'react'
import { photoUrl } from '../lib/store'

export function RecipeCard({ recipe, index, onOpen }: { recipe: Recipe; index: number; onOpen: () => void }) {
  const [photo, setPhoto] = useState<string>()
  useEffect(() => { void photoUrl(recipe.cover).then(setPhoto) }, [recipe.cover])
  return <motion.button type="button" className="recipe-card" style={{ '--tilt': `${[-1.2, 0.8, -0.5, 1.1][index % 4]}deg` } as React.CSSProperties} whileHover={{ y: -5, rotate: 0 }} onClick={onOpen} aria-label={`Abrir receita ${recipe.title}`}>
    <div className="card-stripe" />
    <div className="card-picture">{photo ? <img src={photo} alt="" /> : <div className="card-placeholder"><RanchMark size={78}/><span>Da cozinha do rancho</span></div>}</div>
    <div className="card-body">
      <span className="eyebrow">{recipe.category} · {recipe.draft ? 'Rascunho' : 'Ficha da casa'}</span>
      <h3>{recipe.title}</h3>
      <p>{recipe.description || 'Uma receita para guardar e fazer de novo.'}</p>
      <div className="card-foot"><span><Clock3 size={15}/>{recipe.prepMinutes + recipe.cookMinutes} min</span><span><Star size={15} fill="currentColor"/>{recipe.rating || '—'}</span>{recipe.favorite && <Heart size={16} fill="currentColor" aria-label="Favorita"/>}</div>
    </div>
  </motion.button>
}
