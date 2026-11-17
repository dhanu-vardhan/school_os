import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name = /Camille Durand/) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible()
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

/** Mock sessions live in memory; pushState keeps them across route changes. */
async function goTo(page: Page, route: string) {
  await page.evaluate(path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}

/** The real theme control lives in the app header, not in the analytics pages. */
async function setDarkTheme(page: Page) {
  await page.getByRole('button', { name: 'Thème' }).click()
  await page.getByRole('menuitem', { name: 'Sombre' }).click()
  await expect(page.locator('html.dark')).toBeVisible()
}

test('governed dashboard exposes mock flag, chart summary and table alternative', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await signIn(page)
  await goTo(page, '/app/analytics')

  await expect(page.getByRole('heading', { name: 'Pilotage', level: 1 })).toBeVisible()
  await expect(page.getByText('Données fictives').first()).toBeVisible()
  await expect(page.getByText(/Données de démonstration/)).toBeVisible()
  await expect(page.getByRole('img').first()).toHaveAttribute('aria-label', /n=/)
  const tableToggle = page.getByText('Voir le tableau de données').first()
  await expect(tableToggle).toBeVisible()
  await tableToggle.click()
  await expect(page.getByRole('table').first()).toBeVisible()

  if (testInfo.project.name === 'desktop') {
    await page.screenshot({ path: '../../docs/screenshots/analytics/dashboard-desktop-light.png', fullPage: true })
    await setDarkTheme(page)
    await expect(page.getByText('Données fictives').first()).toBeVisible()
    await page.screenshot({ path: '../../docs/screenshots/analytics/dashboard-desktop-dark.png', fullPage: true })
  }
  expect(errors).toEqual([])
})

test('analyst Explore workspace renders report builder, matrix and simulator', async ({ page }, testInfo) => {
  await signIn(page, /Analyste de données/)
  await goTo(page, '/app/analytics/explore')

  await expect(page.getByRole('heading', { name: 'Explorer les données', level: 1 })).toBeVisible()
  await expect(page.getByText('Tableau paginé')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Matrice croisée' })).toBeVisible()
  await expect(page.getByText('Simulateur de scénarios')).toBeVisible()
  await expect(page.getByText('Données fictives').first()).toBeVisible()

  if (testInfo.project.name === 'desktop') {
    await page.screenshot({ path: '../../docs/screenshots/analytics/explore-desktop.png', fullPage: true })
  }
})

test('analytics UI kit documents every primitive in light and dark themes', async ({ page }, testInfo) => {
  await signIn(page)
  await goTo(page, '/ui-kit/analytics')

  await expect(page.getByRole('heading', { name: 'Analytics UI kit', level: 1 })).toBeVisible()
  await expect(page.getByRole('img', { name: /Présence par niveau/ })).toBeVisible()
  await expect(page.getByText('Masqué', { exact: true }).first()).toBeVisible()

  if (testInfo.project.name === 'desktop') {
    await page.screenshot({ path: '../../docs/screenshots/analytics/ui-kit-light.png', fullPage: true })
    await setDarkTheme(page)
    await page.screenshot({ path: '../../docs/screenshots/analytics/ui-kit-dark.png', fullPage: true })
  } else {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
    expect(overflow).toBe(false)
    await page.screenshot({ path: '../../docs/screenshots/analytics/ui-kit-mobile.png', fullPage: true })
  }
})

test('mobile analytics dashboard keeps the accessible summary and no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only')
  await signIn(page)
  await goTo(page, '/app/analytics')

  await expect(page.getByRole('heading', { name: 'Pilotage', level: 1 })).toBeVisible()
  await expect(page.getByRole('img').first()).toHaveAttribute('aria-label', /n=/)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(overflow).toBe(false)
  await page.screenshot({ path: '../../docs/screenshots/analytics/dashboard-mobile.png', fullPage: true })
})
