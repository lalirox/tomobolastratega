# 🎱 Tómbola del Rancho — Posada Stratega Consultores 2026

Tómbola web western (tema Yellowstone) para proyectar en pantalla grande y
controlar desde el celular. 100 números, tambor girando, historial, marcador,
sirena de alerta y protector de pantalla.

## Vistas

| Vista | URL | Uso |
|---|---|---|
| 🖥️ Pantalla grande | `/` | Se proyecta: tambor, historial, marcador, ganador a pantalla completa |
| 📱 Control remoto | `/?control` | El celular del anfitrión: CANTAR NÚMERO, MANDAR ALERTA, BLOQUEAR PANTALLA |
| 🤠 La lista del jefe | `/?lista` | Privado: programa los números que saldrán (orden exacto) |

## Los QR guardados no cambian nunca

Los códigos QR ya están impresos/guardados fuera del sistema, así que la web
ya no muestra ningún QR. Lo que garantiza que sigan sirviendo para siempre:

- Las **rutas de destino son permanentes**: `/?control` y `/?lista`.
  No se renombran ni se eliminan en ninguna versión futura.
- Si algún día necesitas volver a generar los PNG (por ejemplo si cambias de
  dominio en Vercel), siguen disponibles en:
  `TU-DOMINIO/api/qr/control.png?download=1` y `TU-DOMINIO/api/qr/lista.png?download=1`.
  El QR se genera con el dominio por el que entres, apuntando siempre a esas
  mismas rutas.

> Nota: si tus QR guardados se generaron con un dominio distinto al de la
> instalación final (por ejemplo el de pruebas), vuelve a descargar los PNG
> desde el dominio definitivo una vez desplegado en Vercel.

- **BLOQUEAR PANTALLA** (solo en el celular) → la pantalla grande pasa a reposo:
  logo + LA GRAN NOCHE + POSADA STRATEGA CONSULTORES 2026. También se activa
  sola tras 3 minutos sin tocar nada; cualquier toque la despierta.

## Desplegar en Vercel

1. Sube este repo a GitHub y en [vercel.com](https://vercel.com) → *Add New →
   Project* → importa el repo → **Deploy** (detecta Next.js solo, no toques
   ninguna opción de configuración).
2. **IMPORTANTE — sincronización en tiempo real:** Vercel no permite procesos
   persistentes, así que el estado del juego se guarda en Redis vía API REST.
   Crea una base de datos gratis en [upstash.com](https://upstash.com)
   (o con la integración *Upstash* del panel de Vercel) y agrega en
   *Settings → Environment Variables* estas dos variables (producción):

   ```
   UPSTASH_REDIS_REST_URL = https://tu-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN = AXxx...=
   ```

   Sin ellas la página carga pero cada instancia de Vercel tendría su propia
   memoria y la pantalla y el celular podrían no sincronizarse. En local no
   hacen falta.

   > **Ojo con el nombre.** La variable se llama `UPSTASH_REDIS_REST_URL`.
   > Si copias la de **Upstash Vector** (`UPSTASH_VECTOR_REST_URL`) la web
   > seguirá cargando pero **sin sincronizar**: Vector es otro producto, con
   > otra API (`/query`, `/fetch`) y no habla los comandos de Redis que usa
   > la tómbola (`/get`, `/eval`). Y si la URL falta por completo, la web
   > cae en silencio a la memoria de cada instancia. Para evitar sorpresas,
   > compruébalo en `/api/health` y mira la insignia roja de la pantalla.

3. Vuelve a desplegar (*Deployments → Redeploy*) y listo: abre la URL de Vercel
   en la laptop (pantalla grande) y escanea el QR del logo desde tu celular.

## Comprobar que todo funciona

Abre `https://TU-DOMINIO/api/health` en el navegador:

```json
{
  "ok": true,
  "modo": "redis",
  "host": "quiet-mouse-12345.upstash.io",
  "problema": null,
  "detalle": "Redis responde: escritura y lectura correctas.",
  "estadoGuardado": true
}
```

- `ok: true` → el estado se comparte: la pantalla y el celular se sincronizan.
- `ok: false` → **no se sincronizan**. El campo `problema` dice qué variable
  corregir (falta la URL, falta el token, o es la URL de Vector).
- `estadoGuardado: false` → Redis responde pero todavía no se ha jugado
  ninguna ronda (normal al empezar).

Mientras el modo sea `memoria`, la pantalla grande y el celular muestran
una insignia roja de **"SIN SINCRONIZACIÓN"**: el juego no funciona entre
dispositivos y así se nota de inmediato en el proyector.

## Correr en local

```bash
bun install
bun run dev        # http://localhost:3000
```

Producción local (un solo equipo, sin Vercel ni Redis):

```bash
bun run build
bun run start
```

Pruebas (motor, servidor y presentación de la pantalla):

```bash
bun test
```

## Reglas que no deben romperse

Estas son las invariantes del juego en vivo. Cada una está cubierta por
`tests/tombola.test.ts`.

1. **Un número cantado se presenta SIEMPRE.** El contador `revealSeq`
   avisa de que se materializó una bola, y la pantalla la muestra aunque
   la fase ya haya avanzado (por ejemplo, si el anfitrión pidió la
   siguiente tirada antes de que la pantalla lo notara). Antes, si la
   fase ya no era `revealed`, el número se perdía: al volver a la tómbola
   el público veía **otro** número distinto al que había salido.
2. **El reloj gana contra la acción.** En el servidor, el reloj avanza
   primero (es el que suelta la bola) y la acción se aplica sobre el
   estado ya avanzado. Si al avanzar se cantó un número y la acción iba
   a cambiar la fase (`press` o `alert`), se rechaza como `busy`: primero
   se presenta el número.
3. **El motor es puro.** La bola se elige con una semilla derivada del
   propio estado, nunca con `Math.random()`. Así, dos peticiones que
   leen lo mismo eligen la **misma** bola y la pantalla y el celular no
   pueden ver números distintos.
4. **Si el CAS falla, se devuelve el estado guardado**, nunca uno
   calculado en local: si no, el cliente vería un número que no es el
   que quedó en el almacén.
5. **Los contadores solo crecen** (`alertSeq`, `lockSeq`, `revealSeq`).
   "Nueva Ronda" limpia el historial y la lista del jefe, pero no los
   contadores: si los reiniciara, una pantalla con la página abierta
   volvería a mostrar el último número.

## Arquitectura

- **Next.js App Router + TypeScript + Tailwind 4** — las 4 vistas y la API.
- **`/api/tombola`** — estado del juego compartido:
  - `GET` → `{state, store}` (avanza el reloj: conteo 5→0, giro 1.9 s, sirena 3.5 s).
  - `POST` `{action}` → `press` · `alert` · `lock` · `reset` · `setQueue`.
- **`/api/health`** — comprueba el almacén compartido (ping real a Redis).
- **`src/lib/tombola-engine.ts`** — motor puro basado en tiempo (sin timers),
  ideal para funciones serverless.
- **`src/lib/tombola-cycle.ts`** — ciclo del servidor (leer → avanzar →
  actuar → escribir con CAS) y normalización del estado guardado.
- **`src/lib/tombola-present.ts`** — regla de presentación de la pantalla
  grande (qué overlay se abre y cuándo se cierra).
- **`src/lib/tombola-store.ts`** — estado en Upstash Redis (REST, con
  escritura *compare-and-set*) o en memoria del proceso en local.
- **`src/hooks/use-tombola.ts`** — polling adaptativo: 450 ms en acción
  (conteo/giro/ganador/alerta), 1.2 s en reposo.
- Contraseña del QR oculto del jefe: `Strategapool_2026`.

