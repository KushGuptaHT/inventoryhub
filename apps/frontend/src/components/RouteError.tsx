import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong.'

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">InventoryHub</p>
        <h1>Page error</h1>
        <p>{message}</p>
        <a href="/">Return to dashboard</a>
      </section>
    </main>
  )
}
