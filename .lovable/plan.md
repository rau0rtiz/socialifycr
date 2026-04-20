

## Código muerto y duplicado para quitar

Hice un escaneo completo del proyecto. Aquí lo que no se usa o está duplicado:

### 1. Páginas huérfanas (rutas sin enlace en el sidebar)

| Archivo | Estado | Razón |
|---|---|---|
| `src/pages/EmailMarketing.tsx` | Ruta `/email-marketing` registrada, **no está en el Sidebar** | Reemplazada por `/comunicaciones` (CampaignsContent) |
| `src/pages/EmailsLog.tsx` | Ruta `/emails-log` registrada, **no está en el Sidebar** | Su contenido ya vive como tab dentro de `/comunicaciones` vía `EmailsLogContent.tsx` |

Ambas son páginas completas (~300-500 líneas) duplicando funcionalidad que ya está en la página de Comunicaciones.

### 2. Componentes sin importar

| Archivo | Razón |
|---|---|
| `src/components/NavLink.tsx` | Wrapper de react-router `NavLink`; ningún archivo lo importa |
| `src/components/clientes/ClientDetailPanel.tsx` | Solo se auto-referencia. El proyecto usa `ClientDetailDialog.tsx` |
| `src/components/onboarding/OnboardingTour.tsx` | Se exporta pero nadie lo importa |

### 3. Componentes shadcn/ui sin uso

Todos estos están en `src/components/ui/` y no se importan desde ningún lado:
- `aspect-ratio.tsx`
- `carousel.tsx`
- `context-menu.tsx`
- `drawer.tsx`
- `input-otp.tsx`
- `menubar.tsx`
- `navigation-menu.tsx`
- `pagination.tsx`
- `resizable.tsx`

### 4. Limpieza menor
- `src/App.css` — existe por scaffolding de Vite; no está importado en `main.tsx` ni en `App.tsx`.
- En `src/App.tsx` quitar los `lazy()` + `<Route>` de `EmailMarketing` y `EmailsLog` cuando se borren las páginas.

### Lo que NO recomiendo tocar

- `src/data/mockData.ts` — aún lo importan 9 archivos (`KPICard`, `ContentGrid`, `AlertsPanel`, hooks de kpi/campaigns/content/daily-metrics, etc.). Quitarlo es un refactor aparte, no limpieza.
- `breadcrumb`, `hover-card`, `toggle-group` — tienen 1-2 usos reales.
- `Historial`, `Archivos`, `AgencyLeads`, `Funnel`, `WidgetCatalog`, `ImageDB` — están linkeados desde el Sidebar o rutas públicas, son features activas aunque las uses poco.

### Alcance

Dado que elegiste "código muerto/duplicado" y no respondiste el alcance, propongo el camino seguro: **borrar archivos + quitar rutas/imports**, sin tocar DB. Total: ~13 archivos eliminados, 4 líneas fuera de `App.tsx`.

### Archivos a tocar

**Borrar (13):**
```
src/pages/EmailMarketing.tsx
src/pages/EmailsLog.tsx
src/components/NavLink.tsx
src/components/clientes/ClientDetailPanel.tsx
src/components/onboarding/OnboardingTour.tsx
src/App.css
src/components/ui/aspect-ratio.tsx
src/components/ui/carousel.tsx
src/components/ui/context-menu.tsx
src/components/ui/drawer.tsx
src/components/ui/input-otp.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/resizable.tsx
```

**Editar (1):**
- `src/App.tsx` — eliminar los dos `const ... = lazy(...)` y sus `<Route path="/email-marketing">` y `<Route path="/emails-log">`.

Confírmame y lo ejecuto, o dime si quieres que excluya algo de la lista (por ejemplo mantener `OnboardingTour` para usarlo después).

