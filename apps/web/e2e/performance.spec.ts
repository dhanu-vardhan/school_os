import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    __cls?: number
  }
}

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByRole('button', { name: /Camille Durand/ }).click()
  await expect(page).toHaveURL(/\/app\/dashboard$/)
}

async function goTo(page: Page, route: string) {
  await page.evaluate(path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}

test('route changes stay under the CLS budget on web', async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value: number }
        if (!shift.hadRecentInput) window.__cls = (window.__cls ?? 0) + shift.value
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })

  await signIn(page)
  await expect(page.getByRole('heading', { name: /Bonjour,/ })).toBeVisible()

  for (const [route, heading] of [
    ['/app/people/students', 'Élèves'],
    ['/app/activities', 'Catalogue des activités'],
    ['/app/dashboard', /Bonjour,/],
  ] as const) {
    await goTo(page, route)
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
  }

  // Let late layout shifts settle before reading the cumulative score.
  await page.waitForTimeout(750)
  const cls = await page.evaluate(() => window.__cls ?? 0)
  console.log(`CLS (${test.info().project.name}): ${cls.toFixed(4)}`)
  expect(cls, `cumulative layout shift was ${cls}`).toBeLessThan(0.05)
})
