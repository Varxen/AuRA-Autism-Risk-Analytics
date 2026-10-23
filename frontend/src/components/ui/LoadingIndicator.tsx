export function LoadingIndicator({ label = 'AuRA is typing' }: { label?: string }) {
  return (
    <div className="typing" role="status" aria-label={label}>
      <span />
      <span />
      <span />
      <span className="sr-only">{label}...</span>
    </div>
  )
}
