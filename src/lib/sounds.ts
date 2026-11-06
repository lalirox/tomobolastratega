// Efectos de sonido simples con Web Audio API (sin archivos externos)

let ctx: AudioContext | null = null
let muted = false

const STORAGE_KEY = 'tombola-mute'

export function loadMutePreference(): boolean {
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    muted = false
  }
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // ignore
  }
}

export function isMuted(): boolean {
  return muted
}

// El navegador exige un gesto del usuario para reproducir audio
export function primeAudio() {
  if (ctx) return
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AC) ctx = new AC()
  } catch {
    ctx = null
  }
}

function beep(freq: number, duration = 0.14, type: OscillatorType = 'square', gain = 0.06, when = 0) {
  if (!ctx || muted) return
  try {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime + when)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + duration)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(ctx.currentTime + when)
    osc.stop(ctx.currentTime + when + duration + 0.02)
  } catch {
    // silencio si falla
  }
}

// Tic de la cuenta atrás (bajo, tipo madera)
export function playTick(n: number) {
  beep(n === 0 ? 520 : 320, 0.16, 'square', 0.07)
  if (n === 0) beep(390, 0.22, 'square', 0.06, 0.12)
}

// Redoble breve mientras gira el tambor
export function playRoll() {
  for (let i = 0; i < 10; i++) {
    beep(180 + Math.random() * 120, 0.05, 'triangle', 0.035, i * 0.11)
  }
}

// Fanfarria al cantar el número
export function playFanfare() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => beep(f, 0.18, 'square', 0.06, i * 0.13))
  beep(1046.5, 0.5, 'square', 0.05, notes.length * 0.13)
}

// Clic del botón rojo
export function playClick() {
  beep(140, 0.09, 'sawtooth', 0.05)
}
