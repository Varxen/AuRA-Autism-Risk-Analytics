import { ArrowUpRight, BookOpen, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAura } from "../../contexts/AppContext";
import { AuraMascot } from "../branding/AuraMascot";
import { AssessmentProgress } from "../assessment/AssessmentProgress";
import { Button } from "../ui/Button";
import "../../styles/welcome-header.css";

export function Header({ onMenu }: { onMenu: () => void }) {
  const { assessment, chat } = useAura();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isInformationChat = pathname === "/chat";
  const isAssessment = pathname === "/assessment";
  return (
    <header className={`app-header${isInformationChat ? " app-header--welcome" : isAssessment ? " app-header--assessment" : ""}`}>
      <button
        className="icon-button menu-toggle"
        aria-label="Open navigation"
        aria-controls="app-navigation"
        onClick={onMenu}
      >
        <Menu />
      </button>
      {isInformationChat ? (
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
              Model-assisted pre-screening
            </span>
            <button
              type="button"
              className="button welcome-header-link"
              disabled={chat.busy || chat.introduction.phase !== "ready"}
              onClick={() => void chat.start("I want to know about ASD")}
            >
              <BookOpen size={17} aria-hidden="true" />
              Learn about ASD
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <AuraMascot variant="animated-head" className="header-mascot" decorative />
          <div className="header-brand">
            <h1>AuRA</h1>
            <p>{isAssessment ? (assessment.session?.language === "fil" ? "Paunang pagtatasa" : "Pre-assessment") : "Autism Risk Assessment Assistant"}</p>
          </div>
          {isAssessment && assessment.session && (
            <AssessmentProgress
              current={Math.min(assessment.session.currentQuestionIndex + 1, assessment.questions.length || 13)}
              total={assessment.questions.length || 13}
              language={assessment.session.language}
            />
          )}
          {!isAssessment && <Button
            className="header-assessment"
            disabled={assessment.busy}
            onClick={() => {
              navigate("/assessment");
            }}
          >
            Pre-assessment
          </Button>}
        </>
      )}
    </header>
  );
}
