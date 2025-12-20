export interface KPIData {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  sparkline: number[];
}

export interface CampaignData {
  id: string;
  name: string;
  network: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  reach: number;
  engagement: number;
  leads: number;
  status: 'active' | 'paused' | 'completed' | 'scheduled';
  startDate: string;
  endDate: string;
}

export interface ContentPost {
  id: string;
  title: string;
  network: 'instagram' | 'facebook' | 'tiktok' | 'linkedin';
  type: 'image' | 'video' | 'carousel' | 'story';
  status: 'published' | 'scheduled' | 'draft';
  engagement: number;
  date: string;
  thumbnail?: string;
}

export interface DailyMetric {
  date: string;
  reach: number;
  impressions: number;
  engagement: number;
}

export interface SocialMetric {
  network: string;
  followers: number;
  engagement: number;
  posts: number;
  color: string;
}

// Generate a consistent multiplier based on client ID
const getMultiplier = (clientId: string): number => {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    const char = clientId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Return a value between 0.6 and 1.4
  return 0.6 + (Math.abs(hash) % 80) / 100;
};

export const getClientKPIs = (clientId: string): KPIData[] => {
  const baseMultiplier = getMultiplier(clientId);

  return [
    {
      label: 'Alcance Total',
      value: `${(125.4 * baseMultiplier).toFixed(1)}K`,
      change: 18,
      changeLabel: 'vs período anterior',
      sparkline: [40, 45, 42, 50, 55, 60, 58, 65, 70, 75, 72, 80],
    },
    {
      label: 'Engagement Rate',
      value: `${(4.2 * baseMultiplier).toFixed(1)}%`,
      change: 0.5,
      changeLabel: 'vs período anterior',
      sparkline: [3.5, 3.8, 3.6, 4.0, 4.2, 4.1, 4.3, 4.5, 4.2, 4.4, 4.6, 4.8],
    },
    {
      label: 'Nuevos Seguidores',
      value: `${Math.round(847 * baseMultiplier)}`,
      change: 12,
      changeLabel: 'vs período anterior',
      sparkline: [60, 65, 58, 70, 75, 80, 72, 85, 90, 88, 95, 100],
    },
    {
      label: 'Leads Generados',
      value: `${Math.round(156 * baseMultiplier)}`,
      change: 23,
      changeLabel: 'vs período anterior',
      sparkline: [20, 25, 30, 28, 35, 40, 38, 45, 50, 48, 55, 60],
    },
    {
      label: 'Conversiones',
      value: `${Math.round(34 * baseMultiplier)}`,
      change: 8,
      changeLabel: 'vs período anterior',
      sparkline: [5, 8, 6, 10, 12, 11, 15, 14, 18, 16, 20, 22],
    },
    {
      label: 'ROI Campañas',
      value: `${Math.round(340 * baseMultiplier)}%`,
      change: 15,
      changeLabel: 'vs período anterior',
      sparkline: [250, 260, 280, 290, 300, 310, 305, 320, 330, 325, 340, 350],
    },
  ];
};

export const getClientCampaigns = (clientId: string): CampaignData[] => {
  const multiplier = getMultiplier(clientId);
  
  return [
    { id: '1', name: 'Campaña Principal', network: 'instagram', reach: Math.round(45000 * multiplier), engagement: Math.round(2800 * multiplier), leads: Math.round(89 * multiplier), status: 'active', startDate: '2024-12-01', endDate: '2024-12-31' },
    { id: '2', name: 'Promoción Especial', network: 'facebook', reach: Math.round(32000 * multiplier), engagement: Math.round(1500 * multiplier), leads: Math.round(156 * multiplier), status: 'active', startDate: '2024-12-10', endDate: '2024-12-20' },
    { id: '3', name: 'Contenido Viral', network: 'tiktok', reach: Math.round(78000 * multiplier), engagement: Math.round(5200 * multiplier), leads: Math.round(45 * multiplier), status: 'completed', startDate: '2024-11-15', endDate: '2024-12-05' },
    { id: '4', name: 'Thought Leadership', network: 'linkedin', reach: Math.round(15000 * multiplier), engagement: Math.round(890 * multiplier), leads: Math.round(67 * multiplier), status: 'scheduled', startDate: '2024-12-22', endDate: '2025-01-15' },
  ];
};

export const getClientDailyMetrics = (clientId: string): DailyMetric[] => {
  const baseMultiplier = getMultiplier(clientId);

  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      reach: Math.round((3000 + Math.random() * 2000 + i * 50) * baseMultiplier),
      impressions: Math.round((5000 + Math.random() * 3000 + i * 80) * baseMultiplier),
      engagement: Math.round((200 + Math.random() * 150 + i * 5) * baseMultiplier),
    };
  });
};

export const getClientSocialMetrics = (clientId: string): SocialMetric[] => {
  const baseMultiplier = getMultiplier(clientId);

  return [
    { network: 'Instagram', followers: Math.round(12500 * baseMultiplier), engagement: 4.2, posts: 45, color: 'hsl(330, 81%, 60%)' },
    { network: 'Facebook', followers: Math.round(8900 * baseMultiplier), engagement: 2.8, posts: 32, color: 'hsl(217, 91%, 60%)' },
    { network: 'TikTok', followers: Math.round(25600 * baseMultiplier), engagement: 8.5, posts: 28, color: 'hsl(0, 0%, 10%)' },
    { network: 'LinkedIn', followers: Math.round(4200 * baseMultiplier), engagement: 3.1, posts: 18, color: 'hsl(201, 100%, 35%)' },
  ];
};

export const getClientContent = (clientId: string): ContentPost[] => {
  return [
    { id: '1', title: 'Post destacado de la semana', network: 'instagram', type: 'carousel', status: 'published', engagement: 1250, date: '2024-12-18' },
    { id: '2', title: 'Video viral reciente', network: 'tiktok', type: 'video', status: 'published', engagement: 5400, date: '2024-12-17' },
    { id: '3', title: 'Artículo profesional', network: 'linkedin', type: 'image', status: 'published', engagement: 890, date: '2024-12-16' },
    { id: '4', title: 'Próximo contenido', network: 'instagram', type: 'image', status: 'scheduled', engagement: 0, date: '2024-12-22' },
    { id: '5', title: 'Historia del día', network: 'instagram', type: 'story', status: 'published', engagement: 2100, date: '2024-12-19' },
    { id: '6', title: 'Borrador pendiente', network: 'facebook', type: 'video', status: 'draft', engagement: 0, date: '2024-12-23' },
  ];
};

export interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
}

export const getClientAlerts = (clientId: string): Alert[] => {
  return [
    { id: '1', type: 'warning', title: 'Engagement bajo en Instagram', description: 'Esta semana el engagement bajó un 15% comparado con la anterior.' },
    { id: '2', type: 'info', title: 'Campaña terminando', description: 'La campaña "Promoción Especial" termina en 3 días.' },
    { id: '3', type: 'success', title: 'Mejor post del mes', description: 'El video viral tuvo +45% más interacción que el promedio.' },
  ];
};
