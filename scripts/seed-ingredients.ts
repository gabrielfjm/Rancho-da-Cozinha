import { createClient } from '@supabase/supabase-js'
import ingredients from '../src/data/ingredients.json'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
const supabase = createClient(url, key, { auth: { persistSession: false } })
for (let i = 0; i < ingredients.length; i += 100) {
  const batch = ingredients.slice(i, i + 100).map(item => ({
    id: item.id, name: item.name, aliases: item.aliases, category: item.category,
    units: item.units, default_unit: item.defaultUnit, grams_per_unit: item.gramsPerUnit,
    nutrition: 'nutrition' in item ? item.nutrition : null, source: item.source
  }))
  const { error } = await supabase.from('ingredients').upsert(batch, { onConflict: 'id' })
  if (error) throw error
  console.log(`${Math.min(i + 100, ingredients.length)}/${ingredients.length}`)
}
