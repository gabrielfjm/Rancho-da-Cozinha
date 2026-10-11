import type { BrazilianRecipe } from '../data/brazilianRecipes'
import { ranchReviews, type DayPart } from '../data/ranchReviews'
import type { WeatherContext } from './weather'

export type Climate = 'frio' | 'ameno' | 'quente'
export type Moment = { part: DayPart; partLabel: string; dayLabel: string; weekend: boolean; climate?: Climate; rainy: boolean; temperature?: number }

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
export function currentMoment(weather: WeatherContext | undefined, now: Date): Moment {
  const part = dayPart(now)
  const feels = weather ? Math.round(weather.apparentTemperature ?? weather.temperature) : undefined
  const climate: Climate | undefined = feels === undefined ? undefined : feels < 19 ? 'frio' : feels > 27 ? 'quente' : 'ameno'
  const day = now.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
  return { part, partLabel: partLabels[part], dayLabel: day.charAt(0).toUpperCase() + day.slice(1), weekend: [0, 6].includes(now.getDay()), climate, rainy: weather ? isRain(weather.weatherCode) : false, temperature: weather ? Math.round(weather.temperature) : undefined }
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
