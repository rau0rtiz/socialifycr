

## Plan: Rebalancear pesos del scoring del funnel

### Problema actual
- Un negocio con buenos ingresos ($15k+) pero sin inversión en pauta queda clasificado nivel 2-3
- Pauta pesa 40% del score total, igual que ingresos
- La lógica penaliza a quienes no invierten en pauta, cuando esos son los clientes ideales para Socialify

### Propuesta de nuevos pesos

**Ingresos** — Aumentar peso (de max 8 a max 10):
```
Menos de $1,000    → 0
$1,000 – $5,000    → 3
$5,000 – $15,000   → 5
$15,000 – $50,000  → 8
Más de $50,000     → 10
```

**Presencia social** — Mantener igual (max 4):
```
Sin presencia      → 0
Perfil inactivo    → 1
1-2 veces/semana   → 2
3-5 veces/semana   → 3
Todos los días     → 4
```

**Inversión en pauta** — Reducir peso (de max 8 a max 5):
```
No invierto nada       → 1  (ya no penaliza tanto)
Lo intenté pero lo dejé → 2
Menos de $200/mes      → 3
$200 – $500/mes        → 4
$500 – $1,000/mes      → 4
$1,000 – $2,000/mes    → 5
Más de $2,000/mes      → 5
```

### Distribución resultante

| Pregunta | Peso máximo | % del total |
|---|---|---|
| Ingresos | 10 pts | **53%** |
| Presencia social | 4 pts | 21% |
| Inversión en pauta | 5 pts | **26%** |

Total máximo: 19 pts

### Nuevos umbrales de nivel

```
≤ 3  → Nivel 1 (Starter)
≤ 6  → Nivel 2 (Builder)
≤ 10 → Nivel 3 (Growing)
≤ 14 → Nivel 4 (Scaling)
≤ 17 → Nivel 5 (Advanced)
> 17 → Nivel 6 (Leader)
```

Los umbrales se mantienen casi iguales, pero ahora alguien con $15k+ de ingresos, presencia básica y sin pauta llega a nivel 3-4 en vez de quedarse en 2-3.

### Ejemplo comparativo

**Caso: Negocio con $15k-$50k, publica 1-2 veces/semana, $0 pauta**
- Antes: 6 + 2 + 0 = **8 → Nivel 3**
- Después: 8 + 2 + 1 = **11 → Nivel 4**

**Caso: Negocio con $5k-$15k, perfil inactivo, $0 pauta**
- Antes: 4 + 1 + 0 = **5 → Nivel 2**
- Después: 5 + 1 + 1 = **7 → Nivel 3**

### Cambio técnico
Solo se modifica `src/pages/Funnel.tsx`: los arrays de `puntos` en `revenueOptions` y `adSpendOptions`, sin tocar UI ni estructura.

