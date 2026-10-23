import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const email = `auth-browser-${Date.now()}@example.test`
const password = 'fictional test parent password 2026'
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})

try {
  const page = await browser.newPage({ reducedMotion: 'reduce' })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(`${baseURL}/auth/register`)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await page.getByRole('heading', { name: 'A first step, at your own pace.' }).waitFor()
  assert(!(await page.evaluate(() => document.cookie)).includes('aura_session'))
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)

  await page.reload()
  await page.getByRole('heading', { name: 'A first step, at your own pace.' }).waitFor()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByLabel('Email address').waitFor()

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('incorrect test password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Invalid email or password' }).waitFor()
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: 'A first step, at your own pace.' }).waitFor()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.locator('.consent-checkbox input').check()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByLabel('Your relationship to the child').selectOption('parent')
  await page.getByRole('checkbox').check()
  await page.locator('#child-age').fill('24')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.getByRole('button', { name: 'Continue to AuRA' }).click()
  await page.getByRole('button', { name: 'Start Chat', exact: true }).waitFor()
  await page.locator('.sidebar').getByRole('link', { name: 'Settings' }).click()
  await page.getByText(email, { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.getByLabel('Email address').waitFor()
  assert.equal((await page.request.get(`${baseURL}/api/v1/auth/session`)).status(), 401)
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
  assert.deepEqual(pageErrors, [])

  const retryPage = await browser.newPage({ reducedMotion: 'reduce' })
  await retryPage.route('**/api/v1/auth/session', (route) => route.abort())
  await retryPage.goto(`${baseURL}/auth/login`)
  await retryPage.getByRole('alert').filter({ hasText: 'Could not connect to AuRA' }).waitFor()
  await retryPage.unroute('**/api/v1/auth/session')
  await retryPage.getByRole('button', { name: 'Try again' }).click()
  await retryPage.getByLabel('Email address').waitFor()
  await retryPage.close()

  console.log('Auth integration passed: register, wrong/correct password, cookie restore, onboarding gate, account display, server logout and connection retry.')
} finally {
  await browser.close()
}
