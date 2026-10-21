import { ArrowUpRight, BookOpen, Menu } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAura } from "../../contexts/AppContext";
import { AuraMascot } from "../branding/AuraMascot";
import { Button } from "../ui/Button";
import "../../styles/welcome-header.css";

export function Header({ onMenu }: { onMenu: () => void }) {
  const { assessment, chat } = useAura();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isWelcome =
    pathname === "/" || (pathname === "/chat" && !chat.conversation);
  return (
    <header className={`app-header${isWelcome ? " app-header--welcome" : ""}`}>
      <button
        className="icon-button menu-toggle"
        aria-label="Open navigation"
        aria-controls="app-navigation"
        onClick={onMenu}
      >
        <Menu />
      </button>
      {isWelcome ? (
        <div className="welcome-header-content">
          <div className="welcome-header-copy">
            <span className="welcome-header-eyebrow">
              AuRA / Autism Risk Analytics
            </span>
            <h1>Early insights. Brighter futures.</h1>
          </div>
          <div className="welcome-header-actions">
            <span className="welcome-header-badge">
              <span aria-hidden="true" />
              Pre-screening demo
            </span>
            <Link to="/about-asd" className="button welcome-header-link">
              <BookOpen size={17} aria-hidden="true" />
              Learn about ASD
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          <AuraMascot variant="animated-head" className="header-mascot" decorative />
          <div className="header-brand">
            <h1>AuRA</h1>
            <p>Autism Risk Assessment Assistant</p>
          </div>
          <Button
            className="header-assessment"
            disabled={assessment.busy}
            onClick={() => {
              navigate("/assessment");
              void assessment.start();
            }}
          >
            Pre-assessment
          </Button>
        </>
      )}
    </header>
  );
}
