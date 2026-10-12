import type { BrazilianRecipe } from '../data/brazilianRecipes'
import { ranchReviews, type DayPart } from '../data/ranchReviews'
import type { Recipe } from '../types'
import type { WeatherContext } from './weather'

export type Climate = 'frio' | 'ameno' | 'quente'
export type Moment = { part: DayPart; partLabel: string; dayLabel: string; weekend: boolean; climate?: Climate; rainy: boolean; temperature?: number; region?: string; countryCode?: string }

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
const plain = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function brazilianRegion(weather: WeatherContext | undefined): string | undefined {
  if (weather?.countryCode?.toUpperCase() !== 'BR') return undefined
  const code = weather.regionCode?.toUpperCase().split('-').at(-1) || brazilianStates[plain(weather.region || '')]
  return code ? brazilianRegions[code] : undefined
}

const partLabels: Record<DayPart, string> = { manha: 'manhã', almoco: 'hora do almoço', tarde: 'fim de tarde', noite: 'noite' }
const partReasons: Record<DayPart, string> = { manha: 'Bom pro café da manhã', almoco: 'Pro almoço de hoje', tarde: 'Pro fim de tarde', noite: 'Pra esta noite' }
const climateReasons: Record<Climate, string> = { frio: 'Esquenta o dia frio', ameno: 'Vai bem com o tempo ameno', quente: 'Combina com o calor' }

export function dayPart(date: Date): DayPart {
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes >= 5 * 60 && minutes < 11 * 60) return 'manha'
  if (minutes >= 11 * 60 && minutes < 15 * 60) return 'almoco'
  if (minutes >= 15 * 60 && minutes < 18 * 60 + 30) return 'tarde'
  return 'noite'
}
const isRain = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95

/** Hora do dia, dia da semana e clima de agora, num só lugar. */
export function currentMoment(weather: WeatherContext | undefined, now: Date, preferredRegion?: string): Moment {
  const part = dayPart(now)
  const feels = weather ? Math.round(weather.apparentTemperature ?? weather.temperature) : undefined
  const climate: Climate | undefined = feels === undefined ? undefined : feels < 19 ? 'frio' : feels > 27 ? 'quente' : 'ameno'
  const day = now.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
  return { part, partLabel: partLabels[part], dayLabel: day.charAt(0).toUpperCase() + day.slice(1), weekend: [0, 6].includes(now.getDay()), climate, rainy: weather ? isRain(weather.weatherCode) : false, temperature: weather ? Math.round(weather.temperature) : undefined, region: preferredRegion || brazilianRegion(weather), countryCode: weather?.countryCode?.toUpperCase() }
}

export type Recommendation = { recipe: Recipe; fit: number; reason: string }

/** Usa todo o acervo; a ordem muda com o horário, o clima, a região e o dia. */
export function rankRecommendations(recipes: Recipe[], moment: Moment, now: Date): Recommendation[] {
  const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${moment.part}`
  return recipes.map(recipe => {
    const title = plain(recipe.title)
    const words = plain(`${recipe.title} ${recipe.category} ${recipe.tags.join(' ')}`)
    const soupTitle = /sopa|caldo|ensopado|guisado|cozido/.test(title)
    const sweet = !soupTitle && (recipe.category === 'Doces' || /\bbolos?\b|\bdoce\b|sobremesa|pudim|torta doce|chocolate|biscoito|cookie/.test(words))
    const breakfast = recipe.category === 'Café da manhã' || recipe.category === 'Pães' || /panqueca|waffle|omelete|sanduiche|torrada|mingau|crepe|\bpao\b|\bpaes\b|brunch|lanche/.test(words)
    const soup = soupTitle || (!sweet && (recipe.category === 'Sopas' || /sopa|caldo|ensopado|guisado|cozido|stew/.test(words)))
    const light = /salada|fruta|peixe|camarao|frutos do mar|gelado|leve/.test(words)
    const savory = !sweet && !breakfast
    let fit = 0
    let partFit = false
    if (moment.part === 'manha') { partFit = breakfast; fit += breakfast ? 5 : sweet ? 1 : -4 }
    if (moment.part === 'almoco') { partFit = savory; fit += savory ? 5 : breakfast ? -3 : -4 }
    if (moment.part === 'tarde') { partFit = sweet || (breakfast && !soup); fit += partFit ? 5 : savory ? -3 : 0 }
    if (moment.part === 'noite') { partFit = savory || soup; fit += partFit ? 4.5 : breakfast ? -3 : -4 }

    const regional = recipe.id.startsWith('rancho-') && moment.region && 'regions' in recipe &&
      Array.isArray(recipe.regions) && recipe.regions.includes(moment.region)
    const national = moment.countryCode && recipe.originCountryCode === moment.countryCode
    if (regional) fit += partFit ? 4 : 0.6
    else if (national) fit += partFit ? 3 : 0.5
    if (moment.climate === 'frio') fit += soup ? 3 : light ? -1 : 0.7
    if (moment.climate === 'quente') fit += light ? 3 : soup ? -2 : 0
    if (moment.rainy) fit += soup ? 2 : sweet && moment.part === 'tarde' ? 0.8 : 0
    if (moment.weekend && /churrasco|assado|festa|bolo/.test(words)) fit += 0.7
    if (ranchReviews[recipe.id]) fit += 0.4

    // Sorteio estável por período: receitas equivalentes se revezam sem pular a cada render.
    let hash = 2166136261
    for (const char of `${day}-${recipe.id}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    fit += ((hash >>> 0) % 200) / 100

    const reason = regional && partFit ? `Combina com sua região ${moment.region}` : national && partFit ? 'Da cozinha do seu país'
      : moment.rainy && soup ? 'Boa pedida para a chuva'
        : moment.climate === 'frio' && soup ? 'Para aquecer no frio'
          : moment.climate === 'quente' && light ? 'Leve para o calor'
            : partFit ? partReasons[moment.part] : 'Ideia do acervo para hoje'
    return { recipe, fit, reason }
  }).sort((a, b) => b.fit - a.fit || a.recipe.id.localeCompare(b.recipe.id))
}

export type Pick = { recipe: BrazilianRecipe; fit: number; reason?: string }
/** Ordena a base do Rancho pelo que combina com agora; a nota da cozinha de teste desempata. */
export function rankForMoment(recipes: BrazilianRecipe[], moment: Moment, now: Date): Pick[] {
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return recipes.flatMap((recipe, index) => {
    const review = ranchReviews[recipe.id]
    if (!review) return []
    const reasons: string[] = []
    let fit = review.score * 0.4 + ((dayOfYear + index * 7) % 5) * 0.06
    if (moment.rainy && review.rainy) { fit += 2; reasons.push('Combina com chuva') }
    if (review.moments.includes(moment.part)) { fit += 3; reasons.push(partReasons[moment.part]) }
    if (moment.climate && recipe.climate === moment.climate) { fit += 2.5; reasons.push(climateReasons[moment.climate]) }
    else if (moment.climate && (recipe.climate === 'ameno' || moment.climate === 'ameno')) fit += 0.8
    else if (moment.climate) fit -= 2.5 // feijoada no calorão ou salada gelada no frio ficam para depois
    if (moment.weekend && review.weekend) { fit += 1.2; reasons.push('Cara de fim de semana') }
    return [{ recipe, fit, reason: reasons[0] }]
  }).sort((a, b) => b.fit - a.fit)
}

export function momentSentence(moment: Moment) {
  const parts = [`${moment.dayLabel}, ${moment.partLabel}`]
  if (moment.temperature !== undefined) parts.push(`${moment.temperature} °C`)
  return `${parts.join(', ')}${moment.rainy ? ' e chuva' : ''}`
}
