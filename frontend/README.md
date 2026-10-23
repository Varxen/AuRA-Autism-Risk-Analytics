# AuRA frontend

AuRA (Autism Risk Analytics) is a React and TypeScript frontend demonstration for autism education and a future pre-screening workflow. The frontend uses the PostgreSQL-backed authentication API in ../backend/. Information chat, onboarding and assessment responses use temporary frontend state; screening persistence, NLP and ML are not connected.

## Development roadmap

See [the current roadmap](../docs/roadmap.md) for completed frontend work, remaining milestones, acceptance conditions and decisions needed before backend/NLP/ML integration. Last reviewed: 2026-10-23.

## Run

Run the commands below from `aura-thesis/frontend/`. From the repository root, first use `cd frontend`. Frontend source, tests, package files, dependencies and build output live here; shared documentation remains one directory above.

Use Node.js 22.18 or newer. Validation used Node.js 24.21.0.

```sh
npm install
npm run dev
```

Start the backend on `127.0.0.1:8000` first, then open the URL Vite prints. Vite proxies `/api` to the backend. On Windows with PowerShell script restrictions, use `npm.cmd` instead of `npm`.

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

`AURA_TEST_URL` defaults to `http://127.0.0.1:5173`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an existing Chromium executable. The current browser command checks authentication against the running API and creates a fictional development account. Historical visual scripts under `tests/` need updated account fixtures.

## Authentication and onboarding

Registration and sign-in use email and a 15?128-character password. The frontend calls FastAPI through the local Vite `/api` proxy; PostgreSQL stores the account and a server-side session. The browser receives an HttpOnly cookie. Refreshing restores the account through `GET /api/v1/auth/session`; Sign out calls `POST /api/v1/auth/logout` with a CSRF value held only in React memory. API startup and database migration commands are in [the backend guide](../backend/README.md).

The onboarding flow remains a frontend demonstration. A successful registration or sign-in begins About ? Consent ? Parent/Child ? All Set. Setup status and screening responses are not stored by the backend, so refresh or sign-out clears them. A returning account must repeat the demonstration setup. Authentication alone never marks consent or eligibility complete. Use fictional child details. Email verification, password reset and approved production policies are pending.

`AuthDemoProvider` handles backend identity/session calls and temporary onboarding state. The reducer in `src/utils/onboarding.ts` guards required steps and clears setup on sign-out. `AppProvider` owns chat and assessment data only while the main interface is mounted. Production hosting needs an `/api` reverse proxy equivalent to the Vite development proxy.

`npm run test:browser` exercises live registration, login, session restore, onboarding and logout. It requires the backend, Vite and Playwright Chromium; each run creates one fictional account in the development database. Older screenshot scripts under `tests/` use the former demo fixture and need updating before they can run against real authentication.

## Implemented screens and components

1. Welcome, animated mascot, branding, and Start Chat. The composer appears after starting chat.
2. Assistant greeting and integrated education/assessment actions.
3. Reference ASD explanation, Learn more, and assessment action.
4. All 13 revised questions, indicator headings, answer options, selected answers, and progress.
5. Follow-up prompts, original parent text, automatic progression, and progress.

The shared shell includes a desktop sidebar, active routes, header, compact assessment header, mobile drawer with focus management, and anchored composer. Chat components provide avatars, timestamps, delivery marks, typing states, automatic scrolling, and Enter-to-send. Assessment components provide progress, question cards, options, follow-up, and an unavailable result. History lists saved in-memory chat and assessment sessions. Resources provides searchable CDC/WHO reference cards and assessment guidance; Support provides FAQs; Settings shows session details, accessibility status, privacy notices and sign out. Policies, clinical resource review and direct contact remain pending.

## Structure

```text
src/
  app/                 App, router, shared state provider
  components/
    auth/              Email/password forms and About AuRA dialog
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
    api/               Real auth adapter and mock chat/assessment adapters
    mock/              Deterministic chat and assessment mock services
  styles/              Tailwind entry, tokens, layout, embedded font subsets
  types/               Chat, questionnaire, assessment, auth and onboarding models
  utils/               Scoring, assessment stages, setup validation and access rules
public/assets/
  branding/            PDF-extracted mascot, avatar, sidebar background
  fonts/               PDF-extracted Inter subsets
tests/                 Domain tests and browser checks
../documentation/         Original supplied PDFs
../docs/                  Implementation notes and visual review captures
```

## Chat and assessment navigation

**Chat** is the ASD information conversation. It displays the welcome/Start Chat screen only before a conversation exists. Opening Chat again, or clicking the AuRA home logo, resumes the same in-memory information conversation. **Assessments** opens the separate questionnaire workflow; moving between the two preserves each flow's session state.

Start Chat first displays the composer, pauses briefly, then shows AuRA's avatar and three-dot thinking indicator together before typing the greeting. The two action buttons expand only after the greeting finishes, moving the message upward. This presentation state stays with the in-memory chat so revisiting Chat does not replay the introduction. Reduced-motion preferences show the full greeting without the typewriter effect. The composer and header action are disabled while the introduction is being presented. The historical chat animation check remains under `tests/` and needs a real-account fixture before it can run again.

The redundant Know About ASD sidebar item was removed. `/chat` is the canonical information route; `/` and the previous `/about-asd` URL redirect there. Education actions stay in Chat, while pre-assessment actions explicitly open Assessments. Reloading restores the account session and resets in-memory onboarding, chat and assessment progress.

## State and services

`AppProvider` owns in-memory chat and assessment controllers. Pages consume typed state through `useAura`. Each controller keeps a collection of records and the active session ID; switching sessions restores its own data without merging responses. Assessment records include their questionnaire snapshot, preserving the selected language and version. Presentation components receive data and callbacks. Synchronous request locks prevent duplicate submissions during asynchronous mock calls.

Assessment stages derive from the saved session: question, follow-up, ready-next, and completed. Unapproved content still blocks progression. Services reject invalid transitions, missing options, repeated answers, empty explanations, and explanations over 4,000 characters. Structured scores come from one option configuration. Original explanations remain verbatim beside their selected options; no NLP interpretation is produced. Each question and follow-up uses the shared thinking/typewriter sequence. Messages start near the input and grow upward. The entire assessment stays in one scrollable transcript, derived from saved answers without duplicated conversation state. Selecting an option appends its user bubble; submitting an explanation automatically saves it and advances to the next question. The final explanation automatically completes the questionnaire after all 13 answer pairs are present. No Next question or Finish assessment button is needed. If saving succeeds but advancement fails, Retry continues from the saved answer without resubmission. New content follows the bottom while the reader is there; scrolling up preserves their reading position during typing. Completion does not generate a risk classification.

`services/api/authService.ts` calls the real authentication API. Chat and assessment service adapters still use typed mock implementations. No NLP, ML or risk endpoint is connected.

## Privacy and clinical boundaries

Screening and onboarding responses remain in React memory. No screening response is written to localStorage, sessionStorage, URLs, or browser navigation state. The authentication session uses an HttpOnly cookie. Reloading resets demonstration progress while restoring the account. Use fictional screening examples during development.

All 13 main questions, indicators, and follow-ups come from `../documentation/REVISED-QUESTIONNAIRE-BASED-ON-PILOT-TESTING-2.pdf`, visually reviewed across all three pages. Version `revised-pilot-testing-2-v1` identifies this content. Q12 includes the follow-up continuation on page 3. The revised source corrects Q1 to Response to Name and places Eye Contact at Q2. Completion appends a notice to the same transcript and explicitly states that no risk result is available. All question/answer pairs remain readable by scrolling up, including after leaving and reopening Assessments. No summed score becomes a clinical classification.

Q1–Q9: Always = 0, Sometimes = 1, Never = 2. Q10–Q13: Yes = 2, Sometimes = 1, No = 0. Scores remain internal. The revised PDF supplies wording only; these previously documented scoring scales are retained, including Always/Sometimes/Never for Q8 and Q9.

Authentication and PostgreSQL account/session storage are connected. Durable consent and onboarding records, protected screening persistence, retention policies, behavioral processing, NLP, ML and validated results remain pending. The consent wording is a demonstration notice requiring stakeholder review before deployment.

## Reference and assets

The original robot-head source video is stored at `src/assets/source/head_robot_animated.mp4`. The optimized runtime version at `src/assets/head_robot_animated.mp4` and its `head_robot_poster.png` fallback are imported by `src/components/branding/AuraMascot.tsx`, shared by the header and sidebar logo. The original was moved from repository-root `documentation/`; no runtime component imports that old location.

The authoritative PDF is at `../documentation/AuRA chatbot UI screens.pdf`, rather than the prompt’s path. All five pages were rendered and visually inspected before implementation. The thesis PDF was also checked for questionnaire content and scoring.

Desktop screenshots at 1440 × 810 were compared with the PDF, then message widths, header sizes, mascot size, and spacing were refined. Additional captures cover 1024 × 768, 768 × 1024, 390 × 844, and 320 × 640. See `../docs/design-review/` and `../docs/implementation.md`. This is a close reproduction, not a claim of pixel-perfect fidelity.

- The actual robot and sidebar background were extracted from the supplied PDF. The avatar is cropped from the same artwork. No substitute mascot or emoji is used.
- Embedded Inter subsets were extracted from the PDF. Missing characters use Arial/Helvetica. A complete licensed Inter distribution is preferable before production.
- The revised questionnaire supersedes the old screenshot label mismatch: Q1 is **Response to Name** and Q2 is **Eye Contact**.
- Navigation varies across reference pages. The current sidebar uses Chat for ASD information and Assessments for screening, followed by Resources, History, Support, and Settings. Standard icons use Lucide React.
- Session timestamps replace fixed sample times. Stage-specific input guidance and continuous scrollable conversation history support working interactions.
- The Medical Library uses the supplied description and predetermined CDC/WHO links. It generates no medical facts.

## Added dependencies

- `react-router-dom@7.18.1`: navigation.
- `lucide-react@1.52.0`: standard icons.
- `playwright@1.62.1` (development only): browser checks and screenshots.

Tailwind CSS v4 and its Vite plugin were already installed. Strict TypeScript is now enabled. No heavyweight UI/chatbot library was added.

Registry requests were unavailable in the implementation environment. Existing local installations supplied the added packages; the lockfile records registry versions and integrity metadata. A fresh network installation was not verified here.


## Revised questionnaire verification

With Vite running, `node tests/revised-questionnaire.browser.mjs` checks all 13 questions and follow-ups, both answer scales, retained conversation history, verbatim explanations, automatic advancement/completion, and desktop/mobile layout. `node tests/assessment-intro.browser.mjs` checks bottom alignment and the opening/thinking/typing sequence, including automatic transition to Q2, preservation of reading position, and retry after an advancement failure. `npm test` checks scoring, invalid transitions, all 13 saved answer pairs, completion eligibility, and completion without risk classification.


## Processing simulation

After all 13 answer pairs are saved, a seven-stage, roughly 11-second loading sequence appears as an assistant bubble in the assessment chat: review, text normalization, behavioral indicator matching, numerical feature encoding, classification preview, soft voting preview, and summary preparation. These labels follow the thesis workflow (PDF pages 14 and 51-53). The presentation is explicitly marked Demo simulation. Timers do not analyze answers, create predictions, or derive risk levels from raw scores. The sequence ends with the existing unavailable-result notice in the same conversation.

`useAssessmentProcessing` runs inside the shared assessment controller, so leaving and reopening Assessments retains the current stage and completed simulations do not replay. Timers stop when the provider unmounts, including sign-out. The input stays disabled, history remains scrollable, and stage changes preserve the reading position. Reduced-motion preferences disable the spinner and entry transitions while keeping status labels readable. Stage labels and timings are in `src/data/assessmentProcessingSteps.ts`. The full revised-questionnaire browser suite checks the ordered sequence, stage gating, navigation resume, reading position, reduced motion, and completion without a fabricated clinical result.


A **Demo shortcut / Skip to processing** button is available on the assessment entry screen and during an unfinished assessment. It prepares an explicitly marked preview session, preserves existing selections and explanations, and fills unanswered items with `[Demo preview]` fictional placeholders. The normal completion checks still apply. It can interrupt the introductory typewriter animation once the active mock request finishes. The shortcut opens the same processing sequence and does not generate a clinical prediction. `node tests/assessment-preview.browser.mjs` verifies fresh, typing, and partially answered journeys on desktop and mobile.


## Assessment language

Before an assessment starts, AuRA asks the parent to choose English or Tagalog. Neither language is preselected; Start and the demo skip shortcut remain disabled until a choice is made. Sidebar, header, and information-chat assessment actions all enter this selection screen. Once started, the language belongs to the in-memory assessment session and remains the same when navigating away and back. Refresh resets the session and language choice.

All 13 Filipino main questions and 13 follow-up questions are transcribed verbatim from `../documentation/SQ-Translation-in-Filipino.docx`. Indicator headings are interface translations because the DOCX does not include indicator labels. The English questionnaire retains the revised pilot-testing PDF wording. `getQuestionnaireQuestions(language)` returns localized question views with identical canonical IDs, indicator IDs, version, option IDs, and scores. Palagi/Minsan/Hindi kailanman correspond to Always/Sometimes/Never; Oo/Minsan/Hindi correspond to Yes/Sometimes/No. Parent explanations stay verbatim and are never translated or interpreted. Completion validation checks the session/question language as well as the version.

Assessment prompts, headings, answer labels, input guidance, processing simulation, completion message, and no-result notice follow the selected language. The rest of the application keeps its existing language. Shared strings are in `src/data/assessmentCopy.ts`; source Filipino wording is in `src/data/filipinoQuestions.ts`. No translation API, global localization provider, or additional dependency was added. `node tests/assessment-language.browser.mjs` checks required choice, all Filipino question pairs, navigation, response preservation, processing, and desktop/mobile layouts. Domain tests verify scoring parity and language-aware completion.


## Session history

History is functional for multiple information chats and assessment sessions. Each entry shows its kind, latest activity, message count or questionnaire progress, language, and processing/completion status. Selecting an entry restores that exact session and allows continuing it. **New chat** opens a fresh welcome/Start Chat experience while keeping earlier conversations. **New assessment** opens a fresh language selection while keeping earlier questionnaires. Empty drafts are not listed until a conversation or assessment is created.

Chat replies update their conversation by ID. Switching or creating another session of the same kind waits for any active mock request to finish, preventing replies or answers from landing in the wrong session. Questionnaire progress, original explanations, and language belong to their saved record. Processing preview progress is tracked by assessment ID: it continues while visiting History or Chat, pauses at its saved stage when another assessment is active, and resumes without replaying a completed preview. A saved explanation whose transition failed can be reopened and continued through Retry without submitting it again.

History uses React memory only; no screening responses or child information are written to localStorage, sessionStorage, URLs, or browser navigation state. Refresh and sign-out clear the records. The protected app provider is recreated for a new signed-in demo session, so another account cannot inherit prior histories. Durable history requires the later authenticated backend/database integration. `node tests/history.browser.mjs` verifies multi-session resume, concurrent-request protection, bilingual progress, processing stages, failed-transition recovery, keyboard operation, mobile layout, ordering, sign-out isolation and refresh reset.

## Resources, support and settings

The remaining frontend destinations now use the shared AuRA styling. Resource search/filter, native FAQ controls, session details and sign out are functional. Shared Privacy Policy/Terms dialogs are available from Login/Register, Consent and Settings; they clearly identify the documents as under development. Consent requires an explicit checkbox before Continue; Sign out remains available in the header.

No approved policy text, support contact or Filipino educational summaries are available yet. External sources show added dates and pending review rather than fabricated clinical approval. See [frontend completion notes](../docs/frontend-completion.md) for architecture, checks and remaining approval/device requirements.

With Vite running, use `npm run test:frontend` for the focused desktop/tablet/mobile browser checks.
