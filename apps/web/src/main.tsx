import '@mantine/core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { TRPCProvider, trpcClient } from './trpc';
import { MaterialsPage } from './routes/MaterialsPage';

// retry: false — the user retries manually with the Retry button in the error state
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const router = createBrowserRouter([{ path: '/', element: <MaterialsPage /> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          <RouterProvider router={router} />
        </TRPCProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
