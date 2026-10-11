import type { Nutrition, Recipe } from '../types'
import { gramsFor } from './format'

export type RecipeNutrition = Required<Nutrition> & { known: number; totalIngredients: number }

const commonNutrition: Record<string, Nutrition> = {
  'farinha de trigo': { kcal: 360, protein: 9.8, carbs: 75.1, fat: 1.4, fiber: 2.4 },
  'fermento quimico': { kcal: 53, carbs: 27.7 },
  'manteiga': { kcal: 726, protein: .4, carbs: .1, fat: 82.4 },
  'leite': { kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 },
  'linguica fresca': { kcal: 280, protein: 16, carbs: 1, fat: 23 },
  'maca': { kcal: 56, protein: .3, carbs: 15.2, fat: .1, fiber: 1.3 },
  'acucar': { kcal: 387, carbs: 100 },
  'canela em po': { kcal: 261, protein: 4, carbs: 80, fat: 3.2, fiber: 53 },
  'carne moida': { kcal: 219, protein: 26.7, fat: 12 },
  'feijao vermelho cozido': { kcal: 127, protein: 8.7, carbs: 22.8, fat: .5, fiber: 7.4 },
  'tomate pelado': { kcal: 21, protein: 1.1, carbs: 4.5, fat: .2, fiber: 1.2 },
  'cebola': { kcal: 39, protein: 1.7, carbs: 8.9, fat: .1, fiber: 2.2 },
  'alho': { kcal: 113, protein: 7, carbs: 23.9, fat: .2, fiber: 4.3 },
  'cominho': { kcal: 375, protein: 17.8, carbs: 44.2, fat: 22.3, fiber: 10.5 },
  'paprica defumada': { kcal: 282, protein: 14.1, carbs: 54, fat: 13, fiber: 34.9 }
}

function key(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() }

export function calculateNutrition(recipe: Recipe, perServing = true): RecipeNutrition {
  const total: RecipeNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, known: 0, totalIngredients: recipe.ingredients.length }
  for (const item of recipe.ingredients) {
    const grams = gramsFor(item.amount, item.unit, item.gramsPerUnit)
    const composition = item.nutrition ?? commonNutrition[key(item.name)]
    if (grams === null || !composition) continue
    total.known++
    total.kcal += (composition.kcal ?? 0) * grams / 100
    total.protein += (composition.protein ?? 0) * grams / 100
    total.carbs += (composition.carbs ?? 0) * grams / 100
    total.fat += (composition.fat ?? 0) * grams / 100
    total.fiber += (composition.fiber ?? 0) * grams / 100
  }
  if (perServing) {
    const portions = Math.max(recipe.servings, 1)
    total.kcal /= portions
    total.protein /= portions
    total.carbs /= portions
    total.fat /= portions
    total.fiber /= portions
  }
  return total
}

export function calorieLabel(recipe: Recipe) {
  const nutrition = calculateNutrition(recipe)
  return nutrition.known ? `${Math.round(nutrition.kcal)} kcal/porção` : 'Calorias em cálculo'
}
