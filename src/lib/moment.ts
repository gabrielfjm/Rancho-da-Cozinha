import type { BrazilianRecipe } from '../data/brazilianRecipes'
import { ranchReviews } from '../data/ranchReviews'
import type { Recipe } from '../types'
import type { WeatherContext } from './weather'

export type Climate = 'frio' | 'ameno' | 'quente'
export type Meal = 'cafe' | 'lanche-manha' | 'almoco' | 'lanche-tarde' | 'jantar' | 'madrugada'
export type Moment = { meal: Meal; partLabel: string; dayLabel: string; weekend: boolean; climate?: Climate; rainy: boolean; temperature?: number; region?: string; countryCode?: string }

/** As refeições do dia, na ordem do relógio. `from` é o minuto do dia em que cada uma começa. */
export const meals: { id: Meal; label: string; from: number; time: string; of: string; for: string; reason: string }[] = [
  { id: 'cafe', label: 'Café da manhã', from: 5 * 60, time: 'manhã', of: 'do café da manhã', for: 'para o café da manhã', reason: 'Pro café da manhã' },
  { id: 'lanche-manha', label: 'Lanche da manhã', from: 9 * 60 + 30, time: 'meio da manhã', of: 'do lanche da manhã', for: 'para o lanche da manhã', reason: 'Pro lanche da manhã' },
  { id: 'almoco', label: 'Almoço', from: 11 * 60 + 30, time: 'hora do almoço', of: 'do almoço', for: 'para o almoço', reason: 'Pro almoço de hoje' },
  { id: 'lanche-tarde', label: 'Lanche da tarde', from: 15 * 60, time: 'tarde', of: 'do lanche da tarde', for: 'para o lanche da tarde', reason: 'Pro lanche da tarde' },
  { id: 'jantar', label: 'Janta', from: 18 * 60 + 30, time: 'noite', of: 'da janta', for: 'para a janta', reason: 'Pra janta de hoje' },
  { id: 'madrugada', label: 'Lanche da madrugada', from: 23 * 60, time: 'madrugada', of: 'do lanche da madrugada', for: 'para a madrugada', reason: 'Pra fome da madrugada' }
]
export const mealInfo = (meal: Meal) => meals.find(item => item.id === meal)!

export function mealAt(date: Date): Meal {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return [...meals].reverse().find(item => minutes >= item.from)?.id ?? 'madrugada'
}

const brazilianRegions: Record<string, string> = {
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul'
}
const brazilianStates: Record<string, string> = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF',
  'espirito santo': 'ES', goias: 'GO', maranhao: 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', para: 'PA', paraiba: 'PB', parana: 'PR', pernambuco: 'PE', piaui: 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS', rondonia: 'RO', roraima: 'RR',
  'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO'
}
// Sem localização, o fuso do aparelho já entrega a região quando ele é exclusivo dela.
// America/Sao_Paulo cobre Sul, Sudeste, Goiás e DF, então só diz que é Brasil.
const timeZoneRegions: Record<string, string | undefined> = {
  'America/Manaus': 'Norte', 'America/Belem': 'Norte', 'America/Santarem': 'Norte', 'America/Porto_Velho': 'Norte',
  'America/Rio_Branco': 'Norte', 'America/Eirunepe': 'Norte', 'America/Boa_Vista': 'Norte', 'America/Araguaina': 'Norte',
  'America/Fortaleza': 'Nordeste', 'America/Recife': 'Nordeste', 'America/Maceio': 'Nordeste', 'America/Bahia': 'Nordeste', 'America/Noronha': 'Nordeste',
  'America/Cuiaba': 'Centro-Oeste', 'America/Campo_Grande': 'Centro-Oeste', 'America/Sao_Paulo': undefined
}
const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function brazilianRegion(weather: WeatherContext | undefined): string | undefined {
  if (weather?.countryCode?.toUpperCase() !== 'BR') return undefined
  const code = weather.regionCode?.toUpperCase().split('-').at(-1) || brazilianStates[plain(weather.region || '')]
  return code ? brazilianRegions[code] : undefined
}

function placeFromTimeZone(): { region?: string; countryCode?: string } {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return zone in timeZoneRegions ? { region: timeZoneRegions[zone], countryCode: 'BR' } : {}
}

const isRain = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95

/** Refeição, dia da semana, clima e região de agora, num só lugar. */
export function currentMoment(weather: WeatherContext | undefined, now: Date): Moment {
  const meal = mealAt(now)
  const feels = weather ? Math.round(weather.apparentTemperature ?? weather.temperature) : undefined
  const climate: Climate | undefined = feels === undefined ? undefined : feels < 19 ? 'frio' : feels > 27 ? 'quente' : 'ameno'
  const day = now.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
  const place = weather ? { region: brazilianRegion(weather), countryCode: weather.countryCode?.toUpperCase() } : placeFromTimeZone()
  return { meal, partLabel: mealInfo(meal).time, dayLabel: day.charAt(0).toUpperCase() + day.slice(1), weekend: [0, 6].includes(now.getDay()), climate, rainy: weather ? isRain(weather.weatherCode) : false, temperature: weather ? Math.round(weather.temperature) : undefined, ...place }
}

/** Que tipo de comida a receita é. Uma receita pode ser mais de um (pão de queijo é padaria e salgado). */
type Kind = 'breakfast' | 'bakery' | 'fruit' | 'snack' | 'sweet' | 'light' | 'side' | 'soup' | 'main'
type Traits = { kinds: Kind[]; quick: boolean; heavy: boolean; words: string }

const soupWords = /\b(sopas?|caldos?|canja|chowder|gazpacho|ajo blanco|borscht|consome|creme de (abobora|mandioquinha|ervilha|legumes|tomate|cogumelos?))\b/
const sweetWords = /\b(bolos?|doces?|sobremesas?|pudins?|pudim|tartes?|tortas? de (maca|morango|limao|abobora|acucar|nozes|pera|frutas)|chocolate|biscoitos?|cookies?|brigadeiros?|quindim|cheesecakes?|mousse|sorvetes?|fudge|caramelo|flan|brulee|churros|rosquinhas?|donuts?|alfajores?|baklava|crumble|brownies?|cupcakes?|geleia|manjar|paves?)\b/
const breakfastWords = /\b(cafe da manha|panquecas?|waffles?|omeletes?|ovos|torradas?|mingau|porridge|crepes?|granola|tapioca|cuscuz|shakshu?ka|chakchouka|poffertjes|torrijas|brunch|benedict|semola|aveia|kedgeree)\b/
const bakeryWords = /\b(pao|paes|paezinhos|bolos?|muffins?|scones?|rosquinhas?|donuts?|biscoitos?|cookies?|broas?|brioche|challah|croissants?|waffles?|panquecas?|cupcakes?|rocambole|ensaimada|timbits|churros|focaccia|bolinhos de (chuva|canela|framboesa|natal|pedra|banana))\b/
const fruitWords = /^(frutas?|smoothie|vitamina|iogurte|acai|granola|salada de frutas)\b|\bsmoothie\b/
const snackWords = /\b(sanduiches?|lanches?|torradas?|bruschetta|tostex|misto quente|hamburguer|burgers?|cachorro|hot dog|wraps?|tacos?|quesadillas?|pizzas?|pasteis|pastel|coxinhas?|empadas?|empanadas?|esfihas?|acaraje|pao de queijo|arepas?|hummus|baba ghanoush|tapioca|pipoca|batatas? fritas|nachos|bolinhos fritos|rolos de ovo|rolinhos?|samosas?|burek|borek|banh mi|kumpir|paus de queijo|bolani|milho grelhado|milho na espiga|petiscos?|amendoins?|guacamole|choripan|roti john|pao com tomate|pao de tomate|almojabanas|poutine|tortilla)\b/
const lightWords = /\b(saladas?|gelad[oa]|ceviche|leve|palmito|pepino|carpaccio)\b/
const heavyWords = /\b(feijoada|ensopado|guisado|cozido|stew|assad[oa]|costelas?|cordeiro|pernil|lasanha|cassoulet|osso buco|confit|wellington|rosbife|lombo|curry|caril|moqueca|rabada|dobradinha|torta de carne)\b/
const proteinCategories = ['Carnes', 'Aves', 'Frutos do mar', 'Massas']
const mainCategories = [...proteinCategories, 'Pratos brasileiros', 'Outros pratos', 'Vegetarianas', 'Veganas']

const traitCache = new Map<string, Traits>()
function traits(recipe: Recipe): Traits {
  const cached = traitCache.get(recipe.id)
  if (cached) return cached
  const title = plain(recipe.title)
  const words = plain(`${recipe.title} ${recipe.category} ${recipe.tags.join(' ')}`)
  const kinds: Kind[] = []
  const soup = soupWords.test(title) || recipe.category === 'Sopas'
  const sweet = !soup && (recipe.category === 'Doces' || sweetWords.test(title))
  if (soup) kinds.push('soup')
  if (sweet) kinds.push('sweet')
  // "Frango com cuscuz" é almoço: palavra de café só conta fora das categorias de carne e massa.
  if (!soup && (recipe.category === 'Café da manhã' || (breakfastWords.test(title) && !lightWords.test(title) && !proteinCategories.includes(recipe.category)))) kinds.push('breakfast')
  if (!soup && (recipe.category === 'Pães' || bakeryWords.test(title))) kinds.push('bakery')
  if (fruitWords.test(title)) kinds.push('fruit')
  if (!soup && !sweet && snackWords.test(title)) kinds.push('snack')
  if (!sweet && lightWords.test(title)) kinds.push('light')
  if (!kinds.length) kinds.push(recipe.category === 'Acompanhamentos' ? 'side' : 'main')
  else if (!sweet && mainCategories.includes(recipe.category) && !kinds.some(kind => ['breakfast', 'bakery', 'snack', 'fruit'].includes(kind))) kinds.push('main')
  // Acervo do mundo não informa o tempo: receita curta e com poucos ingredientes conta como rápida.
  const minutes = recipe.prepMinutes + recipe.cookMinutes
  const quick = minutes > 0 ? minutes <= 30 : recipe.steps.reduce((sum, step) => sum + step.text.length, 0) < 700 && recipe.ingredients.length <= 9
  const heavy = heavyWords.test(title) || minutes >= 90
  const value = { kinds, quick, heavy, words }
  traitCache.set(recipe.id, value)
  return value
}

// Quanto cada tipo de comida combina com cada refeição. Negativo grande = fora de questão
// (prato de peixe às quatro da manhã, bolo no almoço), e clima ou região não salvam.
const mealTable: Record<Meal, Partial<Record<Kind, number>>> = {
  cafe: { breakfast: 9, bakery: 7, fruit: 6, snack: 2, sweet: 0, light: -4, side: -8, soup: -10, main: -12 },
  'lanche-manha': { fruit: 8, bakery: 7, snack: 6, breakfast: 5, sweet: 3, light: 1, side: -4, soup: -8, main: -12 },
  almoco: { main: 9, soup: 5, light: 4, side: 2, snack: -6, fruit: -6, breakfast: -10, bakery: -10, sweet: -12 },
  'lanche-tarde': { bakery: 9, snack: 8, sweet: 7, fruit: 5, breakfast: 4, light: 0, side: -3, soup: -6, main: -12 },
  jantar: { main: 8, soup: 8, light: 4, snack: 3, side: 1, fruit: -6, breakfast: -6, bakery: -8, sweet: -12 },
  madrugada: { snack: 7, breakfast: 5, sweet: 4, soup: 3, fruit: 3, bakery: 3, light: 1, side: -2, main: -10 }
}

function mealScore({ kinds, quick, heavy }: Traits, meal: Meal) {
  let score = Math.max(...kinds.map(kind => mealTable[meal][kind] ?? -12))
  if (meal === 'madrugada') score += (quick ? 3 : -3) + (heavy ? -8 : 0)
  else if (meal !== 'almoco' && meal !== 'jantar' && heavy) score -= 4
  return score
}

export type Recommendation = { recipe: Recipe; fit: number; reason: string }

/** Usa todo o acervo: a refeição decide o que entra; clima, região e dia só reordenam. */
export function rankRecommendations(recipes: Recipe[], moment: Moment, now: Date): Recommendation[] {
  const meal = mealInfo(moment.meal)
  const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${moment.meal}`
  return recipes.map(recipe => {
    const info = traits(recipe)
    const has = (kind: Kind) => info.kinds.includes(kind)
    const review = ranchReviews[recipe.id]
    // A cozinha de teste já disse em que refeição a receita do Rancho vai bem.
    let fit = review ? (review.moments.includes(moment.meal) ? 9 : -10) + review.score * 0.3 : mealScore(info, moment.meal)
    const mealFit = fit >= 5

    const regional = recipe.id.startsWith('rancho-') && moment.region && 'regions' in recipe &&
      Array.isArray(recipe.regions) && recipe.regions.includes(moment.region)
    const national = moment.countryCode && recipe.originCountryCode === moment.countryCode
    if (mealFit) {
      if (regional) fit += 4
      else if (national) fit += 3
      if (moment.climate === 'frio') fit += has('soup') ? 3 : info.heavy ? 1 : has('light') ? -2 : has('fruit') ? -1 : 0
      if (moment.climate === 'quente') fit += has('light') ? 2 : has('fruit') ? 2 : has('soup') ? -3 : info.heavy ? -2 : 0
      if (moment.rainy) fit += has('soup') ? 2 : has('bakery') && (moment.meal === 'cafe' || moment.meal === 'lanche-tarde') ? 1.5 : 0
      if (moment.weekend && (review?.weekend || /churrasco|assado|festa|bolo/.test(info.words))) fit += 0.7
    }

    // Sorteio estável por refeição: receitas equivalentes se revezam sem pular a cada render.
    let hash = 2166136261
    for (const char of `${day}-${recipe.id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    fit += ((hash >>> 0) % 200) / 100

    const reason = !mealFit ? 'Ideia do acervo para hoje'
      : regional ? `Combina com sua região ${moment.region}` : national ? 'Da cozinha do seu país'
        : moment.rainy && has('soup') ? 'Boa pedida para a chuva'
          : moment.climate === 'frio' && has('soup') ? 'Para aquecer no frio'
            : moment.climate === 'quente' && (has('light') || has('fruit')) ? 'Leve para o calor'
              : moment.meal === 'madrugada' && info.quick ? 'Rápido pra fome da madrugada'
                : meal.reason
    return { recipe, fit, reason }
  }).sort((a, b) => b.fit - a.fit || a.recipe.id.localeCompare(b.recipe.id))
}

const climateReasons: Record<Climate, string> = { frio: 'Esquenta o dia frio', ameno: 'Vai bem com o tempo ameno', quente: 'Combina com o calor' }

export type Pick = { recipe: BrazilianRecipe; fit: number; reason?: string }
/** Ordena a base do Rancho pelo que combina com agora; a nota da cozinha de teste desempata. */
export function rankForMoment(recipes: BrazilianRecipe[], moment: Moment, now: Date): Pick[] {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return recipes.flatMap((recipe, index) => {
    const review = ranchReviews[recipe.id]
    if (!review) return []
    const reasons: string[] = []
    let fit = review.score * 0.4 + ((dayOfYear + index * 7) % 5) * 0.06
    if (review.moments.includes(moment.meal)) { fit += 5; reasons.push(mealInfo(moment.meal).reason) }
    if (moment.rainy && review.rainy) { fit += 2; reasons.push('Combina com chuva') }
    if (moment.climate && recipe.climate === moment.climate) { fit += 2.5; reasons.push(climateReasons[moment.climate]) }
    else if (moment.climate && (recipe.climate === 'ameno' || moment.climate === 'ameno')) fit += 0.8
    else if (moment.climate) fit -= 2.5 // feijoada no calorão ou salada gelada no frio ficam para depois
    if (moment.region && recipe.regions.includes(moment.region)) fit += 1
    if (moment.weekend && review.weekend) { fit += 1.2; reasons.push('Cara de fim de semana') }
    return [{ recipe, fit, reason: reasons[0] }]
  }).sort((a, b) => b.fit - a.fit)
}

export function momentSentence(moment: Moment) {
  const parts = [`${moment.dayLabel}, ${moment.partLabel}`]
  if (moment.temperature !== undefined) parts.push(`${moment.temperature} °C`)
  return `${parts.join(', ')}${moment.rainy ? ' e chuva' : ''}`
}
