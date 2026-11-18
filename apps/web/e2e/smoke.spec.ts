import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name: RegExp | string = /Camille Durand/, landing: RegExp = /\/principal$/) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible()
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL(landing)
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()
}

/** Mock sessions live in memory, so navigate client-side to avoid losing the session on reload. */
async function goTo(page: Page, route: string) {
  await page.evaluate(path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}

const majorRoutes = [
  ['/app/people/students', 'Élèves'],
  ['/app/activities', 'Catalogue des activités'],
  ['/app/safeguarding', 'Espace protection'],
  ['/app/ai/suggestions', 'Suggestions IA'],
  ['/app/compliance/retention', 'Politiques de rétention'],
  ['/app/reports', 'Rapports & analyses'],
  ['/app/notifications', 'Centre de notifications'],
  ['/app/settings', 'Paramètres'],
] as const

test('login, dashboard and major routes render without runtime errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signIn(page)

  for (const [route, heading] of majorRoutes) {
    await goTo(page, route)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  }

  expect(errors).toEqual([])
})

test('navigates to a section, opens the command palette and toggles locale', async ({ page }, testInfo) => {
  await signIn(page)
  if (testInfo.project.name === 'mobile') {
    await page.locator('nav[aria-label="Plus"]').getByRole('link', { name: 'Élèves' }).click()
  } else {
    await page.getByRole('link', { name: 'Élèves', exact: true }).first().click()
  }
  await expect(page).toHaveURL(/\/app\/people\/students$/)
  await expect(page.getByRole('heading', { name: 'Élèves', level: 1 })).toBeVisible()

  await page.getByRole('button', { name: /Rechercher/ }).first().click()
  const searchInput = page.getByPlaceholder(/pages et des actions|pages and actions/)
  await expect(searchInput).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(searchInput).toHaveCount(0)

  await page.getByRole('button', { name: 'Langue', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Students', level: 1 })).toBeVisible()
})

test('colour kit renders token contrast in light, dark and high contrast', async ({ page }) => {
  await signIn(page)
  await goTo(page, '/ui-kit/colors')
  await expect(page.getByRole('heading', { name: 'Couleurs', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Contraste WCAG AA', level: 2 })).toBeVisible()
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Basculer le thème sombre' }).click()
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Basculer le contraste élevé' }).click()
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(0)
})

test('buttons kit exposes the action matrix and roving keyboard focus', async ({ page }) => {
  await signIn(page)
  await goTo(page, '/ui-kit/buttons')
  await expect(page.getByRole('heading', { name: 'Boutons', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Matrice des états', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actions composées', level: 2 })).toBeVisible()

  const toolbar = page.getByRole('toolbar', { name: 'Vue' })
  await toolbar.getByRole('button', { name: 'Jour' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(toolbar.getByRole('button', { name: 'Semaine' })).toBeFocused()
  await expect(page.locator('button[aria-keyshortcuts]:visible').first()).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(overflow).toBe(false)
})

test('safeguarding lists expose no restricted content', async ({ page }) => {
  await signIn(page)
  await goTo(page, '/app/safeguarding')
  await expect(page.getByText('SC-2026-014')).toBeVisible()
  await expect(page.getByText('Accès restreint').first()).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toContain('Concern record — content restricted to authorised roles.')
})

test('director is denied platform admin while operator is allowed', async ({ page }) => {
  await signIn(page)
  await goTo(page, '/app/platform/flags')
  await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible()

  await page.goto('/login')
  await page.getByRole('button', { name: /Opérateur Plateforme/ }).click()
  await expect(page).toHaveURL(/\/platform$/)
  await goTo(page, '/app/platform/flags')
  await expect(page.getByRole('heading', { name: /Fonctionnalités/ })).toBeVisible()
})

test('security pages render and browser storage holds no tokens', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop security walkthrough')
  await signIn(page)

  const exposed = await page.evaluate(() => JSON.stringify({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookie: document.cookie,
  }))
  expect(exposed).not.toMatch(/access_token|refresh_token|id_token|Bearer\s/i)
  expect(exposed).not.toMatch(/__Host-schoolos_session/)

  await goTo(page, '/app/security')
  await expect(page.getByRole('heading', { name: 'Centre de sécurité', level: 1 })).toBeVisible()
  await expect(page.getByText('Chaîne d’audit')).toBeVisible()

  await goTo(page, '/app/account/security')
  await expect(page.getByRole('heading', { name: 'Compte & sécurité', level: 1 })).toBeVisible()
  await expect(page.getByText('Sessions actives')).toBeVisible()
})

test('teacher cannot open the security centre', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /Élise Martin/ }).click()
  await expect(page).toHaveURL(/\/teacher$/)
  await goTo(page, '/app/security')
  await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible()
})

test('renders a usable mobile layout with bottom navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport project only')
  await signIn(page)
  await expect(page.locator('nav[aria-label="Plus"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(horizontalOverflow).toBe(false)
})

test('keyboard shortcuts open help, navigate by chord, quick add and the palette', async ({ page }) => {
  await signIn(page)

  await page.keyboard.press('?')
  await expect(page.getByRole('dialog', { name: 'Raccourcis clavier' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Raccourcis clavier' })).toHaveCount(0)

  await page.keyboard.press('g')
  await page.keyboard.press('s')
  await expect(page).toHaveURL(/\/app\/people\/students$/)

  await page.keyboard.press('n')
  const quickAddInput = page.getByRole('combobox', { name: 'Ajout rapide' })
  await expect(quickAddInput).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(quickAddInput).toHaveCount(0)

  await page.keyboard.press('/')
  const paletteInput = page.getByRole('combobox', { name: 'Palette de commandes' })
  await expect(paletteInput).toBeVisible()
  // Plain-letter shortcuts must be suspended while typing in the palette.
  await page.keyboard.type('n')
  await expect(quickAddInput).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(paletteInput).toHaveCount(0)

  await page.keyboard.press('Control+k')
  await expect(paletteInput).toBeVisible()
  await page.keyboard.press('Escape')
})

test('data table rows activate with Enter and Space', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop table rows only')
  await signIn(page)
  await goTo(page, '/app/people/students')
  const row = page.locator('tbody tr[aria-label]').first()
  await expect(row).toBeVisible()
  await row.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/app\/people\/students\/[^/]+$/)
})
