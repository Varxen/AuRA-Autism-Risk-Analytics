# Frontend completion milestone

**Repository layout update (2026-10-23):** The application now lives in `frontend/`. Source, public assets, tests, package/config files and build paths in this document are relative to that directory unless explicitly prefixed. Run frontend npm and browser-test commands from `frontend/`. Shared `docs/` and `documentation/` remain at the repository root. See [frontend guide](../frontend/README.md).

Implemented and checked: 2026-10-23. This extends the existing frontend; no dependencies, backend, persistence, NLP or ML were added.

## Delivered

- **Assessment header:** reduced vertical padding to 8px and height to 76px desktop / 68px mobile, covering both language selection and the active questionnaire. The animated head remains; the subtitle identifies Pre-assessment (Paunang pagtatasa for a Filipino session). The redundant header action is removed on this route only.
- **Resources:** searchable/filterable external reference cards for CDC autism, WHO autism and CDC developmental milestones, plus local product guidance for assessment and consultation. Each card identifies publisher, language, link, added date and pending review. CDC/WHO autism URLs reuse the existing Medical Library. External links open safely in a new tab; empty searches offer Clear filters.
- **Support:** native expandable FAQs covering Chat/Assessments, language, History, missing results, retries and temporary storage. Chat and Resources links work. Contact service is explicitly unavailable because no approved contact was supplied; there is no fake message form.
- **Settings:** current mock identity, in-memory session counts, History navigation, per-assessment language guidance, live device reduced-motion status, policy links and sign out. Existing sessions retain their language; Settings does not add a conflicting global assessment language.
- **Privacy/terms:** shared native dialogs on Login/Register, Consent and Settings. Both documents are explicitly under development. Opening a policy does not submit the form or accept terms. Escape and Close return focus to the trigger.
- **Consent:** unchecked initial selection and validated transitions retained; Decline / Exit now uses the existing decline action. Decline prevents setup bypass and clears consent/eligibility according to the current reducer.
- **About:** corrected the stale one-question notice to match the implemented bilingual 13-item questionnaire. Supplied English/Filipino questions, scores and original explanations are unchanged.

The same app shell, palette, radii, shadows, type and animated assets are retained. Login keeps desktop viewport fitting and mobile scrolling; onboarding remains naturally scrollable. New pages scroll within the shared content panel. Main chat/assessment state stays mounted while navigating between these pages.

## Files and ownership

```text
src/components/ui/ContentPage.tsx        Shared content-page frame
src/components/ui/PolicyLinks.tsx        Accessible policy triggers and native dialog
src/data/resourceLibrary.ts             Source metadata and descriptions
src/data/supportContent.ts              Product FAQ copy
src/types/resource.types.ts             Resource domain shape
src/pages/ResourcesPage.tsx              Search, filter, references and local guide
src/pages/SupportPage.tsx                Help and FAQs
src/pages/SettingsPage.tsx               Existing session/privacy controls
src/styles/content-pages.css            Shared page/card/filter/FAQ styles
src/styles/entry.css                     Shared policy and consent control styles
src/app/AppRouter.tsx                    Explicit routes; existing provider retained
```

`FeaturePage` now handles unknown routes only. No new service or state provider is needed: Resources and FAQ use local data, and Settings reads the existing auth/chat/assessment controllers. No preference or response is written to browser storage.

## Verification

Passed on 2026-10-23:

- `npm.cmd run build`: strict TypeScript and production Vite build.
- `npm.cmd run lint`: ESLint.
- `npm.cmd test`: all 12 tests.
- `node tests/frontend-pages.browser.mjs`: source-link attributes, search/filter/empty states, keyboard FAQ, policy dialogs/focus, no accidental form submission, settings/sign-out, session preservation, empty storage and layout at 1440, 1024, 390 and 320px.
- `node tests/onboarding.browser.mjs`: registration, animation/fallback, setup/consent/URL guards, decline, age boundaries, drafts/resume, returning fixtures, sign out, reset and responsive layouts.
- `node tests/revised-questionnaire.browser.mjs`: complete English assessment and processing at 1440/320px.
- `node tests/assessment-language.browser.mjs`: complete Filipino assessment at 1440/390/320px.
- `node tests/history.browser.mjs`: multiple sessions, exact resume, processing state and privacy at 1440/320px.
- `node tests/browser.mjs`: original reference states, navigation and responsive chat/assessment. Its retired placeholder assertion now checks each implemented destination instead.

Run browser checks with Vite running. `AURA_TEST_URL` defaults to `http://127.0.0.1:5173`; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` when using an existing Chromium executable. `npm.cmd run test:frontend` runs the focused new suite.

Captures are in `design-review/frontend-pages/` (historical captures are no longer retained in this checkout), alongside regenerated onboarding and assessment captures. Desktop Resources and narrow Support/Settings screenshots were visually inspected for shared branding, spacing, readable cards and overflow. Original chat-state captures were also checked after the route updates. A shorter viewport checks composer reachability but does not prove physical mobile keyboard behavior.

## Assessment header follow-up verification

After the header change, strict TypeScript/production build, ESLint, `tests/assessment-intro.browser.mjs` and `tests/assessment-language.browser.mjs` passed again. The introduction suite checks the same compact height before and during the questionnaire at 1440/390/320px. The language suite checks that no redundant header action can bypass language choice and completes all 13 Filipino question pairs.

Computed dimensions were also checked at 1917/1024/390/320px. Desktop/mobile screenshots in `design-review/assessment-intro/` (historical captures are no longer retained in this checkout) were visually reviewed. Other suites listed above were run for the preceding frontend milestone, not rerun for this header-only change.

## Remaining approvals and limits

- The user confirmed there is no approved support contact or Privacy Policy/Terms text yet. These remain explicit pending content, not production policy promises.
- No clinical approval or approved Filipino resource summaries are supplied. Source added dates do not represent clinical review dates. Source links and source descriptions are not a new validated medical knowledge base.
- Live external source verification could not run: shell network access was blocked and no connected browser was available. The page identifies source verification/review as pending. Check current source content and links before release.
- Filipino indicator headings are interface translations; clinical/language review remains necessary. The supplied question and follow-up wording is preserved.
- Physical-device/virtual-keyboard testing, approved legal/privacy processes, durable account settings, support delivery and all backend/database/NLP/ML integration remain future work.
