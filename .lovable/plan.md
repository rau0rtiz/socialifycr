# Arreglar buscador de clientes en OrderWizard

## Problemas detectados

1. **Filtro parece no funcionar**: el resultado se limita a `.slice(0, 8)` siempre. Si el cliente que buscás es el #20 alfabéticamente y los primeros 8 ya lo contienen como substring débil, no aparece.
2. **Scroll roto**: el contenedor del paso 1 ya tiene `max-h-[60vh] overflow-y-auto`, y la lista de resultados anida otro `max-h-48 overflow-y-auto`. En touch/trackpad el scroll interno no recibe foco.
3. **Sin teclado/ARIA**: no se puede navegar con flechas ni Enter.

## Solución

Reemplazar el `Input + lista manual` por un **Combobox shadcn** (`Popover` + `Command` + `CommandInput` + `CommandList`), patrón ya usado en `StoryStoreSales.tsx` (línea 687).

### Beneficios
- Filtro nativo de `cmdk`: rápido, fuzzy, sin límite artificial.
- `CommandList` maneja scroll correctamente con altura `max-h-[300px]` + Radix focus management.
- Navegación con flechas + Enter incluida.
- Cierra el popover al seleccionar.

### Cambios en `src/components/ventas/orders/OrderWizardDialog.tsx`

1. Eliminar estado `contactQuery` y memo `filteredContacts`.
2. Reemplazar el bloque "Buscar cliente existente" (líneas ~204-238) por:
   - Botón trigger que muestra el cliente seleccionado o "Buscar cliente existente…"
   - `Popover` con `Command` adentro:
     - `CommandInput` con placeholder "Nombre o teléfono…"
     - `CommandEmpty` "Sin resultados"
     - `CommandGroup` con todos los `contacts` mapeados a `CommandItem`
     - Cada item busca por `full_name + phone` (concatenado en `value`)
     - Al click → `handleSelectContact(c)` y cerrar popover
3. Mantener inputs de Nombre + Teléfono debajo (para crear nuevo cliente o editar el seleccionado).

### Verificación
- Abrir OrderWizard en Alma Bendita (255 contactos).
- Escribir "lau" → debe mostrar Laura Gomez y demás.
- Escribir un teléfono parcial "5068" → debe filtrar.
- Scroll con mouse y touch en la lista debe funcionar.
- Seleccionar uno → se rellenan nombre + teléfono y se carga la dirección guardada.

## Detalles técnicos

```text
<Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {contactId ? selectedContact?.full_name : 'Buscar cliente existente…'}
      <ChevronsUpDown className="h-4 w-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
    <Command>
      <CommandInput placeholder="Nombre o teléfono…" />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>Sin resultados</CommandEmpty>
        <CommandGroup>
          {contacts.map(c => (
            <CommandItem
              key={c.id}
              value={`${c.full_name} ${c.phone || ''}`}
              onSelect={() => { handleSelectContact(c); setContactPopoverOpen(false); }}
            >
              ...
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

No tocamos otras pantallas en este pase — el plan es que el patrón quede probado aquí y luego se puede aplicar a `TissueSaleDialog`, `ReservationFormDialog`, `RegisterSaleDialog` si presentan el mismo bug.
