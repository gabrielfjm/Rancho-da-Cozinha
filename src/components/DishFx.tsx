import type { Recipe } from '../types'
import { normalize } from '../lib/format'

/**
 * Cada prato se mexe do seu jeito: feijoada fumega, moqueca borbulha, acarajé chia no dendê,
 * brigadeiro ganha granulado, bolo recebe calda, quindim balança, milho solta fumaça de brasa
 * e salada transpira de gelada.
 */
export type DishMotion = 'steam' | 'simmer' | 'smoke' | 'sizzle' | 'sprinkle' | 'drizzle' | 'jiggle' | 'chill' | 'rise'

const byId: Record<string, DishMotion> = {
  'rancho-feijoada': 'steam', 'rancho-moqueca': 'simmer', 'rancho-acaraje': 'sizzle', 'rancho-pao-queijo': 'rise',
  'rancho-bolo-cenoura': 'drizzle', 'rancho-brigadeiro': 'sprinkle', 'rancho-quindim': 'jiggle', 'rancho-milho': 'smoke', 'rancho-salada-palmito': 'chill'
}
const rules: [RegExp, DishMotion][] = [
  [/churrasc|grelhad|bbq|brasa|defumad|costela|espetinho/, 'smoke'],
  [/frit|pastel|coxinha|acaraj|bolinho|empanad|tempura|torresmo/, 'sizzle'],
  [/pudim|quindim|flan|gelatina|manjar|panna cotta/, 'jiggle'],
  [/brigadeiro|granulad|beijinho|trufa|confeit/, 'sprinkle'],
  [/bolo|calda|cobertura|brownie/, 'drizzle'],
  [/salada|suco|gelad|limonada|sorvete|vitamina|ceviche/, 'chill'],
  [/\bpao\b|paes|biscoit|broa|rosca|brioche|focaccia/, 'rise'],
  [/moqueca|chili|ensopad|cozid|caldo|sopa|guisad|curry|ragu|molho/, 'simmer']
]
const byCategory: Record<string, DishMotion> = {
  'Churrasco/BBQ': 'smoke', Doces: 'drizzle', Bebidas: 'chill', 'Pães': 'rise', Sopas: 'simmer', 'Molhos e Temperos': 'simmer',
  Carnes: 'steam', Tortas: 'steam', 'Café da manhã': 'steam', 'Pratos brasileiros': 'steam'
}

export function dishMotion(recipe: Pick<Recipe, 'id' | 'title' | 'tags' | 'category'>): DishMotion | undefined {
  if (byId[recipe.id]) return byId[recipe.id]
  const text = normalize(`${recipe.title} ${recipe.tags.join(' ')}`)
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? byCategory[recipe.category]
}

/** Classe para o contêiner da foto (o balanço do quindim e o crescer do pão mexem na própria imagem). */
export function fxClass(kind?: DishMotion) { return kind ? `fx-host fx-${kind}` : 'fx-host' }

const wisps = (n: number) => Array.from({ length: n }, (_, i) => <i key={i} className="wisp"><svg viewBox="0 0 20 64" preserveAspectRatio="none"><path d="M10 62c-7-9 7-15 0-24s7-15 0-24 3-9 2-12"/></svg></i>)
const dots = (n: number, className: string) => Array.from({ length: n }, (_, i) => <b key={i} className={className}/>)

const parts: Record<DishMotion, () => React.ReactNode> = {
  steam: () => wisps(3),
  simmer: () => <>{wisps(2)}{dots(6, 'bubble')}</>,
  smoke: () => dots(5, 'puff'),
  sizzle: () => dots(9, 'spatter'),
  sprinkle: () => dots(12, 'jimmy'),
  drizzle: () => dots(4, 'drip'),
  jiggle: () => null,
  chill: () => dots(7, 'dew'),
  rise: () => wisps(2)
}

export function DishFx({ kind, mode = 'hover' }: { kind?: DishMotion; mode?: 'hover' | 'always' }) {
  if (!kind || kind === 'jiggle') return null
  return <span className={`dish-fx fx-layer-${kind} ${mode}`} aria-hidden="true">{parts[kind]()}</span>
}
