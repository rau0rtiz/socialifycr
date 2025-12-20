import React, { createContext, useContext, useState, ReactNode } from 'react';
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
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider = ({ children }: { children: ReactNode }) => {
  const [platformBrand, setPlatformBrand] = useState<PlatformBrand>({
    name: 'Socialify',
    logoUrl: '',
    primaryColor: '222 47% 11%',
    accentColor: '217 91% 60%',
    secondaryColor: '199 89% 48%',
  });

  const [selectedClient, setSelectedClient] = useState<Client>(clients[0]);

  const [clientBrands, setClientBrands] = useState<Record<string, ClientBrand>>(() => {
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
  });

  const updateClientBrand = (clientId: string, brand: ClientBrand) => {
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
