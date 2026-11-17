import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider, ToastHost } from '@schoolos/ui'
import { PreferencesProvider } from './preferences'
import { SessionProvider } from './session'

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  }))
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <SessionProvider>
          <TooltipProvider delayDuration={250}>
            {children}
            <ToastHost />
          </TooltipProvider>
        </SessionProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  )
}
