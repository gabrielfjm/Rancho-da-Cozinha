// Pareceres da cozinha de teste do Rancho para a base brasileira.
// Cada critério vai de 1 a 5; em "bolso", 5 significa barato de fazer.
export type DayPart = 'manha' | 'almoco' | 'tarde' | 'noite'
export type RanchReview = {
  score: number
  /** Partes do dia em que a receita faz mais sentido. */
  moments: DayPart[]
  /** Pede chuva lá fora (comida de aconchego). */
  rainy?: boolean
  /** Tem cara de sábado ou domingo. */
  weekend?: boolean
  ribbon: 'Favorita da Casa' | 'Testada e Aprovada' | 'Receita de Família'
  verdict: string
  notes: string
  criteria: { sabor: number; facilidade: number; bolso: number; repetir: number }
  pairing: string[]
  occasion: string
  tries: number
  testedIn: string
}

export const ranchReviews: Record<string, RanchReview> = {
  'rancho-feijoada': {
    score: 4.8, ribbon: 'Favorita da Casa', tries: 4, testedIn: 'julho de 2026', moments: ['almoco'], rainy: true, weekend: true,
    verdict: 'Caldo de colher em pé. Vale o domingo inteiro.',
    notes: 'Testamos com e sem pé de porco: só com lombo, calabresa e bacon fica mais limpa e ninguém sentiu falta. O que fez diferença foi deixar o louro até o fim e amassar uma concha de feijão contra a panela para engrossar.',
    criteria: { sabor: 5, facilidade: 2, bolso: 3, repetir: 5 },
    pairing: ['Arroz branco', 'Couve na manteiga', 'Laranja-pera', 'Farofa'], occasion: 'Sábado frio com a família toda'
  },
  'rancho-moqueca': {
    score: 4.7, ribbon: 'Testada e Aprovada', tries: 3, testedIn: 'fevereiro de 2026', moments: ['almoco', 'noite'], weekend: true,
    verdict: 'O dendê manda, mas é o camarão no final que faz a festa.',
    notes: 'Na primeira vez o camarão foi junto com o leite de coco e ficou borrachudo. Entrando só nos últimos minutos, sai macio e rosado. A panela de barro segura o calor e vai direto para a mesa.',
    criteria: { sabor: 5, facilidade: 3, bolso: 2, repetir: 5 },
    pairing: ['Arroz branco', 'Pirão', 'Farofa de dendê'], occasion: 'Almoço de calor, janela aberta'
  },
  'rancho-acaraje': {
    score: 4.3, ribbon: 'Testada e Aprovada', tries: 5, testedIn: 'abril de 2026', moments: ['tarde', 'noite'],
    verdict: 'Dá trabalho, mas o bolinho sai leve como o de tabuleiro.',
    notes: 'Tirar a casca do feijão-fradinho é o passo que ninguém quer fazer, e é o que mais importa. Batemos a massa por quatro minutos e ela quase dobrou. Com o óleo morno demais o bolinho encharca: teste com uma colherada antes.',
    criteria: { sabor: 5, facilidade: 1, bolso: 3, repetir: 4 },
    pairing: ['Vinagrete', 'Pimenta', 'Caruru'], occasion: 'Fim de tarde de sexta com amigos'
  },
  'rancho-pao-queijo': {
    score: 4.9, ribbon: 'Favorita da Casa', tries: 6, testedIn: 'junho de 2026', moments: ['manha', 'tarde'], rainy: true,
    verdict: 'Casquinha fina, miolo puxando. Sumiu da assadeira em dez minutos.',
    notes: 'Usamos metade polvilho doce, metade azedo, e queijo meia-cura. Escaldar com o leite fervendo de verdade muda o miolo. Congelado cru, vai direto ao forno com cinco minutos a mais.',
    criteria: { sabor: 5, facilidade: 4, bolso: 4, repetir: 5 },
    pairing: ['Café passado', 'Doce de leite', 'Requeijão'], occasion: 'Café da tarde de inverno'
  },
  'rancho-bolo-cenoura': {
    score: 4.6, ribbon: 'Receita de Família', tries: 3, testedIn: 'maio de 2026', moments: ['manha', 'tarde'], rainy: true, weekend: true,
    verdict: 'Bolo de vó, sem erro. A calda tem que ir quente.',
    notes: 'Pesamos a cenoura em vez de contar "três médias" e a massa ficou fofa de ponta a ponta. Furar o bolo com um garfo antes da calda deixa o chocolate escorrer por dentro.',
    criteria: { sabor: 5, facilidade: 5, bolso: 5, repetir: 5 },
    pairing: ['Café com leite', 'Leite gelado'], occasion: 'Lanche de domingo'
  },
  'rancho-brigadeiro': {
    score: 4.7, ribbon: 'Testada e Aprovada', tries: 4, testedIn: 'agosto de 2026', moments: ['tarde', 'noite'], rainy: true,
    verdict: 'Ponto de enrolar em doze minutos de colher, sem pressa.',
    notes: 'Cacau 50% deixou o doce menos enjoativo que o achocolatado. Panela de fundo grosso e fogo baixo: se grudar, não tem volta. Para comer de colher, desligue quando começar a soltar do fundo.',
    criteria: { sabor: 5, facilidade: 5, bolso: 4, repetir: 5 },
    pairing: ['Café coado', 'Morangos'], occasion: 'Aniversário ou noite de filme'
  },
  'rancho-quindim': {
    score: 4.2, ribbon: 'Receita de Família', tries: 3, testedIn: 'março de 2026', moments: ['almoco', 'tarde'],
    verdict: 'Brilhante e firme. Pede paciência na peneira.',
    notes: 'Só acertamos na terceira: gemas passadas sem raspar a peneira, mistura descansando vinte minutos e banho-maria com água já quente. Assim o coco sobe e forma a base que dá a mordida.',
    criteria: { sabor: 5, facilidade: 2, bolso: 3, repetir: 4 },
    pairing: ['Café expresso', 'Chá-mate gelado'], occasion: 'Sobremesa de almoço de verão'
  },
  'rancho-milho': {
    score: 4.4, ribbon: 'Testada e Aprovada', tries: 2, testedIn: 'setembro de 2026', moments: ['tarde', 'noite'], weekend: true,
    verdict: 'Cara de feira, gosto de churrasco no quintal.',
    notes: 'Cozinhar antes de grelhar encurta a espera e deixa o grão suculento. O creme com raspas de limão segura o queijo no lugar. Queijo coalho ralado grosso funcionou melhor que parmesão.',
    criteria: { sabor: 4, facilidade: 5, bolso: 5, repetir: 5 },
    pairing: ['Churrasco', 'Limonada', 'Vinagrete'], occasion: 'Fim de tarde na churrasqueira'
  },
  'rancho-salada-palmito': {
    score: 4.0, ribbon: 'Testada e Aprovada', tries: 2, testedIn: 'janeiro de 2026', moments: ['almoco'],
    verdict: 'Leve, crocante e pronta antes do arroz.',
    notes: 'Palmito pupunha em rodelas grossas aguenta melhor o molho. Temperamos só na hora de servir e ela continuou firme até o fim do almoço. Um punhado de hortelã levantou o prato.',
    criteria: { sabor: 4, facilidade: 5, bolso: 3, repetir: 4 },
    pairing: ['Peixe grelhado', 'Moqueca', 'Arroz branco'], occasion: 'Almoço rápido de dia quente'
  }
}

export type Ribbon = { color: 'azul' | 'vermelha' | 'branca'; place: string }
// Como nas feiras de condado: fita azul é o primeiro lugar, vermelha o segundo, branca o terceiro.
export function ribbonFor(score: number): Ribbon {
  return score >= 4.7 ? { color: 'azul', place: '1º lugar' } : score >= 4.4 ? { color: 'vermelha', place: '2º lugar' } : { color: 'branca', place: '3º lugar' }
}
export const scoreLabel = (score: number) => score.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
