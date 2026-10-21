import { LogOut } from "lucide-react";
import { Outlet, useLocation } from "react-router-dom";
import { AuraLogo } from "../branding/AuraLogo";
import { useOnboarding } from "../../hooks/useOnboarding";
import { useOnboardingScale } from "../../hooks/useOnboardingScale";
import { onboardingSteps, routes } from "../../constants/routes";
import { OnboardingProgress } from "../onboarding/OnboardingProgress";

export function OnboardingLayout() {
  const { pathname } = useLocation();
  const { exit } = useOnboarding();
  const { workspaceRef, mainRef } = useOnboardingScale();
  const step = onboardingSteps.find(
    (item) => routes.onboarding[item.id] === pathname,
  );
  return (
    <div className="entry-page onboarding-page">
      <header className="entry-header">
        <div className="entry-brand">
          <AuraLogo animated />
        </div>
        <button className="entry-nav-link" onClick={exit}>
          <LogOut size={16} aria-hidden="true" />
          Exit demo
        </button>
      </header>
      <div className="onboarding-workspace" ref={workspaceRef}>
        <main id="onboarding-content" className="onboarding-main" ref={mainRef}>
          {step && step.id !== "complete" && (
            <OnboardingProgress step={step.id} />
          )}
          <div className="onboarding-card">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
