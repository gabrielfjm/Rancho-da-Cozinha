export function parseAmount(value: string): number | null {
  const clean = value.trim().replace(',', '.').replace(/¼/g, ' 1/4').replace(/½/g, ' 1/2').replace(/¾/g, ' 3/4').replace(/⅓/g, ' 1/3').replace(/⅔/g, ' 2/3').replace(/⅛/g, ' 1/8')
  if (!clean) return null
  const parts = clean.split(/\s+/).filter(Boolean)
  const total = parts.reduce((sum, part) => {
    if (part.includes('/')) { const [a, b] = part.split('/').map(Number); return sum + (b ? a / b : NaN) }
    return sum + Number(part)
  }, 0)
  return Number.isFinite(total) && total > 0 ? total : null
}
export function prettyAmount(value: number | null): string {
  if (value === null) return 'a gosto'
  const whole = Math.floor(value)
  const fraction = value - whole
  const common: [number, string][] = [[0, ''], [1/8, '⅛'], [1/4, '¼'], [1/3, '⅓'], [1/2, '½'], [2/3, '⅔'], [3/4, '¾'], [7/8, '⅞']]
  const match = common.find(([n]) => Math.abs(n - fraction) < 0.025)
  if (match) return `${whole || ''}${whole && match[1] ? ' ' : ''}${match[1]}` || '0'
  return Number(value.toFixed(2)).toLocaleString('pt-BR')
}
export function amountUnit(unit: string, amount: number | null): string {
  if (amount === null || amount <= 1) return unit
  const plural: Record<string, string> = {
    unidade: 'unidades', xícara: 'xícaras', 'colher de sopa': 'colheres de sopa',
    'colher de chá': 'colheres de chá', colher: 'colheres', dente: 'dentes',
    fatia: 'fatias', lata: 'latas', pacote: 'pacotes', punhado: 'punhados', ramo: 'ramos'
  }
  return plural[unit] ?? unit
}
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
export function uid() { return crypto.randomUUID() }
export function gramsFor(amount: number | null, unit: string, factors: Record<string, number>) {
  if (amount === null) return null
  const factor = factors[unit]
  return factor ? amount * factor : null
}
