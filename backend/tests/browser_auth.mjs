// Reuse the repository's existing Playwright development dependency.
import assert from 'node:assert/strict'
import { chromium } from '../../frontend/node_modules/playwright/index.mjs'

const frontendURL = process.env.AURA_TEST_URL ?? 'http://127.0.0.1:5173'
const backendURL = process.env.AURA_BACKEND_TEST_URL ?? 'http://127.0.0.1:8001'
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined })
const page = await browser.newPage({ reducedMotion: 'reduce' })
const errors = []
page.on('pageerror', error => errors.push(error.message))

try {
  await page.goto(`${frontendURL}/auth/login`)
  await page.getByLabel('Demo email address').waitFor()
  const outcome = await page.evaluate(async ({ backendURL, stamp }) => {
    const credentials = { email: `browser-${stamp}@example.test`, password: 'fictional browser parent password' }
    const request = (path, options = {}) => fetch(`${backendURL}/api/v1/auth/${path}`, { credentials: 'include', ...options })
    const registered = await request('register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
    const first = await registered.json()
    const visibleCookies = document.cookie
    const noCsrf = await request('logout', { method: 'POST' })
    const login = await request('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) })
    const second = await login.json()
    return { registered: registered.status, login: login.status, noCsrf: noCsrf.status, csrfRotated: first.csrfToken !== second.csrfToken, visibleCookies, csrf: second.csrfToken }
  }, { backendURL, stamp: Date.now() })
  assert.equal(outcome.registered, 201)
  assert.equal(outcome.login, 200)
  assert.equal(outcome.noCsrf, 403)
  assert(outcome.csrfRotated)
  assert(!outcome.visibleCookies.includes('aura_session'), 'HttpOnly session cookie is hidden from page JavaScript')
  const cookie = (await page.context().cookies(backendURL)).find(cookie => cookie.name === 'aura_session')
  assert(cookie?.httpOnly && cookie.sameSite === 'Lax' && cookie.path === '/')
  await page.reload()
  const restored = await page.evaluate(async backendURL => {
    const response = await fetch(`${backendURL}/api/v1/auth/session`, { credentials: 'include' })
    const body = await response.json()
    return { status: response.status, csrf: body.csrfToken, cached: response.headers.get('Cache-Control') }
  }, backendURL)
  assert.equal(restored.status, 200, 'Server session restores across browser refresh')
  assert.equal(restored.cached, 'no-store')
  assert.equal(restored.csrf, outcome.csrf)
  const signedOut = await page.evaluate(async ({ backendURL, csrf }) => {
    const ended = await fetch(`${backendURL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrf } })
    const current = await fetch(`${backendURL}/api/v1/auth/session`, { credentials: 'include' })
    return { ended: ended.status, current: current.status, localStorage: localStorage.length, sessionStorage: sessionStorage.length }
  }, { backendURL, csrf: restored.csrf })
  assert.deepEqual(signedOut, { ended: 204, current: 401, localStorage: 0, sessionStorage: 0 })
  assert(!(await page.context().cookies(backendURL)).some(cookie => cookie.name === 'aura_session'))
  assert.deepEqual(errors, [])
  console.log('Browser auth passed: cross-origin registration/login, HttpOnly cookie, CSRF, rotation, refresh restore, server logout and no browser token storage. Existing frontend remains in demo mode.')
} finally {
  await browser.close()
}
