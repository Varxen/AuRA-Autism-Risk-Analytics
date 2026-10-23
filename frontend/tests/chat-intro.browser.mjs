import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('chat-intro')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})

try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: 'no-preference',
    })
    await signInDemo(page, baseURL)
    const header = await page.locator('.app-header').boundingBox()
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
    assert(await page.getByPlaceholder('Type your response...').isVisible())
    assert.equal(await page.locator('.message').count(), 0, 'Composer appears before the assistant avatar')
    await page.screenshot({ path: `${output}/opening-${width}.png` })
    await page.clock.runFor(250)
    assert.equal(await page.locator('.message').count(), 0, 'Composer gets a pause before thinking')
    await page.clock.runFor(250)
    await page.locator('.message--typing').waitFor()
    assert.equal(await page.locator('.message--typing .typing > span:not(.sr-only)').count(), 3)
    assert.equal(await page.locator('.message--typing .message-avatar').count(), 1)
    assert.equal(await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).count(), 0)
    await page.screenshot({ path: `${output}/thinking-${width}.png` })

    await page.clock.runFor(450)
    assert.equal(await page.locator('.message--typing').count(), 1)
    await page.clock.runFor(1100)
    await page.locator('.chat-typing-cursor').waitFor()
    await page.clock.runFor(160)
    const partial = await page.locator('.message-bubble p').first().innerText()
    assert(partial.length > 0 && partial.length < 90, JSON.stringify(partial))
    assert.equal(await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).count(), 0)
    assert(await page.getByLabel('Your response').isDisabled())
    assert(await page.getByRole('button', { name: 'Learn about ASD', exact: true }).isDisabled())
    assert.equal(await page.getByRole('log').getAttribute('aria-busy'), 'true')
    await page.clock.runFor(1400)
    const beforeActions = await page.locator('.message').first().boundingBox()
    await page.screenshot({ path: `${output}/typing-${width}.png` })

    await page.clock.runFor(10000)
    await page.waitForTimeout(800)
    const education = page.getByRole('button', { name: 'I want to know about ASD', exact: true })
    assert(await education.isVisible())
    assert(await page.getByRole('button', { name: 'Pre-assessment', exact: true }).isVisible())
    assert(await education.isEnabled())
    const actionsBox = await page.locator('.intro-actions').boundingBox()
    assert(actionsBox.height > 100, 'Choices expand visibly after typing')
    assert(await page.getByLabel('Your response').isEnabled())
    assert.equal(await page.locator('.chat-typing-cursor,.message--typing').count(), 0)
    assert.equal(await page.getByRole('log').getAttribute('aria-busy'), 'false')
    assert((await page.locator('.message-bubble p').first().innerText()).includes('How can I help you today?'))
    const afterActions = await page.locator('.message').first().boundingBox()
    assert(afterActions.y < beforeActions.y, 'Revealed choices move the greeting upward')
    assert.deepEqual(await page.locator('.app-header').boundingBox(), header)
    const composer = await page.locator('.chat-input').boundingBox()
    assert(composer.y >= 0 && composer.y + composer.height <= height)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/ready-${width}.png` })

    async function navigate(name) {
      if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.locator('.sidebar').getByRole('link', { name, exact: true }).click()
    }
    await navigate('Assessments')
    await page.getByRole('button', { name: 'Start pre-assessment' }).waitFor()
    await navigate('Chat')
    await education.waitFor()
    assert.equal(await page.locator('.chat-typing-cursor,.message--typing').count(), 0)
    console.log(`${width}px: composer first, paused thinking, typed greeting, delayed buttons, upward movement, stable header/composer and no intro replay passed.`)
    await page.close()
  }

  const reduced = await browser.newPage({ reducedMotion: 'reduce' })
  await signInDemo(reduced, baseURL)
  await reduced.getByRole('button', { name: 'Start Chat', exact: true }).click()
  await reduced.getByRole('button', { name: 'I want to know about ASD', exact: true }).waitFor()
  assert.equal(await reduced.locator('.chat-typing-cursor').count(), 0)
  assert(await reduced.getByLabel('Your response').isEnabled())
  console.log('Reduced-motion greeting displays complete text without typewriter animation.')
  await reduced.close()
} finally {
  await browser.close()
}
