import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
})
const errors = []
const output = designReviewPath()
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
  assert.equal(new URL(page.url()).pathname, '/chat')
  assert.equal(await page.locator('.sidebar').getByRole('link', { name: 'Know About ASD', exact: true }).count(), 0)
  await capture(page, 'implemented-1')
  await checkLayout(page)
  await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
  await page.getByRole('button', { name: 'I want to know about ASD' }).waitFor()
  await capture(page, 'implemented-2')
  await page.getByRole('button', { name: 'I want to know about ASD' }).click()
  await page.getByRole('button', { name: 'Learn more', exact: true }).waitFor()
  assert.equal(new URL(page.url()).pathname, '/chat')
  await capture(page, 'implemented-3')
  await page.getByRole('button', { name: 'Learn more', exact: true }).click()
  await page
    .getByRole('link', { name: 'CDC · About Autism Spectrum Disorder' })
    .waitFor()
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page.getByRole('radio', { name: 'English', exact: true }).check()
  await page.getByRole('button', { name: 'Start pre-assessment', exact: true }).click()
  await page.getByRole('button', { name: 'Sometimes', exact: true }).waitFor()
  const choice = page.getByRole('button', { name: 'Sometimes', exact: true })
  await choice.evaluate((button) => {
    button.click()
    button.click()
  })
  await page.getByRole('heading', { name: 'Follow-up Question:' }).waitFor()
  await capture(page, 'implemented-4')
  assert.equal(
    await page
      .getByRole('button', { name: 'Next question', exact: false })
      .count(),
    0,
  )
  const originalText = 'Sometimes he look, but not always'
  await page.getByLabel('Your response').fill(originalText)
  await page.getByLabel('Your response').press('Enter')
  await page.getByRole('heading', { name: 'Question 2 of 13: Eye Contact' }).waitFor()
  assert.equal(await page.getByText(originalText, { exact: true }).count(), 1)
  assert.match(await page.getByRole('progressbar').getAttribute('value'), /^2$/)
  await capture(page, 'implemented-5')
  await page.getByText('Sometimes', { exact: true }).last().waitFor()
  await page
    .getByRole('heading', { name: 'Question 2 of 13: Eye Contact' })
    .waitFor()
  assert.equal(await page.getByRole('progressbar').getAttribute('value'), '2')
  assert.equal(await page.locator('.result-placeholder').count(), 0)
  assert.equal(await page.evaluate(() => localStorage.length), 0)
  assert.equal(await page.evaluate(() => sessionStorage.length), 0)

  for (const title of ['Resources', 'History', 'Support', 'Settings']) {
    await page.getByRole('link', { name: title, exact: true }).click()
    await page.getByRole('heading', { name: title, exact: true }).waitFor()
    if (title === 'History') await page.getByRole('list', { name: 'Saved sessions' }).waitFor()
    if (title === 'Resources') await page.getByLabel('Search resources', { exact: true }).waitFor()
    if (title === 'Support') await page.getByRole('heading', { name: 'Frequently asked questions', exact: true }).waitFor()
    if (title === 'Settings') await page.getByRole('button', { name: 'Sign out of demo', exact: true }).waitFor()
  }
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page
    .getByRole('heading', { name: 'Question 2 of 13: Eye Contact' })
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
    await page.getByRole('radio', { name: 'English', exact: true }).check()
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
    await page.getByRole('heading', { name: 'Question 2 of 13: Eye Contact' }).waitFor()
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
  await page.getByRole('button', { name: 'I want to know about ASD', exact: true }).click()
  await page.getByRole('button', { name: 'Learn more', exact: true }).waitFor()
  const informationMessageCount = await page.locator('.message').count()
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page.getByRole('radio', { name: 'English', exact: true }).check()
  await page.getByRole('button', { name: 'Start pre-assessment' }).click()
  await page.getByRole('button', { name: 'Sometimes', exact: true }).click()
  await page.getByRole('heading', { name: 'Follow-up Question:' }).waitFor()
  const assessmentObservation = 'A fictional observation kept in the assessment.'
  await page.getByLabel('Your response').fill(assessmentObservation)
  await page.getByLabel('Your response').press('Enter')
  await page.getByRole('heading', { name: 'Question 2 of 13: Eye Contact' }).waitFor()
  await page.getByRole('link', { name: 'Chat', exact: true }).click()
  await page.getByText('Hello from the chat screen', { exact: true }).waitFor()
  assert.equal(await page.locator('.message').count(), informationMessageCount)
  assert.equal(await page.getByRole('heading', { name: 'Welcome to AuRA', exact: true }).count(), 0)
  assert.equal(await page.getByText(assessmentObservation, { exact: true }).count(), 0)
  await page.locator('.sidebar .brand').focus()
  await page.keyboard.press('Enter')
  await page.waitForURL('**/chat')
  await page.getByText('Hello from the chat screen', { exact: true }).waitFor()
  await page.getByRole('link', { name: 'Assessments', exact: true }).click()
  await page.getByText(assessmentObservation, { exact: true }).waitFor()
  assert.equal(await page.getByText('Hello from the chat screen', { exact: true }).count(), 0)

  await page.setViewportSize({ width: 390, height: 844 })
  await signInDemo(page, baseURL)
  async function mobileNavigate(name) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar').getByRole('link', { name, exact: true }).click()
  }
  await mobileNavigate('Assessments')
  await page.getByRole('button', { name: 'Start pre-assessment' }).waitFor()
  await mobileNavigate('Chat')
  await page.getByRole('heading', { name: 'Welcome to AuRA', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Learn about ASD', exact: true }).click()
  await page.getByRole('button', { name: 'Learn more', exact: true }).waitFor()
  await page.getByLabel('Your response').fill('A fictional mobile information message')
  await page.getByLabel('Your response').press('Enter')
  await page.getByText(/This demonstration uses predefined responses/).waitFor()
  await mobileNavigate('Assessments')
  await page.getByRole('button', { name: 'Start pre-assessment' }).waitFor()
  await mobileNavigate('Chat')
  await page.getByText('A fictional mobile information message', { exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Welcome to AuRA', exact: true }).count(), 0)
  await checkLayout(page)
  await page.evaluate(() => {
    history.pushState({}, '', '/about-asd')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await page.waitForURL('**/chat')
  await page.getByText('A fictional mobile information message', { exact: true }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'Welcome to AuRA', exact: true }).count(), 0)
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed: five states, information/assessment separation and resume, welcome gating, all routes, answer flow, duplicate protection, privacy, reload reset, mobile navigation, and four responsive sizes.',
  )
} finally {
  await browser.close()
}
