import type { ReactNode } from 'react'

type StatusProps = {
  isLoading?: boolean
  error?: unknown
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
}

export function Status({
  isLoading,
  error,
  empty,
  emptyMessage = 'No records found.',
  children,
}: StatusProps) {
  if (isLoading) {
    return <div className="state-card">Loading...</div>
  }
  if (error) {
    return <div className="state-card error">Something went wrong.</div>
  }
  if (empty) {
    return <div className="state-card">{emptyMessage}</div>
  }
  return children
}
