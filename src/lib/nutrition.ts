import type { Nutrition, Recipe } from '../types'
import { gramsFor } from './format'

export type RecipeNutrition = Required<Nutrition> & { known: number; totalIngredients: number }

export function calculateNutrition(recipe: Recipe, perServing = true): RecipeNutrition {
  const total: RecipeNutrition = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, known: 0, totalIngredients: recipe.ingredients.length }
  for (const item of recipe.ingredients) {
    const grams = gramsFor(item.amount, item.unit, item.gramsPerUnit)
    if (grams === null || !item.nutrition) continue
    total.known++
    total.kcal += (item.nutrition.kcal ?? 0) * grams / 100
    total.protein += (item.nutrition.protein ?? 0) * grams / 100
    total.carbs += (item.nutrition.carbs ?? 0) * grams / 100
    total.fat += (item.nutrition.fat ?? 0) * grams / 100
    total.fiber += (item.nutrition.fiber ?? 0) * grams / 100
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
