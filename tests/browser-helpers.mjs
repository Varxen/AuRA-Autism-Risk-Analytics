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
  if (scenario === 'returning')
    await page
      .getByRole('heading', { name: 'Welcome to AuRA', exact: true })
      .waitFor()
}
