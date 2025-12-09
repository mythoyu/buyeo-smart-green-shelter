import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.tsx';
import './index.css';
import './globals.css';
import { LogProvider } from './contexts/LogContext';

// QueryClient 인스턴스 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // 항상 새로운 데이터 요청
      gcTime: 0, // 캐시 비활성화
      retry: 3,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LogProvider>
        <App />
      </LogProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
