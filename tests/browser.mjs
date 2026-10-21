import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})
const errors = []
const output = 'docs/design-review'
await mkdir(output, { recursive: true })

async function settle(page) {
  await page.waitForTimeout(500)
}
async function capture(page, name) {
  await page.mouse.move(0, 0)
  await settle(page)
  await page.screenshot({ path: `${output}/${name}.png` })
}
async function checkLayout(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    'No horizontal document overflow',
  )
  const input = page.locator('.chat-input')
  if (await input.count()) {
    const box = await input.boundingBox()
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height + 1,
      'Composer stays inside viewport',
    )
  }
}

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 810 },
    reducedMotion: 'reduce',
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await signInDemo(page, baseURL)
  await page.getByRole('heading', { name: 'Welcome to AuRA' }).waitFor()
  assert.equal(await page.getByLabel('Your response').count(), 0)
  await capture(page, 'implemented-1')
  await checkLayout(page)
  await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
  await page.getByRole('button', { name: 'I want to know about ASD' }).waitFor()
  await capture(page, 'implemented-2')
  await page.getByRole('button', { name: 'I want to know about ASD' }).click()
  await page.getByRole('button', { name: 'Learn more', exact: true }).waitFor()
  await capture(page, 'implemented-3')
  await page.getByRole('button', { name: 'Learn more', exact: true }).click()
  await page
    .getByRole('link', { name: 'CDC · About Autism Spectrum Disorder' })
    .waitFor()
  await page
    .getByRole('button', { name: 'Pre-assessment', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Sometimes', exact: true }).waitFor()
  const choice = page.getByRole('button', { name: 'Sometimes', exact: true })
  await choice.evaluate((button) => {
    button.click()
    button.click()
  })
  await page.getByRole('heading', { name: 'Follow-up Question:' }).waitFor()
  await page.getByRole('button', { name: 'Review structured answer' }).click()
  await capture(page, 'implemented-4')
  await page.getByRole('button', { name: 'Return to follow-up' }).click()
  assert.equal(
    await page
      .getByRole('button', { name: 'Next question', exact: false })
      .count(),
    0,
  )
  const originalText = 'Sometimes he look, but not always'
  await page.getByLabel('Your response').fill(originalText)
  await page.getByLabel('Your response').press('Enter')
  await page
    .getByRole('button', { name: 'Next question', exact: false })
    .waitFor()
  assert.equal(await page.getByText(originalText, { exact: true }).count(), 1)
  assert.match(await page.getByRole('progressbar').getAttribute('value'), /^1$/)
  await capture(page, 'implemented-5')
  await page.getByRole('button', { name: 'Review structured answer' }).click()
  await page.getByText('Sometimes', { exact: true }).last().waitFor()
  await page.getByRole('button', { name: 'Return to follow-up' }).click()
  await page
    .getByRole('button', { name: 'Next question', exact: false })
    .click()
  await page
    .getByRole('heading', { name: 'Question 2 is awaiting approved content' })
    .waitFor()
  await page
    .getByRole('heading', {
      name: 'Demonstration only · No risk result available',
    })
    .waitFor()
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '2')
  await page.getByRole('button', { name: 'Review saved answer' }).click()
  assert.ok(
    (await page.locator('.saved-answer').textContent()).includes(originalText),
  )
  assert.equal(await page.evaluate(() => localStorage.length), 0)
  assert.equal(await page.evaluate(() => sessionStorage.length), 0)

  for (const title of ['Resources', 'History', 'Support', 'Settings']) {
    await page.getByRole('link', { name: title, exact: true }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    await page.getByText('Under development', { exact: true }).waitFor()
  }
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Question 2 is awaiting approved content' })
    .waitFor()
  await page.reload()
  await page.getByLabel('Demo email address').waitFor()
  await signInDemo(page, baseURL)
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page.getByRole('button', { name: 'Start pre-assessment' }).waitFor()

  for (const [width, height] of [
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 640],
  ]) {
    await page.setViewportSize({ width, height })
    await signInDemo(page, baseURL)
    await settle(page)
    await checkLayout(page)
    await capture(page, `responsive-welcome-${width}`)
    if (width <= 760) {
      const menu = page.getByRole('button', { name: 'Open navigation' })
      await menu.click()
      await page.getByRole('dialog', { name: 'Navigation' }).waitFor()
      await page.keyboard.press('Escape')
      assert.equal(
        await menu.evaluate((element) => document.activeElement === element),
        true,
      )
      await menu.click()
      await page.getByRole('link', { name: 'Assessments', exact: true }).click()
    } else
      await page.getByRole('link', { name: 'Assessments', exact: true }).click()
    await page.getByRole('button', { name: 'Start pre-assessment' }).click()
    await page.getByRole('button', { name: 'Always', exact: true }).waitFor()
    await checkLayout(page)
    await capture(page, `responsive-question-${width}`)
    await page.getByRole('button', { name: 'Always', exact: true }).click()
    await page.getByRole('heading', { name: 'Follow-up Question:' }).waitFor()
    await page
      .getByLabel('Your response')
      .fill('A fictional response for this demonstration.')
    await page.getByLabel('Your response').press('Enter')
    await page
      .getByRole('button', { name: 'Next question', exact: false })
      .waitFor()
    await checkLayout(page)
    await capture(page, `responsive-followup-${width}`)
  }

  await page.setViewportSize({ width: 1440, height: 810 })
  await signInDemo(page, baseURL)
  assert.equal(await page.getByLabel('Your response').count(), 0)
  await page.getByRole('link', { name: 'Chat', exact: true }).click()
  await page.getByRole('heading', { name: 'Welcome to AuRA' }).waitFor()
  assert.equal(await page.getByLabel('Your response').count(), 0)
  await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
  await page.getByRole('button', { name: 'I want to know about ASD' }).waitFor()
  await page.getByLabel('Your response').fill('Hello from the chat screen')
  await page.getByLabel('Your response').press('Enter')
  await page.getByText('Hello from the chat screen', { exact: true }).waitFor()
  await page.getByText(/This demonstration uses predefined responses/).waitFor()
  await page.getByRole('link', { name: 'Know About ASD', exact: true }).click()
  await page.getByRole('button', { name: 'Learn more', exact: true }).waitFor()
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed: five states, all routes, answer flow, duplicate protection, privacy, reload reset, mobile navigation, and four responsive sizes.',
  )
} finally {
  await browser.close()
}
