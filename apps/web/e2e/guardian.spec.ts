import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, name: RegExp) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible()
  await page.getByRole('button', { name }).click()
  await expect(page).toHaveURL(/\/family$/)
}

/** Mock sessions live in memory, so navigate client-side to keep the guardian session. */
async function goTo(page: Page, route: string) {
  await page.evaluate(path => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, route)
}

test('guardian lands on /family and never sees another family', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop guardian walkthrough')
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await signIn(page, /Famille Martin/)
  await expect(page.getByRole('heading', { name: 'Espace famille', level: 1 })).toBeVisible()
  await expect(page.getByText(/Léa Martin/).first()).toBeVisible()
  await expect(page.getByText(/Tom Martin/).first()).toBeVisible()
  // The Petit family is another household and must never leak into this portal.
  await expect(page.getByText(/Jade Petit/)).toHaveCount(0)

  // Family navigation replaces the staff navigation for parents.
  await expect(page.getByRole('link', { name: 'Mes enfants' }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Élèves', exact: true })).toHaveCount(0)

  // No bearer tokens or session secrets in browser storage.
  const exposed = await page.evaluate(() => JSON.stringify({
    local: { ...localStorage },
    session: { ...sessionStorage },
    cookie: document.cookie,
  }))
  expect(exposed).not.toMatch(/access_token|refresh_token|id_token|Bearer\s/i)

  // Staff-only routes stay closed even when typed directly.
  await goTo(page, '/app/people/students')
  await expect(page.getByRole('heading', { name: 'Accès refusé' })).toBeVisible()
  expect(errors).toEqual([])
})

test('separated guardian is bounded to the shared child and sees the restriction', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop guardian walkthrough')

  await signIn(page, /Alex Moreau/)
  await expect(page.getByRole('heading', { name: 'Espace famille', level: 1 })).toBeVisible()
  await expect(page.getByText(/Tom Martin/).first()).toBeVisible()
  await expect(page.getByText(/Léa Martin/)).toHaveCount(0)
  await expect(page.getByText('Restriction en vigueur').first()).toBeVisible()

  await goTo(page, '/family/children')
  await expect(page.getByRole('heading', { name: 'Mes enfants', level: 1 })).toBeVisible()
  await expect(page.getByText(/Tom Martin/).first()).toBeVisible()
  await expect(page.getByText(/Léa Martin/)).toHaveCount(0)

  // IDOR: a child outside the guardian link returns a scope error, not data.
  await goTo(page, '/family/children/stu-1')
  await expect(page.getByText('Enfant hors de votre périmètre')).toBeVisible()
  await expect(page.getByText(/Léa Martin/)).toHaveCount(0)
})

test('guardian signs an authorisation and sees the co-guardian rule', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop form signing walkthrough')

  await signIn(page, /Famille Martin/)
  await goTo(page, '/family/forms')
  await expect(page.getByRole('heading', { name: 'Autorisations et formulaires', level: 1 })).toBeVisible()
  await expect(page.getByText('Les deux responsables légaux doivent signer.').first()).toBeVisible()
  await expect(page.getByText(/TODO\(legal-review\)/).first()).toBeVisible()

  const card = page.locator('.ui-card').filter({ hasText: 'Départ autonome — fin de journée' }).first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Signer' }).click()

  const dialog = page.getByRole('dialog', { name: 'Départ autonome — fin de journée' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Signer' }).click()

  await expect(page.getByText('En attente de l’autre responsable légal').first()).toBeVisible()
  await expect(page.locator('.ui-card').filter({ hasText: 'Départ autonome — fin de journée' })).toContainText('Signé par Famille Martin')
})

test('billing only exposes invoices the guardian must pay and completes a step-up payment', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'desktop billing walkthrough')

  await signIn(page, /Alex Moreau/)
  await goTo(page, '/family/billing')
  await expect(page.getByRole('heading', { name: 'Facturation', level: 1 })).toBeVisible()
  await expect(page.getByText('Sortie musée d’Orsay')).toBeVisible()
  // The other guardian is the payer for the canteen and after-school invoices.
  await expect(page.getByText('Cantine — Novembre 2026')).toHaveCount(0)
  await expect(page.getByText('Garderie — Novembre 2026')).toHaveCount(0)

  await page.getByRole('button', { name: 'Payer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Payer' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Payer' }).click()

  await expect(page.getByText('Paiement confirmé. Reçu disponible.')).toBeVisible()
  await expect(page.getByText('recu-finv-3.pdf')).toBeVisible()
})

test('mobile family landing keeps the guardian navigation without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile viewport only')

  await signIn(page, /Famille Martin/)
  await expect(page.getByRole('heading', { name: 'Espace famille', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Mes enfants' }).first()).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(overflow).toBe(false)
})
