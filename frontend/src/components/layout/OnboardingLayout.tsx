import { LogOut } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AuraLogo } from "../branding/AuraLogo";
import { useOnboarding } from "../../hooks/useOnboarding";
import { onboardingSteps, routes } from "../../constants/routes";
import { OnboardingProgress } from "../onboarding/OnboardingProgress";

export function OnboardingLayout() {
  const { pathname } = useLocation();
  const { exit, busy, error } = useOnboarding();
  const step = onboardingSteps.find(
    (item) => routes.onboarding[item.id] === pathname,
  );
  return (
    <div className="entry-page onboarding-page">
      <header className="entry-header">
        <div className="entry-brand">
          <AuraLogo animated />
        </div>
        <button className="entry-nav-link" onClick={() => void exit()} disabled={busy}>
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </header>
      {error && <p className="error-message" role="alert">{error}</p>}
      <main id="onboarding-content" className="onboarding-main">
        {step && step.id !== "complete" && (
          <OnboardingProgress step={step.id} />
        )}
        <div className="onboarding-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
