// ─────────────────────────────────────────────────────────────
// Almacenamiento del estado compartido de la tómbola.
//
//  · EN VERCEL: cada invocación de la función es un proceso distinto,
//    así que el estado debe vivir en un almacén externo. Se usa
//    Upstash Redis (la misma tecnología detrás de Vercel KV) mediante
//    su API REST, SIN dependencias extra — solo dos variables de
//    entorno: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.
//    Grátis en el plan free de upstash.com o con la integración
//    Upstash en el panel de Vercel.
//
//  · EN LOCAL / UN SOLO SERVIDOR: memoria del proceso, sin configurar
//    nada (perfecto para `bun run dev` o `bun run start`).
//
// Las escrituras son compare-and-set (CAS) con un script Lua para que
// dos peticiones simultáneas no pisen el mismo estado: si otra
// petición cambió el estado antes, la escritura falla y la ruta
// reintenta leyendo el valor fresco.
//
// IMPORTANTE — la memoria NO sirve en Vercel: cada lambda tiene su
// propia copia, así que la pantalla grande y el celular no se
// sincronizan (y cada una calcula su propio número). Si eso ocurre el
// juego no funciona entre dispositivos. Por eso diagnoseStore() revisa
// la configuración y la interfaz lo avisa con una insignia en vez de
// fallar en silencio.
// ─────────────────────────────────────────────────────────────

const KEY = 'tombola:stratega:state'

const REST_URL = process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
export const usingRedis = Boolean(REST_URL && REST_TOKEN)

export type StoreMode = 'redis' | 'memoria'

export interface StoreInfo {
  /** Dónde vive el estado compartido */
  modo: StoreMode
  /** Host de Upstash (sin credenciales) para saber a qué apunta */
  host: string | null
  /** Qué está mal en la configuración (null si todo está bien) */
  problema: string | null
}

const SIN_SYNC =
  'El estado se guarda en la memoria de cada instancia: la pantalla grande y el celular NO se sincronizan.'

/**
 * Revisa la configuración del almacén y explica qué está mal.
 * Función pura (sin dependencias del entorno) para poder probarla.
 *
 * Caso real: alguien pegó la URL de Upstash VECTOR
 * (UPSTASH_VECTOR_REST_URL). Vector es otro producto, con otra API
 * (/query, /fetch) y su propio token: no habla /get ni /eval, así que
 * con esa URL las peticiones fallan. Y si solo falta la URL, el juego
 * cae en silencio a la memoria de cada lambda.
 */
export function diagnoseStore(url?: string, token?: string): string | null {
  if (!url) {
    return `Falta UPSTASH_REDIS_REST_URL. ${SIN_SYNC} Copia la URL de la pestaña Connect de tu base de datos Redis en upstash.com.`
  }
  if (/\/vector(\/|$)/i.test(url)) {
    return 'UPSTASH_REDIS_REST_URL apunta a un endpoint de Upstash Vector (/vector), que no habla la API de Redis. Copia la URL de la pestaña Connect de tu base de datos Redis (no la de Vector).'
  }
  if (!token) {
    return `Falta UPSTASH_REDIS_REST_TOKEN. ${SIN_SYNC}`
  }
  return null
}

/** Estado del almacén para la interfaz y para /api/health */
export function storeInfo(): StoreInfo {
  const problema = diagnoseStore(REST_URL, REST_TOKEN)
  let host: string | null = null
  if (REST_URL) {
    try {
      host = new URL(REST_URL).host
    } catch {
      host = '(URL inválida)'
    }
  }
  return { modo: usingRedis && !problema ? 'redis' : 'memoria', host, problema }
}

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

/**
 * Comprobación de vida: escribe y lee una llave de prueba con el mismo
 * camino que usa el juego (misma URL, mismo token, mismo /eval). Si esto
 * responde, la tómbola se sincroniza entre dispositivos.
 */
const PING_SCRIPT = `
redis.call("set", KEYS[1], "pong")
return redis.call("get", KEYS[1])
`

interface UpstashResult {
  result: string | number | null
  error?: string
}

/**
 * Cuerpo para ejecutar un script Lua en Upstash.
 *
 * OJO con el formato (esto ya rompió la producción una vez): la API REST
 * de Upstash recibe el comando completo como un array JSON y el PRIMER
 * elemento es el nombre del comando. Por eso es ["EVAL", script, ...] y
 * no [script, ...]. Con el orden equivocado Upstash responde 400
 * "ERR wrong number of arguments for 'eval' command" y la tómbola se
 * queda sin poder escribir nada.
 *
 * Formato verificado contra Upstash real (2026-11):
 *   POST {url}          body: ["EVAL", script, numkeys, key..., arg...]  → ok
 *   POST {url}/pipeline body: [["EVAL", script, numkeys, key..., arg...]] → ok
 *   POST {url}/eval     body: [script, numkeys, key..., arg...]  → 400 ✗
 */
export function evalBody(
  script: string,
  keys: string[],
  args: string[] = [],
): unknown[] {
  return ['EVAL', script, String(keys.length), ...keys, ...args]
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

/** Ejecuta un script Lua (formato verificado: ver evalBody) */
async function restEval(body: unknown[]): Promise<UpstashResult | null> {
  if (!REST_URL || !REST_TOKEN) return null
  const res = await fetch(REST_URL.replace(/\/$/, ''), {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const texto = await res.text().catch(() => '')
    throw new Error(
      `Upstash REST ${res.status}${texto ? `: ${texto.slice(0, 160)}` : ''}`,
    )
  }
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
    const data = await restEval(evalBody(CAS_SCRIPT, [KEY], [expected, next]))
    return data?.result === 1
  }
  const g = globalThis as { __tombolaRaw?: string }
  if ((g.__tombolaRaw ?? '') !== expected) return false
  g.__tombolaRaw = next
  return true
}

/**
 * Prueba de escritura y lectura contra Upstash. Sirve para comprobar
 * desde el navegador (en /api/health) que la configuración es correcta.
 */
export async function ping(): Promise<{ ok: boolean; detalle: string }> {
  if (!usingRedis) {
    return {
      ok: false,
      detalle: 'Sin Redis configurado: el estado vive en la memoria de cada instancia.',
    }
  }
  try {
    const data = await restEval(evalBody(PING_SCRIPT, [`${KEY}:ping`]))
    if (data?.result === 'pong') {
      return { ok: true, detalle: 'Redis responde: escritura y lectura correctas.' }
    }
    if (data?.error) {
      return { ok: false, detalle: `Upstash rechazó la operación: ${String(data.error).slice(0, 200)}` }
    }
    return {
      ok: false,
      detalle: `Respuesta inesperada de Upstash: ${JSON.stringify(data).slice(0, 200)}`,
    }
  } catch (e) {
    return { ok: false, detalle: `No se pudo contactar a Upstash: ${(e as Error).message}` }
  }
}
