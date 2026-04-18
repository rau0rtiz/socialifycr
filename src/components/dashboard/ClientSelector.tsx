import { Check, ChevronsUpDown, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useBrand } from '@/contexts/BrandContext';
import { useState } from 'react';

export const ClientSelector = () => {
  const [open, setOpen] = useState(false);
  const { clients, clientsLoading, selectedClient, setSelectedClient, clientBrands } = useBrand();

  if (clientsLoading) {
    return (
      <Button variant="outline" className="w-48 justify-between bg-background" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando...
      </Button>
    );
  }

  if (clients.length === 0) {
    return (
      <Button variant="outline" className="w-48 justify-between bg-background" disabled>
        <span className="text-muted-foreground">Sin clientes</span>
      </Button>
    );
  }

  if (!selectedClient) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-48 justify-between bg-background">
            <span className="text-muted-foreground">Seleccionar cliente</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0 bg-popover z-50" align="end">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>No se encontró cliente.</CommandEmpty>
              <CommandGroup heading="Clientes">
                {clients.map((client) => {
                  const accentColor = clientBrands[client.id]?.accentColor || client.accent_color || '217 91% 60%';
                  return (
                    <CommandItem
                      key={client.id}
                      value={client.name}
                      onSelect={() => {
                        setSelectedClient(client);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      {clientBrands[client.id]?.logoUrl || client.logo_url ? (
                        <img 
                          src={clientBrands[client.id]?.logoUrl || client.logo_url || ''} 
                          alt={client.name} 
                          className="h-5 w-5 rounded flex-shrink-0 object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div 
                          className="h-5 w-5 rounded flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `hsl(${accentColor})` }}
                        >
                          <Building2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        <span className="text-xs text-muted-foreground">{client.industry}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  const selectedAccentColor = clientBrands[selectedClient.id]?.accentColor || selectedClient.accent_color || '217 91% 60%';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between bg-background"
        >
          <div className="flex items-center gap-2 truncate">
            {clientBrands[selectedClient.id]?.logoUrl || selectedClient.logo_url ? (
              <img 
                src={clientBrands[selectedClient.id]?.logoUrl || selectedClient.logo_url || ''} 
                alt={selectedClient.name} 
                className="h-5 w-5 rounded flex-shrink-0 object-contain"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div 
                className="h-5 w-5 rounded flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `hsl(${selectedAccentColor})` }}
              >
                <Building2 className="h-3 w-3 text-white" />
              </div>
            )}
            <span className="truncate">{selectedClient.name}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 bg-popover z-50" align="end">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>No se encontró cliente.</CommandEmpty>
            <CommandGroup heading="Clientes">
              {clients.map((client) => {
                const accentColor = clientBrands[client.id]?.accentColor || client.accent_color || '217 91% 60%';
                return (
                  <CommandItem
                    key={client.id}
                    value={client.name}
                    onSelect={() => {
                      setSelectedClient(client);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    {clientBrands[client.id]?.logoUrl || client.logo_url ? (
                      <img 
                        src={clientBrands[client.id]?.logoUrl || client.logo_url || ''} 
                        alt={client.name} 
                        className="h-5 w-5 rounded flex-shrink-0 object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div 
                        className="h-5 w-5 rounded flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: `hsl(${accentColor})` }}
                      >
                        <Building2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span>{client.name}</span>
                      <span className="text-xs text-muted-foreground">{client.industry}</span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedClient.id === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
