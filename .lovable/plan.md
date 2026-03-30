

# Widget de Giveaways para Instagram

## Resumen
Crear un widget de sorteos (giveaways) en la sección de Contenido que permita seleccionar una publicación de Instagram, obtener sus comentarios, validar condiciones y elegir un ganador aleatorio. Solo visible para el cliente "petshop2go".

## Arquitectura

```text
┌─────────────────────────────────────┐
│  GiveawayWidget (componente UI)     │
│  ├─ Selector de publicación (IG)    │
│  ├─ Condiciones del giveaway        │
│  ├─ Lista de participantes válidos  │
│  └─ Botón "Elegir ganador"          │
└──────────────┬──────────────────────┘
               │ invoca
               ▼
┌─────────────────────────────────────┐
│  meta-api edge function             │
│  nuevo endpoint: 'instagram-comments│
│  GET /{media-id}/comments           │
│  + GET /{comment-user}/             │
│  (followers_count, following, etc)  │
└─────────────────────────────────────┘
```

## Plan de implementación

### 1. Nuevo endpoint en `meta-api` edge function
- Agregar case `'instagram-comments'` que reciba un `mediaId`
- Llama a `GET /{mediaId}/comments?fields=id,text,timestamp,username,from&limit=500` con paginación
- Deduplica comentarios por username (una entrada por persona)
- Retorna lista de comentarios con info del usuario

### 2. Componente `GiveawayWidget`
Ubicación: `src/components/dashboard/GiveawayWidget.tsx`

Funcionalidad:
- **Selector de publicación**: dropdown con las publicaciones de Instagram del cliente (reusar data de `useContentData`)
- **Configuración de condiciones**: checkboxes para filtros como "debe seguir a X cuenta", "debe mencionar a N amigos en el comentario", "debe usar hashtag X"
- **Carga de comentarios**: botón para obtener comentarios de la publicación seleccionada vía el nuevo endpoint
- **Deduplicación**: agrupar por username, mostrar solo una entrada por persona
- **Tabla de participantes**: lista filtrable mostrando username, comentario, si cumple condiciones
- **Sorteo**: botón que selecciona aleatoriamente un ganador de los participantes válidos, con animación visual
- **Resultado**: card destacada con el ganador

### 3. Integrar en `Contenido.tsx`
- Mostrar el widget solo cuando `selectedClient?.name` incluya "petshop2go" (o mejor, agregar un feature flag `giveaway` en el futuro)
- Colocarlo después de la sección de Stories y antes del Content Calendar

### 4. Validación de condiciones del giveaway
Las condiciones se configuran en el UI antes de ejecutar el sorteo:
- **Menciones mínimas**: filtrar comentarios que mencionen al menos N cuentas (@usuario)
- **Hashtag requerido**: comentario debe incluir cierto hashtag
- **Seguidor requerido**: (si la API lo permite) verificar que el usuario siga ciertas cuentas — nota: la Graph API no expone esto para usuarios arbitrarios, así que esta condición sería manual/honor-based
- **Comentarios duplicados**: automáticamente se toma solo el primer comentario de cada usuario

## Detalles técnicos

- El endpoint de comentarios de Instagram Graph API v21.0: `GET /{media-id}/comments?fields=id,text,timestamp,username,from{id,username}`
- Paginación con cursor `after` para obtener todos los comentarios
- La deduplicación por username se hace en el frontend para que el usuario vea el conteo total vs. participantes únicos
- No se requiere nueva tabla en base de datos (el widget es stateless — solo consulta y sortea en tiempo real)

