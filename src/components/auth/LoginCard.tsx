import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthDemo } from "../../contexts/AuthDemoContext";
import { routes } from "../../constants/routes";
import { Button } from "../ui/Button";
import { PrivacyTermsNotice } from "./PrivacyTermsNotice";
import type { DemoScenario } from "../../types/auth.types";

export function LoginCard({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [scenario, setScenario] = useState<DemoScenario>("new");
  const { signIn, busy, error } = useAuthDemo();
  const navigate = useNavigate();
  const registering = mode === "register";
  return (
    <form
      className="login-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const destination = await signIn(email, registering ? "new" : scenario);
        if (destination) navigate(destination, { replace: true });
      }}
    >
      <div className="login-card-heading">
        <h2>
          {registering ? "Your first step starts here" : "Welcome to AuRA"}
        </h2>
        <p>
          {registering
            ? "Create a temporary parent/guardian demo account."
            : "Continue as a parent or legal guardian."}
        </p>
      </div>
      {!registering && (
        <div className="entry-field">
          <label htmlFor="demo-journey">Demo journey</label>
          <select
            id="demo-journey"
            value={scenario}
            disabled={busy}
            onChange={(event) =>
              setScenario(
                event.target.value === "returning" ? "returning" : "new",
              )
            }
          >
            <option value="new">First-time parent · Start setup</option>
            <option value="returning">Returning parent · Setup complete</option>
          </select>
        </div>
      )}
      <div className="entry-field">
        <label htmlFor="demo-email">Demo email address</label>
        <div className="entry-input-icon">
          <Mail size={18} aria-hidden="true" />
          <input
            id="demo-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            disabled={busy}
            placeholder="parent@example.test"
            autoComplete="off"
            aria-describedby="demo-signin-note"
          />
        </div>
      </div>
      {error && (
        <p className="entry-error" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        variant="primary"
        className="entry-primary login-submit"
        disabled={busy}
      >
        {busy ? "Opening your demo…" : "Continue with email"}
        {!busy && <ArrowRight size={18} aria-hidden="true" />}
      </Button>
      <PrivacyTermsNotice />
      <div className="login-mode-switch">
        {registering ? "Already exploring AuRA?" : "New to AuRA?"}{" "}
        <Link to={registering ? routes.login : routes.register}>
          {registering ? "Sign in to the demo" : "Create a demo account"}
        </Link>
      </div>
    </form>
  );
}
