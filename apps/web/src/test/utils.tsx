import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '../app/AppProviders'

/** Render a screen with the same providers as production, but an in-memory router. */
export function renderApp(ui: ReactElement, options?: { route?: string; renderOptions?: Omit<RenderOptions, 'wrapper'> }) {
  return render(ui, {
    ...options?.renderOptions,
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[options?.route ?? '/']}>
        <AppProviders>{children}</AppProviders>
      </MemoryRouter>
    ),
  })
}
