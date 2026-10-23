# AuRA development roadmap

Last reviewed: 2026-10-23

This is the current completion roadmap. It distinguishes working frontend demonstrations from production functionality. The database blueprint remains in [AuRA_Database_Development_Plan.md](../documentation/AuRA_Database_Development_Plan.md); its schemas and technical recommendations are proposals, not completed infrastructure.

No deadlines or completion percentage are assigned. Each milestone closes only when its acceptance conditions are met.

## 1. Completed frontend foundation

Run application and test commands from `frontend/`; `docs/` and `documentation/` refer to repository-root shared folders.

- [x] Existing Vite, React, strict TypeScript, Tailwind, React Router and Lucide architecture retained.
- [x] Isolate the complete frontend in `frontend/`, including source, public assets, tests, dependencies, package/config files and build output; shared project/research documents remain at the root. See [frontend guide](../frontend/README.md).
- [x] Shared sidebar/header, desktop and mobile layouts, design tokens, rounded containers and subtle depth.
- [x] Supplied animated AuRA mascot and animated robot head, with reduced-motion/static fallback handling.
- [x] Email/password registration and sign-in connected to PostgreSQL-backed sessions; post-login onboarding transition remains a frontend demonstration.
- [x] Separate About, Consent, Parent/Child Information and All Set screens, with validated frontend route access.
- [x] Parent/legal guardian, regular-interaction and 12-36-month eligibility validation.
- [x] Welcome/Start Chat, then information chat with thinking dots, typed greeting and integrated actions.
- [x] Deterministic educational replies using local reference content; no generated medical answers.
- [x] Separate assessment workflow with explicit English or Tagalog selection before starting.
- [x] Compact Assessment header across language selection and questionnaire: 8px vertical padding, 76px desktop / 68px mobile, animated robot head and contextual English/Filipino subtitle; redundant Pre-assessment header button removed.
- [x] All 13 main questions and follow-ups from the supplied revised English PDF and Filipino DOCX.
- [x] One scoring configuration: Q1-Q9 use 0/1/2 for Always/Sometimes/Never; Q10-Q13 use 2/1/0 for Yes/Sometimes/No.
- [x] Continuous assessment transcript, selected-answer bubbles, verbatim explanations and automatic question advancement.
- [x] Saved explanation recovery after failed advancement, duplicate-submission guards and progress tracking.
- [x] Completion processing preview with changing labels and an explicit simulation notice.
- [x] Demo skip shortcut with clearly marked fictional filler responses; no clinical prediction.
- [x] History lists multiple information chats and assessments; opening an entry restores that session.
- [x] New Chat/New Assessment preserve earlier in-memory records, language and questionnaire snapshots.
- [x] Processing preview state retained by assessment ID; completed previews do not replay.
- [x] Typed domain models, reusable hooks and separate asynchronous mock service adapters.
- [x] Temporary memory only: refresh/sign-out clears main-app records; no screening data in localStorage/sessionStorage.

The first screenshot's label discrepancy is resolved by the revised questionnaire: Q1 is Response to Name; Q2 is Eye Contact. Original responses stay separate from any future NLP interpretation. Structured scores stay internal.

### Questionnaire sources

- [Revised English questionnaire](../documentation/REVISED-QUESTIONNAIRE-BASED-ON-PILOT-TESTING-2.pdf)
- [Filipino questionnaire translation](../documentation/SQ-Translation-in-Filipino.docx)
- [Implementation notes](implementation.md) and [frontend guide](../frontend/README.md)

### Existing validation evidence

Backend auth update: 42 tests passed against real PostgreSQL using disposable schemas; browser registration/login, HttpOnly cookies, CSRF, session rotation, refresh and logout also passed. Applied revision: `20261023_01`. Frontend checks below are the earlier frontend runs, not new auth-integration claims.

The 2026-10-23 frontend completion work reran strict TypeScript/production build, ESLint and 12 domain/onboarding tests. Browser checks cover the new frontend pages, onboarding, full English/Filipino questionnaire, processing and multiple History sessions, including narrow mobile viewports. Captures are in `design-review/` (historical captures are no longer retained in this checkout).

The latest Assessment header follow-up passed strict TypeScript/production build, ESLint, assessment introduction/animation checks and the complete Filipino assessment browser journey. Header dimensions were checked at 1917, 1024, 390 and 320px; desktop/mobile captures were visually reviewed. Other suite results above belong to the preceding frontend completion run.

The frontend folder relocation subsequently passed production build, strict TypeScript, ESLint, 12 unit tests and browser checks for onboarding, original chat/navigation, frontend utility pages, the complete Filipino assessment and History. Source/assets and package/config hashes were preserved; details are in [frontend guide](../frontend/README.md).

Physical mobile devices and real virtual keyboards remain unverified. See [frontend completion notes](frontend-completion.md) for the current commands and remaining review boundaries.

## 2. Frontend gaps: implementation delivered, approvals pending

Updated 2026-10-23. See [frontend completion notes](frontend-completion.md) for scope, verification and handoff details.

- [x] Build Resources with search, topic filters, CDC/WHO source cards, developmental milestone reference and an assessment/consultation guide.
- [x] Display source links, publishers, English language, added dates and an honest pending-review status. Keep resource content separate from behavioral NLP rules.
- [ ] Verify current external source content and obtain stakeholder/clinical review plus approved Filipino resource summaries. Added dates are not clinical review dates.
- [x] Replace Support placeholder with keyboard-accessible FAQs, chat/resource navigation and an explicit unavailable contact service.
- [x] Replace Settings placeholder with demo session details, History access, language guidance, device motion status, privacy notices and working sign out.
- [x] Update login privacy/terms copy and provide reusable under-development policy dialogs without implying accepted or approved terms.
- [x] Review consent transitions and remove the redundant Decline / Exit button. Unchecked consent and direct-URL guards still block setup bypass.
- [x] Correct stale About copy that claimed only one question; review bilingual UI labels without changing the supplied question/follow-up wording.
- [x] Check keyboard focus, native dialog focus restoration, FAQ controls, reduced motion and long-input layout. Added text uses accessible dark blue/gray on pale surfaces.
- [x] Verify desktop login fit, scrollable mobile login/onboarding and usable composer in a shortened browser viewport.
- [ ] Test physical mobile devices and a real virtual keyboard. Browser viewport approximation is not equivalent.
- [x] Run strict TypeScript/production build, lint, 12 unit tests, new frontend page browser checks, onboarding, full English/Filipino assessments and History regressions. Visually review desktop/mobile captures.
- [ ] Obtain approved Privacy Policy/Terms wording and real support contact details. User confirmed these are not available yet; the UI identifies them as under development.

Acceptance: implemented destinations work within the frontend demo. Policy/contact approval, clinical resource review/Filipino resources and physical-device verification remain open. No real account settings, contact delivery or production policies are claimed.

### Current handoff

The frontend implementation milestone is delivered. Remaining frontend work is external source verification, clinical/Filipino resource review, approved policy/contact content and physical-device keyboard testing. These remain unchecked above.

The backend authentication slice is implemented in `backend/`: FastAPI, email/password, PostgreSQL-backed HttpOnly sessions, CSRF and versioned auth migrations. The local `aura_db` database is connected. The frontend now calls the authentication API through Vite. The next integration slice is server-owned onboarding/consent/eligibility. Screening/history persistence, email verification/reset, NLP and ML remain pending.

## 3. Backend API and real identity

Authentication method selected by the user: email + password with server-side HttpOnly cookie sessions. See [backend setup](../backend/README.md) and [auth contracts](../backend/docs/auth-api.md).

- [x] Set up FastAPI in a separate backend folder.
- [x] Define strict credential/public-session schemas and auth REST contracts.
- [x] Implement register/login, salted scrypt hashes, normalized unique email and public error redaction.
- [x] Implement PostgreSQL-backed session restoration, idle/absolute expiry, token rotation and server-side logout revocation.
- [x] Add exact-origin/CSRF checks, credentialed CORS, request throttling, JSON/body limits and no-store responses.
- [x] Verify self-session account isolation, concurrent registration, restart persistence, secure-cookie flags and database failure handling.
- [x] Pass 42 PostgreSQL/configuration/migration tests and actual-browser cookie/CORS/CSRF/refresh/logout smoke checks.
- [x] Connect frontend registration/login forms, session restoration and sign out to the real auth API.
- [ ] Implement email verification/reset through an agreed email provider.
- [ ] Implement server-owned onboarding status, consent version/scope, eligibility and completion checks before screening access.
- [ ] Implement questionnaire, answer/follow-up, assessment resume/completion and History contracts/endpoints.
- [ ] Implement real processing-job status, failure/retry and result contracts.

Acceptance: the authentication API slice is verified against PostgreSQL. The whole backend phase remains incomplete until server-enforced onboarding and owned screening workflows are implemented. A login does not establish valid screening consent or eligibility.

## 4. PostgreSQL and durable sessions

Implemented authentication persistence only; the rest of the database blueprint remains proposed.

- [x] Connect the separate local `aura_db` PostgreSQL database without modifying other project databases.
- [x] Add Alembic revision `20261023_01` for `users` and `auth_sessions`, including normalized-email uniqueness, session ownership/cascade and indexes.
- [x] Persist password hashes and session-token digests with expiry/revocation, surviving backend restarts.
- [x] Keep credentials in ignored backend/.env and use the same validated settings for API/migrations. No in-memory fallback.
- [x] Validate migration/model consistency, upgrade and rollback using disposable test schemas. No application downgrade was run.
- [ ] Add a limited application database role and reviewed deployment/backup/restore setup before production; the current local connection uses the existing development postgres role.
- [ ] Seed versioned English/Filipino questionnaire content and canonical scoring/indicator relationships.
- [ ] Persist minimal parent/child profiles, versioned consent, onboarding progress and assessment-specific snapshots.
- [ ] Persist original structured/textual answers, question/version/language and assessment progress.
- [ ] Persist agreed information-chat/History scope with ownership and concurrency enforcement.
- [ ] Implement approved retention, withdrawal, deletion and operational access procedures.

Acceptance: users and cookie sessions are durable today. Durable onboarding, screening and conversation History still require their own schemas/endpoints. The frontend currently retains its in-memory demo behavior.

## 5. Rule-based NLP and feature mapping

Dependencies: expert-reviewed rules for both languages and a documented structured-answer/NLP reconciliation policy.

- [ ] Define normalization/tokenization while retaining the original explanation separately.
- [ ] Build versioned English/Filipino behavioral rules, including context, polarity, negation and frequency handling.
- [ ] Define low-information, unmatched and conflicting-answer behavior; do not silently invent a feature value.
- [ ] Approve how selected-option scores and follow-up interpretations combine into each behavioral feature.
- [ ] Produce the exact ordered numerical feature vector shared by training and inference.
- [ ] Test representative bilingual examples, ambiguous input, negation and rule conflicts against reviewed expected outputs.
- [ ] Store interpretation/rule/feature versions separately from parent responses.

Acceptance: reviewed fixtures produce reproducible features. Unresolved interpretations follow an approved handling policy. Raw score sums never become an undocumented clinical class.

## 6. Dataset, training and model evaluation

Dependencies: approved labeling protocol, appropriately consented research data and stable feature definitions. Dataset preparation can proceed alongside NLP rule work once these decisions are settled.

- [ ] Document dataset provenance, permitted use, expert-reviewed labels and class definitions.
- [ ] Prevent leakage between training/validation/test sets, including repeated records from the same child.
- [ ] Train Logistic Regression, Random Forest and XGBoost using the agreed feature schema.
- [ ] Evaluate each model and soft voting using appropriate held-out validation and class-specific recall, precision, F1 and confusion matrices.
- [ ] Review generalization, bilingual input behavior and screening limitations; document thresholds and failure conditions where applicable.
- [ ] Version model artifacts, preprocessing, feature schema, training configuration and evaluation evidence.

Acceptance: reproducible evaluation supports the intended pre-screening use. Reviewers approve labels and limitations. Labels mechanically derived from input scores are not evidence of independent clinical validity.

## 7. Real processing and result integration

Dependencies: validated NLP/features, approved models and reviewed result templates.

- [ ] Replace timed processing simulation with actual backend job status and retry/failure handling.
- [ ] Run LR, RF and XGBoost on the same feature vector; average class probabilities for soft voting as specified in the paper.
- [ ] Save result provenance, model/feature versions, class and available probabilities.
- [ ] Show the result inside the assessment conversation after successful processing; retain the full transcript in History.
- [ ] Add reviewed explanation templates, professional evaluation guidance and the non-diagnostic limitation.
- [ ] Agree the thesis visualization requirement and its presentation before implementation.
- [ ] Keep demo preview records distinguishable and prevent fictional skip responses from entering real clinical processing or research datasets.

Acceptance: displayed risk class comes only from the reviewed inference workflow. Processing failures never appear as successful results. No fabricated prediction or unsupported medical advice is shown.

## 8. Release and study readiness

- [ ] Complete end-to-end checks across authentication, consent, both languages, interrupted sessions, processing, results and History.
- [ ] Review privacy/security, ownership isolation, retention/deletion and operational access.
- [ ] Complete accessibility, responsive/device and failure/recovery checks.
- [ ] Configure deployment environments, protected secrets, HTTPS, monitoring and database recovery.
- [ ] Complete stakeholder/clinical content review and study evaluation required by the research protocol.
- [ ] Update setup instructions, API/schema documentation, model limitations and deployment procedures.

Acceptance: agreed release checks pass; reviewed research and privacy requirements are satisfied; documented limitations match actual system behavior.

## Decisions still needed

1. Backend framework, authentication provider and secure session mechanism.
2. Minimal profile fields, consent wording/versioning, renewal, withdrawal, retention and deletion procedures.
3. Final instrument/version sign-off, question-to-indicator mapping and bilingual label review.
4. Structured-answer/NLP conflict rules, unmatched-input handling and feature order.
5. Dataset access, labeling protocol, class justification and evaluation criteria.
6. Reviewed Medical Library sources, result templates, Support/Settings scope and result visualization.
7. Durable information-chat scope, assessment history lifecycle and deployment environment.

Current boundary: the React UI still uses demo auth/chat/assessment state. A separate development auth API now persists accounts and cookie sessions in PostgreSQL; it is not wired to the UI yet. No real NLP, trained classification or clinical risk result is implemented.
