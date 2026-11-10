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

// ─────────────────────────────────────────────────────────────
// Alerta estilo "alerta sísmica": en vez de un barrido continuo (que
// suena a sirena de fábrica), alterna DOS tonos —una cuarta justa
// arriba/abajo— con pulsos marcados, timbre duro pero filtrado y una
// suboctava que le da cuerpo. Es el patrón "bip-bop-bip-bop" que la
// gente reconoce como aviso de emergencia.
//
// La duración la fija ALERT_MS (3.5 s en el motor): el sonido ocupa
// ~3.3 s para no quedar cortado ni invadir el final del overlay.
// ─────────────────────────────────────────────────────────────
export function playSiren() {
  if (!ctx || muted) return
  try {
    const t0 = ctx.currentTime + 0.02
    const DUR = 3.3
    const STEP = 0.24 // duración de cada tono (~4 alternancias por segundo)
    const HI = 1046.5 // Do6
    const LO = 783.99 // Sol5 (cuarta justa abajo)

    // Filtro: recorta los agudos más molestos sin quitarle filo
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.value = 3200
    filtro.Q.value = 0.7

    // Ganancia maestra: aquí se dibuja el pulso de cada tono
    const master = ctx.createGain()
    master.gain.value = 0
    filtro.connect(master)
    master.connect(ctx.destination)

    // Dos osciladores desafinados (más áspero) + suboctava (cuerpo)
    const a = ctx.createOscillator()
    a.type = 'square'
    const b = ctx.createOscillator()
    b.type = 'sawtooth'
    const sub = ctx.createOscillator()
    sub.type = 'triangle'
    a.connect(filtro)
    b.connect(filtro)
    sub.connect(filtro)

    const notas = Math.floor(DUR / STEP)

    // Alternancia de tonos
    for (let i = 0; i < notas; i++) {
      const t = t0 + i * STEP
      const f = i % 2 === 0 ? HI : LO
      a.frequency.setValueAtTime(f, t)
      b.frequency.setValueAtTime(f * 1.006, t)
      sub.frequency.setValueAtTime(f / 2, t)
    }

    // Un pulso de amplitud por tono: ataque seco y caída corta, para que
    // se oiga "golpeado" y no como un tono sostenido
    const pico = 0.15
    master.gain.setValueAtTime(0.0001, t0)
    for (let i = 0; i < notas; i++) {
      const t = t0 + i * STEP
      master.gain.setValueAtTime(0.0001, t)
      master.gain.exponentialRampToValueAtTime(pico, t + 0.012)
      master.gain.exponentialRampToValueAtTime(0.045, t + STEP * 0.82)
    }
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + notas * STEP)

    const fin = t0 + notas * STEP + 0.05
    a.start(t0)
    b.start(t0)
    sub.start(t0)
    a.stop(fin)
    b.stop(fin)
    sub.stop(fin)
  } catch {
    // silencio si falla
  }
}

// Clic del botón rojo
export function playClick() {
  beep(140, 0.09, 'sawtooth', 0.05)
}
