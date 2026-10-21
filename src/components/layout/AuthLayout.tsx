import { useRef } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { AuraLogo } from "../branding/AuraLogo";
import { AnimatedAuraAsset } from "../branding/AnimatedAuraAsset";
import { AuraGreetingBubble } from "../branding/AuraGreetingBubble";
import { AboutAuraDialog } from "../auth/AboutAuraDialog";
import { routes } from "../../constants/routes";

export function AuthLayout() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const registering = pathname === routes.register;
  return (
    <div className="entry-page auth-page">
      <a className="skip-link" href="#auth-content">
        Skip to sign in
      </a>
      <header className="entry-header">
        <div className="entry-brand">
          <AuraLogo animated />
        </div>
        <nav aria-label="Account navigation">
          <button
            className="entry-nav-link"
            onClick={() => dialog.current?.showModal()}
          >
            About AuRA
          </button>
          <Link
            className="entry-nav-cta"
            to={registering ? routes.login : routes.register}
          >
            {registering ? "Sign in" : "Create account"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <main className="auth-hero" id="auth-content">
        <section className="auth-left" aria-labelledby="auth-title">
          <h1 id="auth-title">Early insights. Brighter futures.</h1>
          <p className="auth-subtitle">
            Learn about autism and your child’s development.
          </p>
          <Outlet />
        </section>
        <aside className="auth-visual" aria-label="Meet AuRA">
          <span
            className="auth-particle auth-particle--one"
            aria-hidden="true"
          />
          <span
            className="auth-particle auth-particle--two"
            aria-hidden="true"
          />
          <span
            className="auth-particle auth-particle--three"
            aria-hidden="true"
          />
          <AuraGreetingBubble />
          <div className="auth-robot-stage">
            <AnimatedAuraAsset className="auth-robot" />
          </div>
        </aside>
      </main>
      <AboutAuraDialog dialogRef={dialog} />
    </div>
  );
}
