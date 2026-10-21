export function AssessmentProgress({
  current,
  total,
}: {
  current: number
  total: number
}) {
  return (
    <div className="assessment-progress">
      <label htmlFor="assessment-progress">
        Pre-assessment progress {current}/{total}
      </label>
      <progress id="assessment-progress" value={current} max={total}>
        {current}/{total}
      </progress>
    </div>
  )
}
