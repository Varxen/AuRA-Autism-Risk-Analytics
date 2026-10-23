import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('assessment-preview')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const errors = []
try {
  for (const [width, height] of [[1440, 900], [320, 640]]) {
    for (const scenario of ['fresh', 'typing', 'partial']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: scenario === 'typing' ? 'no-preference' : 'reduce' })
      page.on('pageerror', (error) => errors.push(error.message))
      await signInDemo(page, baseURL)
      if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.locator('.sidebar').getByRole('link', { name: 'Assessments', exact: true }).click()
      await page.clock.install()
      await page.clock.pauseAt(new Date(Date.now() + 1000))
      async function advanceUntil(predicate, message, limit = 120) {
        for (let attempt = 0; attempt < limit; attempt += 1) {
          if (await predicate()) return
          await page.clock.runFor(100)
        }
        assert.fail(message)
      }
      async function settle() {
        await advanceUntil(async () => await page.getByRole('log').getAttribute('aria-busy') === 'false', 'Question did not settle')
      }
      const original = '  An original fictional observation kept exactly.  '
      if (scenario !== 'fresh') {
        await page.getByRole('radio', { name: 'English', exact: true }).check()
        await page.getByRole('button', { name: 'Start pre-assessment', exact: true }).click()
        if (scenario === 'typing') {
          await advanceUntil(async () => await page.locator('.chat-typing-cursor').count() === 1, 'Greeting never began typing')
        } else {
          await settle()
          await page.getByRole('button', { name: 'Always', exact: true }).click()
          await settle()
          await page.getByLabel('Your response').fill(original)
          await page.getByLabel('Your response').press('Enter')
          await settle()
          await page.getByRole('button', { name: 'Never', exact: true }).click()
          await settle()
          await page.getByRole('log').evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')) })
        }
      }
      if (await page.getByRole('radio', { name: 'English', exact: true }).count())
        await page.getByRole('radio', { name: 'English', exact: true }).check()
      const skip = page.getByRole('button', { name: 'Skip to processing', exact: true })
      assert(await skip.isEnabled())
      await skip.evaluate((button) => { button.click(); button.click() })
      await advanceUntil(async () => await page.locator('.assessment-processing').count() === 1, 'Skip did not reach processing')
      const processor = page.locator('.assessment-processing')
      await processor.getByRole('heading', { name: 'Reviewing your answers...', exact: true }).waitFor()
      assert.equal(await page.locator('.assessment-processing').count(), 1)
      assert.equal(await page.locator('.chat-typing-cursor').count(), 0, 'Skipping cancels any earlier typewriter animation')
      assert.equal(await page.getByRole('progressbar').getAttribute('value'), '13')
      assert.equal(await page.locator('.assessment-exchange').count(), 13)
      assert.equal(await page.locator('.follow-up-message').count(), 13)
      assert.equal(await page.locator('.structured-response').count(), 13)
      assert.equal(await page.getByRole('button', { name: 'Skip to processing', exact: true }).count(), 0)
      assert(await page.getByText('Demo preview: unanswered items use fictional responses.', { exact: true }).isVisible())
      assert(await page.getByLabel('Your response').isDisabled())
      const log = page.getByRole('log')
      const logBox = await log.boundingBox()
      const processorBox = await processor.boundingBox()
      assert(processorBox.y >= logBox.y - 1, 'The entire processing bubble fits the conversation viewport')
      assert(processorBox.y + processorBox.height <= logBox.y + logBox.height + 1, 'Shortcut jumps to the processing bubble even after reading older messages')
      const first = page.getByRole('region', { name: 'Question 1 conversation', exact: true })
      if (scenario === 'partial') {
        assert.equal(await first.locator('.message--user:not(.structured-response) p').textContent(), original)
        assert((await first.locator('.structured-response').innerText()).includes('Always'))
        assert((await page.getByRole('region', { name: 'Question 2 conversation', exact: true }).locator('.structured-response').innerText()).includes('Never'))
      } else {
        assert((await first.locator('.message--user:not(.structured-response) p').innerText()).startsWith('[Demo preview]'))
      }
      assert((await page.getByRole('region', { name: 'Question 13 conversation', exact: true }).locator('.message--user:not(.structured-response) p').innerText()).startsWith('[Demo preview]'))
      assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      const composer = await page.locator('.chat-input').boundingBox()
      assert(composer.y >= 0 && composer.y + composer.height <= height + 1)
      await page.screenshot({ path: `${output}/${scenario}-${width}.png` })
      await advanceUntil(async () => await page.locator('.assessment-complete-message').count() === 1, 'Preview did not finish', 180)
      assert.match(await page.locator('.result-placeholder').innerText(), /No risk result available/)
      assert.equal(await page.locator('.assessment-exchange').count(), 13)
      console.log(`${width}px ${scenario}: shortcut, duplicate protection, fictional placeholders, preserved answers, visible processing, completion and privacy passed.`)
      await page.close()
    }
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
