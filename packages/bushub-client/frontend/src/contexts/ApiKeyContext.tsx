import React, { createContext, useContext, useState } from 'react';

interface ApiKeyContextType {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const ApiKeyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // sessionStorage에서 초기값 읽기
  const [apiKey, setApiKeyState] = useState<string | null>(() => sessionStorage.getItem('accessToken'));
  // setApiKey가 호출될 때 sessionStorage도 동기화
  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      sessionStorage.setItem('accessToken', key);
    } else {
      sessionStorage.removeItem('accessToken');
    }
  };
  return <ApiKeyContext.Provider value={{ apiKey, setApiKey }}>{children}</ApiKeyContext.Provider>;
};

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (!context) throw new Error('useApiKey must be used within ApiKeyProvider');
  return context;
}
