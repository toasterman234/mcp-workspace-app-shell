export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="state state--error" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="state state--empty">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
