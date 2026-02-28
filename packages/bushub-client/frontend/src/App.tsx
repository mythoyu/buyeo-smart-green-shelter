import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';

import AppContent from './AppContent';
import { ApiKeyProvider } from './contexts/ApiKeyContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem storageKey='bushub-theme' suppressHydrationWarning>
        <ApiKeyProvider>
          <AuthProvider>
            {/* Global toast portal (먼저 마운트) */}
            <Toaster />
            <AppContent />
          </AuthProvider>
        </ApiKeyProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={true} />
    </QueryClientProvider>
  );
}

export default App;
