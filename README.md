# 🎱 Tómbola del Rancho — Posada Stratega Consultores 2026

Tómbola web western (tema Yellowstone) para proyectar en pantalla grande y
controlar desde el celular. 100 números, tambor girando, historial, marcador,
sirena de alerta, protector de pantalla y códigos QR fijos.

## Vistas

| Vista | URL | Uso |
|---|---|---|
| 🖥️ Pantalla grande | `/` | Se proyecta: tambor, historial, marcador, ganador a pantalla completa |
| 📱 Control remoto | `/?control` | El celular del anfitrión: CANTAR NÚMERO, MANDAR ALERTA, BLOQUEAR PANTALLA |
| 🤠 La lista del jefe | `/?lista` | Privado: programa los números que saldrán (orden exacto) |
| 📄 Carteles QR | `/qr` | Página con los 2 QR fijos para imprimir o guardar (PNG) |

QRs fijos (el enlace nunca cambia): `/api/qr/control.png` y `/api/qr/lista.png`
(agrega `?download` para descargarlos directo).

- Tocar el **logo** en el encabezado de la pantalla grande → QR del control remoto (10 s).
- Presionar la marca **Y** → QR maestro del jefe (10 s, sin pistas visibles).
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

3. Vuelve a desplegar (*Deployments → Redeploy*) y listo: abre la URL de Vercel
   en la laptop (pantalla grande) y escanea el QR del logo desde tu celular.

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

## Arquitectura

- **Next.js App Router + TypeScript + Tailwind 4** — las 4 vistas y las API.
- **`/api/tombola`** — estado del juego compartido:
  - `GET` → estado actual (avanza el reloj: conteo 5→0, giro 1.9 s, sirena 3.5 s).
  - `POST` `{action}` → `press` · `alert` · `lock` · `reset` · `setQueue`.
- **`src/lib/tombola-engine.ts`** — motor puro basado en tiempo (sin timers),
  ideal para funciones serverless.
- **`src/lib/tombola-store.ts`** — estado en Upstash Redis (REST, con
  escritura *compare-and-set*) o en memoria del proceso en local.
- **`src/hooks/use-tombola.ts`** — polling adaptativo: 450 ms en acción
  (conteo/giro/alerta), 1.2 s en reposo.
- Contraseña del QR oculto del jefe: `Strategapool_2026`.
