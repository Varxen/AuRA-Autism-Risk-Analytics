import { ShieldCheck } from 'lucide-react'

export function AssessmentResult() {
  return (
    <div className="result-placeholder">
      <ShieldCheck aria-hidden="true" />
      <h3>Demonstration only · No risk result available</h3>
      <p>
        Approved questionnaire content and the NLP and ML services are required
        before a screening result can be provided. AuRA has not assessed your
        child’s risk.
      </p>
    </div>
  )
}
