# AuRA frontend

AuRA (Autism Risk Analytics) is a React and TypeScript frontend demonstration for autism education and a future pre-screening workflow. There is no backend, database, NLP processing, or ML classification.

## Run

Use Node.js 22.18 or newer. Validation used Node.js 24.21.0.

```sh
npm install
npm run dev
```

Open the URL Vite prints. On Windows with PowerShell script restrictions, use `npm.cmd` instead of `npm`.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Browser checks require a running Vite server and Playwright Chromium:

```sh
npx playwright install chromium
npm run test:browser
```

`AURA_TEST_URL` defaults to `http://127.0.0.1:5173`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium executable. Browser checks create screenshots in `docs/design-review/`.

## Login and standalone onboarding demo

Signed-out visitors immediately see `/auth/login`. There is no pre-login splash. The form is on the left and the existing animated AuRA robot is on the right, using the supplied login screenshot for composition and AuRA's own branding.

No password is requested. Sign-in and registration are simulated with fictional email addresses and typed in-memory state; no account or email verification is performed.

1. Choose **First-time parent · Start setup**, enter a fictional email such as `parent@example.test`, and select **Continue with email**. **Create a demo account** provides a separate registration view with the same first-time simulation.
2. A brief post-login transition leads to About → Consent → Parent & Child → All Set.
3. Consent starts unchecked. Continue stays disabled until affirmative selection; **Decline / Exit** returns to Login and blocks later steps.
4. Eligibility requires Parent or Legal Guardian, regular direct interaction, and a whole-number age from 12 to 36 months inclusive. Invalid values produce inline errors and cannot complete setup.
5. **Continue to AuRA** enters the existing welcome/Start Chat page, not Question 1. Chat and assessment remain available by choice.

Choose **Returning parent · Setup complete** to load an explicitly fictional completed fixture and skip onboarding. To test unfinished setup, use **Exit demo**, then sign in with the same fictional email and the same first-time journey within the current tab session; setup resumes at the required unfinished step. Back/Next preserves entered values. **Settings → Sign out of demo** ends the mock session and clears mounted chat/assessment state. Refresh resets everything safely to Login.

`AuthDemoProvider` owns identities and per-fixture setup records. The pure reducer and access rules in `src/utils/onboarding.ts` centralize transitions, consent/version checks, eligibility, completion and URL guards. Main-chat state remains inside the existing `AppProvider`, which is mounted only after valid setup and unmounted on logout. These frontend guards demonstrate navigation; they are not real authentication or server-side authorization.

The reusable `AnimatedAuraAsset` uses `src/assets/aurabot-animate.mp4` with autoplay, mute, loop and inline playback. Reduced-motion preferences or playback errors use the official `public/assets/branding/aura-mascot.png` fallback. No replacement animation or new dependency was added. New login/onboarding styles are in `src/styles/entry.css`.

`npm run test:browser` runs the onboarding checks followed by the original chatbot checks. New screenshots are in `docs/design-review/onboarding/`. See `docs/onboarding-implementation.md` for the file inventory, test scenarios, visual review and remaining production boundaries.

## Implemented screens and components

1. Welcome, animated mascot, branding, and Start Chat. The composer appears after starting chat.
2. Assistant greeting and integrated education/assessment actions.
3. Reference ASD explanation, Learn more, and assessment action.
4. Question 1, indicator badge, answer options, selected answer, and progress.
5. Follow-up prompt, original parent text, Next question, and progress.

The shared shell includes a desktop sidebar, active routes, header, compact assessment header, mobile drawer with focus management, and anchored composer. Chat components provide avatars, timestamps, delivery marks, typing states, automatic scrolling, and Enter-to-send. Assessment components provide progress, question cards, options, follow-up, and an unavailable result. Resources, History, Support, and Settings have minimal under-development pages.

## Structure

```text
src/
  app/                 App, router, shared state provider
  components/
    auth/              Demo login form and About AuRA dialog
    onboarding/        Setup progress and Back/Continue controls
    assessment/        Progress, question, options, follow-up, unavailable result
    branding/          Logo, static mascot and shared animated asset component
    chat/              Welcome, messages, actions, input, conversation window
    layout/            Application shell, header, responsive sidebar
    ui/                Button, avatar, typing indicator
  contexts/            Typed chat and auth/onboarding state access
  data/                Questionnaire configuration, navigation, medical library
  hooks/               Chat, assessment, onboarding and reduced-motion behavior
  pages/               Existing app pages plus auth/ and onboarding/ screens
  services/
    api/               Adapters for future REST implementation
    mock/              Asynchronous deterministic mock services
  styles/              Tailwind entry, tokens, layout, embedded font subsets
  types/               Chat, questionnaire, assessment, demo auth and onboarding models
  utils/               Scoring, assessment stages, setup validation and access rules
public/assets/
  branding/            PDF-extracted mascot, avatar, sidebar background
  fonts/               PDF-extracted Inter subsets
tests/                 Domain tests and browser checks
documentation/         Original supplied PDFs
docs/                  Implementation notes and visual review captures
```

## State and services

`AppProvider` owns in-memory chat and assessment controllers. Pages consume typed state through `useAura`. Presentation components receive data and callbacks. Synchronous request locks prevent duplicate submissions during asynchronous mock calls.

Assessment stages derive from the saved session: question → follow-up → ready-next → awaiting-content. Services reject invalid transitions, missing options, repeated answers, empty explanations, and explanations over 4,000 characters. Structured scores come from one option configuration. The original explanation is preserved verbatim beside the selected option; no NLP interpretation is produced.

`services/api/` currently exports mock implementations. Replace these adapters with REST calls while retaining the typed domain contracts and service signatures. No API URL, credentials, database driver, or fabricated model endpoint is included.

## Privacy and clinical boundaries

Responses remain in React memory. Nothing is written to localStorage, sessionStorage, URLs, or browser navigation state. Reloading resets demonstration progress. Use fictional examples during development.

Only Question 1 is populated from the supplied reference. Questions 2–13 have identifiers, version, and documented answer scales, but no fabricated clinical wording. Next question saves the first answer, advances to 2/13, and displays the approved-content blocker. The result component states that no risk result is available. No score sum becomes a clinical classification.

Q1–Q9: Always = 0, Sometimes = 1, Never = 2. Q10–Q13: Yes = 2, Sometimes = 1, No = 0. Scores remain internal.

Real authentication, durable consent records, protected server persistence, retention policies, PostgreSQL, behavioral mapping, the medical knowledge base, NLP, ML, and validated result handling require future integration. The login/onboarding screens currently simulate these interactions only. Their consent wording is a demonstration notice requiring stakeholder review before deployment.

## Reference and assets

The authoritative PDF is at `documentation/AuRA chatbot UI screens.pdf`, rather than the prompt’s path. All five pages were rendered and visually inspected before implementation. The thesis PDF was also checked for questionnaire content and scoring.

Desktop screenshots at 1440 × 810 were compared with the PDF, then message widths, header sizes, mascot size, and spacing were refined. Additional captures cover 1024 × 768, 768 × 1024, 390 × 844, and 320 × 640. See `docs/design-review/` and `docs/implementation.md`. This is a close reproduction, not a claim of pixel-perfect fidelity.

- The actual robot and sidebar background were extracted from the supplied PDF. The avatar is cropped from the same artwork. No substitute mascot or emoji is used.
- Embedded Inter subsets were extracted from the PDF. Missing characters use Arial/Helvetica. A complete licensed Inter distribution is preferable before production.
- The reference labels Question 1 **Eye Contact**, but asks about **response to name**. Both are preserved pending confirmation.
- Navigation varies across reference pages. This implementation consistently shows all seven requested destinations with Lucide React icons.
- Session timestamps replace fixed sample times. Stage-specific input guidance and saved-answer review controls support working interactions.
- The Medical Library uses the supplied description and predetermined CDC/WHO links. It generates no medical facts.

## Added dependencies

- `react-router-dom@7.18.1`: navigation.
- `lucide-react@1.52.0`: standard icons.
- `playwright@1.62.1` (development only): browser checks and screenshots.

Tailwind CSS v4 and its Vite plugin were already installed. Strict TypeScript is now enabled. No heavyweight UI/chatbot library was added.

Registry requests were unavailable in the implementation environment. Existing local installations supplied the added packages; the lockfile records registry versions and integrity metadata. A fresh network installation was not verified here.
