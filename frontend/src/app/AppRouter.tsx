import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { ChatPage } from '../pages/ChatPage'
import { AssessmentPage } from '../pages/AssessmentPage'
import { HistoryPage } from '../pages/HistoryPage'
import { FeaturePage } from '../pages/FeaturePage'
import { ResourcesPage } from '../pages/ResourcesPage'
import { SupportPage } from '../pages/SupportPage'
import { SettingsPage } from '../pages/SettingsPage'
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
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="about-asd" element={<Navigate to="/chat" replace />} />
            <Route path="assessment" element={<AssessmentPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<FeaturePage title="Page not found" />} />
          </Route>
        </Routes>
      </DemoRouteGate>
    </BrowserRouter>
  )
}
