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
import { MoreHorizontal, ExternalLink } from 'lucide-react';
import { CampaignData } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface CampaignsTableProps {
  data: CampaignData[];
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

export const CampaignsTable = ({ data }: CampaignsTableProps) => {
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-base font-medium">Campañas Activas</CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-32 bg-background h-8 text-sm">
                <SelectValue placeholder="Red social" />
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
              <SelectTrigger className="w-32 bg-background h-8 text-sm">
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
      <CardContent>
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-medium">Campaña</TableHead>
                <TableHead className="font-medium">Red</TableHead>
                <TableHead className="font-medium text-right">Alcance</TableHead>
                <TableHead className="font-medium text-right">Engagement</TableHead>
                <TableHead className="font-medium text-right">Leads</TableHead>
                <TableHead className="font-medium">Estado</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((campaign) => (
                <TableRow key={campaign.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("capitalize", networkColors[campaign.network])}
                    >
                      {campaign.network}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.reach)}</TableCell>
                  <TableCell className="text-right">{formatNumber(campaign.engagement)}</TableCell>
                  <TableCell className="text-right">{campaign.leads}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={statusConfig[campaign.status].class}
                    >
                      {statusConfig[campaign.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
