import { useEffect, useState, useSyncExternalStore } from 'react'
import { normalize, uid } from './format'
import { keepAwake, pauseWhisper, ringBell, silence } from './alarm'

export type TimerKind = 'forno' | 'fogao' | 'geladeira' | 'descanso' | 'brasa' | 'geral'
export type RanchTimer = { id: string; recipeId: string; recipeTitle: string; step: number; stepText?: string; kind: TimerKind; total: number; base?: number; endsAt: number; firedAt?: number; pausedLeft?: number }

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

export const remaining = (timer: RanchTimer, now: number) => timer.pausedLeft ?? Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
export const isPaused = (timer: RanchTimer) => timer.pausedLeft !== undefined
const running = (timer: RanchTimer) => !timer.firedAt && !isPaused(timer)
export function clock(seconds: number) {
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

// Os relógios ficam guardados no aparelho com a hora de término; sobrevivem a recarregar e reabrir o app.
const KEY = 'rancho:relogios'
function load(): RanchTimer[] { try { const value = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(value) ? value : [] } catch { return [] } }
const sameStep = (a: Pick<RanchTimer, 'recipeId' | 'step'>, b: Pick<RanchTimer, 'recipeId' | 'step'>) => a.recipeId === b.recipeId && a.step === b.step
const saved = typeof localStorage === 'undefined' ? [] : load()
let timers: RanchTimer[] = saved.filter((timer, index, all) => all.findIndex(other => sameStep(other, timer)) === index)
if (timers.length !== saved.length) try { localStorage.setItem(KEY, JSON.stringify(timers)) } catch { /* sem armazenamento */ }
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

export const timerForStep = (recipeId: string, step: number) => timers.find(timer => sameStep(timer, { recipeId, step }))
/** Um relógio por passo: se o passo já tem relógio, devolve o existente em vez de criar outro. */
export function startTimer(input: { recipeId: string; recipeTitle: string; step: number; text: string; minutes: number }) {
  const existing = timerForStep(input.recipeId, input.step)
  if (existing) return existing
  const timer: RanchTimer = { id: uid(), recipeId: input.recipeId, recipeTitle: input.recipeTitle, step: input.step, stepText: input.text, kind: timerKind(input.text), total: input.minutes * 60, base: input.minutes * 60, endsAt: Date.now() + input.minutes * 60_000 }
  commit([...timers, timer])
  return timer
}
function update(id: string, change: (timer: RanchTimer, now: number) => RanchTimer) {
  const now = Date.now()
  void closeNotification(id); notified.delete(id)
  commit(timers.map(timer => timer.id === id ? change(timer, now) : timer))
}
export function stopTimer(id: string) { void closeNotification(id); notified.delete(id); if (clockId === id) closeClock(); commit(timers.filter(timer => timer.id !== id)) }
export function snoozeTimer(id: string, minutes = 5) { update(id, (timer, now) => ({ ...timer, firedAt: undefined, pausedLeft: undefined, total: minutes * 60, endsAt: now + minutes * 60_000 })) }
export function pauseTimer(id: string) { update(id, (timer, now) => timer.firedAt || isPaused(timer) ? timer : { ...timer, pausedLeft: remaining(timer, now) }) }
export function resumeTimer(id: string) { update(id, (timer, now) => isPaused(timer) ? { ...timer, endsAt: now + timer.pausedLeft! * 1000, pausedLeft: undefined } : timer) }
/** Reiniciar volta ao tempo da receita, sem os minutos somados depois. */
export function restartTimer(id: string) { update(id, (timer, now) => { const total = timer.base ?? timer.total; return { ...timer, total, firedAt: undefined, pausedLeft: isPaused(timer) ? total : undefined, endsAt: now + total * 1000 } }) }
export function addMinute(id: string) {
  update(id, (timer, now) => {
    const left = remaining(timer, now) + 60
    return { ...timer, total: Math.max(timer.total, left), ...(isPaused(timer) ? { pausedLeft: left } : { endsAt: timer.endsAt + 60_000 }) }
  })
}

/* ---------- Tela do relógio: qual relógio está aberto em tela cheia ---------- */
let clockId: string | null = null
const clockListeners = new Set<() => void>()
export function openClock(id: string) { clockId = id; clockListeners.forEach(listener => listener()) }
export function closeClock() { clockId = null; clockListeners.forEach(listener => listener()) }
export function useClockView() { return useSyncExternalStore(listener => { clockListeners.add(listener); return () => { clockListeners.delete(listener) } }, () => clockId) }

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
  const soonest = [...timers].filter(running).sort((a, b) => a.endsAt - b.endsAt)[0]
  const focus = ringing ?? soonest ?? timers.find(isPaused)
  if (!focus) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; return }
  const copy = kindCopy[focus.kind]
  navigator.mediaSession.metadata = new MediaMetadata({
    title: ringing ? copy.title : `${isPaused(focus) ? 'Pausado · ' : ''}${clock(remaining(focus, now))} · ${copy.label}`,
    artist: focus.recipeTitle,
    album: `Rancho da Cozinha · passo ${focus.step}`,
    artwork: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
  })
  navigator.mediaSession.playbackState = isPaused(focus) ? 'paused' : 'playing'
  try { navigator.mediaSession.setPositionState(ringing ? { duration: 1, position: 1, playbackRate: 1 } : { duration: focus.total, position: Math.min(focus.total, focus.total - remaining(focus, now)), playbackRate: 1 }) } catch { /* sem barra de progresso */ }
}
function bindMediaActions() {
  if (!('mediaSession' in navigator)) return
  // Pausar no painel desliga o alarme que estiver tocando ou pausa o relógio mais próximo; tocar retoma.
  const pause = () => {
    const ringing = timers.filter(timer => timer.firedAt)
    if (ringing.length) { ringing.forEach(timer => stopTimer(timer.id)); return }
    const next = [...timers].filter(running).sort((a, b) => a.endsAt - b.endsAt)[0]
    if (next) pauseTimer(next.id)
  }
  const play = () => { const paused = timers.find(isPaused); if (paused) resumeTimer(paused.id); else keepAwake() }
  for (const [action, handler] of [['pause', pause], ['stop', pause], ['play', play]] as [MediaSessionAction, () => void][]) try { navigator.mediaSession.setActionHandler(action, handler) } catch { /* ação não suportada */ }
}

/* ---------- Motor: confere os relógios a cada segundo ---------- */
function tick() {
  const now = Date.now()
  const due = timers.filter(timer => running(timer) && timer.endsAt <= now)
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
  const counting = timers.filter(running)
  // Pausado: o som para, mas o painel de mídia continua com o botão de retomar.
  if (ringing) ringBell(); else if (counting.length) keepAwake(); else if (timers.length) pauseWhisper(); else silence()
  if (document.hidden) {
    for (const timer of counting) {
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
