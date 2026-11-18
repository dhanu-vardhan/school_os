import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name: RegExp | string = /Camille Durand/, landing: RegExp = /\/principal$/) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible()
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL(landing)
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()
}

async function goTo(page: Page, route: string) {
  await page.evaluate(path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}

test('safeguarding lists expose no restricted content', async ({ page }) => {
  await signIn(page)
  await goTo(page, '/app/safeguarding')
  await expect(page.getByText('SC-2026-014')).toBeVisible()
  const body = await page.locator('body').innerText()
  expect(body).not.toContain('Concern record — content restricted to authorised roles.')
})

test('safeguarding sub-pages render', async ({ page }) => {
  await signIn(page)
  for (const route of ['/app/safeguarding/harassment','/app/safeguarding/contacts','/app/safeguarding/reports','/app/safeguarding/access-log','/app/safeguarding/settings']) {
    await goTo(page, route)
    await expect(page.locator('body')).not.toHaveText('Cannot read')
  }
})
