# Login and standalone onboarding implementation

Implemented on 2026-10-21 in the existing React/TypeScript/Vite application. No dependencies were added for this feature.

## Experience

Signed-out visitors immediately see `/auth/login`; registration uses `/auth/register`. No pre-login splash or chatbot chrome appears on these pages.

New/incomplete users see a brief post-login animated transition, followed by About Pre-assessment, Consent, Parent & Child Information, and All Set. Continue to AuRA enters the existing welcome/Start Chat interface, without starting Question 1. Completed returning fixtures skip setup.

Consent starts unchecked and requires explicit Continue. Eligibility requires Parent or Legal Guardian, regular direct interaction, and integer age 12 through 36 months inclusive. Direct URLs cannot bypass requirements. Back preserves drafts. Decline clears consent and eligibility and returns to Login.

## Files and ownership

```text
src/
  app/
    App.tsx                         Auth provider and entry stylesheet
    AppRouter.tsx                   Auth, onboarding and existing route groups
    DemoRouteGate.tsx               Central route decision rendering
    providers/AuthDemoProvider.tsx  In-memory session and mock sign-in
  components/
    auth/
      LoginCard.tsx                 Shared login/registration form
      AboutAuraDialog.tsx           Native accessible About dialog
    branding/AnimatedAuraAsset.tsx  Actual video and static fallback
    chat/ChatWelcome.tsx            Reuses shared animation component
    layout/
      AuthLayout.tsx               Left form, right animated robot
      OnboardingLayout.tsx         Standalone setup shell
    onboarding/
      OnboardingProgress.tsx
      OnboardingNavigation.tsx
  constants/routes.ts
  contexts/AuthDemoContext.ts
  data/mockAccounts.ts
  hooks/
    useOnboarding.ts
    useReducedMotion.ts
  pages/
    auth/LoginPage.tsx              Login and registration modes
    onboarding/
      OnboardingSplashPage.tsx
      AboutPreAssessmentPage.tsx
      ConsentPage.tsx
      ParentChildInfoPage.tsx
      OnboardingCompletePage.tsx
    FeaturePage.tsx                 Settings demo sign-out action
  services/mock/mockAuthService.ts
  styles/entry.css                  Login/onboarding component styles
  types/
    auth.types.ts
    onboarding.types.ts
  utils/onboarding.ts               Reducer, validation and access rules
tests/
  onboarding.test.ts
  onboarding.browser.mjs
  browser-helpers.mjs
  browser.mjs                       Original chat checks use demo login
```

`package.json` includes onboarding checks in existing test commands. README documents the journey. The development plan changed only where its earlier pre-login splash requirement conflicted with the latest login-first prompt.

The original chat/assessment pages, controllers, mock services, scoring utility, questionnaire content, AppProvider, shell, sidebar, header, global stylesheet, welcome header stylesheet, and MP4 retain their pre-change hashes. ChatWelcome only delegates media playback to the shared component. Start Chat remains, without a pause button or welcome composer.

## State and mock boundaries

AuthDemoProvider stores the fictional identity and per-fixture setup records in React memory. The pure reducer in `utils/onboarding.ts` owns consent/version checks, eligibility, completion and URL access. Selecting consent alone does not confirm it. Viewing All Set alone does not complete setup.

The asynchronous mock service accepts a fictional email and new/returning scenario. It creates no real account, collects no password, verifies no email and performs no OAuth request. Fixture identity combines scenario and normalized email. Reusing both within the same tab resumes retained setup. Returning fixtures explicitly simulate valid completed setup.

Consent uses demo version `frontend-demo-v1` and scope `frontend-demo`. Invalid or outdated consent blocks assessment even with a completion timestamp. Consent text requires stakeholder/legal review before deployment. Research/model-training consent is not included.

Logout clears active identity and unmounts the existing main AppProvider so chat/assessment state cannot carry into another mock identity. Setup records remain in tab memory for the explicit resume scenario. Refresh clears everything and returns to Login. No inputs or consent responses persist to localStorage or sessionStorage.

Real authentication, authorization, OAuth, durable sessions/consent, production privacy policies, REST, PostgreSQL, NLP and ML remain future work. No clinical result is produced. Questions 2-13 still await approved content. The reference's Eye Contact/response-to-name mismatch remains unchanged and flagged for confirmation.

## Assets and visual comparison

Inspected references:

- `documentation/AuRA_Login_Layout_Reference.png`: login-left/visual-right composition only.
- `documentation/AuRA chatbot UI screens.pdf`: all five pages, branding and main chatbot.
- `documentation/AuRA_Database_Development_Plan.md`: complete current plan.
- `src/assets/aurabot-animate.mp4`: existing H.264 animation, 960 x 960, approximately 8 seconds and 6.76 MB.
- `public/assets/branding/aura-mascot.png` and `aura-avatar.png`: existing official static artwork.

The shared video uses autoplay, mute, loop, inline playback, metadata preload and contained proportions. Reduced motion, playback rejection or media failure shows the official static mascot. No animation asset is missing or replaced.

Screenshots in `docs/design-review/onboarding/` cover login, registration, splash and all four setup steps. Desktop viewport: 1917 x 923. Responsive viewports: 1024 x 768, 390 x 844 and 320 x 640. Captures were visually examined for composition, robot proportions, spacing and readable controls; spacing and captions were refined. The original five chatbot captures were regenerated and reviewed. Exact pixel fidelity is not claimed.

Physical mobile devices and virtual keyboards were not tested. Chromium viewport checks passed without horizontal overflow.

## Run and verify

Use Node.js 22.18 or newer. PowerShell users with npm.ps1 restrictions can use npm.cmd.

```sh
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

With Vite running and Playwright Chromium installed:

```sh
npm run test:browser
```

`AURA_TEST_URL` defaults to `http://127.0.0.1:5173`; override if Vite uses another port. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an existing Chromium. Validation used `http://127.0.0.1:5174`.

Manual scenarios:

1. Choose First-time parent and enter `parent@example.test`. Complete setup, then enter existing chat.
2. Choose Returning parent with a fictional email. Confirm welcome appears without onboarding.
3. Confirm Consent starts unchecked with Continue disabled. Decline / Exit, then try a later URL; access stays blocked.
4. Try missing fields and ages 11, 37 and 12.5. Confirm errors and blocked completion. Ages 12 and 36 are valid boundaries.
5. Go Back after entering details. Exit and sign in with the same scenario/email to confirm same-tab resume. Refresh to confirm reset.
6. After setup, test Start Chat, ASD education, structured answer, follow-up and Next Question. The approved-content blocker remains.

Passed: strict TypeScript, ESLint, production build, nine domain tests, onboarding browser checks, and original chatbot browser checks. Browser coverage includes actual playback/fallback, reduced motion, registration, consent/URL guards, eligibility, drafts/resume, completion, returning fixtures, logout, reload reset, empty storage and responsive layouts.
