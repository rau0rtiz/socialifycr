

# Agregar filtro por campaña al AdGridSelector

## Cambio

### `src/components/ventas/AdGridSelector.tsx`
- Extraer la lista única de campañas (`campaignId` + `campaignName`) del array de `ads`
- Agregar un **Select dropdown** (o chips horizontales) debajo del buscador que permita filtrar por campaña específica
  - Opción por defecto: "Todas las campañas"
  - Cada opción muestra el nombre de la campaña
- Agregar estado `selectedCampaignId` (string | null)
- Modificar `filteredAds` para aplicar el filtro de campaña además de la búsqueda de texto
- Al limpiar búsqueda o cambiar campaña, los filtros se combinan (AND)

## Diseño visual
```text
┌─────────────────────────────────┐
│ 🔍 Buscar anuncio...            │
│ [▼ Todas las campañas        ]  │ ← Select dropdown
├─────────────────────────────────┤
│  Grid de anuncios filtrados     │
└─────────────────────────────────┘
```

## Archivo
- `src/components/ventas/AdGridSelector.tsx`

