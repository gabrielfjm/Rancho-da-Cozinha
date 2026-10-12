import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Apple, Coffee, CookingPot, Croissant, Moon, UtensilsCrossed } from 'lucide-react'
import { meals, type Meal } from '../lib/moment'
import { paper } from '../lib/motion'

const icons: Record<Meal, typeof Coffee> = { cafe: Coffee, 'lanche-manha': Apple, almoco: UtensilsCrossed, 'lanche-tarde': Croissant, jantar: CookingPot, madrugada: Moon }
const clock = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, '0') : ''}`

/** Divisórias do fichário, uma por refeição; a de agora ganha o bilhete "agora". */
export function MealTabs({ value, current, onChange }: { value: Meal; current: Meal; onChange: (meal: Meal) => void }) {
  const strip = useRef<HTMLDivElement>(null)
  // No celular as abas rolam de lado: mantém a escolhida à vista.
  useEffect(() => {
    const tab = strip.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (tab && strip.current) strip.current.scrollTo({ left: tab.offsetLeft - (strip.current.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' })
  }, [value])
  return <div className="meal-tabs" role="tablist" aria-label="Refeições do dia" ref={strip}>
    {meals.map((meal, index) => {
      const Icon = icons[meal.id]
      const until = meals[(index + 1) % meals.length].from
      return <button key={meal.id} type="button" role="tab" aria-selected={meal.id === value} className={meal.id === value ? 'active' : ''} onClick={() => onChange(meal.id)} title={`${clock(meal.from)} às ${clock(until)}`}>
        {meal.id === value && <motion.span layoutId="meal-tab-ink" className="meal-tab-ink" transition={paper}/>}
        <Icon size={17}/><span>{meal.label}</span>
        {meal.id === current && <small>agora</small>}
      </button>
    })}
  </div>
}
