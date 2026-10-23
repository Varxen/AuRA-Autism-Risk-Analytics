import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { ChatMessage } from '../chat/ChatMessage'

export function AssessmentLanguageSelection({ value, onChange }: {
  value: AssessmentLanguage | null
  onChange: (language: AssessmentLanguage) => void
}) {
  return (
    <ChatMessage className="assessment-language-message">
      <h2>Which language would you like to use?</h2>
      <p lang="fil">Saang wika ninyo gustong sumagot?</p>
      <fieldset className="assessment-language-options">
        <legend className="sr-only">Assessment language / Wika ng pagtatasa</legend>
        <label>
          <input type="radio" name="assessment-language" aria-label="English" value="en" checked={value === 'en'} onChange={() => onChange('en')} />
          <span><strong>English</strong><small>Questions in English</small></span>
        </label>
        <label lang="fil">
          <input type="radio" name="assessment-language" aria-label="Tagalog" value="fil" checked={value === 'fil'} onChange={() => onChange('fil')} />
          <span><strong>Tagalog</strong><small>Mga tanong sa Tagalog</small></span>
        </label>
      </fieldset>
    </ChatMessage>
  )
}
