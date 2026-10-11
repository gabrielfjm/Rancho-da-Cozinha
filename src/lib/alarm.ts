// Som dos relógios da cozinha, gerado no próprio aparelho (sem arquivos de áudio).
// "Sussurro": ruído quase inaudível em loop que mantém o app vivo em segundo plano
// e faz o sistema mostrar a contagem no painel de mídia. "Triângulo": o sino de
// rancho que chama para a mesa, tocado em rajadas, como alarme.
const RATE = 32000

function wavUrl(samples: Float32Array) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const text = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)) }
  text(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, RATE, true); view.setUint32(28, RATE * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

function whisper() {
  const samples = new Float32Array(RATE * 10)
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * 0.0004
  return wavUrl(samples)
}

/** Triângulo de ferro batido por dentro: parciais inarmônicas, decaimento longo, duas rajadas por ciclo. */
function dinnerTriangle() {
  const samples = new Float32Array(Math.round(RATE * 4.4))
  const base = 1180
  const partials: [number, number, number][] = [[1, 1, 1.6], [2.72, 0.55, 1.1], [5.19, 0.42, 0.75], [8.43, 0.28, 0.5], [11.6, 0.16, 0.35]]
  const strikes: [number, number][] = []
  for (const start of [0, 2.2]) for (let k = 0; k < 13; k++) strikes.push([start + k * 0.085, (k % 2 ? 0.55 : 0.8) * (0.9 + Math.random() * 0.2)])
  for (const [at, strength] of strikes) {
    const from = Math.round(at * RATE)
    const length = Math.min(samples.length - from, Math.round(RATE * 1.8))
    for (const [ratio, amplitude, decay] of partials) {
      const step = (2 * Math.PI * base * ratio) / RATE
      for (let n = 0; n < length; n++) samples[from + n] += strength * amplitude * Math.exp(-n / (decay * RATE)) * Math.sin(step * n)
    }
  }
  let peak = 0
  for (const value of samples) peak = Math.max(peak, Math.abs(value))
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] / peak) * 0.85
  return wavUrl(samples)
}

let player: HTMLAudioElement | undefined
let sources: { whisper: string; bell: string } | undefined
let mode: 'off' | 'whisper' | 'bell' = 'off'

function ensurePlayer() {
  sources ??= { whisper: whisper(), bell: dinnerTriangle() }
  if (!player) { player = new Audio(); player.loop = true; player.preload = 'auto'; player.setAttribute('playsinline', '') }
  return player
}
function switchTo(next: 'whisper' | 'bell') {
  const audio = ensurePlayer()
  if (mode === next && !audio.paused) return
  mode = next
  audio.src = next === 'bell' ? sources!.bell : sources!.whisper
  audio.volume = 1
  void audio.play().catch(() => { mode = 'off' })
}

/** Chamar dentro de um toque: o navegador só libera áudio depois de um gesto. */
export function primeAudio() { if (mode === 'off') switchTo('whisper') }
export function ringBell() { switchTo('bell') }
export function keepAwake() { switchTo('whisper') }
export function silence() {
  if (!player || mode === 'off') return
  mode = 'off'; player.pause(); player.removeAttribute('src'); player.load()
}
export function audioMode() { return mode }
