import { createMockOnboarding } from '../../data/mockAccounts.ts'
import type { DemoScenario, MockSignInResult } from '../../types/auth.types'

// Identity fixtures only: no password, verification, token, network, or persistence.
export const mockAuthService = {
  async signIn(
    email: string,
    scenario: DemoScenario,
  ): Promise<MockSignInResult> {
    const normalizedEmail = email.trim().toLowerCase()
    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    )
      throw new Error('Please enter a valid fictional email address.')
    if (scenario !== 'new' && scenario !== 'returning')
      throw new Error('Please select a demo journey.')
    await new Promise<void>((resolve) => setTimeout(resolve, 250))
    return {
      identity: {
        id: `${scenario}:${normalizedEmail}`,
        email: normalizedEmail,
        scenario,
      },
      onboarding: createMockOnboarding(scenario, new Date().toISOString()),
    }
  },
}
