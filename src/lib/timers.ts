import { useEffect, useState, useSyncExternalStore } from 'react'
import { normalize, uid } from './format'
import { keepAwake, ringBell, silence } from './alarm'

export type TimerKind = 'forno' | 'fogao' | 'geladeira' | 'descanso' | 'brasa' | 'geral'
export type RanchTimer = { id: string; recipeId: string; recipeTitle: string; step: number; kind: TimerKind; total: number; endsAt: number; firedAt?: number }

/** Lê o passo e descobre onde a comida está: forno, fogo, geladeira, descanso ou brasa. */
export function timerKind(text: string): TimerKind {
  const t = normalize(text)
  if (/churrasq|grelh|brasa|espeto/.test(t)) return 'brasa'
  if (/forno|\basse\b|\bassar|assad|gratin|air ?fryer|banho-maria/.test(t)) return 'forno'
  if (/geladeira|freezer|congel|\bgel(e|ar)|resfri/.test(t)) return 'geladeira'
  if (/descans|ferment|cresc|repous|de molho|marin|esfri/.test(t)) return 'descanso'
  if (/fogo|panela|frigideira|cozinh|ferv|refog|frit|doure|caramel|mexend|reduz/.test(t)) return 'fogao'
  return 'geral'
}

export const kindCopy: Record<TimerKind, { label: string; title: string; body: (recipe: string, step: number) => string }> = {
  forno: { label: 'Forno', title: 'Hora de tirar do forno!', body: recipe => `${recipe} está no ponto. Pegue a luva e retire do forno.` },
  fogao: { label: 'Fogão', title: 'Hora de desligar o fogo!', body: recipe => `Confira a panela de ${recipe} e desligue o fogo.` },
  geladeira: { label: 'Geladeira', title: 'Pode tirar da geladeira!', body: (recipe, step) => `${recipe} já gelou o suficiente. Siga para o passo ${step + 1}.` },
  descanso: { label: 'Descanso', title: 'O descanso acabou!', body: (recipe, step) => `${recipe} já pode seguir para o passo ${step + 1}.` },
  brasa: { label: 'Brasa', title: 'Hora de virar ou tirar da brasa!', body: recipe => `Confira ${recipe} na grelha antes que passe do ponto.` },
  geral: { label: 'Relógio', title: 'O relógio tocou!', body: (recipe, step) => `Confira o passo ${step} de ${recipe}.` }
}

export const remaining = (timer: RanchTimer, now: number) => Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

// Os relógios ficam guardados no aparelho com a hora de término; sobrevivem a recarregar e reabrir o app.
const KEY = 'rancho:relogios'
function load(): RanchTimer[] { try { const value = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(value) ? value : [] } catch { return [] } }
let timers: RanchTimer[] = typeof localStorage === 'undefined' ? [] : load()
const listeners = new Set<() => void>()
function commit(next: RanchTimer[]) {
  timers = next
  try { localStorage.setItem(KEY, JSON.stringify(timers)) } catch { /* armazenamento indisponível */ }
  listeners.forEach(listener => listener())
  tick()
}
export function useTimers() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => timers) }
export function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { if (!active) return; setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [active])
  return now
}

export function startTimer(input: { recipeId: string; recipeTitle: string; step: number; text: string; minutes: number }) {
  const timer: RanchTimer = { id: uid(), recipeId: input.recipeId, recipeTitle: input.recipeTitle, step: input.step, kind: timerKind(input.text), total: input.minutes * 60, endsAt: Date.now() + input.minutes * 60_000 }
  commit([...timers, timer])
  return timer
}
export function stopTimer(id: string) { void closeNotification(id); notified.delete(id); commit(timers.filter(timer => timer.id !== id)) }
export function snoozeTimer(id: string, minutes = 5) {
  void closeNotification(id); notified.delete(id)
  commit(timers.map(timer => timer.id === id ? { ...timer, firedAt: undefined, total: minutes * 60, endsAt: Date.now() + minutes * 60_000 } : timer))
}

/* ---------- Notificações (via service worker quando instalado) ---------- */
const notified = new Map<string, number>()
async function registration() { try { return await navigator.serviceWorker?.getRegistration() } catch { return undefined } }
async function notify(timer: RanchTimer, title: string, options: NotificationOptions & { renotify?: boolean; vibrate?: number[]; actions?: { action: string; title: string }[] }) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const full = { icon: '/icon-192.png', badge: '/favicon-32.png', tag: `rancho-relogio-${timer.id}`, data: { id: timer.id, recipeId: timer.recipeId }, ...options }
  const reg = await registration()
  if (reg) await reg.showNotification(title, full).catch(() => {})
  else try { new Notification(title, full) } catch { /* navegador sem suporte */ }
}
async function closeNotification(id: string) {
  const reg = await registration()
  const open = await reg?.getNotifications({ tag: `rancho-relogio-${id}` }).catch(() => [])
  open?.forEach(item => item.close())
}

/* ---------- Painel de mídia: contagem na barra de notificações e na tela de bloqueio ---------- */
function updateMedia(now: number) {
  if (!('mediaSession' in navigator)) return
  const ringing = timers.find(timer => timer.firedAt)
  const running = [...timers].filter(timer => !timer.firedAt).sort((a, b) => a.endsAt - b.endsAt)[0]
  const focus = ringing ?? running
  if (!focus) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; return }
  const copy = kindCopy[focus.kind]
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ringing ? copy.title : `${clock(remaining(focus, now))} · ${copy.label}`,
    artist: focus.recipeTitle,
    album: `Rancho da Cozinha · passo ${focus.step}`,
    artwork: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
  })
  navigator.mediaSession.playbackState = 'playing'
  try { navigator.mediaSession.setPositionState(ringing ? { duration: 1, position: 1, playbackRate: 1 } : { duration: focus.total, position: Math.min(focus.total, focus.total - remaining(focus, now)), playbackRate: 1 }) } catch { /* sem barra de progresso */ }
}
function bindMediaActions() {
  if (!('mediaSession' in navigator)) return
  // "Pausar" no painel desliga o alarme que estiver tocando; com relógio correndo, o sussurro volta a tocar.
  const handler = () => { const ringing = timers.filter(timer => timer.firedAt); if (ringing.length) ringing.forEach(timer => stopTimer(timer.id)); else keepAwake() }
  for (const action of ['pause', 'stop'] as MediaSessionAction[]) try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* ação não suportada */ }
  try { navigator.mediaSession.setActionHandler('play', () => keepAwake()) } catch { /* ação não suportada */ }
}

/* ---------- Motor: confere os relógios a cada segundo ---------- */
function tick() {
  const now = Date.now()
  const due = timers.filter(timer => !timer.firedAt && timer.endsAt <= now)
  if (due.length) {
    timers = timers.map(timer => due.some(d => d.id === timer.id) ? { ...timer, firedAt: now } : timer)
    try { localStorage.setItem(KEY, JSON.stringify(timers)) } catch { /* sem armazenamento */ }
    listeners.forEach(listener => listener())
    for (const timer of due) {
      const copy = kindCopy[timer.kind]
      navigator.vibrate?.([400, 150, 400, 150, 800])
      void notify(timer, copy.title, { body: copy.body(timer.recipeTitle, timer.step), requireInteraction: true, renotify: true, silent: false, vibrate: [400, 150, 400, 150, 800], actions: [{ action: 'stop', title: 'Desligar alarme' }, { action: 'snooze', title: 'Mais 5 min' }] })
    }
  }
  const ringing = timers.some(timer => timer.firedAt)
  const running = timers.filter(timer => !timer.firedAt)
  if (ringing) ringBell(); else if (running.length) keepAwake(); else silence()
  if (document.hidden) {
    for (const timer of running) {
      const minutes = Math.ceil(remaining(timer, now) / 60)
      if (notified.get(timer.id) === minutes) continue
      notified.set(timer.id, minutes)
      void notify(timer, `${kindCopy[timer.kind].label} · ${timer.recipeTitle}`, { body: minutes <= 1 ? `Falta menos de 1 minuto — passo ${timer.step}` : `Faltam ${minutes} min — passo ${timer.step}`, silent: true, renotify: false })
    }
  }
  updateMedia(now)
}
let engine: number | undefined
export function startTimerEngine() {
  if (engine) return
  bindMediaActions()
  engine = window.setInterval(tick, 1000)
  document.addEventListener('visibilitychange', () => {
    // De volta ao app: some a contagem silenciosa da barra (o alarme continua lá se estiver tocando).
    if (!document.hidden) for (const timer of timers) if (!timer.firedAt) { void closeNotification(timer.id); notified.delete(timer.id) }
    tick()
  })
  tick()
}
