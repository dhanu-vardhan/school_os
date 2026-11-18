import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n, { initI18n } from '@schoolos/i18n'
import { CANONICAL_ROLES, navGroupsForRole, type CanonicalRole } from '@schoolos/shared'

/**
 * P11/P9 guard: nav labels must resolve through app i18n for every role.
 * A missing translation typically renders the raw key (e.g. "nav.settings") in the DOM.
 */
function labelsForRole(role: CanonicalRole): string[] {
  const groups = navGroupsForRole(role, {
    role,
    roles: [role],
    schoolId: 'school-a',
    stepUpActive: false,
    featureFlags: { SHOW_UI_KIT: true, SHOW_COMING_SOON: true },
    impersonating: false,
  }, { includeSoon: true })
  return groups.flatMap(g => g.items.map(item => i18n.t(item.labelKey)))
}

function NavLabels({ role }: { role: CanonicalRole }) {
  return (
    <ul aria-label={`nav-${role}`}>
      {labelsForRole(role).map((label, i) => <li key={`${role}-${i}`}>{label}</li>)}
    </ul>
  )
}

describe('nav i18n (rendered DOM)', () => {
  it('has no untranslated nav keys in rendered DOM for every canonical role', async () => {
    await initI18n()
    for (const role of CANONICAL_ROLES) {
      const { unmount, container } = render(
        <I18nextProvider i18n={i18n}>
          <NavLabels role={role} />
        </I18nextProvider>,
      )
      const items = Array.from(container.querySelectorAll('li')).map(el => (el.textContent ?? '').trim())
      // Every role should render at least the dashboard entry.
      expect(items.length, `${role} should have nav items`).toBeGreaterThan(0)
      for (const text of items) {
        expect(text, `${role} nav label is untranslated: ${text}`).not.toMatch(/^nav\./)
        expect(text, `${role} nav label contains untranslated nav key: ${text}`).not.toMatch(/\bnav\.[A-Za-z]/)
      }
      unmount()
    }
  })
})
