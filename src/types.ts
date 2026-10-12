export const CATEGORIES = ['Café da manhã', 'Pães', 'Carnes', 'Churrasco/BBQ', 'Acompanhamentos', 'Sopas', 'Doces', 'Tortas', 'Bebidas', 'Molhos e Temperos'] as const
export const INGREDIENT_CATEGORIES = ['Hortifrúti', 'Carnes', 'Laticínios', 'Grãos e Farinhas', 'Temperos e Especiarias', 'Óleos e Gorduras', 'Doces e Confeitaria', 'Bebidas', 'Enlatados', 'Congelados', 'Outros'] as const
export type Nutrition = { kcal?: number; protein?: number; carbs?: number; fat?: number; fiber?: number }
export type IngredientBase = {
  id: string; name: string; aliases: string[]; category: string; units: string[];
  defaultUnit: string; gramsPerUnit: Record<string, number>; nutrition?: Nutrition;
  source: 'TACO' | 'Curada' | 'Pessoal'; ownerId?: string
}
export type RecipeIngredient = {
  id: string; ingredientId: string; name: string; category: string; amount: number | null;
  unit: string; note: string; group: string; gramsPerUnit: Record<string, number>; nutrition?: Nutrition
}
export type Step = { id: string; text: string; timerMinutes?: number; photo?: string }
export type Recipe = {
  id: string; ownerId?: string; title: string; description: string; story: string; source: string;
  category: string; tags: string[]; prepMinutes: number; cookMinutes: number; servings: number;
  difficulty: 1 | 2 | 3; ingredients: RecipeIngredient[]; steps: Step[]; utensils: string[];
  tips: string; rating: number; favorite: boolean; cover?: string; gallery: string[];
  draft: boolean; createdAt: string; updatedAt: string; shared?: boolean;
  sourceUrl?: string; originalLanguage?: string; originCountryCode?: string; servingsKnown?: boolean; difficultyKnown?: boolean
}
export type Collection = { id: string; ownerId?: string; name: string; recipeIds: string[] }
export type ShoppingItem = { id: string; ownerId?: string; ingredientId: string; name: string; category: string; amount: number | null; unit: string; checked: boolean }
export type CookLog = { id: string; ownerId?: string; recipeId: string; cookedAt: string; note: string }
export type LocalState = { recipes: Recipe[]; customIngredients: IngredientBase[]; collections: Collection[]; shopping: ShoppingItem[]; cookLogs: CookLog[] }
