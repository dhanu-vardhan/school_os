import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name = /Camille Durand/) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Bienvenue sur SchoolOS' })).toBeVisible()
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
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
  const searchInput = page.getByPlaceholder('Search pages and actions…')
  await expect(searchInput).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(searchInput).toHaveCount(0)

  await page.getByRole('button', { name: 'Langue', exact: true }).click()
  await page.getByRole('menuitem', { name: 'English' }).click()
  await expect(page.getByRole('heading', { name: 'Students', level: 1 })).toBeVisible()
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
  await expect(page).toHaveURL(/\/app\/dashboard$/)
  await goTo(page, '/app/platform/flags')
  await expect(page.getByRole('heading', { name: /Fonctionnalités/ })).toBeVisible()
})

test('renders a usable mobile layout with bottom navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport project only')
  await signIn(page)
  await expect(page.locator('nav[aria-label="Plus"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(horizontalOverflow).toBe(false)
})
