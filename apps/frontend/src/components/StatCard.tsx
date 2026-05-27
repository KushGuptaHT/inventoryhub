type StatCardProps = {
  label: string
  value: string | number
  helper?: string
}

export function StatCard({ label, value, helper }: StatCardProps) {
  const valueText = String(value)
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong title={valueText}>{valueText}</strong>
      {helper ? <small>{helper}</small> : null}
    </article>
  )
}
