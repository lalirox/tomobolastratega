#!/bin/bash
# Lanzador desacoplado: el doble fork deja el servicio huérfano (PPid 1)
# para que el sandbox no lo mate al terminar el comando.
cd "$(dirname "$0")"
pkill -f "bun index.ts" 2>/dev/null
sleep 0.5
( setsid nohup bun index.ts > service.log 2>&1 < /dev/null & )
echo "servicio lanzado"
