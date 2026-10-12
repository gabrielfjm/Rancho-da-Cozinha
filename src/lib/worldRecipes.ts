import type { Recipe, RecipeIngredient } from '../types'

type RawRecipe = {
  id: string; title: string; category: string; area: string; tags: string[];
  image: string; ingredients: [string, string][]; steps: string[]
}

const categories: Record<string, string> = {
  Beef: 'Carnes', Chicken: 'Aves', Dessert: 'Doces', Goat: 'Carnes', Lamb: 'Carnes',
  Miscellaneous: 'Outros pratos', Pasta: 'Massas', Pork: 'Carnes', Seafood: 'Frutos do mar',
  Side: 'Acompanhamentos', Starter: 'Entradas', Vegan: 'Veganas', Vegetarian: 'Vegetarianas',
  Breakfast: 'Café da manhã', Key: 'Outros pratos'
}

const units: [RegExp, string, number?][] = [
  [/^(?:kilograms?|kgs?)(?:\b|$)/i, 'kg', 1000],
  [/^(?:grams?|grms?|g)(?:\b|$)/i, 'g', 1],
  [/^(?:millilit(?:er|re)s?|ml)(?:\b|$)/i, 'ml', 1],
  [/^(?:lit(?:er|re)s?|l)(?:\b|$)/i, 'l', 1000],
  [/^(?:cups?)(?:\b|$)/i, 'xícara'],
  [/^(?:tablespoons?|table spoons?|tbsp?s?)(?:\b|$)/i, 'colher de sopa'],
  [/^(?:teaspoons?|tea spoons?|tsp?s?)(?:\b|$)/i, 'colher de chá'],
  [/^(?:cloves?)(?:\b|$)/i, 'dente'],
  [/^(?:slices?)(?:\b|$)/i, 'fatia'],
  [/^(?:cans?|tins?)(?:\b|$)/i, 'lata'],
  [/^(?:ounces?|oz)(?:\b|$)/i, 'oz', 28.35],
  [/^(?:pounds?|lbs?)(?:\b|$)/i, 'lb', 453.592]
]

function quantity(raw: string): { amount: number | null; unit: string; note: string; gramsPerUnit: Record<string, number> } {
  const clean = raw.trim().replace(/½/g, ' 1/2').replace(/¼/g, ' 1/4').replace(/¾/g, ' 3/4')
    .replace(/⅓/g, ' 1/3').replace(/⅔/g, ' 2/3').replace(/⅛/g, ' 1/8').replace(/⅜/g, ' 3/8')
  const match = clean.match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)(?:\s+(\d+\/\d+))?\s*(.*)$/)
  if (!match) return { amount: null, unit: 'unidade', note: raw || 'a gosto', gramsPerUnit: {} }
  const number = (text: string) => text.includes('/') ? Number(text.split('/')[0]) / Number(text.split('/')[1]) : Number(text.replace(',', '.'))
  const amount = number(match[1]) + (match[2] ? number(match[2]) : 0)
  if (!Number.isFinite(amount) || amount <= 0) return { amount: null, unit: 'unidade', note: raw, gramsPerUnit: {} }
  const rest = match[3].trim()
  for (const [pattern, unit, grams] of units) {
    const found = rest.match(pattern)
    if (found) return { amount, unit, note: rest.slice(found[0].length).trim(), gramsPerUnit: grams ? { [unit]: grams } : {} }
  }
  if (!rest) return { amount, unit: 'unidade', note: '', gramsPerUnit: {} }
  if (/^(?:large|medium|small)\b/i.test(rest)) return { amount, unit: 'unidade', note: rest, gramsPerUnit: {} }
  return { amount, unit: rest, note: '', gramsPerUnit: {} }
}

function adapt(raw: RawRecipe): Recipe {
  const category = categories[raw.category] ?? raw.category
  const sourceUrl = `https://www.themealdb.com/meal/${raw.id}`
  const ingredients: RecipeIngredient[] = raw.ingredients.map(([name, measure], index) => ({
    id: `world-${raw.id}-ingredient-${index}`,
    ingredientId: `world-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
    name, category: 'Outros', group: '', ...quantity(measure)
  }))
  return {
    id: `world-${raw.id}`, title: raw.title, description: `${category}${raw.area ? ` · ${raw.area}` : ''}`,
    story: 'Receita do acervo TheMealDB. O preparo está no idioma original (inglês).',
    source: 'TheMealDB', sourceUrl, originalLanguage: 'en',
    category, tags: [...new Set([raw.area || 'Outros países', raw.category, ...raw.tags].filter(Boolean))],
    prepMinutes: 0, cookMinutes: 0, servings: 1, servingsKnown: false,
    difficulty: 1, difficultyKnown: false, ingredients,
    steps: raw.steps.map((text, index) => ({ id: `world-${raw.id}-step-${index}`, text })),
    utensils: [], tips: '', rating: 0, favorite: false, cover: raw.image || undefined,
    gallery: [], draft: false, createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z'
  }
}

let catalog: Promise<Recipe[]> | undefined
export function loadWorldRecipes(): Promise<Recipe[]> {
  catalog ??= import('../data/worldRecipes.json')
    .then(module => (module.default.recipes as RawRecipe[]).map(adapt))
    .catch(error => { catalog = undefined; throw error })
  return catalog
}
