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

const origins: Record<string, [string, string]> = {
  Algerian: ['Argélia', 'DZ'], Argentina: ['Argentina', 'AR'], Australian: ['Austrália', 'AU'], British: ['Reino Unido', 'GB'],
  Canadian: ['Canadá', 'CA'], Chinese: ['China', 'CN'], Croatian: ['Croácia', 'HR'], Egyptian: ['Egito', 'EG'],
  Filipino: ['Filipinas', 'PH'], France: ['França', 'FR'], Greek: ['Grécia', 'GR'], India: ['Índia', 'IN'],
  Irish: ['Irlanda', 'IE'], Italian: ['Itália', 'IT'], Jamaican: ['Jamaica', 'JM'], Japanese: ['Japão', 'JP'],
  Kenyan: ['Quênia', 'KE'], Malaysian: ['Malásia', 'MY'], Mexican: ['México', 'MX'], Moroccan: ['Marrocos', 'MA'],
  Netherlands: ['Países Baixos', 'NL'], Norway: ['Noruega', 'NO'], Polish: ['Polônia', 'PL'],
  Portuguese: ['Portugal', 'PT'], Russian: ['Rússia', 'RU'], 'Saudi Arabian': ['Arábia Saudita', 'SA'],
  Slovakia: ['Eslováquia', 'SK'], Spanish: ['Espanha', 'ES'], Syrian: ['Síria', 'SY'], Thai: ['Tailândia', 'TH'],
  Tunisian: ['Tunísia', 'TN'], Turkish: ['Turquia', 'TR'], Ukrainian: ['Ucrânia', 'UA'],
  'United States': ['Estados Unidos', 'US'], Uruguayan: ['Uruguai', 'UY'], Venezuela: ['Venezuela', 'VE'],
  Vietnamese: ['Vietnã', 'VN']
}

const units: [RegExp, string, number?][] = [
  [/^(?:quilogramas?|quilos?|kg)(?=\s|$|[,.])/i, 'kg', 1000],
  [/^(?:gramas?|g)(?=\s|$|[,.])/i, 'g', 1],
  [/^(?:mililitros?|ml)(?=\s|$|[,.])/i, 'ml', 1],
  [/^(?:litros?|l)(?=\s|$|[,.])/i, 'l', 1000],
  [/^(?:xícaras?|chávenas?)(?=\s|$|[,.])/i, 'xícara'],
  [/^(?:colher(?:es)? de sopa)(?=\s|$|[,.])/i, 'colher de sopa'],
  [/^(?:colher(?:es)? de chá)(?=\s|$|[,.])/i, 'colher de chá'],
  [/^(?:colher(?:es)?)(?=\s|$|[,.])/i, 'colher'],
  [/^(?:dentes?)(?=\s|$|[,.])/i, 'dente'],
  [/^(?:fatias?)(?=\s|$|[,.])/i, 'fatia'],
  [/^(?:latas?)(?=\s|$|[,.])/i, 'lata'],
  [/^(?:pacotes?|sachês?)(?=\s|$|[,.])/i, 'pacote'],
  [/^(?:punhados?)(?=\s|$|[,.])/i, 'punhado'],
  [/^(?:ramos?)(?=\s|$|[,.])/i, 'ramo'],
  [/^(?:libras?)(?=\s|$|[,.])/i, 'lb', 453.592],
  [/^(?:onças?)(?=\s|$|[,.])/i, 'oz', 28.35],
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
  const clean = raw.trim().replace(/\.$/, '').replace(/⁄/g, '/').replace(/½/g, ' 1/2').replace(/¼/g, ' 1/4').replace(/¾/g, ' 3/4')
    .replace(/⅓/g, ' 1/3').replace(/⅔/g, ' 2/3').replace(/⅛/g, ' 1/8').replace(/⅜/g, ' 3/8').trim()
  const match = clean.match(/^(\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s+(\d+\/\d+))?\s*(.*)$/)
  if (!match) return { amount: null, unit: 'unidade', note: clean || 'a gosto', gramsPerUnit: {} }
  const number = (text: string) => text.includes('/') ? Number(text.split('/')[0]) / Number(text.split('/')[1]) : Number(text.replace(',', '.'))
  const amount = number(match[1]) + (match[2] ? number(match[2]) : 0)
  if (!Number.isFinite(amount) || amount <= 0) return { amount: null, unit: 'unidade', note: raw, gramsPerUnit: {} }
  const rest = match[3].trim()
  for (const [pattern, unit, grams] of units) {
    const found = rest.match(pattern)
    if (found) return { amount, unit, note: rest.slice(found[0].length).trim(), gramsPerUnit: grams ? { [unit]: grams } : {} }
  }
  if (!rest) return { amount, unit: 'unidade', note: '', gramsPerUnit: {} }
  return { amount, unit: 'unidade', note: rest, gramsPerUnit: {} }
}

function adapt(raw: RawRecipe): Recipe {
  const category = categories[raw.category] ?? raw.category
  const [origin, originCountryCode] = origins[raw.area] ?? ['Outros países', '']
  const sourceUrl = `https://www.themealdb.com/meal/${raw.id}`
  const ingredients: RecipeIngredient[] = raw.ingredients.map(([name, measure], index) => ({
    id: `world-${raw.id}-ingredient-${index}`,
    ingredientId: `world-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
    name, category: 'Outros', group: '', ...quantity(measure)
  }))
  return {
    id: `world-${raw.id}`, title: raw.title, description: `${category}${raw.area ? ` · ${origin}` : ''}`,
    story: 'Receita do acervo TheMealDB, traduzida automaticamente para português brasileiro.',
    source: 'TheMealDB', sourceUrl, originalLanguage: 'en', originCountryCode,
    category, tags: [...new Set([origin, category, ...raw.tags].filter(Boolean))],
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
