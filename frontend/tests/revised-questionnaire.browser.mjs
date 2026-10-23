import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'
import { designReviewPath, signInDemo } from './browser-helpers.mjs'
import { mockQuestions } from '../src/data/mockQuestions.ts'
import { assessmentProcessingSteps } from '../src/data/assessmentProcessingSteps.ts'

const baseURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const output = designReviewPath('revised-questionnaire')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const errors = []
try {
  for (const [width, height] of [[1440, 900], [320, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' })
    page.on('pageerror', (error) => errors.push(error.message))
    await signInDemo(page, baseURL)
    if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar').getByRole('link', { name: 'Assessments', exact: true }).click()
    await page.clock.install()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    async function settlePresentation() {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (await page.getByRole('log').getAttribute('aria-busy') === 'false') return
        await page.clock.runFor(100)
      }
      assert.fail('Assessment did not settle after advancing the mock clock')
    }
    await page.getByRole('radio', { name: 'English', exact: true }).check()
    await page.getByRole('button', { name: 'Start pre-assessment', exact: true }).click()
    await settlePresentation()
    for (const question of mockQuestions) {
      const number = question.questionNumber
      const exchange = page.getByRole('region', { name: `Question ${number} conversation`, exact: true })
      await page.getByRole('heading', { name: `Question ${number} of 13: ${question.indicatorLabel}`, exact: true }).waitFor()
      assert.equal(await exchange.locator('.question-message p').innerText(), question.mainQuestion)
      assert.equal(await page.getByRole('progressbar').getAttribute('value'), String(number))
      const options = page.getByRole('group', { name: 'Choose your answer' })
      assert.deepEqual(await options.getByRole('button').allTextContents(), number <= 9 ? ['Always', 'Sometimes', 'Never'] : ['Yes', 'Sometimes', 'No'])
      const lastChoice = await options.getByRole('button').last().boundingBox()
      const logBounds = await page.getByRole('log').boundingBox()
      assert(lastChoice.y + lastChoice.height <= logBounds.y + logBounds.height + 1, 'The latest answer options stay in view while following the conversation')
      if ([2, 8, 9, 10, 12, 13].includes(number)) {
        await page.screenshot({ path: `${output}/question-${number}-${width}.png` })
      }
      if (width <= 760) {
        const heading = await exchange.locator('.question-heading h2').boundingBox()
        const bubble = await exchange.locator('.question-message .message-bubble').boundingBox()
        assert(heading.x >= bubble.x && heading.x + heading.width <= bubble.x + bubble.width + 1, 'Long question heading stays inside its bubble')
      }
      await options.getByRole('button', { name: number <= 9 ? 'Never' : 'Yes', exact: true }).click()
      await settlePresentation()
      await page.waitForFunction(() => !document.querySelector('#chat-response').disabled)
      assert.equal(await exchange.locator('.follow-up-message p').innerText(), question.followUpQuestion)
      const response = `  Fictional original observation for question ${number}.  `
      await page.getByLabel('Your response').fill(response)
      await page.getByLabel('Your response').press('Enter')
      await settlePresentation()
      assert.equal(await exchange.locator('.question-message p').innerText(), question.mainQuestion)
      assert.equal((await exchange.locator('.structured-response').innerText()).includes(number <= 9 ? 'Never' : 'Yes'), true)
      assert.equal(await page.locator('.follow-up-message').count(), number, 'All earlier follow-ups remain in the transcript')
      assert.equal(await page.locator('.structured-response').count(), number, 'Every selected option stays in the transcript')
      assert.equal(await page.locator('.message--user:not(.structured-response) p').count(), number, 'Every explanation stays in the transcript')
      assert.equal(await page.getByRole('button', { name: /Next question|Finish assessment|Review structured answer|Return to follow-up/ }).count(), 0)
      if (number < 13) {
        assert.equal(await page.locator('.assessment-processing').count(), 0, 'Processing cannot start before all 13 answer pairs are saved')
        await page.getByRole('heading', { name: `Question ${number + 1} of 13: ${mockQuestions[number].indicatorLabel}`, exact: true }).waitFor()
      }
      assert.equal(await page.locator('.question-message').count(), Math.min(number + 1, 13), 'The next question appears automatically without clearing history')
    }
    if (width > 760) await page.emulateMedia({ reducedMotion: 'no-preference' })
    const logDuringProcessing = page.getByRole('log')
    for (const [index, step] of assessmentProcessingSteps.entries()) {
      const processor = page.locator('.assessment-processing')
      await processor.getByRole('heading', { name: step.label, exact: true }).waitFor()
      assert.equal(await page.locator('.assessment-complete-message').count(), 0, 'Summary waits for the simulation to finish')
      assert(await page.getByLabel('Your response').isDisabled())
      assert(await processor.getByText('Demo simulation', { exact: true }).isVisible())
      assert(await processor.getByText(`Stage ${index + 1} of 7`, { exact: true }).isVisible())
      const animation = await processor.locator('.processing-spinner').evaluate((element) => getComputedStyle(element).animationName)
      assert.equal(animation, width > 760 ? 'processing-spin' : 'none')
      assert.equal(await page.locator('.assessment-exchange').count(), 13)
      if (index === 1) {
        if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
        await page.locator('.sidebar').getByRole('link', { name: 'Chat', exact: true }).click()
        await page.clock.runFor(200)
        if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
        await page.locator('.sidebar').getByRole('link', { name: 'Assessments', exact: true }).click()
        await processor.getByRole('heading', { name: step.label, exact: true }).waitFor()
      }
      await page.screenshot({ path: `${output}/processing-${step.id}-${width}.png` })
      if (index === 2)
        await logDuringProcessing.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')) })
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await page.clock.runFor(100)
        if (await processor.getByRole('heading', { name: step.label, exact: true }).count() === 0) break
      }
      if (index >= 2 && index < 5)
        assert.equal(await logDuringProcessing.evaluate((element) => element.scrollTop), 0, 'Stage changes preserve reading position')
      if (index === 5)
        await logDuringProcessing.evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')) })
    }
    await page.getByRole('heading', { name: 'Questionnaire completed', exact: true }).waitFor()
    assert.equal(await page.locator('.assessment-processing').count(), 0)
    if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar').getByRole('link', { name: 'Chat', exact: true }).click()
    if (width <= 760) await page.getByRole('button', { name: 'Open navigation' }).click()
    await page.locator('.sidebar').getByRole('link', { name: 'Assessments', exact: true }).click()
    await page.getByRole('heading', { name: 'Questionnaire completed', exact: true }).waitFor()
    assert.equal(await page.locator('.assessment-processing').count(), 0, 'Completed simulation does not replay on navigation')
    assert.equal(await page.getByRole('progressbar').getAttribute('value'), '13')
    assert(await page.getByLabel('Your response').isDisabled())
    assert.match(await page.locator('.result-placeholder').innerText(), /No risk result available/)
    assert.equal(await page.locator('.assessment-exchange').count(), 13)
    assert.equal(await page.locator('.question-message').count(), 13)
    assert.equal(await page.locator('.follow-up-message').count(), 13)
    assert.equal(await page.locator('.structured-response').count(), 13)
    for (const question of mockQuestions) {
      const saved = page.getByRole('region', { name: `Question ${question.questionNumber} conversation`, exact: true })
      assert.equal(await saved.locator('.question-message p').innerText(), question.mainQuestion)
      const original = await saved.locator('.message--user:not(.structured-response) p').textContent()
      assert.equal(original, `  Fictional original observation for question ${question.questionNumber}.  `)
    }
    assert.equal(await page.getByRole('button', { name: /Review structured answer|Return to follow-up|Review saved answers/ }).count(), 0)
    assert.equal(await page.locator('.assessment-exchange').getByText(/structuredScore|riskLevel/).count(), 0)
    const log = page.getByRole('log')
    await log.evaluate((element) => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')) })
    assert(await page.locator('.question-message').first().isVisible())
    const first = await page.locator('.question-message').first().boundingBox()
    const logBox = await log.boundingBox()
    assert(first.y >= logBox.y && first.y < logBox.y + logBox.height, 'First question is readable by scrolling up after completion')
    await page.screenshot({ path: `${output}/history-top-${width}.png` })
    await log.evaluate((element) => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')) })
    assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    const composer = await page.locator('.chat-input').boundingBox()
    assert(composer.y >= 0 && composer.y + composer.height <= height + 1)
    await page.screenshot({ path: `${output}/completed-${width}.png` })
    console.log(`${width}px: all 13 exact questions/follow-ups, both option scales, continuous scrollable history, original explanations, seven ordered processing stages, navigation resume, reduced motion, completion without risk results, privacy and layout passed.`)
    await page.close()
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
}
