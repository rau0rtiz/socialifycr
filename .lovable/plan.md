
## Plan: Unificar el dashboard con el estilo del Roadmap

### Sistema de diseño del Roadmap (`/roadmap`)
- **Fondo:** blanco puro (`#FFFFFF`) con SVGs sutiles naranja al fondo
- **Texto principal:** `#212121` (casi negro), nunca gris azulado
- **Texto secundario:** `#212121/60`, `#212121/50`, `#212121/40`
- **Acento único (CTA, selección, iconos clave):** `#FF6B35` (naranja Socialify), hover `#e55a2b`
- **Bordes:** `border-gray-200`, hover `border-[#FF6B35]/40`
- **Cards/botones:** `rounded-2xl`, `border-2`, `shadow-md` / `shadow-xl`
- **Tipografía:** `'DM Sans'` para body, `'Nunito' 700` para el wordmark "SOCIALIFY"
- **Estilo:** títulos `uppercase font-extrabold tracking-tight`, botones `uppercase tracking-wide`
- **Logo:** "SOCIALIFY" en mayúsculas Nunito Bold, color `#212121`

### Estrategia de implementación

En lugar de reescribir cada página, redefinimos las **variables del design system** y los componentes base. Como casi todo el dashboard usa `bg-card`, `text-foreground`, `border-border`, `bg-primary`, etc. via Tailwind tokens, **un solo cambio de tokens propaga a todo**.

### 1. Tokens globales (`src/index.css`)
Reescribir tokens del modo `:root` (claro) y `.dark` para alinearlos al roadmap:

```css
:root {
  --background: 0 0% 100%;          /* blanco puro */
  --foreground: 0 0% 13%;           /* #212121 */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 13%;
  --primary: 16 100% 60%;           /* #FF6B35 naranja */
  --primary-foreground: 0 0% 100%;
  --accent: 16 100% 60%;            /* mismo naranja */
  --accent-foreground: 0 0% 100%;
  --secondary: 0 0% 97%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 40%;     /* #212121/60 */
  --border: 0 0% 88%;               /* gray-200 */
  --input: 0 0% 88%;
  --ring: 16 100% 60%;
  --radius: 1rem;                   /* rounded-2xl por defecto */

  --sidebar-background: 0 0% 100%;
  --sidebar-foreground: 0 0% 13%;
  --sidebar-primary: 16 100% 60%;
  --sidebar-accent: 0 0% 96%;
  --sidebar-accent-foreground: 0 0% 13%;
  --sidebar-border: 0 0% 90%;
  --sidebar-ring: 16 100% 60%;

  --client-accent: 16 100% 60%;     /* default cliente = naranja */
  --client-primary: 0 0% 13%;

  --font-sans: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
}

.dark {
  /* Mantener oscuro pero re-anclar acento al naranja */
  --primary: 16 100% 60%;
  --accent: 16 100% 60%;
  --ring: 16 100% 60%;
  --client-accent: 16 100% 60%;
  /* resto: mantener tonos actuales */
}
```

Resultado: **toda página, card, botón, input, sidebar y badge** que use tokens (la mayoría) hereda automáticamente blanco/naranja/#212121.

### 2. Tailwind (`tailwind.config.ts`)
- Cambiar `fontFamily.sans` de Poppins → **DM Sans** (igual que roadmap)
- Mantener Nunito disponible para el wordmark

### 3. Componentes base
- **`button.tsx`**: `default` y `lg` → `rounded-2xl`, `font-semibold uppercase tracking-wide`, sombra `shadow-md hover:shadow-xl`
- **`card.tsx`**: `rounded-2xl border-2`, sombra suave
- **`input.tsx`**: `rounded-xl border-2`

### 4. Logo / wordmark unificado
Reemplazar todas las menciones del logo por el wordmark estilo roadmap ("SOCIALIFY" en Nunito 700, `#212121`):
- `TopBar.tsx` → breadcrumb "Socialify"
- `Auth.tsx` → CardTitle "Socialify"
- `BrandSettings.tsx` → títulos
- `Unsubscribe.tsx` → header
- `OnboardingTour.tsx` → mantiene texto pero estilo coherente

Importar `@fontsource/nunito/700.css` globalmente en `main.tsx` para tenerlo disponible.

### 5. Dashboard layout (`DashboardLayout.tsx`)
Cambiar `bg-muted/30` → `bg-background` (blanco puro) para igualar el fondo limpio del roadmap.

### 6. Sidebar
Ya usa tokens `--sidebar-*` → al cambiarlos en CSS automáticamente queda blanco con acento naranja. Verificar y ajustar `Sidebar.tsx` si tiene clases hardcoded.

### 7. KPICard y otros widgets con color hardcoded
Revisión rápida para reemplazar acentos `text-emerald-600`, `bg-primary` con valores hardcoded → seguirán los tokens.

### Archivos a modificar
1. `src/index.css` — tokens (cambio principal, ~80% del impacto visual)
2. `tailwind.config.ts` — fuente DM Sans
3. `src/main.tsx` — importar Nunito
4. `src/components/ui/button.tsx` — radius/uppercase
5. `src/components/ui/card.tsx` — radius/border-2
6. `src/components/ui/input.tsx` — radius
7. `src/components/dashboard/DashboardLayout.tsx` — fondo
8. `src/components/dashboard/TopBar.tsx` — wordmark Nunito
9. `src/pages/Auth.tsx` — wordmark Nunito
10. `src/pages/BrandSettings.tsx` — wordmark
11. `src/pages/Unsubscribe.tsx` — color del header (de indigo → #212121)
12. Pasada de revisión a `KPICard`, `Sidebar`, `Dashboard.tsx` para limpiar colores hardcoded que no respeten tokens

### Lo que NO cambia
- Branding por cliente (cada cliente sigue pudiendo definir su `accent_color` propio que sobrescribe `--client-accent`)
- Modo oscuro sigue disponible vía toggle
- Funcionalidad: cero cambios lógicos

### Resultado esperado
Toda página del dashboard pasa a verse blanca, con texto `#212121`, acento naranja `#FF6B35`, esquinas `rounded-2xl`, fuente DM Sans y wordmark "SOCIALIFY" en Nunito — idéntico al roadmap público.

<lov-actions>
<lov-suggestion message="Apruebo el plan, aplicalo">Aprobar y aplicar</lov-suggestion>
<lov-suggestion message="Aplicalo pero mantengamos el branding por cliente intacto en sus dashboards (que solo el chrome de agencia/login/auth use el estilo roadmap)">Solo chrome de agencia</lov-suggestion>
<lov-suggestion message="Aplicalo y además quita el modo oscuro completo, dejá solo el modo claro estilo roadmap">Solo modo claro</lov-suggestion>
</lov-actions>
