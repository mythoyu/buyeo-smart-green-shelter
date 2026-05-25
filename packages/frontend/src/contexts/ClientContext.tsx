import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Client {
  id: string;
  name: string;
  location: string;
  type: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  status?: number;
  devices?: any[];
}

interface ClientContextType {
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  refreshCurrentClient: () => void;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClientContext must be used within a ClientProvider');
  }
  return context;
};

interface ClientProviderProps {
  children: ReactNode;
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [currentClient, setCurrentClient] = useState<Client | null>(null);

  const refreshCurrentClient = () => {
    // React Query의 invalidateQueries를 호출하거나
    // 직접 API를 호출하여 클라이언트 정보를 갱신
    console.log('클라이언트 정보 갱신 요청');
  };

  const value: ClientContextType = {
    currentClient,
    setCurrentClient,
    refreshCurrentClient,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
};
