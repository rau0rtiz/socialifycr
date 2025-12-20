import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, Radio } from 'lucide-react';
import { CampaignData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface CampaignsTableProps {
  data: CampaignData[];
  isLoading?: boolean;
  isLiveData?: boolean;
  hasAdAccount?: boolean;
}

const networkColors: Record<string, string> = {
  instagram: 'bg-pink-500/10 text-pink-600 border-pink-200',
  facebook: 'bg-blue-500/10 text-blue-600 border-blue-200',
  tiktok: 'bg-neutral-500/10 text-neutral-600 border-neutral-200',
  linkedin: 'bg-sky-500/10 text-sky-600 border-sky-200',
};

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: 'Activa', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  paused: { label: 'Pausada', class: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  completed: { label: 'Completada', class: 'bg-muted text-muted-foreground border-border' },
  scheduled: { label: 'Programada', class: 'bg-violet-500/10 text-violet-600 border-violet-200' },
};

export const CampaignsTable = ({ data, isLoading, isLiveData, hasAdAccount }: CampaignsTableProps) => {
  const [networkFilter, setNetworkFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = data.filter(campaign => {
    if (networkFilter !== 'all' && campaign.network !== networkFilter) return false;
    if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
    return true;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm md:text-base font-medium">Campañas Activas</CardTitle>
            {isLiveData && (
              <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/30 text-emerald-600">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                En vivo
              </Badge>
            )}
            {!isLiveData && !isLoading && !hasAdAccount && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Demo
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-24 md:w-32 bg-background h-8 text-xs md:text-sm">
                <SelectValue placeholder="Red" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-24 md:w-32 bg-background h-8 text-xs md:text-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="scheduled">Programada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium text-xs md:text-sm">Campaña</TableHead>
                <TableHead className="font-medium text-xs md:text-sm hidden sm:table-cell">Red</TableHead>
                <TableHead className="font-medium text-xs md:text-sm text-right">Alcance</TableHead>
                <TableHead className="font-medium text-xs md:text-sm text-right hidden md:table-cell">Engagement</TableHead>
                <TableHead className="font-medium text-xs md:text-sm text-right hidden lg:table-cell">Leads</TableHead>
                <TableHead className="font-medium text-xs md:text-sm">Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right hidden md:table-cell"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right hidden lg:table-cell"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-7" /></TableCell>
                  </TableRow>
                ))
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No hay campañas que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs md:text-sm max-w-[120px] md:max-w-none truncate">{campaign.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant="outline" 
                        className={cn("capitalize text-xs", networkColors[campaign.network])}
                      >
                        {campaign.network}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs md:text-sm">{formatNumber(campaign.reach)}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm hidden md:table-cell">{formatNumber(campaign.engagement)}</TableCell>
                    <TableCell className="text-right text-xs md:text-sm hidden lg:table-cell">{campaign.leads}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", statusConfig[campaign.status]?.class)}
                      >
                        <span className="hidden sm:inline">{statusConfig[campaign.status]?.label || campaign.status}</span>
                        <span className="sm:hidden">{(statusConfig[campaign.status]?.label || campaign.status).slice(0, 3)}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
