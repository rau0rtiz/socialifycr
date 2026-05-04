import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CatalogChips } from './CatalogChips';
import {
  useProductBrands,
  useProductCategoriesCatalog,
  useProductSizes,
  useProductColors,
} from '@/hooks/use-product-catalogs';

export const InventoryCatalogs = ({ clientId }: { clientId: string }) => {
  const brands = useProductBrands(clientId);
  const cats = useProductCategoriesCatalog(clientId);
  const sizes = useProductSizes(clientId);
  const colors = useProductColors(clientId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Catálogos</CardTitle>
        <CardDescription>Marcas, tipos de prenda, tallas y colores. Estos alimentan los dropdowns en productos y ventas.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CatalogChips
          title="Marcas"
          items={brands.items}
          onAdd={(name) => brands.add.mutateAsync({ name })}
          onRemove={(id) => brands.remove.mutateAsync(id)}
        />
        <CatalogChips
          title="Tipos de prenda"
          items={cats.items}
          onAdd={(name) => cats.add.mutateAsync({ name })}
          onRemove={(id) => cats.remove.mutateAsync(id)}
        />
        <CatalogChips
          title="Tallas"
          items={sizes.items}
          onAdd={(name) => sizes.add.mutateAsync({ name, sort_order: sizes.items.length })}
          onRemove={(id) => sizes.remove.mutateAsync(id)}
        />
        <CatalogChips
          title="Colores"
          items={colors.items}
          withColor
          onAdd={(name, extra) => colors.add.mutateAsync({ name, hex_code: extra?.hex_code })}
          onRemove={(id) => colors.remove.mutateAsync(id)}
        />
      </CardContent>
    </Card>
  );
};
