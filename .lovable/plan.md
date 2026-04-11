

## Plan: Crear Productos e Importar Ventas de Marzo — Speak Up

### Resumen

Insertar ~14 productos en `client_products` y ~90 ventas de marzo 2026 en `message_sales` para Speak Up (`332ed274-1924-4413-885f-a4463bc8903d`). No hay productos ni ventas de marzo existentes.

---

### Fase 1: Crear Productos

Productos identificados del CSV (todos CRC):

| Producto | Categoría | Precio base | Recurrente |
|---|---|---|---|
| TOEIC Semi Intensivo | toeic | 165,000 | No |
| TOEIC Individual 8H | toeic | 125,000 | No |
| TOEIC Intensivo | toeic | 165,000 | No |
| TOEIC Regular | toeic | 210,000 | No |
| Examen TOEIC | exam | 49,000 | No |
| Examen de Ubicación | exam | 7,500 | No |
| Clase de Prueba | trial | 15,000 | No |
| CP Adultos | individual | 68,500 | Sí |
| CP Niños | individual | 42,000 | Sí |
| CP Teens | individual | 55,000 | Sí |
| Grupal Niños | group | 34,000 | Sí |
| Grupal Adultos | group | 25,000 | Sí |
| Grupal Teens | group | 37,000 | Sí |
| Partner Up | individual | 40,000 | Sí |
| Mix Up Program PRO | individual | 152,000 | Sí |
| Tutoría | individual | 12,750 | No |
| Cambio Fecha Examen | exam | 14,000 | No |

INSERT en `client_products` (~17 productos).

---

### Fase 2: Insertar Ventas de Marzo

Parsear el CSV completo (líneas 4-193) con un script Python/DuckDB que:

1. Extraiga: Fecha, Nombre, Número, Curso Matriculado, Nota, Asesora, Total de Ingresos
2. Limpie montos (quitar `₡`, puntos, comas)
3. Ignore filas con monto 0 o vacío y filas de totales
4. Corrija fechas erróneas (líneas 120-124 dicen `3/18/2023` pero son `3/18/2026`)
5. Genere INSERTs en `message_sales` con:
   - `client_id`: `332ed274-1924-4413-885f-a4463bc8903d`
   - `created_by`: `2828d106-82b8-4e6c-bff2-73fde5d33a09`
   - `currency`: `CRC`, `source`: `organic`, `status`: `completed`

---

### Detalle técnico

- Se usará `code--exec` con DuckDB/Python para parsear el CSV y generar los INSERTs
- Se usará la herramienta de inserción de datos para ejecutar los INSERTs
- No se modifican archivos de código
- ~90 registros de ventas + ~17 productos

