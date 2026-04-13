

## Importar leads históricos de Roberto Olivas (con montos)

### Pricing por ecosistema
- **Pasivas** → `$1,995 USD` por venta
- **Airbnb** → `$8,000 USD` por venta

### Paso 1 — Agregar staff faltante
- `client_closers`: Ale, Beto, Andre, Evelyn (para client_id `ebb165c9-64fa-4fee-9d3b-da24f679175e`)
- `client_setters`: Luz

### Paso 2 — Insertar leads nuevos en `setter_appointments`
Cada registro con: lead_name, appointment_date, setter_name, status mapeado (Vendido→sold, No Vendido→not_sold, Seguimiento→scheduled), source (Airbnb→ad, Pasivas→organic), closer via notes o closer_name field.

### Paso 3 — Crear ventas para los "Vendido"
Para cada lead con status "sold":
- Insertar en `message_sales` con amount según ecosistema (1995 o 8000), currency USD
- Vincular sale_id en el appointment correspondiente

### Leads a insertar (no existentes aún)

| Nombre | Fecha | Closer | Setter | Resultado | Ecosistema | Monto venta |
|--------|-------|--------|--------|-----------|------------|-------------|
| Felipe Madrigal | 2026-02-27 | Willie | Luz | No Vendido | — | — |
| Luzbeth Corrales A | 2026-03-02 | Ale | Luz | No Vendido | — | — |
| Adriana Mora Mata | 2026-02-28 | Ale | Luz | No Vendido | — | — |
| Warner López Vargas | 2026-03-03 | Andre | Luz | Vendido | ? | ? |
| Diego Flores | 2026-03-04 | Adriana | Luz | Vendido | ? | ? |
| Jose Pablo Hernandez | 2026-03-04 | Andre | Luz | Vendido | ? | ? |
| Jessica Boza | 2026-03-05 | Adriana | Luz | No Vendido | — | — |
| Kristel Maria Ramos | 2026-03-06 | Andre | Luz | Pendiente | — | — |
| Gabriel | 2026-03-06 | Willie | Luz | Vendido | ? | ? |
| Milena Blanco | 2026-03-16 | Willie | Luz | No Vendido | — | — |
| Anthony Vargas Esquivel | 2026-03-11 | Adriana | Luz | Vendido | ? | ? |
| Eduardo Vergara | 2026-03-30 | Evelyn | Luz | Vendido | ? | ? |
| Daniel Rodríguez Miranda | 2026-04-08 | Andre | Luz | No Vendido | — | — |
| Javier D Román Rodríguez | 2026-04-07 | Willie | Luz | No Vendido | — | — |
| Angel Valenzuela | 2026-04-06 | Andre | Luz | No Vendido | — | — |
| Keylin | 2026-04-09 | Willie | Luz | Pendiente | — | — |

### Pregunta pendiente
No puedo distinguir claramente en la imagen cuáles leads son de **Airbnb** vs **Pasivas**. ¿Podrías indicarme cuáles de los "Vendido" (Warner, Diego, Jose Pablo, Gabriel, Anthony, Eduardo) son de cada ecosistema? Así les asigno el monto correcto ($8,000 vs $1,995).

### Ejecución
Se hará vía inserts directos en la base de datos usando las herramientas de DB, sin cambios en el código de la app.

