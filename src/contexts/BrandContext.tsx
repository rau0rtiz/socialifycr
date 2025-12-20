import React, { createContext, useContext, useState, ReactNode } from 'react';
import { clients, Client } from '@/data/mockData';

interface PlatformBrand {
  name: string;
  accentColor: string;
  secondaryColor: string;
}

interface BrandContextType {
  platformBrand: PlatformBrand;
  setPlatformBrand: (brand: PlatformBrand) => void;
  selectedClient: Client;
  setSelectedClient: (client: Client) => void;
  clientBrands: Record<string, { accentColor: string; secondaryColor: string }>;
  updateClientBrand: (clientId: string, brand: { accentColor: string; secondaryColor: string }) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [platformBrand, setPlatformBrand] = useState<PlatformBrand>({
    name: 'Socialify',
    accentColor: '217 91% 60%',
    secondaryColor: '199 89% 48%',
  });

  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);

  const [clientBrands, setClientBrands] = useState<Record<string, { accentColor: string; secondaryColor: string }>>(() => {
    const initialBrands: Record<string, { accentColor: string; secondaryColor: string }> = {};
    clients.forEach(client => {
      initialBrands[client.id] = {
        accentColor: client.accentColor,
        secondaryColor: client.secondaryColor,
      };
    });
    return initialBrands;
  });

  const updateClientBrand = (clientId: string, brand: { accentColor: string; secondaryColor: string }) => {
    setClientBrands(prev => ({
      ...prev,
      [clientId]: brand,
    }));
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
