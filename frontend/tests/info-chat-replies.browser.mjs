import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'no-preference' })
    await signInDemo(page, baseURL)
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    async function advance(milliseconds) {
      // Let React commit each phase before advancing timers for the next phase.
      for (let elapsed = 0; elapsed < milliseconds; elapsed += 250)
        await page.clock.runFor(Math.min(250, milliseconds - elapsed))
    }
    await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
    assert.equal(await page.locator('.message').count(), 0, 'Keep the composer-first opening')
    await advance(750)
    assert.equal(await page.locator('.message--typing').count(), 1)
    await advance(15000)
    await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).click()

    const messages = page.locator('.message')
    assert.equal(await page.locator('.message--typing').count(), 1, 'Show thinking while retrieving the reply')
    assert(await page.getByLabel('Your response').isDisabled())
    await advance(450)
    assert.equal(await messages.count(), 3, 'Keep the greeting and user message; show only the first queued reply')
    assert.equal(await page.locator('.message--typing').count(), 1, 'Show one thinking bubble with its avatar')
    assert.equal(await page.locator('.knowledge-sources').count(), 0, 'Do not reveal sources while thinking')
    assert.equal(await page.getByRole('button', { name: 'Learn more', exact: true }).count(), 0)
    await advance(1200)
    assert.equal(await page.locator('.chat-typing-cursor').count(), 1)
    const partial = await messages.last().locator('.message-bubble > p').first().innerText()
    assert(partial.length > 0 && partial.length < 140, 'Reveal answer progressively')
    assert.equal(await messages.count(), 3, 'Do not show the second reply before the first finishes')
    assert.equal(await page.locator('.knowledge-sources').count(), 0)

    await advance(20000)
    assert.equal(await messages.count(), 4, 'Reveal both queued replies in order')
    assert.equal(await page.locator('.knowledge-sources').count(), 1)
    assert(await page.getByRole('button', { name: 'Learn more', exact: true }).isEnabled())
    assert(await page.getByLabel('Your response').isEnabled())

    await page.getByLabel('Your response').fill('What are the signs of ASD?')
    await page.getByRole('button', { name: 'Send message', exact: true }).click()
    assert.equal(await page.locator('.message--typing').count(), 1)
    await advance(1700)
    assert.equal(await page.locator('.chat-typing-cursor').count(), 1, 'Animate subsequent free-text replies too')
    assert.equal(await messages.count(), 6, 'Keep the existing transcript')
    await advance(25000)
    assert.equal(await page.locator('.chat-typing-cursor,.message--typing').count(), 0)
    assert((await messages.last().innerText()).includes('Possible signs include'))
    assert(await page.getByLabel('Your response').isEnabled())
    assert(await page.getByRole('log').evaluate((element) =>
      element.scrollHeight - element.scrollTop - element.clientHeight < 80), 'Follow the growing response at the bottom')
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: 'Learn about ASD', exact: true }).click()
    await advance(2000)
    assert.equal(await page.locator('.chat-typing-cursor,.message--typing').count(), 0)
    assert(await page.getByLabel('Your response').isEnabled(), 'Reduced-motion replies complete without a typewriter delay')
    console.log(`${viewport.width}px: thinking, progressive typing, ordered replies, delayed sources/actions, transcript and reduced motion passed.`)
    await page.close()
  }
} finally {
  await browser.close()
}
