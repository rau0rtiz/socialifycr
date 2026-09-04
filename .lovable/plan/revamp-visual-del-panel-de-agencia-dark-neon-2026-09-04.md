# Revamp visual del panel de agencia — dark neon

Rediseño completo de cómo se ve `/agencia`, tomando como referencia el layout de la captura: rail de iconos a la izquierda, header con título y búsqueda, contenido central en tres bloques (tarjetas de acceso, gráfico grande, lista de clientes actuales) y una columna derecha de seguimiento. Sin secciones nuevas: solo se reorganiza y reviste lo que ya existe.

## Modo oscuro por defecto, siempre

Misma paleta (ember naranja + tinta), versión oscura, con acabado limpio y ligeramente neon:

- Fondo casi negro, superficies elevadas apenas más claras, bordes muy sutiles.
- Ember (#e85d3a) como acento único, con halos suaves para el efecto neon en el estado activo, KPIs y gráficos.
- Tipografía igual: Space Grotesk para títulos y números, DM Sans para texto.
- El panel queda fijo en oscuro (no hay toggle claro/oscuro para el usuario). Las vistas públicas de documentos, propuestas, formularios, recibos y hojas públicas **no cambian**: siguen en su tema papel actual.

## Layout nuevo (Resumen)

```text
┌──┬────────────────────────────────────────────────┬──────────────┐
│  │  Resumen           [ buscar ]     🔔  avatar   │              │
│ra├────────────────────────────────────────────────┤ Por cobrar   │
│il│  ┌────────┐ ┌────────┐ ┌────────┐              │ · atrasados  │
│  │  │ 3 tarj. de acceso: CRM / Producciones /     │              │
│  │  │ Documentación con sus checklist de KPIs     │ Producciones │
│  │  └────────┘ └────────┘ └────────┘              │ próximas     │
│  │  ┌──────────────────────────────────────────┐  │              │
│  │  │ Leads en el tiempo  [Diario|Sem|Mensual] │  │ Leads        │
│  │  │        gráfico de área neon              │  │ recientes    │
│  │  └──────────────────────────────────────────┘  │ del CRM      │
│  │  Clientes actuales                             │              │
│  │  ┌ logo · nombre · módulos activos · abrir ─┐  │              │
│  │  └──────────────────────────────────────────┘  │              │
└──┴────────────────────────────────────────────────┴──────────────┘
```

- **Rail izquierdo**: sidebar colapsado a iconos por defecto en desktop, con tooltip por sección y el logo arriba. Se expande con el botón de siempre; en móvil sigue siendo el menú deslizable actual.
- **Header**: título de la sección, buscador, notificaciones y avatar con menú (perfil / cerrar sesión) — hoy el hub de agencia no tiene ninguno de estos, se reusan los componentes que ya existen en la barra superior del panel.
- **Tarjetas superiores**: tres tarjetas al estilo de la referencia (icono en círculo + lista con checks), apuntando a CRM, Producciones y Documentación, y mostrando dentro los conteos que hoy son KPIs sueltos.
- **Gráfico**: "Leads en el tiempo" con pestañas Diario / Semanal / Mensual, área con degradado ember y puntos marcados, sobre datos de `funnel_leads` y `agency_crm_leads`.
- **Clientes actuales** (en el lugar de "Current Partnerships"): filas con logo del cliente, nombre, indicador de módulos activos y botón para entrar a su ficha.
- **Columna derecha**: Por cobrar / atrasados (del módulo Pagos), Producciones próximas (hojas con fecha de grabación cercana) y Leads recientes del CRM con su estado.

## Resto de las páginas

Todas las páginas de `/agencia` heredan los tokens oscuros, y se revisan una por una para que no queden restos claros ni contrastes rotos: Clientes, CRM (kanban), Pagos, Producciones, Documentación, Funnels, Base de datos, Bases de datos de clientes, Comunicaciones, Accesos, Archivos y Ajustes. Se unifican tarjetas, tablas, chips de estado, diálogos y campos de formulario al nuevo acabado.

## Detalles técnicos

- `src/App.tsx`: `ThemeProvider` pasa de `forcedTheme="light"` a oscuro forzado.
- `src/index.css`: el bloque `.agency-shell` se reescribe con la paleta oscura (background ~`0 0% 7%`, card `0 0% 10%`, border `0 0% 16%`, primary ember sin cambio, `color-scheme: dark`) y se añaden utilidades `agency-card`, `agency-kpi`, `agency-glow`, `agency-rail` con sombras/halos neon. El scope `.noeval-scope` (Producciones papel) y las rutas públicas quedan aisladas para no heredar el oscuro.
- `src/components/dashboard/DashboardLayout.tsx`: el header del hub de agencia se sustituye por una barra propia (título por ruta, buscador, notificaciones, avatar).
- `src/components/agency/AgencySidebar.tsx`: rail de iconos por defecto (`collapsible="icon"` + estado inicial colapsado en desktop), tooltips, activo con halo ember.
- `src/pages/agencia/Resumen.tsx`: reestructurado en las cuatro zonas descritas; se extraen componentes nuevos en `src/components/agency/` (tarjetas de acceso, gráfico de leads con Recharts, lista de clientes actuales, y los tres bloques del rail derecho).
- Datos: se reusan `useAgencyPayments`, `useProductionSheets`, `useAgencyCrmLeads` y consultas a `clients` / `funnel_leads`, con carga diferida por bloque para no frenar el render.
- Sin cambios de base de datos.
