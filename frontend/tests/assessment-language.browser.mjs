import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'
import { getQuestionnaireQuestions } from '../src/data/mockQuestions.ts'
import { assessmentCopy } from '../src/data/assessmentCopy.ts'
import { assessmentProcessingStepsByLanguage } from '../src/data/assessmentProcessingSteps.ts'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('assessment-language')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const errors = []
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => errors.push(error.message))
    await signInDemo(page, baseURL)
    async function navigate(name) {
      if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.locator('.sidebar').getByRole('link', { name, exact: true }).click()
    }
    if (width === 1440) {
      await page.getByRole('button', { name: 'Start Chat', exact: true }).click()
      await page.getByRole('button', { name: 'Pre-assessment', exact: true }).click()
    } else await navigate('Assessments')
    await page.getByRole('radio', { name: 'Tagalog', exact: true }).waitFor()
    assert.equal(await page.locator('input[name="assessment-language"]:checked').count(), 0)
    assert(await page.getByRole('button', { name: 'Start pre-assessment', exact: true }).isDisabled())
    assert(await page.getByRole('button', { name: 'Skip to processing', exact: true }).isDisabled())
    assert.equal(await page.locator('.question-message').count(), 0)
    assert.equal(await page.locator('.app-header .header-assessment').count(), 0, 'Assessment header has no redundant start action')
    assert((await page.locator('.app-header').boundingBox()).height <= 76, 'Assessment header is compact before starting')
    assert.equal(await page.locator('.question-message').count(), 0, 'Header cannot bypass language choice')
    await page.getByRole('radio', { name: 'English', exact: true }).check()
    assert(await page.getByRole('button', { name: 'Start pre-assessment', exact: true }).isEnabled())
    await page.getByRole('radio', { name: 'Tagalog', exact: true }).check()
    await page.screenshot({ path: `${output}/choice-${width}.png` })
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    async function settle() {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (await page.getByRole('log').getAttribute('aria-busy') === 'false') return
        await page.clock.runFor(100)
      }
      assert.fail('Assessment did not settle')
    }
    await page.getByRole('button', { name: 'Simulan ang paunang pagtatasa', exact: true }).click()
    await settle()
    const copy = assessmentCopy.fil
    const questions = getQuestionnaireQuestions('fil')
    for (const question of questions) {
      const number = question.questionNumber
      const exchange = page.getByRole('region', { name: copy.conversationLabel(number), exact: true })
      await exchange.getByRole('heading', { name: copy.questionHeading(number, 13, question.indicatorLabel), exact: true }).waitFor()
      assert.equal(await exchange.locator('.question-message p').innerText(), question.mainQuestion)
      assert.equal(await page.locator('.assessment-page').getAttribute('lang'), 'fil')
      assert.equal(await page.locator('.assessment-language-badge').innerText(), 'Tagalog')
      assert.equal(await page.getByRole('progressbar').getAttribute('value'), String(number))
      const options = page.getByRole('group', { name: copy.chooseAnswer, exact: true })
      assert.deepEqual(await options.getByRole('button').allTextContents(), number <= 9 ? ['Palagi', 'Minsan', 'Hindi kailanman'] : ['Oo', 'Minsan', 'Hindi'])
      if ([1, 8, 10, 13].includes(number)) await page.screenshot({ path: `${output}/question-${number}-${width}.png` })
      await options.getByRole('button', { name: 'Minsan', exact: true }).click()
      await settle()
      assert.equal(await exchange.locator('.follow-up-message p').innerText(), question.followUpQuestion)
      assert.equal(await exchange.locator('.follow-up-message h2').innerText(), copy.followUpHeading)
      const response = `  Minsan tumitingin siya, pero hindi palagi. Obserbasyon ${number}.  `
      await page.getByLabel(copy.responseLabel, { exact: true }).fill(response)
      await page.getByLabel(copy.responseLabel, { exact: true }).press('Enter')
      await settle()
      assert.equal(await exchange.locator('.message--user:not(.structured-response) p').textContent(), response)
      assert.equal(await page.locator('.structured-response').count(), number)
      if (number === 4) {
        await navigate('Chat')
        await navigate('Assessments')
        await page.locator('.assessment-language-badge').waitFor()
        assert.equal(await page.locator('.assessment-language-badge').innerText(), 'Tagalog')
        assert.equal(await page.getByRole('radio').count(), 0)
      }
    }
    for (const step of assessmentProcessingStepsByLanguage.fil) {
      await page.locator('.assessment-processing').getByRole('heading', { name: step.label, exact: true }).waitFor()
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await page.clock.runFor(100)
        if (await page.getByRole('heading', { name: step.label, exact: true }).count() === 0) break
      }
    }
    await page.getByRole('heading', { name: copy.completionTitle, exact: true }).waitFor()
    assert.equal(await page.locator('.question-message').count(), 13)
    assert.equal(await page.locator('.follow-up-message').count(), 13)
    assert.equal(await page.locator('.result-placeholder h3').innerText(), copy.noRiskHeading)
    const inputBox = await page.locator('.chat-input').boundingBox()
    assert(inputBox.y >= 0 && inputBox.y + inputBox.height <= height + 1)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
    await page.screenshot({ path: `${output}/completed-${width}.png` })
    await page.clock.resume()
    await signInDemo(page, baseURL)
    await navigate('Assessments')
    assert.equal(await page.locator('input[name="assessment-language"]:checked').count(), 0)
    console.log(`${width}px: mandatory choice, all 13 source Tagalog question pairs, translated scales, original responses, navigation, processing and reset passed.`)
    await page.close()
  }
  const preview = await browser.newPage({ reducedMotion: 'reduce' })
  await signInDemo(preview, baseURL)
  await preview.locator('.sidebar').getByRole('link', { name: 'Assessments', exact: true }).click()
  await preview.getByRole('radio', { name: 'Tagalog', exact: true }).check()
  await preview.getByRole('button', { name: assessmentCopy.fil.skip, exact: true }).click()
  await preview.locator('.assessment-processing').getByRole('heading', { name: assessmentProcessingStepsByLanguage.fil[0].label, exact: true }).waitFor()
  assert.equal(await preview.locator('.assessment-language-badge').innerText(), 'Tagalog')
  assert((await preview.locator('.assessment-exchange').first().locator('.message--user:not(.structured-response) p').innerText()).includes('Kathang-isip'))
  assert.equal(await preview.locator('.assessment-exchange').count(), 13)
  await preview.close()
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
