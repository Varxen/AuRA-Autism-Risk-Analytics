import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'
import { assessmentCopy } from '../src/data/assessmentCopy.ts'
import { assessmentProcessingStepsByLanguage } from '../src/data/assessmentProcessingSteps.ts'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('history')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const errors = []
try {
  for (const [width, height] of [[1440, 900], [320, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => errors.push(error.message))
    await signInDemo(page, baseURL)
    async function navigate(name) {
      if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.locator('.sidebar').getByRole('link', { name, exact: true }).click()
      if (name === 'History' || name === 'Settings') await page.getByRole('heading', { name, exact: true }).waitFor()
    }
    await navigate('History')
    await page.getByRole('heading', { name: 'No sessions yet' }).waitFor()
    await page.screenshot({ path: `${output}/empty-${width}.png` })
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    async function advanceUntil(predicate, message, limit = 160) {
      for (let attempt = 0; attempt < limit; attempt += 1) {
        if (await predicate()) return
        await page.clock.runFor(100)
      }
      assert.fail(message)
    }
    async function settle() {
      await advanceUntil(async () => await page.getByRole('log').getAttribute('aria-busy') === 'false', 'Conversation did not settle')
    }
    async function createChat(text) {
      await page.getByRole('button', { name: 'New chat', exact: true }).click()
      await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
      await settle()
      await page.getByLabel('Your response', { exact: true }).fill(text)
      await page.getByLabel('Your response', { exact: true }).press('Enter')
    }
    async function open(id) {
      await page.locator(`.history-session[data-session-id="${id}"]`).click()
      await page.locator('.history-page').waitFor({ state: 'detached' })
    }
    async function startAssessment(language) {
      await page.getByRole('button', { name: 'New assessment', exact: true }).click()
      assert.equal(await page.locator('input[name="assessment-language"]:checked').count(), 0)
      await page.getByRole('radio', { name: language === 'fil' ? 'Tagalog' : 'English', exact: true }).check()
      await page.getByRole('button', { name: assessmentCopy[language].start, exact: true }).click()
      await settle()
    }

    const firstText = 'First history conversation'
    const secondText = 'Second history conversation'
    await createChat(firstText)
    await navigate('History')
    await page.locator('.history-session[data-session-kind="chat"]').waitFor()
    const firstId = await page.locator('.history-session[data-session-kind="chat"]').getAttribute('data-session-id')
    assert(await page.getByRole('button', { name: 'New chat', exact: true }).isDisabled())
    assert(await page.locator('.history-session').isDisabled(), 'Session switching waits for the pending reply')
    await advanceUntil(async () => await page.getByRole('button', { name: 'New chat', exact: true }).isEnabled(), 'Pending reply did not finish')
    await createChat(secondText)
    await settle()
    await navigate('History')
    assert.equal(await page.locator('.history-session[data-session-kind="chat"]').count(), 2)
    const secondId = await page.getByRole('button', { name: `Open chat: ${secondText}`, exact: true }).getAttribute('data-session-id')
    const firstCard = page.locator(`.history-session[data-session-id="${firstId}"]`)
    await firstCard.focus()
    await page.keyboard.press('Enter')
    await page.locator('.history-page').waitFor({ state: 'detached' })
    await page.getByText(firstText, { exact: true }).waitFor()
    assert.equal(await page.getByText(secondText, { exact: true }).count(), 0)
    assert.equal(await page.locator('.message--typing,.chat-typing-cursor').count(), 0)
    const extra = 'Another message in the first conversation'
    await page.getByLabel('Your response', { exact: true }).fill(extra)
    await page.getByLabel('Your response', { exact: true }).press('Enter')
    await settle()
    await navigate('History')
    assert.equal(await page.locator('.history-session').first().getAttribute('data-session-id'), firstId, 'Latest updated session sorts first')
    await open(secondId)
    await page.getByText(secondText, { exact: true }).waitFor()
    assert.equal(await page.getByText(firstText, { exact: true }).count(), 0)
    assert.equal(await page.getByText(extra, { exact: true }).count(), 0)
    await navigate('History')

    await startAssessment('en')
    await page.getByRole('button', { name: 'Always', exact: true }).click()
    await settle()
    const observation = '  Saved English history explanation.  '
    await page.getByLabel('Your response', { exact: true }).fill(observation)
    await page.getByLabel('Your response', { exact: true }).press('Enter')
    await settle()
    await navigate('History')
    const englishId = await page.locator('.history-session[data-session-kind="assessment"]').getAttribute('data-session-id')
    assert.equal(await page.locator('.history-session').count(), 3)
    await startAssessment('fil')
    await page.getByRole('button', { name: 'Minsan', exact: true }).click()
    await settle()
    await navigate('History')
    const filipinoId = await page.locator('.history-session[data-session-kind="assessment"]').filter({ hasText: 'Tagalog' }).getAttribute('data-session-id')
    assert.equal(await page.locator('.history-session').count(), 4)
    await open(englishId)
    await page.getByRole('heading', { name: 'Question 2 of 13: Eye Contact', exact: true }).waitFor()
    assert.equal(await page.locator('.assessment-language-badge').innerText(), 'English')
    assert.equal(await page.locator('.assessment-exchange').first().locator('.message--user:not(.structured-response) p').textContent(), observation)
    assert.equal(await page.getByRole('progressbar').getAttribute('value'), '2')
    await page.evaluate(async () => {
      const { assessmentService } = await import('/src/services/api/assessmentService.ts')
      const original = assessmentService.nextQuestion
      assessmentService.nextQuestion = async () => {
        assessmentService.nextQuestion = original
        throw new Error('Simulated history transition failure')
      }
    })
    await page.getByRole('button', { name: 'Sometimes', exact: true }).click()
    await settle()
    const retained = 'Original explanation retained across history and a failed transition.'
    await page.getByLabel('Your response', { exact: true }).fill(retained)
    await page.getByLabel('Your response', { exact: true }).press('Enter')
    await settle()
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor()
    await navigate('History')
    await open(filipinoId)
    await page.getByLabel(assessmentCopy.fil.responseLabel, { exact: true }).waitFor()
    await navigate('History')
    await open(englishId)
    await page.getByRole('button', { name: 'Retry', exact: true }).click()
    await settle()
    await page.getByRole('heading', { name: 'Question 3 of 13: Joint Attention', exact: true }).waitFor()
    assert.equal(await page.getByText(retained, { exact: true }).count(), 1)
    await navigate('History')
    await open(filipinoId)
    await page.getByRole('heading', { name: assessmentCopy.fil.followUpHeading, exact: true }).waitFor()
    assert.equal(await page.locator('.assessment-language-badge').innerText(), 'Tagalog')
    assert.equal(await page.getByRole('progressbar').getAttribute('value'), '1')
    assert(await page.getByLabel(assessmentCopy.fil.responseLabel, { exact: true }).isEnabled())
    assert.equal(await page.getByText(observation.trim(), { exact: true }).count(), 0)
    await page.getByRole('button', { name: assessmentCopy.fil.skip, exact: true }).click()
    await advanceUntil(async () => await page.locator('.assessment-processing').count() === 1, 'Preview did not begin')
    const savedStep = assessmentProcessingStepsByLanguage.fil[1].label
    await advanceUntil(async () => await page.getByRole('heading', { name: savedStep, exact: true }).count() === 1, 'Second processing stage did not begin')
    await navigate('History')
    assert((await page.locator(`.history-session[data-session-id="${filipinoId}"]`).innerText()).includes('Processing preview'))
    await startAssessment('en')
    await navigate('History')
    assert.equal(await page.locator('.history-session').count(), 5)
    const thirdId = await page.locator('.history-session[data-session-kind="assessment"]').filter({ hasText: 'English' }).filter({ hasText: 'Question 1 of 13' }).getAttribute('data-session-id')
    await open(filipinoId)
    await page.locator('.assessment-processing').waitFor()
    assert.equal(await page.locator('.processing-copy h2').innerText(), savedStep, 'Switching assessments retains the saved processing stage')
    await advanceUntil(async () => await page.getByRole('heading', { name: assessmentCopy.fil.completionTitle, exact: true }).count() === 1, 'Processing did not finish')
    await navigate('History')
    assert((await page.locator(`.history-session[data-session-id="${filipinoId}"]`).innerText()).includes('Completed'))
    await open(thirdId)
    await page.getByRole('heading', { name: 'Question 1 of 13: Response to Name', exact: true }).waitFor()
    await navigate('History')
    await open(filipinoId)
    await page.getByRole('heading', { name: assessmentCopy.fil.completionTitle, exact: true }).waitFor()
    assert.equal(await page.locator('.assessment-processing').count(), 0, 'Completed processing does not replay after another assessment')
    await navigate('History')
    assert.equal(new Set(await page.locator('.history-session').evaluateAll((items) => items.map((item) => item.dataset.sessionId))).size, 5)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
    await page.screenshot({ path: `${output}/sessions-${width}.png` })
    await page.clock.resume()
    await navigate('Settings')
    await page.getByRole('button', { name: 'Sign out of demo', exact: true }).click()
    await page.getByLabel('Demo email address').waitFor()
    await signInDemo(page, baseURL, { open: false, email: 'another-parent@example.test' })
    await navigate('History')
    await page.getByRole('heading', { name: 'No sessions yet' }).waitFor()
    await page.reload()
    await page.getByLabel('Demo email address').waitFor()
    await signInDemo(page, baseURL, { open: false })
    await navigate('History')
    await page.getByRole('heading', { name: 'No sessions yet' }).waitFor()
    console.log(`${width}px: multiple chats and assessments, exact session resume, ongoing replies, language/progress, processing resume, keyboard access, ordering, privacy, logout and refresh passed.`)
    await page.close()
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
