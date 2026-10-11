import type { Nutrition, Recipe, RecipeIngredient } from '../types'

export type BrazilianRecipe = Recipe & {
  climate: 'frio' | 'ameno' | 'quente'
  regions: string[]
  sourceUrl: string
}

const createdAt = '2026-10-11T12:00:00.000Z'

function ing(name: string, amount: number, unit: string, grams: number, nutrition: Nutrition, group = ''): RecipeIngredient {
  return { id: `br-${name}-${group}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ingredientId: `br-${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, amount, unit, category: 'Ingredientes do Brasil', note: '', group, gramsPerUnit: { [unit]: grams }, nutrition }
}

function recipe(value: Omit<BrazilianRecipe, 'createdAt' | 'updatedAt' | 'draft' | 'rating' | 'favorite' | 'gallery'>): BrazilianRecipe {
  return { ...value, rating: 0, favorite: false, gallery: [], draft: false, createdAt, updatedAt: createdAt }
}

export const brazilianRecipes: BrazilianRecipe[] = [
  recipe({
    id: 'rancho-feijoada', title: 'Feijoada brasileira', category: 'Pratos brasileiros', climate: 'frio', regions: ['Sudeste', 'Sul', 'Centro-Oeste'],
    description: 'Feijão preto cremoso com cortes suínos, louro e o perfume de uma panela cozida sem pressa.', story: 'Um clássico de mesa compartilhada, escolhido pelo Rancho para dias frios.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53482', cover: '/assets/recipes/feijoada.jpg', tags: ['Brasileira', 'Panela', 'Conforto'],
    prepMinutes: 30, cookMinutes: 120, servings: 8, difficulty: 3,
    ingredients: [ing('Feijão preto', 500, 'g', 1, { kcal: 324, protein: 21.3, carbs: 58.8, fat: 1.2, fiber: 21.8 }), ing('Lombo suíno', 500, 'g', 1, { kcal: 176, protein: 22.6, fat: 8.8 }), ing('Linguiça calabresa', 300, 'g', 1, { kcal: 296, protein: 15, fat: 25 }), ing('Bacon', 150, 'g', 1, { kcal: 393, protein: 14, fat: 37 }), ing('Cebola', 300, 'g', 1, { kcal: 39, protein: 1.7, carbs: 8.9, fat: .1, fiber: 2.2 }), ing('Alho', 20, 'g', 1, { kcal: 113, protein: 7, carbs: 23.9, fat: .2, fiber: 4.3 }), ing('Óleo', 20, 'ml', 1, { kcal: 884, fat: 100 }), ing('Louro', 2, 'g', 1, { kcal: 313, protein: 7.6, carbs: 75, fat: 8.4, fiber: 26 })],
    steps: [{ id: 'f1', text: 'Deixe o feijão de molho por 8 horas e descarte a água.' }, { id: 'f2', text: 'Doure bacon, linguiça e lombo em uma panela grande. Reserve.' }, { id: 'f3', text: 'Refogue cebola e alho, volte as carnes e junte feijão, louro e água.' }, { id: 'f4', text: 'Cozinhe em fogo baixo até o feijão ficar macio e o caldo encorpado.', timerMinutes: 100 }], utensils: ['Panela grande', 'Concha'], tips: 'Sirva com couve, arroz e laranja.'
  }),
  recipe({
    id: 'rancho-moqueca', title: 'Moqueca baiana de camarão', category: 'Pratos brasileiros', climate: 'quente', regions: ['Nordeste'],
    description: 'Camarão, leite de coco, tomate e coentro em um caldo vibrante, com gosto de litoral.', story: 'A Bahia chega à mesa em camadas de aroma, cor e dendê.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53481', cover: '/assets/recipes/moqueca.jpg', tags: ['Bahia', 'Frutos do mar', 'Sem glúten'],
    prepMinutes: 25, cookMinutes: 30, servings: 6, difficulty: 2,
    ingredients: [ing('Camarão limpo', 800, 'g', 1, { kcal: 85, protein: 18.9, carbs: 0, fat: 1 }), ing('Leite de coco', 400, 'ml', 1, { kcal: 197, protein: 2, carbs: 3, fat: 21 }), ing('Tomate', 450, 'g', 1, { kcal: 15, protein: 1.1, carbs: 3.1, fat: .2, fiber: 1.2 }), ing('Cebola', 200, 'g', 1, { kcal: 39, protein: 1.7, carbs: 8.9, fat: .1, fiber: 2.2 }), ing('Pimentão', 180, 'g', 1, { kcal: 21, protein: 1.1, carbs: 4.9, fat: .2, fiber: 2.6 }), ing('Azeite de dendê', 40, 'ml', 1, { kcal: 884, fat: 100 }), ing('Coentro', 25, 'g', 1, { kcal: 28, protein: 2.1, carbs: 3.7, fat: .5, fiber: 2.8 })],
    steps: [{ id: 'm1', text: 'Tempere o camarão com limão, alho e sal por 20 minutos.' }, { id: 'm2', text: 'Monte camadas de cebola, tomate e pimentão em uma panela larga.' }, { id: 'm3', text: 'Junte o leite de coco e o dendê; cozinhe por 15 minutos.' }, { id: 'm4', text: 'Acrescente o camarão e cozinhe só até ficar rosado. Finalize com coentro.', timerMinutes: 8 }], utensils: ['Panela de barro', 'Colher de pau'], tips: 'O camarão fica mais macio quando entra apenas no final.'
  }),
  recipe({
    id: 'rancho-acaraje', title: 'Acarajé com vatapá rápido', category: 'Pratos brasileiros', climate: 'quente', regions: ['Nordeste'],
    description: 'Bolinho crocante de feijão-fradinho com recheio cremoso e camarão.', story: 'Patrimônio da cozinha afro-brasileira e símbolo da Bahia.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53483', cover: '/assets/recipes/acaraje.jpg', tags: ['Bahia', 'Afro-brasileira', 'Festa'],
    prepMinutes: 45, cookMinutes: 35, servings: 10, difficulty: 3,
    ingredients: [ing('Feijão-fradinho', 800, 'g', 1, { kcal: 339, protein: 23.5, carbs: 60, fat: 1.3, fiber: 10.6 }), ing('Cebola', 250, 'g', 1, { kcal: 39, protein: 1.7, carbs: 8.9, fat: .1, fiber: 2.2 }), ing('Azeite de dendê', 250, 'ml', 1, { kcal: 884, fat: 100 }), ing('Camarão seco', 180, 'g', 1, { kcal: 263, protein: 47, carbs: 2, fat: 7 }), ing('Leite de coco', 300, 'ml', 1, { kcal: 197, protein: 2, carbs: 3, fat: 21 }), ing('Pão amanhecido', 180, 'g', 1, { kcal: 300, protein: 8, carbs: 58, fat: 3 })],
    steps: [{ id: 'a1', text: 'Deixe o feijão de molho, retire as cascas e bata com cebola até formar uma massa aerada.' }, { id: 'a2', text: 'Frite colheradas da massa no dendê quente até dourar.' }, { id: 'a3', text: 'Bata pão, leite de coco e parte do camarão; cozinhe mexendo até engrossar.' }, { id: 'a4', text: 'Abra os bolinhos e recheie com vatapá e camarão.' }], utensils: ['Processador', 'Panela funda'], tips: 'Bata a massa por alguns minutos para incorporar ar e deixar o acarajé leve.'
  }),
  recipe({
    id: 'rancho-pao-queijo', title: 'Pão de queijo mineiro', category: 'Pães', climate: 'frio', regions: ['Sudeste', 'Centro-Oeste'],
    description: 'Casquinha dourada, centro macio e muito queijo: perfeito com café passado na hora.', story: 'Receita mineira para aquecer manhãs e reunir gente à mesa.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53476', cover: '/assets/recipes/pao-queijo.jpg', tags: ['Minas Gerais', 'Café da manhã', 'Sem glúten'],
    prepMinutes: 25, cookMinutes: 25, servings: 20, difficulty: 2,
    ingredients: [ing('Polvilho azedo', 500, 'g', 1, { kcal: 351, protein: .5, carbs: 87.5, fat: .2, fiber: .6 }), ing('Leite integral', 250, 'ml', 1, { kcal: 61, protein: 3.2, carbs: 4.7, fat: 3.3 }), ing('Óleo', 100, 'ml', 1, { kcal: 884, fat: 100 }), ing('Ovo', 150, 'g', 1, { kcal: 143, protein: 13, carbs: .7, fat: 9.5 }), ing('Queijo meia-cura', 250, 'g', 1, { kcal: 330, protein: 23, carbs: 3, fat: 25 })],
    steps: [{ id: 'p1', text: 'Ferva leite, óleo e sal e despeje sobre o polvilho para escaldar.' }, { id: 'p2', text: 'Quando amornar, misture os ovos e depois o queijo até a massa ficar uniforme.' }, { id: 'p3', text: 'Modele bolinhas com as mãos untadas.' }, { id: 'p4', text: 'Asse a 200 °C até crescer e dourar.', timerMinutes: 25 }], utensils: ['Assadeira', 'Tigela grande'], tips: 'Congele as bolinhas cruas e asse direto do freezer.'
  }),
  recipe({
    id: 'rancho-bolo-cenoura', title: 'Bolo de cenoura com chocolate', category: 'Doces', climate: 'ameno', regions: ['Sudeste', 'Sul', 'Centro-Oeste'],
    description: 'Massa alaranjada e fofinha com cobertura de chocolate que quebra ao cortar.', story: 'O bolo brasileiro que transforma qualquer tarde em café de família.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53485', cover: '/assets/recipes/bolo-cenoura.jpg', tags: ['Bolo', 'Café da tarde', 'Brasileira'],
    prepMinutes: 20, cookMinutes: 40, servings: 12, difficulty: 1,
    ingredients: [ing('Cenoura', 300, 'g', 1, { kcal: 34, protein: 1.3, carbs: 7.7, fat: .2, fiber: 3.2 }), ing('Farinha de trigo', 300, 'g', 1, { kcal: 360, protein: 9.8, carbs: 75, fat: 1.4, fiber: 2.3 }), ing('Açúcar', 320, 'g', 1, { kcal: 387, carbs: 100 }), ing('Óleo', 180, 'ml', 1, { kcal: 884, fat: 100 }), ing('Ovo', 200, 'g', 1, { kcal: 143, protein: 13, carbs: .7, fat: 9.5 }), ing('Cacau em pó', 35, 'g', 1, { kcal: 228, protein: 19.6, carbs: 57.9, fat: 13.7, fiber: 37 })],
    steps: [{ id: 'b1', text: 'Bata cenoura, ovos e óleo até ficar liso.' }, { id: 'b2', text: 'Misture com farinha, açúcar e fermento sem bater demais.' }, { id: 'b3', text: 'Asse a 180 °C até o palito sair limpo.', timerMinutes: 40 }, { id: 'b4', text: 'Cozinhe cacau, açúcar e um pouco de água; espalhe a calda quente sobre o bolo.' }], utensils: ['Liquidificador', 'Forma retangular'], tips: 'Pese a cenoura para evitar uma massa pesada.'
  }),
  recipe({
    id: 'rancho-brigadeiro', title: 'Brigadeiro de panela', category: 'Doces', climate: 'ameno', regions: ['Sudeste', 'Sul', 'Nordeste', 'Norte', 'Centro-Oeste'],
    description: 'Chocolate, leite condensado e manteiga no ponto cremoso ou de enrolar.', story: 'Do aniversário à colherada depois do almoço, um doce brasileiro essencial.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53475', cover: '/assets/recipes/brigadeiro.jpg', tags: ['Doce', 'Festa', 'Panela'],
    prepMinutes: 5, cookMinutes: 15, servings: 20, difficulty: 1,
    ingredients: [ing('Leite condensado', 395, 'g', 1, { kcal: 321, protein: 7.7, carbs: 54, fat: 8.5 }), ing('Cacau em pó', 35, 'g', 1, { kcal: 228, protein: 19.6, carbs: 57.9, fat: 13.7, fiber: 37 }), ing('Manteiga', 20, 'g', 1, { kcal: 726, protein: .4, carbs: .1, fat: 82.4 }), ing('Chocolate granulado', 100, 'g', 1, { kcal: 450, protein: 4, carbs: 74, fat: 16 })],
    steps: [{ id: 'br1', text: 'Misture leite condensado, cacau e manteiga em panela de fundo grosso.' }, { id: 'br2', text: 'Cozinhe em fogo baixo, mexendo sempre, até desgrudar do fundo.', timerMinutes: 12 }, { id: 'br3', text: 'Esfrie, enrole e passe no granulado.' }], utensils: ['Panela de fundo grosso', 'Espátula'], tips: 'Para servir de colher, desligue um pouco antes do ponto de enrolar.'
  }),
  recipe({
    id: 'rancho-quindim', title: 'Quindim de coco', category: 'Doces', climate: 'quente', regions: ['Nordeste', 'Sudeste'],
    description: 'Doce brilhante de gemas e coco, com textura delicada e perfume tropical.', story: 'Herança portuguesa reinventada no Brasil com o coco.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53477', cover: '/assets/recipes/quindim.jpg', tags: ['Coco', 'Sobremesa', 'Brasileira'],
    prepMinutes: 20, cookMinutes: 45, servings: 10, difficulty: 2,
    ingredients: [ing('Gema de ovo', 180, 'g', 1, { kcal: 322, protein: 15.9, carbs: 3.6, fat: 26.5 }), ing('Açúcar', 250, 'g', 1, { kcal: 387, carbs: 100 }), ing('Leite de coco', 200, 'ml', 1, { kcal: 197, protein: 2, carbs: 3, fat: 21 }), ing('Coco ralado', 100, 'g', 1, { kcal: 354, protein: 3.3, carbs: 15.2, fat: 33.5, fiber: 9 }), ing('Manteiga', 20, 'g', 1, { kcal: 726, protein: .4, carbs: .1, fat: 82.4 })],
    steps: [{ id: 'q1', text: 'Passe as gemas pela peneira sem raspar.' }, { id: 'q2', text: 'Misture delicadamente com açúcar, leite de coco e coco ralado.' }, { id: 'q3', text: 'Distribua em formas untadas e asse em banho-maria a 170 °C.', timerMinutes: 45 }, { id: 'q4', text: 'Desenforme ainda morno.' }], utensils: ['Peneira', 'Forminhas', 'Assadeira'], tips: 'Descansar a mistura por 20 minutos ajuda a formar as duas camadas.'
  }),
  recipe({
    id: 'rancho-milho', title: 'Milho grelhado com queijo', category: 'Acompanhamentos', climate: 'ameno', regions: ['Centro-Oeste', 'Sudeste', 'Sul'],
    description: 'Espigas douradas na brasa com creme de alho, queijo e limão.', story: 'Comida de festa junina com acabamento de churrasqueira.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53478', cover: '/assets/recipes/milho-grelhado.jpg', tags: ['Brasa', 'Milho', 'Festa junina'],
    prepMinutes: 15, cookMinutes: 20, servings: 6, difficulty: 1,
    ingredients: [ing('Milho-verde', 720, 'g', 1, { kcal: 138, protein: 6.6, carbs: 28.6, fat: .6, fiber: 3.9 }), ing('Maionese', 90, 'g', 1, { kcal: 302, protein: .6, carbs: 7.9, fat: 30.5 }), ing('Queijo parmesão', 60, 'g', 1, { kcal: 453, protein: 35.6, carbs: 1.7, fat: 33.5 }), ing('Alho', 10, 'g', 1, { kcal: 113, protein: 7, carbs: 23.9, fat: .2, fiber: 4.3 }), ing('Limão', 80, 'g', 1, { kcal: 32, protein: .9, carbs: 11, fat: .1, fiber: 1.2 })],
    steps: [{ id: 'mi1', text: 'Cozinhe as espigas por 5 minutos e seque.' }, { id: 'mi2', text: 'Misture maionese, alho e raspas de limão.' }, { id: 'mi3', text: 'Grelhe o milho até marcar e ficar dourado.' }, { id: 'mi4', text: 'Pincele o creme, polvilhe queijo e sirva com limão.' }], utensils: ['Churrasqueira ou chapa', 'Pincel culinário'], tips: 'Gire as espigas aos poucos para dourar por igual.'
  }),
  recipe({
    id: 'rancho-salada-palmito', title: 'Salada fresca de palmito', category: 'Acompanhamentos', climate: 'quente', regions: ['Sudeste', 'Sul', 'Norte'],
    description: 'Palmito, tomate e ervas num prato leve para dias de muito calor.', story: 'Uma escolha fresca do Rancho, rápida e cheia de ingredientes brasileiros.',
    source: 'Base brasileira do Rancho · referência TheMealDB', sourceUrl: 'https://www.themealdb.com/meal/53484', cover: '/assets/recipes/salada-palmito.jpg', tags: ['Leve', 'Vegetariana', 'Verão'],
    prepMinutes: 15, cookMinutes: 0, servings: 4, difficulty: 1,
    ingredients: [ing('Palmito', 400, 'g', 1, { kcal: 29, protein: 2.5, carbs: 5.5, fat: .5, fiber: 2.6 }), ing('Tomate-cereja', 250, 'g', 1, { kcal: 15, protein: 1.1, carbs: 3.1, fat: .2, fiber: 1.2 }), ing('Cebolinha', 40, 'g', 1, { kcal: 20, protein: 1.9, carbs: 3.4, fat: .4, fiber: 3.6 }), ing('Azeite', 45, 'ml', 1, { kcal: 884, fat: 100 }), ing('Salsinha', 20, 'g', 1, { kcal: 33, protein: 3.3, carbs: 5.7, fat: .6, fiber: 1.9 })],
    steps: [{ id: 's1', text: 'Fatie o palmito e corte os tomates ao meio.' }, { id: 's2', text: 'Misture azeite, vinagre, sal e pimenta até emulsionar.' }, { id: 's3', text: 'Envolva os ingredientes no molho e finalize com ervas.' }], utensils: ['Saladeira', 'Faca'], tips: 'Sirva bem gelada e tempere apenas na hora.'
  })
]

export function suggestedRecipe(temperature?: number, region?: string) {
  const climate: BrazilianRecipe['climate'] = temperature === undefined ? 'ameno' : temperature < 19 ? 'frio' : temperature > 27 ? 'quente' : 'ameno'
  const normalizedRegion = region?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const ranked = brazilianRecipes.map((item, index) => ({
    item,
    score: (item.climate === climate ? 4 : 0) + (normalizedRegion && item.regions.some(value => normalizedRegion.includes(value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())) ? 3 : 0) + ((new Date().getDate() + index) % 3)
  })).sort((a, b) => b.score - a.score)
  return ranked[0].item
}
