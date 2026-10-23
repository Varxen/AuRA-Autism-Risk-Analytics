import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('frontend-pages')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const errors = []

try {
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [320, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${baseURL}/auth/login`)
    await page.getByLabel('Demo email address').fill('privacy@example.test')
    const privacy = page.getByRole('button', { name: 'Privacy Policy', exact: true })
    await privacy.click()
    const policy = page.getByRole('dialog')
    await policy.getByRole('heading', { name: 'Privacy Policy', exact: true }).waitFor()
    assert.equal(await policy.getByText('Under development', { exact: true }).count(), 1)
    assert.equal(new URL(page.url()).pathname, '/auth/login', 'Policy links must not submit the login form')
    await page.keyboard.press('Escape')
    assert.equal(await privacy.evaluate((element) => element === document.activeElement), true, 'Dialog restores trigger focus')
    assert.equal(await page.getByLabel('Demo email address').inputValue(), 'privacy@example.test')
    await page.getByRole('button', { name: 'Terms and Conditions', exact: true }).click()
    await policy.getByRole('heading', { name: 'Terms and Conditions', exact: true }).waitFor()
    await policy.getByRole('button', { name: 'Close policy notice' }).click()
    await page.screenshot({ path: `${output}/login-${width}.png` })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (width > 760) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, 'Desktop login fits viewport')
    } else {
      assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight), true, 'Mobile login remains scrollable')
    }
    await signInDemo(page, baseURL, { open: false })
    await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
    await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).waitFor()
    const messages = await page.getByRole('log').locator('.message-bubble').allTextContents()
    assert(messages.length > 0, 'Chat transcript exists before navigating away')

    async function navigate(name) {
      if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.locator('.sidebar').getByRole('link', { name, exact: true }).click()
    }
    async function noOverflow() {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}`)
      assert.equal(await page.locator('.content-page').evaluate((element) => element.scrollWidth <= element.clientWidth + 1), true, 'Content panel does not overflow')
    }
    await navigate('Resources')
    await page.getByRole('heading', { name: 'Resources', exact: true }).waitFor()
    await noOverflow()
    assert.equal(await page.locator('.resource-card').count(), 3)
    for (const link of await page.locator('.resource-card a').all()) {
      assert.match(await link.getAttribute('href'), /^https:\/\/(www\.cdc\.gov|www\.who\.int)\//)
      assert.equal(await link.getAttribute('target'), '_blank')
      assert.match(await link.getAttribute('rel'), /noopener/)
    }
    await page.getByRole('button', { name: 'Development', exact: true }).click()
    assert.equal(await page.locator('.resource-card').count(), 1)
    await page.getByLabel('Search resources', { exact: true }).fill('nothing matches')
    await page.getByText('No matching resources. Try another search or topic.').waitFor()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    assert.equal(await page.locator('.resource-card').count(), 3)
    await page.getByLabel('Search resources', { exact: true }).fill('WORLD HEALTH')
    assert.equal(await page.locator('.resource-card').count(), 1)
    await page.getByLabel('Search resources', { exact: true }).fill('')
    await page.locator('.content-page').evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: `${output}/resources-${width}.png` })
    await page.getByRole('link', { name: /Explore the pre-assessment/ }).click()
    assert.equal(await page.locator('input[name="assessment-language"]:checked').count(), 0, 'Resources cannot bypass language choice')

    await navigate('Support')
    await page.getByRole('heading', { name: 'Support', exact: true }).waitFor()
    const faq = page.locator('summary').first()
    await faq.focus()
    await page.keyboard.press('Enter')
    assert.equal(await page.locator('details').first().getAttribute('open'), '')
    assert.equal(await faq.evaluate((element) => getComputedStyle(element).outlineStyle), 'solid', 'Keyboard focus is visible')
    await noOverflow()
    await page.locator('.content-page').evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: `${output}/support-${width}.png` })
    await navigate('Settings')
    await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor()
    await page.getByText('Reduced motion: on', { exact: true }).waitFor()
    await page.getByText('1 information chat \u00b7 0 assessments', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Privacy Policy', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.keyboard.press('Escape')
    await noOverflow()
    await page.locator('.content-page').evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: `${output}/settings-${width}.png` })
    await navigate('Chat')
    await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Start Chat', exact: true }).count(), 0)
    assert.deepEqual(await page.getByRole('log').locator('.message-bubble').allTextContents(), messages, 'New pages preserve the exact chat transcript')
    if (width === 390) {
      // A shorter viewport approximates keyboard space; this is not a physical-keyboard test.
      await page.setViewportSize({ width, height: 480 })
      await page.getByLabel('Your response', { exact: true }).fill('A long observation '.repeat(90))
      await page.getByLabel('Your response', { exact: true }).scrollIntoViewIfNeeded()
      const composer = await page.locator('.chat-input').boundingBox()
      assert(composer.y + composer.height <= 481, 'Composer stays reachable in a shorter viewport')
      await page.screenshot({ path: `${output}/short-viewport-composer.png` })
      await page.setViewportSize({ width, height })
    }
    await navigate('Settings')
    await page.getByRole('button', { name: 'Sign out of demo', exact: true }).click()
    await page.getByLabel('Demo email address').waitFor()
    await signInDemo(page, baseURL, { open: false })
    await navigate('History')
    await page.getByRole('heading', { name: 'No sessions yet', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log('Frontend pages passed: resource filtering/source links, FAQ keyboard access, policy dialogs/focus, settings/sign-out, session preservation, responsive layouts and short viewport composer.')
} finally {
  await browser.close()
}
