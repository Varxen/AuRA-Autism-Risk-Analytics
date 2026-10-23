import { fileURLToPath } from 'node:url'

// Resolve shared review artifacts from this file, independent of the shell directory.
export function designReviewPath(folder = '') {
  return fileURLToPath(new URL(`../../docs/design-review/${folder}`, import.meta.url))
}

export async function signInDemo(
  page,
  baseURL,
  { scenario = 'returning', email = 'parent@example.test', open = true } = {},
) {
  if (open) await page.goto(`${baseURL}/auth/login`)
  await page.getByLabel('Demo journey').selectOption(scenario)
  await page.getByLabel('Demo email address').fill(email)
  await page
    .getByRole('button', { name: 'Continue with email', exact: true })
    .click()
  if (scenario === 'returning') {
    await page.waitForURL('**/chat')
    await page.getByRole('button', { name: 'Start Chat', exact: true }).waitFor()
  }
}
