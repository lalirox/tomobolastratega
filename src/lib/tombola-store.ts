// ─────────────────────────────────────────────────────────────
// Almacenamiento del estado compartido de la tómbola.
//
//  · EN VERCEL: cada invocación de la función es un proceso distinto,
//    así que el estado debe vivir en un almacén externo. Se usa
//    Upstash Redis (la misma tecnología detrás de Vercel KV) mediante
//    su API REST, SIN dependencias extra — solo dos variables de
//    entorno: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.
//    Grátis en el plan free de upstash.com o con la integración de
//    Upstash en el panel de Vercel.
//
//  · EN LOCAL / UN SOLO SERVIDOR: memoria del proceso, sin configurar
//    nada (perfecto para `bun run dev` o `bun run start`).
//
// Las escrituras son compare-and-set (CAS) con un script Lua para que
// dos peticiones simultáneas no pisen el mismo estado: si otra
// petición cambió el estado antes, la escritura falla y la ruta
// reintenta leyendo el valor fresco.
// ─────────────────────────────────────────────────────────────

const KEY = 'tombola:stratega:state'

const REST_URL = process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
export const usingRedis = Boolean(REST_URL && REST_TOKEN)

// CAS: solo escribe si el valor guardado sigue siendo el que leímos
// (false = clave no existía, se permite crearla)
const CAS_SCRIPT = `
local cur = redis.call("get", KEYS[1])
if cur == false then cur = "" end
if cur == ARGV[1] then
  redis.call("set", KEYS[1], ARGV[2])
  return 1
else
  return 0
end
`

interface UpstashResult {
  result: string | number | null
  error?: string
}

async function restGet(key: string): Promise<UpstashResult | null> {
  if (!REST_URL || !REST_TOKEN) return null
  const res = await fetch(`${REST_URL.replace(/\/$/, '')}/get/${key}`, {
    headers: { Authorization: `Bearer ${REST_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`)
  return (await res.json()) as UpstashResult
}

async function restEval(args: unknown[]): Promise<UpstashResult | null> {
  if (!REST_URL || !REST_TOKEN) return null
  const res = await fetch(`${REST_URL.replace(/\/$/, '')}/eval`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Upstash REST ${res.status}`)
  return (await res.json()) as UpstashResult
}

/** Lee el estado crudo (string JSON) o null si aún no existe */
export async function readRaw(): Promise<string | null> {
  if (usingRedis) {
    const data = await restGet(KEY)
    const result = data?.result
    return typeof result === 'string' && result.length > 0 ? result : null
  }
  return (globalThis as { __tombolaRaw?: string }).__tombolaRaw ?? null
}

/** Escribe con CAS: true si ganó la carrera, false si otro la ganó antes */
export async function casWrite(expected: string, next: string): Promise<boolean> {
  if (usingRedis) {
    const data = await restEval([CAS_SCRIPT, '1', KEY, expected, next])
    return data?.result === 1
  }
  const g = globalThis as { __tombolaRaw?: string }
  if ((g.__tombolaRaw ?? '') !== expected) return false
  g.__tombolaRaw = next
  return true
}
