import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GoalType } from '@/hooks/use-campaign-goals';

export interface Client {
  id: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  ai_context: string | null;
  preferred_region: string | null;
  default_campaign_goal: string | null;
}

interface PlatformBrand {
  name: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
}

interface ClientBrand {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
}

interface BrandContextType {
  platformBrand: PlatformBrand;
  setPlatformBrand: (brand: PlatformBrand) => void;
  clients: Client[];
  clientsLoading: boolean;
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  clientBrands: Record<string, ClientBrand>;
  updateClientBrand: (clientId: string, brand: ClientBrand) => void;
  saveBrandSettings: () => Promise<void>;
  hasUnsavedChanges: boolean;
  refetchClients: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const STORAGE_KEY = 'brand-settings';

const getInitialClientBrands = (): Record<string, ClientBrand> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.clientBrands) return parsed.clientBrands;
  }
  return {};
};

const getInitialPlatformBrand = (): PlatformBrand => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.platformBrand) return parsed.platformBrand;
  }
  return {
    name: 'Socialify',
    logoUrl: '',
    primaryColor: '222 47% 11%',
    accentColor: '217 91% 60%',
    secondaryColor: '199 89% 48%',
  };
};

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [platformBrand, setPlatformBrand] = useState<PlatformBrand>(getInitialPlatformBrand);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBrands, setClientBrands] = useState<Record<string, ClientBrand>>(getInitialClientBrands);
  const [savedState, setSavedState] = useState<string>(() => 
    JSON.stringify({ platformBrand: getInitialPlatformBrand(), clientBrands: getInitialClientBrands() })
  );

  const hasUnsavedChanges = JSON.stringify({ platformBrand, clientBrands }) !== savedState;

  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, industry, logo_url, primary_color, accent_color, ai_context, preferred_region, default_campaign_goal')
        .order('name');

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      setClients(data || []);
      
      // Auto-select first client if none selected
      if (data && data.length > 0 && !selectedClient) {
        setSelectedClient(data[0]);
      }
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const updateClientBrand = (clientId: string, brand: ClientBrand) => {
    setClientBrands(prev => ({
      ...prev,
      [clientId]: brand,
    }));
  };

  const saveBrandSettings = async () => {
    const data = { platformBrand, clientBrands };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedState(JSON.stringify(data));

    // Persist client brand changes to the database
    const updates = Object.entries(clientBrands).map(([clientId, brand]) =>
      supabase
        .from('clients')
        .update({
          logo_url: brand.logoUrl || null,
          primary_color: brand.primaryColor,
          accent_color: brand.accentColor,
        })
        .eq('id', clientId)
    );

    await Promise.all(updates);
    await fetchClients();
  };

  return (
    <BrandContext.Provider
      value={{
        platformBrand,
        setPlatformBrand,
        clients,
        clientsLoading,
        selectedClient,
        setSelectedClient,
        clientBrands,
        updateClientBrand,
        saveBrandSettings,
        hasUnsavedChanges,
        refetchClients: fetchClients,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
