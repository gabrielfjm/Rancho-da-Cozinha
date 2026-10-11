import Dexie, { type EntityTable } from 'dexie'
import { createClient } from '@supabase/supabase-js'
import type { Collection, CookLog, IngredientBase, LocalState, Recipe, ShoppingItem } from '../types'
import { examples } from '../data/examples'
import { uid } from './format'

export type TableName = 'recipes' | 'personal_ingredients' | 'collections' | 'shopping_items' | 'cook_logs'
type Payload = Recipe | IngredientBase | Collection | ShoppingItem | CookLog
type RecordRow = { key: string; scope: string; table: TableName; id: string; payload: Payload; updatedAt: string; deleted: boolean }
type OutboxRow = { id?: number; key: string; scope: string }
class RanchoDB extends Dexie {
  records!: EntityTable<RecordRow, 'key'>
  outbox!: EntityTable<OutboxRow, 'id'>
  constructor() { super('rancho-da-cozinha'); this.version(1).stores({ records: 'key,scope,table', outbox: '++id,scope,key' }) }
}
const db = new RanchoDB()
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase = url && key ? createClient(url, key) : null
export const configured = Boolean(supabase)
const seedTasks = new Map<string, Promise<void>>()

const tables: TableName[] = ['recipes', 'personal_ingredients', 'collections', 'shopping_items', 'cook_logs']
export async function loadState(scope: string): Promise<LocalState> {
  let rows = await db.records.where('scope').equals(scope).toArray()
  const active = rows.filter(row => !row.deleted)
  return {
    recipes: active.filter(row => row.table === 'recipes').map(row => row.payload as Recipe),
    customIngredients: active.filter(row => row.table === 'personal_ingredients').map(row => row.payload as IngredientBase),
    collections: active.filter(row => row.table === 'collections').map(row => row.payload as Collection),
    shopping: active.filter(row => row.table === 'shopping_items').map(row => row.payload as ShoppingItem),
    cookLogs: active.filter(row => row.table === 'cook_logs').map(row => row.payload as CookLog)
  }
}
export async function seedAccount(scope: string) {
  if (scope === 'guest') return
  const running = seedTasks.get(scope)
  if (running) return running
  const task = (async () => {
    const recipeRows = (await db.records.where('scope').equals(scope).toArray()).filter(row => row.table === 'recipes' && !row.deleted)
    const exampleTitles = new Set(examples.map(recipe => recipe.title))
    const seen = new Set<string>()
    for (const row of recipeRows) {
      const recipe = row.payload as Recipe
      if (recipe.source !== 'Caderno do Rancho' || !exampleTitles.has(recipe.title)) continue
      if (!seen.has(recipe.title)) { seen.add(recipe.title); continue }
      await db.records.delete(row.key)
      await db.outbox.where('key').equals(row.key).delete()
    }
    const remaining = (await db.records.where('scope').equals(scope).toArray()).some(row => row.table === 'recipes' && !row.deleted)
    if (remaining) return
    for (const example of examples) await saveEntity(scope, 'recipes', { ...example, id: uid(), ownerId: scope, ingredients: example.ingredients.map(i => ({ ...i, id: uid() })), steps: example.steps.map(s => ({ ...s, id: uid() })) }, true)
  })()
  seedTasks.set(scope, task)
  try { await task } finally { seedTasks.delete(scope) }
}
export async function saveEntity(scope: string, table: TableName, payload: Payload, queue = true) {
  const key = `${scope}:${table}:${payload.id}`
  await db.records.put({ key, scope, table, id: payload.id, payload, updatedAt: new Date().toISOString(), deleted: false })
  if (queue && scope !== 'guest') await db.outbox.add({ key, scope })
}
export async function deleteEntity(scope: string, table: TableName, id: string) {
  const key = `${scope}:${table}:${id}`
  const row = await db.records.get(key)
  if (!row) return
  await db.records.put({ ...row, deleted: true, updatedAt: new Date().toISOString() })
  if (scope !== 'guest') await db.outbox.add({ key, scope })
}
export async function sync(scope: string): Promise<void> {
  if (!supabase || scope === 'guest' || !navigator.onLine) return
  const pending = await db.outbox.where('scope').equals(scope).toArray()
  for (const entry of pending) {
    const row = await db.records.get(entry.key)
    if (!row) { if (entry.id) await db.outbox.delete(entry.id); continue }
    const { error } = await supabase.from(row.table).upsert({
      id: row.id, owner_id: scope, payload: row.payload,
      updated_at: row.updatedAt, deleted_at: row.deleted ? row.updatedAt : null,
      ...(row.table === 'recipes' ? { shared: (row.payload as Recipe).shared ?? false } : {})
    })
    if (error) throw error
    if (entry.id) await db.outbox.delete(entry.id)
  }
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('id,payload,updated_at,deleted_at').eq('owner_id', scope)
    if (error) throw error
    for (const remote of data ?? []) {
      const recordKey = `${scope}:${table}:${remote.id}`
      const local = await db.records.get(recordKey)
      if (!local || new Date(remote.updated_at).getTime() >= new Date(local.updatedAt).getTime()) {
        await db.records.put({ key: recordKey, scope, table, id: remote.id, payload: remote.payload, updatedAt: remote.updated_at, deleted: Boolean(remote.deleted_at) })
      }
    }
  }
}
export async function pendingChanges(scope: string) {
  if (scope === 'guest') return 0
  return new Set((await db.outbox.where('scope').equals(scope).toArray()).map(entry => entry.key)).size
}
export async function clearScope(scope: string) {
  await db.records.where('scope').equals(scope).delete()
  await db.outbox.where('scope').equals(scope).delete()
}
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível comprimir a foto.')), 'image/jpeg', 0.8))
}
export async function uploadImage(scope: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  if (supabase && scope !== 'guest' && navigator.onLine) {
    const path = `${scope}/${uid()}.jpg`
    const { error } = await supabase.storage.from('recipe-photos').upload(path, blob, { contentType: 'image/jpeg' })
    if (error) throw error
    return `storage:${path}`
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
export async function uploadAvatar(scope: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  if (!supabase || scope === 'guest' || !navigator.onLine) throw new Error('Conecte-se à internet para atualizar sua foto.')
  const path = `${scope}/profile/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from('recipe-photos').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return `storage:${path}`
}
export async function photoUrl(value?: string): Promise<string | undefined> {
  if (!value || !value.startsWith('storage:') || !supabase) return value
  const { data } = await supabase.storage.from('recipe-photos').createSignedUrl(value.slice(8), 3600)
  return data?.signedUrl
}
