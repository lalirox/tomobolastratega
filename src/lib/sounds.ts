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

// El navegador exige un gesto del usuario para reproducir audio. En la
// pantalla grande nadie toca nada, así que hay que crear el AudioContext
// y reanudarlo en cuanto haya cualquier interacción (o al montar, por si
// el sitio ya tiene permiso de sonido).
// Devuelve true si el audio quedó realmente listo para sonar.
export function primeAudio(): boolean {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return false
      ctx = new AC()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx.state === 'running'
  } catch {
    ctx = null
    return false
  }
}

/** ¿El audio ya está desbloqueado y puede sonar? */
export function isAudioReady(): boolean {
  return ctx?.state === 'running'
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

// ── Sonidos de archivo (mp3) precargados en el AudioContext ──
// alerta.mp3  → sirena de MANDAR ALERTA
// jackpot.mp3 → suena al iniciar una tirada (CANTAR NÚMERO)
const SIREN_URL = '/sonidos/alerta.mp3'
const JACKPOT_URL = '/sonidos/jackpot.mp3'

const buffers = new Map<string, AudioBuffer>()
const loading = new Map<string, Promise<void>>()

function loadSound(url: string): Promise<void> {
  if (!ctx) return Promise.resolve()
  if (buffers.has(url)) return Promise.resolve()
  const enCurso = loading.get(url)
  if (enCurso) return enCurso
  const p = fetch(url)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((data) => ctx!.decodeAudioData(data))
    .then((buf) => {
      buffers.set(url, buf)
    })
    .catch(() => {
      // si falla, se usa el sintetizado de respaldo
    })
    .finally(() => {
      loading.delete(url)
    })
  loading.set(url, p)
  return p
}

/** Precarga los sonidos de archivo (llamar tras desbloquear el audio) */
export function preloadSounds(): void {
  void loadSound(SIREN_URL)
  void loadSound(JACKPOT_URL)
}

function playBuffer(url: string, gain = 1): boolean {
  if (!ctx) return false
  const buf = buffers.get(url)
  if (!buf) {
    void loadSound(url)
    return false
  }
  try {
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(ctx.destination)
    src.start()
    return true
  } catch {
    return false
  }
}

// Sirena de alerta (archivo real; respaldo sintetizado)
export function playSiren() {
  if (!ctx || muted) return
  if (ctx.state === 'suspended') void ctx.resume()
  if (playBuffer(SIREN_URL, 1)) return
  playSynthSiren()
}

// Sonido de jackpot: suena al iniciar una tirada (CANTAR NÚMERO)
export function playJackpot() {
  if (!ctx || muted) return
  if (ctx.state === 'suspended') void ctx.resume()
  playBuffer(JACKPOT_URL, 1)
}

// Respaldo sintetizado: barrido sube-baja de 3 ciclos
function playSynthSiren() {
  if (!ctx || muted) return
  try {
    const t0 = ctx.currentTime
    const cycles = 3
    const cycle = 0.85
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sawtooth'
    osc2.type = 'square'
    for (let i = 0; i < cycles; i++) {
      const base = t0 + i * cycle
      osc.frequency.setValueAtTime(480, base)
      osc.frequency.linearRampToValueAtTime(940, base + cycle * 0.5)
      osc.frequency.linearRampToValueAtTime(480, base + cycle)
      osc2.frequency.setValueAtTime(240, base)
      osc2.frequency.linearRampToValueAtTime(470, base + cycle * 0.5)
      osc2.frequency.linearRampToValueAtTime(240, base + cycle)
    }
    const pico = 0.24
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(pico, t0 + 0.06)
    g.gain.setValueAtTime(pico, t0 + cycles * cycle - 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + cycles * cycle)
    osc.connect(g)
    osc2.connect(g)
    g.connect(ctx.destination)
    osc.start(t0)
    osc2.start(t0)
    osc.stop(t0 + cycles * cycle + 0.05)
    osc2.stop(t0 + cycles * cycle + 0.05)
  } catch {
    // silencio si falla
  }
}

// Clic del botón rojo
export function playClick() {
  beep(140, 0.09, 'sawtooth', 0.05)
}
