import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { clients, Client } from '@/data/mockData';

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
  selectedClient: Client;
  setSelectedClient: (client: Client) => void;
  clientBrands: Record<string, ClientBrand>;
  updateClientBrand: (clientId: string, brand: ClientBrand) => void;
  saveBrandSettings: () => void;
  hasUnsavedChanges: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

const STORAGE_KEY = 'brand-settings';

const getInitialClientBrands = (): Record<string, ClientBrand> => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.clientBrands) return parsed.clientBrands;
  }
  const initialBrands: Record<string, ClientBrand> = {};
  clients.forEach(client => {
    initialBrands[client.id] = {
      logoUrl: '',
      primaryColor: client.accentColor,
      accentColor: client.accentColor,
      secondaryColor: client.secondaryColor,
    };
  });
  return initialBrands;
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
  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);
  const [clientBrands, setClientBrands] = useState<Record<string, ClientBrand>>(getInitialClientBrands);
  const [savedState, setSavedState] = useState<string>(() => 
    JSON.stringify({ platformBrand: getInitialPlatformBrand(), clientBrands: getInitialClientBrands() })
  );

  const hasUnsavedChanges = JSON.stringify({ platformBrand, clientBrands }) !== savedState;

  const updateClientBrand = (clientId: string, brand: ClientBrand) => {
    setClientBrands(prev => ({
      ...prev,
      [clientId]: brand,
    }));
  };

  const saveBrandSettings = () => {
    const data = { platformBrand, clientBrands };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setSavedState(JSON.stringify(data));
  };

  return (
    <BrandContext.Provider
      value={{
        platformBrand,
        setPlatformBrand,
        selectedClient,
        setSelectedClient,
        clientBrands,
        updateClientBrand,
        saveBrandSettings,
        hasUnsavedChanges,
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
