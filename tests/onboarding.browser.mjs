import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = 'docs/design-review/onboarding'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})
const page = await browser.newPage({
  viewport: { width: 1917, height: 923 },
  reducedMotion: 'no-preference',
})
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

async function capture(name) {
  await page.mouse.move(0, 0)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true })
}
async function assertStandalone() {
  assert.equal(
    await page.locator('.sidebar,.chat-input,.chat-window').count(),
    0,
  )
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
}
async function clientNavigate(path) {
  await page.evaluate((destination) => {
    history.pushState({}, '', destination)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(80)
}
async function next() {
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}
async function completeDetails(age = '24') {
  await page.getByLabel('Your relationship to the child').selectOption('parent')
  await page.getByRole('checkbox', { name: /I interact directly/ }).check()
  await page.getByLabel('Child’s age in months', { exact: true }).fill(age)
}

try {
  await page.goto(baseURL)
  await page.getByLabel('Demo email address').waitFor()
  assert.equal(new URL(page.url()).pathname, '/auth/login')
  assert.equal(await page.locator('.onboarding-splash').count(), 0)
  assert.equal(await page.locator('input[type="password"]').count(), 0)
  await assertStandalone()
  await page.waitForFunction(() => {
    const video = document.querySelector('.auth-robot video')
    return video
      ? video.readyState >= 2 && video.currentTime > 0.1
      : Boolean(document.querySelector('.auth-robot img'))
  })
  if (await page.locator('.auth-robot video').count())
    assert.equal(
      await page
        .locator('.auth-robot video')
        .evaluate(
          (video) =>
            video.muted && video.loop && video.playsInline && !video.paused,
        ),
      true,
    )
  const login = await page.locator('.auth-left').boundingBox()
  const robot = await page.locator('.auth-visual').boundingBox()
  assert.ok(login.x + login.width < robot.x, 'Form on left, robot on right')
  await capture('login-desktop')
  await page.getByRole('button', { name: 'About AuRA', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.getByRole('button', { name: 'Close about AuRA' }).click()
  await page.getByRole('link', { name: 'Create account', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Your first step starts here' })
    .waitFor()
  await capture('register-desktop')
  await page.getByLabel('Demo email address').fill('new-parent@example.test')
  await Promise.all([
    page.waitForURL('**/onboarding/splash'),
    page
      .getByRole('button', { name: 'Continue with email', exact: true })
      .click(),
  ])
  await page.screenshot({ path: `${output}/post-login-splash.png` })
  await page
    .getByRole('heading', { name: 'A first step, at your own pace.' })
    .waitFor()
  await assertStandalone()
  await capture('about-desktop')
  await clientNavigate('/assessment')
  assert.equal(new URL(page.url()).pathname, '/onboarding/about')
  await next()
  await page
    .getByRole('heading', { name: 'Your privacy comes first.' })
    .waitFor()
  assert.equal(await page.getByRole('checkbox').isChecked(), false)
  assert.equal(
    await page
      .getByRole('button', { name: 'Continue', exact: true })
      .isDisabled(),
    true,
  )
  await capture('consent-desktop')
  for (const path of [
    '/onboarding/complete',
    '/onboarding/parent-child',
    '/assessment',
    '/chat',
  ]) {
    await clientNavigate(path)
    assert.equal(new URL(page.url()).pathname, '/onboarding/consent')
  }
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await next()
  assert.equal(await page.getByRole('checkbox').isChecked(), true)
  await next()
  await page
    .getByRole('heading', { name: 'A little about you and your child.' })
    .waitFor()
  await next()
  assert.equal(await page.locator('[role="alert"]').count(), 3)
  await completeDetails('11')
  for (const age of ['11', '37', '12.5']) {
    await page.getByLabel('Child’s age in months', { exact: true }).fill(age)
    await next()
    await page
      .getByText('Enter a whole-number age from 12 to 36 months.', {
        exact: true,
      })
      .waitFor()
    assert.equal(new URL(page.url()).pathname, '/onboarding/parent-child')
  }
  await completeDetails()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await next()
  assert.equal(
    await page
      .getByLabel('Child’s age in months', { exact: true })
      .inputValue(),
    '24',
  )
  assert.equal(
    await page.getByLabel('Your relationship to the child').inputValue(),
    'parent',
  )
  assert.equal(
    await page
      .getByRole('checkbox', { name: /I interact directly/ })
      .isChecked(),
    true,
  )
  await capture('parent-child-desktop')
  await page.getByRole('button', { name: 'Exit demo', exact: true }).click()
  await signInDemo(page, baseURL, {
    scenario: 'new',
    email: 'new-parent@example.test',
    open: false,
  })
  await page
    .getByRole('heading', { name: 'A little about you and your child.' })
    .waitFor()
  assert.equal(
    await page
      .getByLabel('Child’s age in months', { exact: true })
      .inputValue(),
    '24',
  )
  await next()
  await page.getByRole('heading', { name: 'You’re all set!' }).waitFor()
  await capture('complete-desktop')
  await clientNavigate('/')
  assert.equal(new URL(page.url()).pathname, '/onboarding/complete')
  await page
    .getByRole('button', { name: 'Continue to AuRA', exact: true })
    .click()
  await page
    .getByRole('heading', { name: 'Welcome to AuRA', exact: true })
    .waitFor()
  assert.equal(
    await page.getByRole('heading', { name: /Question 1 of 13/ }).count(),
    0,
  )
  assert.equal(await page.locator('.chat-input').count(), 0)
  await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
  await page.getByRole('button', { name: 'I want to know about ASD' }).waitFor()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page
    .getByRole('button', { name: 'Sign out of demo', exact: true })
    .click()
  await signInDemo(page, baseURL, {
    scenario: 'new',
    email: 'new-parent@example.test',
    open: false,
  })
  await page
    .getByRole('heading', { name: 'Welcome to AuRA', exact: true })
    .waitFor()
  await page.getByRole('link', { name: 'Settings', exact: true }).click()
  await page
    .getByRole('button', { name: 'Sign out of demo', exact: true })
    .click()
  await signInDemo(page, baseURL, { open: false })
  assert.equal(
    await page.locator('.onboarding-splash,.onboarding-card').count(),
    0,
  )

  await page.goto(baseURL)
  await signInDemo(page, baseURL, {
    scenario: 'new',
    email: 'decline@example.test',
    open: false,
  })
  await page
    .getByRole('heading', { name: 'A first step, at your own pace.' })
    .waitFor()
  await next()
  await page
    .getByRole('button', { name: 'Decline / Exit', exact: true })
    .click()
  await page.getByLabel('Demo email address').waitFor()
  await clientNavigate('/onboarding/parent-child')
  assert.equal(new URL(page.url()).pathname, '/auth/login')
  await signInDemo(page, baseURL, {
    scenario: 'new',
    email: 'decline@example.test',
    open: false,
  })
  await page
    .getByRole('heading', { name: 'Your privacy comes first.' })
    .waitFor()
  assert.equal(await page.getByRole('checkbox').isChecked(), false)
  await page.reload()
  await page.getByLabel('Demo email address').waitFor()
  assert.equal(new URL(page.url()).pathname, '/auth/login')
  assert.equal(await page.getByLabel('Demo email address').inputValue(), '')
  assert.equal(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
    0,
  )

  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [width, height] of [
    [1024, 768],
    [390, 844],
    [320, 640],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto(baseURL)
    await page.getByLabel('Demo email address').waitFor()
    await assertStandalone()
    assert.equal(await page.locator('.auth-robot video').count(), 0)
    await page.locator('.auth-robot img').waitFor()
    await capture(`login-${width}`)
    await signInDemo(page, baseURL, {
      scenario: 'new',
      email: `mobile${width}@example.test`,
      open: false,
    })
    await page
      .getByRole('heading', { name: 'A first step, at your own pace.' })
      .waitFor()
    await capture(`about-${width}`)
    await next()
    await capture(`consent-${width}`)
    await page.getByRole('checkbox').check()
    await next()
    await completeDetails('36')
    await capture(`parent-child-${width}`)
    await next()
    await page.getByRole('heading', { name: 'You’re all set!' }).waitFor()
    await capture(`complete-${width}`)
    await assertStandalone()
    await page
      .getByRole('button', { name: 'Continue to AuRA', exact: true })
      .click()
    await page
      .getByRole('heading', { name: 'Welcome to AuRA', exact: true })
      .waitFor()
  }

  const fallback = await browser.newPage({ reducedMotion: 'no-preference' })
  await fallback.route('**/*aurabot-animate*', (route) =>
    route.request().resourceType() === 'media'
      ? route.abort()
      : route.continue(),
  )
  await fallback.goto(baseURL)
  await fallback.locator('.auth-robot img').waitFor()
  await fallback.close()
  assert.deepEqual(errors, [])
  console.log(
    'Onboarding browser checks passed: immediate login, video/reduced-motion/fallback, registration, consent and URL guards, eligibility, Back/resume, completion, returning fixtures, logout, reset/privacy, and responsive layouts.',
  )
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true })
  console.error('Failure URL:', page.url())
  throw error
} finally {
  await browser.close()
}
