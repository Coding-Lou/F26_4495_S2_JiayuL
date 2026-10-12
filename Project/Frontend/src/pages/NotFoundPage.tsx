import { Link } from "react-router-dom"

export function NotFoundPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Not Found</h1>
      <Link className="text-sm underline" to="/">
        Return home
      </Link>
    </section>
  )
}
