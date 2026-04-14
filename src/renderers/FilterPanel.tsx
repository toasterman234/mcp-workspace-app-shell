export function FilterPanel({
  filters,
}: {
  filters: { id: string; label: string; value: string }[]
}) {
  return (
    <div className="filter-panel">
      {filters.map((f) => (
        <div key={f.id} className="filter-chip">
          <span className="filter-label">{f.label}</span>
          <span className="filter-value">{f.value}</span>
        </div>
      ))}
    </div>
  )
}
