import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { WelcomePage } from '../pages/WelcomePage'
import { ChatPage } from '../pages/ChatPage'
import { AssessmentPage } from '../pages/AssessmentPage'
import { FeaturePage } from '../pages/FeaturePage'
import { AppProvider } from './providers/AppProvider'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { DemoRouteGate } from './DemoRouteGate'
import { AuthLayout } from '../components/layout/AuthLayout'
import { OnboardingLayout } from '../components/layout/OnboardingLayout'
import { LoginPage } from '../pages/auth/LoginPage'
import { OnboardingSplashPage } from '../pages/onboarding/OnboardingSplashPage'
import { AboutPreAssessmentPage } from '../pages/onboarding/AboutPreAssessmentPage'
import { ConsentPage } from '../pages/onboarding/ConsentPage'
import { ParentChildInfoPage } from '../pages/onboarding/ParentChildInfoPage'
import { OnboardingCompletePage } from '../pages/onboarding/OnboardingCompletePage'
import { routes } from '../constants/routes'

function ProtectedMainLayout() {
  const { state } = useAuthDemo()
  // Leaving the main app unmounts its state, preventing cross-account chat leakage.
  return (
    <AppProvider key={state.sessionRevision}>
      <AppLayout />
    </AppProvider>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <DemoRouteGate>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path={routes.login} element={<LoginPage />} />
            <Route
              path={routes.register}
              element={<LoginPage mode="register" />}
            />
          </Route>
          <Route path={routes.splash} element={<OnboardingSplashPage />} />
          <Route element={<OnboardingLayout />}>
            <Route
              path={routes.onboarding.about}
              element={<AboutPreAssessmentPage />}
            />
            <Route path={routes.onboarding.consent} element={<ConsentPage />} />
            <Route
              path={routes.onboarding['parent-child']}
              element={<ParentChildInfoPage />}
            />
            <Route
              path={routes.onboarding.complete}
              element={<OnboardingCompletePage />}
            />
          </Route>
          <Route element={<ProtectedMainLayout />}>
            <Route index element={<WelcomePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="about-asd" element={<ChatPage educational />} />
            <Route path="assessment" element={<AssessmentPage />} />
            {['Resources', 'History', 'Support', 'Settings'].map((title) => (
              <Route
                key={title}
                path={title.toLowerCase()}
                element={<FeaturePage title={title} />}
              />
            ))}
            <Route path="*" element={<FeaturePage title="Page not found" />} />
          </Route>
        </Routes>
      </DemoRouteGate>
    </BrowserRouter>
  )
}
